import {Command} from "discord-akairo";
import {Message} from "discord.js";
import { Player } from "../../models/Player";

export default class AddCommand extends Command {
    public constructor() {
        super("add", {
            aliases: ["add"],
            category: "Public Commands",
            description: {
                content: "Add a player to an existing pickup",
                usage: "add",
                examples: [
                    "add"
                ]
            },
            channel: 'guild',
            ratelimit: 3
        });
    }

    public exec(message: Message): Promise<Message> {
        if (this.client.pug == null)
            return message.util.send("There is no pug in progress.");
        if (this.client.pug.addedPlayers.length == 12)
            return message.util.send("The pug is currently full, wait until a new one has been created.");

        if (this.client.pug.addPlayer(new Player(message.member)))
            return this.client.displayReadyStatus(message);
        else
            return message.util.send("Already added to the pug.");
    }
}