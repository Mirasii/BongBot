/**
 * Command Structure Test Utilities
 * 
 * Provides standardized tests for Discord slash command structure validation.
 * Eliminates duplication across command test files.
 */
import { SlashCommandBuilder } from 'discord.js';
import { Command } from './interfaces.js';

/**
 * Test standard command structure (data property, name, description, execute method)
 * @param {Object} command - The command module to test
 * @param {string} expectedName - Expected command name
 * @param {string} [description] - Optional specific description test
 */
function testCommandStructure(command: Command, expectedName: string, description = null) {
    describe('command structure', () => {
        test('should have a data property', () => {
            expect(command.data).toBeInstanceOf(SlashCommandBuilder);
        });

        test(`should have a name of "${expectedName}"`, () => {
            expect(command.data.name).toBe(expectedName);
        });

        test('should have a description', () => {
            if (description) {
                expect(command.data.description).toBe(description);
            } else {
                expect(command.data.description).toBeTruthy();
            }
        });

        test('should have an execute method', () => {
            expect(command.execute).toBeInstanceOf(Function);
        });
    });
}

/**
 * Test Google Search command pattern (extends standard structure)
 * @param {Object} command - The command module to test
 * @param {string} expectedName - Expected command name
 * @param {string} searchQuery - Expected search query the command uses
 */
function testGoogleSearchCommand(command: Command, expectedName: string) {
    testCommandStructure(command, expectedName);
    
    describe('Google Search command behavior', () => {
        test('should use googleSearch helper', () => {
            expect(require('../../src/helpers/googleSearch.js')).toBeDefined();
        });
        
        test('should handle search errors with ERROR_BUILDER', () => {
            expect(require('../../src/helpers/errorBuilder.js')).toBeDefined();
        });
    });
}

/**
 * Test Embed Builder command pattern (extends standard structure)
 * @param {Object} command - The command module to test
 * @param {string} expectedName - Expected command name
 */
function testEmbedCommand(command: Command, expectedName: string) {
    testCommandStructure(command, expectedName);
    
    describe('Embed command behavior', () => {
        test('should use EMBED_BUILDER helper', () => {
            expect(require('../../src/helpers/embedBuilder.js')).toBeDefined();
        });
    });
}

/**
 * Test Info Card command pattern (extends standard structure)
 * @param {Object} command - The command module to test  
 * @param {string} expectedName - Expected command name
 */
function testInfoCardCommand(command: Command, expectedName: string) {
    testCommandStructure(command, expectedName);
    
    describe('Info Card command behavior', () => {
        test('should use infoCard helper', () => {
            expect(require('../../src/helpers/infoCard.js')).toBeDefined();
        });
        
        test('should handle errors with ERROR_BUILDER', () => {
            expect(require('../../src/helpers/errorBuilder.js')).toBeDefined();
        });
    });
}

export {
    testCommandStructure,
    testGoogleSearchCommand, 
    testEmbedCommand,
    testInfoCardCommand
};
