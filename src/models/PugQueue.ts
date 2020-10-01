import { Player } from "../models/Player";
import { QueuedPlayer } from "../models/QueuedPlayer";

export class PugQueue {
  //TODO Figure out how the fuck to do nested classes for QueuedPlayer

  queue: QueuedPlayer[];

  constructor() {
    this.queue = [];
  }

  public queuePlayer(player: Player): boolean {
    let inQueue: boolean = false;
    this.queue.forEach((p) => {
      if (
        p.player.discordMember.displayName == player.discordMember.displayName
      )
        inQueue = true;
    });
    if (inQueue) return false;
    else {
      this.queue.push(new QueuedPlayer(player));
      return true;
    }
  }

  public removePlayer(player: Player): boolean {
    let addedPlayer: QueuedPlayer = null;
    this.queue.forEach((p) => {
      if (p.player.discordMember === player.discordMember) addedPlayer = p;
    });

    if (addedPlayer != null) {
      this.queue = this.queue.filter(function (value, index, arr) {
        return value.player.discordMember != player.discordMember;
      });
      return true;
    }
    return false;
  }

  public removePlayerID(id: string): boolean {
    let addedPlayer: QueuedPlayer = null;
    this.queue.forEach((p) => {
      if (p.player.discordMember.id === id) addedPlayer = p;
    });

    if (addedPlayer != null) {
      this.queue = this.queue.filter(function (value, index, arr) {
        return value.player.discordMember.id != id;
      });
      return true;
    }
    return false;
  }

  public dequeue(): QueuedPlayer {
    if (this.queue.length == 0) return null;
    let temp: QueuedPlayer[] = [];
    let player: QueuedPlayer;
    for (let i = 1; i < this.queue.length; i++) {
      temp.push(this.queue[i]);
    }
    player = this.queue[0];
    this.queue = temp;
    return player;
  }

  public getLength(): number {
    return this.queue.length;
  }

  public getPlayer(index: number): QueuedPlayer {
    if (index > this.queue.length || index < 0) return null;
    return this.queue[index];
  }
}
