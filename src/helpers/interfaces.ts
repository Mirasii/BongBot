import type { Client } from 'discord.js';
export interface ExtendedClient extends Client {
    version: string;
}