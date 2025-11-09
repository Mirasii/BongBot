import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import type { ExtendedClient } from '../../src/helpers/interfaces.js';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server.js';

// Set environment variables BEFORE importing the module
process.env.TIKTOK_USERNAME = 'pokenonii';
process.env.LIVE_DISPLAY_NAME = 'TestStreamer';
process.env.LIVE_START_TIME = '15';
process.env.LIVE_END_TIME = '18';

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

describe('TikTokLiveNotifier - without TIKTOK_USERNAME', () => {
    test('should return early if TIKTOK_USERNAME is not set', () => {
        const savedUsername = process.env.TIKTOK_USERNAME;
        delete process.env.TIKTOK_USERNAME;

        const mockClient = {
            version: '1.0.0',
            user: {
                displayAvatarURL: jest.fn(() => 'http://example.com/avatar.jpg'),
            },
            channels: {
                fetch: jest.fn<(id: string) => Promise<any>>(),
            },
        } as unknown as ExtendedClient;

        const mockLogger = {
            log: jest.fn(),
        };

        mockScheduleJob.mockClear();
        const notifier = new TikTokLiveNotifier(mockClient, mockLogger);

        expect(notifier).toBeDefined();
        expect(mockScheduleJob).not.toHaveBeenCalled();

        process.env.TIKTOK_USERNAME = savedUsername;
    });
});

describe('TikTokLiveNotifier', () => {
    let mockClient: ExtendedClient;
    let mockLogger: { log: jest.Mock };
    let notifier: typeof TikTokLiveNotifier.prototype;
    let scheduledCallbacks: Function[] = [];

    beforeEach(() => {
        scheduledCallbacks = [];

        // Reset environment variables
        delete process.env.TIKTOK_LIVE_CHANNEL_IDS;
        delete process.env.TWITCH_STREAM;
        delete process.env.TWITCH_USERNAME;

        // Clear mocks
        mockConnect.mockClear();
        mockTikTokLiveConnection.mockClear();
        mockSetTitle.mockClear();
        mockSetColor.mockClear();
        mockSetThumbnail.mockClear();
        mockAddFields.mockClear();
        mockSetFooter.mockClear();
        mockSetTimestamp.mockClear();
        mockEmbedBuilder.mockClear();
        mockScheduleJob.mockClear();

        // Capture ALL scheduled callbacks (must be after clearing mocks)
        mockScheduleJob.mockImplementation((...args: any[]) => {
            const callback = args[1] as Function;
            scheduledCallbacks.push(callback);
            return {};
        });

        // Set up default MSW handler for TikTok avatar fetching
        server.use(
            http.get('https://www.tiktok.com/@pokenonii', () => {
                return HttpResponse.text('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{"__DEFAULT_SCOPE__":{"webapp.user-detail":{"userInfo":{"user":{"avatarLarger":"https://example.com/avatar.jpg"}}}}}</script>');
            })
        );

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
    });

    afterEach(() => {
        delete process.env.TIKTOK_LIVE_CHANNEL_IDS;
        delete process.env.TWITCH_STREAM;
        delete process.env.TWITCH_USERNAME;
    });

    describe('constructor', () => {
        test('should throw error if LIVE_DISPLAY_NAME is missing', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            const savedDisplayName = process.env.LIVE_DISPLAY_NAME;
            delete process.env.LIVE_DISPLAY_NAME;

            expect(() => {
                new TikTokLiveNotifier(mockClient, mockLogger);
            }).toThrow('LIVE_DISPLAY_NAME environment variable is required');

            process.env.LIVE_DISPLAY_NAME = savedDisplayName;
        });

        test('should throw error for invalid time format', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            const savedStartTime = process.env.LIVE_START_TIME;
            process.env.LIVE_START_TIME = 'invalid';

            expect(() => {
                new TikTokLiveNotifier(mockClient, mockLogger);
            }).toThrow('must be valid hour numbers');

            process.env.LIVE_START_TIME = savedStartTime;
        });

        test('should throw error for time out of range', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            const savedStartTime = process.env.LIVE_START_TIME;
            process.env.LIVE_START_TIME = '25';

            expect(() => {
                new TikTokLiveNotifier(mockClient, mockLogger);
            }).toThrow('must be between 0 and 23');

            process.env.LIVE_START_TIME = savedStartTime;
        });

        test('should use default time values if not set', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            const savedStartTime = process.env.LIVE_START_TIME;
            const savedEndTime = process.env.LIVE_END_TIME;
            delete process.env.LIVE_START_TIME;
            delete process.env.LIVE_END_TIME;

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);

            expect(notifier).toBeDefined();
            expect(mockScheduleJob).toHaveBeenCalledWith('*/1 15-18 * * *', expect.any(Function));

            process.env.LIVE_START_TIME = savedStartTime;
            process.env.LIVE_END_TIME = savedEndTime;
        });

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

        test('should not include Twitch link when TWITCH_STREAM is not set', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            // TWITCH_STREAM is not set (deleted in beforeEach)

            mockAddFields.mockClear();

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);

            expect(mockAddFields).toHaveBeenCalled();
            // addFields is called with a field object containing the value
            const firstArg = mockAddFields.mock.calls[0][0] as any;
            expect(firstArg).toBeDefined();
            expect(firstArg.value).toBeDefined();
            expect(firstArg.value).not.toContain('Twitch');
        });

        test('should include Twitch link when TWITCH_STREAM is set', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            process.env.TWITCH_STREAM = 'true';
            process.env.TWITCH_USERNAME = 'teststreamer';

            mockAddFields.mockClear();

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);

            expect(mockAddFields).toHaveBeenCalled();
            // addFields is called with a field object containing the value
            const firstArg = mockAddFields.mock.calls[0][0] as any;
            expect(firstArg).toBeDefined();
            expect(firstArg.value).toBeDefined();
            expect(firstArg.value).toContain('Twitch');
        });

        test('should handle TWITCH_STREAM set but TWITCH_USERNAME undefined', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';
            process.env.TWITCH_STREAM = 'true';
            // TWITCH_USERNAME not set

            mockAddFields.mockClear();

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);

            expect(mockAddFields).toHaveBeenCalled();
            const firstArg = mockAddFields.mock.calls[0][0] as any;
            expect(firstArg).toBeDefined();
            expect(firstArg.value).toBeDefined();
            // Should still contain Twitch even with undefined username
            expect(firstArg.value).toContain('Twitch');
            expect(firstArg.value).toContain('undefined'); // Will have "undefined" in URL
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

        test('should handle empty string channel IDs', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '';

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);

            expect(notifier).toBeDefined();
        });

        test('should handle client with undefined user', () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            const mockClientNoUser = {
                version: '1.0.0',
                user: undefined,
                channels: {
                    fetch: jest.fn<(id: string) => Promise<any>>(),
                },
            } as unknown as ExtendedClient;

            notifier = new TikTokLiveNotifier(mockClientNoUser, mockLogger);

            expect(notifier).toBeDefined();
            expect(mockSetFooter).toHaveBeenCalled();
            // iconURL should be undefined when user is undefined
            const footerCall = mockSetFooter.mock.calls[mockSetFooter.mock.calls.length - 1][0] as { text: string; iconURL?: string };
            expect(footerCall.iconURL).toBeUndefined();
        });
    });

    describe('fetchAvatarFromProfile', () => {
        test('should fetch avatar from TikTok profile with only avatarLarger', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            server.use(
                http.get('https://www.tiktok.com/@pokenonii', () => {
                    return HttpResponse.text('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{"__DEFAULT_SCOPE__":{"webapp.user-detail":{"userInfo":{"user":{"avatarLarger":"https://example.com/large.jpg"}}}}}</script>');
                })
            );

            mockConnect.mockResolvedValue({ connected: true });

            const mockChannel = {
                isTextBased: jest.fn(() => true),
                send: jest.fn<() => Promise<any>>().mockResolvedValue({} as any),
            };

            (mockClient.channels.fetch as jest.Mock<(id: string) => Promise<any>>).mockResolvedValue(mockChannel as any);

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            await callback();
            await new Promise(resolve => setImmediate(resolve));

            expect(mockSetThumbnail).toHaveBeenCalledWith('https://example.com/large.jpg');
        });

        test('should use avatarMedium if avatarLarger is not available', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            server.use(
                http.get('https://www.tiktok.com/@pokenonii', () => {
                    return HttpResponse.text('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{"__DEFAULT_SCOPE__":{"webapp.user-detail":{"userInfo":{"user":{"avatarMedium":"https://example.com/medium.jpg"}}}}}</script>');
                })
            );

            mockConnect.mockResolvedValue({ connected: true });

            const mockChannel = {
                isTextBased: jest.fn(() => true),
                send: jest.fn<() => Promise<any>>().mockResolvedValue({} as any),
            };

            (mockClient.channels.fetch as jest.Mock<(id: string) => Promise<any>>).mockResolvedValue(mockChannel as any);

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            await callback();
            await new Promise(resolve => setImmediate(resolve));

            expect(mockSetThumbnail).toHaveBeenCalledWith('https://example.com/medium.jpg');
        });

        test('should handle fetch response not ok', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            server.use(
                http.get('https://www.tiktok.com/@pokenonii', () => {
                    return new HttpResponse(null, { status: 404 });
                })
            );

            mockConnect.mockResolvedValue({ connected: true });

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Error logging happens twice: first the message string, then the error object
            expect(mockLogger.log).toHaveBeenCalled();
            const loggedError = mockLogger.log.mock.calls[mockLogger.log.mock.calls.length - 1][0] as Error;
            expect(loggedError.message).toContain('Failed to fetch avatar');
        });

        test('should handle missing script tag in HTML', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            server.use(
                http.get('https://www.tiktok.com/@pokenonii', () => {
                    return HttpResponse.text('<html><body>No script tag here</body></html>');
                })
            );

            mockConnect.mockResolvedValue({ connected: true });

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Error logging happens twice: first the message string, then the error object
            expect(mockLogger.log).toHaveBeenCalled();
            const loggedError = mockLogger.log.mock.calls[mockLogger.log.mock.calls.length - 1][0] as Error;
            expect(loggedError.message).toContain('Failed to fetch avatar');
        });

        test('should handle invalid JSON in script tag', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            server.use(
                http.get('https://www.tiktok.com/@pokenonii', () => {
                    return HttpResponse.text('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">invalid json</script>');
                })
            );

            mockConnect.mockResolvedValue({ connected: true });

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Error logging happens twice: first the message string, then the error object
            expect(mockLogger.log).toHaveBeenCalled();
            const loggedError = mockLogger.log.mock.calls[mockLogger.log.mock.calls.length - 1][0] as Error;
            expect(loggedError.message).toContain('Failed to fetch avatar');
        });

        test('should handle missing avatar data in parsed JSON', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            server.use(
                http.get('https://www.tiktok.com/@pokenonii', () => {
                    return HttpResponse.text('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{"__DEFAULT_SCOPE__":{}}</script>');
                })
            );

            mockConnect.mockResolvedValue({ connected: true });

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Error logging happens twice: first the message string, then the error object
            expect(mockLogger.log).toHaveBeenCalled();
            const loggedError = mockLogger.log.mock.calls[mockLogger.log.mock.calls.length - 1][0] as Error;
            expect(loggedError.message).toContain('Failed to fetch avatar');
        });

        test('should handle partial JSON structure with missing user', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            server.use(
                http.get('https://www.tiktok.com/@pokenonii', () => {
                    return HttpResponse.text('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{"__DEFAULT_SCOPE__":{"webapp.user-detail":{"userInfo":{}}}}</script>');
                })
            );

            mockConnect.mockResolvedValue({ connected: true });

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Error logging happens twice: first the message string, then the error object
            expect(mockLogger.log).toHaveBeenCalled();
            const loggedError = mockLogger.log.mock.calls[mockLogger.log.mock.calls.length - 1][0] as Error;
            expect(loggedError.message).toContain('Failed to fetch avatar');
        });

        test('should handle fetch throwing an error', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            server.use(
                http.get('https://www.tiktok.com/@pokenonii', () => {
                    return HttpResponse.error();
                })
            );

            mockConnect.mockResolvedValue({ connected: true });

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Error logging happens twice: first the message string, then the error object
            expect(mockLogger.log).toHaveBeenCalled();
            const loggedError = mockLogger.log.mock.calls[mockLogger.log.mock.calls.length - 1][0] as Error;
            expect(loggedError.message).toContain('Failed to fetch avatar');
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

            // Clear the mock from constructor calls
            mockLogger.log.mockClear();

            await callback();

            // Give async operations time to complete
            await new Promise(resolve => setImmediate(resolve));

            // The error should be caught in the try-catch and logged
            // First call is the error message string, second call is the actual error
            expect(mockLogger.log).toHaveBeenCalledTimes(2);
            expect(mockLogger.log.mock.calls[0][0]).toBe('Error occurred attempting to get Live Status');
            expect(mockLogger.log.mock.calls[1][0]).toBe(otherError);
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
            await new Promise(resolve => setImmediate(resolve));

            expect(mockConnect).toHaveBeenCalled();
            expect(mockClient.channels.fetch).toHaveBeenCalledWith('123456789');
            expect(mockClient.channels.fetch).toHaveBeenCalledWith('987654321');
            expect(mockChannel.send).toHaveBeenCalledTimes(2);
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
                    return arg.includes('No Channel ID');
                }
                if (arg && typeof arg === 'object' && 'message' in arg && typeof arg.message === 'string') {
                    return arg.message.includes('No Channel ID');
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

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Should handle gracefully - channel not found is logged via continue statement
            expect(mockConnect).toHaveBeenCalled();
            // The logger.log is called with a string message in this case
            expect(mockLogger.log).toHaveBeenCalledWith('Error: Channel not found or is not a text-based channel.');
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

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Should handle gracefully - logged via continue statement
            expect(mockConnect).toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Error: Channel not found or is not a text-based channel.');
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

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Should handle gracefully - logged via continue statement
            expect(mockConnect).toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Error: Bot does not have permission to send messages in the channel.');
        });

        test('should handle channel with send property that is not a function', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            const mockChannelSendNotFunction = {
                isTextBased: jest.fn(() => true),
                send: 'not a function', // send exists but is not a function
            };

            (mockClient.channels.fetch as jest.Mock<(id: string) => Promise<any>>).mockResolvedValue(mockChannelSendNotFunction as any);
            mockConnect.mockResolvedValue({ connected: true });

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Should handle gracefully - logged via continue statement
            expect(mockConnect).toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Error: Bot does not have permission to send messages in the channel.');
        });

        test('should handle channel send throwing an error', async () => {
            process.env.TIKTOK_LIVE_CHANNEL_IDS = '123456789';

            const sendError = new Error('Send failed');
            const mockChannel = {
                isTextBased: jest.fn(() => true),
                send: jest.fn<() => Promise<any>>().mockRejectedValue(sendError),
            };

            (mockClient.channels.fetch as jest.Mock<(id: string) => Promise<any>>).mockResolvedValue(mockChannel as any);
            mockConnect.mockResolvedValue({ connected: true });

            notifier = new TikTokLiveNotifier(mockClient, mockLogger);
            const callback = scheduledCallbacks[scheduledCallbacks.length - 1];

            mockLogger.log.mockClear();
            await callback();
            await new Promise(resolve => setImmediate(resolve));

            // Should catch and log the send error
            expect(mockConnect).toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Error sending to channel'));
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