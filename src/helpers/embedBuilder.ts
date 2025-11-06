import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import type { ExtendedClient } from './interfaces.js';
import randomFile from 'select-random-file';
const dir = `${__dirname}/../responses`;

class EMBED_BUILDER {
    attachment?: AttachmentBuilder;
    embed: EmbedBuilder;

    constructor(attachment?: AttachmentBuilder) {
        this.attachment = attachment;
        this.embed = new EmbedBuilder();
        return this;
    }

    constructEmbedWithAttachment(description: string, filename: string) {
        this.embed.setDescription(description);
        if (!this.attachment) throw new Error("No attachment provided for embed.");
        this.embed.setThumbnail(`attachment://${filename}`);
        return this;
    }

    constructEmbedWithImage(fileName: string) {
        let attach = new AttachmentBuilder(`./src/files/${fileName}`);
        this.embed.setImage(`attachment://${fileName}`);
        this.attachment = attach;
        return this;
    }

    async constructEmbedWithRandomFile(description: string) {
        this.embed.setDescription(description);
        const file = await selectRandomFile(dir);
        let attach = new AttachmentBuilder(`./src/responses/${file}`);
        this.embed.setThumbnail(`attachment://${file}`);
        this.attachment = attach;
        return this.build();
    }

    addDefaultFooter(client: ExtendedClient) {
        this.embed.setFooter({ text: `BongBot • ${client?.version ?? 'dev build'}`, iconURL: client.user?.displayAvatarURL() });
        this.embed.setTimestamp();
        return this;
    }

    addFooter(text: string, iconURL: string) {
        this.embed.setFooter({ text: text, iconURL: iconURL });
        return this;
    }

    build(): { embeds: [EmbedBuilder], files: AttachmentBuilder [] } {
        if (!this.attachment) {return { embeds: [this.embed], files: [] };}
        return { embeds: [this.embed], files: [this.attachment].filter(f => f)};
    }
}

async function selectRandomFile(dir: string): Promise<string> {
    return new Promise((resolve, reject) => {
        randomFile(dir, (err, file) => {
            if (err) { reject(err); return; } 
            resolve(file ?? '');
        });
    });
}

export default EMBED_BUILDER;