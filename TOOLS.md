# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Blue Collar Growth Engine — Dry Cleaner Outreach

### Outscraper API
- API Key env var: `OUTSCRAPER_API_KEY`
- Endpoint: `POST https://api.outscraper.com/google-maps-search`

### AgentMail
- API Key: `am_us_inbox_6ccccca2c1e58525dc743ffae54fd7c9fb400fbbe31da502daabd4e297bc0661`
- Inbox: `growyourmargins@agentmail.to`
- Display Name: Jimmy McDonald
- **Send endpoint**: `POST /v0/inboxes/{inbox_id}/messages/send` ✅ FIXED!
- Note: The endpoint is `/messages/send` NOT `/messages`

### Campaign Files
- `ohio-drycleaners-new.json` — 15 new Ohio dry cleaners (Apr 13)
- `dublin-drycleaner-emails.json` — existing validated list
- `daily-outreach.py` — cron pipeline at 1PM EST
