import {TF2Server} from "../models/TF2Server";
import {Player} from "../models/Player";
import {Message} from "discord.js";
import {IServerFull, IServerUnfull} from "../interfaces/ServerInterfaces";
import {IPug} from "../interfaces/PugInterfaces";
import { GuildMember } from "discord.js";

export class Pug {

    server: TF2Server;
    maxPlayers: number;
    addedPlayers: Player[];
    currentMap: string;
    context: Message;
    serverFull: IServerFull;
    serverUnfull: IServerUnfull;
    pugListener: IPug;
    readyPlayers: Player[];

    constructor(server: TF2Server, maxPlayers: number, map: string, context: Message, serverFull: IServerFull, serverUnfull: IServerUnfull, pugListener: IPug) {
        this.server = server;
        this.maxPlayers = maxPlayers;
        this.addedPlayers = [];
        this.currentMap = map;
        this.context = context;
        this.serverFull = serverFull;
        this.serverUnfull = serverUnfull;
        this.pugListener = pugListener;
        this.readyPlayers = [];
    }

    public addPlayer(player: Player): boolean {   
        let added = false;
        this.addedPlayers.forEach(m => {
            if (m.discordMember.displayName === player.discordMember.displayName)
                added = true;
        });

        if (!added) {
            this.addedPlayers.push(player);
            this.pugListener.onPlayerAdded(this.context, player);
            player.updateReady();
            if (this.addedPlayers.length == this.maxPlayers) {
                this.serverFull.onServerFull(this.context, this.server);
            }
            return true;
        }
        return false;
    }

    public removePlayer(player: string): boolean {
        let addedPlayer: Player = null;
        this.addedPlayers.forEach(p => {
            if (p.discordMember.displayName === player)
                addedPlayer = p;
        });

        if (addedPlayer != null) {
            if (this.addedPlayers.length == this.maxPlayers) {
                this.serverUnfull.onServerUnfull(this.context);
            }
            this.addedPlayers = this.addedPlayers.filter( function(value, index, arr) {
                return value.discordMember.displayName != player;
            })
            this.pugListener.onPlayerRemoved(this.context, addedPlayer);
            return true;
        }
        return false;
    }

    public removePlayerNoCallback(player: string) {
        let addedPlayer: Player = null;
        this.addedPlayers.forEach(p => {
            if (p.discordMember.displayName === player)
                addedPlayer = p;
        });

        if (addedPlayer != null) {
            this.addedPlayers = this.addedPlayers.filter( function(value, index, arr) {
                return value.discordMember.displayName != player;
            })
            this.pugListener.onPlayerRemoved(this.context, addedPlayer);
            return true;
        }
        return false;
    }

    public kickPlayer(name: string): number {    //0 - successfully kicked, 1 - no player found, 2 - multiple players match the name
        let contains: Player[] = [];
        this.addedPlayers.forEach(p => {
            if (p.discordMember.displayName.indexOf(name) !== -1) contains.push(p);
        });

        if (contains.length === 0) return 1;

        if (contains.length === 1) {
            this.removePlayer(contains[0].discordMember.displayName)
            return 0;
        }

        return 2;
    }

    public readyPlayer(player: string) {

    }

    public stop() {
        if (this.addedPlayers.length == this.maxPlayers) {
            this.serverUnfull.onServerUnfull(this.context);
        }
        this.pugListener.onPugStop(this.context);
    }

    public getPlayer(name: string): Player {
        let player: Player;
        this.addedPlayers.forEach( p => {
            if (p.discordMember.displayName == name) player = p;
        })
        return player;
    }

    public isAdded(player: string) {
        let added: boolean = false;
        this.addedPlayers.forEach(p => {
            if (p.discordMember.displayName == player) added = true;
        })
        return added;
    }

    public isFull() {
        return (this.addedPlayers.length == this.maxPlayers)
    }
}