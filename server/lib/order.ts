import Report from "./report";
import { File } from "./file";


export default class Order {
    readonly report: Report;
    private readonly path: string = 'evolv/orders'
    private readonly file: File;
    private readonly namePrefix: string;
    constructor(
        namePrefix: string = 'order'
    ) {
        this.report = new Report();
        this.file = new File();
        this.namePrefix = namePrefix;
    }

    async add(data: string | Buffer): Promise<Boolean> {
        return await this.file.add(data, this.namePrefix, this.path);
    }

}