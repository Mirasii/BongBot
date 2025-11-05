import LOGGER from './logging'

async function get(url: string, path?: string, params?: string, headers?: { [key: string]: any }) {
    const config = {
        method: 'GET',
        headers: headers
    };
    return await makeCallout(constructFullPath(url, path, params), config);
}
async function post(url: string, path?: string, headers?: { [key: string]: any }, body?: any) {
    const config = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    };
    return await makeCallout(constructFullPath(url, path), config);
}


function constructFullPath(url: string, path?: string, params?: string) {
    return `${url}${path ?? ''}${params ? `?${params}` : ''}`;
}

async function makeCallout(url: string, config: { [key: string]: any }): Promise<any> {
    let text: string | null;
    let resp = await fetch(url, config).then(async response => {
        if (response.ok) return await response.json();
        text = await response.text();
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText} ${text}`);
    }).finally(() => {
        if (text) { LOGGER.log(`${text}`); }
    });
    return resp;
}

export default { get, post };