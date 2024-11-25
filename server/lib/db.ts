import path from "path";
const sqlite3 = require('sqlite3').verbose();

type storeType = {
    key: string,
    value: string
}
const rootPath = path.resolve();
const db = new sqlite3.Database(rootPath + '/db.db');
export class DB {
    private data: storeType[] = [];

    constructor(table: string) {
        this.checkAndCreateTable(table)
        // db.run(`CREATE TABLE reports(key TEXT, value TEXT)`);
    }

    async insert(payload: storeType): Promise<storeType> {
        let sql = `SELECT * FROM reports WHERE key = ?`;
        const find = await this.fetchFirst(sql, [payload.key]) as storeType | null;
        if (find) {
            throw new Error("Key should be unique");
        }
        // const response = this.data.push(payload);
        const stmt = db.prepare("INSERT INTO reports(key, value) VALUES (?, ?)");
        stmt.run(payload.key, payload.value);
        stmt.finalize();
        return payload;
    }

    insertMany() {

    }

    async getAll(): Promise<storeType[]> {
        const data = await this.fetchAll("SELECT * FROM reports") as storeType[];
        return data;
    }

    async findOne(value:string) {
        const sql = "SELECT * FROM reports WHERE value = ?";
        const params = [value];
        try {
            const report = await this.fetchFirst(sql, params);
            console.log("Report of deliverded ",report);
        } catch (error) {
            console.error("Error fetching report:", error);
        }
    }

    private async fetchAll(sql: string) {
        return new Promise((resolve, reject) => {
            db.all(sql, (err: Error, rows: any) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    };

    private async fetchFirst(sql: string, params: any[]) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err: any, row: any) => {
                if (err) reject(null);
                resolve(row);
            });
        });
    };

    private checkAndCreateTable(tableName: string) {
        db.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [tableName],
            (err: Error, row: any) => {
                if (err) {
                    console.error('Error checking table existence:', err.message);
                    return;
                }

                if (!row) {
                    this.createTable(tableName);
                }
            }
        );
    }

    private async createTable(tableName: string) {
        const createTableSQL = `
          CREATE TABLE ${tableName}(key TEXT, value TEXT);
        `;

        db.run(createTableSQL, (err: Error) => {
            if (err) {
                console.error('Error creating table:', err.message);
            }
        });
    }
}