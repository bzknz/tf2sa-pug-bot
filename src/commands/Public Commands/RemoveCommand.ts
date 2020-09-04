import {Command} from "discord-akairo";
import {Message} from "discord.js";

export default class RemoveCommand extends Command {
    public constructor() {
        super("rem", {
            aliases: ["rem"],
            category: "Public Commands",
            description: {
                content: "Remove a player from a pickup",
                usage: "rem",
                examples: [
                    "rem"
                ]
            },
            channel: 'guild',
            ratelimit: 3
        });
    }

    public exec(message: Message): Promise<Message> {
        if (this.client.pug == null) {
            return message.util.send("There is no pug in progress.");
        }

        if (this.client.pug.removePlayer(message.member.displayName))
            return this.client.displayReadyStatus(message);

        return message.util.send("You are not added to the pug.") 
    }
}