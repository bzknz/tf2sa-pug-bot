import { resolve } from "path";

export class SSQuery {

    static timeout: number = 1000;  //Time in ms

    static getInfo(address: String, port: number): Promise<any> {
        const query = require("source-server-query");
        return new Promise ((resolve, reject) => {
            query.info(address, port, this.timeout)
            .then((info) => {
                console.log(info);
                resolve(info);
            })
            .catch(reject);
        })
    }

    static getPlayers(address: String, port: number): Promise<any[]> {
        const query = require("source-server-query");
        return new Promise ((resolve, reject) => {
            query.players(address, port, this.timeout)
            .then((players) => {
                console.log(players);
                resolve(players);
            })
            .catch(reject);
        });
    }
}