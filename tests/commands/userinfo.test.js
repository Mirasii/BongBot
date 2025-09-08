const { EmbedBuilder } = require('discord.js');
const { setupMockCleanup } = require('../utils/testSetup.js');
const { testCommandStructure } = require('../utils/commandStructureTestUtils.js');

const userinfoCommand = require('../../src/commands/userinfo.js');

// Mock EmbedBuilder
jest.mock('discord.js', () => {
    const OriginalSlashCommandBuilder = jest.requireActual('discord.js').SlashCommandBuilder;
    return {
        EmbedBuilder: jest.fn().mockImplementation(() => ({
            setTitle: jest.fn().mockReturnThis(),
            setColor: jest.fn().mockReturnThis(),
            setThumbnail: jest.fn().mockReturnThis(),
            addFields: jest.fn().mockReturnThis(),
            toJSON: jest.fn().mockReturnValue({ mockEmbed: true }), // Simplified return for toJSON
        })),
        SlashCommandBuilder: OriginalSlashCommandBuilder,
    };
});

// Setup standard mock cleanup
setupMockCleanup();

// Test standard command structure
testCommandStructure(userinfoCommand, 'usercard');

describe('userinfo command', () => {
    const mockDate = new Date('2023-01-01T00:00:00.000Z');

    // Common mock user factory
    const createMockUser = (username, discriminator, id) => ({
        username,
        discriminator,
        id,
        createdAt: mockDate,
        avatarURL: jest.fn(() => `http://example.com/${username}_avatar.jpg`),
    });

    // Common mock member factory
    const createMockMember = () => ({
        joinedAt: mockDate,
    });

    const mockUser = createMockUser('testuser', '1234', '1234567890');
    const mockTargetUser = createMockUser('targetuser', '5678', '0987654321');
    const mockMember = createMockMember();
    const mockTargetMember = createMockMember();

    const createMockInteraction = (targetUser = null) => ({
        guild: {
            members: {
                cache: {
                    get: jest.fn((id) => {
                        if (id === mockUser.id) return mockMember;
                        if (id === mockTargetUser.id) return mockTargetMember;
                        return null;
                    }),
                },
            },
        },
        user: mockUser,
        options: {
            getUser: jest.fn(() => targetUser),
        },
    });

    test('should return info card for the interaction user if no target is provided', async () => {
        const mockInteraction = createMockInteraction();

        const result = await userinfoCommand.execute(mockInteraction);

        expect(mockInteraction.options.getUser).toHaveBeenCalledWith('target');
        expect(mockInteraction.guild.members.cache.get).toHaveBeenCalledWith(mockUser.id);
        expect(EmbedBuilder).toHaveBeenCalledTimes(1);
        expect(EmbedBuilder.mock.results[0].value.setTitle).toHaveBeenCalledWith(`Info card for ${mockUser.username}`);
        expect(EmbedBuilder.mock.results[0].value.setColor).toHaveBeenCalledWith('#0099ff');
        expect(EmbedBuilder.mock.results[0].value.setThumbnail).toHaveBeenCalledWith(mockUser.avatarURL({ dynamic: true }));
        expect(EmbedBuilder.mock.results[0].value.addFields).toHaveBeenCalledWith(
            { name: 'Username', value: mockUser.username, inline: true },
            { name: 'Discriminator', value: `#${mockUser.discriminator}`, inline: true },
            { name: 'User ID', value: mockUser.id, inline: true },
            { name: 'Account created', value: mockUser.createdAt.toLocaleDateString('en-US'), inline: false },
            { name: 'Join Date', value: mockMember.joinedAt.toString(), inline: true },
        );
        expect(result).toEqual({
            embeds: [{ mockEmbed: true }],
        });
    });

    test('should return info card for the target user if provided', async () => {
        const mockInteraction = createMockInteraction(mockTargetUser);

        const result = await userinfoCommand.execute(mockInteraction);

        expect(mockInteraction.options.getUser).toHaveBeenCalledWith('target');
        expect(mockInteraction.guild.members.cache.get).toHaveBeenCalledWith(mockTargetUser.id);
        expect(EmbedBuilder).toHaveBeenCalledTimes(1);
        expect(EmbedBuilder.mock.results[0].value.setTitle).toHaveBeenCalledWith(`Info card for ${mockTargetUser.username}`);
        expect(EmbedBuilder.mock.results[0].value.setColor).toHaveBeenCalledWith('#0099ff');
        expect(EmbedBuilder.mock.results[0].value.setThumbnail).toHaveBeenCalledWith(mockTargetUser.avatarURL({ dynamic: true }));
        expect(EmbedBuilder.mock.results[0].value.addFields).toHaveBeenCalledWith(
            { name: 'Username', value: mockTargetUser.username, inline: true },
            { name: 'Discriminator', value: `#${mockTargetUser.discriminator}`, inline: true },
            { name: 'User ID', value: mockTargetUser.id, inline: true },
            { name: 'Account created', value: mockTargetUser.createdAt.toLocaleDateString('en-US'), inline: false },
            { name: 'Join Date', value: mockTargetMember.joinedAt.toString(), inline: true },
        );
        expect(result).toEqual({
            embeds: [{ mockEmbed: true }],
        });
    });
});
