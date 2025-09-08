const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { setupMockCleanup } = require('../utils/testSetup.js');

const { EMBED_BUILDER } = require('../../src/helpers/embedBuilder.js');

// Mock discord.js EmbedBuilder and AttachmentBuilder
jest.mock('discord.js', () => ({
    EmbedBuilder: jest.fn().mockImplementation(function() {
        this.description = null;
        this.thumbnail = null;
        this.footer = null;
        this.image = null;
        this.setDescription = jest.fn(function(desc) { this.description = desc; return this; });
        this.setThumbnail = jest.fn(function(thumb) { this.thumbnail = thumb; return this; });
        this.setImage = jest.fn(function(img) { this.image = img; return this; });
        this.setFooter = jest.fn(function(footer) { this.footer = footer; return this; });
        this.toJSON = jest.fn(function() {
            return {
                description: this.description,
                thumbnail: this.thumbnail,
                image: this.image,
                footer: this.footer,
                mockEmbed: true,
            };
        });
    }),
    AttachmentBuilder: jest.fn().mockImplementation(function(file, options) {
        this.file = file;
        this.options = options;
        this.toJSON = jest.fn(function() {
            return {
                file: this.file,
                options: this.options,
                mockAttachment: true,
            };
        });
    }),
}));

// Mock select-random-file
jest.mock('select-random-file', () => jest.fn());

// Setup standard mock cleanup
setupMockCleanup();

describe('EMBED_BUILDER class', () => {

    test('constructor should initialize embed and attachment', () => {
        const mockAttachment = 'mockAttachment';
        const builder = new EMBED_BUILDER(mockAttachment);

        expect(builder.attachment).toBe(mockAttachment);
        expect(EmbedBuilder).toHaveBeenCalledTimes(1);
        expect(builder.embed).toBeInstanceOf(EmbedBuilder);
    });

    describe('constructEmbedWithAttachment', () => {
        test('should set description and thumbnail', () => {
            const builder = new EMBED_BUILDER('mockAttachment');
            const description = 'Test Description';
            const filename = 'test.png';

            builder.constructEmbedWithAttachment(description, filename);

            expect(builder.embed.setDescription).toHaveBeenCalledWith(description);
            expect(builder.embed.setThumbnail).toHaveBeenCalledWith(`attachment://${filename}`);
        });

        test('should throw error if no attachment is provided', () => {
            const builder = new EMBED_BUILDER(null);
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

            const result = builder.constructEmbedWithImage(fileName);

            expect(AttachmentBuilder).toHaveBeenCalledWith(`./src/files/${fileName}`);
            expect(builder.embed.setImage).toHaveBeenCalledWith(`attachment://${fileName}`);
            expect(builder.attachment).toBeInstanceOf(AttachmentBuilder);
            expect(result).toBe(builder); // Should return this for chaining
        });
    });

    describe('constructEmbedWithRandomFile', () => {
        const mockRandomFile = require('select-random-file');

        test('should set description and thumbnail from a random file', async () => {
            mockRandomFile.mockImplementationOnce((dir, callback) => callback(null, 'random.png'));

            const builder = new EMBED_BUILDER();
            const description = 'Random Description';
            const result = await builder.constructEmbedWithRandomFile(description);

            expect(builder.embed.setDescription).toHaveBeenCalledWith(description);
            expect(mockRandomFile).toHaveBeenCalledTimes(1);
            expect(AttachmentBuilder).toHaveBeenCalledWith('./src/responses/random.png');
            expect(builder.embed.setThumbnail).toHaveBeenCalledWith('attachment://random.png');
            expect(result).toEqual({
                embeds: [expect.any(EmbedBuilder)],
                files: [expect.any(AttachmentBuilder)],
            });
        });

        test('should handle errors from selectRandomFile', async () => {
            const mockError = new Error('File selection error');
            mockRandomFile.mockImplementationOnce((dir, callback) => callback(mockError));

            const builder = new EMBED_BUILDER();
            const description = 'Random Description';

            await expect(builder.constructEmbedWithRandomFile(description)).rejects.toThrow(
                'File selection error'
            );
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
        const mockAttach = { name: 'mockAttach.png' };
        const builder = new EMBED_BUILDER(mockAttach);

        const result = builder.build();

        expect(result).toEqual({
            embeds: [expect.any(EmbedBuilder)],
            files: [mockAttach],
        });
    });

    test('build should return embed without files if no attachment', () => {
        const builder = new EMBED_BUILDER(null);

        const result = builder.build();

        expect(result).toEqual({
            embeds: [expect.any(EmbedBuilder)],
            files: [],
        });
    });
});
