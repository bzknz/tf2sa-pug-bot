import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class ChangeMapCommand extends Command {
  public constructor() {
    super("map", {
      aliases: ["map"],
      category: "Moderation Commands",
      description: {
        content: "Changes the current pickup map",
        usage: "map [ map ]",
        examples: ["map cp_process_final"],
      },
      channel: "guild",
      ratelimit: 3,
      args: [
        {
          id: "map",
          type: "string",
          match: "rest",
          default: "",
        },
      ],
      //userPermissions: ["MANAGE_MESSAGES"]
    });
  }

  public exec(message: Message, { map }: { map: string }): Promise<Message> {
    return this.client.pugControl.changeMap(message, map);
  }
}
