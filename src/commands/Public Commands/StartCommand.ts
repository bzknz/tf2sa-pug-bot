import {Command} from "discord-akairo";
import {Message} from "discord.js";

export default class StartCommand extends Command {
    public constructor() {
        super("start", {
            aliases: ["start"],
            category: "Public Commands",
            description: {
                content: "Starts a new pickup if there is an open server",
                usage: "start",
                examples: [
                    "start"
                ]
            },
            channel: 'guild',
            ratelimit: 3,
            //userPermissions: ["MANAGE_MESSAGES"]
        });
    }

    public exec(message: Message): Promise<Message> {
        if (this.client.pug != null)
            return message.util.send("A pug is already in progress");
        this.client.startPug(message)
        .then(() => {
            message.util.send("Started a pug.");
            return this.client.displayReadyStatus(message);
        })
        .catch(() => {
            return message.util.send("Cannot start a game, no open servers to use.");
        });
    }
}