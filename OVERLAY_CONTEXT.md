# FLAMMABLEBUMP Overlay — Project Context
> Drop this file in your BUMP9ER/ root folder.
> When using Claude Code (terminal), this gives Claude full context about the project.

---

## Streamer Info
- **Twitch:** FlammableBump → twitch.tv/FlammableBump
- **Kick:** FlammableBump → kick.com/FlammableBump
- **Display name:** FLAMMABLEBUMP
- **OBS canvas:** 2560×1440
- **Webcam resolution:** 1080×720

---

## Folder Structure

```
BUMP9ER/
├── OVERLAY_CONTEXT.md       ← you are here
├── README.md                ← OBS setup guide + Streamer.bot instructions
├── STREAMERBOT-SETUP.txt    ← full Streamer.bot setup instructions
├── assets/                  ← shared scripts & styles (never add directly to OBS)
│   ├── theme.css            ← all CSS variables (orange/white palette), animations
│   ├── config.js            ← user settings: names, games, defaults, SB config
│   ├── overlay.js           ← stat rendering, combined viewer count, localStorage sync
│   ├── alerts.js            ← alert show/hide logic and animations
│   ├── chat.js              ← Twitch IRC WebSocket, message rendering with avatars
│   └── streamerbot.js       ← Streamer.bot WebSocket client, event routing
├── scenes/                  ← full 2560×1440 OBS browser sources
│   ├── starting-soon.html
│   ├── brb.html
│   ├── ending.html
│   └── gameplay-overlay.html
└── widgets/                 ← smaller overlay widgets with their own fixed sizes
    ├── chatbox.html         (500×780)
    ├── alert-box.html       (960×240)
    ├── counter-widget.html  (860×100)
    └── control-panel.html   (open in browser only — not OBS)
```

---

## Tech Stack
- Pure HTML / CSS / JS — no build tools, no npm, no frameworks
- Google Fonts loaded via CDN: Oswald (headings), Rajdhani (body)
- OBS Browser Source renders each file as a standalone page
- Streamer.bot connects via WebSocket on ws://127.0.0.1:8080

---

## Design System (theme.css)

### CSS Custom Properties
```css
/* Colors */
--orange:        #FF8C00   /* primary brand orange */
--orange-bright: #FFAB40   /* hover / highlight / glow */
--orange-dim:    #7A3D00   /* avatar backgrounds */
--ember:         #FF5500   /* hot red-orange accent */
--ash:           #E8E0D4   /* secondary text, muted white */
--white:         #FFFFFF   /* primary text, white accent */
--ink:           #070503   /* deepest background */
--steel:         #0C0803   /* background mid */

/* Glass panels */
--glass:         rgba(10,6,2,0.65)
--glass-heavy:   rgba(6,3,0,0.88)
--glass-light:   rgba(16,10,4,0.38)

/* Borders */
--border:      rgba(255,140,0,0.30)   /* orange border */
--border-warm: rgba(255,140,0,0.50)   /* stronger orange border */

/* Fonts */
--font-head: 'Oswald', 'Rajdhani', sans-serif
--font-body: 'Rajdhani', 'Bahnschrift', sans-serif

/* Clip-path corners (angled cut aesthetic) */
--clip-sm:  polygon(0 0, calc(100% - 10px) 0, 100% 10px, ...)
--clip-md:  polygon(0 0, calc(100% - 16px) 0, 100% 16px, ...)
--clip-lg:  polygon(0 0, calc(100% - 24px) 0, 100% 24px, ...)
--clip-xl:  polygon(0 0, calc(100% - 36px) 0, 100% 36px, ...)
```

---

## Data Flow

### localStorage Keys (sync between pages via storage events)
```
flammablebump.followers      — follower count
flammablebump.subs           — subscriber count
flammablebump.twitchViewers  — Twitch viewer count (separate)
flammablebump.kickViewers    — Kick viewer count (separate)
flammablebump.alert          — JSON payload to trigger alert popup
flammablebump.game           — currently pinned game name
flammablebump.streamTitle    — current stream title
flammablebump.hype           — hype meter value (0–100)
```

### Streamer.bot Event Flow
```
Streamer.bot (port 8080)
  └─ streamerbot.js connects via WebSocket
       ├─ Chat events     → chat.js → FlammableBumpChat.add()
       ├─ Alert events    → alerts.js → FlammableBumpAlerts.show()
       └─ Stat events     → overlay.js → FlammableBumpOverlay.update()
```

### Custom Events (window.dispatchEvent)
```
flammablebump:connected   — SB WebSocket opened
flammablebump:alert       — alert event received
flammablebump:command     — chat !command parsed
flammablebump:viewers     — PresentViewers list received
flammablebump:goal        — goal update received
flammablebump:hypefull    — hype meter hit 100%
```

### HTML Data Attributes (bind to any element)
```
data-stat="followers"      — renders formatted follower count
data-stat="subs"           — renders formatted sub count
data-stat="viewers"        — renders combined Twitch+Kick viewers
data-stat="twitchViewers"  — renders Twitch-only viewers
data-stat="kickViewers"    — renders Kick-only viewers
data-twitch                — renders twitch.tv/FlammableBump
data-kick                  — renders kick.com/FlammableBump
data-display-name          — renders FLAMMABLEBUMP
data-game                  — renders current game (rotates from config)
data-alert-root            — marks the alert container element
data-alert-type            — alert type label (e.g. "New Subscriber")
data-alert-user            — username in alert
data-alert-detail          — detail line in alert
data-chat-feed             — chat message container
data-chat-status           — connection status text
```

---

## config.js — Quick Reference
```js
window.FLAMMABLEBUMP_CONFIG = {
  twitchName:    "FlammableBump",
  kickName:      "FlammableBump",
  displayName:   "FLAMMABLEBUMP",
  rotationGames: ["League of Legends", "The Finals", "Marvel Rivals", "Arc Raiders"],
  defaults: {
    followers:     114,
    subs:          1,
    twitchViewers: 0,
    kickViewers:   0,
  },
  streamerbot: {
    enabled:     true,
    host:        "127.0.0.1",  // TODO: Your PC's local IP
    port:        8080,          // TODO: Your SB WebSocket port
    endpoint:    "/",
    reconnectMs: 3000
  },
  links: {
    twitch: "twitch.tv/FlammableBump",
    kick:   "kick.com/FlammableBump"
  }
};
```

---

## Global JS Objects (available in browser console / other scripts)
```js
FlammableBumpOverlay.update({ followers: 500, subs: 20, twitchViewers: 80, kickViewers: 40 })
FlammableBumpOverlay.state   // current values object

FlammableBumpAlerts.show({ type: "Raid!", user: "BUMPFAM", detail: "200 raiders", duration: 8000 })

FlammableBumpChat.add("username", "message text", "#hexcolor", "twitch")

FlammableBumpStreamerBot.showAlert({ ... })
FlammableBumpStreamerBot.updateStats({ followers: 500 })
```

---

## OBS Widget Sizes (set exactly in Browser Source)
| File | Width | Height |
|---|---|---|
| scenes/starting-soon.html | 2560 | 1440 |
| scenes/brb.html | 2560 | 1440 |
| scenes/ending.html | 2560 | 1440 |
| scenes/gameplay-overlay.html | 2560 | 1440 |
| widgets/chatbox.html | 500 | 780 |
| widgets/alert-box.html | 960 | 240 |
| widgets/counter-widget.html | 860 | 100 |
| widgets/hype-meter.html | 860 | 80 |

---

## Common Tasks for Claude Code

**"Move the cam frame"** → edit `.cam-frame` position in `scenes/gameplay-overlay.html`

**"Change accent color"** → edit `--orange` and `--orange-bright` in `assets/theme.css`

**"Add a new alert type"** → add a case to the `map` object in `normAlert()` in `assets/streamerbot.js`

**"Add a new scene"** → create HTML in `scenes/`, link `config.js` + `overlay.js` at bottom, optionally `alerts.js` and `streamerbot.js`

**"Add a new stat"** → add key to `config.js` defaults, add to `state` object in `overlay.js`, add `[data-stat="newkey"]` element in HTML

**"Add a new widget"** → create HTML in `widgets/` with fixed body width/height, link needed asset scripts
