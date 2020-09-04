import {Player} from "../models/Player"

export class QueuedPlayer {

    player: Player;
    queuedTime: number;

    constructor(player: Player) {
        this.player = player;
        this.queuedTime = new Date().getTime();
    }
    
}