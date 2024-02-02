const { SlashCommandBuilder } = require('@discordjs/builders');
var https = require('https');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startPalworld')
        .setDescription('start up the palworld server!'),
    async execute(interaction, client) {
        try {
            const resp = await makeReq().then(data => {return JSON.parse(data)});
            return resp;
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

async function makeReq() {
    return new Promise((resolve, reject) => {
        https.get('https://ov7wf902hf.execute-api.eu-west-1.amazonaws.com/mirasipalworld/palworld-start', (resp)=>{

            let data = '';
            // A chunk of data has been received.
            resp.on('data', (chunk) => {
                data += chunk;
            });
            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                console.log(data.substring(1, data.length -1));
            });
        }).on("error", (err) => {
                console.log("Error: " + err.message);
        });
    });
}
