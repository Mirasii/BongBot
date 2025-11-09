import { TikTokLiveConnection } from 'tiktok-live-connector';
import { ExtendedClient } from '../helpers/interfaces.js';
import { EmbedBuilder, Colors } from 'discord.js';
import cron from 'node-schedule';

const tiktok_username = 'pokenonii';
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
                    .addFields(
                        { name: '⏱️ PokeNoni is live!', value: liveNotif, inline: false },
                    )
                    .setFooter({ text: `BongBot • ${this.#client.version}`, iconURL: this.#client.user?.displayAvatarURL() })
        this.lockImmutables();
        this.#dayCheck = new Map<string, boolean>();

        // Fetch fresh avatar from TikTok profile (async - won't block startup)
        fetchAvatarFromProfile(tiktok_username).then(avatarUrl => {
            if (!avatarUrl) { throw Error('avatarUrl not returned from fetchAvatar method'); }
            this.#card.setThumbnail(avatarUrl); 
        }).catch(err => {
            this.#logger.log(`Failed to fetch TikTok avatar: ${err.message}`);
        });

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

/**
 * Fetches the streamer's avatar from their public TikTok profile page.
 * Scrapes embedded JSON data that TikTok includes in the HTML.
 * @param username TikTok username without @ symbol
 * @returns Avatar URL or null if fetch fails
 */
async function fetchAvatarFromProfile(username: string): Promise<string | null> {
    try {
        const response = await fetch(`https://www.tiktok.com/@${username}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) return null;

        const html = await response.text();

        // Extract embedded JSON data from the script tag
        const scriptMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s);
        if (!scriptMatch) return null;

        const data = JSON.parse(scriptMatch[1]);

        // Navigate to avatar URL in the embedded data structure
        const avatarLarger = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user?.avatarLarger;
        const avatarMedium = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user?.avatarMedium;

        return avatarLarger || avatarMedium || null;
    } catch (error) {
        return null; // Silent fail - will use fallback
    }
}
