const { EmbedBuilder } = require('discord.js');

const userinfoCommand = require('../../src/commands/userinfo.js');

// Mock EmbedBuilder
jest.mock('discord.js', () => ({
    EmbedBuilder: jest.fn().mockImplementation(() => ({
        setTitle: jest.fn().mockReturnThis(),
        setColor: jest.fn().mockReturnThis(),
        setThumbnail: jest.fn().mockReturnThis(),
        addFields: jest.fn().mockReturnThis(),
        toJSON: jest.fn().mockReturnValue({ mockEmbed: true }), // Simplified return for toJSON
    })),
}));

describe('userinfo command', () => {
    const mockDate = new Date('2023-01-01T00:00:00.000Z');

    const mockUser = {
        username: 'testuser',
        discriminator: '1234',
        id: '1234567890',
        createdAt: mockDate,
        avatarURL: jest.fn(() => 'http://example.com/avatar.jpg'),
    };

    const mockTargetUser = {
        username: 'targetuser',
        discriminator: '5678',
        id: '0987654321',
        createdAt: mockDate,
        avatarURL: jest.fn(() => 'http://example.com/target_avatar.jpg'),
    };

    const mockMember = {
        joinedAt: mockDate,
    };

    const mockTargetMember = {
        joinedAt: mockDate,
    };

    const mockInteractionBase = {
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
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return info card for the interaction user if no target is provided', async () => {
        const mockInteraction = {
            ...mockInteractionBase,
            user: mockUser,
            options: {
                getUser: jest.fn(() => null), // No target user provided
            },
        };

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
        const mockInteraction = {
            ...mockInteractionBase,
            user: mockUser, // Interaction user is still present
            options: {
                getUser: jest.fn(() => mockTargetUser), // Target user provided
            },
        };

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
