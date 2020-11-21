import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class ReadyCommand extends Command {
  public constructor() {
    super("ready", {
      aliases: ["ready"],
      category: "Public Commands",
      description: {
        content: "Confirms that you are ready to play the current pickup",
        usage: "ready",
        examples: ["ready"],
      },
      args: [
        {
          id: "duration",
          type: "number",
          default: "15",
        },
      ],
      channel: "guild",
      ratelimit: 3,
    });
  }

  public exec(
    message: Message,
    { duration }: { duration: number }
  ): Promise<Message> {
    return this.client.pugControl.readyPlayer(
      message,
      message.member.id,
      Math.round(duration)
    );
  }
}
