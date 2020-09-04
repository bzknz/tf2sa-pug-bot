//TODO: Split this into a more detailed OOP based system

import {AkairoClient, CommandHandler, ListenerHandler} from "discord-akairo";
import {User, Message, Client} from "discord.js";
import {join} from "path";
import {Player} from "../models/Player";
import {SSQuery} from "../util/SSQuery";
import RconConnection from "../util/RconConnection";
import {Pug} from "../models/Pug";
import {IServerFull, IServerUnfull} from "../interfaces/ServerInterfaces";
import {TF2Server} from "../models/TF2Server";
import {IPug} from "../interfaces/PugInterfaces";
import {PugQueue} from "../models/PugQueue";

declare module "discord-akairo" {
    interface AkairoClient {
        commandHandler: CommandHandler;
        listenerHandler: ListenerHandler;
        maxPlayers: number;
        currentMap: string;
        mapList: string[];
        serverList: TF2Server[];
        pug: Pug;
        queue: PugQueue;
        readyDuration: number;
        notifyHandle: NodeJS.Timeout;
        queueDuration: number;
        rconPassword: string;
        startPug(context: Message): Promise<void>;
        displayReadyStatus(context: Message): Promise<Message>;
        displayQueue(context: Message): Promise<Message>;
        notifySubscribers(context: Message, msg: string): Promise<Message>;
    }
}

interface BotOptions {
    token?: string;
    owners?: string | string[];
}

export default class BotClient extends AkairoClient implements IServerFull, IServerUnfull, IPug {
    public config: BotOptions;
    public listenerHandler: ListenerHandler = new ListenerHandler(this,{
        directory: join(__dirname, "..", "listeners")
    });
    public commandHandler: CommandHandler = new CommandHandler(this, {
        directory: join(__dirname, "..", "commands"),
        prefix: process.env.PREFIX,
        commandUtil: true,
        commandUtilLifetime: 3e5,
        defaultCooldown: 6e4,
        argumentDefaults: {
            prompt: {
                modifyStart: (_: Message, str: string): string => `${str}\n\nType \`cancel\` to cancel the command...`,
                modifyRetry: (_: Message, str: string): string => `${str}\n\nType \`cancel\` to cancel the command...`,
                timeout: "You took too long, the command has no been cancelled...",
                ended: "You exceeded the maximum amount of tries, this command has now been cancelled...",
                cancel: "This command has now been cancelled",
                retries: 3,
                time: 3e4
            },
            otherwise: ""
        },
        ignorePermissions: process.env.OWNERS
    });

    public constructor(config: BotOptions) {
        super({
            ownerID: config.owners
        });

        this.config = config;
    }

    private async _init(): Promise<void> {
        this.commandHandler.useListenerHandler(this.listenerHandler);
        this.listenerHandler.setEmitters({
            commandHandler: this.commandHandler,
            listenerHandler: this.listenerHandler,
            process
        });
        this.commandHandler.loadAll();
        this.listenerHandler.loadAll();
        this.maxPlayers = 12;
        this.mapList = [];
        this.serverList = [];
        this.queue = new PugQueue();
        this.readyDuration = 3e5;
        this.queueDuration = 3.6e6;
    }

    public async start(): Promise<string> {
        await this._init();
        this.loadMaps();
        this.loadServers();
        return this.login(this.config.token);
    }

    public loadMaps() {
        this.mapList = process.env.MAP_LIST.split(",");
    }

    public loadServers() {
        //TODO Assign random password for each server
        let servers: string[] = process.env.SERVER_LIST.split(",");

        servers.forEach((s) => {
            let info: string[] = s.split(":");
            this.serverList.push(new TF2Server(info[0], parseInt(info[1]), "games"));
        })
    }

    async onServerFull(context: Message, server: TF2Server) {
        const role = context.guild.roles.cache.find(role => role.name === 'in-pug');
        let unreadyPlayers: Player[] = [];
            let currentTime: number = new Date().getTime();
            this.pug.addedPlayers.forEach( player => {
                if (currentTime - player.lastReadyTime > this.readyDuration)
                    unreadyPlayers.push(player);
                else
                    player.wasReady = true;
            })

        if (unreadyPlayers.length == 0) {
            context.channel.send(`<@&${role.id}> Your pickup game is full, everyone is ready. Sending connection details`);
            this.sendConnectionDetails(server);
        } else {
            let output: string = " ";
            for (let i = 0; i < unreadyPlayers.length; i++) {
                output = output.concat(unreadyPlayers[i].discordMember.displayName).concat(", ");
            }
            output = output.slice(0,-2);
            context.channel.send(`<@&${role.id}> Your pickup game is full, type !ready to ready-up`);


            //Check if all players are ready in X minutes
            this.notifyHandle = setTimeout(() => {
                let unreadyPlayers: Player[] = [];
                let currentTime: number = new Date().getTime();
                this.pug.addedPlayers.forEach( player => {
                    if (!player.wasReady)
                        if (currentTime - player.lastReadyTime > this.readyDuration)
                            unreadyPlayers.push(player);
                })
                
                if (unreadyPlayers.length > 0) {
                    let output: string = " ";
                    for (let i = 0; i < unreadyPlayers.length; i++) {
                        output = output.concat(unreadyPlayers[i].discordMember.displayName).concat(", ");
                    }
                    output = output.slice(0,-2);
                    context.channel.send(`The following players are not ready and have been removed from the pug: ${output}`);
                    unreadyPlayers.forEach(player => {
                        this.pug.removePlayerNoCallback(player.discordMember.displayName); 
                        //this.pug.removePlayer(player.discordMember.displayName);
                    });
                    this.pug.addedPlayers.forEach(p => p.wasReady = false);
                    console.log("test");
                    this.displayReadyStatus(context);
                } else {
                    context.channel.send(`<@&${role.id}> Your pickup game is full, everyone is ready. Sending connection details`);
                    this.displayStatus(context);
                    this.sendConnectionDetails(server);
                }
            }, 1.2e5);
        }
    }   

    onServerUnfull(context: Message) {
        context.util.send("Pickup game no longer full, cancelling countdown.")
        clearTimeout(this.notifyHandle);
    }

    displayReadyStatus(context: Message) {
        let output: string = "(";
        let currentTime: number = new Date().getTime();
        for (let i = 0; i < this.maxPlayers; i++) {
            let currPlayer: Player = this.pug.addedPlayers[i];
            if (currPlayer == null)
                output = output.concat("?").concat("), (");
            else {
                let readyString: string = currentTime - currPlayer.lastReadyTime > this.readyDuration ? "<unready>" : "<ready>";
                output = output.concat(currPlayer.discordMember.displayName).concat(readyString).concat("), (");
            }
        }
        output = output.slice(0, -3);
        let finalOutput: string = `\`\`\`\n (${this.pug.currentMap}) [${this.pug.addedPlayers.length}/${this.maxPlayers}] Players: [${output}] \`\`\``;
        console.log("Ready status: " + finalOutput);
        return context.channel.send(finalOutput);
    }

    displayStatus(context: Message) {
        let output: string = "(";
        let currentTime: number = new Date().getTime();
        let currPlayer: Player;
        for (let i = 0; i < this.maxPlayers; i++) {
            let currPlayer = this.pug.addedPlayers[i];
            if (currPlayer == null)
                output = output.concat("?").concat("), (");
            else {
                output = output.concat(currPlayer.discordMember.displayName).concat("), (");
            }
        }
        output = output.slice(0, -3);
        let finalOutput: string = `\`\`\`\n (${this.pug.currentMap}) [${this.pug.addedPlayers.length}/${this.maxPlayers}] Players: [${output}] \`\`\``;
        console.log("Status: " + finalOutput);
        return context.util.send(finalOutput);
    }

    displayQueue(context: Message) {
        //console.log(this.queue.queue)
        let output: string = "(";
        for (let i = 0; i < this.queue.queue.length; i++) {
            output = output.concat(this.queue.queue[i].player.discordMember.displayName).concat("), (");
        }
        output = output.slice(0, -3);
        let finalOutput: string = `\`\`\`\n Players in queue: [${output}] \`\`\``;
        return context.util.send(finalOutput);
    }

    notifySubscribers(context: Message, msg: string) {
        const role = context.guild.roles.cache.find(role => role.name === 'pug-notification');
        return context.channel.send(`<@&${role.id}> ${msg}`);
    }

    async sendConnectionDetails(server: TF2Server) {
        let rcon: RconConnection = new RconConnection(server.address, server.port, process.env.RCON_PASSWORD);
        await rcon.sendCommand(`changelevel ${this.pug.currentMap}`)
            .then(() => {})
            .catch(() => {})
        setTimeout(() => {
            this.pug.addedPlayers.forEach(player => {
                player.discordMember.send(`Your pickup game is ready, please join the server at steam://connect/${server.address}:${server.port}/${server.password}`);
            });
            this.pug = null
        }, 2e4)
    }

    private async checkAvailableServers(): Promise<TF2Server[]> {
        let openServers: TF2Server[] = [];
        return new Promise(async (resolve, reject) => {
             for (let s of this.serverList) {
                await SSQuery.getPlayers(s.address, s.port)
                    .then((info) => {
                        if (info.length == 0) openServers.push(s);
                    })
                    .catch(() => console.log("Error retrieving open servers"));
            }
            resolve(openServers);
        })
    }

    private clearInputRoles(context: Message) {;
        const role = context.guild.roles.cache.find(role => role.name === 'in-pug');
        const list = context.guild.members.fetch()
            .then(members => {
                members.forEach((m,s) => {
                    m.roles.remove(role)
                })
            })
            .catch(console.error)
    }

    public async startPug(context: Message): Promise<void> {    //0 - Successful start, 1 - no open servers
        this.clearInputRoles(context);
        return new Promise(async (resolve, reject) => {
            await this.checkAvailableServers()
                .then((openServers) => {
                    if (openServers.length == 0) 
                        reject()
                    else {
                        this.pug = new Pug(openServers[0], this.maxPlayers, "cp_process_final", context, this, this, this);
                        let iterations: number = this.queue.queue.length > this.maxPlayers ? this.maxPlayers : this.queue.queue.length;
                        let added = false;
                        console.log(iterations);
                        for (let i = 0; i < iterations; i++) {
                            let queuedPlayer = this.queue.dequeue();
                            let currentTime = new Date().getTime();
                            if (currentTime - queuedPlayer.queuedTime < this.queueDuration) 
                                this.pug.addPlayer(queuedPlayer.player);
                        }
                        if (added) 
                            this.displayReadyStatus(context);
                        resolve();
                    }
                })
            //this.notifySubscribers(context, "A new pug has been started.");
        });
    }

    //Method declarations for the IPug Interface

    public onPugStop(context: Message) {
        this.pug.addedPlayers.forEach(player => {
            const role = context.guild.roles.cache.find(role => role.name === 'in-pug');
            player.discordMember.roles.remove(role);
        })
        this.pug = null;
    }

    public onPlayerAdded(context: Message, player: Player) {
        const role = context.guild.roles.cache.find(role => role.name === 'in-pug');
        player.discordMember.roles.add(role);
        console.log(`added to role player: ${player.discordMember.displayName}`);
    }

    public onPlayerRemoved(context: Message, player: Player) {
        const role = context.guild.roles.cache.find(role => role.name === 'in-pug');
        player.discordMember.roles.remove(role);
    }
}