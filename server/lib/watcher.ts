import { watch } from "fs";
import fs from "fs";
import path from "path";


export class DirectoryWatcher {
    private path: string = '';
    private readonly events = {
        change: 'change',
        rename: 'rename'
    }

    constructor(path: string) {
        this.path = path;
    }

    public async run(addCallback?: (content: string, fileName: string) => void, renameCallback?: (fileName: string) => void) {
        try {
            watch(this.path, { encoding: 'buffer' }, (eventType, name) => { //  watching reports directory
                const fileName = name?.toString() as string;
                switch (eventType) {
                    case this.events.change:
                        const pathOfFile = path.join(this.path, fileName);
                        if (addCallback) {
                            fs.readFile(pathOfFile, 'utf8', (err, data) => {
                                if (err) {
                                    throw new Error("File parse error");
                                }
                                addCallback(data?.trim() as string, fileName);
                            });
                        }
                        break;
                    case this.events.rename:
                        if (renameCallback)
                            renameCallback(fileName);
                        break;
                    default:
                        console.log("Unhandled Event", eventType);
                        break;
                }
            });

        } catch (error) {
            console.log("Directory watch Error", error)
        }
    }
}