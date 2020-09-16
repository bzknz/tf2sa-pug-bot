import {Command} from "discord-akairo";
import {Message} from "discord.js";

export default class StartCommand extends Command {
    public constructor() {
        super("start", {
            aliases: ["start"],
            category: "Public Commands",
            description: {
                content: "Starts a new pickup if there is an open server",
                usage: "start",
                examples: [
                    "start"
                ]
            },
            channel: 'guild',
            ratelimit: 3,
            //userPermissions: ["MANAGE_MESSAGES"]
        });
    }

    public exec(message: Message): Promise<Message> {
        return this.client.pugControl.startPug(message);
    }
}