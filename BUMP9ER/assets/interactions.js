(function () {
  // ── HYPE METER ──
  // Fills on stream events, slowly decays over time
  const HYPE_GAINS = {
    follow:8, sub:15, resub:10, giftsub:12, giftbomb:30,
    raid:35, cheer:5, bits:5, hype:20, gift:12, hypetrain:25
  };
  const HYPE_DECAY_PER_TICK = 0.4; // per 500ms tick
  const HYPE_MAX = 100;

  let hype = Number(localStorage.getItem("flammablebump.hype") || 0);
  let hypeInterval;

  function setHype(val) {
    hype = Math.max(0, Math.min(HYPE_MAX, val));
    localStorage.setItem("flammablebump.hype", hype);
    document.querySelectorAll("[data-hype-fill]").forEach(el => el.style.width = hype + "%");
    document.querySelectorAll("[data-hype-value]").forEach(el => el.textContent = Math.round(hype) + "%");
    if (hype >= HYPE_MAX) onHypeFull();
  }

  function onHypeFull() {
    window.dispatchEvent(new CustomEvent("flammablebump:hypefull", {}));
    document.querySelectorAll("[data-hype-full]").forEach(el => {
      el.classList.add("hype-max");
      setTimeout(() => el.classList.remove("hype-max"), 2500);
    });
  }

  function startDecay() {
    clearInterval(hypeInterval);
    hypeInterval = setInterval(() => { if (hype > 0) setHype(hype - HYPE_DECAY_PER_TICK); }, 500);
  }

  window.addEventListener("flammablebump:alert", e => {
    const type = String(e.detail?.type || "").toLowerCase();
    const gain = HYPE_GAINS[type] || 2;
    setHype(hype + gain);
  });

  window.addEventListener("storage", e => {
    if (e.key !== "flammablebump.hype" || e.newValue === null) return;
    hype = Number(e.newValue);
    document.querySelectorAll("[data-hype-fill]").forEach(el => el.style.width = hype + "%");
    document.querySelectorAll("[data-hype-value]").forEach(el => el.textContent = Math.round(hype) + "%");
  });

  // ── CHAT COMMANDS ──
  // querySelectorAll so pages with multiple zones (e.g. intermission) all update
  const cmdEls = document.querySelectorAll("[data-cmd-response]");
  let cmdTimer;

  const COMMANDS = {
    "!hype":  { text:"HYPE HYPE HYPE!",        color:"#ff6eb4", gain:8  },
    "!gg":    { text:"GG!",                     color:"#6fdc88", gain:3  },
    "!lurk":  { text:"Going lurk mode!",        color:"#FFAB40", gain:0  },
    "!squad": { text:"BUMPFAM RISE UP!",        color:"#FF8C00", gain:5  },
    "!pog":   { text:"POGGERS!",                color:"#bf9fff", gain:4  },
    "!w":     { text:"W STREAM!",               color:"#6fdc88", gain:5  },
    "!rip":   { text:"F in chat",               color:"#e05c6a", gain:2  },
    "!lol":   { text:"lmaooo",                  color:"#ffd700", gain:2  },
    "!clip":  { text:"Clipping that!",          color:"#FFAB40", gain:3  },
    "!love":  { text:"Love you FLAMMABLEBUMP!", color:"#ff6eb4", gain:6  },
  };

  function showCmdResponse(text, color, user) {
    if (!cmdEls.length) return;
    const msg = user ? `${user}: ${text}` : text;
    cmdEls.forEach(el => {
      el.textContent = msg;
      el.style.color = color || "var(--ash)";
      el.classList.add("cmd-visible");
    });
    clearTimeout(cmdTimer);
    cmdTimer = setTimeout(() => cmdEls.forEach(el => el.classList.remove("cmd-visible")), 4500);
  }

  window.addEventListener("flammablebump:command", e => {
    const { cmd, user } = e.detail || {};
    const def = COMMANDS[cmd];
    if (!def) return;
    showCmdResponse(def.text, def.color, user);
    if (def.gain) setHype(hype + def.gain);
  });

  window.FlammableBumpInteractions = { setHype, showCmdResponse };
  setHype(hype);
  startDecay();
})();
