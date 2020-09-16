import {Command} from "discord-akairo";
import {Message} from "discord.js";
import { Player } from "../../models/Player";

export default class AddCommand extends Command {
    public constructor() {
        super("dq", {
            aliases: ["dq"],
            category: "Public Commands",
            description: {
                content: "Removes a player from a queue.",
                usage: "dq",
                examples: [
                    "dq"
                ]
            },
            channel: 'guild',
            ratelimit: 3
        });
    }

    public exec(message: Message): Promise<Message> {
        return this.client.pugControl.dequeuePlayer(message.member.id);  //Working as intended
    }
}