import {Command} from "discord-akairo";
import {Message} from "discord.js";

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
        return this.client.pugControl.vacateServer(serverID);  //Working as intended
    }
}