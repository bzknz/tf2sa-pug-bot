// TODO: Split this into a more detailed OOP based system

import { AkairoClient, CommandHandler, ListenerHandler } from "discord-akairo";
import { Message } from "discord.js";
import { join } from "path";
import { PugController } from "../PugController";

declare module "discord-akairo" {
  interface AkairoClient {
    commandHandler: CommandHandler;
    listenerHandler: ListenerHandler;
    pugControl: PugController;
  }
}

interface BotOptions {
  token?: string;
  owners?: string | string[];
}

export default class BotClient extends AkairoClient {
  public config: BotOptions;

  public listenerHandler: ListenerHandler = new ListenerHandler(this, {
    directory: join(__dirname, "..", "listeners"),
  });

  public commandHandler: CommandHandler = new CommandHandler(this, {
    directory: join(__dirname, "..", "commands"),
    prefix: process.env.PREFIX,
    commandUtil: true,
    commandUtilLifetime: 3e5,
    defaultCooldown: 6e4,
    argumentDefaults: {
      prompt: {
        modifyStart: (_: Message, str: string): string =>
          `${str}\n\nType \`cancel\` to cancel the command...`,
        modifyRetry: (_: Message, str: string): string =>
          `${str}\n\nType \`cancel\` to cancel the command...`,
        timeout: "You took too long, the command has no been cancelled...",
        ended:
          "You exceeded the maximum amount of tries, this command has now been cancelled...",
        cancel: "This command has now been cancelled",
        retries: 3,
        time: 3e4,
      },
      otherwise: "",
    },
    ignorePermissions: process.env.OWNERS,
  });

  public constructor(config: BotOptions) {
    super({
      ownerID: config.owners,
    });

    this.config = config;
  }

  private async _init(): Promise<void> {
    this.commandHandler.useListenerHandler(this.listenerHandler);
    this.listenerHandler.setEmitters({
      commandHandler: this.commandHandler,
      listenerHandler: this.listenerHandler,
      process,
    });
    this.commandHandler.loadAll();
    this.listenerHandler.loadAll();
    this.pugControl = new PugController();
  }

  public async start(): Promise<string> {
    await this._init();
    return this.login(this.config.token);
  }
}
