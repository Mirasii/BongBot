
const { http, HttpResponse } = require('msw');
const mockBody = { name: 'test', value: 123 };

const handlers = [
    http.post('https://api.openai.com/v1/chat/completions', () => {
        return HttpResponse.json({
            choices: [
                {
                    message: {
                        content: 'test response',
                    },
                },
            ],
        });
    }),
    http.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent', () => {
        return HttpResponse.json({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: 'test response',
                            },
                        ],
                    },
                },
            ],
        });
    }),
    http.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', () => {
        return HttpResponse.json({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                inlineData: {
                                    data: 'test_image_data',
                                },
                            },
                        ],
                    },
                },
            ],
        });
    }),
    http.get('https://api.github.com/repos/Mirasii/BongBot/releases/latest', () => {
        return HttpResponse.json({
            tag_name: 'v1.0.0'
        });
    }),
    http.get('https://api.github.com/repos/Mirasii/BongBot/branches/main', () => {
        return HttpResponse.json({
            commit: {
                sha: 'abc123',
                commit: {
                    message: 'Test commit',
                    author: {
                        name: 'Test Author',
                        date: new Date().toISOString()
                    }
                },
                author: {
                    avatar_url: 'http://example.com/avatar.jpg'
                }
            }
        });
    }),
    http.get('http://test.com/api/data', ({ request }) => {
        const url = new URL(request.url);
        expect(request.headers.get('content-type')).toBe('application/json');
        return HttpResponse.json({ message: 'GET success default' });
    }),
    http.get('http://test.com', ({ request }) => {
        return HttpResponse.json({ message: 'GET success null path' });
    }),
    http.get('http://test.com/api/error', () => {
        return new HttpResponse('Not Found', { status: 404, statusText: 'Not Found' });
    }),
    http.post('http://test.com/api/create', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual(mockBody);
        expect(request.headers.get('content-type')).toBe('application/json');
        return HttpResponse.json({ message: 'POST success' });
    }),
    http.post('http://test.com/api/error', () => {
        return new HttpResponse('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    })
];

module.exports = { handlers, mockBody };
