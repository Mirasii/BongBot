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
        let resp = await fetch(fullPath, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        }).then(response => {
            if (!response.ok) { throw new Error(`Network response was not ok: ${response.status} ${response.statusText} ${response.text()}`); }
            return response.json();
        })
        return resp;
    }
}