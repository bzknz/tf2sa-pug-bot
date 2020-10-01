import * as dotenv from "dotenv";
import BotClient from "./client/BotClient";
dotenv.config({ path: __dirname + "/.env" });

let token = process.env.TOKEN;
let owners = process.env.OWNERS;
const client: BotClient = new BotClient({ token, owners });
client.start();
