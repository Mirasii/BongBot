import LOGGER from '../services/logging_service.js'
import dns from 'dns/promises';
import net from 'node:net';
import ipaddr from 'ipaddr.js';

export class Caller {
    async validateServerSSRF(serverUrl: string): Promise<void> {
        await validateServerUrl(serverUrl);
    }

    async get(url: string, path?: string | null, params?: string | null, headers?: { [key: string]: any }) {
        return await get(url, path, params, headers);
    }
    
    async post(url: string, path?: string | null, headers?: { [key: string]: any } | null, body?: any) {
        return await post(url, path, headers, body);
    }
}

export default { get, post };

async function get(url: string, path?: string | null, params?: string | null, headers?: { [key: string]: any }) {
    const config = {
        method: 'GET',
        headers: headers
    };
    return await makeCallout(constructFullPath(url, path, params), config);
}
async function post(url: string, path?: string | null, headers?: { [key: string]: any } | null, body?: any) {
    const config = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    };
    return await makeCallout(constructFullPath(url, path), config);
}

function constructFullPath(url: string, path?: string | null, params?: string | null) {
    return `${url}${path ?? ''}${params ? `?${params}` : ''}`;
}

async function makeCallout(url: string, config: { [key: string]: any }): Promise<any> {
    let text: string | null;
    let resp = await fetch(url, config).then(async response => {
        if (response.ok) {
            const contentLength = response.headers.get('content-length');
            if (response.status === 204 || contentLength === '0') {
                return null;
            }
            return await response.json();
        }
        text = await response.text();
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText} ${text}`);
    }).finally(() => {
        if (text) { LOGGER.log(`${text}`); }
    });
    return resp;
}

async function validateServerUrl(serverUrl: string): Promise<void> {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(serverUrl);
    } catch {
        throw new Error('Invalid server URL format.');
    }

    if (parsedUrl.protocol !== 'https:') {
        throw new Error('Server URL must use HTTPS protocol.');
    }

    const allowedHosts = process.env.PTERODACTYL_ALLOWED_HOSTS;
    if (allowedHosts) {
        const allowedList = allowedHosts.split(',').map(h => h.trim().toLowerCase());
        if (!allowedList.includes(parsedUrl.hostname.toLowerCase())) {
            throw new Error('Server URL hostname is not in the allowed hosts list.');
        }
    }

    const addresses = await resolveHostnameToIPs(parsedUrl);

    if (addresses.length === 0) {
        throw new Error('Unable to resolve server hostname.');
    }

    for (const ip of addresses) {
        if (isPrivateOrReservedIP(ip)) {
            throw new Error('Server URL resolves to a private or reserved IP address.');
        }
    }
}

async function resolveHostnameToIPs(parsedUrl: URL): Promise<string[]> {
    let addresses: string[];
    if (net.isIP(parsedUrl.hostname)) {
        addresses = [parsedUrl.hostname];
    } else {
        const [ipv4Result, ipv6Result] = await Promise.allSettled([
            dns.resolve4(parsedUrl.hostname),
            dns.resolve6(parsedUrl.hostname)
        ]);
        const ipv4Addresses = ipv4Result.status === 'fulfilled' ? ipv4Result.value : [];
        const ipv6Addresses = ipv6Result.status === 'fulfilled' ? ipv6Result.value : [];
        addresses = [...ipv4Addresses, ...ipv6Addresses];
    }
    return addresses;
}

function isPrivateOrReservedIP(ip: string): boolean {
    try {
        const addr = ipaddr.process(ip);
        const range = addr.range();

        const blockedRanges = [
            'private', 
            'uniqueLocal', 
            'loopback', 
            'linkLocal', 
            'reserved', 
            'unspecified',
            'carrierGradeNat',
            'broadcast'
        ];

        return blockedRanges.includes(range);
    } catch (err) {
        return true; 
    }
}