import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class AddCommand extends Command {
  public constructor() {
    super("addID", {
      aliases: ["addID"],
      category: "Moderation Commands",
      description: {
        content: "Add a specific player to an pickup based on their discord ID",
        usage: "addID",
        examples: ["addID"],
      },
      channel: "guild",
      ratelimit: 3,
      args: [
        {
          id: "id",
          type: "string",
          default: "",
        },
      ],
      userPermissions: ["MANAGE_MESSAGES"],
    });
  }

  public exec(message: Message, { id }: { id: string }): Promise<Message> {
    return this.client.pugControl.addPlayerID(id); //Working as intended
  }
}
