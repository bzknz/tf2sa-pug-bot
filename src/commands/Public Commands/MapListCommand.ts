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

        if (this.client.mapList.length === 0)
            return message.util.send("There is no maps available.");

        let output: String = "Maps: ";
        let nrMaps: number = this.client.mapList.length;
        for (let i = 0; i < nrMaps-1; i++) {
            output = output.concat(this.client.mapList[i]).concat(", ");
        }
        output = output.concat(this.client.mapList[nrMaps-1]);

        return message.util.send(output);
    }
}