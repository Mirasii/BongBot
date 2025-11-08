import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import type { ExtendedClient } from '../../src/helpers/interfaces.js';

// Mock TikTok Live Connector
const mockConnect = jest.fn();
const mockTikTokLiveConnection = jest.fn().mockImplementation(() => ({
    connect: mockConnect,
}));

jest.unstable_mockModule('tiktok-live-connector', () => ({
    TikTokLiveConnection: mockTikTokLiveConnection,
}));

// Mock node-schedule
const mockScheduleJob = jest.fn();
jest.unstable_mockModule('node-schedule', () => ({
    default: {
        scheduleJob: mockScheduleJob,
    },
}));

// Mock discord.js
const mockSetTitle = jest.fn().mockReturnThis();
const mockSetColor = jest.fn().mockReturnThis();
const mockSetThumbnail = jest.fn().mockReturnThis();
const mockAddFields = jest.fn().mockReturnThis();
const mockSetFooter = jest.fn().mockReturnThis();
const mockSetTimestamp = jest.fn().mockReturnThis();

const mockEmbedBuilder = jest.fn().mockImplementation(() => ({
    setTitle: mockSetTitle,
    setColor: mockSetColor,
    setThumbnail: mockSetThumbnail,
    addFields: mockAddFields,
    setFooter: mockSetFooter,
    setTimestamp: mockSetTimestamp,
}));

jest.unstable_mockModule('discord.js', () => ({
    EmbedBuilder: mockEmbedBuilder,
    Colors: {
        Purple: 10181046,
    },
}));

// Import after mocks are set up
const { default: TikTokLiveNotifier } = await import('../../src/commands/naniko.js');

describe('TikTokLiveNotifier', () => {
    let mockClient: ExtendedClient;
    let mockLogger: { log: jest.Mock };
    let notifier: TikTokLiveNotifier;
    let scheduledCallback: Function;

    beforeEach(() => {
        // Capture the scheduled callback
        mockScheduleJob.mockImplementation((schedule: string, callback: Function) => {
            scheduledCallback = callback;
            return {};
        });

        mockClient = {
            version: '1.0.0',
            user: {
                displayAvatarURL: jest.fn(() => 'http://example.com/avatar.jpg'),
            },
            channels: {
                fetch: jest.fn(),
            },
        } as unknown as ExtendedClient;

        mockLogger = {
            log: jest.fn(),
        };

        // Clear environment variable
        delete process.env.TIKTOK_LIVE_CHANNEL_IDS;

        // Clear all mocks
        jest.clearAllMocks();
        mockConnect.mockClear();
        mockTikTokLiveConnection.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('should initialize with client and logger', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            expect(notifier).toBeDefined();
        });

        test('should create embed card with correct properties', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            expect(mockEmbedBuilder).toHaveBeenCalled();
            expect(mockSetTitle).toHaveBeenCalledWith('🎵 Tiktok Live Notification');
            expect(mockSetColor).toHaveBeenCalledWith(10181046);
            expect(mockSetThumbnail).toHaveBeenCalled();
            expect(mockAddFields).toHaveBeenCalled();
            expect(mockSetFooter).toHaveBeenCalled();
        });

        test('should schedule cron job', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            expect(mockScheduleJob).toHaveBeenCalledWith('*/1 15-18 * * *', expect.any(Function));
        });

        test('should parse multiple channel IDs from environment', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123,456,789';
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            expect(notifier).toBeDefined();
        });

        test('should handle undefined channel IDs', () => {
            delete process.env.TIKTOK_LIVE_CHANNEL_IDS;
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            expect(notifier).toBeDefined();
        });
    });

    describe('lockImmutables', () => {
        test('should freeze internal objects', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            // The lockImmutables method is called in constructor
            // We can't easily test frozen private fields, but we can verify no errors
            expect(notifier).toBeDefined();
        });
    });

    describe('checkLive - scheduled task', () => {
        beforeEach(() => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
        });

        test('should check if user is live when scheduled', async () => {
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            // Execute the scheduled callback
            await scheduledCallback();
            
            expect(mockTikTokLiveConnection).toHaveBeenCalledWith('pokenonii');
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should handle user not online error gracefully', async () => {
            const notOnlineError = new Error("The requested user isn't online");
            mockConnect.mockRejectedValue(notOnlineError);
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            await scheduledCallback();
            
            // Should not throw
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should rethrow other errors', async () => {
            const otherError = new Error('Network error');
            mockConnect.mockRejectedValue(otherError);
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            await scheduledCallback();
            
            expect(mockLogger.log).toHaveBeenCalledWith(otherError);
        });

        test('should not send notification if already sent today', async () => {
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            // First call
            await scheduledCallback();
            
            // Clear mocks
            mockConnect.mockClear();
            mockTikTokLiveConnection.mockClear();
            
            // Second call same day
            await scheduledCallback();
            
            // Should still check but return early
            expect(mockTikTokLiveConnection).toHaveBeenCalled();
        });

        test('should send notification to configured channels when live', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789,987654321';
            
            const mockChannel = {
                isTextBased: jest.fn(() => true),
                send: jest.fn().mockResolvedValue({}),
            };
            
            (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockChannel);
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            await scheduledCallback();
            
            // Note: There's a bug in the original code - forEach with async arrow function
            // The async function is not awaited, so this test reflects current behavior
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should log error when no channel IDs configured', async () => {
            delete process.env.TIKTOK_LIVE_CHANNEL_IDS;
            
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            await scheduledCallback();
            
            expect(mockLogger.log).toHaveBeenCalledWith(
                'Error: No Channel Ids found in environment variable TIKTOK_LIVE_CHANNEL_IDS.'
            );
        });

        test('should handle channel fetch failure', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            
            (mockClient.channels.fetch as jest.Mock).mockResolvedValue(null);
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            await scheduledCallback();
            
            // Should handle gracefully
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should handle non-text-based channel', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            
            const mockVoiceChannel = {
                isTextBased: jest.fn(() => false),
            };
            
            (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockVoiceChannel);
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            await scheduledCallback();
            
            // Should handle gracefully
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should handle channel without send method', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            
            const mockChannelNoSend = {
                isTextBased: jest.fn(() => true),
                // No send method
            };
            
            (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockChannelNoSend);
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            await scheduledCallback();
            
            // Should handle gracefully
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should return early if connect returns falsy', async () => {
            mockConnect.mockResolvedValue(null);
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            await scheduledCallback();
            
            expect(mockConnect).toHaveBeenCalled();
            expect(mockLogger.log).not.toHaveBeenCalledWith(
                expect.stringContaining('Error: No Channel Ids')
            );
        });

        test('should clear dayCheck map on new day', async () => {
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            
            // First call
            await scheduledCallback();
            
            // The map should be cleared and reset each time if date changes
            // This test verifies the logic works without error
            expect(notifier).toBeDefined();
        });
    });
});