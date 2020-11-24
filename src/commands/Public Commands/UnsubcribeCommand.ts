import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class UnsubscribeCommand extends Command {
  public constructor() {
    super("unsubscribe", {
      aliases: ["unsubscribe"],
      category: "Public Commands",
      description: {
        content: "Removes the member from a pug notification role",
        usage: "unsubscribe",
        examples: ["unsubscribe"],
      },
      channel: "guild",
      ratelimit: 3,
    });
  }

  public exec(message: Message): Promise<Message> {
    if (
      !message.member.roles.cache.some(
        (role) => role.name === "pug-notification"
      )
    )
      return message.util.send(
        "You are already removed from the pug-notification role"
      );

    const role = message.guild.roles.cache.find(
      (role) => role.name === "pug-notification"
    );
    message.member.roles.remove(role);

    return message.util.send(
      "You have been removed from the pug-notification role"
    );
  }
}
