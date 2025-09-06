const LOGGER = require(`${__dirname}/logging.js`);

module.exports = {
    async get(url, path, params, headers) {
        let fullPath = `${url}${path ? path : ''}${params ? `?${params}` : ''}`;
        let config = {
            method: 'GET',
            headers: headers
        };
        return await makeCallout(fullPath, config);
    },
    async post(url, path, headers, body) {
        let fullPath = `${url}${path ? path : ''}`;
        let config = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        };
        return await makeCallout(fullPath, config);
    }
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