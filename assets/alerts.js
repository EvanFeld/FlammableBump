(function () {
  const params   = new URLSearchParams(window.location.search);
  const root     = document.querySelector("[data-alert-root]");
  if (!root) return;
  const card     = root.querySelector(".alert-card") || root;
  const typeEl   = root.querySelector("[data-alert-type]");
  const userEl   = root.querySelector("[data-alert-user]");
  const detailEl = root.querySelector("[data-alert-detail]");
  const iconEl   = root.querySelector("[data-alert-icon]");
  let hideTimer;

  const THEMES = {
    follow:  { color:"#6fdc88", glow:"rgba(111,220,136,0.5)",  icon:"+" },
    sub:     { color:"#FFAB40", glow:"rgba(255,171,64,0.5)",   icon:"★" },
    resub:   { color:"#FFAB40", glow:"rgba(255,171,64,0.5)",   icon:"★" },
    gift:    { color:"#FF8C00", glow:"rgba(255,140,0,0.5)",    icon:"♥" },
    raid:    { color:"#bf9fff", glow:"rgba(145,71,255,0.5)",   icon:"»" },
    bits:    { color:"#ffd700", glow:"rgba(255,215,0,0.5)",    icon:"◆" },
    hype:    { color:"#ff6eb4", glow:"rgba(255,110,180,0.5)",  icon:"#" },
    default: { color:"#FFFFFF", glow:"rgba(255,255,255,0.35)", icon:"!" },
  };

  // ── Alert queue — prevents rapid events from overwriting each other ──
  const queue = [];
  let busy = false;

  function enqueueAlert(payload) {
    if (queue.length >= 5) queue.shift(); // drop oldest if significantly backed up
    const alertDuration = window.FLAMMABLEBUMP_CONFIG?.alertDuration || 8500;
    queue.push(Object.assign({
      type:"New Alert", user:"Viewer", detail:"Thanks for the support", duration:alertDuration, theme:"default"
    }, payload || {}));
    if (!busy) processQueue();
  }

  function processQueue() {
    if (!queue.length) { busy = false; return; }
    busy = true;
    const a = queue.shift();
    _showAlert(a);
    // Wait for full duration + hide animation (280ms) + small gap before next
    setTimeout(processQueue, Number(a.duration || 7000) + 500);
  }

  function _showAlert(a) {
    const t = THEMES[a.theme] || THEMES.default;

    if (typeEl)   typeEl.textContent   = a.type;
    if (userEl)   userEl.textContent   = a.user;
    if (detailEl) detailEl.textContent = a.detail;
    if (iconEl)   iconEl.textContent   = t.icon;

    card.style.setProperty("--alert-color", t.color);
    card.style.setProperty("--alert-glow",  t.glow);

    root.style.opacity    = "1";
    root.style.visibility = "visible";

    // Card slides up
    card.animate([
      { opacity:0, transform:"translateY(30px) scale(0.91)" },
      { opacity:1, transform:"translateY(0)   scale(1)"     }
    ], { duration:380, easing:"cubic-bezier(0.22,1,0.36,1)" });

    // Stagger child elements in after the card
    const stagger = [
      [iconEl,   "scale(0.3) rotate(-15deg)", "scale(1) rotate(0deg)", 0,   400],
      [typeEl,   "translateY(10px)",           "translateY(0)",          150, 350],
      [userEl,   "translateY(22px)",           "translateY(0)",          260, 460],
      [detailEl, "translateY(12px)",           "translateY(0)",          420, 340],
    ];
    stagger.forEach(([el, from, to, delay, dur]) => {
      if (!el) return;
      el.animate(
        [{ opacity:0, transform:from },{ opacity:1, transform:to }],
        { duration:dur, delay, easing:"cubic-bezier(0.22,1,0.36,1)", fill:"both" }
      );
    });

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      card.animate([
        { opacity:1, transform:"translateY(0) scale(1)"     },
        { opacity:0, transform:"translateY(-22px) scale(0.95)" }
      ], { duration:280, easing:"ease-in" }).onfinish = () => {
        root.style.opacity    = "0";
        root.style.visibility = "hidden";
        card.style.removeProperty("--alert-color");
        card.style.removeProperty("--alert-glow");
      };
    }, Number(a.duration));
  }

  window.FlammableBumpAlerts = { show: enqueueAlert };

  // storage events don't fire between OBS browser sources — poll as fallback
  // Seed from current stored value so a leftover test alert doesn't re-fire on page load
  let lastAlertAt = (() => { try { return JSON.parse(localStorage.getItem("flammablebump.alert") || "{}").at || null; } catch { return null; } })();
  setInterval(() => {
    try {
      const raw = localStorage.getItem("flammablebump.alert");
      if (!raw) return;
      const a = JSON.parse(raw);
      if (a.at && a.at !== lastAlertAt) { lastAlertAt = a.at; enqueueAlert(a); }
    } catch {}
  }, 500);

  window.addEventListener("storage", e => {
    if (e.key !== "flammablebump.alert" || !e.newValue) return;
    try { enqueueAlert(JSON.parse(e.newValue)); }
    catch { enqueueAlert({ type:"New Alert", user:e.newValue }); }
  });

  if (params.get("test") === "1") {
    setTimeout(() => enqueueAlert({
      type:   params.get("type")   || "New Subscriber",
      user:   params.get("user")   || "BUMPFAM",
      detail: params.get("detail") || "Tier 1 sub secured",
      theme:  params.get("theme")  || "sub",
    }), 800);
  } else {
    root.style.opacity    = "0";
    root.style.visibility = "hidden";
  }
})();
