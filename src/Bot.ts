import BotClient from "./client/BotClient";
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname+'/.env' });

let token = process.env.TOKEN;
let owners = process.env.OWNERS;
const client: BotClient = new BotClient({token, owners});
client.start();