const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require("axios");
const querystring = require('querystring');
const crypto = require("crypto");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('palworld')
        .setDescription('Check current status of Palworld Server!'),
    async execute() {
        try { 
            const data = await makeRequest();
            let status = 'offline';
            if (data.hasOwnProperty('status')) {
                status = data.status;
            }
            return `Server Status: ${status}\nServer Address: 146.59.220.140:25578\nServer Password: MiraPal\nPlease consider donating to server costs! <https://ko-fi.com/mirasi>`;
        } catch (error) {
            console.error('you command failed', error);
            return {
                type: 4,
                data: {
                    content: 'There was an error while executing this command.',
                    flags: 1 << 6 // set the EPHEMERAL flag
                }
            };
        }
    }
}

async function makeRequest(content = {}) {
    let key = "meL%zD%L4CP*=f";
    let keystr = "";
    let params = content ? content : {};

    // Add API method & user
    params["_MulticraftAPIMethod"] = 'getServerStatus';
    params["_MulticraftAPIUser"] = 'callumgoodship@hotmail.co.uk';
    params["id"] = ['659406'];

    // Generate string to then HMAC it
    for (var param in params) {
        if (!params.hasOwnProperty(param)) continue;
        keystr += param + params[param].toString();
    }

    // Creates HMAC of parameters, using Multicraft API key as message key
    let hmac = crypto.createHmac('sha256', key);
    hmac.update(keystr);
    let digest = hmac.digest('hex');

    // Add generated digest to parameters
    params["_MulticraftAPIKey"] = digest;

    try {
        // Use library to encode parameters into querystring body
        const encodedParams = querystring.stringify(params);

        // Make request to panel API
        const { data } = await axios.post("https://panel.pebblehost.com/api.php", encodedParams, {
            // Encourage Cloudflare to allow the request
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
                'Referer': 'https://panel.pebblehost.com'
            }
        });
        console.log(digest);
        console.log(data);
        return data;
    } catch (e) {
        throw new Error("API responded with error status " + e.status);
    }
}
