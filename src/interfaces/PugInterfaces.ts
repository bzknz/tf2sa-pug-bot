import {Message} from "discord.js";
import {Player} from "../models/Player"

export interface IPug {
    onPugStop(context: Message);

    onPlayerAdded(context: Message, player: Player);

    onPlayerRemoved(context: Message, player: Player);
}