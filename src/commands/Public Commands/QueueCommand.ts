import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class AddCommand extends Command {
  public constructor() {
    super("q", {
      aliases: ["q"],
      category: "Public Commands",
      description: {
        content:
          "Add a player to a queue, waiting for a new pug to be started.",
        usage: "q",
        examples: ["q"],
      },
      channel: "guild",
      ratelimit: 3,
    });
  }

  public exec(message: Message): Promise<Message> {
    return this.client.pugControl.queuePlayer(message);
  }
}
