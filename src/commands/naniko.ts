import { TikTokLiveConnection } from 'tiktok-live-connector';
import { ExtendedClient } from '../helpers/interfaces.js';
import { EmbedBuilder, Colors } from 'discord.js';
import cron from 'node-schedule';

const tiktok_username = 'pokenonii';
const streamer_avatar = 'https://p19-common-sign-useastred.tiktokcdn-eu.com/tos-useast2a-avt-0068-euttp/ab8fb67e6366564545d1519484e2b2f0~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=10399&refresh_token=4d76bc58&x-expires=1762650000&x-signature=Zmkwn4lhOimtFRVXmVBNYvj3y0A%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=no1a';
export default class TikTokLiveNotifier {
    #client: ExtendedClient
    #logger;
    #card;
    #dayCheck;
    constructor(client: ExtendedClient, _logger: {log: Function}) { 
        this.#logger = _logger;
        this.#client = client; 
        this.#dayCheck = new Map<string, boolean>();
        this.#card = new EmbedBuilder()
                    .setTitle('🎵 Tiktok Live Notification')
                    .setColor(Colors.Purple)
                    .setThumbnail(streamer_avatar)
                    .addFields(
                        { name: '⏱️ Naniko Noni is live!', value: `[Watch the stream here!](https://www.tiktok.com/@pokenonii/live)`, inline: false },
                    )
                    .setFooter({ text: `BongBot • ${this.#client.version}`, iconURL: this.#client.user?.displayAvatarURL() })
        cron.scheduleJob('/1 15 * * *', () => {
            this.#checkLive();
        });
    }

    async #checkLive(): Promise<void> {
        console.log('Starting TikTok live check for user: ' + tiktok_username);
        let today: string = new Date().toLocaleDateString();
        if (!this.#dayCheck.has(today)) { 
            /** Clear out map to prevent memory leaks over time */
            this.#dayCheck.clear();
            this.#dayCheck.set(today, false) 
        }
        if (this.#dayCheck.get(today)) return;
        try {
            const connector = new TikTokLiveConnection(tiktok_username);
            console.log('connector created');
            const state = await connector.connect();
            if (!state?.isConnected) { return; }
            this.#dayCheck.set(today, true);
            console.log('live found!');
            if (!process.env.TIKTOK_LIVE_CHANNEL_ID) {
                this.#logger.log('Error: TIKTOK_LIVE_CHANNEL_ID environment variable not set.');
                return;
            }
            const channel = await this.#client.channels.fetch(process.env.TIKTOK_LIVE_CHANNEL_ID);
            if (!channel || !channel.isTextBased()) {
                this.#logger.log('Error: Channel not found or is not a text-based channel.');
                return;
            }
            if (!('send' in channel && typeof channel.send === 'function')) {
                this.#logger.log('Error: Bot does not have permission to send messages in the channel.');
                return;
            }
            this.#card.setTimestamp();
            await channel.send({ embeds: [this.#card] });

        } catch (err) {
            this.#logger.log(err);
        }
    }
}

