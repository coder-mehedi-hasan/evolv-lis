import { app, ipcRenderer } from 'electron';
import path from "path";
import fs from "fs";
// const storage = path.resolve('data')
// const test = app.getAppPath()

export class File {
    storage: string = '';

    constructor() {
        ipcRenderer.invoke("get-data-folder-path").then((systemPath) => {
            this.storage = systemPath;
        })
    }

    async add(data: string | Buffer, namePreffix: string = "", storePath: string = ''): Promise<Boolean> {
        try {
            const name = `${namePreffix}-${new Date().getTime()}.hl7`;
            const dataFolderPath = path.join(this.storage, storePath);
            if (!fs.existsSync(dataFolderPath)) {
                fs.mkdirSync(dataFolderPath, { recursive: true });
            }

            const filePath = path.join(dataFolderPath, name);
            let writer = fs.createWriteStream(filePath);
            // fs.writeFile(filePath, data, { encoding: "utf8", flag: 'a' }, (error: NodeJS.ErrnoException | null) => {
            //     if (error) {
            //         console.log("Error: ", error);
            //         throw new Error('File saved error')
            //     }
            // });
            // await writer.write(data);
            await writer.write(data);
            await writer.close();
            await writer.end();
            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    async update(data: string | Buffer, name: string, storePath: string = ''): Promise<Boolean> {
        const filePath = path.join(this.storage, storePath, name);
        fs.writeFile(filePath, data, { encoding: "utf8", flag: 'r+' }, (error: NodeJS.ErrnoException | null) => {
            if (error) {
                console.log("Error: ", error);
                throw new Error('File saved error')
            }
        });
        return true;
    }
}