import { http, HttpResponse } from 'msw';
import { setupStandardTestEnvironment, server } from '../utils/testSetup.js';
import { mockBody } from '../mocks/handlers.js';
import { jest } from '@jest/globals';

// Mock the LOGGER module
const mockLog = jest.fn();
jest.unstable_mockModule('../../src/services/logging_service.js', () => ({
    default: {
        log: mockLog,
    },
}));

// Mock dns module
const mockResolve4 = jest.fn();
const mockResolve6 = jest.fn();
jest.unstable_mockModule('dns/promises', () => ({
    default: {
        resolve4: mockResolve4,
        resolve6: mockResolve6,
    },
    resolve4: mockResolve4,
    resolve6: mockResolve6,
}));

const { default: caller, Caller } = await import('../../src/helpers/caller.js');

describe('caller helper', () => {
    // Use shared setup utility instead of duplicating MSW setup
    setupStandardTestEnvironment();

    beforeEach(() => {
        jest.resetAllMocks();
        delete process.env.PTERODACTYL_ALLOWED_HOSTS;
    });

    describe('default export (get/post functions)', () => {
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
            expect(mockLog).toHaveBeenCalledWith('Not Found');
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
            expect(mockLog).toHaveBeenCalledWith('Internal Server Error');
        });

        test('should handle 204 No Content response', async () => {
            server.use(
                http.get('http://test.com/api/no-content', () => {
                    return new HttpResponse(null, { status: 204 });
                })
            );

            const result = await caller.get('http://test.com', '/api/no-content', null, {});
            expect(result).toBeNull();
        });

        test('should handle response with content-length 0', async () => {
            server.use(
                http.get('http://test.com/api/empty', () => {
                    return new HttpResponse('', {
                        status: 200,
                        headers: { 'content-length': '0' }
                    });
                })
            );

            const result = await caller.get('http://test.com', '/api/empty', null, {});
            expect(result).toBeNull();
        });
    });

    describe('Caller class', () => {
        let callerInstance: InstanceType<typeof Caller>;

        beforeEach(() => {
            callerInstance = new Caller();
        });

        test('get method should call the get function', async () => {
            server.use(
                http.get('http://test.com/api/data', () => {
                    return HttpResponse.json({ success: true });
                })
            );

            const result = await callerInstance.get('http://test.com', '/api/data', null, {});
            expect(result).toEqual({ success: true });
        });

        test('post method should call the post function', async () => {
            server.use(
                http.post('http://test.com/api/create', () => {
                    return HttpResponse.json({ created: true });
                })
            );

            const result = await callerInstance.post('http://test.com', '/api/create', {}, { data: 'test' });
            expect(result).toEqual({ created: true });
        });
    });

    describe('validateServerSSRF', () => {
        let callerInstance: InstanceType<typeof Caller>;

        beforeEach(() => {
            callerInstance = new Caller();
        });

        test('should reject invalid URL format', async () => {
            await expect(callerInstance.validateServerSSRF('not-a-valid-url'))
                .rejects.toThrow('Invalid server URL format.');
        });

        test('should reject non-HTTPS URLs', async () => {
            await expect(callerInstance.validateServerSSRF('http://example.com'))
                .rejects.toThrow('Server URL must use HTTPS protocol.');
        });

        test('should accept URLs in allowed hosts list', async () => {
            process.env.PTERODACTYL_ALLOWED_HOSTS = 'example.com,test.com';
            mockResolve4.mockResolvedValue(['8.8.8.8']);
            mockResolve6.mockResolvedValue([]);
            await expect(callerInstance.validateServerSSRF('https://example.com'))
                .resolves.toBeUndefined();
        });

        test('should reject URLs not in allowed hosts list', async () => {
            process.env.PTERODACTYL_ALLOWED_HOSTS = 'allowed.com';
            await expect(callerInstance.validateServerSSRF('https://notallowed.com'))
                .rejects.toThrow('Server URL hostname is not in the allowed hosts list.');
        });

        test('should reject URLs resolving to private IPv4 addresses', async () => {
            mockResolve4.mockResolvedValue(['192.168.1.1']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://private.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject URLs resolving to loopback addresses', async () => {
            mockResolve4.mockResolvedValue(['127.0.0.1']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://localhost.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject URLs resolving to 10.x.x.x addresses', async () => {
            mockResolve4.mockResolvedValue(['10.0.0.1']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://internal.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject URLs resolving to 172.16-31.x.x addresses', async () => {
            mockResolve4.mockResolvedValue(['172.16.0.1']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://internal.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject URLs resolving to link-local addresses', async () => {
            mockResolve4.mockResolvedValue(['169.254.1.1']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://linklocal.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject URLs resolving to 0.x.x.x addresses', async () => {
            mockResolve4.mockResolvedValue(['0.0.0.1']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://zero.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject URLs resolving to broadcast addresses', async () => {
            mockResolve4.mockResolvedValue(['255.255.255.255']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://broadcast.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should accept URLs resolving to public IP addresses', async () => {
            mockResolve4.mockResolvedValue(['8.8.8.8']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://public.example.com'))
                .resolves.toBeUndefined();
        });

        test('should reject when hostname cannot be resolved', async () => {
            mockResolve4.mockResolvedValue([]);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://unresolvable.example.com'))
                .rejects.toThrow('Unable to resolve server hostname.');
        });

        test('should handle DNS resolution errors when both fail', async () => {
            mockResolve4.mockRejectedValue(new Error('DNS error'));
            mockResolve6.mockRejectedValue(new Error('DNS error'));

            await expect(callerInstance.validateServerSSRF('https://dns-error.example.com'))
                .rejects.toThrow('Unable to resolve server hostname.');
        });

        test('should succeed when only IPv4 resolves (IPv6 fails)', async () => {
            mockResolve4.mockResolvedValue(['8.8.8.8']);
            mockResolve6.mockRejectedValue(new Error('ENODATA - no AAAA record'));

            await expect(callerInstance.validateServerSSRF('https://ipv4-only.example.com'))
                .resolves.toBeUndefined();
        });

        test('should succeed when only IPv6 resolves (IPv4 fails)', async () => {
            mockResolve4.mockRejectedValue(new Error('ENODATA - no A record'));
            mockResolve6.mockResolvedValue(['2001:4860:4860::8888']);

            await expect(callerInstance.validateServerSSRF('https://ipv6-only.example.com'))
                .resolves.toBeUndefined();
        });

        test('should fail when IPv4 fails and IPv6 returns empty', async () => {
            mockResolve4.mockRejectedValue(new Error('DNS error'));
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://partial-fail.example.com'))
                .rejects.toThrow('Unable to resolve server hostname.');
        });

        test('should fail when IPv6 fails and IPv4 returns empty', async () => {
            mockResolve4.mockResolvedValue([]);
            mockResolve6.mockRejectedValue(new Error('DNS error'));

            await expect(callerInstance.validateServerSSRF('https://partial-fail.example.com'))
                .rejects.toThrow('Unable to resolve server hostname.');
        });

        // IPv6 tests
        test('should reject IPv6 loopback address ::1', async () => {
            mockResolve4.mockResolvedValue([]);
            mockResolve6.mockResolvedValue(['::1']);

            await expect(callerInstance.validateServerSSRF('https://ipv6-loopback.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject IPv6 unique local addresses (fc00::/7)', async () => {
            mockResolve4.mockResolvedValue([]);
            mockResolve6.mockResolvedValue(['fc00::1']);

            await expect(callerInstance.validateServerSSRF('https://ipv6-ula.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject IPv6 unique local addresses (fd00::/8)', async () => {
            mockResolve4.mockResolvedValue([]);
            mockResolve6.mockResolvedValue(['fd00::1']);

            await expect(callerInstance.validateServerSSRF('https://ipv6-ula-fd.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject IPv6 link-local addresses (fe80::/10)', async () => {
            mockResolve4.mockResolvedValue([]);
            mockResolve6.mockResolvedValue(['fe80::1']);

            await expect(callerInstance.validateServerSSRF('https://ipv6-linklocal.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject IPv6 link-local addresses (fe90-feb0)', async () => {
            mockResolve4.mockResolvedValue([]);
            mockResolve6.mockResolvedValue(['fe90::1']);

            await expect(callerInstance.validateServerSSRF('https://ipv6-linklocal2.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject IPv4-mapped IPv6 addresses with private IPv4', async () => {
            mockResolve4.mockResolvedValue([]);
            mockResolve6.mockResolvedValue(['::ffff:192.168.1.1']);

            await expect(callerInstance.validateServerSSRF('https://ipv4-mapped.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should accept valid IPv6 addresses', async () => {
            mockResolve4.mockResolvedValue([]);
            mockResolve6.mockResolvedValue(['2001:4860:4860::8888']);

            await expect(callerInstance.validateServerSSRF('https://ipv6-valid.example.com'))
                .resolves.toBeUndefined();
        });

        test('should accept IPv4-mapped IPv6 addresses with public IPv4', async () => {
            mockResolve4.mockResolvedValue([]);
            mockResolve6.mockResolvedValue(['::ffff:8.8.8.8']);

            await expect(callerInstance.validateServerSSRF('https://ipv4-mapped-public.example.com'))
                .resolves.toBeUndefined();
        });

        test('should handle invalid IPv4 format (too many octets)', async () => {
            mockResolve4.mockResolvedValue(['1.2.3.4.5']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://invalid-ip.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should handle invalid IPv4 format (out of range)', async () => {
            mockResolve4.mockResolvedValue(['256.1.1.1']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://invalid-ip.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should handle IPv4 with negative values', async () => {
            mockResolve4.mockResolvedValue(['-1.1.1.1']);
            mockResolve6.mockResolvedValue([]);

            await expect(callerInstance.validateServerSSRF('https://invalid-ip.example.com'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should handle allowed hosts with mixed case', async () => {
            process.env.PTERODACTYL_ALLOWED_HOSTS = 'EXAMPLE.COM, Test.Com ';
            mockResolve4.mockResolvedValue(['8.8.8.8']);
            mockResolve6.mockResolvedValue([]);
            await expect(callerInstance.validateServerSSRF('https://example.com'))
                .resolves.toBeUndefined();
        });

        test('should handle URL with IP address hostname directly (skip DNS resolution)', async () => {
            // When hostname is already an IP address, net.isIP returns truthy
            // and DNS resolution is skipped
            await expect(callerInstance.validateServerSSRF('https://8.8.8.8'))
                .resolves.toBeUndefined();

            // DNS resolution should NOT have been called since hostname is an IP
            expect(mockResolve4).not.toHaveBeenCalled();
            expect(mockResolve6).not.toHaveBeenCalled();
        });

        test('should reject URL with private IP address hostname', async () => {
            await expect(callerInstance.validateServerSSRF('https://192.168.1.1'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });

        test('should reject URL with loopback IP address hostname', async () => {
            await expect(callerInstance.validateServerSSRF('https://127.0.0.1'))
                .rejects.toThrow('Server URL resolves to a private or reserved IP address.');
        });
    });
});
