const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const randomFile = require('select-random-file');
const dir = `${__dirname}/../responses`;

class EMBED_BUILDER {
    attachment;
    embed;

    constructor(attachment) {
        this.attachment = attachment;
        this.embed = new EmbedBuilder();
        return this;
    }

    constructEmbedWithAttachment(description, filename) {
        this.embed.setDescription(description);
        this.embed.setThumbnail(`attachment://${filename}`);
        return this;
    }

    async constructEmbedWithRandomFile(description) {
        this.embed.setDescription(description);
        const file = await selectRandomFile(dir);
        let attach = new AttachmentBuilder(`./src/responses/${file}`);
        this.embed.setThumbnail(`attachment://${file}`);
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