/** 
 * Author: Mehedi Hasasn
 * Description: this is run in background of this software like a server
 * 
*/
//@ts-nocheck
import fs from "fs";
import path from "path";
import Order from './lib/order';

import { ipcRenderer } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { DB } from './lib/db';
import { rabbitmqInfo } from './constant';
import { MessageBroker } from "./lib/message-broker";
import { Parser } from "./lib/parser";
import { DirectoryWatcher } from "./lib/watcher";
import { app } from 'electron';

// import rabbitmq from 'amqplib';
// const socket = new WebSocket('http://localhost:3000');
const order = new Order();
const reportStoragePath = 'evolv/reports';
const orderStoragePath = 'evolv/orders';
const rabbitmq = require('amqplib');
const db: DB = new DB('reports');
const ordersWatcher = new DirectoryWatcher(orderStoragePath);
const reportsWatcher = new DirectoryWatcher(reportStoragePath);
const messageBroker = new MessageBroker(rabbitmqInfo.connectionKey);
const parser = new Parser();



export async function server() {
 // const dataPath = await ipcRenderer.invoke('get-data-folder-path');


  // console.log(ipcRenderer)
  // rabbitmq consumer
  // messageBrokerConsumer();
  await messageBroker.consumeMessage((content) => {//received json content
    const parsedContent = parser.parse(content);//convert json to hl7 
    order.add(parsedContent); //save hl7 file
  })


  // socket.onmessage = function (event) { // received message event
  //   let message = event.data;
  //   order.add(message);
  // }

  await reportsWatcher.run(reportSendingToVendor); //after report added recieved from machine
  await ordersWatcher.run(orderSendOnMachine);//after order added and received content as hl7 and filename

  // cron.schedule('*/1 * * * *', () => {// Schedule a task to run every 2 minutes
  //   reportProcessingaWithDelivering(); // processing report send to vendor socket server
  // });
}

function orderSendOnMachine(content: string, fileName: string) {
  // const checkJsonFile = parser.parse(content);
  const machineMessage = parser.hl7ToMachine(content)
  // console.log("Order Received in content : ", machineMessage);
  ipcRenderer.invoke('send-data', content);
}

function reportSendingToVendor(content: string, fileName: string) {
  sendingVendorsServer(content, (err) => {// send report to vendor which is not delivered/sended
    if (!err) db.insert({ key: uuidv4(), value: fileName });// insert in db for track delivered/sended reports
  })
}

function sendingVendorsServer(content: string, callback: (err?: any) => void) {
  try {
    const parsedMessage = parser.parse(content);
    //console.log("Content of report ", parsedMessage);
    messageBroker.publishMessage(JSON.stringify(parsedMessage));
    callback();
  } catch (error) {
    console.log(error);
    callback(error);
  }
}



function reportProcessingWithDelivering() { // for scheduler
  fs.readdir(reportStoragePath, async function (err, files) {// file list of reports directory

    const deliveredReport = (await db.getAll())?.map(report => report?.value) //list delivered/sended report 
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }

    const filteredFiles = files?.filter(file => !deliveredReport.includes(file));
    filteredFiles?.forEach(function (file) {
      sendingVendorsServer(file, (err?: Error) => { // send report to vendor which is not delivered/sended
        if (!err) db.insert({ key: uuidv4(), value: file }); // insert in db for track delivered/sended reports
      });
    });
  });
}
