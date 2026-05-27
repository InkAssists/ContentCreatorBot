# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security-sensitive reports.

Until this repository has a dedicated security contact, report vulnerabilities by creating a private advisory on GitHub if available, or contact the maintainers through the repository owner's preferred private channel.

Include:

- A concise description of the issue.
- Steps to reproduce.
- Affected versions or commit hashes.
- Potential impact.
- Any suggested mitigation.

## Sensitive data

This project can handle Telegram bot tokens, OpenAI API keys, Make.com webhook URLs, social media access through Make.com, Telegram file URLs, and private draft content. Never commit real credentials, `.env` files, SQLite databases, logs, or exported production payloads.

## Supported versions

Security fixes are applied to the current `main` branch unless release branches are introduced later.
