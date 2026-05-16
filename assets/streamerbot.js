(function () {
  const config = window.FLAMMABLEBUMP_CONFIG || {};
  const sb = Object.assign({
    // TODO: Your Streamer.bot WebSocket host — typically 127.0.0.1 if running on the same PC
    enabled: true, host: "127.0.0.1",
    // TODO: Your Streamer.bot WebSocket port — find under Settings → Servers/Clients → WebSocket Server
    port: 8080, endpoint: "/", reconnectMs: 3000
  }, config.streamerbot || {});

  if (!sb.enabled || !("WebSocket" in window)) return;

  const hasChat  = Boolean(document.querySelector("[data-chat-feed]"));
  const hasAlert = Boolean(document.querySelector("[data-alert-root]"));
  const hasHype  = Boolean(document.querySelector("[data-hype-fill]"));
  const hasStats = Boolean(
    document.querySelector("[data-stat]") ||
    document.querySelector("[data-hype-fill],[data-goal-fill]")
  );

  const url       = `ws://${sb.host}:${sb.port}${sb.endpoint || "/"}`;
  const statusEls = document.querySelectorAll("[data-chat-status],[data-sb-status]");
  let socket, reconnectTimer;
  const recentFirstWords  = new Set(); // dedup FirstWord + ChatMessage pairs
  const recentChatMessages = new Set(); // bidirectional dedup — track ChatMessages too

  function setStatus(t) { statusEls.forEach(el => el.textContent = t); }
  function send(p)      { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(p)); }
  function dispatch(name, detail) { window.dispatchEvent(new CustomEvent(`flammablebump:${name}`, { detail })); }

  // Streamer.bot subscribe request requires title-case source keys: "Twitch", "Kick", "YouTube"
  function subscribe() {
    const twitchChat  = ["ChatMessage", "FirstWord", "Announcement"];
    const twitchAlert = ["Follow","Sub","ReSub","GiftSub","GiftBomb","GiftPaidUpgrade","PayItForward","Raid","Cheer","HypeChat","HypeTrain","HypeTrainEnd"];
    const twitchStats = ["PresentViewers", "ViewerCountUpdate", "StreamUpdate"];
    const kickChat    = ["ChatMessage", "FirstWords"];
    const kickAlert   = ["Follow","Subscription","Resubscription","GiftSubscription","MassGiftSubscription","Raid"];
    const kickStats   = ["PresentViewers", "ViewerCountUpdate"];
    const ytChat      = ["ChatMessage", "NewSponsor", "MemberMilestone", "SuperChat"];
    const ytStats     = ["BroadcastStarted", "BroadcastEnded", "StatisticsUpdate"];

    const events = {};
    if (hasChat) {
      events.Twitch  = [...twitchChat];
      events.Kick    = [...kickChat];
      events.YouTube = [...ytChat];
    }
    if (hasAlert || hasHype) {
      events.Twitch   = [...new Set([...(events.Twitch  || []), ...twitchAlert])];
      events.Kick     = [...new Set([...(events.Kick    || []), ...kickAlert])];
      events.General  = ["Custom"];
    }
    if (hasStats) {
      events.Twitch  = [...new Set([...(events.Twitch  || []), ...twitchStats])];
      events.Kick    = [...new Set([...(events.Kick    || []), ...kickStats])];
      events.YouTube = [...new Set([...(events.YouTube || []), ...ytStats])];
    }
    send({ request: "Subscribe", id: "flammablebump-sub", events });
  }

  // Normalize Kick's longer event type names to Twitch equivalents for unified routing
  const KICK_REMAP = {
    subscription:        "sub",
    resubscription:      "resub",
    giftsubscription:    "giftsub",
    massgiftsubscription:"giftbomb",
    firstwords:          "firstword",
  };

  function connect() {
    clearTimeout(reconnectTimer);
    setStatus("Connecting...");
    socket = new WebSocket(url);
    socket.addEventListener("open",    () => { setStatus("⬤ Live"); subscribe(); send({ request: "GetActiveViewers", id: "flammablebump-viewers-init" }); dispatch("connected", {}); });
    socket.addEventListener("close",   () => { setStatus("reconnecting..."); reconnectTimer = setTimeout(connect, sb.reconnectMs); });
    socket.addEventListener("error",   () => setStatus("Offline"));
    socket.addEventListener("message", e => { try { handlePacket(JSON.parse(e.data)); } catch (err) { console.error("[FLAMMABLEBUMP SB]", err); } });
  }

  function handlePacket(p) {
    if (!p.event) { handleDirect(p); return; }
    const source  = String(p.event?.source || "").toLowerCase();
    const rawType = String(p.event?.type   || "").toLowerCase();
    const type    = KICK_REMAP[rawType] || rawType;
    const data    = p.data || p;

    const chatTypes  = ["chatmessage", "firstword", "announcement"];
    const alertTypes = ["follow","sub","resub","giftsub","giftbomb","giftpaidupgrade","payitforward","raid","cheer","hypechat","hypetrain","hypetrainend"];

    if (chatTypes.includes(type)) {
      if (type === "firstword") {
        const chat = normChat(data, source, true);
        const key  = (chat.user + ":" + source).toLowerCase();
        // Skip if ChatMessage already rendered this (race condition — CM arrived before FW)
        if (recentChatMessages.has(key)) { recentChatMessages.delete(key); return; }
        // Skip if another FirstWord event already rendered this user (e.g. SB fires FirstWord twice)
        if (recentFirstWords.has(key)) return;
        // Block the follow-up ChatMessage SB always fires after FirstWord
        recentFirstWords.add(key);
        setTimeout(() => recentFirstWords.delete(key), 3000);
        addChat(chat);
        checkCommands(chat);
        return;
      }
      // Skip if this is the follow-up ChatMessage for a FirstWord we just rendered
      const u = data.user && typeof data.user === "object" ? (data.user.displayName || data.user.userName || "") : (data.displayName || data.userName || "");
      const msgKey = (u + ":" + source).toLowerCase();
      if (recentFirstWords.has(msgKey)) return;
      const chat = normChat(data, source, false);
      // Track this ChatMessage so a late-arriving FirstWord can detect the duplicate
      recentChatMessages.add(msgKey);
      setTimeout(() => recentChatMessages.delete(msgKey), 3000);
      addChat(chat);
      checkCommands(chat);
      return;
    }
    if (alertTypes.includes(type)) {
      const alert = normAlert(type, data, source);
      console.log("[FLAMMABLEBUMP ALERT]", type, source, data);
      showAlert(alert);
      updateStatsFromEvent(type, data, source);
      dispatch("alert", { type, data, source, alert });
      return;
    }
    if (type === "custom" || source === "general") { handleCustom(data); return; }
    updateStatsFromEvent(type, data, source);
  }

  function handleDirect(p) {
    const kind = String(p.kind || "").toLowerCase();
    if (kind === "alert" || p.alertType) {
      showAlert({ type:p.alertType||p.type||"Alert", user:p.user||"FLAMMABLEBUMP", detail:p.detail||p.message||"", duration:p.duration||7000, theme:p.theme||"default" });
    }
    if (kind === "stats" || p.followers !== undefined || p.subs !== undefined) updateStats(p);
    if (kind === "chat" && p.message) addChat({ user:p.user||"viewer", message:p.message, color:p.color||"", platform:"twitch", isFirst:false });
    // GetActiveViewers response — also set initial viewer count from list length
    if (p.viewers && Array.isArray(p.viewers)) {
      updateStats({ twitchViewers: p.viewers.length });
      dispatch("viewers", { viewers: p.viewers, source: "twitch" });
    }
    // Game/title pushed from SB response or direct message
    const rawG = p.game  || p.gameName;
    const rawT = p.title || p.streamTitle;
    const game  = typeof rawG === "object" ? (rawG?.name || null) : (rawG || null);
    const title = typeof rawT === "string" && /^%\w+%$/.test(rawT) ? null : (rawT || null);
    if (game)  { localStorage.setItem("flammablebump.game", game);  document.querySelectorAll("[data-game]").forEach(el => el.textContent = game); }
    if (title) { localStorage.setItem("flammablebump.streamTitle", title); document.querySelectorAll("[data-stream-title]").forEach(el => el.textContent = title); }
  }

  function normChat(d, source, isFirst) {
    const u = (d.user && typeof d.user === "object") ? d.user : {};
    // SB emotes array: [{id, name, startIndex, endIndex}, ...]
    // Also handle alternate field names SB uses across versions
    const rawEmotes = d.emotes || d.message?.emotes || [];
    const emotes = rawEmotes.map(e => ({
      id:    String(e.id || e.emoteId || ""),
      name:  e.name || e.code || e.emoteCode || "",
      start: Number(e.startIndex ?? e.start ?? 0),
      end:   Number(e.endIndex   ?? e.end   ?? 0),
    })).filter(e => e.id);
    return {
      user:    u.displayName || u.userName || u.name || d.displayName || d.userName || "viewer",
      message: d.text || d.message || d.msg || "",
      color:   u.color || d.color || "",
      platform: source,
      isFirst: isFirst || false,
      emotes,
    };
  }

  function normAlert(type, d, source) {
    const u        = (d.user && typeof d.user === "object") ? d.user : {};
    const user     = u.displayName || u.name || u.login || u.userName || d.displayName || d.name || d.userName || "FLAMMABLEBUMP";
    const months   = d.duration_months || d.months || d.cumulativeMonths || d.duration;
    const gifts    = d.total || d.recipients?.length || d.amount || d.gifts;
    const bits     = d.bits;
    const viewers  = d.viewerCount || d.viewercount || d.viewers;
    const tier     = d.sub_tier || d.subTier || d.tier || "1000";
    const tierLabel = tier === "2000" ? "Tier 2" : tier === "3000" ? "Tier 3" : "Tier 1";
    const platform  = source === "kick" ? "Kick" : source === "youtube" ? "YouTube" : "Twitch";

    const map = {
      follow:         { theme:"follow", label:"New Follower",    detail:`${platform} follow locked in!` },
      sub:            { theme:"sub",    label:"New Sub",         detail:months ? `${months} month${months>1?"s":""} strong` : `${tierLabel} sub secured` },
      resub:          { theme:"resub",  label:"Resub!",          detail:months ? `${months} months in the squad!` : "Back in the fam" },
      giftsub:        { theme:"gift",   label:"Gift Sub",        detail:"A gifted sub dropped!" },
      giftbomb:       { theme:"gift",   label:"Gift Bomb!",      detail:gifts ? `${gifts} subs gifted!` : "Mass subs dropped!" },
      giftpaidupgrade:{ theme:"sub",    label:"Gift Upgraded",   detail:"Converted their gifted sub!" },
      payitforward:   { theme:"gift",   label:"Pay It Forward",  detail:"Gifted forward to the community!" },
      raid:           { theme:"raid",   label:"Raid Incoming!",  detail:viewers ? `${viewers} raiders!` : "Raid squad pulled up!" },
      cheer:          { theme:"bits",   label:"Bits!",           detail:bits ? `${bits} bits dropped!` : "Cheer received!" },
      hypechat:       { theme:"bits",   label:"Hype Chat!",      detail:"Super chat received!" },
      hypetrain:      { theme:"hype",   label:"Hype Train!",     detail:"Keep the hype going!" },
      hypetrainend:   { theme:"hype",   label:"Hype Train End!", detail:"What a ride!" },
    };
    const c = map[type] || { theme:"default", label:"Alert", detail:"Thanks for the support!" };
    const duration = config.alertDuration || 8500;
    return { type:c.label, user, detail:c.detail, theme:c.theme, duration };
  }

  function checkCommands(chat) {
    if (!chat.message?.startsWith("!")) return;
    const parts = chat.message.trim().split(/\s+/);
    dispatch("command", { cmd:parts[0].toLowerCase(), args:parts.slice(1), user:chat.user, platform:chat.platform });
  }

  function addChat(chat) {
    if (window.FlammableBumpChat?.add) {
      window.FlammableBumpChat.add(chat.user, chat.message, chat.color, chat.platform, chat.isFirst, chat.emotes);
      return;
    }
    const feed = document.querySelector("[data-chat-feed]");
    if (!feed || !chat.message) return;
    const row = document.createElement("div");
    row.className = "chat-message" + (chat.platform==="kick"?" kick-msg":"") + (chat.platform==="youtube"?" youtube-msg":"") + (chat.isFirst?" first-msg":"");
    row.innerHTML = `<div class="chat-avatar"></div><div class="chat-content"><div class="chat-name"></div><div class="chat-text"></div></div>`;
    row.querySelector(".chat-avatar").textContent = (chat.user||"?").slice(0,2).toUpperCase();
    row.querySelector(".chat-name").textContent   = chat.user;
    row.querySelector(".chat-text").textContent   = chat.message;
    if (chat.color) row.querySelector(".chat-name").style.color = chat.color;
    feed.append(row);
    while (feed.children.length > 12) feed.firstElementChild.remove();
  }

  function showAlert(a) { window.FlammableBumpAlerts?.show(a); }

  function handleCustom(d) {
    // data.data arrives as a stringified JSON string from SB WebSocket broadcasts — parse it first
    let payload = d.data || d.args || d;
    if (typeof payload === "string") {
      try { payload = JSON.parse(payload); } catch {}
    }
    // Also handle double-nested: { data: { data: "stringified" } }
    if (payload?.data && typeof payload.data === "string") {
      try { payload = JSON.parse(payload.data); } catch {}
    }
    const name = String(d.eventName || d.name || payload?.kind || "").toLowerCase();
    if (payload?.kind === "alert" || name.includes("alert")) {
      showAlert({
        type:     payload.type     || "Alert",
        user:     payload.user     || "FLAMMABLEBUMP",
        detail:   payload.detail   || "",
        theme:    payload.theme    || "default",
        duration: payload.duration || 7000
      });
    }
    if (payload?.kind === "stats" || name.includes("stats") || name.includes("counter")) updateStats(payload);
    if (name.includes("goal"))    dispatch("goal", payload);
    if (name.includes("command")) dispatch("command", payload);
    const rawCG = payload?.game  || d.game;
    const rawCT = payload?.title || d.title;
    const game  = typeof rawCG === "object" ? (rawCG?.name || null) : (rawCG || null);
    const title = typeof rawCT === "string" && /^%\w+%$/.test(rawCT) ? null : (rawCT || null);
    if (game)  { localStorage.setItem("flammablebump.game", game);  document.querySelectorAll("[data-game]").forEach(el => el.textContent = game); }
    if (title) { localStorage.setItem("flammablebump.streamTitle", title); document.querySelectorAll("[data-stream-title]").forEach(el => el.textContent = title); }
  }

  function updateStatsFromEvent(type, d, source) {
    const next     = {};
    // Use ?? (not ||) so a count of 0 isn't skipped; normalize array to length for PresentViewers
    const rawViewers = d.viewerCount ?? d.viewercount ?? d.viewers ?? d.currentViewers;
    const viewers    = Array.isArray(rawViewers) ? rawViewers.length : rawViewers;
    const followers  = d.followers   ?? d.followerCount ?? d.totalFollowers;
    const subs       = d.subs        ?? d.subCount ?? d.subscribers;

    if (viewers !== undefined && ["presentviewers","viewercountupdate","streamupdate","raid","statisticsupdate","broadcaststarted"].includes(type)) {
      if (source === "kick")    next.kickViewers    = Number(viewers);
      else if (source === "youtube") next.youtubeViewers = Number(viewers);
      else                      next.twitchViewers  = Number(viewers);
    }
    if (followers !== undefined) next.followers = Number(followers);
    if (subs      !== undefined) next.subs      = Number(subs);

    if (["sub","resub","giftsub"].includes(type) && subs === undefined) {
      next.subs = readCurrent("subs") + 1;
    }
    if (type === "giftbomb") {
      const count = d.total || d.recipients?.length || 1;
      next.subs = readCurrent("subs") + Number(count);
    }
    if (type === "follow" && followers === undefined) {
      next.followers = readCurrent("followers") + 1;
    }

    // StreamUpdate carries game/title — push to all [data-game] / [data-stream-title] elements
    if (type === "streamupdate") {
      const rawGame  = d.game || d.gameName || d.category || d.categoryName;
      const rawTitle = d.title || d.streamTitle;
      // SB's game field is often an object {id, name}; title may arrive as unresolved "%title%"
      const game  = typeof rawGame  === "object" ? (rawGame?.name  || null) : (rawGame  || null);
      const title = typeof rawTitle === "string"  && /^%\w+%$/.test(rawTitle) ? null : (rawTitle || null);
      if (game) {
        localStorage.setItem("flammablebump.game", game);
        document.querySelectorAll("[data-game]").forEach(el => el.textContent = game);
      }
      if (title) {
        localStorage.setItem("flammablebump.streamTitle", title);
        document.querySelectorAll("[data-stream-title]").forEach(el => el.textContent = title);
      }
    }

    // PresentViewers — dispatch viewer list; count already set above via array→length normalization
    if (type === "presentviewers") {
      const list = d.viewers || d.users || [];
      dispatch("viewers", { viewers: list, source });
    }

    updateStats(next);
  }

  function readCurrent(k) { return Number(localStorage.getItem(`flammablebump.${k}`) || config.defaults?.[k] || 0); }

  function updateStats(next) {
    const clean = {};
    ["followers","subs","twitchViewers","kickViewers","youtubeViewers"].forEach(k => {
      if (next[k] !== undefined && !isNaN(Number(next[k]))) clean[k] = Number(next[k]);
    });
    if (!Object.keys(clean).length) return;
    if (window.FlammableBumpOverlay?.update) { window.FlammableBumpOverlay.update(clean); return; }
    Object.entries(clean).forEach(([k,v]) => {
      localStorage.setItem(`flammablebump.${k}`, v);
      document.querySelectorAll(`[data-stat="${k}"]`).forEach(el => el.textContent = String(v));
    });
  }

  window.FlammableBumpStreamerBot = { connect, send, showAlert, updateStats, dispatch };
  connect();
})();
