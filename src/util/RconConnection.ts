import * as Rcon from "rcon-srcds";

export default class RconConnection {
  address: string;
  port: number;
  password: string;

  public constructor(address: string, port: number, password: string) {
    this.address = address;
    this.port = port;
    this.password = password;
  }

  async sendCommand(command: String): Promise<void> {
    const server = new Rcon({ host: this.address, port: this.port });

    const authResponse = await server.authenticate(this.password);
    console.log("authenticated");

    console.log(`executing: ${command}`);
    // Cannot await this as the promise does not seem to resolve (bug in the library?)
    server.execute(command);
  }
}
