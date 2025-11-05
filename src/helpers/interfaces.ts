import type { Client, Collection } from 'discord.js';

export interface ExtendedClient extends Client {
    version?: string;
    commands?: Collection<string, any>;
}

export interface GithubInfo {
    repoUrl: string;
    branchName: string;
    commitUrl: string;
    shortHash: string;
    commitMessage: string;
    tag: string;
}