import {Command} from "discord-akairo";
import {Message} from "discord.js";
import { Player } from "../../models/Player";
import { GuildMember } from "discord.js";
import { runInThisContext } from "vm";

export default class ChangeMapCommand extends Command {
    public constructor() {
        super("map", {
            aliases: ["map"],
            category: "Moderation Commands",
            description: {
                content: "Changes the current pickup map",
                usage: "map [ map ]",
                examples: [
                    "map cp_process_final"
                ]
            },
            channel: "guild",
            ratelimit: 3,
            args: [
                {
                    id: "map",
                    type: "string",
                    match: "rest",
                    default: ""
                }],
            //userPermissions: ["MANAGE_MESSAGES"]
        });
    }

    public exec(message: Message, {map} : {map: string}): Promise<Message> {
        console.log(map);

        if (!this.client.pug == null)
            return message.util.send("There is no pug in progress.")
        
        let contains: string[] = [];
        this.client.mapList.forEach(m => {
            if (m.indexOf(map) !== -1) contains.push(m);
        });

        if (contains.length === 0) {
            return message.util.send("No matching maps found.");
        }

        if (contains.length === 1) {
            this.client.pug.currentMap = contains[0];
            return this.client.displayReadyStatus(message);
        }

        let output: string = "Multiple maps found: [";
        let nrMaps: number = contains.length;
        for (let i = 0; i < nrMaps; i++) {
            output = output.concat(contains[i]).concat(", ");
        }
        output = output.concat(contains[nrMaps-1]).concat("]");
        return message.util.send(output);
    }
}