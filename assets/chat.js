(function () {
  const config        = window.FLAMMABLEBUMP_CONFIG || {};
  const params        = new URLSearchParams(window.location.search);
  const useDirectChat = params.get("directChat") === "1" || !config.streamerbot?.enabled;
  // TODO: Fill in your Twitch channel name in config.js (twitchName field)
  const channel       = (params.get("channel") || config.twitchName || "FlammableBump").toLowerCase().replace(/^#/, "");
  const maxMessages   = Number(params.get("max") || 12);
  const feed          = document.querySelector("[data-chat-feed]");
  const statusEl      = document.querySelector("[data-chat-status]");

  if (!feed) return;

  function setStatus(t) { if (statusEl) statusEl.textContent = t; }

  const colorPool = ["#FF8C00","#FFAB40","#FF5500","#ff6eb4","#ffd700","#6fdc88","#bf9fff"];
  function nameColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return colorPool[h % colorPool.length];
  }

  const TWITCH_CDN = "https://static-cdn.jtvnw.net/emoticons/v2";

  // Build a DOM fragment mixing plain text and emote images
  function renderMessageContent(text, emotes) {
    const frag = document.createDocumentFragment();
    if (!emotes || !emotes.length) {
      frag.appendChild(document.createTextNode(text));
      return frag;
    }
    // Sort ascending by start position, remove any that are out of range
    const sorted = emotes
      .filter(e => e.start >= 0 && e.end < text.length && e.end >= e.start)
      .sort((a, b) => a.start - b.start);

    let pos = 0;
    for (const emote of sorted) {
      if (emote.start > pos) frag.appendChild(document.createTextNode(text.slice(pos, emote.start)));
      const img = document.createElement("img");
      img.src       = `${TWITCH_CDN}/${emote.id}/default/dark/2.0`;
      img.alt       = emote.name;
      img.title     = emote.name;
      img.className = "chat-emote";
      img.loading   = "lazy";
      frag.appendChild(img);
      pos = emote.end + 1;
    }
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    return frag;
  }

  function addMessage(name, text, color, platform, isFirst, emotes) {
    if (!text) return;
    const isCommand = text.startsWith("!");
    const classes   = ["chat-message"];
    if (platform === "kick") classes.push("kick-msg");
    if (isFirst)             classes.push("first-msg");
    if (isCommand)           classes.push("cmd-msg");

    const row = document.createElement("div");
    row.className = classes.join(" ");

    const av = document.createElement("div");
    av.className  = "chat-avatar";
    av.textContent = (name || "?").slice(0, 2).toUpperCase();
    av.style.background   = color || nameColor(name);
    av.style.borderColor  = platform === "kick" ? "rgba(83,252,73,0.55)" : "rgba(145,71,255,0.45)";

    const content = document.createElement("div");
    content.className = "chat-content";

    const nameRow = document.createElement("div");
    nameRow.className = "chat-name";

    const nameSpan = document.createElement("span");
    nameSpan.className   = "chat-name-text";
    nameSpan.textContent = name || "viewer";
    nameSpan.style.color = color || nameColor(name);

    const platBadge = document.createElement("span");
    platBadge.className   = "badge " + (platform === "kick" ? "kick" : "twitch");
    platBadge.textContent = platform === "kick" ? "K" : "T";

    nameRow.append(nameSpan, platBadge);

    if (isFirst) {
      const firstBadge = document.createElement("span");
      firstBadge.className   = "badge first";
      firstBadge.textContent = "FIRST";
      nameRow.append(firstBadge);
    }

    const body = document.createElement("div");
    body.className = "chat-text";
    body.appendChild(renderMessageContent(text, emotes));

    content.append(nameRow, body);
    row.append(av, content);
    feed.append(row);

    while (feed.children.length > maxMessages) feed.firstElementChild.remove();
    row.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  window.FlammableBumpChat = { add: addMessage };

  if (!useDirectChat) { setStatus("Waiting for SB"); return; }

  // ── Twitch IRC direct-connect fallback (when SB is not running) ──
  function parseTags(line) {
    const tags = {};
    if (!line.startsWith("@")) return tags;
    line.slice(1, line.indexOf(" ")).split(";").forEach(p => {
      const [k, v = ""] = p.split("=");
      tags[k] = v.replace(/\\s/g, " ");
    });
    return tags;
  }

  function parsePrivmsg(line) {
    const tags  = parseTags(line);
    const match = line.match(/:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #[^ ]+ :([\s\S]*)$/);
    if (!match) return null;
    return { name: tags["display-name"] || match[1], text: match[2], color: tags.color || "", platform: "twitch" };
  }

  function connect() {
    if (!("WebSocket" in window)) { setStatus("No WebSocket"); return; }
    const nick   = `justinfan${Math.floor(Math.random() * 90000 + 10000)}`;
    // TODO: This connects directly to Twitch IRC — make sure twitchName in config.js is correct
    const socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

    socket.addEventListener("open", () => {
      setStatus("⬤ Live");
      socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      socket.send("PASS SCHMOOPIIE");
      socket.send(`NICK ${nick}`);
      socket.send(`JOIN #${channel}`);
    });

    socket.addEventListener("message", e => {
      String(e.data).split("\r\n").forEach(line => {
        if (!line) return;
        if (line.startsWith("PING")) { socket.send("PONG :tmi.twitch.tv"); return; }
        const msg = parsePrivmsg(line);
        if (msg) addMessage(msg.name, msg.text, msg.color, "twitch", false);
      });
    });

    socket.addEventListener("close", () => { setStatus("Reconnecting..."); setTimeout(connect, 4000); });
    socket.addEventListener("error", () => setStatus("Chat offline"));
  }

  setStatus(`Joining #${channel}`);
  connect();
})();
