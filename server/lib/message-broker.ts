import rabbitmq from 'amqplib';
import { rabbitmqInfo } from '../constant';
export class MessageBroker {
    connectionKey: string = "";
    constructor(connectionUrl: string) {
        this.connectionKey = connectionUrl;
    }
    async publishMessage(data: string) {
        try {
            const connection = await rabbitmq.connect(this.connectionKey);
            const channel = await connection.createChannel();
            await channel.assertExchange(rabbitmqInfo.report.exchange, 'direct', { durable: false })
            await channel.assertQueue(rabbitmqInfo.report.queue, { durable: false });
            await channel.bindQueue(rabbitmqInfo.report.queue, rabbitmqInfo.report.exchange, rabbitmqInfo.report.routing);
            await channel.publish(rabbitmqInfo.report.exchange, rabbitmqInfo.report.routing, Buffer.from(data));
            setTimeout(() => {
                connection.close();
            })
        } catch (error) {
            console.log("Publish Message Error: ", error)
        }
    }


    async consumeMessage(callback?: (content: string) => void) {
        try {
            const connection = await rabbitmq.connect(this.connectionKey);
            const channel = await connection.createChannel();
            await channel.assertExchange(rabbitmqInfo.order.exchange, 'direct', { durable: false });
            await channel.assertQueue(rabbitmqInfo.order.queue, { durable: false });

            await channel.consume(rabbitmqInfo.order.queue, (msg: any) => {
                if (msg) {
                    // console.log("order rcvd : ", msg.content.toString());
                    // order.add(msg.content.toString());
                    if (callback)
                        callback(msg.content.toString());
                    channel.ack(msg);
                }
            })

        } catch (error) {
            console.log("Consume Message Error: ", error);
        }
    }
}