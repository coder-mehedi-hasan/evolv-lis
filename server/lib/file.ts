import path from "path";
import fs from "fs";
const storage = path.resolve('data');


export class File {
    async add(data: string | Buffer, namePreffix: string = "", storePath: string = ''): Promise<Boolean> {
        try {
            const name = `${namePreffix}-${new Date().getTime()}.hl7`;
            const filePath =await path.join(storage, storePath, name);
            let writer = await fs.createWriteStream(filePath);
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
        const filePath = path.join(storage, storePath, name);
        fs.writeFile(filePath, data, { encoding: "utf8", flag: 'r+' }, (error: NodeJS.ErrnoException | null) => {
            if (error) {
                console.log("Error: ", error);
                throw new Error('File saved error')
            }
        });
        return true;
    }
}