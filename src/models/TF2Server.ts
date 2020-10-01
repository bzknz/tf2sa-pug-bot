export class TF2Server {
  address: string;
  port: number;
  password: string;

  constructor(address: string, port: number, password: string) {
    this.address = address;
    this.port = port;
    this.password = password;
  }
}
