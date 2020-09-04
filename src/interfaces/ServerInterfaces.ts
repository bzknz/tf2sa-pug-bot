import {Message} from "discord.js";
import { TF2Server } from "../models/TF2Server";

export interface IServerFull {
    onServerFull(context: Message, server: TF2Server): void;
}

export interface IServerUnfull {
    onServerUnfull(context: Message): void;
}