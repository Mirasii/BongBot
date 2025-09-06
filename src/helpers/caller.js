const LOGGER = require(`${__dirname}/logging.js`);

module.exports = {
    async get(url, path, params, headers) {
        let fullPath = `${url}${path ? path : ''}${params ? `?${params}`:''}`;
        let resp = await fetch(fullPath, {
            method: 'GET',
            headers: headers
        }).then(response => {
            if (!response.ok) { throw new Error(`Network response was not ok: ${response.status} ${response.statusText} ${response.text()}`); }
            return response.json();
        })
        return resp;
    },
    async post(url, path, headers, body) {
        let fullPath = `${url}${path ? path : ''}`;
        let text;
        let resp = await fetch(fullPath, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        }).then(async response => {
            if (!response.ok) { 
                text = await response.text();
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText} `); 
            }
            return await response.json();
        }).finally(() => {
            if (text) { LOGGER.log(`${text}`); }
        });
        return resp;
    }
}