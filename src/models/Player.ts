import { GuildMember } from "discord.js";

export class Player {
  discordMember: GuildMember;
  readyUntilTime: number;

  constructor(member: GuildMember) {
    this.discordMember = member;
  }

  updateReady(durationMinutes: number) {
    this.readyUntilTime = new Date().getTime() + durationMinutes * 6e4;
  }
}
