import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
// import exposeContexts from '../renderer/src/';
import { server } from '../../server';
import Order from '../../server/lib/order';
import path from "path";
import fs from "fs";
const order: Order = new Order();


const savedInputOutput = (data: string, suffix: string) => {
  ipcRenderer.invoke("get-data-folder-path").then((systemPath) => {
    const name = `${new Date().getFullYear()}_${new Date().getMonth() + 1}_${new Date().getDate()}_${suffix}.txt`;
    const storePath = 'output'
    const dataFolderPath = path.join(systemPath, storePath);
    if (!fs.existsSync(dataFolderPath)) {
      fs.mkdirSync(dataFolderPath, { recursive: true });
    }
    fs.appendFileSync(path.join(dataFolderPath, name), data?.concat('\n'), "utf8");
  })
}

// Custom APIs for renderer
const api = {
  listSerialPorts: () => ipcRenderer.invoke('list-ports'),
  // Connect to a port
  connectPort: (port: string, baudRate: number = 9600) => ipcRenderer.invoke('connect-port', port, baudRate),
  // Disconnect from a port
  disconnectPort: () => ipcRenderer.invoke('disconnect-port'),
  // Send data
  sendData: (data: string) => {
    savedInputOutput(data, "S");
    return ipcRenderer.invoke('send-data', data);
  },
  // Listen for incoming data
  onReceiveData: (callback: (data: string) => void) => {
    ipcRenderer.on('serial-data', (_event, data) => {
      order.report.add(data);
      console.log("Data", data);
      savedInputOutput(data, "R");
      // receiveMessageToServer(data);
      // ipcRenderer.invoke("get-data-folder-path").then((systemPath) => {

      // })
      callback(data)
    });

    return () => {
      ipcRenderer.removeAllListeners('serial-data')
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}


// exposeContexts();
server()