require('dotenv').config();
const config = {
    discord: {
        apikey: process.env.DISCORD_API_KEY || null
    },
    apis: {
        quotedb: {
            url: "https://quotes.elmu.dev",
            apikey: process.env.QUOTEDB_API_KEY || null,
            user_id: process.env.QUOTEDB_USER_ID || null
        },
        google: {
            url: "https://www.googleapis.com",
            apikey: process.env.GOOGLE_API_KEY || null,
            cx: process.env.GOOGLE_CX || null
        },
        openai: {
            url: "https://api.openai.com",
            active: process.env.OPENAI_ACTIVE === 'true', // Convert string 'true' to boolean
            apikey: process.env.OPENAI_API_KEY || null,
            model: process.env.OPENAI_MODEL || 'gpt-4o'
        },
        googleai: {
            active: process.env.GOOGLEAI_ACTIVE === 'true',
            apikey: process.env.GOOGLEAI_API_KEY || null,
            model: process.env.GOOGLEAI_MODEL || "gemini-2.5-flash-lite",
            image_model: process.env.GOOGLEAI_IMAGE_MODEL || "gemini-2.5-flash-image-preview"
        }
    }
};

module.exports = config;