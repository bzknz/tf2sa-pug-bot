import {Message} from "discord.js";
import {Player} from "../models/Player"

export interface IPug {
    onPugStop();

    onPlayerAdded(player: Player);

    onPlayerRemoved(player: Player);
}