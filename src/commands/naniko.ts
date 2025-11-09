import { TikTokLiveConnection } from 'tiktok-live-connector';
import { ExtendedClient } from '../helpers/interfaces.js';
import { EmbedBuilder, Colors } from 'discord.js';
import cron from 'node-schedule';

const tiktok_username = 'pokenonii';
// Avatar URL should be stored in environment variable to avoid exposing authentication tokens
const streamer_avatar = process.env.TIKTOK_STREAMER_AVATAR_URL || 'https://www.tiktok.com/@pokenonii';
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
        let liveNotif = `Watch on [TikTok](https://www.tiktok.com/@pokenonii/live)${
            process.env.TWITCH_STREAM ? ' or [Twitch](https://www.twitch.tv/pokenoni)' : ''
        } now!`
        this.#card = new EmbedBuilder()
                    .setTitle('🎵 Live Notification')
                    .setColor(Colors.Purple)
                    .setThumbnail(streamer_avatar)
                    .addFields(
                        { name: '⏱️ PokeNoni is live!', value: liveNotif, inline: false },
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
            for (const channelId of this.#channels ?? []) {
                const channel = await this.#client.channels.fetch(channelId);
                if (!channel || !channel.isTextBased()) {
                    this.#logger.log('Error: Channel not found or is not a text-based channel.');
                    continue;
                }
                if (!('send' in channel && typeof channel.send === 'function')) {
                    this.#logger.log('Error: Bot does not have permission to send messages in the channel.');
                    continue;
                }
                this.#card.setTimestamp();
                await channel.send({ embeds: [this.#card] });
            }

        } catch (err) {
            this.#logger.log(err);
        }
    }
}
