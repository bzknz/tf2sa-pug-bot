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

  public addPlayer(player: Player): boolean {
    let added = false;
    this.addedPlayers.forEach((m) => {
      if (m.discordMember.id === player.discordMember.id) added = true;
    });

    if (!added) {
      this.addedPlayers.push(player);
      this.pugListener.onPlayerAdded(player);
      player.updateReady(this.readyDuration);
      if (this.addedPlayers.length == this.maxPlayers) {
        this.serverFull.onServerFull(this.server);
      }
      return true;
    }
    return false;
  }

  public removePlayer(id: string): boolean {
    let player: Player = null;
    this.addedPlayers.forEach((p) => {
      if (p.discordMember.id === id) player = p;
    });

    if (player != null) {
      if (this.addedPlayers.length == this.maxPlayers) {
        this.serverUnfull.onServerUnfull();
      }
      this.addedPlayers = this.addedPlayers.filter(function (
        value,
        index,
        arr
      ) {
        return value.discordMember.id != id;
      });
      this.pugListener.onPlayerRemoved(player);
      return true;
    }
    return false;
  }

  public removePlayerNoCallback(id: string) {
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
      this.pugListener.onPlayerRemoved(addedPlayer);
      return true;
    }
    return false;
  }

  public removePlayerRegex(name: string): number {
    //0 - successfully kicked, 1 - no player found, 2 - multiple players match the name
    let contains: Player[] = [];
    this.addedPlayers.forEach((p) => {
      if (p.discordMember.displayName.indexOf(name) != -1) contains.push(p);
    });

    if (contains.length === 0) return 1;

    if (contains.length === 1) {
      this.removePlayer(contains[0].discordMember.id);
      return 0;
    }

    return 2;
  }

  public stop() {
    if (this.addedPlayers.length == this.maxPlayers) {
      this.serverUnfull.onServerUnfull();
    }
    this.pugListener.onPugStop();
  }

  public getPlayer(id: string): Player {
    let player: Player;
    this.addedPlayers.forEach((p) => {
      if (p.discordMember.id === id) player = p;
    });
    return player;
  }

  public getPlayerID(id: string): Player {
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
