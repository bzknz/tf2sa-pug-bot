import { Player } from "../models/Player";
import { QueuedPlayer } from "../models/QueuedPlayer";

export class PugQueue {
  queue: QueuedPlayer[];

  constructor() {
    this.queue = [];
  }

  public getIsPlayerInQueue(player: Player): boolean {
    return this.queue.some(
      (queuedPlayer) =>
        queuedPlayer.player.discordMember.id === player.discordMember.id
    );
  }

  public queuePlayer(player: Player) {
    this.queue.push(new QueuedPlayer(player));
  }

  public removePlayer(player: Player) {
    this.removePlayerById(player.discordMember.id);
  }

  public removePlayerById(id: string) {
    this.queue = this.queue.filter(
      (queuedPlayer) => queuedPlayer.player.discordMember.id !== id
    );
  }

  public dequeue(): QueuedPlayer {
    if (this.queue.length > 0) {
      return this.queue.shift();
    } else {
      return null;
    }
  }

  public getLength(): number {
    return this.queue.length;
  }

  public getPlayers(): QueuedPlayer[] {
    return this.queue;
  }

  public getPlayer(index: number): QueuedPlayer {
    if (index > this.queue.length || index < 0) {
      return null;
    } else {
      return this.queue[index];
    }
  }
}
