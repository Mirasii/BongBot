const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const randomFile = require('select-random-file');
const dir = `${__dirname}/../responses`;

class EMBED_BUILDER {
    attachment;
    embed;

    constructor(attachment) {
        this.attachment = attachment;
    }

    constructEmbedWithAttachment(description, filename) {
        const embed = new EmbedBuilder().setDescription(description);
        embed.setThumbnail(`attachment://${filename}`);
        this.embed = embed;
        return this;
    }

    async constructEmbedWithRandomFile(descrption) {
        const embed = new EmbedBuilder().setDescription(descrption);
        const file = await selectRandomFile(dir);
        let attach = new AttachmentBuilder(`./src/responses/${file}`);
        embed.setThumbnail(`attachment://${file}`);
        this.embed = embed;
        this.attachment = attach;
        return this.build();
    }

    addFooter(text, iconURL) {
        this.embed.setFooter({ text: text, iconURL: iconURL });
        return this;
    }

    build() {
        return { embeds: [this.embed], files: [this.attachment]};
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