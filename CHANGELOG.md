# Changelog

All notable changes to this project will be documented in this file.

The format follows the spirit of Keep a Changelog, and this project uses semantic versioning once versioned releases begin.

## [Unreleased]

### Added

- Telegram bot flow for creating, previewing, editing, scheduling, and publishing social media drafts.
- OpenAI-based content idea generation with configurable content pillars.
- Make.com webhook payload generation and publishing.
- SQLite persistence for posts, statuses, scheduling, and simple stats.
- Telegram photo and public image URL handling for post images.
- Automated tests for Make.com payloads, scheduling argument parsing, and core database flows.
- GitHub Actions CI for build and test checks.
- Open-source documentation files for contributing, security, and changelog tracking.

### Changed

- Production start command now runs built JavaScript from `dist/index.js`.
- Docker image builds TypeScript before starting the bot.
- README rewritten as a practical setup and operations guide.

### Known limitations

- News and trend context is generated through OpenAI prompts and is not verified web research.
- Scheduling is process-local and checks due posts once per minute.
- Social network publishing is delegated to Make.com rather than handled directly by this bot.
