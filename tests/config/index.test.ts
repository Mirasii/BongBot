import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('config/index.js', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Save original process.env
        originalEnv = process.env;
        // Clear module cache to ensure a fresh import of config/index.js for each test
        jest.resetModules();
        // Mock process.env for each test
        process.env = { ...originalEnv }; // Create a shallow copy
    });

    afterEach(() => {
        // Restore original process.env
        process.env = originalEnv;
        jest.resetModules();
    });

    test('should load configuration values from process.env when set', async () => {
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

        const { default: config } = await import('../../src/config/index.js');

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

    test('should use default values when environment variables are not set', async () => {
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

        const { default: config } = await import('../../src/config/index.js');

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

    test('should correctly convert active flags to boolean', async () => {
        process.env.OPENAI_ACTIVE = 'false';
        process.env.GOOGLEAI_ACTIVE = 'true';

        const { default: config } = await import('../../src/config/index.js');

        expect(config.apis.openai.active).toBe(false);
        expect(config.apis.googleai.active).toBe(true);
    });

    test('should use ./dist/ as file_root in production (when JEST_WORKER_ID is undefined)', async () => {
        // Save the current JEST_WORKER_ID
        const savedJestWorkerId = process.env.JEST_WORKER_ID;

        // Temporarily delete JEST_WORKER_ID to simulate production
        delete process.env.JEST_WORKER_ID;

        // Clear module cache to force re-import
        jest.resetModules();

        const { default: config } = await import('../../src/config/index.js');

        expect(config.media.file_root).toBe('./dist/');

        // Restore JEST_WORKER_ID
        if (savedJestWorkerId !== undefined) {
            process.env.JEST_WORKER_ID = savedJestWorkerId;
        }
    });
});

describe('validateRequiredConfig', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv };
        jest.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.resetModules();
    });

    test('should throw error when DISCORD_API_KEY is missing', async () => {
        delete process.env.DISCORD_API_KEY;

        const { validateRequiredConfig } = await import('../../src/config/index.js');

        expect(() => validateRequiredConfig()).toThrow('DISCORD_API_KEY is required');
    });

    test('should throw error when OPENAI_API_KEY is missing but OPENAI_ACTIVE=true', async () => {
        process.env.DISCORD_API_KEY = 'test_key';
        process.env.OPENAI_ACTIVE = 'true';
        delete process.env.OPENAI_API_KEY;

        const { validateRequiredConfig } = await import('../../src/config/index.js');

        expect(() => validateRequiredConfig()).toThrow('OPENAI_API_KEY is required when OPENAI_ACTIVE=true');
    });

    test('should throw error when GOOGLEAI_API_KEY is missing but GOOGLEAI_ACTIVE=true', async () => {
        process.env.DISCORD_API_KEY = 'test_key';
        process.env.GOOGLEAI_ACTIVE = 'true';
        delete process.env.GOOGLEAI_API_KEY;

        const { validateRequiredConfig } = await import('../../src/config/index.js');

        expect(() => validateRequiredConfig()).toThrow('GOOGLEAI_API_KEY is required when GOOGLEAI_ACTIVE=true');
    });

    test('should throw error with multiple missing keys', async () => {
        delete process.env.DISCORD_API_KEY;
        process.env.OPENAI_ACTIVE = 'true';
        delete process.env.OPENAI_API_KEY;

        const { validateRequiredConfig } = await import('../../src/config/index.js');

        expect(() => validateRequiredConfig()).toThrow('DISCORD_API_KEY is required');
        expect(() => validateRequiredConfig()).toThrow('OPENAI_API_KEY is required');
    });

    test('should not throw when all required keys are present', async () => {
        process.env.DISCORD_API_KEY = 'test_discord_key';
        process.env.OPENAI_ACTIVE = 'false';
        process.env.GOOGLEAI_ACTIVE = 'false';

        const { validateRequiredConfig } = await import('../../src/config/index.js');

        expect(() => validateRequiredConfig()).not.toThrow();
    });

    test('should not throw when optional AI keys are missing if not active', async () => {
        process.env.DISCORD_API_KEY = 'test_discord_key';
        delete process.env.OPENAI_API_KEY;
        delete process.env.GOOGLEAI_API_KEY;
        process.env.OPENAI_ACTIVE = 'false';
        process.env.GOOGLEAI_ACTIVE = 'false';

        const { validateRequiredConfig } = await import('../../src/config/index.js');

        expect(() => validateRequiredConfig()).not.toThrow();
    });
});
