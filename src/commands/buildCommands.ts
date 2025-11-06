import { Collection } from 'discord.js';
import { ExtendedClient } from '../helpers/interfaces.js';
import arab from './arab.js';
import callirap from './callirap.js';
import chat_ai from './chat_ai.js';
import cherry from './cherry.js';
import classic from './classic.js';
import club_kid from './club_kid.js';
import creeper from './creeper.js';
import cringe from './cringe.js';
import dance from './dance.js';


const commandsArray = [ arab, callirap, chat_ai, cherry, classic, club_kid, creeper, cringe, dance ];

export default function buildCommands(client: ExtendedClient) {
    console.log('Building commands...');
    const commands: Array<any> = [];
    client.commands = new Collection<string, any>();
    for (const command of commandsArray) {
        console.log(JSON.stringify(command));
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
    return commands;
}