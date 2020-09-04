//Seems to be working as intended

//TODO ADD REGEX

import {Command} from "discord-akairo";
import {Message} from "discord.js";
import { Player } from "../../models/Player";
import { GuildMember } from "discord.js";

export default class KickCommand extends Command {
    public constructor() {
        super("kick", {
            aliases: ["kick"],
            category: "Moderation Commands",
            description: {
                content: "Kicks a player from a pickup",
                usage: "kick [ member]",
                examples: [
                    "kick chrome"
                ]
            },
            channel: 'guild',
            ratelimit: 3,
            args: [
                {
                    id: "member",
                    type: "string",
                    match: "rest",
                    default: ""
                }],
            userPermissions: ["MANAGE_MESSAGES"]
        });
    }

    public exec(message: Message, {member} : {member: string}): Promise<Message> {    

        if (!this.client.pug == null)
            return message.util.send("There is no pug in progress.")
        switch (this.client.pug.kickPlayer(name)) {
            case 0:
                return this.client.displayReadyStatus(message);
            case 1:
                return message.util.send("No player found matching that name.")
            case 2: 
                return message.util.send("Multiple matching players found")
        }
    }

}