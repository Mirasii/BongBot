const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const randomFile = require('select-random-file');
const dir = `${__dirname}/../responses`;

class EMBED_BUILDER {
    attachment;
 
    constructor(attachment) {
        this.attachment = attachment;
    }

    constructEmbedWithAttachment(description, filename) {
        const embed = new EmbedBuilder().setDescription(description);
        embed.setThumbnail(`attachment://${filename}`);
        return { embeds: [embed], files: [this.attachment]}
    }

    async constructEmbedWithRandomFile(descrption) {
        const embed = new EmbedBuilder().setDescription(descrption);
        const file = await selectRandomFile(dir);
        let attach = new AttachmentBuilder(`./src/responses/${file}`);
        embed.setThumbnail(`attachment://${file}`);
        return { embeds: [embed], files: [attach] };
    }
}

async function selectRandomFile(dir) {
    return new Promise((resolve, reject) => {
        randomFile(dir, (err, file) => {
            if (err) { reject(err); return; } 
            resolve(file);
        });
    });
}

module.exports = { EMBED_BUILDER };