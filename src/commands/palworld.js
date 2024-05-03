const { SlashCommandBuilder } = require('@discordjs/builders');
const https = require("https");
const querystring = require('querystring');
const crypto = require("crypto");
const key = process.env.PALWORLD_API_KEY;

let scan;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('palworld')
        .setDescription('Check current status of Palworld Server!')
        .addStringOption(option => 
            option.setName('operation')
            .setDescription('Specify a command. Valid options are status (default), start and restart.')
            .addChoices(
				{ name: 'status', value: 'status' },
				{ name: 'start', value: 'start' },
				{ name: 'restart', value: 'restart' },
                { name: 'monitor', value: 'monitor' },
			)
            .setRequired(false)
        ),
    async execute(interaction) {
        try { 
            const operation = interaction.options.getString('operation') ?? 'status';
            switch(operation) {
                case('status'):
                    return await getServerStatus();
                case('start'):
                case ('restart'):
                    return await serverOp(operation);
                case ('monitor'):
                    return await getServerNerdStuff();

                default:
                    return 'Operation Not Recognised.';
            }
        } catch (error) {w
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

async function getServerStatus() {
    const statusData = await makeRequest({}, 'getServerStatus');
    let status = 'offline';
    if (statusData.hasOwnProperty('data')) {
        status = statusData.data.status;
    }
    let returnString = `Server Status: ${status}\n`;
    const serverData = await makeRequest({}, 'getServer');
    if (serverData.hasOwnProperty('data')) {
        returnString += `Server Address: ${serverData.data.Server.ip}:${serverData.data.Server.port}\nServer Password: MiraPal\n`;
    }
    return `${returnString}Please consider donating to server costs! <https://ko-fi.com/mirasi>`;
}

async function serverOp(operation) {
    method = operation == 'start' ? 'startServer' : 'restartServer';
    const serverOp = await makeRequest({}, method);
    if (serverOp.success) {
        return 'Server successfully started! Use /palworld or /palworld status to verify the server is active.\nPlease consider donating to server costs! <https://ko-fi.com/mirasi>';
    }
}

async function getServerNerdStuff() {
    const resources = await makeRequest({}, 'getServerResources');
    let returnString = '';
    if (resources.data) {
        let ram = parseFloat(resources.data.memory);
        returnString += `Memory Utilization: ${ram.toFixed(2)}%`;
        if (ram >= 90) {
            returnString += `\nMemory Utilization over 90%. Consider restarting the server using /palworld restart`;
        }
    } else {
        throw new Error('could not query resource utilization.');
    }
    return `${returnString}\nPlease consider donating to server costs! <https://ko-fi.com/mirasi>`;
}

async function makeRequest(content = {}, method) {
    let keystr = "";
    let params = content ? content : {};

    // Add API method & user
    params["_MulticraftAPIMethod"] = method;
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

        // Prepare options for the HTTPS request
        const options = {
            method: 'POST',
            hostname: 'panel.pebblehost.com',
            path: '/api.php',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
                'Referer': 'https://panel.pebblehost.com',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(encodedParams)
            }
        };

        // Make request to panel API using the 'https' module
        const data = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    resolve(responseData);
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            req.write(encodedParams);
            req.end();
        });

        return JSON.parse(data); // Assuming the response is in JSON format
    } catch (e) {
        throw new Error("API responded with error: " + e.message);
    }
}
