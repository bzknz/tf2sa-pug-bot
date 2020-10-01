import { TF2Server } from "../models/TF2Server";

export interface IServerFull {
  onServerFull(server: TF2Server): void;
}

export interface IServerUnfull {
  onServerUnfull(): void;
}
