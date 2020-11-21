import { Message } from "discord.js";
import { IPug } from "../interfaces/PugInterfaces";
import { IServerFull, IServerUnfull } from "../interfaces/ServerInterfaces";
import { Player } from "../models/Player";
import { TF2Server } from "../models/TF2Server";

export class Pug {
  server: TF2Server;
  maxPlayers: number;
  addedPlayers: Player[];
  currentMap: string;
  serverFull: IServerFull;
  serverUnfull: IServerUnfull;
  pugListener: IPug;
  readyPlayers: Player[];
  readyDuration: number;

  constructor(
    server: TF2Server,
    maxPlayers: number,
    map: string,
    readyDuration: number,
    serverFull: IServerFull,
    serverUnfull: IServerUnfull,
    pugListener: IPug
  ) {
    this.server = server;
    this.maxPlayers = maxPlayers;
    this.addedPlayers = [];
    this.currentMap = map;
    this.readyDuration = readyDuration;
    this.serverFull = serverFull;
    this.serverUnfull = serverUnfull;
    this.pugListener = pugListener;
    this.readyPlayers = [];
  }

  public addPlayer(message: Message, player: Player): boolean {
    let added = false;
    this.addedPlayers.forEach((m) => {
      if (m.discordMember.id === player.discordMember.id) added = true;
    });

    if (!added) {
      this.addedPlayers.push(player);
      this.pugListener.onPlayerAdded(message, player);
      player.updateReady(this.readyDuration);
      if (this.addedPlayers.length === this.maxPlayers) {
        this.serverFull.onServerFull(message, this.server);
      }
      return true;
    }
    return false;
  }

  public removePlayer(message: Message, id: string): boolean {
    let player: Player = null;
    this.addedPlayers.forEach((p) => {
      if (p.discordMember.id === id) player = p;
    });

    if (player) {
      if (this.addedPlayers.length == this.maxPlayers) {
        this.serverUnfull.onServerUnfull(message);
      }
      this.addedPlayers = this.addedPlayers.filter(
        (addedPlayer) => addedPlayer.discordMember.id != id
      );
      this.pugListener.onPlayerRemoved(message, player);
      return true;
    }
    return false;
  }

  public removePlayerNoCallback(message: Message, id: string) {
    let addedPlayer: Player = null;
    this.addedPlayers.forEach((p) => {
      if (p.discordMember.id === id) addedPlayer = p;
    });

    if (addedPlayer != null) {
      this.addedPlayers = this.addedPlayers.filter(function (
        value,
        index,
        arr
      ) {
        return value.discordMember.id != id;
      });
      this.pugListener.onPlayerRemoved(message, addedPlayer);
      return true;
    }
    return false;
  }

  public removePlayerRegex(message: Message, name: string): number {
    //0 - successfully kicked, 1 - no player found, 2 - multiple players match the name
    let contains: Player[] = [];
    this.addedPlayers.forEach((p) => {
      if (p.discordMember.displayName.indexOf(name) != -1) contains.push(p);
    });

    if (contains.length === 0) return 1;

    if (contains.length === 1) {
      this.removePlayer(message, contains[0].discordMember.id);
      return 0;
    }

    return 2;
  }

  public stop(message: Message) {
    if (this.addedPlayers.length == this.maxPlayers) {
      this.serverUnfull.onServerUnfull(message);
    }
    this.pugListener.onPugStop(message);
  }

  public getPlayer(id: string): Player {
    let player: Player;
    this.addedPlayers.forEach((p) => {
      if (p.discordMember.id === id) player = p;
    });
    return player;
  }

  public getPlayerById(id: string): Player {
    let player: Player;
    this.addedPlayers.forEach((p) => {
      if (p.discordMember.id == id) player = p;
    });
    return player;
  }

  public isAdded(id: string) {
    let added: boolean = false;
    this.addedPlayers.forEach((p) => {
      if (p.discordMember.id == id) added = true;
    });
    return added;
  }

  public isFull(): boolean {
    return this.addedPlayers.length == this.maxPlayers;
  }

  public getUnreadyPlayers(): Player[] {
    let unreadyPlayers: Player[] = [];
    let currentTime: number = new Date().getTime();
    this.addedPlayers.forEach((player) => {
      if (currentTime > player.readyUntilTime) unreadyPlayers.push(player);
    });
    return unreadyPlayers;
  }
}
