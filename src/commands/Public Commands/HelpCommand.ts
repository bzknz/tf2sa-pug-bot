import {Command} from "discord-akairo";
import {Message, MessageEmbed} from "discord.js";

export default class StatusCommand extends Command {
    public constructor() {
        super("help", {
            aliases: ["help"],
            category: "Public Commands",
            description: {
                content: "Displays a list of available commands",
                usage: "help",
                examples: [
                    "help"
                ]
            },
            channel: 'guild',
            ratelimit: 3
        });
    }

    public exec(message: Message): Promise<Message> {
        let output: String = "\`\`\`\nList of bots commands: \n\n";
        this.client.commandHandler.modules.forEach((c, k, m) => {
            let comm: Command = m.get(k);
            if (comm.categoryID =="Public Commands") {
                output = output.concat(`${this.client.commandHandler.prefix}${k} - ${comm.description.content} \n`)
            }
        })
        output = output.concat("\`\`\`");
        return message.util.send(output);
    }
}