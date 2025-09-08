# BongBot

![Build Status](https://img.shields.io/github/actions/workflow/status/Mirasii/BongBot/deploy.yml?label=Production%20Deploy&logo=github)
![Dev Build Status](https://img.shields.io/github/actions/workflow/status/Mirasii/BongBot/deploy-develop.yml?label=Dev%20Build&logo=github)
![Coverage](https://codecov.io/gh/Mirasii/BongBot/branch/main/graph/badge.svg)
![Docker Pulls](https://img.shields.io/docker/pulls/mirasi/bongbot?logo=docker)
![License](https://img.shields.io/github/license/Mirasii/BongBot)
![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen?logo=node.js)

Welcome to BongBot! 🤖

BongBot is a Discord Bot made for fun with various different commands. BongBot leverages slash commands, and features tagging functionality to create quotes if replying and has a chatbot feature with a spicy personality!

## Features

- **Slash Commands**: Modern Discord slash command interface
- **AI Chat Integration**: Powered by Google AI (Gemini) or OpenAI GPT models
- **Media Commands**: Various fun video/audio clips and responses
- **Quote Database**: Store and retrieve quotes with a dedicated API
- **Image Search**: Google Custom Search integration
- **User Information**: Get detailed user and server information
- **Comprehensive Testing**: Full test coverage with Jest

## Quick Start with Docker

### Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your system
- A Discord Bot Token (see [Discord Developer Portal](https://discord.com/developers/applications))
- API keys for optional features (Google AI, OpenAI, Google Search, etc.)

### Running the Bot

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Mirasii/BongBot.git
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
   docker run --env-file BongBot.env mirasi/bongbot-develop:latest
   ```
   ```bash
   # Release Build
   docker run --env-file BongBot.env mirasi/bongbot:latest
   ```
## Development Setup

### Local Development

1. **Install Node.js** (version 22 or higher)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `BongBot.env` file with your configuration (see example above)

4. **Run the bot**:
   ```bash
   npm start
   ```

5. **Run tests**:
   ```bash
   npm test
   ```

## Environment Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_API_KEY` | ✅ | Your Discord bot token |
| `DISCORD_CHANNEL_ID` | ✅ | Default channel ID for bot operations |
| `GOOGLE_API_KEY` | ❌ | Google API key for search functionality |
| `GOOGLE_CX` | ❌ | Google Custom Search Engine ID |
| `OPENAI_API_KEY` | ❌ | OpenAI API key for GPT models |
| `OPENAI_ACTIVE` | ❌ | Enable/disable OpenAI integration (true/false) |
| `OPENAI_MODEL` | ❌ | OpenAI model to use (default: gpt-4o) |
| `GOOGLEAI_API_KEY` | ❌ | Google AI API key for Gemini models |
| `GOOGLEAI_ACTIVE` | ❌ | Enable/disable Google AI integration (true/false) |
| `GOOGLEAI_MODEL` | ❌ | Google AI model to use (default: gemini-2.5-flash-lite) |
| `QUOTEDB_API_KEY` | ❌ | QuoteDB API key for quote management |
| `QUOTEDB_USER_ID` | ❌ | QuoteDB user ID |

## Available Commands

- `/help` - Display available commands
- `/ping` - Check bot responsiveness
- `/chat_ai <message>` - Chat with AI (Google AI or OpenAI)
- `/userinfo [@user]` - Get user information
- `/info` - Get bot and server information
- `/quotedb_post <quote>` - Add a new quote
- `/quotedb_get <id>` - Get a specific quote
- `/quotedb_get_random` - Get a random quote
- Various media commands: `/arab`, `/cherry`, `/classic`, `/creeper`, `/dance`, etc.

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
