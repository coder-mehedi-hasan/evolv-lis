import path from "path";
import { ipcRenderer } from 'electron';
import fs from 'fs';
const sqlite3 = require('sqlite3').verbose();

type storeType = {
    key: string,
    value: string
}
const rootPath = path.resolve();
export class DB {
    db: any
    constructor(table: string) {
        ipcRenderer.invoke("get-data-folder-path").then((systemPath) => {
            const dataFolderPath = path.join(systemPath, 'db');
            if (!fs.existsSync(dataFolderPath)) {
                fs.mkdirSync(dataFolderPath, { recursive: true });
            }
            const dbPath = path.join(dataFolderPath, "db.db");
            if (!fs.existsSync(dbPath)) {
                fs.writeFileSync(dbPath, "");
            }
            this.db = new sqlite3.Database(dbPath);
            this.checkAndCreateTable(table);
        })
        // db.run(`CREATE TABLE reports(key TEXT, value TEXT)`);
    }

    async insert(payload: storeType): Promise<storeType> {
        let sql = `SELECT * FROM reports WHERE key = ?`;
        const find = await this.fetchFirst(sql, [payload.key]) as storeType | null;
        if (find) {
            throw new Error("Key should be unique");
        }
        // const response = this.data.push(payload);
        const stmt = this.db.prepare("INSERT INTO reports(key, value) VALUES (?, ?)");
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

    async findOne(value: string) {
        const sql = "SELECT * FROM reports WHERE value = ?";
        const params = [value];
        try {
            const report = await this.fetchFirst(sql, params);
            console.log("Report of deliverded ", report);
        } catch (error) {
            console.error("Error fetching report:", error);
        }
    }

    private async fetchAll(sql: string) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, (err: Error, rows: any) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    };

    private async fetchFirst(sql: string, params: any[]) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err: any, row: any) => {
                if (err) reject(null);
                resolve(row);
            });
        });
    };

    private checkAndCreateTable(tableName: string) {
        this.db.get(
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

        this.db.run(createTableSQL, (err: Error) => {
            if (err) {
                console.error('Error creating table:', err.message);
            }
        });
    }
}