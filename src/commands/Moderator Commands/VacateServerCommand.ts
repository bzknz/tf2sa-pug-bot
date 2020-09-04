import {Command} from "discord-akairo";
import {Message} from "discord.js";
import RconConnection from "../../util/RconConnection";
import { TF2Server } from "../../models/TF2Server";

export default class ClearServerCommand extends Command {
    public constructor() {
        super("vacate", {
            aliases: ["vacate"],
            category: "Moderation Commands",
            description: {
                content: "Kicks all players from the TF2 server",
                usage: "vacate",
                examples: [
                    "vacate"
                ]
            },
            channel: 'guild',
            ratelimit: 3,
            args: [
                {
                    id: "serverID",
                    type: "number",
                    default: "0"
                }],
            userPermissions: ["MANAGE_MESSAGES"]
        });
    }

    public async exec(message: Message, {serverID} : {serverID: number}): Promise<Message> {
        let returnString: String = "No server found matching that ID";
        let currServer: TF2Server = this.client.serverList[serverID];
        if (currServer != null) {
            let rcon = new RconConnection(currServer.address, currServer.port, this.client.rconPassword);
            await rcon.sendCommand("kickall")
            .then(() => returnString = "All players were kicked from the server")
            .catch(() => returnString = "Unable to kick players from the server" )    
        }
        return message.util.send(returnString);
    }
}