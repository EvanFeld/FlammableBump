(function () {
  const config  = window.FLAMMABLEBUMP_CONFIG || {};
  const params  = new URLSearchParams(window.location.search);
  const defs    = Object.assign({ followers:114, subs:1, twitchViewers:0, kickViewers:0, youtubeViewers:0 }, config.defaults || {});
  const goalCfg = Object.assign({ current:0, target:10, label:"Sub Goal" }, config.subGoal || {});

  const state = {
    followers:      readNumber("followers",      defs.followers),
    subs:           readNumber("subs",           defs.subs),
    twitchViewers:  readNumber("twitchViewers",  defs.twitchViewers),
    kickViewers:    readNumber("kickViewers",     defs.kickViewers),
    youtubeViewers: readNumber("youtubeViewers",  defs.youtubeViewers),
    peakViewers:    readNumber("peakViewers",     0),
    subGoal:        readNumber("subGoal",         goalCfg.current),
    subGoalTarget:  readNumber("subGoalTarget",   goalCfg.target),
  };

  function readNumber(key, fallback) {
    const u = params.get(key);
    if (u !== null && u !== "") return Number(u);
    const s = localStorage.getItem(`flammablebump.${key}`);
    if (s !== null && s !== "") return Number(s);
    return fallback;
  }

  function fmt(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
    if (n >= 10000)   return `${Math.round(n/1000)}K`;
    if (n >= 1000)    return `${(n/1000).toFixed(1)}K`;
    return String(n);
  }

  function setAll(selector, value) {
    document.querySelectorAll(selector).forEach(el => {
      const old = el.textContent;
      el.textContent = value;
      if (old !== value) { el.classList.add("bump"); setTimeout(() => el.classList.remove("bump"), 400); }
    });
  }

  function renderStats() {
    const combined = (Number(state.twitchViewers)||0) + (Number(state.youtubeViewers)||0);
    if (combined > state.peakViewers) {
      state.peakViewers = combined;
      localStorage.setItem("flammablebump.peakViewers", combined);
    }
    setAll("[data-stat='followers']",      fmt(state.followers));
    setAll("[data-stat='subs']",           fmt(state.subs));
    setAll("[data-stat='viewers']",        fmt(combined));
    setAll("[data-stat='twitchViewers']",  fmt(state.twitchViewers));
    setAll("[data-stat='kickViewers']",    fmt(state.kickViewers));
    setAll("[data-stat='youtubeViewers']", fmt(state.youtubeViewers));
    setAll("[data-stat='peakViewers']",    fmt(state.peakViewers));
    setAll("[data-twitch]",       config.links?.twitch   || "twitch.tv/FlammableBump");
    setAll("[data-kick]",         config.links?.kick     || "kick.com/FlammableBump");
    setAll("[data-youtube]",      config.links?.youtube  || "youtube.com/@flammablebump");
    setAll("[data-display-name]", config.displayName     || "FLAMMABLEBUMP");
    renderGoal();
  }

  function renderGoal() {
    const pct = state.subGoalTarget > 0
      ? Math.min(100, (state.subGoal / state.subGoalTarget) * 100) : 0;
    document.querySelectorAll("[data-goal-fill]").forEach(el => el.style.width = pct.toFixed(1) + "%");
    document.querySelectorAll("[data-goal-value]").forEach(el => el.textContent = `${state.subGoal} / ${state.subGoalTarget}`);
    document.querySelectorAll("[data-goal-pct]").forEach(el => el.textContent = Math.round(pct) + "%");
    document.querySelectorAll("[data-goal-label]").forEach(el => el.textContent = goalCfg.label || "Sub Goal");
  }

  let rotationTimer = null;
  let lastGame = null;

  function rotateGames() {
    const games = config.rotationGames || [];
    const alwaysRotate = document.body?.hasAttribute("data-game-always-rotate");

    if (!alwaysRotate) {
      const pinned = localStorage.getItem("flammablebump.game");
      if (pinned) { lastGame = pinned; setAll("[data-game]", pinned); }
    }

    if (!alwaysRotate && lastGame) {
      // No rotation — just poll for game changes from control panel
      rotationTimer = setInterval(() => {
        const g = localStorage.getItem("flammablebump.game");
        if (g && g !== lastGame) { lastGame = g; setAll("[data-game]", g); }
      }, 2000);
      return;
    }

    if (!games.length) return;
    let idx = 0;
    setAll("[data-game]", games[idx]);
    rotationTimer = setInterval(() => {
      if (!alwaysRotate) {
        const override = localStorage.getItem("flammablebump.game");
        if (override) { clearInterval(rotationTimer); rotationTimer = null; lastGame = override; setAll("[data-game]", override); return; }
      }
      idx = (idx + 1) % games.length;
      setAll("[data-game]", games[idx]);
    }, 5000);
  }

  function applyGamePin(game) {
    if (!game || document.body?.hasAttribute("data-game-always-rotate")) return;
    if (rotationTimer) { clearInterval(rotationTimer); rotationTimer = null; }
    lastGame = game;
    localStorage.setItem("flammablebump.game", game);
    setAll("[data-game]", game);
  }

  // BroadcastChannel — works instantly between same-browser tabs (YouTube recording, no SB needed)
  try {
    const bc = new BroadcastChannel("flammablebump-game-sync");
    bc.addEventListener("message", e => {
      if (e.data?.game) applyGamePin(e.data.game);
    });
  } catch {}

  window.addEventListener("storage", e => {
    if (!e.key?.startsWith("flammablebump.")) return;
    const key = e.key.replace("flammablebump.", "");
    if (key === "game") { applyGamePin(e.newValue); return; }
    if (key in state) { state[key] = Number(e.newValue) || 0; renderStats(); }
  });

  window.FlammableBumpOverlay = {
    update(next) {
      Object.assign(state, next || {});
      Object.keys(state).forEach(k => localStorage.setItem(`flammablebump.${k}`, state[k]));
      renderStats();
    },
    state
  };

  // Poll localStorage for control panel changes (OBS browser sources don't share storage events)
  setInterval(() => {
    let changed = false;
    Object.keys(state).forEach(k => {
      const v = localStorage.getItem(`flammablebump.${k}`);
      if (v !== null && Number(v) !== state[k]) { state[k] = Number(v); changed = true; }
    });
    if (changed) renderStats();
  }, 2000);

  renderStats();
  rotateGames();
})();
