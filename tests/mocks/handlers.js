
const { http, HttpResponse } = require('msw');

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
    http.get('https://quotes.elmu.dev/api/v1/quotes/search/user/:userId', ({ request, params }) => {
        const url = new URL(request.url);
        const maxQuotes = url.searchParams.get('max_quotes');
        const userId = params.userId;

        if (userId !== 'mock_user_id') {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (maxQuotes === '0') {
            return HttpResponse.json({ quotes: [] }, { status: 200 });
        }

        const quotes = [];
        for (let i = 0; i < parseInt(maxQuotes || 1); i++) {
            quotes.push({
                quote: `Recent Quote ${i + 1}`,
                author: `Author ${i + 1}`,
            });
        }
        return HttpResponse.json({ quotes: quotes }, { status: 200 });
    }),
    http.get('https://quotes.elmu.dev/api/v1/quotes/random/user/:userId', ({ request, params }) => {
        const url = new URL(request.url);
        const maxQuotes = url.searchParams.get('max_quotes');
        const userId = params.userId;

        if (userId !== 'mock_user_id') {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (maxQuotes === '0') {
            return HttpResponse.json({ quotes: [] }, { status: 200 });
        }

        const quotes = [];
        for (let i = 0; i < parseInt(maxQuotes || 1); i++) {
            quotes.push({
                quote: `Random Quote ${i + 1}`,
                author: `Author ${i + 1}`,
            });
        }
        return HttpResponse.json({ quotes: quotes }, { status: 200 });
    }),
    http.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', () => {
        return HttpResponse.json({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: 'no image data',
                            },
                        ],
                    },
                },
            ],
        });
    }),
    http.post('https://quotes.elmu.dev/api/v1/quotes', async ({ request }) => {
        const data = await request.json();
        if (data.quote === 'Test Quote' && data.author === 'Test Author') {
            return HttpResponse.json({
                quote: {
                    quote: 'Test Quote',
                    author: 'Test Author',
                    user_id: 'mock_user_id',
                    date: 'mock_date',
                },
            }, { status: 200 });
        }
        return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
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
    http.get('https://api.github.com/repos/Mirasii/BongBot/commits', () => {
        return HttpResponse.json([
            {
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
        ]);
    })
];

module.exports = { handlers };
