import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class StopCommand extends Command {
  public constructor() {
    super("stop", {
      aliases: ["stop"],
      category: "Moderation Commands",
      description: {
        content: "Stops a pickup if there is one in progress",
        usage: "stop",
        examples: ["stop"],
      },
      channel: "guild",
      ratelimit: 3,
      userPermissions: ["MANAGE_MESSAGES"],
    });
  }

  public exec(message: Message): Promise<Message> {
    return this.client.pugControl.stopPug(); //Working as intended
  }
}
