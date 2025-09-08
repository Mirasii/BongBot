const { http, HttpResponse } = require('msw');
const { setupStandardTestEnvironment, server } = require('../utils/testSetup.js');
const { mockBody } = require(`../mocks/handlers.js`)
const caller = require('../../src/helpers/caller.js');

// Mock the LOGGER module
jest.mock('../../src/helpers/logging.js', () => ({
    log: jest.fn(),
}));

describe('caller helper', () => {
    // Use shared setup utility instead of duplicating MSW setup
    setupStandardTestEnvironment();

    test('get method should make a successful GET request with params and headers', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/data';
        const mockParams = 'id=123';
        const mockHeaders = { 'Authorization': 'Bearer token' };

        // Override default handler to verify headers
        server.use(
            http.get(`http://test.com/api/data`, ({ request }) => {
                const url = new URL(request.url);
                expect(url.searchParams.get('id')).toBe('123');
                expect(request.headers.get('authorization')).toBe('Bearer token');
                return HttpResponse.json({ message: 'GET success' });
            })
        );

        const result = await caller.get(mockUrl, mockPath, mockParams, mockHeaders);
        expect(result).toEqual({ message: 'GET success' });
    });

    test('get method should make a successful GET request without params', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/data';
        const mockHeaders = { 'Content-Type': 'application/json' };
        const result = await caller.get(mockUrl, mockPath, null, mockHeaders);
        expect(result).toEqual({ message: 'GET success default' });
    });

    test('get method should make a successful GET request with null path', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = null;
        const mockHeaders = { 'Content-Type': 'application/json' };
        const result = await caller.get(mockUrl, mockPath, null, mockHeaders);
        expect(result).toEqual({ message: 'GET success null path' });
    });

    test('get method should make a successful GET request with undefined params', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/data';
        const mockHeaders = { 'Content-Type': 'application/json' };

        // Uses default handler from handlers.js
        const result = await caller.get(mockUrl, mockPath, undefined, mockHeaders);
        expect(result).toEqual({ message: 'GET success default' });
    });

    test('get method should make a successful GET request with empty string params', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/data';
        const mockHeaders = { 'Content-Type': 'application/json' };

        // Uses default handler from handlers.js
        const result = await caller.get(mockUrl, mockPath, '', mockHeaders);
        expect(result).toEqual({ message: 'GET success default' });
    });

    test('get method should handle non-ok responses', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/error';
        const mockHeaders = {};

        // Uses default error handler from handlers.js
        await expect(caller.get(mockUrl, mockPath, null, mockHeaders)).rejects.toThrow(
            'Network response was not ok: 404 Not Found Not Found'
        );
        expect(require('../../src/helpers/logging.js').log).toHaveBeenCalledWith('Not Found');
    });

    test('post method should make a successful POST request with body and headers', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/create';
        const mockHeaders = { 'Content-Type': 'application/json' };
        const result = await caller.post(mockUrl, mockPath, mockHeaders, mockBody);
        expect(result).toEqual({ message: 'POST success' });
    });

    test('post method should handle non-ok responses', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/error';
        const mockHeaders = {};
        const mockBody = { name: 'test' };

        // Uses default error handler from handlers.js
        await expect(caller.post(mockUrl, mockPath, mockHeaders, mockBody)).rejects.toThrow(
            'Network response was not ok: 500 Internal Server Error Internal Server Error'
        );
        expect(require('../../src/helpers/logging.js').log).toHaveBeenCalledWith('Internal Server Error');
    });
});
