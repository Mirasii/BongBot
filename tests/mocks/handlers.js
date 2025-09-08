
import { http, HttpResponse } from 'msw';

export const handlers = [
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
];
