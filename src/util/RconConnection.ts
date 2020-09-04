import {Rcon} from "rcon-srcds"

export default class RconConnection {

    address: string;
    port: number;
    password: string;

    public constructor(address: string, port: number, password: string) {
        this.address = address;
        this.port = port;
        this.password = password;
    }

    sendCommand(comm: String): Promise<void> {
        const Rcon = require('rcon-srcds');
        const server = new Rcon({host: this.address, port: this.port});
        return new Promise((resolve, reject) => {
            server.authenticate(this.password)
            .then(() => {
                console.log('authenticated');
                server.execute(comm)
            })
            .then(() => {
                console.log(`Successfully executed command: ${comm}`);
                resolve();
            })
            .catch(() => {
                console.log();
                reject();
            }); 
        });
    }
}