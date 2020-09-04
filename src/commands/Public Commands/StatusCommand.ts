import {Command} from "discord-akairo";
import {Message} from "discord.js";

export default class StatusCommand extends Command {
    public constructor() {
        super("status", {
            aliases: ["status"],
            category: "Public Commands",
            description: {
                content: "Checks the status of the pickup",
                usage: "status",
                examples: [
                    "status"
                ]
            },
            channel: 'guild',
            ratelimit: 3
        });
    }

    public exec(message: Message): Promise<Message> {

        if (this.client.pug == null) {
            message.util.send("There is no pug in progress.");    
            return this.client.displayQueue(message);
        }
        this.client.displayReadyStatus(message);
    }
}