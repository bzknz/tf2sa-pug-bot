import {Command} from "discord-akairo";
import {Message} from "discord.js";

export default class PingCommand extends Command {
    public constructor() {
        super("ping", {
            aliases: ["ping"],
            category: "Test Commands",
            description: {
                content: "Check the latency of the ping to the Discord API",
                usage: "ping",
                examples: [
                    "ping"
                ]
            },
            channel: 'guild',
            ratelimit: 3
        });
    }

    public exec(message: Message): Promise<Message> {
        return message.util.send(`Pong! \`${this.client.ws.ping}ms\``);
    }
}