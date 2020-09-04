import {Command} from "discord-akairo";
import {Message} from "discord.js";
import { Player } from "../../models/Player";

export default class ReadyCommand extends Command {
    public constructor() {
        super("ready", {
            aliases: ["ready"],
            category: "Public Commands",
            description: {
                content: "Confirms that you are ready to play the current pickup",
                usage: "ready",
                examples: [
                    "ready"
                ]
            },
            channel: 'guild',
            ratelimit: 3
        });
    }

    public exec(message: Message): Promise<Message> {
        if (this.client.pug == null || !this.client.pug.isAdded(message.member.displayName)) {
            console.log("test");
            return null;
        }
        let temp: Player = this.client.pug.getPlayer(message.member.displayName);
        console.log(temp.discordMember.displayName);
        temp.updateReady();
        return message.util.send(`${message.member.displayName} will be ready for the next ${this.client.readyDuration/6e4} minutes`);
    }
}