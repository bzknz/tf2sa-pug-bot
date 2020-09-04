import {Command} from "discord-akairo";
import {Message} from "discord.js";
import { SSQuery } from "../../util/SSQuery";

export default class TestCommand extends Command {
    constructor() {
        super('testinfo', {
            aliases: ['testinfo'],
            category: "Test Commands",
            description: {
                content: "Test a player to an existing pickup",
                usage: "test",
                examples: [
                    "test"
                ]
            },
            channel: 'guild',
            ratelimit: 3
        });
    }

    /*
    public async exec(message: Message): Promise<Message> {
        let returnString: String = "";

         await SSQuery.Info("197.80.200.70", 27035)
            .then((info) => returnString = `Name: ${info.name}, map: ${info.map}, game: ${info.game}`)
            .catch(() => returnString = "Unable to retrieve info from the server" )    

        return message.util.send(returnString);
    }
    */

   public async exec(message: Message): Promise<Message> {
    let returnString: String = "";

     await SSQuery.getPlayers("197.80.200.70", 27035)
        .then((info) => {
            let playerNames: String = "";
            info.forEach(element => {
                playerNames = playerNames.concat(element.name).concat("\n");
            });
            returnString = `Player count: ${info.length}, ${playerNames}`
        })
        .catch(() => returnString = "Unable to retrieve player info from the server" )    

    return message.util.send(returnString);
}
}
