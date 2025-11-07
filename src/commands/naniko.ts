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
    #channels;
    constructor(client: ExtendedClient, _logger: {log: Function}) { 
        this.#channels = process.env.TIKTOK_LIVE_CHANNEL_IDS?.split(',');
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
        this.lockImmutables();
        this.#dayCheck = new Map<string, boolean>();
        cron.scheduleJob('*/1 15-18 * * *', () => {
            this.#checkLive();
        });
    }

    lockImmutables(): void {
        Object.freeze(this.#dayCheck);
        Object.freeze(this.#channels);
        Object.freeze(this.#card);
        Object.freeze(this.#logger);
        Object.freeze(this.#client);
    }

    async #checkLive(): Promise<void> {
        let today: string = new Date().toLocaleDateString();
        if (!this.#dayCheck.has(today)) { 
            /** Clear out map to prevent memory leaks over time */
            this.#dayCheck.clear();
            this.#dayCheck.set(today, false) 
        }
        if (this.#dayCheck.get(today)) { return; }
        console.log('Starting TikTok live check for user: ' + tiktok_username);
        try {
            const connector = new TikTokLiveConnection(tiktok_username);
            const state = await connector.connect().catch(e => {
                if (!e.message.includes("The requested user isn't online")) { throw e; }
            });
            if (!state) { return; }
            this.#dayCheck.set(today, true);
            if ((this.#channels?.length ?? 0) === 0) {
                this.#logger.log('Error: No Channel Ids found in environment variable TIKTOK_LIVE_CHANNEL_IDS.');
                return;
            }
            console.log(this.#channels);
            this.#channels?.forEach(channelId => async () =>{
                console.log(channelId);
                const channel = await this.#client.channels.fetch(channelId);
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
            });

        } catch (err) {
            this.#logger.log(err);
        }
    }
}
