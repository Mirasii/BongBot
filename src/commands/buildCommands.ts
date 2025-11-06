import { Collection } from 'discord.js';
import { ExtendedClient } from '../helpers/interfaces.js';
import arab from './arab.js';

const commandsArray = [
    arab,
];
export default function buildCommands(client: ExtendedClient) {
    const commands: Array<any> = [];
    client.commands = new Collection<string, any>();
    for (const command of commandsArray) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
    return commands;
}