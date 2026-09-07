# BongBot

![Build Status](https://img.shields.io/github/actions/workflow/status/PookieSoft/BongBot/deploy.yml?label=Production%20Deploy&logo=github)
![Coverage](https://codecov.io/gh/PookieSoft/BongBot/branch/main/graph/badge.svg)
![License](https://img.shields.io/github/license/PookieSoft/BongBot?v=2)
![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen?logo=node.js)

Welcome to BongBot! 🤖

BongBot is a Discord Bot made for fun with various different commands. BongBot leverages slash commands, and features tagging functionality to create quotes if replying and has a chatbot feature with a spicy personality!

## Features

- **Slash Commands**: Modern Discord slash command interface
- **AI Chat Integration**: Powered by Google AI (Gemini) or OpenAI GPT models
- **Media Commands**: Various fun video/audio clips and responses
- **Quote Database**: Store and retrieve quotes with a dedicated API
- **Image Search**: BongBot-Booru integration with Safebooru or Gelbooru
- **User Information**: Get detailed user and server information
- **Comprehensive Testing**: Full test coverage with Jest

## Quick Start with Docker

### Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your system
- A Discord Bot Token (see [Discord Developer Portal](https://discord.com/developers/applications))
- API keys for optional features (Google AI, OpenAI, Gelbooru, etc.)

### Running the Bot

1. **Clone the repository**:

    ```bash
    git clone https://github.com/PookieSoft/BongBot.git
    cd BongBot
    ```

2. **Configure environment variables**:
   Copy the example environment file and update it with your credentials:

    ```bash
    cp .env.example .env
    ```

    Edit `.env` and add your Discord bot token and other API keys:

    ```env
    DISCORD_API_KEY=your_discord_bot_token_here
    DISCORD_CHANNEL_ID=your_channel_id_here
    # Add other API keys as needed
    ```

3. **Run with Docker**:

    ```bash
    # Build and run the container
    docker build . -t bongbot
    docker run --env-file .env bongbot
    ```

    Or use the pre-built image:

    ```bash
    # Dev Build
    docker run --env-file .env mirasi/bongbot-develop:latest
    ```

    ```bash
    # Release Build
    docker run --env-file .env mirasi/bongbot:latest
    ```

    **It is recommended you use docker for local development.**

## Environment Configuration

| Variable                  | Required | Description                                                            |
| ------------------------- | -------- | ---------------------------------------------------------------------- |
| `DISCORD_API_KEY`         | ✅       | Your Discord bot token                                                 |
| `DISCORD_CHANNEL_ID`      | ✅       | Default channel ID for info card on bot launch                         |
| `OPENAI_API_KEY`          | ❌       | OpenAI API key for GPT models                                          |
| `OPENAI_ACTIVE`           | ❌       | Enable/disable OpenAI integration (true/false)                         |
| `OPENAI_MODEL`            | ❌       | OpenAI model to use (default: gpt-4o)                                  |
| `GOOGLEAI_API_KEY`        | ❌       | Google AI API key for Gemini models                                    |
| `GOOGLEAI_ACTIVE`         | ❌       | Enable/disable Google AI integration (true/false)                      |
| `GOOGLEAI_MODEL`          | ❌       | Google AI model to use (default: gemini-2.5-flash-lite)                |
| `GOOGLEAI_IMAGE_MODEL`    | ❌       | Google AI image model (default: gemini-2.5-flash-image-preview)        |
| `QUOTEDB_API_KEY`         | ❌       | QuoteDB API key for quote management                                   |
| `QUOTEDB_USER_ID`         | ❌       | QuoteDB user ID                                                        |
| `TZ`                      | ❌       | Timezone for the Docker container (default: UTC, e.g. `Europe/London`) |
| `TIKTOK_USERNAME`         | ❌       | TikTok username to monitor for live status                             |
| `TIKTOK_LIVE_CHANNEL_IDS` | ❌       | Comma-separated Discord channel IDs for live notifications             |
| `LIVE_DISPLAY_NAME`       | ❌       | Display name shown in the live notification embed                      |
| `LIVE_START_TIME`         | ❌       | Hour to start checking for live status (0-23, default: 15)             |
| `LIVE_END_TIME`           | ❌       | Hour to stop checking for live status (0-23, default: 18)              |
| `TWITCH_STREAM`           | ❌       | Include Twitch link in notification (true/false)                       |
| `TWITCH_USERNAME`         | ❌       | Twitch username for the stream link                                    |
| `INSTA_STREAM`            | ❌       | Include Instagram Live link in notification (true/false)               |
| `INSTA_USERNAME`          | ❌       | Instagram username for the live link                                   |

## Image search migration

BongBot now uses `@pookiesoft/bongbot-booru`. The Google Custom Search implementation and its `GOOGLE_API_KEY` / `GOOGLE_CX` settings have been removed.

Both former Google commands remain available: `/fox` finds Shirakami Fubuki and `/clown` finds Omaru Polka. No removed command is missing from Booru. `/fubuki` and `/polka` were source filenames, not registered command names.

`/booru search` accepts `tag_1` through `tag_5` with tag autocomplete; the first tag is required. Replies attach an image and link to its board post. Grant the bot Attach Files and Embed Links permissions.

| Variable | Default | Purpose |
| --- | --- | --- |
| `IMAGE_PROVIDER` | `safebooru` | Select `safebooru` or `gelbooru`. If unset, `GELBOORU_SFW=false` selects Gelbooru. |
| `GELBOORU_SFW` | `true` | Restrict Gelbooru to general-rated posts; `false` permits all ratings. |
| `GELBOORU_API_KEY` | unset | Required when using Gelbooru. |
| `GELBOORU_USER_ID` | unset | Positive integer user ID required when using Gelbooru. |
| `ALLOW_AI_IMAGES` | `false` | Exclude the `ai-generated` tag unless enabled. |

Safebooru requires no credentials. Rating filtering depends on the board's tags. Invalid provider settings fail during command initialization. Google AI chat configuration remains separate.

## Available Commands

- `/fox`, `/clown` - Random character images from Booru
- `/booru search` - Search by up to five tags
- `/help` - Display available commands
- `/ping` - Check bot responsiveness
- `/chat <message>` - Chat with AI (Google AI or OpenAI)\*
- `/userinfo [@user]` - Get user information
- `/info` - Get bot and server information
- `/create_quote <quote> <author>` - Add a new quote\*\*
- `/get_quotes <amount>` - Get the most recent quotes
- `/get_random_quotes <amount>` - Get random quotes
- Media commands: `/arab`, `/callirap`, `/cherry`, `/classic`, `/club_kid`, `/creeper`, `/cringe`, `/dance`, `/die`, `/funk`, `/hentai`, `/hoe`, `/mirasi`, `/no`, `/roll`, `/seachicken`, `/vape`, `/yes`, `/you`

\* This command can be invoked by pinging the bot with a message instead of using the slash command.

\*\* This command can be invoked by replying to the message and pinging the bot with no message. This will pull the author from the user's display name and the quote from the replied to message. Adding a message will trigger the /chat feature instead.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## Testing

The bot includes comprehensive test coverage using Jest:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- tests/commands/ping.test.js
```

## License

This project is open source and available under the [MIT License](LICENSE).
