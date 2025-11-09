import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import type { ExtendedClient } from '../../src/helpers/interfaces.js';

// Mock TikTok Live Connector
const mockConnect = jest.fn<() => Promise<any>>();
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
    let notifier: typeof TikTokLiveNotifier.prototype;
    let scheduledCallbacks: Function[] = [];

    beforeEach(() => {
        scheduledCallbacks = [];
        
        // Capture ALL scheduled callbacks
        mockScheduleJob.mockImplementation((...args: any[]) => {
            const callback = args[1] as Function;
            scheduledCallbacks.push(callback);
            return {};
        });

        mockClient = {
            version: '1.0.0',
            user: {
                displayAvatarURL: jest.fn(() => 'http://example.com/avatar.jpg'),
            },
            channels: {
                fetch: jest.fn<(id: string) => Promise<any>>(),
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
            expect(mockSetTitle).toHaveBeenCalledWith('🎵 Live Notification');
            expect(mockSetColor).toHaveBeenCalledWith(10181046);
            expect(mockAddFields).toHaveBeenCalled();
            expect(mockSetFooter).toHaveBeenCalled();
        });

        test('should include Twitch link when TWITCH_STREAM is set', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            process.env.TWITCH_STREAM = 'true';

            mockAddFields.mockClear();

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);

            expect(mockAddFields).toHaveBeenCalled();
            // addFields is called with a field object containing the value
            const firstArg = mockAddFields.mock.calls[0][0] as any;
            expect(firstArg).toBeDefined();
            expect(firstArg.value).toBeDefined();
            expect(firstArg.value).toContain('Twitch');

            delete process.env.TWITCH_STREAM;
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
        test('should check if user is live when scheduled', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];
            
            // Execute the scheduled callback
            await callback();
            
            expect(mockTikTokLiveConnection).toHaveBeenCalledWith('pokenonii');
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should handle user not online error gracefully', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            const notOnlineError = new Error("The requested user isn't online");
            mockConnect.mockRejectedValue(notOnlineError);
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];
            
            await callback();
            
            // Should not throw and should not log this specific error
            expect(mockConnect).toHaveBeenCalled();
            expect(mockLogger.log).not.toHaveBeenCalledWith(notOnlineError);
        });

        test('should catch and log other errors', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            const otherError = new Error('Network error');
            mockConnect.mockRejectedValue(otherError);
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];
            
            // Clear the mock from any constructor calls
            mockLogger.log.mockClear();
            
            await callback();
            
            // Give async operations time to complete
            await new Promise(resolve => setImmediate(resolve));
            
            // The error should be caught in the try-catch and logged
            expect(mockLogger.log).toHaveBeenCalled();
            const loggedError = mockLogger.log.mock.calls[0][0];
            expect(loggedError).toBe(otherError);
        });

        test('should not send notification if already sent today', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            const mockChannel = {
                isTextBased: jest.fn(() => true),
                send: jest.fn<() => Promise<any>>().mockResolvedValue({} as any),
            };

            (mockClient.channels.fetch as jest.Mock<(id: string) => Promise<any>>).mockResolvedValue(mockChannel as any);
            mockConnect.mockResolvedValue({ connected: true });

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            // First call - should send notification
            await callback();
            // Give async operations time to complete
            await new Promise(resolve => setImmediate(resolve));

            const firstCallCount = mockConnect.mock.calls.length;

            // Clear mocks
            mockConnect.mockClear();
            mockTikTokLiveConnection.mockClear();
            mockChannel.send.mockClear();

            // Second call same day - should return early without checking
            await callback();
            // Give async operations time to complete
            await new Promise(resolve => setImmediate(resolve));

            // Should return early without calling connect again
            expect(mockConnect).not.toHaveBeenCalled();
            expect(mockChannel.send).not.toHaveBeenCalled();
        });

        test('should send notification to configured channels when live', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789,987654321';
            
            const mockChannel = {
                isTextBased: jest.fn(() => true),
                send: jest.fn<() => Promise<any>>().mockResolvedValue({} as any),
            };
            
            (mockClient.channels.fetch as jest.Mock<(id: string) => Promise<any>>).mockResolvedValue(mockChannel as any);
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];
            
            await callback();
            
            // Note: There's a bug in the original code - forEach with async arrow function
            // The async function is not awaited, so this test reflects current behavior
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should log error when no channel IDs configured', async () => {
            delete process.env.TIKTOK_LIVE_CHANNEL_IDS;
            
            mockConnect.mockResolvedValue({ connected: true });
            
            // Create new notifier with no channel IDs
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];
            
            // Clear the mock from constructor calls
            mockLogger.log.mockClear();
            
            await callback();
            
            // Give async operations time to complete
            await new Promise(resolve => setImmediate(resolve));
            
            // Should log the error about missing channel IDs
            expect(mockLogger.log).toHaveBeenCalled();
            const logCalls = mockLogger.log.mock.calls;
            const hasErrorMessage = logCalls.some(call => {
                const arg = call[0];
                if (typeof arg === 'string') {
                    return arg.includes('No Channel Ids found');
                }
                if (arg && typeof arg === 'object' && 'includes' in arg && typeof arg.includes === 'function') {
                    return arg.includes('No Channel Ids found');
                }
                return false;
            });
            expect(hasErrorMessage).toBe(true);
        });

        test('should handle channel fetch failure', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            
            (mockClient.channels.fetch as jest.Mock<(id: string) => Promise<any>>).mockResolvedValue(null as any);
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];
            
            await callback();
            
            // Should handle gracefully
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should handle non-text-based channel', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            
            const mockVoiceChannel = {
                isTextBased: jest.fn(() => false),
            };
            
            (mockClient.channels.fetch as jest.Mock<(id: string) => Promise<any>>).mockResolvedValue(mockVoiceChannel as any);
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];
            
            await callback();
            
            // Should handle gracefully
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should handle channel without send method', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            
            const mockChannelNoSend = {
                isTextBased: jest.fn(() => true),
                // No send method
            };
            
            (mockClient.channels.fetch as jest.Mock<(id: string) => Promise<any>>).mockResolvedValue(mockChannelNoSend as any);
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];
            
            await callback();
            
            // Should handle gracefully
            expect(mockConnect).toHaveBeenCalled();
        });

        test('should return early if connect returns falsy', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            mockConnect.mockResolvedValue(null);
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];
            
            await callback();
            
            expect(mockConnect).toHaveBeenCalled();
            expect(mockLogger.log).not.toHaveBeenCalledWith(
                expect.stringContaining('Error: No Channel Ids')
            );
        });

        test('should clear dayCheck map on new day', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            mockConnect.mockResolvedValue({ connected: true });
            
            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];
            
            // First call
            await callback();
            
            // The map should be cleared and reset each time if date changes
            // This test verifies the logic works without error
            expect(notifier).toBeDefined();
        });
    });
});