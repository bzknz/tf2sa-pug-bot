import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class SubscribeCommand extends Command {
  public constructor() {
    super("subscribe", {
      aliases: ["subscribe"],
      category: "Public Commands",
      description: {
        content: "Assigns the member to a pug notification role",
        usage: "subscribe",
        examples: ["subscribe"],
      },
      channel: "guild",
      ratelimit: 3,
    });
  }

  public exec(message: Message): Promise<Message> {
    if (
      message.member.roles.cache.some(
        (role) => role.name === "pug-notification"
      )
    )
      return message.util.send(
        "You are already assigned the pug-notification role"
      );

    const role = message.guild.roles.cache.find(
      (role) => role.name === "pug-notification"
    );
    message.member.roles.add(role);

    return message.util.send(
      "You have been assigned the pug-notification role"
    );
  }
}
