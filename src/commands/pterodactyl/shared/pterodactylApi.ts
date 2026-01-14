import { Caller } from '../../../helpers/caller.js';

export async function fetchServers(caller: Caller, serverUrl: string, apiKey: string): Promise<PterodactylServer[]> {
    await caller.validateServerSSRF(serverUrl);
    const headers = buildHeaders(apiKey);
    const json: ApiResponse<PterodactylServer> = await caller.get(serverUrl, '/api/client', null, headers);
    return json.data;
}

export async function fetchServerResources(caller: Caller, identifier: string, serverUrl: string, apiKey: string): Promise<ServerResources | null> {
    try {
        await caller.validateServerSSRF(serverUrl);
        const headers = buildHeaders(apiKey);
        return await caller.get(serverUrl, `/api/client/servers/${identifier}/resources`, null, headers);
    } catch {
        return null;
    }
}

export async function fetchAllServerResources(caller: Caller, servers: PterodactylServer[], serverUrl: string, apiKey: string): Promise<(ServerResources | null)[]> {
    return Promise.all(
        servers.map((server) =>
            fetchServerResources(caller, server.attributes.identifier, serverUrl, apiKey)
        )
    );
}

export async function sendServerCommand(caller: Caller,identifier: string, signal: 'start' | 'stop' | 'restart', serverUrl: string, apiKey: string): Promise<boolean> {
    try {
        await caller.validateServerSSRF(serverUrl);
        const headers = buildHeaders(apiKey);
        await caller.post(serverUrl, `/api/client/servers/${identifier}/power`, headers, { signal });
        return true;
    } catch {
        return false;
    }
}

function buildHeaders(apiKey: string): { [key: string]: string } {
    return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
}

export interface PterodactylServer {
    attributes: {
        identifier: string;
        name: string;
        description: string;
    };
}

export interface ServerResources {
    attributes: {
        current_state: string;
        resources: {
            memory_bytes: number;
            cpu_absolute: number;
            disk_bytes: number;
            uptime: number;
        };
    };
}

interface ApiResponse<T> {
    data: T[];
}
