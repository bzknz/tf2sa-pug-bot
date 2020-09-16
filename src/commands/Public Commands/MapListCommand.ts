import {Command} from "discord-akairo";
import {Message} from "discord.js";

export default class StatusCommand extends Command {
    public constructor() {
        super("maplist", {
            aliases: ["maplist"],
            category: "Public Commands",
            description: {
                content: "List all the available maps on the server",
                usage: "maplist",
                examples: [
                    "maps"
                ]
            },
            channel: 'guild',
            ratelimit: 3
        });
    }

    public exec(message: Message): Promise<Message> {
        return this.client.pugControl.displayMapList();  //Working as intended
    }
}