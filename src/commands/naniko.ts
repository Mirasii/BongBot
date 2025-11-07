import { TikTokLiveConnection } from 'tiktok-live-connector';
import { ExtendedClient } from '../helpers/interfaces.js';
import { EmbedBuilder, Colors } from 'discord.js';
import cron from 'node-cron';

const tiktok_username = 'pokenonii';
const streamer_avatar = 'https://p19-common-sign-useastred.tiktokcdn-eu.com/tos-useast2a-avt-0068-euttp/ab8fb67e6366564545d1519484e2b2f0~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=10399&refresh_token=4d76bc58&x-expires=1762650000&x-signature=Zmkwn4lhOimtFRVXmVBNYvj3y0A%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=no1a';
export default class TikTokLiveNotifier {
    #client: ExtendedClient
    #logger;
    #connector;
    #card
    constructor(client: ExtendedClient, _logger: {log: Function}) { 
        this.#logger = _logger;
        this.#client = client; 
        this.#connector = new TikTokLiveConnection(tiktok_username);
        this.#card = new EmbedBuilder()
                    .setTitle('🎵 Tiktok Live Notification')
                    .setColor(Colors.Purple)
                    .setThumbnail(streamer_avatar)
                    .addFields(
                        { name: '⏱️ Naniko Noni is live!', value: `[Watch the stream here!](https://www.tiktok.com/@pokenonii/live)`, inline: false },
                    )
                    .setFooter({ text: `BongBot • ${this.#client.version}`, iconURL: this.#client.user?.displayAvatarURL() })
        cron.schedule('0 15 * * *', () => {
            this.#checkLive();
        });
    }

    async #checkLive(): Promise<void> {
        await this.#connector.waitUntilLive(10800)
        .then(async(state) => {
            if (!process.env.TIKTOK_LIVE_CHANNEL_ID) { return; }
            const channel = await this.#client.channels.fetch(process.env.TIKTOK_LIVE_CHANNEL_ID);
            if (!channel || !channel.isTextBased()) return;
            if (!('send' in channel && typeof channel.send === 'function')) return;
            // Send the composed embed to the channel.
            this.#card.setTimestamp();
            await channel.send({ embeds: [this.#card] });  
        }).catch(err => {
            this.#logger.log(err);
        })
    }
}

