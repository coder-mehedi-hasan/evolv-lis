import { File } from "./file";


export default class Report {
    private readonly path: string = 'evolv/reports'
    private readonly file: File;
    private readonly namePrefix: string;
    constructor(
        namePrefix: string = 'report'
    ) {
        this.file = new File();
        this.namePrefix = namePrefix;
    }

    async add(data: string | Buffer): Promise<Boolean> {
        return await this.file.add(data, this.namePrefix, this.path);
    }

    async update(data: string | Buffer, name: string): Promise<Boolean> {
        return await this.file.update(data, name, this.path);
    }


}