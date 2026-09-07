# BongBot

![Build Status](https://img.shields.io/github/actions/workflow/status/PookieSoft/BongBot/deploy.yml?label=Production%20Deploy&logo=github)
![Coverage](https://codecov.io/gh/PookieSoft/BongBot/branch/main/graph/badge.svg)
![License](https://img.shields.io/github/license/PookieSoft/BongBot?v=2)
![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen?logo=node.js)

Welcome to BongBot! 🤖

BongBot is a Discord Bot made for fun with various different commands. BongBot features slash commands for sharing quotes, finding images, and managing game servers, plus a chatbot with a spicy personality!

## Features

- **Slash Commands**: Modern Discord slash command interface
- **AI Chat Integration**: Powered by Google AI (Gemini) or OpenAI GPT models
- **Media Commands**: Various fun video/audio clips and responses
- **Quote Database**: Store and retrieve quotes with a dedicated API
- **Image Search**: BongBot-Booru integration with Safebooru or Gelbooru
- **Server Management**: Pterodactyl registration, status, and power controls
- **User Information**: Get detailed user and server information
- **Comprehensive Testing**: Full test coverage with Jest

## Quick Start with Docker

### Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your system
- A Discord Bot Token (see [Discord Developer Portal](https://discord.com/developers/applications))
- Credentials for the integrations you enable (see below).
- To build from source: export `NODE_AUTH_TOKEN` in your shell with a GitHub Packages token that can read the PookieSoft packages. The pre-built images do not need this token.

Invite the bot with the `bot` and `applications.commands` scopes and enable Message Content Intent in the Discord developer portal. Grant View Channel, Send Messages, Read Message History, Embed Links, and Attach Files in the channels it uses. Live notifications also need Mention Everyone to notify everyone. Core registers global commands and replaces the application’s command list; run this composite bot under its own application rather than sharing a token with standalone BongBot services.

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
    # The example leaves AI and live notifications disabled.
    # Configure the integrations you need using the tables below.
    ```

3. **Run with Docker**:

    ```bash
    # Build and run the container
    docker build --secret id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN -t bongbot .
    docker run --rm --env-file .env --volume ./data:/app/data --volume ./logs:/app/logs bongbot
    ```

    Or use the pre-built image:

    ```bash
    # Dev Build
    docker run --rm --env-file .env --volume ./data:/app/data --volume ./logs:/app/logs mirasi/bongbot-develop:latest
    ```

    ```bash
    # Release Build
    docker run --rm --env-file .env --volume ./data:/app/data --volume ./logs:/app/logs mirasi/bongbot:latest
    ```

    Keep `data/` and `logs/` mounted across container replacements. Ptero stores registered servers and encrypted API keys in `data/`; Core writes logs under `logs/`. Retain the same `ENCRYPTION_KEY` with the Ptero database so existing API keys remain readable. `NODE_AUTH_TOKEN` is a build/install secret, not a bot runtime setting.

## Environment Configuration

These settings and commands were checked against the installed releases recorded in `package-lock.json`: BongBot-Core 1.7.0, BongBot-Ptero 1.4.7, BongBot-Quote 2.1.24, and BongBot-Booru 1.0.0. Defaults below describe unset variables; `.env.example` explicitly selects Safebooru and the Europe/London timezone.

### Bot and logging

| Variable             | Requirement | Default / purpose                                                                                   |
| -------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `DISCORD_API_KEY`    | Required    | Discord bot token.                                                                                  |
| `DISCORD_CHANNEL_ID` | Optional    | Deployment card channel. If omitted, Core logs an error and skips the card.                         |
| `DEFAULT_LOGGER`     | Optional    | `default` uses SQLite; `file` selects file logging.                                                 |
| `BRANCH`             | Optional    | `main`; branch used when fetching deployment metadata.                                              |
| `ENV`                | Optional    | `prod` displays the release tag on the info card; other values display `dev build`.                 |
| `TZ`                 | Optional    | Process/container timezone; the example uses `Europe/London`. Affects live notification scheduling. |

Core generates `SESSION_ID` at startup. `JEST_WORKER_ID` is supplied by the test runner. Neither belongs in `.env`. BongBot gets its bot user ID from the connected client, so `DISCORD_BOT_USER_ID` from the standalone Quote README is not needed here.

### AI chat

| Variable               | Requirement           | Default / purpose                             |
| ---------------------- | --------------------- | --------------------------------------------- |
| `OPENAI_ACTIVE`        | Optional              | `false`; set exactly `true` to enable OpenAI. |
| `OPENAI_API_KEY`       | When OpenAI is active | OpenAI API key.                               |
| `OPENAI_MODEL`         | Optional              | `gpt-4o`.                                     |
| `GOOGLEAI_ACTIVE`      | Optional              | `false`; set exactly `true` to enable Gemini. |
| `GOOGLEAI_API_KEY`     | When Gemini is active | Google AI API key.                            |
| `GOOGLEAI_MODEL`       | Optional              | `gemini-2.5-flash-lite`.                      |
| `GOOGLEAI_IMAGE_MODEL` | Optional              | `gemini-2.5-flash-image-preview`.             |

OpenAI takes precedence if both providers are enabled. With neither enabled, `/chat` returns a fallback media response. Model names above are code defaults; change them for your provider/account as needed.

### QuoteDB

| Variable          | Requirement        | Default / purpose                                                            |
| ----------------- | ------------------ | ---------------------------------------------------------------------------- |
| `QUOTEDB_URL`     | Optional           | `https://quotes.elmu.dev/api/v1/quotes`; base URL for your QuoteDB instance. |
| `QUOTEDB_API_KEY` | For quote commands | QuoteDB API key.                                                             |
| `QUOTEDB_USER_ID` | For quote commands | User ID in the QuoteDB instance.                                             |

### Pterodactyl

| Variable                    | Requirement                        | Default / purpose                                                                                                  |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `SERVER_DATABASE`           | Optional                           | `pterodactyl.db`; filename under the working directory's `data/` folder.                                           |
| `ENCRYPTION_KEY`            | For storing/reading Ptero API keys | 32 random bytes encoded as 64 hexadecimal characters, used for AES-256-GCM.                                        |
| `PTERODACTYL_ALLOWED_HOSTS` | Optional                           | Comma-separated exact panel hostnames, without schemes or paths. Empty leaves the hostname allowlist unrestricted. |

Generate an encryption key once with `openssl rand -hex 32` and place it in `.env`. Supply each panel's HTTPS URL and API key through `/pterodactyl register`; there is no global Pterodactyl API key setting. Panel URLs must resolve to public IP addresses even when their hostnames are allowlisted. Server registrations are scoped to the Discord user who creates them.

### Live notifications

| Variable                  | Requirement                    | Default / purpose                                                                          |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| `TIKTOK_USERNAME`         | To enable notifications        | Empty disables monitoring.                                                                 |
| `TIKTOK_LIVE_CHANNEL_IDS` | For delivery                   | Comma-separated channel IDs, without surrounding spaces.                                   |
| `LIVE_DISPLAY_NAME`       | When monitoring is enabled     | Name displayed in notifications.                                                           |
| `LIVE_START_TIME`         | Optional                       | `15`; first polling hour, from 0 to 23.                                                    |
| `LIVE_END_TIME`           | Optional                       | `18`; last polling hour, from 0 to 23.                                                     |
| `TWITCH_STREAM`           | Optional                       | Leave empty to omit the Twitch link; any nonempty string enables it, including `false`.    |
| `TWITCH_USERNAME`         | When Twitch link is enabled    | Twitch username.                                                                           |
| `INSTA_STREAM`            | Optional                       | Leave empty to omit the Instagram link; any nonempty string enables it, including `false`. |
| `INSTA_USERNAME`          | When Instagram link is enabled | Instagram username.                                                                        |

The notifier polls TikTok every minute during the configured hour range and sends at most one live notification per local calendar day. Twitch and Instagram settings add links; they do not monitor those services independently.

## Image search migration

BongBot now uses `@pookiesoft/bongbot-booru`. The Google Custom Search implementation and its `GOOGLE_API_KEY` / `GOOGLE_CX` settings have been removed.

Both former Google commands remain available: `/fox` finds Shirakami Fubuki and `/clown` finds Omaru Polka. No removed command is missing from Booru. `/fubuki` and `/polka` were source filenames, not registered command names.

`/booru search` accepts `tag_1` through `tag_5` with tag autocomplete; the first tag is required. Replies attach an image and link to its board post. Grant the bot Attach Files and Embed Links permissions.

| Variable           | Default     | Purpose                                                                            |
| ------------------ | ----------- | ---------------------------------------------------------------------------------- |
| `IMAGE_PROVIDER`   | `safebooru` | Select `safebooru` or `gelbooru`. If unset, `GELBOORU_SFW=false` selects Gelbooru. |
| `GELBOORU_SFW`     | `true`      | Restrict Gelbooru to general-rated posts; `false` permits all ratings.             |
| `GELBOORU_API_KEY` | unset       | Required when using Gelbooru.                                                      |
| `GELBOORU_USER_ID` | unset       | Positive integer user ID required when using Gelbooru.                             |
| `ALLOW_AI_IMAGES`  | `false`     | Exclude the `ai-generated` tag unless enabled.                                     |

Safebooru requires no credentials. Rating filtering depends on the board's tags. Invalid provider settings fail during command initialization. Google AI chat configuration remains separate.

## Available Commands

| Command                                                                   | Purpose                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/help [command]`                                                         | List registered commands or show help for one command.        |
| `/ping`                                                                   | Check bot responsiveness.                                     |
| `/chat input:<message>`                                                   | Chat with AI; mentioning the bot with text also invokes chat. |
| `/usercard [target]`                                                      | Show user information.                                        |
| `/info`                                                                   | Show bot/server information.                                  |
| `/fox`, `/clown`                                                          | Find random Shirakami Fubuki or Omaru Polka images.           |
| `/booru search tag_1:<tag> [tag_2 … tag_5]`                               | Search the selected image board with tag autocomplete.        |
| `/quote create quote:<text> author:<name>`                                | Create a quote.                                               |
| `/quote recent [amount]`                                                  | Get recent quotes; amount is 1–10, default 1.                 |
| `/quote random [amount]`                                                  | Get random quotes; amount is 1–10, default 1.                 |
| `/pterodactyl register server_name:<name> server_url:<url> api_key:<key>` | Register a panel.                                             |
| `/pterodactyl list`                                                       | List your registered panels.                                  |
| `/pterodactyl manage [server_name]`                                       | Show server status and start/stop/restart controls.           |
| `/pterodactyl update server_name:<name> [server_url] [api_key]`           | Update a registration.                                        |
| `/pterodactyl remove server_name:<name>`                                  | Remove a registration.                                        |

Media commands: `/arab`, `/callirap`, `/cherry`, `/classic`, `/club_kid`, `/creeper`, `/cringe`, `/dance`, `/die`, `/funk`, `/hentai`, `/hoe`, `/mirasi`, `/no`, `/roll`, `/sea`, `/vape`, `/yes`, `/you`.

The old `/create_quote`, `/get_quotes`, and `/get_random_quotes` commands are now `/quote` subcommands. `/userinfo` and `/seachicken` are source filenames; their registered commands are `/usercard` and `/sea`.

The quote-by-reply shortcut is currently broken: a mention without additional text still looks up the unregistered `create_quote` command in `src/index.ts`. Use `/quote create` instead. Mentioning the bot with additional text invokes chat, even when replying to another message.

## Local development

Use Node.js 24 or later and export `NODE_AUTH_TOKEN` with access to the PookieSoft GitHub Packages registry configured in `.npmrc`:

```bash
npm ci
npm run build
npm test
```

The Docker build also copies static media into the runtime image; `npm run build` alone bundles code and SQLite dependencies. Use the Docker commands above to run the complete bot with media. The current `npm run dev` script does not forward the package token as a build secret, so use the explicit Docker build command above for authenticated builds.

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
npm test -- tests/commands/ping.test.ts
```

## License

This project is open source and available under the [MIT License](LICENSE).
