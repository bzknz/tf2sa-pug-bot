import { GuildMember, Message } from "discord.js";
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
  context: Message;

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
    let servers: string[] = process.env.SERVER_LIST.split(",");
    servers.forEach((s) => {
      let info: string[] = s.split(":");
      this.serverList.push(new TF2Server(info[0], parseInt(info[1]), "games"));
    });
  }

  private loadMaps() {
    this.mapList = process.env.MAP_LIST.split(",");
  }

  private getRandomMap(): string {
    let index: number = Math.floor(Math.random() * this.mapList.length);
    return this.mapList[index];
  }

  public notifySubscribers(msg: string): Promise<Message> {
    const role = this.context.guild.roles.cache.find(
      (role) => role.name === "pug-notification"
    );
    return this.context.channel.send(`<@&${role.id}> ${msg}`);
  }

  private displayReadyStatus(): Promise<Message> {
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
    return this.context.channel.send(finalOutput);
  }

  public displayQueue(): Promise<Message> {
    let output: string = "(";
    for (let i = 0; i < this.pugQueue.getLength(); i++) {
      output = output
        .concat(this.pugQueue.getPlayer(i).player.discordMember.displayName)
        .concat("), (");
    }
    output = output.slice(0, -3);
    let finalOutput: string = `\`\`\`\n Players in queue: [${output}] \`\`\``;
    return this.context.channel.send(finalOutput);
  }

  public startPug(context: Message): Promise<Message> {
    if (this.pug != null)
      return this.context.channel.send("A pug is already in progress");
    this.context = context;
    this.clearInputRoles()
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
                  this.pug.addPlayer(queuedPlayer.player);
              }
              resolve();
            }
          })
      )
      .then(() => this.notifySubscribers("A new pug has been started."))
      .then(() => {
        return this.displayReadyStatus();
      })
      .catch(() => {
        return this.context.channel.send(
          "Cannot start a game, no open servers to use."
        );
      });
  }

  public stopPug(): Promise<Message> {
    if (this.pug == null)
      return this.context.channel.send("There is no pug in progress");
    this.pug.stop();
    return this.context.channel.send("Stopped the pug.");
  }

  public addPlayer(member: GuildMember): Promise<Message> {
    if (this.pug == null)
      return this.context.channel.send("There is no pug in progress.");
    if (this.pug.isFull())
      return this.context.channel.send(
        "The pug is currently full, wait until a new one has been created."
      );
    if (this.pug.addPlayer(new Player(member)))
      return this.displayReadyStatus();
    return this.context.channel.send("Already added to the pug.");
  }

  public addPlayerID(id: string): Promise<Message> {
    return new Promise((resolve, reject) => {
      this.context.guild.members.fetch().then((members) => {
        let member: GuildMember = null;
        members.forEach((m) => {
          if (m.id === id) member = m;
        });
        if (member != null) resolve(this.addPlayer(member));
        else
          resolve(
            this.context.channel.send(`No player found with the ID: ${id}`)
          );
      });
    });
  }

  public removePlayer(id: string): Promise<Message> {
    if (this.pug == null)
      return this.context.channel.send("There is no pug in progress.");
    if (this.pug.removePlayer(id)) return this.displayReadyStatus();
    else return this.context.channel.send("You are not added to the pug.");
  }

  public kickPlayer(name: string): Promise<Message> {
    if (!this.pug == null)
      return this.context.channel.send("There is no pug in progress.");
    switch (this.pug.removePlayerRegex(name)) {
      case 0:
        return this.displayReadyStatus();
      case 1:
        return this.context.channel.send("No player found matching that name.");
      case 2:
        return this.context.channel.send("Multiple matching players found");
    }
  }

  public displayMapList(): Promise<Message> {
    if (this.mapList.length === 0)
      return this.context.channel.send("There are no maps available.");

    let output: String = "Maps: ";
    let nrMaps: number = this.mapList.length;
    for (let i = 0; i < nrMaps - 1; i++) {
      output = output.concat(this.mapList[i]).concat(", ");
    }
    output = output.concat(this.mapList[nrMaps - 1]);
    return this.context.channel.send(output);
  }

  public changeMap(map: string): Promise<Message> {
    if (!this.pug == null)
      return this.context.channel.send("There is no pug in progress.");

    let contains: string[] = [];
    this.mapList.forEach((m) => {
      if (m.indexOf(map) !== -1) contains.push(m);
    });

    if (contains.length === 0) {
      return this.context.channel.send("No matching maps found.");
    }

    if (contains.length === 1) {
      this.pug.currentMap = contains[0];
      return this.displayReadyStatus();
    }

    let output: string = "Multiple maps found: [";
    let nrMaps: number = contains.length;
    for (let i = 0; i < nrMaps; i++) {
      output = output.concat(contains[i]).concat(", ");
    }
    output = output.concat(contains[nrMaps - 1]).concat("]");
    return this.context.channel.send(output);
  }

  public vacateServer(serverID: number): Promise<Message> {
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
          return this.context.channel.send(
            "All players kicked from the server"
          );
        })
        .catch(() => {
          return this.context.channel.send(
            "Unable to kick players from the server"
          );
        });
    } else {
      return this.context.channel.send("No server found matching that ID");
    }
  }

  public readyPlayer(id: string, duration: number) {
    let validDuration =
      duration > this.maxReadyDuration ? this.maxReadyDuration : duration;
    if (validDuration < this.minReadyDuration)
      validDuration = this.minReadyDuration;

    if (this.pug == null || !this.pug.isAdded(id)) {
      return null;
    }
    let temp: Player = this.pug.getPlayer(id);
    temp.updateReady(validDuration);
    this.context.channel.send(
      `${temp.discordMember.displayName} will be ready for the next ${validDuration} minutes`
    );
  }

  public queuePlayer(member: GuildMember): Promise<Message> {
    //If a pug is on, just add as normal
    if (this.pug != null) return this.addPlayer(member);

    if (this.pugQueue.queuePlayer(new Player(member)))
      return this.displayQueue();
    else return this.context.channel.send("Already added to the queue.");
  }

  public dequeuePlayer(id: string): Promise<Message> {
    if (this.pugQueue.removePlayerID(id)) return this.displayQueue();
    else return this.context.channel.send("You were not added to the queue.");
  }

  public displayStatus(): Promise<Message> {
    if (this.pug == null) {
      this.context.channel.send("There is no pug in progress.");
      return this.displayQueue();
    }
    return this.displayReadyStatus();
  }

  private clearInputRoles(): Promise<void> {
    return new Promise((resolve, reject) => {
      const role = this.context.guild.roles.cache.find(
        (role) => role.name === "in-pug"
      );
      const list = this.context.guild.members
        .fetch()
        .then((members) => {
          members.forEach((m, s) => {
            m.roles.remove(role);
          });
          resolve();
        })
        .catch(console.error);
    });
  }

  private checkAvailableServers(): Promise<TF2Server[]> {
    let openServers: TF2Server[] = [];
    return new Promise(async (resolve, reject) => {
      for (let s of this.serverList) {
        await SSQuery.getPlayers(s.address, s.port)
          .then((info) => {
            if (info.length == 0) openServers.push(s);
          })
          .catch(() => console.log("Error retrieving open servers"));
      }
      resolve(openServers);
    });
  }

  private sendConnectionDetails(server: TF2Server) {
    let rcon: RconConnection = new RconConnection(
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
      .catch(() => {});
  }

  //Method declarations for the IServer Interface

  onServerFull(server: TF2Server) {
    const role = this.context.guild.roles.cache.find(
      (role) => role.name === "in-pug"
    );
    let readyMessage: Message;
    let unreadyPlayers: Player[] = this.pug.getUnreadyPlayers();

    if (unreadyPlayers.length == 0) {
      this.context.channel
        .send(
          `<@&${role.id}> Your pickup game is full, everyone is ready. Sending connection details`
        )
        .then(() => this.sendConnectionDetails(server));
    } else {
      let reactMessage: Message;
      this.context.channel
        .send(
          `<@&${role.id}> Your pickup game is full, react below to ready-up`
        )
        .then(
          (message) =>
            new Promise((resolve, reject) => {
              message.react("👍");
              reactMessage = message;

              let unreadyOutput: string = "Unready Players: ";
              unreadyPlayers.forEach((p) => {
                unreadyOutput = unreadyOutput
                  .concat(p.discordMember.displayName)
                  .concat(",");
              });
              unreadyOutput.slice(0, -1);
              resolve(unreadyOutput);
            })
        )
        .then((unreadyOutput) => this.context.channel.send(unreadyOutput))
        .then((message) => {
          //message - the message sent to discord displaying the unready players, will be used to update dynamically
          readyMessage = message;

          this.checkReadyInterval = setInterval(() => {
            //get list of all who have reacted
            reactMessage.reactions
              .resolve("👍")
              .users.fetch()
              .then(
                (users) =>
                  new Promise<void>((resolve, reject) => {
                    users.forEach((u, k, m) => {
                      let player: Player = this.pug.getPlayerID(u.id);
                      if (player != null)
                        player.updateReady(this.readyDuration);
                    });
                    resolve();
                  })
              )
              .then(() => {
                unreadyPlayers = this.pug.getUnreadyPlayers();

                let unreadyOutput: string = "Unready Players: ";
                unreadyPlayers.forEach((p) => {
                  unreadyOutput = unreadyOutput
                    .concat(p.discordMember.displayName)
                    .concat(",");
                });
                unreadyOutput.slice(0, -1);
                readyMessage.edit(unreadyOutput);

                if (unreadyPlayers.length == 0) {
                  clearTimeout(this.readyTimeout);
                  clearTimeout(this.checkReadyInterval);
                  console.log("after clear timeout");
                  this.context.channel
                    .send(
                      `<@&${role.id}> Your pickup game is full, everyone is ready. Sending connection details`
                    )
                    .then(() => this.displayReadyStatus())
                    .then(() => this.sendConnectionDetails(server));
                }
              });
          }, 1000);

          this.readyTimeout = setTimeout(() => {
            let output: string = " ";
            for (let i = 0; i < unreadyPlayers.length; i++) {
              output = output
                .concat(unreadyPlayers[i].discordMember.displayName)
                .concat(", ");
            }
            output = output.slice(0, -2);
            this.context.channel.send(
              `The following players are not ready and have been removed from the pug: ${output}`
            );
            unreadyPlayers.forEach((player) => {
              this.pug.removePlayer(player.discordMember.id);
            });
            this.displayReadyStatus();
          }, 1.2e5);
        })
        .catch(console.error);
    }
  }

  onServerUnfull() {
    this.context.channel.send(
      "Pickup game no longer full, cancelling ready check."
    );
    clearTimeout(this.readyTimeout);
    clearTimeout(this.checkReadyInterval);
  }

  //Method declarations for the IPug Interface

  public onPugStop() {
    this.pug.addedPlayers.forEach((player) => {
      const role = this.context.guild.roles.cache.find(
        (role) => role.name === "in-pug"
      );
      player.discordMember.roles.remove(role);
    });
    this.pug = null;
  }

  public onPlayerAdded(player: Player) {
    const role = this.context.guild.roles.cache.find(
      (role) => role.name === "in-pug"
    );
    player.discordMember.roles.add(role);
  }

  public onPlayerRemoved(player: Player) {
    const role = this.context.guild.roles.cache.find(
      (role) => role.name === "in-pug"
    );
    player.discordMember.roles.remove(role);
  }
}
