import { Message } from "discord.js";
import { TF2Server } from "../models/TF2Server";

export interface IServerFull {
  onServerFull(message: Message, server: TF2Server): void;
}

export interface IServerUnfull {
  onServerUnfull(message: Message): void;
}
