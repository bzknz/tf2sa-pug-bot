import {GuildMember} from "discord.js";

export class Player {

    discordMember: GuildMember;
    lastReadyTime: number;
    wasReady: boolean;

    constructor(member: GuildMember) {
        this.discordMember = member;
    }

    updateReady() {
        this.lastReadyTime = new Date().getTime();
    }
}