import { TikTokLiveConnection } from 'tiktok-live-connector';
import { ExtendedClient } from '../helpers/interfaces.js';
import { EmbedBuilder, Colors } from 'discord.js';
import cron from 'node-schedule';

interface Logger {
    log(message: string | Error): void;
}

export default class TikTokLiveNotifier {
    #client?: ExtendedClient;
    #logger?: Logger;
    #card?: EmbedBuilder;
    #dayCheck?: Map<string, boolean>;
    #channels?: string[];
    #tiktokUsername?: string;
    #config?: {
        liveDisplayName: string;
        liveStartTime: string;
        liveEndTime: string;
        twitchStream?: string;
        twitchUsername?: string;
    };

    constructor(client: ExtendedClient, logger: Logger) {
        const tiktokUsername = process.env.TIKTOK_USERNAME;
        if (!tiktokUsername) {
            return;
        }

        // Validate and set configuration
        this.#config = this.#validateConfig();
        this.#tiktokUsername = tiktokUsername;
        this.#channels = process.env.TIKTOK_LIVE_CHANNEL_IDS?.split(',').filter(id => id.trim());
        this.#logger = logger;
        this.#client = client;
        this.#dayCheck = new Map<string, boolean>();

        // Build notification message
        const liveNotif = this.#buildNotificationMessage();

        // Create embed card
        this.#card = new EmbedBuilder()
            .setTitle('🎵 Live Notification')
            .setColor(Colors.Purple)
            .addFields(
                { name: `⏱️ ${this.#config.liveDisplayName} is live!`, value: liveNotif, inline: false },
            )
            .setFooter({
                text: `BongBot • ${this.#client.version}`,
                iconURL: this.#client.user?.displayAvatarURL()
            });

        // Schedule live check
        const cronPattern = `*/1 ${this.#config.liveStartTime}-${this.#config.liveEndTime} * * *`;
        cron.scheduleJob(cronPattern, () => {
            this.#checkLive();
        });
    }

    #validateConfig() {
        const liveDisplayName = process.env.LIVE_DISPLAY_NAME;
        const liveStartTime = process.env.LIVE_START_TIME || '15';
        const liveEndTime = process.env.LIVE_END_TIME || '18';

        if (!liveDisplayName) {
            throw new Error('LIVE_DISPLAY_NAME environment variable is required');
        }

        if (!/^\d{1,2}$/.test(liveStartTime) || !/^\d{1,2}$/.test(liveEndTime)) {
            throw new Error('LIVE_START_TIME and LIVE_END_TIME must be valid hour numbers (0-23)');
        }

        const start = parseInt(liveStartTime, 10);
        const end = parseInt(liveEndTime, 10);
        if (start < 0 || start > 23 || end < 0 || end > 23) {
            throw new Error('LIVE_START_TIME and LIVE_END_TIME must be between 0 and 23');
        }

        return {
            liveDisplayName,
            liveStartTime,
            liveEndTime,
            twitchStream: process.env.TWITCH_STREAM,
            twitchUsername: process.env.TWITCH_USERNAME,
        };
    }

    #buildNotificationMessage(): string {
        const tiktokLink = `[TikTok](https://www.tiktok.com/@${this.#tiktokUsername!}/live)`;
        const twitchLink = this.#config!.twitchStream
            ? ` or [Twitch](https://www.twitch.tv/${this.#config!.twitchUsername})`
            : '';
        return `Watch on ${tiktokLink}${twitchLink} now!`;
    }

    async #checkLive(): Promise<void> {
        const today: string = new Date().toLocaleDateString();

        // Check if we've already processed today
        if (!this.#dayCheck!.has(today)) {
            // Clear out map to prevent memory leaks over time
            this.#dayCheck!.clear();
            this.#dayCheck!.set(today, false);
        }

        if (this.#dayCheck!.get(today)) {
            return;
        }

        try {
            // Check if user is live
            const connector = new TikTokLiveConnection(this.#tiktokUsername!);
            const state = await connector.connect().catch(e => {
                if (!e.message?.includes("The requested user isn't online")) {
                    throw e;
                }
                return null;
            });

            if (!state) {
                return;
            }

            this.#dayCheck!.set(today, true);

            // Validate channels
            if (!this.#channels || this.#channels.length === 0) {
                throw new Error('No Channel IDs found in environment variable TIKTOK_LIVE_CHANNEL_IDS.');
            }

            // Fetch avatar
            const avatarUrl = await fetchAvatarFromProfile(this.#tiktokUsername!);
            if (!avatarUrl) {
                throw new Error('Failed to fetch avatar from TikTok profile.');
            }

            this.#card!.setThumbnail(avatarUrl);

            // Send notifications to all configured channels
            for (const channelId of this.#channels) {
                await this.#sendToChannel(channelId);
            }

        } catch (err) {
            this.#logger!.log('Error occurred attempting to get Live Status');
            this.#logger!.log(err instanceof Error ? err : new Error(String(err)));
            this.#dayCheck!.set(today, true); // Skip retries for today
        }
    }

    async #sendToChannel(channelId: string): Promise<void> {
        try {
            const channel = await this.#client!.channels.fetch(channelId);

            if (!channel || !channel.isTextBased()) {
                this.#logger!.log('Error: Channel not found or is not a text-based channel.');
                return;
            }

            if (!('send' in channel && typeof channel.send === 'function')) {
                this.#logger!.log('Error: Bot does not have permission to send messages in the channel.');
                return;
            }

            this.#card!.setTimestamp();
            await channel.send({ embeds: [this.#card!] });
        } catch (err) {
            this.#logger!.log(`Error sending to channel ${channelId}: ${err instanceof Error ? err.message : String(err)}`);
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
        const controller = new AbortController();
        /* istanbul ignore next -- @preserve timeout callback only fires if fetch takes >5s */
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`https://www.tiktok.com/@${username}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return null;
        }

        const html = await response.text();

        // Extract embedded JSON data from the script tag
        const scriptMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s);
        if (!scriptMatch) {
            return null;
        }

        const data = JSON.parse(scriptMatch[1]);

        // Navigate to avatar URL in the embedded data structure
        const avatarLarger = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user?.avatarLarger;
        const avatarMedium = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user?.avatarMedium;

        return avatarLarger ?? avatarMedium ?? null;
    } catch (error) {
        // Silent fail - caller will handle missing avatar
        return null;
    }
}
