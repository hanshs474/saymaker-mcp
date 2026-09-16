# SayMaker MCP

Run **[SayMaker](https://saymaker.ai)**'s image and video models from any MCP client — Claude, Cursor, Cline, Codex. Ask for a picture or a clip in chat, get the file back.

One credit balance covers the whole shelf: **Veo 3.1, Kling 3.0, Seedance 2.0 and 2.5, Nano Banana 2, GPT Image 2.5, Seedream 5.0, Qwen Image 3, MiniMax H3, LTX 2.5, Wan 3.0** and more. Every run reports the exact credit cost it charged, and a run that fails for a technical reason is refunded.

## Tools

| Tool | What it does |
|---|---|
| `list_models` | Every image and video model, and the input each one takes |
| `generate_image` | Text to image, with aspect ratio and resolution |
| `edit_image` | Change one thing in a photo and keep the rest |
| `generate_video` | Text to video, or animate a still you pass in |
| `get_task` | Poll a run submitted with `wait: false` |
| `open_in_saymaker` | The URL to carry on in the browser |

## Install

```bash
npx saymaker-mcp
```

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "saymaker": {
      "command": "npx",
      "args": ["-y", "saymaker-mcp"],
      "env": { "SAYMAKER_API_KEY": "sk-..." }
    }
  }
}
```

### Cursor / Cline

Point the client at `npx -y saymaker-mcp` (stdio transport) and set `SAYMAKER_API_KEY` in its environment.

## API key

Create one at **[saymaker.ai/settings/apikeys](https://saymaker.ai/settings/apikeys)**. A key runs on your own account: same models, same credit prices, same plan, and the runs land in your library at [saymaker.ai/history](https://saymaker.ai/history).

Without a key the server still starts and runs on the signed-out free wallet, which covers one text-to-image run per browser-sized wallet and is capped per machine per day. Video and the paid image models need a key.

## Notes

- Video takes minutes, so `generate_video` returns a task id by default. Pass `wait: true` to block, or poll with `get_task`.
- For an edit, describe the change **and what must stay**: "change the jacket to dark green, keep the face, pose and background exactly as they are". That second half is what decides whether the edit holds.
- `SAYMAKER_BASE_URL` overrides the endpoint; only useful when testing against a local build of the site.

MIT licensed. Made by [SayMaker](https://saymaker.ai) — the AI video generator agent: say the result, it runs the steps.
