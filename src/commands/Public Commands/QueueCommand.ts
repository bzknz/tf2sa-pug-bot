import {Command} from "discord-akairo";
import {Message} from "discord.js";
import { Player } from "../../models/Player";

export default class AddCommand extends Command {
    public constructor() {
        super("queue", {
            aliases: ["queue"],
            category: "Public Commands",
            description: {
                content: "Add a player to a queue, waiting for a new pug to be started.",
                usage: "queue",
                examples: [
                    "queue"
                ]
            },
            channel: 'guild',
            ratelimit: 3
        });
    }

    public exec(message: Message): Promise<Message> {
        //If a pug is on, just add as normal
        if (this.client.pug != null) {
            if (this.client.pug.addedPlayers.length == 12)
                return message.util.send("The pug is currently full, wait until a new one has been created.");
            if (this.client.pug.addPlayer(new Player(message.member)))
                return this.client.displayReadyStatus(message);
            else
                return message.util.send("Already added to the pug.");
        }
        
        if (this.client.queue.queuePlayer(new Player(message.member))) 
            return this.client.displayQueue(message);
        else 
            return message.util.send("Already added to the queue.");
    }
}