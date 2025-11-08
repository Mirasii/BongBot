import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock discord.js EmbedBuilder and AttachmentBuilder
class MockEmbedBuilder {
    description: string | null = null;
    thumbnail: any = null;
    footer: any = null;
    image: any = null;
    timestamp: Date | null = null;

    setDescription = jest.fn((desc: string) => {
        this.description = desc;
        return this;
    });

    setThumbnail = jest.fn((thumb: any) => {
        this.thumbnail = thumb;
        return this;
    });

    setImage = jest.fn((img: any) => {
        this.image = img;
        return this;
    });

    setFooter = jest.fn((footer: any) => {
        this.footer = footer;
        return this;
    });

    setTimestamp = jest.fn((timestamp?: Date) => {
        this.timestamp = timestamp || new Date();
        return this;
    });

    toJSON = jest.fn(() => ({
        description: this.description,
        thumbnail: this.thumbnail,
        image: this.image,
        footer: this.footer,
        timestamp: this.timestamp,
        mockEmbed: true,
    }));
}

class MockAttachmentBuilder {
    file: any;
    options: any;

    constructor(file: any, options?: any) {
        this.file = file;
        this.options = options;
    }

    toJSON = jest.fn(() => ({
        file: this.file,
        options: this.options,
        mockAttachment: true,
    }));
}

jest.unstable_mockModule('discord.js', () => ({
    EmbedBuilder: jest.fn(() => new MockEmbedBuilder()),
    AttachmentBuilder: jest.fn((file: any, options?: any) => new MockAttachmentBuilder(file, options))
}));

// Mock select-random-file
const mockSelectRandomFile = jest.fn();
jest.unstable_mockModule('../../src/helpers/randomFile.js', () => ({
    default: mockSelectRandomFile
}));

// Dynamically import after mocks are set up
const { default: EMBED_BUILDER } = await import('../../src/helpers/embedBuilder.js');
const { EmbedBuilder, AttachmentBuilder } = await import('discord.js');

describe('EMBED_BUILDER class', () => {
    let EMBED_BUILDER: any;
    let EmbedBuilder: any;
    let AttachmentBuilder: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        
        const discordModule = await import('discord.js');
        EmbedBuilder = discordModule.EmbedBuilder;
        AttachmentBuilder = discordModule.AttachmentBuilder;
        
        const embedBuilderModule = await import('../../src/helpers/embedBuilder.js');
        EMBED_BUILDER = embedBuilderModule.default;
    });

    test('constructor should initialize embed and attachment', () => {
        const mockAttachment = { name: 'mockAttachment.png' } as unknown as Discord.AttachmentBuilder;
        const builder = new EMBED_BUILDER(mockAttachment);

        expect(builder.attachment).toBe(mockAttachment);
        expect(EmbedBuilder).toHaveBeenCalledTimes(1);
        expect(builder.embed).toBeInstanceOf(MockEmbedBuilder);
    });

    describe('constructEmbedWithAttachment', () => {
        test('should set description and thumbnail', () => {
            const mockAttachment = { name: 'mockAttachment.png' } as unknown as Discord.AttachmentBuilder;
            const builder = new EMBED_BUILDER(mockAttachment);
            const description = 'Test Description';
            const filename = 'test.png';

            builder.constructEmbedWithAttachment(description, filename);

            expect(builder.embed.setDescription).toHaveBeenCalledWith(description);
            expect(builder.embed.setThumbnail).toHaveBeenCalledWith(`attachment://${filename}`);
        });

        test('should throw error if no attachment is provided', () => {
            const builder = new EMBED_BUILDER();
            const description = 'Test Description';
            const filename = 'test.png';

            expect(() => builder.constructEmbedWithAttachment(description, filename)).toThrow(
                'No attachment provided for embed.'
            );
        });
    });

    describe('constructEmbedWithImage', () => {
        test('should create attachment and set image', () => {
            const builder = new EMBED_BUILDER();
            const fileName = 'test-image.png';
            const filePath = './dist/files/';
            const result = builder.constructEmbedWithImage(fileName);

            expect(AttachmentBuilder).toHaveBeenCalledWith(`${filePath}${fileName}`);
            expect(builder.embed.setImage).toHaveBeenCalledWith(`attachment://${fileName}`);
            expect(builder.attachment).toBeInstanceOf(MockAttachmentBuilder);
            expect(result).toBe(builder);
        });
    });

    describe('constructEmbedWithRandomFile', () => {
        test('should set description and thumbnail from a random file', async () => {
            mockSelectRandomFile.mockImplementationOnce((dir: any, callback: any) => 
                callback(null, 'random.png')
            );

            const builder = new EMBED_BUILDER();
            const description = 'Random Description';
            const result = await builder.constructEmbedWithRandomFile(description);

            expect(builder.embed.setDescription).toHaveBeenCalledWith(description);
            expect(mockSelectRandomFile).toHaveBeenCalledTimes(1);
            expect(AttachmentBuilder).toHaveBeenCalledWith('./dist/responses/random.png');
            expect(builder.embed.setThumbnail).toHaveBeenCalledWith('attachment://random.png');
            expect(result).toEqual({
                embeds: [expect.any(MockEmbedBuilder)],
                files: [expect.any(MockAttachmentBuilder)],
            });
        });

        test('should handle errors from selectRandomFile', async () => {
            const mockError = new Error('File selection error');
            mockSelectRandomFile.mockImplementationOnce((dir: any, callback: any) => 
                callback(mockError)
            );

            const builder = new EMBED_BUILDER();
            const description = 'Random Description';

            await expect(builder.constructEmbedWithRandomFile(description)).rejects.toThrow(
                'File selection error'
            );
        });
    });

    describe('addDefaultFooter', () => {
        test('should set default footer with client version and avatar', () => {
            const builder = new EMBED_BUILDER();
            const mockClient = {
                version: '1.2.3',
                user: {
                    displayAvatarURL: jest.fn<any>(() => 'http://example.com/avatar.png')
                }
            } as unknown as Discord.Client;

            const result = builder.addDefaultFooter(mockClient);

            expect(builder.embed.setFooter).toHaveBeenCalledWith({
                text: 'BongBot • 1.2.3',
                iconURL: 'http://example.com/avatar.png'
            });
            expect(builder.embed.setTimestamp).toHaveBeenCalledTimes(1);
            expect(result).toBe(builder);
        });

        test('should handle client without version (dev build)', () => {
            const builder = new EMBED_BUILDER();
            const mockClient = {
                version: null,
                user: {
                    displayAvatarURL: jest.fn<any>(() => 'http://example.com/avatar.png')
                }
            } as unknown as Discord.Client;

            builder.addDefaultFooter(mockClient);

            expect(builder.embed.setFooter).toHaveBeenCalledWith({
                text: 'BongBot • dev build',
                iconURL: 'http://example.com/avatar.png'
            });
            expect(builder.embed.setTimestamp).toHaveBeenCalledTimes(1);
        });

        test('should handle client without user avatar', () => {
            const builder = new EMBED_BUILDER();
            const mockClient = {
                version: '1.0.0',
                user: {
                    displayAvatarURL: jest.fn<any>(() => null)
                }
            } as unknown as Discord.Client;

            builder.addDefaultFooter(mockClient);

            expect(builder.embed.setFooter).toHaveBeenCalledWith({
                text: 'BongBot • 1.0.0',
                iconURL: null
            });
        });
    });

    test('addFooter should correctly set the footer', () => {
        const builder = new EMBED_BUILDER();
        const text = 'Footer Text';
        const iconURL = 'http://example.com/icon.png';

        builder.addFooter(text, iconURL);

        expect(builder.embed.setFooter).toHaveBeenCalledWith({ text: text, iconURL: iconURL });
    });

    test('build should correctly return the embed and files', () => {
        const mockAttach = { name: 'mockAttach.png' } as unknown as Discord.AttachmentBuilder;
        const builder = new EMBED_BUILDER(mockAttach);

        const result = builder.build();

        expect(result).toEqual({
            embeds: [expect.any(MockEmbedBuilder)],
            files: [mockAttach],
        });
    });

    test('build should return embed without files if no attachment', () => {
        const builder = new EMBED_BUILDER();

        const result = builder.build();

        expect(result).toEqual({
            embeds: [expect.any(MockEmbedBuilder)],
            files: [],
        });
    });
});