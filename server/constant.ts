export const rabbitmqInfo = {
    queue: "order",
    exchange: 'order_exchange',
    routing: "order_key",
    connectionKey: "amqp://localhost:5672",
    order: {
        queue: "order",
        exchange: 'order_exchange',
        routing: "order_routing_key",
    },
    report: {
        queue: "report",
        exchange: 'report_exchange',
        routing: "report_routing_key",
    }

}

