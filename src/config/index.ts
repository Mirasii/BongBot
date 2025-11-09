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
    },
    media : {
        file_root: process.env.JEST_WORKER_ID !== undefined ? './src/' : './dist/'
    }
};

/**
 * Validates that required environment variables are set.
 * Throws an error with helpful message if any required variables are missing.
 * Call this early in application startup to fail fast.
 */
export function validateRequiredConfig(): void {
    const errors: string[] = [];

    // Discord API key is always required
    if (!config.discord.apikey) {
        errors.push('DISCORD_API_KEY is required');
    }

    // If OpenAI is active, API key is required
    if (config.apis.openai.active && !config.apis.openai.apikey) {
        errors.push('OPENAI_API_KEY is required when OPENAI_ACTIVE=true');
    }

    // If Google AI is active, API key is required
    if (config.apis.googleai.active && !config.apis.googleai.apikey) {
        errors.push('GOOGLEAI_API_KEY is required when GOOGLEAI_ACTIVE=true');
    }

    if (errors.length > 0) {
        throw new Error(
            `Missing required environment variables:\n  - ${errors.join('\n  - ')}\n\n` +
            'Please set these in your .env file or environment.'
        );
    }
}

export default config;
export function getFilePath(resolved_path: string): string {
    return `${config.media.file_root}/${resolved_path}`;
}
export const apis = config.apis;