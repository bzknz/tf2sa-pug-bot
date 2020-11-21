import { Message } from "discord.js";
import { Player } from "../models/Player";

export interface IPug {
  onPugStop(message: Message): void;
  onPlayerAdded(message: Message, player: Player): void;
  onPlayerRemoved(message: Message, player: Player): void;
}
