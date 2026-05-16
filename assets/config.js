window.FLAMMABLEBUMP_CONFIG = {
  // TODO: Fill in your Twitch channel name (the part after twitch.tv/)
  twitchName:  "FlammableBump",
  // TODO: Fill in your Kick channel name (the part after kick.com/)
  kickName:    "FlammableBump",
  displayName: "FLAMMABLEBUMP",

  rotationGames: ["League of Legends", "The Finals", "Marvel Rivals", "Arc Raiders"],

  defaults: {
    followers:      114,
    subs:           1,
    twitchViewers:  0,
    kickViewers:    0,
    youtubeViewers: 0,
  },

  subGoal: {
    current: 1,
    target:  10,
    label:   "Sub Goal",
  },

  streamerbot: {
    enabled:     true,
    // TODO: Your PC's local IP address — use 127.0.0.1 if OBS and Streamer.bot run on the same machine
    host:        "127.0.0.1",
    // TODO: Your Streamer.bot WebSocket server port — find it under Settings → Servers/Clients → WebSocket Server
    port:        8080,
    endpoint:    "/",
    reconnectMs: 3000
  },

  links: {
    // TODO: Your full Twitch URL (e.g. "twitch.tv/FlammableBump")
    twitch:   "twitch.tv/FlammableBump",
    // TODO: Your full Kick URL (e.g. "kick.com/FlammableBump")
    kick:     "kick.com/FlammableBump",
    // YouTube channel — single 'm' in flammablebump
    youtube:  "youtube.com/@flammablebump"
  },

  // Alert display duration in milliseconds — edit this to change how long alerts stay on screen
  alertDuration: 8500
};
