// Renders the normal (non-edit) wallet view from PW.state + PW.livePrices.
var PW = window.PW || (window.PW = {});

PW.activeTab = "tokens";

// ---------- formatting helpers ----------
PW.fmtUsd = (n) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  // Anything at or below dust reads as a clean $0.00 rather than $0.000000.
  if (abs < 0.01) return "$0.00";
  const digits = abs < 1 ? 4 : 2;
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

// Unit prices still need fine precision (a BONK is worth $0.0000024), so keep
// a separate formatter for per-coin prices rather than holdings.
PW.fmtPrice = (n) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs === 0) return "$0.00";
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8;
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

PW.fmtAmount = (n) => {
  const v = Number(n) || 0;
  if (v === 0) return "0";
  if (Math.abs(v) >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toLocaleString("en-US", { maximumFractionDigits: 8 });
};

PW.fmtPct = (n) => {
  const v = Number(n) || 0;
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
};

PW.shortAddr = (a) => {
  if (!a) return "";
  if (a.length <= 12) return a;
  return a.slice(0, 4) + "..." + a.slice(-4);
};

PW.relTime = (ts) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  if (d < 7) return d + "d ago";
  const w = Math.floor(d / 7);
  if (w < 5) return w + "w ago";
  return Math.floor(d / 30) + "mo ago";
};

// ---------- totals ----------
PW.computeTotals = () => {
  let now = 0;
  let prev = 0;
  for (const t of PW.state.tokens) {
    const price = PW.effPrice(t);
    const val = (Number(t.amount) || 0) * price;
    const chg = PW.change24hOf(t) / 100;
    const prevVal = chg > -1 ? val / (1 + chg) : val;
    now += val;
    prev += prevVal;
  }
  const override = PW.state.totalOverride;
  const headline = override !== null && override !== undefined && override !== "" ? Number(override) : now;
  const changeUsd = now - prev;
  const changePct = prev > 0 ? (changeUsd / prev) * 100 : 0;
  return { headline, changeUsd, changePct };
};

// Effective price for any token (adds a baseline fallback on top of priceOf).
PW.effPrice = (t) => {
  const p = PW.priceOf(t);
  if (p) return p;
  const lp = PW.livePrices[t.symbol];
  if (lp) return lp.price;
  const b = PW.BASELINE && PW.BASELINE[t.symbol];
  return b ? b.price : 0;
};

// Any holding worth less than this is treated as dust and swept to zero,
// the way a real wallet's holder/network fees consume sub-cent remainders.
// Prevents fee leftovers from rendering as "$0.000000".
PW.DUST_USD = 0.01;

// Sweep dust from one account (or all accounts when called with no argument).
// Only ever runs after a balance-changing action or on load — never on a price
// tick, so a dip in the market can't silently wipe a holding mid-recording.
PW.sweepDust = (acct) => {
  const accounts = acct ? [acct] : (PW.wallet && PW.wallet.accounts) || [];
  let changed = false;
  for (const a of accounts) {
    for (const t of (a && a.tokens) || []) {
      const amt = Number(t.amount) || 0;
      if (amt === 0) continue;
      if (amt < 0) { t.amount = 0; changed = true; continue; }
      const price = PW.effPrice(t);
      // A price of 0 means "unknown" — never sweep on missing price data.
      if (price > 0 && amt * price < PW.DUST_USD) { t.amount = 0; changed = true; }
    }
  }
  return changed;
};

// Total USD value of any account (used by the account switcher).
PW.accountTotal = (acct) =>
  acct.tokens.reduce((s, t) => s + (Number(t.amount) || 0) * PW.effPrice(t), 0);

// ---------- render ----------
PW.renderHeader = () => {
  document.getElementById("accountName").textContent = PW.state.walletName || "Wallet";
};

PW.renderBalance = () => {
  const { headline, changeUsd, changePct } = PW.computeTotals();
  const balEl = document.getElementById("totalBalance");
  const el = document.getElementById("totalChange");
  if (PW.hidden()) {
    balEl.textContent = "••••••";
    el.textContent = "••••";
    el.classList.remove("neg");
    return;
  }
  balEl.textContent = PW.fmtUsd(headline);
  const sign = changeUsd >= 0 ? "+" : "-";
  el.textContent = sign + PW.fmtUsd(Math.abs(changeUsd)) + " (" + PW.fmtPct(changePct) + ")";
  el.classList.toggle("neg", changeUsd < 0);
};

// Symbols that ship with a real downloaded brand logo in icons/tokens/.
PW.LOGO_SET = new Set([
  "BTC", "ETH", "SOL", "BNB", "XRP", "USDC", "USDT", "ADA", "DOGE", "AVAX",
  "DOT", "LINK", "TRX", "MATIC", "LTC", "NEAR", "UNI", "ATOM", "APT", "SUI",
  "TON", "ARB", "OP", "SHIB", "PEPE", "BONK", "WIF", "JUP",
  // Privacy coins
  "XMR", "ZEC", "DASH", "ZEN", "DCR", "FIRO", "ARRR", "SCRT", "ROSE", "BEAM", "GRIN", "MOB",
]);

// Real logo image when we have one; otherwise a clean colored initial badge.
// The <img> falls back to the badge automatically if the file is missing.
PW.assetIcon = (t) => {
  const sym = (t.symbol || "").toUpperCase();
  const initial = (t.symbol || "?").slice(0, 1).toUpperCase();
  if (PW.LOGO_SET.has(sym)) {
    return `<div class="token-icon logo"><img src="icons/tokens/${sym}.png" alt="${PW.esc(sym)}"
      onerror="this.parentNode.classList.remove('logo');this.parentNode.style.background='${t.iconColor || "#555"}';this.replaceWith(document.createTextNode('${initial}'))" /></div>`;
  }
  return `<div class="token-icon" style="background:${t.iconColor || "#555"}">${initial}</div>`;
};

PW.renderTokens = () => {
  const wrap = document.getElementById("tokensList");
  if (!PW.state.tokens.length) {
    wrap.innerHTML = '<div class="empty">No assets yet.<br>Press F7 to add some.</div>';
    return;
  }
  const hidden = PW.hidden();
  wrap.innerHTML = PW.state.tokens
    .map((t) => {
      const price = PW.effPrice(t);
      const value = (Number(t.amount) || 0) * price;
      const chg = PW.change24hOf(t);
      const chgClass = chg >= 0 ? "pos" : "neg";
      return `
      <div class="row" data-symbol="${PW.esc(t.symbol)}">
        ${PW.assetIcon(t)}
        <div class="row-main">
          <div class="row-title">${PW.esc(t.name || t.symbol)}</div>
          <div class="row-sub">${hidden ? "••••" : PW.fmtAmount(t.amount) + " " + PW.esc(t.symbol)}</div>
        </div>
        <div class="row-right">
          <div class="row-value">${hidden ? "••••" : PW.fmtUsd(value)}</div>
          <div class="row-change ${chgClass}">${hidden ? "" : PW.fmtPct(chg)}</div>
        </div>
      </div>`;
    })
    .join("");
};

PW.TX_ICONS = {
  receive: `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 5v13m0 0l-6-6m6 6l6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  send: `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 19V6m0 0l-6 6m6-6l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  swap: `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M17 4l3 3-3 3M20 7H8m-1 13l-3-3 3-3M4 17h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

PW.txMeta = (type) => {
  switch (type) {
    case "receive": return { label: "Received", sign: "+", cls: "amt-pos", ico: PW.TX_ICONS.receive };
    case "send": return { label: "Sent", sign: "-", cls: "amt-neg", ico: PW.TX_ICONS.send };
    case "swap": return { label: "Swapped", sign: "", cls: "amt-neg", ico: PW.TX_ICONS.swap };
    default: return { label: "Transaction", sign: "", cls: "amt-neg", ico: "" };
  }
};

PW.renderActivity = () => {
  const wrap = document.getElementById("activityList");
  if (!PW.state.txns.length) {
    wrap.innerHTML = '<div class="empty">No activity yet. Press F7 to add transactions.</div>';
    return;
  }
  const sorted = [...PW.state.txns].sort((a, b) => b.ts - a.ts);
  wrap.innerHTML = sorted
    .map((tx) => {
      const m = PW.txMeta(tx.type);
      const sub = tx.type === "swap" ? PW.esc(tx.address) : PW.esc(PW.addrLabel ? PW.addrLabel(tx.address) : PW.shortAddr(tx.address));
      const amt = m.sign + PW.fmtAmount(tx.amount) + " " + PW.esc(tx.symbol);
      const pending = tx.status === "pending";
      return `
      <div class="row ${pending ? "is-pending" : ""}" data-txid="${PW.esc(tx.id)}">
        <div class="tx-icon ${tx.type}">${pending ? '<span class="mini-spin"></span>' : m.ico}</div>
        <div class="row-main">
          <div class="row-title">${pending ? "Pending" : m.label}</div>
          <div class="row-sub">${sub} · ${pending ? "Confirming…" : PW.relTime(tx.ts)}</div>
        </div>
        <div class="row-right">
          <div class="row-value ${m.cls}">${amt}</div>
        </div>
      </div>`;
    })
    .join("");
};

PW.esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

PW.setTab = (tab) => {
  PW.activeTab = tab;
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.getElementById("tokensList").classList.toggle("hidden", tab !== "tokens");
  document.getElementById("activityList").classList.toggle("hidden", tab !== "activity");
};

// Full re-render of the normal view. Safe to call on every price tick.
PW.renderAll = () => {
  PW.renderHeader();
  PW.renderBalance();
  PW.renderTokens();
  PW.renderActivity();
};
