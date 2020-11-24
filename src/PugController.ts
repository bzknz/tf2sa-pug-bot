import { Collection, MessageEmbed } from "discord.js";
import { GuildMember } from "discord.js";
import { Message } from "discord.js";
import { IPug } from "./interfaces/PugInterfaces";
import { IServerFull, IServerUnfull } from "./interfaces/ServerInterfaces";
import { Player } from "./models/Player";
import { Pug } from "./models/Pug";
import { PugQueue } from "./models/PugQueue";
import { QueuedPlayer } from "./models/QueuedPlayer";
import { TF2Server } from "./models/TF2Server";
import RconConnection from "./util/RconConnection";
import { SSQuery } from "./util/SSQuery";

const NO_PUG_IN_PROGRESS_MSG =
  "There is no PUG in progress. Use `!start` to start one or `!q` to queue for the next one.";

export class PugController implements IServerFull, IServerUnfull, IPug {
  pug: Pug;
  pugQueue: PugQueue;

  serverList: TF2Server[] = [];
  mapList: string[] = [];

  checkReadyInterval: NodeJS.Timeout;
  readyTimeout: NodeJS.Timeout;

  maxPlayers = 12;
  readyDuration = 10;
  queueDuration = 3.6e6; // 1 Hour maximum limit in queue
  minReadyDuration = 15;
  maxReadyDuration = 30;
  rconPassword = process.env.RCON_PASSWORD;

  constructor() {
    this.loadServers();
    this.loadMaps();
    this.pugQueue = new PugQueue();
  }

  private loadServers() {
    const servers = process.env.SERVER_LIST.split(",");
    servers.forEach((s) => {
      const info = s.split(":");
      this.serverList.push(new TF2Server(info[0], parseInt(info[1]), "games"));
    });
  }

  private loadMaps() {
    this.mapList = process.env.MAP_LIST.split(",");
  }

  private getRandomMap(): string {
    const index = Math.floor(Math.random() * this.mapList.length);
    return this.mapList[index];
  }

  public notifySubscribers(message: Message, msg: string): Promise<Message> {
    const role = message.guild.roles.cache.find(
      (role) => role.name === "pug-notification"
    );
    if (role) {
      return message.channel.send(`<@&${role.id}> ${msg}`);
    } else {
      return message.channel.send(
        "Error: could not find the `pug-notification` role."
      );
    }
  }

  private displayReadyStatus(message: Message): Promise<Message> {
    const currentTime: number = new Date().getTime();
    const playersStr = this.pug.addedPlayers
      .map(
        (player) =>
          `${player.discordMember.displayName} ${
            currentTime > player.readyUntilTime
              ? " :zzz:"
              : " :ballot_box_with_check:"
          }`
      )
      .join(", ");

    const embed = new MessageEmbed().setDescription(`Map: ${this.pug.currentMap}
    Players (${this.pug.addedPlayers.length}/${this.maxPlayers}): [${playersStr}]`);

    return message.channel.send(embed);
  }

  public displayQueue(message: Message): Promise<Message> {
    const numQueued = this.pugQueue.getPlayers().length;
    if (numQueued === 0) {
      return message.channel.send("The queue is empty.");
    } else {
      return message.channel.send(
        `Queued players: (${numQueued}): ${this.pugQueue
          .getPlayers()
          .map((p) => p.player.discordMember.displayName)
          .join(", ")}.`
      );
    }
  }

  public async startPug(message: Message) {
    if (this.pug) {
      return message.channel.send("A PUG is already in progress.");
    }

    const clearStatus = await this.clearInputRoles(message);
    if (!clearStatus) {
      await message.channel.send(
        "Error: could remove users from the `in-pug` role."
      );
      // Not a fatal error, don't return here.
    }

    const openServers = await this.checkAvailableServers();
    if (openServers.length === 0) {
      await message.channel.send(
        "Cannot start a game, no open servers to use. Players need to leave the server or an admin needs to issue `!vacate` to kick them all."
      );
      return;
    }

    // Start the PUG
    const map = this.getRandomMap();

    this.pug = new Pug(
      openServers[0],
      this.maxPlayers,
      map,
      this.readyDuration,
      this,
      this,
      this
    );

    // Add players from the queue
    const numPlayersToAddFromQueue =
      this.pugQueue.getLength() > this.maxPlayers
        ? this.maxPlayers
        : this.pugQueue.getLength();

    const playersAddedFromQueue: QueuedPlayer[] = [];
    for (let i = 0; i < numPlayersToAddFromQueue; i++) {
      const queuedPlayer = this.pugQueue.dequeue();
      if (queuedPlayer.timeInQueue() < this.queueDuration) {
        playersAddedFromQueue.push(queuedPlayer);
        this.pug.addPlayer(message, queuedPlayer.player);
      }
    }

    if (numPlayersToAddFromQueue < this.maxPlayers) {
      // The PUG did not instantly fill, so let users know it has started
      await this.notifySubscribers(message, "A new PUG has been started.");
      await this.displayReadyStatus(message);
    } else {
      // This PUG is going to instantly fill
      await message.channel.send(
        `The PUG filled instantly with members from the queue :exploding_head:\nMap: ${map}\nPlayers: ${playersAddedFromQueue
          .map((p) => p.player.discordMember.displayName)
          .join(", ")}`
      );
    }
  }

  public stopPug(message: Message): Promise<Message> {
    if (!this.pug) {
      return message.channel.send(NO_PUG_IN_PROGRESS_MSG);
    } else {
      this.pug.stop(message);
      return message.channel.send("Stopped the PUG.");
    }
  }

  public addPlayer(message: Message): Promise<Message> {
    const member = message.member;
    if (!this.pug) {
      return message.channel.send(NO_PUG_IN_PROGRESS_MSG);
    } else if (this.pug.isFull()) {
      return message.channel.send(
        "The PUG is currently full. Queue for the next one with `!q`."
      );
    } else if (this.pug.addPlayer(message, new Player(member))) {
      return this.displayReadyStatus(message);
    } else {
      return message.channel.send("Already added to the PUG.");
    }
  }

  public removePlayer(message: Message, id: string): Promise<Message> {
    if (!this.pug) {
      return message.channel.send(NO_PUG_IN_PROGRESS_MSG);
    } else if (this.pug.removePlayer(message, id)) {
      return this.displayReadyStatus(message);
    } else {
      return message.channel.send("You are not added to the PUG.");
    }
  }

  public kickPlayer(message: Message, name: string): Promise<Message> {
    if (!this.pug == null) {
      return message.channel.send(NO_PUG_IN_PROGRESS_MSG);
    }
    switch (this.pug.removePlayerRegex(message, name)) {
      case 0:
        return this.displayReadyStatus(message);
      case 1:
        return message.channel.send("No player found matching that name.");
      case 2:
        return message.channel.send("Multiple matching players found");
    }
  }

  public displayMapList(message: Message): Promise<Message> {
    if (this.mapList.length === 0) {
      return message.channel.send("There are no maps available.");
    }

    let output: String = "Maps: ";
    let nrMaps: number = this.mapList.length;
    for (let i = 0; i < nrMaps - 1; i++) {
      output = output.concat(this.mapList[i]).concat(", ");
    }
    output = output.concat(this.mapList[nrMaps - 1]);
    return message.channel.send(output);
  }

  public changeMap(message: Message, map: string): Promise<Message> {
    if (!this.pug) {
      return message.channel.send(NO_PUG_IN_PROGRESS_MSG);
    }

    const contains: string[] = [];
    this.mapList.forEach((m) => {
      if (m.indexOf(map) !== -1) contains.push(m);
    });

    if (contains.length === 0) {
      return message.channel.send("No matching maps found.");
    }

    if (contains.length === 1) {
      this.pug.currentMap = contains[0];
      return this.displayReadyStatus(message);
    }

    let output: string = "Multiple maps found: [";
    let nrMaps: number = contains.length;
    for (let i = 0; i < nrMaps; i++) {
      output = output.concat(contains[i]).concat(", ");
    }
    output = output.concat(contains[nrMaps - 1]).concat("]");
    return message.channel.send(output);
  }

  public async vacateServer(
    message: Message,
    serverID: number
  ): Promise<Message> {
    const currServer = this.serverList[serverID];
    if (currServer) {
      const rcon = new RconConnection(
        currServer.address,
        currServer.port,
        this.rconPassword
      );
      try {
        await rcon.sendCommand("kickall");
      } catch (e) {
        console.error(e);
        return message.channel.send(
          "Unable to kick players from the server. Is the server down?"
        );
      }
      return message.channel.send("All players kicked from the server.");
    } else {
      return message.channel.send(
        "No server found at that index in the array of servers."
      );
    }
  }

  public readyPlayer(message: Message, id: string, duration: number) {
    let validDuration =
      duration > this.maxReadyDuration ? this.maxReadyDuration : duration;
    if (validDuration < this.minReadyDuration) {
      validDuration = this.minReadyDuration;
    }

    if (this.pug && this.pug.isAdded(id)) {
      const player: Player = this.pug.getPlayer(id);
      player.updateReady(validDuration);
      return message.channel.send(
        `${player.discordMember.displayName} will be ready for the next ${validDuration} minutes.`
      );
    } else {
      return message.channel.send(
        `Can't ready ${message.member.displayName} as they are not in the PUG.`
      );
    }
  }

  public queuePlayer(message: Message): Promise<Message> {
    if (this.pug) {
      // Add the player directly to the PUG if one is already started
      return this.addPlayer(message);
    } else {
      const player = new Player(message.member);
      const isInQueue = this.pugQueue.getIsPlayerInQueue(player);
      if (!isInQueue) {
        this.pugQueue.queuePlayer(player);
        return this.displayQueue(message);
      } else {
        return message.channel.send(
          `${player.discordMember.displayName} is already in the queue.`
        );
      }
    }
  }

  public dequeuePlayer(message: Message, id: string): Promise<Message> {
    const player = new Player(message.member);
    const isInQueue = this.pugQueue.getIsPlayerInQueue(player);

    if (isInQueue) {
      this.pugQueue.removePlayer(player);
      return this.displayQueue(message);
    } else {
      return message.channel.send(
        `${player.discordMember.displayName} was not removed from the queue as they are not in the queue.`
      );
    }
  }

  public displayStatus(message: Message): Promise<Message> {
    if (this.pug) {
      return this.displayReadyStatus(message);
    } else {
      message.channel.send(NO_PUG_IN_PROGRESS_MSG);
      return this.displayQueue(message);
    }
  }

  private async clearInputRoles(message: Message): Promise<boolean> {
    const role = message.guild.roles.cache.find(
      (role) => role.name === "in-pug"
    );

    if (!role) {
      await message.channel.send("Error: could not find the `in-pug` role.");
      return false;
    }

    let members: Collection<string, GuildMember>;
    try {
      members = await message.guild.members.fetch();
    } catch (e) {
      console.error(e);
      await message.channel.send(`Error: could not a list of members.`);
      return false;
    }

    if (members) {
      for (const [, member] of members) {
        try {
          member.roles.remove(role);
        } catch (e) {
          console.error(e);
          await message.channel.send(`Error: getting roles for a member.`);
          return false;
        }
      }
    } else {
      await message.channel.send(`Error: no members returned from the server.`);
      return false;
    }
    return true;
  }

  private async checkAvailableServers(): Promise<TF2Server[]> {
    const openServers: TF2Server[] = [];

    for (const server of this.serverList) {
      let serverInfo: any[];
      try {
        serverInfo = await SSQuery.getPlayers(server.address, server.port);
      } catch (e) {
        console.error(e);
      }
      if (serverInfo?.length === 0) {
        openServers.push(server);
      }
    }

    return openServers;
  }

  private sendConnectionDetails(server: TF2Server) {
    const rcon: RconConnection = new RconConnection(
      server.address,
      server.port,
      process.env.RCON_PASSWORD
    );
    rcon
      .sendCommand(`changelevel ${this.pug.currentMap}`)
      .then(() => {
        this.pug.addedPlayers.forEach((player) => {
          player.discordMember.send(
            `Your pickup game is ready, please join the server at steam://connect/${server.address}:${server.port}/${server.password}`
          );
        });
        this.pug = null;
      })
      .catch((e) => console.error(e));
  }

  private getUnreadyMsg() {
    const unreadyPlayers = this.pug.getUnreadyPlayers();
    if (unreadyPlayers.length === 0) {
      return "Everyone is ready!";
    }
    return `Unready players: ${unreadyPlayers
      .map((p) => `<@${p.discordMember.id}>`)
      .join(", ")}`;
  }

  onServerFull(message: Message, server: TF2Server) {
    const role = message.guild.roles.cache.find(
      (role) => role.name === "in-pug"
    );
    const allReadyMsg = `:fireworks: The PUG is full and everyone is ready. Sending connection details via DM.`;
    const unreadyPlayers = this.pug.getUnreadyPlayers();
    if (unreadyPlayers.length === 0) {
      // Everyone is ready
      message.channel
        .send(`<@&${role.id}> ${allReadyMsg}`)
        .then(() => this.sendConnectionDetails(server));
    } else {
      // Ask players to ready up
      let reactMessage: Message;
      message.channel
        .send(
          `<@&${role.id}> The PUG is full. React below (click the thumb) to ready-up.`
        )
        .then((gameFullMsg) => {
          reactMessage = gameFullMsg;
          return gameFullMsg.react("👍");
        })
        .then(() => {
          return message.channel.send(this.getUnreadyMsg());
        })
        .then((unreadyListMsg) => {
          this.checkReadyInterval = setInterval(() => {
            // Get a list of all who have reacted
            reactMessage.reactions
              .resolve("👍")
              .users.fetch()
              .then((users) => {
                users.forEach((user) => {
                  const player = this.pug.getPlayerById(user.id);
                  if (player) {
                    player.updateReady(this.readyDuration);
                  }
                });

                unreadyListMsg.edit(this.getUnreadyMsg());
                const unreadyPlayers = this.pug.getUnreadyPlayers();

                if (unreadyPlayers.length === 0) {
                  clearTimeout(this.readyTimeout);
                  clearInterval(this.checkReadyInterval);
                  unreadyListMsg.channel
                    .send(`<@&${role.id}> ${allReadyMsg}`)
                    .then(() => this.displayReadyStatus(message))
                    .then(() => this.sendConnectionDetails(server));
                }
              });
          }, 1000);

          this.readyTimeout = setTimeout(() => {
            const unreadyPlayers = this.pug.getUnreadyPlayers();
            unreadyPlayers.forEach((player) => {
              this.pug.removePlayer(message, player.discordMember.id);
            });
            unreadyListMsg.channel.send(
              `The following players did not ready up in time and have been removed: ${unreadyPlayers
                .map((p) => `<@${p.discordMember.id}>`)
                .join(", ")}`
            );
            this.displayReadyStatus(message);
          }, 1.2e5);
        })
        .catch((e) => {
          console.error(e);
          message.channel.send("Something went wrong. :(");
        });
    }
  }

  onServerUnfull(message: Message) {
    message.channel.send("The PUG is no longer full, cancelling ready check.");
    clearTimeout(this.readyTimeout);
    clearInterval(this.checkReadyInterval);
  }

  public onPugStop(message: Message) {
    this.pug.addedPlayers.forEach((player) => {
      const role = message.guild.roles.cache.find(
        (role) => role.name === "in-pug"
      );
      player.discordMember.roles.remove(role);
    });
    this.pug = null;
  }

  public onPlayerAdded(message: Message, player: Player) {
    const role = message.guild.roles.cache.find(
      (role) => role.name === "in-pug"
    );
    player.discordMember.roles.add(role);
  }

  public onPlayerRemoved(message: Message, player: Player) {
    const role = message.guild.roles.cache.find(
      (role) => role.name === "in-pug"
    );
    player.discordMember.roles.remove(role);
  }
}
