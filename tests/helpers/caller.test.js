import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server.js';

const caller = require('../../src/helpers/caller.js');

// Mock the LOGGER module
jest.mock('../../src/helpers/logging.js', () => ({
    log: jest.fn(),
}));

describe('caller helper', () => {
    beforeAll(() => server.listen());
    afterEach(() => {
        server.resetHandlers();
        jest.clearAllMocks();
    });
    afterAll(() => server.close());

    // Mock console.error to prevent actual logging during tests
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('get method should make a successful GET request with params and headers', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/data';
        const mockParams = 'id=123';
        const mockHeaders = { 'Authorization': 'Bearer token' };
        const mockResponseData = { message: 'GET success' };

        server.use(
            http.get(`${mockUrl}${mockPath}?${mockParams}`, ({ request }) => {
                expect(request.headers.get('authorization')).toBe('Bearer token');
                return HttpResponse.json(mockResponseData);
            })
        );

        const result = await caller.get(mockUrl, mockPath, mockParams, mockHeaders);
        expect(result).toEqual(mockResponseData);
    });

    test('get method should make a successful GET request without params', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/data';
        const mockHeaders = { 'Content-Type': 'application/json' };
        const mockResponseData = { message: 'GET success no params' };

        server.use(
            http.get(`${mockUrl}${mockPath}`, ({ request }) => {
                expect(request.headers.get('content-type')).toBe('application/json');
                return HttpResponse.json(mockResponseData);
            })
        );

        const result = await caller.get(mockUrl, mockPath, null, mockHeaders);
        expect(result).toEqual(mockResponseData);
    });

    test('get method should handle non-ok responses', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/error';
        const mockHeaders = {};

        server.use(
            http.get(`${mockUrl}${mockPath}`, () => {
                return new HttpResponse('Not Found', { status: 404, statusText: 'Not Found' });
            })
        );

        await expect(caller.get(mockUrl, mockPath, null, mockHeaders)).rejects.toThrow(
            'Network response was not ok: 404 Not Found Not Found'
        );
        expect(require('../../src/helpers/logging.js').log).toHaveBeenCalledWith('Not Found');
    });

    test('post method should make a successful POST request with body and headers', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/create';
        const mockHeaders = { 'Content-Type': 'application/json' };
        const mockBody = { name: 'test', value: 123 };
        const mockResponseData = { message: 'POST success' };

        server.use(
            http.post(`${mockUrl}${mockPath}`, async ({ request }) => {
                const body = await request.json();
                expect(body).toEqual(mockBody);
                expect(request.headers.get('content-type')).toBe('application/json');
                return HttpResponse.json(mockResponseData);
            })
        );

        const result = await caller.post(mockUrl, mockPath, mockHeaders, mockBody);
        expect(result).toEqual(mockResponseData);
    });

    test('post method should handle non-ok responses', async () => {
        const mockUrl = 'http://test.com';
        const mockPath = '/api/error';
        const mockHeaders = {};
        const mockBody = { name: 'test' };

        server.use(
            http.post(`${mockUrl}${mockPath}`, () => {
                return new HttpResponse('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
            })
        );

        await expect(caller.post(mockUrl, mockPath, mockHeaders, mockBody)).rejects.toThrow(
            'Network response was not ok: 500 Internal Server Error Internal Server Error'
        );
        expect(require('../../src/helpers/logging.js').log).toHaveBeenCalledWith('Internal Server Error');
    });
});
