const LOGGER = require(`${__dirname}/logging.js`);

module.exports = {
    async get(url, path, params, headers) {
        const config = {
            method: 'GET',
            headers: headers
        };
        return await makeCallout(constructFullPath(url, path, params), config);
    },
    async post(url, path, headers, body) {
        const config = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        };
        return await makeCallout(constructFullPath(url, path, null), config);
    }
}

function constructFullPath(url, path, params) {
    return `${url}${path ?? ''}${params ? `?${params}` : ''}`;
}

async function makeCallout(url, config) {
    let text;
    let resp = await fetch(url, config).then(async response => {
        if (response.ok) return await response.json();
        text = await response.text();
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText} ${text}`);
    }).finally(() => {
        if (text) { LOGGER.log(`${text}`); }
    });
    return resp;
}