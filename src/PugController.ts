import { Message } from "discord.js";
import { IPug } from "./interfaces/PugInterfaces";
import { IServerFull, IServerUnfull } from "./interfaces/ServerInterfaces";
import { Player } from "./models/Player";
import { Pug } from "./models/Pug";
import { PugQueue } from "./models/PugQueue";
import { TF2Server } from "./models/TF2Server";
import RconConnection from "./util/RconConnection";
import { SSQuery } from "./util/SSQuery";

export class PugController implements IServerFull, IServerUnfull, IPug {
  pug: Pug;
  pugQueue: PugQueue;

  serverList: TF2Server[] = [];
  mapList: string[] = [];

  checkReadyInterval: NodeJS.Timeout;
  readyTimeout: NodeJS.Timeout;

  maxPlayers = 12;
  readyDuration = 15;
  queueDuration = 3.6e6; // 1 Hour maximum limit in queue
  minReadyDuration = 15;
  maxReadyDuration = 30;
  rconPassword: string = process.env.RCON_PASSWORD;

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
        `Error: could not find pug-notification role.`
      );
    }
  }

  private displayReadyStatus(message: Message): Promise<Message> {
    let output: string = "(";
    let currentTime: number = new Date().getTime();
    for (let i = 0; i < this.maxPlayers; i++) {
      let currPlayer: Player = this.pug.addedPlayers[i];
      if (currPlayer == null) output = output.concat("?").concat("), (");
      else {
        let readyString: string =
          currentTime > currPlayer.readyUntilTime ? "<unready>" : "<ready>";
        output = output
          .concat(currPlayer.discordMember.displayName)
          .concat(readyString)
          .concat("), (");
      }
    }
    output = output.slice(0, -3);
    let finalOutput: string = `\`\`\`\n (${this.pug.currentMap}) [${this.pug.addedPlayers.length}/${this.maxPlayers}] Players: [${output}] \`\`\``;
    return message.channel.send(finalOutput);
  }

  public displayQueue(message: Message): Promise<Message> {
    let output: string = "(";
    for (let i = 0; i < this.pugQueue.getLength(); i++) {
      output = output
        .concat(this.pugQueue.getPlayer(i).player.discordMember.displayName)
        .concat("), (");
    }
    output = output.slice(0, -3);
    let finalOutput: string = `\`\`\`\n Players in queue: [${output}] \`\`\``;
    return message.channel.send(finalOutput);
  }

  public startPug(message: Message): Promise<Message> {
    if (this.pug != null) {
      return message.channel.send("A PUG is already in progress.");
    }

    this.clearInputRoles(message)
      .then(() => this.checkAvailableServers())
      .then(
        (openServers) =>
          new Promise((resolve, reject) => {
            if (openServers.length == 0) reject();
            else {
              this.pug = new Pug(
                openServers[0],
                this.maxPlayers,
                this.getRandomMap(),
                this.readyDuration,
                this,
                this,
                this
              );
              let iterations: number =
                this.pugQueue.getLength() > this.maxPlayers
                  ? this.maxPlayers
                  : this.pugQueue.getLength();
              for (let i = 0; i < iterations; i++) {
                let queuedPlayer = this.pugQueue.dequeue();
                if (queuedPlayer.timeInQueue() < this.queueDuration)
                  this.pug.addPlayer(message, queuedPlayer.player);
              }
              resolve();
            }
          })
      )
      .then(() =>
        this.notifySubscribers(message, "A new pug has been started.")
      )
      .then(() => {
        return this.displayReadyStatus(message);
      })
      .catch((e) => {
        console.error(e);
        return message.channel.send(
          "Cannot start a game, no open servers to use."
        );
      });
  }

  public stopPug(message: Message): Promise<Message> {
    if (this.pug == null) {
      return message.channel.send("There is no pug in progress");
    } else {
      this.pug.stop(message);
      return message.channel.send("Stopped the pug.");
    }
  }

  public addPlayer(message: Message): Promise<Message> {
    const member = message.member;
    if (this.pug == null) {
      return message.channel.send("There is no pug in progress.");
    } else if (this.pug.isFull()) {
      return message.channel.send(
        "The pug is currently full, wait until a new one has been created."
      );
    } else if (this.pug.addPlayer(message, new Player(member))) {
      return this.displayReadyStatus(message);
    } else {
      return message.channel.send("Already added to the pug.");
    }
  }

  public removePlayer(message: Message, id: string): Promise<Message> {
    if (this.pug == null) {
      return message.channel.send("There is no pug in progress.");
    } else if (this.pug.removePlayer(message, id)) {
      return this.displayReadyStatus(message);
    } else {
      return message.channel.send("You are not added to the pug.");
    }
  }

  public kickPlayer(message: Message, name: string): Promise<Message> {
    if (!this.pug == null) {
      return message.channel.send("There is no pug in progress.");
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
    if (!this.pug == null) {
      return message.channel.send("There is no pug in progress.");
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

  public vacateServer(message: Message, serverID: number): Promise<Message> {
    const currServer = this.serverList[serverID];
    if (currServer != null) {
      const rcon = new RconConnection(
        currServer.address,
        currServer.port,
        this.rconPassword
      );
      rcon
        .sendCommand("kickall")
        .then(() => {
          return message.channel.send("All players kicked from the server.");
        })
        .catch(() => {
          return message.channel.send(
            "Unable to kick players from the server."
          );
        });
    } else {
      return message.channel.send("No server found matching that ID.");
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
      message.channel.send("There is no PUG in progress.");
      return this.displayQueue(message);
    }
  }

  private clearInputRoles(message: Message): Promise<void> {
    return new Promise((resolve) => {
      const role = message.guild.roles.cache.find(
        (role) => role.name === "in-pug"
      );

      if (!role) {
        message.channel.send(`Error: could not find the in-pug role.`);
        resolve();
      } else {
        message.guild.members
          .fetch()
          .then((members) => {
            if (members) {
              members.forEach((member) => {
                member.roles.remove(role);
              });
            } else {
              message.channel.send(`Error: could not get membership roles.`);
            }
            resolve();
          })
          .catch((e) => {
            message.channel.send(`Error: could not get membership roles.`);
            console.error(e);
            resolve();
          });
      }
    });
  }

  private checkAvailableServers(): Promise<TF2Server[]> {
    const openServers: TF2Server[] = [];
    return new Promise(async (resolve, reject) => {
      for (const server of this.serverList) {
        await SSQuery.getPlayers(server.address, server.port)
          .then((info) => {
            if (info.length == 0) openServers.push(server);
          })
          .catch(() => console.log("Error retrieving open servers."));
      }
      resolve(openServers);
    });
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
    return `Unready players: ${unreadyPlayers
      .map((p) => p.discordMember.displayName)
      .join(", ")}`;
  }

  onServerFull(message: Message, server: TF2Server) {
    const role = message.guild.roles.cache.find(
      (role) => role.name === "in-pug"
    );

    let reactMessage: Message;

    const unreadyPlayers = this.pug.getUnreadyPlayers();
    if (unreadyPlayers.length === 0) {
      message.channel
        .send(
          `<@&${role.id}> Your pickup game is full, everyone is ready. Sending connection details.`
        )
        .then(() => this.sendConnectionDetails(server));
    } else {
      message.channel
        .send(
          `<@&${role.id}> Your pickup game is full, react below to ready-up.`
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
                    .send(
                      `<@&${role.id}> Your pickup game is full, everyone is ready. Sending connection details.`
                    )
                    .then(() => this.displayReadyStatus(message))
                    .then(() => this.sendConnectionDetails(server));
                }
              });
          }, 1000);

          this.readyTimeout = setTimeout(() => {
            const unreadyPlayers = this.pug.getUnreadyPlayers();
            unreadyListMsg.channel.send(
              `The following players are not ready and have been removed: ${unreadyPlayers
                .map((p) => p.discordMember.id)
                .join(", ")}`
            );
            unreadyPlayers.forEach((player) => {
              this.pug.removePlayer(message, player.discordMember.id);
            });
            this.displayReadyStatus(message);
          }, 1.2e5);
        })
        .catch(console.error);
    }
  }

  onServerUnfull(message: Message) {
    message.channel.send("Pickup game no longer full, cancelling ready check.");
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
