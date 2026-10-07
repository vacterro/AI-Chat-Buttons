<div align="center">

# AI Chat Buttons

**A portable Tampermonkey command panel for the AI chats you already use.**

[![Version](https://img.shields.io/badge/version-0.0.16-D4B86A?style=flat-square)](AICHATBUTTONS.js)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-userscript-00485B?style=flat-square&logo=tampermonkey&logoColor=white)](https://www.tampermonkey.net/)
[![Platforms](https://img.shields.io/badge/platforms-16%2B-6B5A2B?style=flat-square)](#supported-platforms)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

[**Install userscript**](https://raw.githubusercontent.com/vacterro/AI-Chat-Buttons/master/AICHATBUTTONS.js) · [Issues](https://github.com/vacterro/AI-Chat-Buttons/issues)

</div>

## Overview

AI Chat Buttons adds a configurable floating prompt panel to multiple web-based AI products. Instead of keeping frequently used instructions in a separate notes file, you can organize them into categories and trigger them from the chat page itself.

The userscript keeps its state locally through the userscript manager.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or a compatible userscript manager.
2. Click **[Install AI Chat Buttons](https://raw.githubusercontent.com/vacterro/AI-Chat-Buttons/master/AICHATBUTTONS.js)**.
3. Confirm the installation.

The script activates only on the supported chat domains declared in its userscript header.

## Features

| Area | Capability |
|---|---|
| **Prompt library** | create, edit, remove, and reuse prompt buttons |
| **Categories** | organize buttons into separate working groups |
| **Per-platform behavior** | keep useful sets for different AI chat surfaces |
| **Panel layout** | Small, Normal, and Large panel sizes |
| **Opacity** | 100%, 75%, 50%, and 25% levels |
| **Persistence** | local state through Tampermonkey/GM storage |
| **Built-in workflows** | reusable audit-oriented prompt presets and runtime state |

## Supported platforms

ChatGPT · Claude · DeepSeek · Qwen · Grok · Gemini · Microsoft Copilot · Kimi · DuckDuckGo AI · Mistral · Hugging Face Chat · Perplexity · Poe · Pi · Phind · You.com

The exact URL coverage is defined in the `@match` entries at the top of [`AICHATBUTTONS.js`](AICHATBUTTONS.js).

## Local data

The userscript stores buttons, categories, panel settings, presets, and runtime coordination state locally in userscript storage. There is no separate account system or hosted configuration service in this repository.

## Languages

[English](README.md) · [Русский](README.ru.md) · [Eesti](README.et.md)

## License

[MIT](LICENSE)


## Project network

Part of the broader **SAIPEN / vacterro** project ecosystem.

[**Author hub**](https://github.com/vacterro) · [**SAIPEN HQ**](https://github.com/saipenhq) · [**SAIPEN Core**](https://github.com/vacterro/saipen) · [**ZAICODE**](https://github.com/vacterro/zaicode) · [**FastPrompter**](https://github.com/vacterro/FastPrompter) · [**SAIPEN Community**](https://discord.gg/SEYaYkuVgN)

For reproducible bugs and durable feature requests, use [GitHub Issues](https://github.com/vacterro/AI-Chat-Buttons/issues).

<!-- VACTERRO_SUPPORT:BEGIN -->
---
<sub>If AI Chat Buttons is useful to you, optional support: [Buy Me a Coffee](https://buymeacoffee.com/vacuum34) · [Boosty](https://boosty.to/vacuum34/donate) · [PayPal](https://paypal.me/AlexNelin) · [other ways](https://github.com/vacterro/vacterro/blob/main/SUPPORT.md)</sub>
<!-- VACTERRO_SUPPORT:END -->
