import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class RemoveCommand extends Command {
  public constructor() {
    super("rem", {
      aliases: ["rem"],
      category: "Public Commands",
      description: {
        content: "Remove a player from a pickup",
        usage: "rem",
        examples: ["rem"],
      },
      channel: "guild",
      ratelimit: 3,
    });
  }

  public exec(message: Message): Promise<Message> {
    return this.client.pugControl.removePlayer(message, message.member.id);
  }
}
