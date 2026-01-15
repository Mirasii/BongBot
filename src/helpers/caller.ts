import LOGGER from './logging.js'
import dns from 'dns/promises';

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
        return;
    }

    let addresses: string[];
    try {
        const ipv4Addresses = await dns.resolve4(parsedUrl.hostname);
        const ipv6Addresses = await dns.resolve6(parsedUrl.hostname);
        addresses = [...ipv4Addresses, ...ipv6Addresses];

        if (addresses.length === 0) {
            throw new Error('Unable to resolve server hostname.');
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unable to resolve')) {
            throw error;
        }
        throw new Error('Unable to resolve server hostname.');
    }

    for (const ip of addresses) {
        if (isPrivateOrReservedIP(ip)) {
            throw new Error('Server URL resolves to a private or reserved IP address.');
        }
    }
}

function isPrivateOrReservedIP(ip: string): boolean {

    if (!ip.includes(':')) {
        return isPrivateOrReservedIPv4(ip);
    }
    const normalizedIp = ip.toLowerCase();
    if (normalizedIp === '::1') return true;
    if (normalizedIp.startsWith('fc') || normalizedIp.startsWith('fd')) return true;
    if (normalizedIp.startsWith('fe8') || normalizedIp.startsWith('fe9') ||
        normalizedIp.startsWith('fea') || normalizedIp.startsWith('feb')) return true;
    if (normalizedIp.startsWith('::ffff:')) {
        const ipv4Part = normalizedIp.slice(7);
        return isPrivateOrReservedIPv4(ipv4Part);
    }
    return false;
}

function isPrivateOrReservedIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        return true; // Invalid IP, treat as blocked
    }

    const [a, b, c, d] = parts;

    // Loopback: 127.0.0.0/8
    if (a === 127) return true;

    // Private Class A: 10.0.0.0/8
    if (a === 10) return true;

    // Private Class B: 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // Private Class C: 192.168.0.0/16
    if (a === 192 && b === 168) return true;

    // Link-local: 169.254.0.0/16
    if (a === 169 && b === 254) return true;

    // Current network: 0.0.0.0/8
    if (a === 0) return true;

    // Broadcast: 255.255.255.255
    if (a === 255 && b === 255 && c === 255 && d === 255) return true;

    return false;
}