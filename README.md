# YouTube MCP Server

Uses `yt-dlp` to download subtitles from YouTube and connects it to claude.ai via [Model Context Protocol](https://modelcontextprotocol.io/introduction). Try it by asking Claude, "Summarize the YouTube video <<URL>>". Requires `yt-dlp` to be installed locally e.g. via Homebrew.

<a href="https://glama.ai/mcp/servers/bdr6u8668a"><img width="380" height="200" src="https://glama.ai/mcp/servers/bdr6u8668a/badge" alt="@kazuph/mcp-youtube MCP server" /></a>

### How do I get this working?

Install `yt-dlp` (Homebrew and WinGet both work great here)

```bash
# macOS
brew install yt-dlp

# Windows
winget install yt-dlp
```

### Parameters

- `url`: YouTube video URL (required)
- `language`: Subtitle language code (optional, default: 'ja')
  - Uses [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) language codes
  - Common language codes:
    - `ja`: Japanese
    - `en`: English
    - `ko`: Korean
    - `zh`: Chinese
    - `fr`: French
  - Note: An error will occur if subtitles in the specified language do not exist

### Example

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "@kazuph/mcp-youtube"]
    }
  }
}
```
