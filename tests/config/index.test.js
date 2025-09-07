// Mock dotenv to prevent it from loading .env files during tests
jest.mock('dotenv', () => ({
    config: jest.fn(),
}));

describe('config/index.js', () => {
    let originalEnv;

    beforeEach(() => {
        // Save original process.env
        originalEnv = process.env;
        // Clear module cache to ensure a fresh import of config/index.js for each test
        jest.resetModules();
        // Mock process.env for each test
        process.env = { ...originalEnv };
        // Ensure dotenv.config() is called
        require('dotenv').config();
    });

    afterEach(() => {
        // Restore original process.env
        process.env = originalEnv;
    });

    test('should load configuration values from process.env when set', () => {
        process.env.DISCORD_API_KEY = 'mock_discord_key';
        process.env.QUOTEDB_API_KEY = 'mock_quotedb_key';
        process.env.QUOTEDB_USER_ID = 'mock_quotedb_user_id';
        process.env.GOOGLE_API_KEY = 'mock_google_key';
        process.env.GOOGLE_CX = 'mock_google_cx';
        process.env.OPENAI_ACTIVE = 'true';
        process.env.OPENAI_API_KEY = 'mock_openai_key';
        process.env.OPENAI_MODEL = 'mock_openai_model';
        process.env.GOOGLEAI_ACTIVE = 'true';
        process.env.GOOGLEAI_API_KEY = 'mock_googleai_key';
        process.env.GOOGLEAI_MODEL = 'mock_googleai_model';
        process.env.GOOGLEAI_IMAGE_MODEL = 'mock_googleai_image_model';

        const config = require('../../src/config/index.js');

        expect(config.discord.apikey).toBe('mock_discord_key');
        expect(config.apis.quotedb.url).toBe('https://quotes.elmu.dev');
        expect(config.apis.quotedb.apikey).toBe('mock_quotedb_key');
        expect(config.apis.quotedb.user_id).toBe('mock_quotedb_user_id');
        expect(config.apis.google.url).toBe('https://www.googleapis.com');
        expect(config.apis.google.apikey).toBe('mock_google_key');
        expect(config.apis.google.cx).toBe('mock_google_cx');
        expect(config.apis.openai.url).toBe('https://api.openai.com');
        expect(config.apis.openai.active).toBe(true);
        expect(config.apis.openai.apikey).toBe('mock_openai_key');
        expect(config.apis.openai.model).toBe('mock_openai_model');
        expect(config.apis.googleai.active).toBe(true);
        expect(config.apis.googleai.apikey).toBe('mock_googleai_key');
        expect(config.apis.googleai.model).toBe('mock_googleai_model');
        expect(config.apis.googleai.image_model).toBe('mock_googleai_image_model');
    });

    test('should use default values when environment variables are not set', () => {
        // Ensure relevant env vars are undefined
        delete process.env.DISCORD_API_KEY;
        delete process.env.QUOTEDB_API_KEY;
        delete process.env.QUOTEDB_USER_ID;
        delete process.env.GOOGLE_API_KEY;
        delete process.env.GOOGLE_CX;
        delete process.env.OPENAI_ACTIVE;
        delete process.env.OPENAI_API_KEY;
        delete process.env.OPENAI_MODEL;
        delete process.env.GOOGLEAI_ACTIVE;
        delete process.env.GOOGLEAI_API_KEY;
        delete process.env.GOOGLEAI_MODEL;
        delete process.env.GOOGLEAI_IMAGE_MODEL;

        const config = require('../../src/config/index.js');

        expect(config.discord.apikey).toBe(null);
        expect(config.apis.quotedb.url).toBe('https://quotes.elmu.dev');
        expect(config.apis.quotedb.apikey).toBe(null);
        expect(config.apis.quotedb.user_id).toBe(null);
        expect(config.apis.google.url).toBe('https://www.googleapis.com');
        expect(config.apis.google.apikey).toBe(null);
        expect(config.apis.google.cx).toBe(null);
        expect(config.apis.openai.url).toBe('https://api.openai.com');
        expect(config.apis.openai.active).toBe(false);
        expect(config.apis.openai.apikey).toBe(null);
        expect(config.apis.openai.model).toBe('gpt-4o');
        expect(config.apis.googleai.active).toBe(false);
        expect(config.apis.googleai.apikey).toBe(null);
        expect(config.apis.googleai.model).toBe('gemini-2.5-flash-lite');
        expect(config.apis.googleai.image_model).toBe('gemini-2.5-flash-image-preview');
    });

    test('should correctly convert active flags to boolean', () => {
        process.env.OPENAI_ACTIVE = 'false';
        process.env.GOOGLEAI_ACTIVE = 'true';

        const config = require('../../src/config/index.js');

        expect(config.apis.openai.active).toBe(false);
        expect(config.apis.googleai.active).toBe(true);
    });
});
