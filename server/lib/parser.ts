// @ts-ignore
import fields from './fields.json';
const hl7Fields: any = fields;

export class Parser {
    public parse(payload: string) {
        try {
            const isJson = this.isJson(payload);
            if (isJson) {
                const hl7 = this.jsonToHl7(JSON.parse(payload));
                // console.log("hl7", hl7)
                return hl7;
            }
            else {
                const json = this.hl7ToJson(payload);
                // console.log("json", json)
                return json
            }


        } catch (error) {
            console.log("Parsing Error", error);
            return null;
        }
    }

    private isJson(payload: string): boolean {
        try {
            JSON.parse(payload);
            return true;
        } catch (error) {
            return false
        }
    }

    private hl7ToJson(hl7: string) {
        try {
            const strHl7 = hl7.trim();
            const hl7Msgs = strHl7.split("\n");

            const objResponse = hl7Msgs.reduce((prev: any, currMsg, idx) => {
                const msgPrefix = currMsg.slice(0, 1);
                const findField = hl7Fields.find((field: any) => field.prefix === msgPrefix);
                const splitedMsg = currMsg.trim().split("|");//findField?.delimiter

                const hl7MsgObj = findField?.elements?.reduce((previousObj: any, element: any, currentIndex: any) => {
                    const msg = splitedMsg[findField.prefix !== "H" ? (currentIndex + 2) : (currentIndex + 1)];
                    if (element?.elements) {
                        const splitedSubMsg = msg?.trim()?.split(element?.delimiter);

                        const subElementObj = element?.elements.reduce((previousValue: any, currentValue: any, index: any) => {
                            if (currentValue.name) previousValue = { ...previousValue, [currentValue.name]: splitedSubMsg[index] };
                            return previousValue;
                        }, {});

                        previousObj = { ...previousObj, [element?.name]: subElementObj }

                    } else {
                        if (element?.name)
                            previousObj = { ...previousObj, [element?.name]: msg }
                    }
                    return previousObj;
                }, {});

                prev[findField.name] = hl7MsgObj;
                return prev;
            }, {});

            return objResponse;
        } catch (error) {
            console.log("Error: hl7 to json converting ", error)
            return {}
        }
    }

    private jsonToHl7(payload: JSON) {
        try {
            let hl7Msg = ``;
            const JsonToHl7Converter = (data: any = {}, fields = [], delimiter = "") => {
                fields.map(((value: any, index) => {
                    const info: any = data[value?.name];
                    if (value?.elements) {
                        if (value?.prefix) {
                            hl7Msg += '\n';
                            hl7Msg += value?.prefix + value?.delimiter;
                            if (index !== 0)
                                hl7Msg += 1 + value?.delimiter;
                        }
                        JsonToHl7Converter(info, value.elements, value?.delimiter);
                    }
                    else {
                        if (value?.name)
                            hl7Msg += value?.value ?? info ?? delimiter;
                    }
                    if (delimiter && fields?.length - 1 !== index)
                        hl7Msg += delimiter;
                }))
            }
            JsonToHl7Converter(payload, hl7Fields);
            return hl7Msg.trim();
        } catch (error) {
            console.log("Error: json to hl7 converting ", error);
            return ""
        }
    }

    public hl7ToMachine(hl7: string) {
        const messages = hl7.split("\n");
        let newMessage = '';
        newMessage += '<ENQ>\n';
        messages.forEach((msg, index) => {
            msg.trim();
            const checkSumValue = this.calculateChecksum(`${msg}\r`);
            newMessage += `<ACK>\n<STX>${index + 1}${msg}<CR><ETX>${checkSumValue}<CR><LF>\n`;
        })

        newMessage += '<ACK>\n<EOT>';

        return newMessage;
    }

    private calculateChecksum(msg: string) {
        let sum = 0;
        let length = msg.length
        for (let i = 0; i < length; i++) {
            sum += msg.charCodeAt(i);
        }
        sum %= 256;
        return sum.toString(16).toUpperCase().padStart(2, '0');
    }
}