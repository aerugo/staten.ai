# Staten.ai

An open marketplace for Model Context Protocol (MCP) apps – focusing on Swedish open data from the public sector and civil society.

[Download the latest macOS version ⇩](https://github.com/aerugo/staten/releases/latest/download/Staten.dmg)

- [Apache 2.0 License](LICENSE)
- [What is MCP?](https://modelcontextprotocol.io)
- [Staten.ai is a fork of Fleur](https://www.fleurmcp.com/)

---

## Contents

1. [Why Staten.ai?](#why-statenai)
2. [Features](#features)
3. [Getting Started](#getting-started)
4. [Installation](#installation)
5. [Using MCP Servers](#using-mcp-servers)
6. [Contribute Your Own MCP Server](#contribute-your-own-mcp-server)
7. [Development](#development)
8. [Architecture](#architecture)
9. [Roadmap](#roadmap)
10. [License](#license)

---

## Why Staten.ai?

Sweden is at the forefront of open data – from nationwide economic statistics at Riksbanken to municipal key figures from Kolada.

Staten.ai demonstrates how AI models can easily connect to these data sources using the Model Context Protocol (MCP):

- **Citizens and journalists** can ask questions and get answers based on official statistics.
- **Public officials** can automate and streamline workflows within decision-support systems.
- **Developers** get a clear template for building MCP servers based on public APIs.

Think of Staten.ai as an open "App Store" for data plugins for Claude Desktop and other MCP clients – fully adapted for Swedish conditions.

---

## Features

- **App Marketplace**: Find, install, and manage MCP apps for Swedish data sources.
- **Focus on Swedish data sources**: Includes SwemoMCP (Riksbanken) and KoladaMCP from the start.
- **Automatic updates**: Staten keeps both apps and itself updated.
- **No terminal required**: Easy installation and usage, built with Rust and Tauri (size under 20 MB).
- **Open Source**: Apache 2.0 License, ready for community development.

---

## Installation

- [Download the latest macOS version (.dmg)](https://github.com/aerugo/staten.ai/releases/latest/download/Staten.dmg)

---

## Using MCP Servers

| Server | Data Source | Example Questions |
|--------|-------------|-------------------|
| **SwemoMCP** | Riksbanken API (GDP, CPI, interest rate, etc.) | "How have Riksbanken’s GDP forecasts changed since 2020?" |
| **KoladaMCP** | Kolada (municipal key figures and statistics) | "Compare school results between Malmö and Lund 2019–2024." |

### Want to add more servers?

You can easily contribute new MCP servers via the [app registry](https://github.com/aerugo/staten.ai-app-registry).

---

## Contribute Your Own MCP Server

Do you have an API from the public sector or civil society? Make it easily accessible by creating an MCP server:

1. Read the [MCP introduction](https://modelcontextprotocol.io/introduction).
2. Use existing examples (e.g., SwemoMCP or KoladaMCP) as a starting point.
3. Publish your server for free as open source on GitHub.
4. Add metadata about your server in `apps.json` and submit a pull request.

---

## Development

**Requirements**:

- Node.js ≥ 18 and Bun
- Rust (for Tauri)
- macOS ≥ 13 (for native builds)

```bash
git clone https://github.com/statenistes/staten.git
cd staten
bun install
bun tauri dev
```

**Run tests**:

```bash
cd src-tauri
cargo test
```

---

## Architecture

Staten.ai consists of two parts:

- **Frontend** (React and Bun): Displays apps from a central app registry via REST API.
- **Backend** (Rust/Tauri): Manages local MCP server processes and communicates with MCP clients like Claude Desktop.

---

## Roadmap

Planned features and improvements:

- [ ] Windows support
- [ ] More clients
- [ ] Built-in key-value store in Staten backend for caching API responses from MCP servers

[Follow and contribute to the development on GitHub](https://github.com/aerugo/staten.ai/issues).

---

## License

Staten.ai is licensed under the **Apache License 2.0**.

The project is a fork of [Fleur](https://www.fleurmcp.com/) but has no formal association with Fleur or its creators. All trademarks belong to their respective owners.

