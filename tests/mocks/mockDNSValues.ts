import { jest } from '@jest/globals';

export default function mockDNSValues() {
    const mockResolve4 = jest.fn().mockResolvedValue(['8.8.8.8']);
    const mockResolve6 = jest.fn().mockResolvedValue(['2001:4860:4860::8888']);
    jest.unstable_mockModule('dns/promises', () => ({
        default: {
            resolve4: mockResolve4,
            resolve6: mockResolve6,
        },
        resolve4: mockResolve4,
        resolve6: mockResolve6,
    }));
}