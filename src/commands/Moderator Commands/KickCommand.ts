//Seems to be working as intended

import {Command} from "discord-akairo";
import {Message} from "discord.js";

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
        return this.client.pugControl.kickPlayer(member);  //Need to double check
    }

}