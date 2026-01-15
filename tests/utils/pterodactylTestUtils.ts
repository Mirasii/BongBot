/**
 * @fileoverview Shared utilities for Pterodactyl command tests
 * Eliminates common mock setup duplication across pterodactyl tests
 */
import { jest } from '@jest/globals';
import { createMockInteraction, createMockClient } from './commandTestUtils.js';

/**
 * Creates a standardized mock database object for pterodactyl tests
 * @returns Mock database object with common methods
 */
const createMockDatabase = () => ({
    addServer: jest.fn(),
    getServerById: jest.fn(),
    getServersByUserId: jest.fn(),
    updateServer: jest.fn(),
    deleteServer: jest.fn(),
    close: jest.fn(),
});

/**
 * Creates a standardized mock error builder function
 * @returns Object with mockBuildError function and setup function
 */
const createMockErrorBuilder = () => {
    const mockBuildError = jest.fn().mockReturnValue({
        content: 'Error occurred',
        ephemeral: true,
    });

    return mockBuildError;
};

/**
 * Creates a mock interaction for pterodactyl commands
 * @param options - Configuration for the mock
 * @returns Mock interaction object
 */
interface PterodactylInteractionOptions {
    commandName?: string;
    userId?: string;
    username?: string;
    options?: { [key: string]: string | null };
}

const createPterodactylMockInteraction = (config: PterodactylInteractionOptions = {}) => {
    const {
        commandName = 'pterodactyl',
        userId = 'test-user-123',
        username = 'testuser',
        options = {},
    } = config;

    const baseInteraction = createMockInteraction({ commandName });

    return {
        ...baseInteraction,
        user: {
            id: userId,
            username: username,
        },
        options: {
            getString: jest.fn((key: string, required?: boolean) => options[key] ?? null),
            getInteger: jest.fn(),
            getSubcommand: jest.fn(),
        },
    };
};

/**
 * Creates mock server data for testing
 * @param overrides - Partial server data to override defaults
 * @returns Mock server object
 */
interface MockServerOptions {
    id?: number;
    userId?: string;
    serverName?: string;
    serverUrl?: string;
    apiKey?: string;
}

const createMockServer = (overrides: MockServerOptions = {}) => ({
    id: overrides.id ?? 1,
    userId: overrides.userId ?? 'test-user-123',
    serverName: overrides.serverName ?? 'Test Server',
    serverUrl: overrides.serverUrl ?? 'https://panel.example.com',
    apiKey: overrides.apiKey ?? 'test-api-key-123',
});

/**
 * Creates multiple mock servers for testing list/status scenarios
 * @param count - Number of servers to create
 * @param userId - User ID for all servers
 * @returns Array of mock servers
 */
const createMockServers = (count: number, userId: string = 'test-user-123') => {
    return Array.from({ length: count }, (_, i) => createMockServer({
        id: i + 1,
        userId,
        serverName: `Server ${i + 1}`,
        serverUrl: `https://panel${i + 1}.example.com`,
        apiKey: `api-key-${i + 1}`,
    }));
};

export {
    createMockDatabase,
    createMockErrorBuilder,
    createPterodactylMockInteraction,
    createMockServer,
    createMockServers,
};
