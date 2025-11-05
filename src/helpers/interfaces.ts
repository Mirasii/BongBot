import type { Client } from 'discord.js';

export interface ExtendedClient extends Client {
    version: string;
}

export interface GithubInfo {
    repoUrl: string;
    branchName: string;
    commitUrl: string;
    shortHash: string;
    commitMessage: string;
    tag: string;
}