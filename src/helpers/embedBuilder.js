const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const randomFile = require('select-random-file');
const dir = `${__dirname}/../responses`;

async function constructEmbedWithRandomFile(response) {
    const embed = new EmbedBuilder().setDescription(response);
    const file = await selectRandomFile(dir);
    let attach = new AttachmentBuilder(`./src/responses/${file}`);
    embed.setThumbnail(`attachment://${file}`);
    return { embeds: [embed], files: [attach] };
}

async function selectRandomFile(dir) {
    return new Promise((resolve, reject) => {
        randomFile(dir, (err, file) => {
            if (err) { reject(err); return; } 
            resolve(file);
        });
    });
}

module.exports = { constructEmbedWithRandomFile };