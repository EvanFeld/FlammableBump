# FLAMMABLEBUMP Overlay Pack — Setup Guide
**Canvas: 2560×1440 | Twitch: FlammableBump | Kick: FlammableBump**

---

## 📁 Folder Structure

```
BUMP9ER/
├── assets/          ← shared scripts & styles (never add to OBS)
│   ├── theme.css
│   ├── config.js
│   ├── overlay.js
│   ├── alerts.js
│   ├── chat.js
│   └── streamerbot.js
├── scenes/          ← full-canvas OBS browser sources (2560×1440)
│   ├── starting-soon.html
│   ├── brb.html
│   ├── ending.html
│   └── gameplay-overlay.html
└── widgets/         ← smaller overlay widgets (own sizes)
    ├── chatbox.html        (500×780)
    ├── alert-box.html      (960×240)
    ├── counter-widget.html (860×100)
    └── control-panel.html  (open in browser — not OBS)
```

---

## ⚡ Streamer.bot Setup

See **STREAMERBOT-SETUP.txt** for full instructions and links.

### Quick Steps
1. Download Streamer.bot from **streamer.bot**
2. Install and open it
3. Go to **Servers/Clients → WebSocket Server**
4. Enable it — default port is **8080** (matches config.js)
5. Connect your Twitch account under **Platforms → Twitch**
6. Connect your Kick account under **Platforms → Kick**
7. Create your alert/game actions and paste their IDs into `widgets/control-panel.html`

### What Streamer.bot handles automatically
- Follow alerts → fires alert box
- New subs / resubs / gift subs → fires alert box + increments sub count
- Raids → fires alert box + updates viewer count
- Bits / Cheers → fires alert box
- Viewer count updates (PresentViewers event)
- Chat messages from both Twitch and Kick → fills chatbox

---

## 🧪 Testing Without Streamer.bot

Open `widgets/control-panel.html` in your browser (not OBS).
- Set follower/sub/viewer numbers and click **Update Overlay**
- Click **Test Follow / Test Subscriber / Test Raid / Test Bits** to preview alerts
- All values sync to OBS browser sources via localStorage

**Alert URL test** — add `?test=1` to any scene URL:
```
http://localhost:3001/widgets/alert-box.html?test=1&type=Raid+Incoming!&user=BUMPFAM&detail=200+raiders
```

---

## ✏️ Customization

### Change your name / game rotation
Edit `assets/config.js`:
```js
window.FLAMMABLEBUMP_CONFIG = {
  twitchName:    "FlammableBump",
  kickName:      "FlammableBump",
  displayName:   "FLAMMABLEBUMP",
  rotationGames: ["League of Legends", "Rocket League", "Marvel Rivals"],
  ...
```

### Change colors
Edit the `:root` variables at the top of `assets/theme.css`:
```css
--orange:        #FF8C00;   /* main brand orange */
--orange-bright: #FFAB40;   /* lighter orange / glow */
--white:         #FFFFFF;   /* white accent */
```

---

## 🔗 Useful Links

- **Streamer.bot**: https://streamer.bot
- **Streamer.bot docs**: https://docs.streamer.bot
- **Streamer.bot Discord**: https://discord.gg/Vah2XzJKF (best support)
- **OBS Forum**: https://obsproject.com/forum
- **Google Fonts (custom fonts)**: https://fonts.google.com
- **Kick Stream docs**: https://kick.com/dashboard (limited API — use Streamer.bot)

---

## 📋 OBS Scene Checklist

| Scene | Browser Source File | Size |
|-------|--------------------|-|
| Starting Soon | scenes/starting-soon.html | 2560×1440 |
| BRB | scenes/brb.html | 2560×1440 |
| Ending | scenes/ending.html | 2560×1440 |
| Gameplay | scenes/gameplay-overlay.html | 2560×1440 |
| Chat Widget | widgets/chatbox.html | 500×780 |
| Alert Box | widgets/alert-box.html | 960×240 |
| Counter Bar | widgets/counter-widget.html | 860×100 |
