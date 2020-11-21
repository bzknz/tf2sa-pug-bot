import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class AddCommand extends Command {
  public constructor() {
    super("add", {
      aliases: ["add"],
      category: "Public Commands",
      description: {
        content: "Add a player to an existing pickup",
        usage: "add",
        examples: ["add"],
      },
      channel: "guild",
      ratelimit: 3,
    });
  }

  public exec(message: Message): Promise<Message> {
    return this.client.pugControl.addPlayer(message);
  }
}
