import type { Client, Collection } from 'discord.js';

export interface ExtendedClient extends Client {
    version?: string;
    commands?: Collection<string, any>;
}

export interface GithubBranchResponse {
    commit: {
        sha: string;
        commit: {
            message: string;
        };
    };
}

export interface GithubTagResponse {
    tag_name: string;
}

export interface GithubInfo {
    repoUrl: string;
    branchName: string;
    commitUrl: string;
    shortHash: string;
    commitMessage: string;
    tag: string;
}

export interface Logger {
    info(message: string, stack?: string): void;
    debug(message: string, stack?: string): void;
    error(error: Error): void;
    close?(): void;
}