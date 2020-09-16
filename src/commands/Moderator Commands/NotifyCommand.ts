//WORKING AS INTENDED

import {Command} from "discord-akairo";
import {Message} from "discord.js";

export default class NotifyCommand extends Command {
    public constructor() {
        super("notify", {
            aliases: ["notify"],
            category: "Moderation Commands",
            description: {
                content: "Mentions everyone with the subscribe role",
                usage: "notify",
                examples: [
                    "notify"
                ]
            },
            channel: 'guild',
            ratelimit: 3,
            userPermissions: ["MANAGE_MESSAGES"]
        });
    }

    public exec(message: Message): Promise<Message> {
        return this.client.pugControl.notifySubscribers("A pug is in progress.");  //Need to check, add controls
    }
}