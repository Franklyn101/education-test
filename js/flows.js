// Transaction flows for normal mode: Send, Receive, Swap, Buy.
// These run realistic multi-step flows and actually mutate the prop wallet
// (balances + activity) so the effect looks genuine on camera. Nothing here
// touches a real network — but nothing in the UI says so either.
var PW = window.PW || (window.PW = {});

// Known assets available as presets (Add asset / Swap into / Buy). Each carries
// a CoinGecko id for live pricing and a baseline price used offline / before the
// first fetch. Ordered majors-first, memecoins last.
PW.CATALOG = {
  BTC: { name: "Bitcoin", coingeckoId: "bitcoin", iconColor: "#F7931A", price: 64771, change: -0.2 },
  ETH: { name: "Ethereum", coingeckoId: "ethereum", iconColor: "#627EEA", price: 1913.29, change: 0.0 },
  SOL: { name: "Solana", coingeckoId: "solana", iconColor: "#9945FF", price: 75.78, change: 2.6 },
  BNB: { name: "BNB", coingeckoId: "binancecoin", iconColor: "#F3BA2F", price: 600.8, change: 1.6 },
  XRP: { name: "XRP", coingeckoId: "ripple", iconColor: "#23292F", price: 1.034, change: 0.4 },
  USDC: { name: "USD Coin", coingeckoId: "usd-coin", iconColor: "#2775CA", price: 0.9996, change: 0.0 },
  USDT: { name: "Tether", coingeckoId: "tether", iconColor: "#26A17B", price: 0.9994, change: 0.0 },
  ADA: { name: "Cardano", coingeckoId: "cardano", iconColor: "#0033AD", price: 0.198427, change: -1.2 },
  DOGE: { name: "Dogecoin", coingeckoId: "dogecoin", iconColor: "#C2A633", price: 0.06994, change: 0.0 },
  AVAX: { name: "Avalanche", coingeckoId: "avalanche-2", iconColor: "#E84142", price: 6.47, change: -1.4 },
  DOT: { name: "Polkadot", coingeckoId: "polkadot", iconColor: "#E6007A", price: 0.813945, change: -0.8 },
  LINK: { name: "Chainlink", coingeckoId: "chainlink", iconColor: "#2A5ADA", price: 8.28, change: 1.2 },
  TRX: { name: "TRON", coingeckoId: "tron", iconColor: "#EF0027", price: 0.329624, change: 0.6 },
  MATIC: { name: "Polygon", coingeckoId: "matic-network", iconColor: "#8247E5", price: 0.126156, change: -18.6 },
  LTC: { name: "Litecoin", coingeckoId: "litecoin", iconColor: "#345D9D", price: 45.9, change: 0.8 },
  XMR: { name: "Monero", coingeckoId: "monero", iconColor: "#FF6600", price: 393.13, change: 4.1, tags: "privacy anonymous" },
  ZEC: { name: "Zcash", coingeckoId: "zcash", iconColor: "#F4B728", price: 510.7, change: 0.4, tags: "privacy shielded anonymous" },
  DASH: { name: "Dash", coingeckoId: "dash", iconColor: "#008CE7", price: 31.05, change: -1.6, tags: "privacy anonymous" },
  ZEN: { name: "Horizen", coingeckoId: "zencash", iconColor: "#041742", price: 4.23, change: 3.9, tags: "privacy anonymous" },
  DCR: { name: "Decred", coingeckoId: "decred", iconColor: "#2ED6A1", price: 12.89, change: 0.9, tags: "privacy anonymous" },
  FIRO: { name: "Firo", coingeckoId: "zcoin", iconColor: "#9B1C2E", price: 0.630101, change: -2.3, tags: "privacy anonymous zcoin" },
  ARRR: { name: "Pirate Chain", coingeckoId: "pirate-chain", iconColor: "#B4A265", price: 0.213463, change: -8.2, tags: "privacy anonymous" },
  SCRT: { name: "Secret", coingeckoId: "secret", iconColor: "#1B1B1B", price: 0.03167377, change: -2.1, tags: "privacy anonymous" },
  ROSE: { name: "Oasis", coingeckoId: "oasis-network", iconColor: "#0092F6", price: 0.00562377, change: -0.2, tags: "privacy anonymous" },
  BEAM: { name: "Beam", coingeckoId: "beam", iconColor: "#24C1BF", price: 0.00885012, change: -0.1, tags: "privacy anonymous mimblewimble" },
  GRIN: { name: "Grin", coingeckoId: "grin", iconColor: "#FFDD00", price: 0.01444067, change: -7.1, tags: "privacy anonymous mimblewimble" },
  MOB: { name: "MobileCoin", coingeckoId: "mobilecoin", iconColor: "#0080FF", price: 0.078036, change: -0.7, tags: "privacy anonymous" },
  NEAR: { name: "NEAR Protocol", coingeckoId: "near", iconColor: "#00C08B", price: 1.61, change: 0.7 },
  UNI: { name: "Uniswap", coingeckoId: "uniswap", iconColor: "#FF007A", price: 3.97, change: -0.7 },
  ATOM: { name: "Cosmos", coingeckoId: "cosmos", iconColor: "#5064FB", price: 1.38, change: 0.5 },
  APT: { name: "Aptos", coingeckoId: "aptos", iconColor: "#2DD4BF", price: 0.60301, change: 4.2 },
  SUI: { name: "Sui", coingeckoId: "sui", iconColor: "#4DA2FF", price: 0.688541, change: 1.5 },
  TON: { name: "Toncoin", coingeckoId: "the-open-network", iconColor: "#0098EA", price: 1.35, change: -0.3 },
  ARB: { name: "Arbitrum", coingeckoId: "arbitrum", iconColor: "#12AAFF", price: 0.078159, change: -0.3 },
  OP: { name: "Optimism", coingeckoId: "optimism", iconColor: "#FF0420", price: 0.088885, change: 2.6 },
  SHIB: { name: "Shiba Inu", coingeckoId: "shiba-inu", iconColor: "#F00500", price: 0.0000046, change: -0.8 },
  PEPE: { name: "Pepe", coingeckoId: "pepe", iconColor: "#3E9E4F", price: 0.00000284, change: -0.1 },
  BONK: { name: "Bonk", coingeckoId: "bonk", iconColor: "#F5A623", price: 0.00000248, change: -1.6 },
  WIF: { name: "dogwifhat", coingeckoId: "dogwifcoin", iconColor: "#C48B5A", price: 0.142434, change: 2.4 },
  JUP: { name: "Jupiter", coingeckoId: "jupiter-exchange-solana", iconColor: "#00B4D8", price: 0.185006, change: 2.2 },
};

// Seed price baselines from the catalog (don't overwrite ones prices.js set).
Object.keys(PW.CATALOG).forEach((sym) => {
  if (!PW.BASELINE[sym]) PW.BASELINE[sym] = { price: PW.CATALOG[sym].price, change24h: PW.CATALOG[sym].change || 0 };
});

// ---------- validation & helpers ----------
PW.isValidAddress = (a) => {
  if (!a) return false;
  a = a.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return true; // Ethereum
  if (/^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,39})$/.test(a)) return true; // Bitcoin
  if (/^[48][0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/.test(a)) return true; // Monero (95 char)
  if (/^t[13][a-km-zA-HJ-NP-Z1-9]{33}$/.test(a)) return true; // Zcash transparent
  if (/^(zs|zc)1?[a-z0-9]{40,90}$/i.test(a)) return true; // Zcash / Pirate shielded
  if (/^u1[a-z0-9]{40,200}$/i.test(a)) return true; // Zcash unified
  if (/^X[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return true; // Dash
  if (/^zn[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return true; // Horizen
  if (/^(Ds|Dc|Dk)[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return true; // Decred
  if (/^a[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return true; // Firo
  if (/^(secret|oasis)1[a-z0-9]{38,58}$/.test(a)) return true; // Secret / Oasis bech32
  if (/^[0-9a-fA-F]{64,66}$/.test(a)) return true; // Beam / Grin hex
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return true; // Solana base58
  return false;
};

// Well-formed sender addresses per chain, for the incoming-transfer simulator.
PW.randomAddressFor = (sym) => {
  const s = (sym || "").toUpperCase();
  const b58 = (n) => { let o = ""; for (let i = 0; i < n; i++) o += PW.B58[Math.floor(Math.random() * PW.B58.length)]; return o; };
  const hex = (n) => { let o = ""; for (let i = 0; i < n; i++) o += "0123456789abcdef"[Math.floor(Math.random() * 16)]; return o; };
  const lc = (n) => { let o = ""; for (let i = 0; i < n; i++) o += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]; return o; };
  switch (s) {
    case "XMR": return PW.randomMoneroAddress();
    case "ZEC": return "t1" + b58(33);
    case "ARRR": return "zs1" + lc(75);
    case "DASH": return "X" + b58(33);
    case "ZEN": return "zn" + b58(33);
    case "DCR": return "Ds" + b58(33);
    case "FIRO": return "a" + b58(33);
    case "SCRT": return "secret1" + lc(38);
    case "ROSE": return "oasis1" + lc(40);
    case "BEAM":
    case "GRIN": return hex(64);
    case "BTC": return "bc1" + lc(39);
    case "ETH": return "0x" + hex(40);
    default: return PW.randomAddress();
  }
};

// A well-formed Monero address (95 chars, standard "4" prefix).
PW.randomMoneroAddress = () => {
  let s = "4" + "0123456789AB"[Math.floor(Math.random() * 12)];
  for (let i = 0; i < 93; i++) s += PW.B58[Math.floor(Math.random() * PW.B58.length)];
  return s;
};

PW.hashStr = (s) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h | 0;
};

PW.feeFor = (token) => {
  const s = (token.symbol || "").toUpperCase();
  if (s === "ETH") return { sym: "ETH", amount: 0.00021, label: "~0.00021 ETH" };
  if (s === "BTC") return { sym: "BTC", amount: 0.00003, label: "~0.00003 BTC" };
  if (s === "XMR") return { sym: "XMR", amount: 0.000032, label: "~0.000032 XMR" };
  // Privacy chains pay their own native fee.
  const NATIVE_FEE = {
    ZEC: 0.00001, DASH: 0.0000226, ZEN: 0.0001, DCR: 0.0001, FIRO: 0.001,
    ARRR: 0.0001, SCRT: 0.0125, ROSE: 0.002, BEAM: 0.001, GRIN: 0.008, MOB: 0.0004,
  };
  if (NATIVE_FEE[s] !== undefined) {
    return { sym: s, amount: NATIVE_FEE[s], label: "~" + NATIVE_FEE[s] + " " + s };
  }
  return { sym: "SOL", amount: 0.000005, label: "~0.000005 SOL" };
};

PW.ensureToken = (sym) => {
  sym = sym.toUpperCase();
  let t = PW.state.tokens.find((x) => (x.symbol || "").toUpperCase() === sym);
  if (!t) {
    const c = PW.CATALOG[sym] || { name: sym, coingeckoId: "", iconColor: "#7d6ce8" };
    t = { symbol: sym, name: c.name, coingeckoId: c.coingeckoId, amount: 0, priceOverride: null, iconColor: c.iconColor };
    PW.state.tokens.push(t);
    PW._ensureBaseline();
  }
  return t;
};

PW.recordTxn = (tx) => {
  PW.state.txns.unshift({
    id: "t" + Date.now() + Math.floor(PW.priceOf(PW.state.tokens[0] || { symbol: "" }) % 997),
    ts: Date.now(),
    ...tx,
  });
};

// ---------- mutations ----------
// Display an address as one of your own account names when it matches.
PW.addrLabel = (addr) => {
  const acct = PW.accountByAddress(addr);
  return acct ? acct.walletName : PW.shortAddr(addr);
};

// Find one of the wallet's own accounts by address (internal transfers).
PW.accountByAddress = (addr) => {
  const a = String(addr || "").trim();
  if (!a) return null;
  return ((PW.wallet && PW.wallet.accounts) || []).find((x) => x.address === a) || null;
};

PW.doSend = (token, amount, toAddr) => {
  const sender = PW.state; // capture: the user may switch accounts before settle
  token.amount = Math.max(0, (Number(token.amount) || 0) - amount);
  const fee = PW.feeFor(token);
  const feeTok = sender.tokens.find((t) => (t.symbol || "").toUpperCase() === fee.sym);
  if (feeTok) feeTok.amount = Math.max(0, (Number(feeTok.amount) || 0) - fee.amount);
  PW.recordTxn({ type: "send", symbol: token.symbol, amount, address: toAddr, status: "pending" });
  const id = sender.txns[0].id;

  // If the destination is one of this wallet's own accounts, actually route the
  // funds there: a matching pending receive that credits on settle.
  const dest = PW.accountByAddress(toAddr);
  let destTx = null;
  let selfSend = false;
  if (dest && dest === sender) {
    // Sending to yourself: the funds come straight back, so the net cost is
    // just the network fee (matches how a real self-transfer settles).
    selfSend = true;
  } else if (dest) {
    let destTok = dest.tokens.find((t) => (t.symbol || "").toUpperCase() === (token.symbol || "").toUpperCase());
    if (!destTok) {
      const c = PW.CATALOG[(token.symbol || "").toUpperCase()] || {};
      destTok = {
        symbol: token.symbol,
        name: c.name || token.name || token.symbol,
        coingeckoId: c.coingeckoId || token.coingeckoId || "",
        amount: 0,
        priceOverride: null,
        iconColor: c.iconColor || token.iconColor || "#7d6ce8",
      };
      dest.tokens.push(destTok);
    }
    destTx = {
      id: "t" + Date.now() + Math.floor(Math.random() * 997),
      ts: Date.now(),
      type: "receive",
      symbol: token.symbol,
      amount: Number(amount) || 0,
      address: sender.address,
      sig: PW.randomSig(),
      status: "pending",
      pendingCredit: Number(amount) || 0,
    };
    dest.txns.unshift(destTx);
  }

  PW.sweepDust(sender);
  if (dest) PW.sweepDust(dest);
  PW.persist();
  PW.renderAll();

  // Confirm shortly after, like a real network settle.
  setTimeout(() => {
    const live = sender.txns.find((x) => x.id === id);
    if (live) live.status = "confirmed";
    if (selfSend) {
      const back = sender.tokens.find((t) => (t.symbol || "").toUpperCase() === (token.symbol || "").toUpperCase());
      if (back) back.amount = (Number(back.amount) || 0) + (Number(amount) || 0);
    }
    if (destTx) {
      const dlive = dest.txns.find((x) => x.id === destTx.id);
      if (dlive && dlive.status === "pending") {
        dlive.status = "confirmed";
        dlive.ts = Date.now();
        if (dlive.pendingCredit) {
          const dtok = dest.tokens.find((t) => (t.symbol || "").toUpperCase() === (dlive.symbol || "").toUpperCase());
          if (dtok) dtok.amount = (Number(dtok.amount) || 0) + dlive.pendingCredit;
          delete dlive.pendingCredit;
        }
        // If the user switched to the receiving account, show the alert there.
        if (PW.state === dest) PW.notify("Received", `+${PW.fmtAmount(dlive.amount)} ${dlive.symbol}`, { symbol: dlive.symbol, iconColor: "#7d6ce8" });
      }
    }
    PW.sweepDust(sender);
    if (dest) PW.sweepDust(dest);
    PW.persist();
    PW.renderAll();
    if (PW.flow && PW.flow.type === "txDetail" && PW.flow.data.id === id) PW.renderFlow();
  }, 4000);
};

PW.doSwap = (fromTok, toSym, fromAmount) => {
  const priceFrom = PW.effPrice(fromTok);
  const toTok = PW.ensureToken(toSym);
  const priceTo = PW.effPrice(toTok) || PW.previewPrice(toSym) || 1;
  const gross = priceTo > 0 ? (fromAmount * priceFrom) / priceTo : 0;
  const net = gross * 0.9915; // ~0.85% swap fee/slippage
  fromTok.amount = Math.max(0, (Number(fromTok.amount) || 0) - fromAmount);
  toTok.amount = (Number(toTok.amount) || 0) + net;
  PW.recordTxn({ type: "swap", symbol: fromTok.symbol, amount: fromAmount, address: fromTok.symbol + " → " + toSym });
  PW.sweepDust(PW.state);
  PW.persist();
  PW.renderAll();
  PW.fetchPrices().then(PW.renderAll);
  return net;
};

PW.doBuy = (toSym, usd) => {
  const tok = PW.ensureToken(toSym);
  const price = PW.effPrice(tok) || PW.previewPrice(toSym) || 1;
  const amt = price > 0 ? usd / price : 0;
  tok.amount = (Number(tok.amount) || 0) + amt;
  PW.recordTxn({ type: "receive", symbol: toSym, amount: amt, address: "Coinbase Pay" });
  PW.sweepDust(PW.state);
  PW.persist();
  PW.renderAll();
  PW.fetchPrices().then(PW.renderAll);
  return amt;
};

// ---------- incoming transfers (functional Receive) ----------
// Credits an asset, logs the activity entry, and persists. Used by the
// incoming-transfer simulator so Receive actually does something.
PW.doReceive = (sym, amount, fromAddr, status) => {
  const tok = PW.ensureToken(sym);
  tok.amount = (Number(tok.amount) || 0) + Number(amount || 0);
  const tx = {
    id: "t" + Date.now() + Math.floor(Math.random() * 997),
    ts: Date.now(),
    type: "receive",
    symbol: tok.symbol,
    amount: Number(amount || 0),
    address: fromAddr || PW.randomAddress(),
    sig: PW.randomSig(),
    status: status || "confirmed",
  };
  PW.state.txns.unshift(tx);
  PW.sweepDust(PW.state);
  PW.persist();
  PW.renderAll();
  return tx;
};

// Plays a realistic incoming transfer: a pending entry appears with a
// notification banner, then confirms a few seconds later and credits the
// balance — exactly how a real transfer lands while you're filming.
PW.simulateIncoming = (sym, amount, fromAddr, instant) => {
  const tok = PW.ensureToken(sym);
  const from = fromAddr || PW.randomAddress();
  const amt = Number(amount || 0);
  if (!amt) return;

  if (instant) {
    PW.doReceive(sym, amt, from, "confirmed");
    PW.notify("Received", `+${PW.fmtAmount(amt)} ${tok.symbol}`, tok);
    return;
  }

  // 1) pending entry (balance not yet credited; pendingCredit lets a reload
  //    settle it correctly if the popup closes before the timer fires)
  const tx = {
    id: "t" + Date.now() + Math.floor(Math.random() * 997),
    ts: Date.now(),
    type: "receive",
    symbol: tok.symbol,
    amount: amt,
    address: from,
    sig: PW.randomSig(),
    status: "pending",
    pendingCredit: amt,
  };
  PW.state.txns.unshift(tx);
  PW.persist();
  PW.renderAll();
  PW.notify("Incoming transfer", `${PW.fmtAmount(amt)} ${tok.symbol} · Pending`, tok);

  // 2) confirm + credit
  setTimeout(() => {
    const live = PW.state.txns.find((x) => x.id === tx.id);
    if (!live) return;
    live.status = "confirmed";
    live.ts = Date.now();
    const t2 = PW.ensureToken(sym);
    if (live.pendingCredit) {
      t2.amount = (Number(t2.amount) || 0) + live.pendingCredit;
      delete live.pendingCredit;
    }
    PW.sweepDust(PW.state);
    PW.persist();
    PW.renderAll();
    if (PW.flow && PW.flow.type === "txDetail" && PW.flow.data.id === tx.id) PW.renderFlow();
    PW.notify("Received", `+${PW.fmtAmount(amt)} ${t2.symbol}`, t2);
  }, 3200);
};

// Settle anything left pending when the popup was closed mid-flight: confirm
// it and apply any balance credit that never landed. Runs on every open.
PW.reconcilePending = () => {
  let changed = false;
  for (const acct of (PW.wallet && PW.wallet.accounts) || []) {
    for (const tx of acct.txns || []) {
      if (tx.status !== "pending") continue;
      if (Date.now() - tx.ts < 4500) continue; // still legitimately in flight
      tx.status = "confirmed";
      if (tx.pendingCredit) {
        const tok = (acct.tokens || []).find((t) => (t.symbol || "").toUpperCase() === (tx.symbol || "").toUpperCase());
        if (tok) tok.amount = (Number(tok.amount) || 0) + tx.pendingCredit;
        delete tx.pendingCredit;
      }
      changed = true;
    }
  }
  if (PW.sweepDust()) changed = true;
  if (changed) PW.persist();
};

// Slide-down notification banner (like a real wallet's incoming alert).
PW._notifyTimer = null;
PW.notify = (title, sub, tok) => {
  const host = document.getElementById("app");
  let el = document.getElementById("notifyBanner");
  if (!el) {
    el = document.createElement("div");
    el.id = "notifyBanner";
    host.appendChild(el);
  }
  el.innerHTML = `${tok ? PW.assetIcon(tok) : ""}
    <div class="row-main"><div class="row-title">${PW.esc(title)}</div><div class="row-sub">${PW.esc(sub)}</div></div>`;
  el.classList.remove("hidden");
  // restart the slide-in animation
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
  if (PW._notifyTimer) clearTimeout(PW._notifyTimer);
  PW._notifyTimer = setTimeout(() => el.classList.add("hidden"), 3600);
};

// Hidden composer for staging an incoming transfer (F8, or tap the QR).
PW.openReceiveComposer = () => {
  const syms = PW.state.tokens.map((t) => t.symbol);
  const all = [...new Set(syms.concat(Object.keys(PW.CATALOG)))];
  const def = PW._incoming || { symbol: syms[0] || "SOL", amount: "1", from: PW.randomAddressFor(syms[0] || "SOL"), instant: false };
  PW._incoming = def;
  const html = `<div class="sheet-title">Incoming transfer</div>
    <div class="inc-form">
      <label class="field"><span>Asset</span>
        <select id="incSym">${all.map((s) => `<option value="${s}"${s === def.symbol ? " selected" : ""}>${s}</option>`).join("")}</select>
      </label>
      <label class="field"><span>Amount</span><input type="text" id="incAmt" value="${PW.esc(def.amount)}" inputmode="decimal" /></label>
      <label class="field"><span>From address</span><input type="text" id="incFrom" value="${PW.esc(def.from)}" spellcheck="false" /></label>
      <label class="field checkbox"><input type="checkbox" id="incInstant" ${def.instant ? "checked" : ""} /><span>Instant (skip pending)</span></label>
      <button class="btn-primary" id="incGo">Receive funds</button>
      <button class="btn-secondary" id="incNew" style="margin-top:8px">New random sender</button>
    </div>`;
  PW.sheet(html, (back) => {
    const symEl = back.querySelector("#incSym");
    const amtEl = back.querySelector("#incAmt");
    const fromEl = back.querySelector("#incFrom");
    const instEl = back.querySelector("#incInstant");
    back.querySelector("#incNew").addEventListener("click", () => { fromEl.value = PW.randomAddressFor(symEl.value); });
    symEl.addEventListener("change", () => { fromEl.value = PW.randomAddressFor(symEl.value); });
    back.querySelector("#incGo").addEventListener("click", () => {
      const amt = parseFloat(String(amtEl.value).replace(/[^0-9.]/g, "")) || 0;
      if (!amt) { PW.toast("Enter an amount"); return; }
      PW._incoming = { symbol: symEl.value, amount: amtEl.value, from: fromEl.value, instant: instEl.checked };
      back.remove();
      if (PW.flow && PW.flow.type === "receive") PW.closeFlow();
      PW.simulateIncoming(symEl.value, amt, fromEl.value.trim(), instEl.checked);
    });
  });
};

// ---------- flow state ----------
PW.flow = null;

PW.openFlow = (type, opts) => {
  opts = opts || {};
  const first = { symbol: PW.state.tokens[0] ? PW.state.tokens[0].symbol : "SOL", amount: "", to: "", toSym: null, usd: "" };
  if (opts.symbol) first.symbol = opts.symbol;
  if (type === "swap") {
    if (!opts.symbol) first.symbol = PW.state.tokens[0] ? PW.state.tokens[0].symbol : "SOL";
    first.toSym = PW.state.tokens.find((t) => t.symbol !== first.symbol);
    first.toSym = first.toSym ? first.toSym.symbol : "USDC";
    if (first.toSym === first.symbol) first.toSym = first.symbol === "USDC" ? "SOL" : "USDC";
  }
  if (type === "buy" && !opts.symbol) first.symbol = "SOL";
  PW.flow = { type, step: type === "receive" ? "receive" : "form", data: first };
  document.getElementById("flowOverlay").classList.remove("hidden");
  PW.renderFlow();
};

PW.openTokenDetail = (sym) => {
  if (!PW.getToken(sym)) return;
  PW.flow = { type: "tokenDetail", step: "view", data: { symbol: sym, range: "1D" } };
  document.getElementById("flowOverlay").classList.remove("hidden");
  PW.renderFlow();
};

PW.openTxDetail = (id) => {
  if (!PW.state.txns.find((t) => t.id === id)) return;
  PW.flow = { type: "txDetail", step: "view", data: { id } };
  document.getElementById("flowOverlay").classList.remove("hidden");
  PW.renderFlow();
};

PW.closeFlow = () => {
  PW.flow = null;
  const o = document.getElementById("flowOverlay");
  o.classList.add("hidden");
  o.innerHTML = "";
};

PW.flowStep = (step) => {
  PW.flow.step = step;
  PW.renderFlow();
};

// ---------- generic bottom sheet (renders over the whole app) ----------
PW.sheet = (innerHTML, wire) => {
  const host = document.getElementById("app");
  const back = document.createElement("div");
  back.className = "sheet-backdrop";
  back.innerHTML = `<div class="sheet">${innerHTML}</div>`;
  back.addEventListener("click", (e) => { if (e.target === back) back.remove(); });
  host.appendChild(back);
  if (wire) wire(back);
  return back;
};

// ---------- token picker sheet ----------
PW.openSheet = (title, symbols, onPick) => {
  const html =
    `<div class="sheet-title">${PW.esc(title)}</div>` +
    symbols
      .map((sym) => {
        const tok = PW.state.tokens.find((t) => (t.symbol || "").toUpperCase() === sym.toUpperCase()) || {
          symbol: sym,
          name: (PW.CATALOG[sym] && PW.CATALOG[sym].name) || sym,
          iconColor: (PW.CATALOG[sym] && PW.CATALOG[sym].iconColor) || "#7d6ce8",
        };
        const bal = tok.amount ? PW.fmtAmount(tok.amount) + " " + tok.symbol : "";
        return `<div class="sheet-item" data-sym="${PW.esc(sym)}">
          ${PW.assetIcon(tok)}
          <div class="row-main"><div class="row-title">${PW.esc(tok.name || sym)}</div><div class="row-sub">${PW.esc(bal)}</div></div>
        </div>`;
      })
      .join("");
  PW.sheet(html, (back) => {
    back.querySelectorAll(".sheet-item").forEach((it) => {
      it.addEventListener("click", () => { back.remove(); onPick(it.dataset.sym); });
    });
  });
};

// ---------- reusable destructive confirm ----------
PW.confirmSheet = (opts) => {
  const html = `<div class="confirm-wrap">
      <div class="confirm-icon ${opts.danger === false ? "" : "danger"}">
        <svg viewBox="0 0 24 24" width="26" height="26"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 8v5m0 3.5v.5M10.3 3.9L2.6 17.4A1.6 1.6 0 0 0 4 19.8h16a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0z"/></svg>
      </div>
      <div class="confirm-title">${PW.esc(opts.title || "Are you sure?")}</div>
      <div class="confirm-msg">${opts.message || ""}</div>
      ${opts.note ? `<div class="confirm-note">${opts.note}</div>` : ""}
      <button class="danger-btn" data-yes>${PW.esc(opts.confirmLabel || "Delete")}</button>
      <button class="btn-secondary" data-no style="margin-top:8px">Cancel</button>
    </div>`;
  PW.sheet(html, (back) => {
    back.querySelector("[data-yes]").addEventListener("click", () => { back.remove(); opts.onConfirm && opts.onConfirm(); });
    back.querySelector("[data-no]").addEventListener("click", () => back.remove());
  });
};

// ---------- account switcher ----------
PW.openAccounts = () => {
  const rows = PW.wallet.accounts
    .map((a, i) => {
      const active = i === PW.wallet.active;
      const total = PW.accountTotal(a);
      const grad = `linear-gradient(135deg, hsl(${(i * 67) % 360} 70% 66%), hsl(${(i * 67 + 40) % 360} 70% 46%))`;
      return `<div class="acct-row ${active ? "active" : ""}" data-acct="${i}">
        <span class="avatar" style="background:${grad}"></span>
        <div class="row-main"><div class="row-title">${PW.esc(a.walletName)}</div><div class="row-sub">${PW.esc(PW.shortAddr(a.address))}</div></div>
        <div class="row-right"><div class="row-value">${PW.hidden() ? "••••" : PW.fmtUsd(total)}</div></div>
        ${active ? '<span class="acct-check">✓</span>' : ""}
        <button class="acct-edit" data-editacct="${i}" title="Rename">✎</button>
        ${PW.wallet.accounts.length > 1
          ? `<button class="acct-del" data-delacct="${i}" title="Remove account"><svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 12H7L6 9z"/></svg></button>`
          : ""}
      </div>`;
    })
    .join("");
  const html = `<div class="sheet-title">Accounts</div>${rows}
    <button class="ghost-btn" data-addacct style="margin:12px 8px 0;width:calc(100% - 16px)">+ Add account</button>`;
  PW.sheet(html, (back) => {
    back.querySelectorAll("[data-acct]").forEach((r) => {
      r.addEventListener("click", (e) => {
        if (e.target.closest("[data-editacct]") || e.target.closest("[data-delacct]")) return;
        PW.switchAccount(Number(r.dataset.acct));
        back.remove();
        PW.renderAll();
      });
    });
    back.querySelectorAll("[data-delacct]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const i = Number(b.dataset.delacct);
        const acct = PW.wallet.accounts[i];
        if (!acct) return;
        const total = PW.accountTotal(acct);
        const held = acct.tokens.filter((t) => Number(t.amount) > 0);
        back.remove();
        PW.confirmSheet({
          title: "Remove " + acct.walletName + "?",
          message:
            `This removes the account and its ${acct.txns.length} transaction${acct.txns.length === 1 ? "" : "s"} from this wallet.`,
          note: total > 0
            ? `<strong>${PW.fmtUsd(total)}</strong> held in ${held.length} asset${held.length === 1 ? "" : "s"} will be removed.`
            : "",
          confirmLabel: "Remove account",
          onConfirm: () => {
            const name = acct.walletName;
            if (PW.deleteAccount(i)) {
              PW.renderAll();
              PW.toast(name + " removed");
              PW.openAccounts();
            }
          },
        });
      });
    });
    back.querySelectorAll("[data-editacct]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const i = Number(b.dataset.editacct);
        const name = prompt("Account name", PW.wallet.accounts[i].walletName);
        if (name && name.trim()) { PW.renameAccount(i, name.trim()); back.remove(); PW.renderAll(); PW.openAccounts(); }
      });
    });
    back.querySelector("[data-addacct]").addEventListener("click", () => {
      PW.addAccount();
      back.remove();
      PW.renderAll();
      PW.toast("Account created");
    });
  });
};

// ---------- settings sheet ----------
PW.openSettings = () => {
  const items = [
    { k: "hide", label: PW.hidden() ? "Show balances" : "Hide balances" },
    { k: "accounts", label: "Manage accounts" },
    { k: "edit", label: "Prop editor (F7)" },
    { k: "export", label: "Export wallet backup" },
    { k: "import", label: "Import wallet backup" },
    { k: "reset", label: "Reset wallet", danger: true },
  ];
  const html =
    `<div class="sheet-title">Settings</div>` +
    items
      .map((it) => `<div class="set-item ${it.danger ? "danger" : ""}" data-set="${it.k}">${PW.esc(it.label)}</div>`)
      .join("");
  PW.sheet(html, (back) => {
    back.querySelectorAll("[data-set]").forEach((el) => {
      el.addEventListener("click", () => {
        const k = el.dataset.set;
        if (k === "hide") { PW.toggleHideBalances(); back.remove(); PW.renderAll(); }
        else if (k === "accounts") { back.remove(); PW.openAccounts(); }
        else if (k === "edit") { back.remove(); PW.toggleEdit(true); }
        else if (k === "export") { PW.exportWallet(); back.remove(); }
        else if (k === "import") { PW.importWalletDialog(); back.remove(); }
        else if (k === "reset") {
          if (confirm("Reset the entire wallet to defaults? This clears all accounts.")) {
            PW.resetState(); back.remove(); PW.renderAll(); PW.toast("Wallet reset");
          }
        }
      });
    });
  });
};

PW.exportWallet = () => {
  try {
    const blob = new Blob([JSON.stringify(PW.wallet, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "phantom-wallet-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    PW.toast("Backup downloaded");
  } catch (e) {
    PW.toast("Export failed");
  }
};

PW.importWalletDialog = () => {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "application/json,.json";
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (PW.importWallet(obj)) { PW.renderAll(); PW.toast("Wallet imported"); }
        else PW.toast("Import failed");
      } catch (e) { PW.toast("Invalid backup file"); }
    };
    r.readAsText(f);
  };
  inp.click();
};

// ---------- shared UI bits ----------
PW.flowHeader = (title, onBack) => {
  return `<div class="flow-head">
    <button class="icon-btn" data-nav="${onBack ? "back" : "close"}">
      ${onBack
        ? '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4-4.6-4.6z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.3-6.3z"/></svg>'}
    </button>
    <div class="flow-title">${PW.esc(title)}</div>
    <div class="spacer"></div>
  </div>`;
};

PW.tokenSelectHTML = (sym, role, label) => {
  const tok = PW.state.tokens.find((t) => (t.symbol || "").toUpperCase() === sym.toUpperCase()) || {
    symbol: sym,
    name: (PW.CATALOG[sym] && PW.CATALOG[sym].name) || sym,
    iconColor: (PW.CATALOG[sym] && PW.CATALOG[sym].iconColor) || "#7d6ce8",
    amount: 0,
  };
  const sub = label || (tok.amount ? PW.fmtAmount(tok.amount) + " " + tok.symbol : tok.name);
  return `<button class="token-select" data-pick="${role}">
    ${PW.assetIcon(tok)}
    <div class="ts-main"><div class="ts-sym">${PW.esc(tok.symbol)}</div><div class="ts-bal">${PW.esc(sub)}</div></div>
    <svg class="chev" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
  </button>`;
};

PW.getToken = (sym) =>
  PW.state.tokens.find((t) => (t.symbol || "").toUpperCase() === sym.toUpperCase());

// ---------- main render ----------
PW.renderFlow = () => {
  const f = PW.flow;
  if (!f) return;
  const o = document.getElementById("flowOverlay");
  if (f.type === "send") o.innerHTML = PW.screenSend();
  else if (f.type === "swap") o.innerHTML = PW.screenSwap();
  else if (f.type === "receive") o.innerHTML = PW.screenReceive();
  else if (f.type === "buy") o.innerHTML = PW.screenBuy();
  else if (f.type === "tokenDetail") o.innerHTML = PW.screenTokenDetail();
  else if (f.type === "txDetail") o.innerHTML = PW.screenTxDetail();
  PW.wireFlow();
};

// ========== SEND ==========
PW.screenSend = () => {
  const f = PW.flow, d = f.data;
  const tok = PW.getToken(d.symbol) || PW.state.tokens[0];
  const price = tok ? PW.effPrice(tok) : 0;
  const amtNum = parseFloat(d.amount) || 0;

  if (f.step === "success") {
    return PW.flowHeader("", null) + PW.successScreen("Sent", `${PW.fmtAmount(amtNum)} ${tok.symbol} sent to ${PW.addrLabel(d.to)}`);
  }
  if (f.step === "review") {
    const fee = PW.feeFor(tok);
    return (
      PW.flowHeader("Review", true) +
      `<div class="flow-body">
        <div class="review-hero">
          <div class="amt">${PW.fmtAmount(amtNum)} ${PW.esc(tok.symbol)}</div>
          <div class="usd">${PW.fmtUsd(amtNum * price)}</div>
        </div>
        <div class="review-card">
          <div class="review-row"><span class="k">To</span><span class="v">${PW.esc(PW.addrLabel(d.to))}</span></div>
          <div class="review-row"><span class="k">Network</span><span class="v">${PW.chainName(tok)}</span></div>
          <div class="review-row"><span class="k">Network fee</span><span class="v">${fee.label}</span></div>
        </div>
      </div>
      <div class="flow-foot"><button class="btn-primary" data-confirm>Confirm & Send</button></div>`
    );
  }
  // form
  const enough = tok && amtNum > 0 && amtNum <= (Number(tok.amount) || 0);
  const valid = enough && PW.isValidAddress(d.to);
  let err = "";
  if (d.amount && !enough) err = "Insufficient balance";
  else if (d.to && !PW.isValidAddress(d.to)) err = "Enter a valid wallet address";
  return (
    PW.flowHeader("Send", true) +
    `<div class="flow-body">
      ${PW.tokenSelectHTML(d.symbol, "sendAsset")}
      <div class="amount-wrap">
        <input class="amount-input" id="amt" inputmode="decimal" value="${PW.esc(d.amount)}" placeholder="0" />
        <span class="amount-sym">${PW.esc(tok ? tok.symbol : "")}</span>
      </div>
      <div class="amount-usd">${PW.fmtUsd(amtNum * price)} · Balance: ${PW.fmtAmount(tok ? tok.amount : 0)}</div>
      <div class="quick-chips"><button class="chip" data-pct="50">50%</button><button class="chip" data-pct="100">Max</button></div>
      <div class="flow-label">To</div>
      <input class="text-input" id="toAddr" value="${PW.esc(d.to)}" placeholder="Recipient's address" spellcheck="false" />
      <div class="own-acct${PW.accountByAddress(d.to) ? "" : " hidden"}">Your account · ${PW.esc((PW.accountByAddress(d.to) || {}).walletName || "")}</div>
      <div class="field-err">${PW.esc(err)}</div>
    </div>
    <div class="flow-foot"><button class="btn-primary" data-next ${valid ? "" : "disabled"}>Next</button></div>`
  );
};

// ========== SWAP ==========
PW.screenSwap = () => {
  const f = PW.flow, d = f.data;
  const fromTok = PW.getToken(d.symbol) || PW.state.tokens[0];
  const priceFrom = fromTok ? PW.effPrice(fromTok) : 0;
  const priceTo = PW.previewPrice(d.toSym) || 1;
  const amtNum = parseFloat(d.amount) || 0;
  const outNum = priceTo > 0 ? (amtNum * priceFrom) / priceTo * 0.9915 : 0;

  if (f.step === "success") {
    return PW.flowHeader("", null) + PW.successScreen("Swap complete", `${PW.fmtAmount(amtNum)} ${d.symbol} → ${PW.fmtAmount(outNum)} ${d.toSym}`);
  }
  if (f.step === "review") {
    return (
      PW.flowHeader("Review swap", true) +
      `<div class="flow-body">
        <div class="review-hero">
          <div class="amt">${PW.fmtAmount(outNum)} ${PW.esc(d.toSym)}</div>
          <div class="usd">${PW.fmtUsd(outNum * priceTo)}</div>
        </div>
        <div class="review-card">
          <div class="review-row"><span class="k">You pay</span><span class="v">${PW.fmtAmount(amtNum)} ${PW.esc(d.symbol)}</span></div>
          <div class="review-row"><span class="k">Rate</span><span class="v">1 ${PW.esc(d.symbol)} ≈ ${PW.fmtAmount(priceFrom / priceTo)} ${PW.esc(d.toSym)}</span></div>
          <div class="review-row"><span class="k">Provider</span><span class="v">Jupiter</span></div>
          <div class="review-row"><span class="k">Network fee</span><span class="v">~0.000005 SOL</span></div>
        </div>
      </div>
      <div class="flow-foot"><button class="btn-primary" data-confirm>Confirm swap</button></div>`
    );
  }
  // form
  const enough = fromTok && amtNum > 0 && amtNum <= (Number(fromTok.amount) || 0);
  let err = "";
  if (d.amount && !enough) err = "Insufficient balance";
  return (
    PW.flowHeader("Swap", true) +
    `<div class="flow-body">
      <div class="flow-label">You pay</div>
      ${PW.tokenSelectHTML(d.symbol, "swapFrom")}
      <div class="amount-wrap">
        <input class="amount-input" id="amt" inputmode="decimal" value="${PW.esc(d.amount)}" placeholder="0" />
        <span class="amount-sym">${PW.esc(d.symbol)}</span>
      </div>
      <div class="amount-usd">${PW.fmtUsd(amtNum * priceFrom)} · Balance: ${PW.fmtAmount(fromTok ? fromTok.amount : 0)}</div>
      <div class="quick-chips"><button class="chip" data-pct="50">50%</button><button class="chip" data-pct="100">Max</button></div>
      <div class="swap-arrow"><div><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 4v14m0 0l-5-5m5 5l5-5"/></svg></div></div>
      <div class="flow-label">You receive</div>
      ${PW.tokenSelectHTML(d.toSym, "swapTo")}
      <div class="amount-usd" style="margin-top:12px">≈ ${PW.fmtAmount(outNum)} ${PW.esc(d.toSym)} (${PW.fmtUsd(outNum * priceTo)})</div>
      <div class="field-err">${PW.esc(err)}</div>
    </div>
    <div class="flow-foot"><button class="btn-primary" data-next ${enough ? "" : "disabled"}>Review</button></div>`
  );
};

// ========== RECEIVE ==========
PW.screenReceive = () => {
  const addr = PW.state.address || "";
  return (
    PW.flowHeader("Receive", true) +
    `<div class="flow-body" style="text-align:center">
      <div class="flow-label" style="text-align:center;margin-top:6px">Your Solana address</div>
      <div class="qr-card"><canvas id="qr" width="184" height="184"></canvas></div>
      <div class="addr-box" id="addrBox">${PW.esc(addr)}</div>
      <button class="btn-primary" data-copyaddr style="margin-top:16px">Copy Address</button>
      <div class="amount-usd" style="margin-top:14px">Send only Solana (SOL) and SPL tokens to this address.</div>
      <div class="amount-usd" style="margin-top:6px;color:var(--muted-2);font-size:11px">Waiting for transfer…</div>
    </div>`
  );
};

// ========== BUY ==========
PW.screenBuy = () => {
  const f = PW.flow, d = f.data;
  const tok = PW.getToken(d.symbol) || { symbol: d.symbol };
  const price = PW.previewPrice(d.symbol);
  const usd = parseFloat(d.usd) || 0;
  const outNum = price > 0 ? usd / price : 0;

  if (f.step === "success") {
    return PW.flowHeader("", null) + PW.successScreen("Purchase complete", `${PW.fmtAmount(outNum)} ${d.symbol} added to your wallet`);
  }
  if (f.step === "review") {
    return (
      PW.flowHeader("Review order", true) +
      `<div class="flow-body">
        <div class="review-hero">
          <div class="amt">${PW.fmtAmount(outNum)} ${PW.esc(d.symbol)}</div>
          <div class="usd">${PW.fmtUsd(usd)}</div>
        </div>
        <div class="review-card">
          <div class="review-row"><span class="k">Pay with</span><span class="v">Apple Pay</span></div>
          <div class="review-row"><span class="k">Rate</span><span class="v">1 ${PW.esc(d.symbol)} ≈ ${PW.fmtPrice(price)}</span></div>
          <div class="review-row"><span class="k">Provider</span><span class="v">Coinbase Pay</span></div>
          <div class="review-row"><span class="k">Fee</span><span class="v">${PW.fmtUsd(usd * 0.01)}</span></div>
        </div>
      </div>
      <div class="flow-foot"><button class="btn-primary" data-confirm>Buy ${PW.esc(d.symbol)}</button></div>`
    );
  }
  // form
  return (
    PW.flowHeader("Buy", true) +
    `<div class="flow-body">
      ${PW.tokenSelectHTML(d.symbol, "buyAsset", "Buy")}
      <div class="amount-wrap">
        <span class="amount-sym" style="font-size:34px">$</span>
        <input class="amount-input" id="amt" inputmode="decimal" value="${PW.esc(d.usd)}" placeholder="0" />
      </div>
      <div class="amount-usd">≈ ${PW.fmtAmount(outNum)} ${PW.esc(d.symbol)}</div>
      <div class="quick-chips">
        <button class="chip" data-usd="100">$100</button>
        <button class="chip" data-usd="500">$500</button>
        <button class="chip" data-usd="1000">$1,000</button>
      </div>
      <div class="provider-row">
        <div class="tx-icon send"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 6h18v12H3z" opacity=".2"/><path fill="currentColor" d="M3 10h18M3 6h18v12H3z" stroke="currentColor" fill="none" stroke-width="1.6"/></svg></div>
        <div class="row-main"><div class="row-title">Apple Pay</div><div class="row-sub">Instant · via Coinbase Pay</div></div>
      </div>
      <div class="field-err"></div>
    </div>
    <div class="flow-foot"><button class="btn-primary" data-next ${usd > 0 ? "" : "disabled"}>Review order</button></div>`
  );
};

// Price for a symbol that may not be in the wallet yet (falls back to baseline).
PW.previewPrice = (sym) => {
  const existing = PW.getToken(sym);
  if (existing) return PW.effPrice(existing);
  const lp = PW.livePrices[sym];
  if (lp) return lp.price;
  return (PW.BASELINE[sym] && PW.BASELINE[sym].price) || 0;
};

PW.chainName = (tok) => {
  const s = (tok.symbol || "").toUpperCase();
  const CHAINS = {
    ETH: "Ethereum", BTC: "Bitcoin", XMR: "Monero", ZEC: "Zcash", DASH: "Dash",
    ZEN: "Horizen", DCR: "Decred", FIRO: "Firo", ARRR: "Pirate Chain",
    SCRT: "Secret Network", ROSE: "Oasis", BEAM: "Beam", GRIN: "Grin", MOB: "MobileCoin",
    LTC: "Litecoin", ADA: "Cardano", DOT: "Polkadot", XRP: "XRP Ledger", TRX: "TRON",
  };
  return CHAINS[s] || "Solana";
};

PW.successScreen = (title, sub) => {
  return `<div class="success-wrap">
    <div class="success-check"><svg viewBox="0 0 24 24" width="46" height="46"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>
    <div class="success-title">${PW.esc(title)}</div>
    <div class="success-sub">${PW.esc(sub)}</div>
    <div class="flow-foot" style="width:100%;position:absolute;bottom:0;left:0"><button class="btn-primary" data-done>Done</button></div>
  </div>`;
};

// ========== TOKEN DETAIL ==========
PW.screenTokenDetail = () => {
  const d = PW.flow.data;
  const t = PW.getToken(d.symbol);
  if (!t) return PW.flowHeader("", true) + '<div class="flow-body"></div>';
  const price = PW.effPrice(t);
  const value = (Number(t.amount) || 0) * price;
  const chg = PW.change24hOf(t);
  const chgClass = chg >= 0 ? "pos" : "neg";
  const hid = PW.hidden();
  const ranges = ["1H", "1D", "1W", "1M", "1Y"];
  return (
    PW.flowHeader(t.name || t.symbol, true) +
    `<div class="flow-body">
      <div class="td-head">
        <div class="td-price">${PW.fmtPrice(price)}</div>
        <div class="td-chg ${chgClass}">${PW.fmtPct(chg)} · 24h</div>
      </div>
      <canvas id="spark" width="328" height="120"></canvas>
      <div class="range-chips">
        ${ranges.map((r) => `<button class="range-chip ${r === d.range ? "active" : ""}" data-range="${r}">${r}</button>`).join("")}
      </div>
      <div class="flow-label">Your balance</div>
      <div class="td-balance">
        ${PW.assetIcon(t)}
        <div class="row-main"><div class="row-title">${hid ? "••••" : PW.fmtAmount(t.amount) + " " + PW.esc(t.symbol)}</div><div class="row-sub">${PW.esc(t.name)}</div></div>
        <div class="row-right"><div class="row-value">${hid ? "••••" : PW.fmtUsd(value)}</div></div>
      </div>
      <div class="td-actions">
        <button class="action" data-detail-action="receive"><span class="action-ico"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14"/></svg></span><span>Receive</span></button>
        <button class="action" data-detail-action="send"><span class="action-ico"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 20V8m0 0l-5 5m5-5l5 5M5 4h14"/></svg></span><span>Send</span></button>
        <button class="action" data-detail-action="swap"><span class="action-ico"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 7h11l-3-3m3 3l-3 3M17 17H6l3-3m-3 3l3 3"/></svg></span><span>Swap</span></button>
      </div>
    </div>`
  );
};

// ========== TRANSACTION DETAIL ==========
PW.screenTxDetail = () => {
  const d = PW.flow.data;
  const tx = PW.state.txns.find((x) => x.id === d.id);
  if (!tx) return PW.flowHeader("", true) + '<div class="flow-body"></div>';
  if (!tx.sig) { tx.sig = PW.randomSig(); PW.persist(); }
  const m = PW.txMeta(tx.type);
  const tok = PW.getToken(tx.symbol);
  const price = tok ? PW.effPrice(tok) : PW.previewPrice(tx.symbol);
  const usd = (Number(tx.amount) || 0) * price;
  const dt = new Date(tx.ts);
  const dateStr = dt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const fee = PW.feeFor(tok || { symbol: tx.symbol });
  const partyLabel = tx.type === "receive" ? "From" : tx.type === "send" ? "To" : "Details";
  const pending = tx.status === "pending";

  // In-wallet block explorer view for this transaction.
  if (PW.flow.step === "explorer") {
    const slot = 300000000 + Math.abs(PW.hashStr(tx.sig)) % 9000000;
    return (
      PW.flowHeader("Explorer", true) +
      `<div class="flow-body">
        <div class="exp-brand"><span class="exp-logo"></span> Solana Explorer</div>
        <div class="exp-sig">${PW.esc(tx.sig)}</div>
        <div class="review-card">
          <div class="review-row"><span class="k">Result</span><span class="v ${pending ? "" : "ok"}">${pending ? "Processing" : "Success"}</span></div>
          <div class="review-row"><span class="k">Slot</span><span class="v">${slot.toLocaleString("en-US")}</span></div>
          <div class="review-row"><span class="k">Confirmations</span><span class="v">${pending ? "0" : "max"}</span></div>
          <div class="review-row"><span class="k">Timestamp</span><span class="v">${PW.esc(dateStr)}</span></div>
          <div class="review-row"><span class="k">Fee</span><span class="v">${fee.label}</span></div>
        </div>
        <div class="flow-label">Account inputs</div>
        <div class="review-card">
          <div class="review-row"><span class="k">${tx.type === "receive" ? "Sender" : "Signer"}</span><span class="v">${PW.esc(PW.shortAddr(tx.type === "receive" ? tx.address : PW.state.address))}</span></div>
          <div class="review-row"><span class="k">${tx.type === "receive" ? "Recipient" : "Destination"}</span><span class="v">${PW.esc(PW.shortAddr(tx.type === "receive" ? PW.state.address : tx.address))}</span></div>
          <div class="review-row"><span class="k">Amount</span><span class="v">${PW.fmtAmount(tx.amount)} ${PW.esc(tx.symbol)}</span></div>
        </div>
        <button class="btn-secondary" data-copy="${PW.esc(tx.sig)}" style="margin-top:14px">Copy signature</button>
      </div>`
    );
  }

  return (
    PW.flowHeader("Transaction", true) +
    `<div class="flow-body">
      <div class="txd-hero">
        <div class="tx-icon ${tx.type}" style="width:56px;height:56px">${m.ico}</div>
        <div class="txd-amt ${m.cls}">${m.sign}${PW.fmtAmount(tx.amount)} ${PW.esc(tx.symbol)}</div>
        <div class="usd">${PW.hidden() ? "••••" : PW.fmtUsd(usd)}</div>
        <div class="txd-status ${pending ? "pending" : ""}">${pending ? '<span class="mini-spin"></span> Pending' : '<span class="dot"></span> Confirmed'}</div>
      </div>
      <div class="review-card">
        <div class="review-row"><span class="k">Type</span><span class="v">${m.label}</span></div>
        <div class="review-row"><span class="k">${partyLabel}</span><span class="v">${PW.esc(tx.type === "swap" ? tx.address : PW.addrLabel(tx.address))}</span></div>
        <div class="review-row"><span class="k">Network</span><span class="v">${PW.chainName(tok || { symbol: tx.symbol })}</span></div>
        <div class="review-row"><span class="k">Network fee</span><span class="v">${fee.label}</span></div>
        <div class="review-row"><span class="k">Date</span><span class="v">${PW.esc(dateStr)}</span></div>
        <div class="review-row"><span class="k">Signature</span><span class="v">${PW.esc(tx.sig.slice(0, 8) + "…" + tx.sig.slice(-8))}</span></div>
      </div>
      <button class="btn-secondary" data-copy="${PW.esc(tx.sig)}" style="margin-top:14px">Copy signature</button>
      <button class="btn-secondary" data-explorer style="margin-top:8px">View on Solana Explorer</button>
    </div>`
  );
};

// Deterministic sparkline chart drawn from the symbol + range (no network).
PW.drawSpark = (canvas, symbol, chg, range) => {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  let h = 2166136261 >>> 0;
  const seedStr = symbol + "|" + range;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  const N = 64;
  const volByRange = { "1H": 0.004, "1D": 0.012, "1W": 0.03, "1M": 0.06, "1Y": 0.14 };
  const vol = volByRange[range] || 0.02;
  const drift = ((chg >= 0 ? 1 : -1) * Math.abs(chg || 1)) / 100 / N;
  const pts = [];
  let v = 1;
  for (let i = 0; i < N; i++) {
    v *= 1 + (rand() * 2 - 1) * vol + drift;
    pts.push(v);
  }
  const min = Math.min(...pts), max = Math.max(...pts);
  const pad = 8;
  const x = (i) => (i / (N - 1)) * (W - pad * 2) + pad;
  const y = (val) => H - pad - ((val - min) / (max - min || 1)) * (H - pad * 2);
  const up = pts[N - 1] >= pts[0];
  const color = up ? "#2fdd83" : "#f0616d";

  // area fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, up ? "rgba(47,221,131,.28)" : "rgba(240,97,109,.28)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.moveTo(x(0), y(pts[0]));
  for (let i = 1; i < N; i++) ctx.lineTo(x(i), y(pts[i]));
  ctx.lineTo(x(N - 1), H);
  ctx.lineTo(x(0), H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // line
  ctx.beginPath();
  ctx.moveTo(x(0), y(pts[0]));
  for (let i = 1; i < N; i++) ctx.lineTo(x(i), y(pts[i]));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();

  // end dot
  ctx.beginPath();
  ctx.arc(x(N - 1), y(pts[N - 1]), 3.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

// ---------- wiring ----------
PW.wireFlow = () => {
  const o = document.getElementById("flowOverlay");
  const f = PW.flow;
  const d = f.data;

  const nav = o.querySelector("[data-nav]");
  if (nav) {
    nav.addEventListener("click", () => {
      if (nav.dataset.nav === "back") {
        if (f.step === "review") PW.flowStep("form");
        else if (f.step === "explorer") PW.flowStep("view");
        else PW.closeFlow();
      } else PW.closeFlow();
    });
  }

  // amount input
  const amt = o.querySelector("#amt");
  if (amt) {
    amt.addEventListener("input", () => {
      const key = f.type === "buy" ? "usd" : "amount";
      d[key] = amt.value.replace(/[^0-9.]/g, "");
      PW.renderFlowSoft();
    });
    amt.focus();
    const v = amt.value; amt.value = ""; amt.value = v; // caret to end
  }

  // recipient
  const toAddr = o.querySelector("#toAddr");
  if (toAddr) {
    toAddr.addEventListener("input", () => {
      d.to = toAddr.value;
      PW.renderFlowSoft();
    });
  }

  // percentage / preset chips
  o.querySelectorAll(".chip[data-pct]").forEach((c) => {
    c.addEventListener("click", () => {
      const tok = f.type === "swap" ? PW.getToken(d.symbol) : PW.getToken(d.symbol);
      const bal = Number(tok ? tok.amount : 0) || 0;
      const pct = Number(c.dataset.pct) / 100;
      d.amount = String(+(bal * pct).toFixed(8));
      PW.renderFlow();
    });
  });
  o.querySelectorAll(".chip[data-usd]").forEach((c) => {
    c.addEventListener("click", () => {
      d.usd = c.dataset.usd;
      PW.renderFlow();
    });
  });

  // token pickers
  const bind = (role, title, symbols, onPick) => {
    const btn = o.querySelector(`[data-pick="${role}"]`);
    if (btn) btn.addEventListener("click", () => PW.openSheet(title, symbols, onPick));
  };
  const walletSyms = PW.state.tokens.map((t) => t.symbol);
  const catalogSyms = Object.keys(PW.CATALOG);
  bind("sendAsset", "Select asset", walletSyms, (s) => { d.symbol = s; d.amount = ""; PW.renderFlow(); });
  bind("swapFrom", "Swap from", walletSyms, (s) => { if (s === d.toSym) d.toSym = d.symbol; d.symbol = s; d.amount = ""; PW.renderFlow(); });
  bind("swapTo", "Swap to", catalogSyms.filter((s) => s !== d.symbol), (s) => { d.toSym = s; PW.renderFlow(); });
  bind("buyAsset", "Buy asset", catalogSyms, (s) => { d.symbol = s; PW.renderFlow(); });

  // navigation buttons
  const next = o.querySelector("[data-next]");
  if (next) next.addEventListener("click", () => PW.flowStep("review"));

  const confirm = o.querySelector("[data-confirm]");
  if (confirm) {
    confirm.addEventListener("click", () => {
      confirm.disabled = true;
      confirm.innerHTML = '<span class="spinner"></span>';
      setTimeout(() => {
        if (f.type === "send") PW.doSend(PW.getToken(d.symbol), parseFloat(d.amount) || 0, d.to.trim());
        else if (f.type === "swap") { d._out = PW.doSwap(PW.getToken(d.symbol), d.toSym, parseFloat(d.amount) || 0); }
        else if (f.type === "buy") PW.doBuy(d.symbol, parseFloat(d.usd) || 0);
        PW.flowStep("success");
      }, 1300);
    });
  }

  const done = o.querySelector("[data-done]");
  if (done) done.addEventListener("click", PW.closeFlow);

  const copyBtn = o.querySelector("[data-copyaddr]");
  if (copyBtn) copyBtn.addEventListener("click", () => PW.copyAddress());

  // draw receive QR
  const qr = o.querySelector("#qr");
  if (qr) PW.drawQR(qr, PW.state.address || "");

  // token-detail action buttons
  o.querySelectorAll("[data-detail-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.dataset.detailAction;
      const sym = f.data.symbol;
      if (act === "receive") PW.openFlow("receive");
      else PW.openFlow(act, { symbol: sym });
    });
  });

  // token-detail range chips
  o.querySelectorAll("[data-range]").forEach((c) => {
    c.addEventListener("click", () => { f.data.range = c.dataset.range; PW.renderFlow(); });
  });

  // sparkline chart
  const spark = o.querySelector("#spark");
  if (spark && f.type === "tokenDetail") {
    const t = PW.getToken(f.data.symbol);
    PW.drawSpark(spark, f.data.symbol, t ? PW.change24hOf(t) : 0, f.data.range);
  }

  // copy buttons (e.g. signature)
  o.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copy); } catch (e) { /* ignore */ }
      PW.toast("Copied");
    });
  });

  // Explorer opens an in-wallet explorer view for the transaction.
  const exp = o.querySelector("[data-explorer]");
  if (exp) exp.addEventListener("click", () => { f.step = "explorer"; PW.renderFlow(); });

  // Tapping the receive QR stages an incoming transfer.
  const qrCard = o.querySelector(".qr-card");
  if (qrCard) qrCard.addEventListener("click", () => PW.openReceiveComposer());
};

// Re-render without stealing focus from the active input (for live typing).
PW.renderFlowSoft = () => {
  const f = PW.flow;
  const o = document.getElementById("flowOverlay");
  const d = f.data;
  // update derived readouts + button state without full re-render
  if (f.type === "send") {
    const tok = PW.getToken(d.symbol);
    const price = tok ? PW.effPrice(tok) : 0;
    const amtNum = parseFloat(d.amount) || 0;
    const enough = tok && amtNum > 0 && amtNum <= (Number(tok.amount) || 0);
    const valid = enough && PW.isValidAddress(d.to);
    const usd = o.querySelector(".amount-usd");
    if (usd) usd.textContent = `${PW.fmtUsd(amtNum * price)} · Balance: ${PW.fmtAmount(tok ? tok.amount : 0)}`;
    const err = o.querySelector(".field-err");
    if (err) err.textContent = d.amount && !enough ? "Insufficient balance" : d.to && !PW.isValidAddress(d.to) ? "Enter a valid wallet address" : "";
    const own = o.querySelector(".own-acct");
    if (own) {
      const acct = PW.accountByAddress(d.to);
      own.classList.toggle("hidden", !acct);
      if (acct) own.textContent = "Your account · " + acct.walletName;
    }
    const next = o.querySelector("[data-next]");
    if (next) next.disabled = !valid;
  } else if (f.type === "swap") {
    const fromTok = PW.getToken(d.symbol);
    const priceFrom = fromTok ? PW.effPrice(fromTok) : 0;
    const priceTo = PW.previewPrice(d.toSym) || 1;
    const amtNum = parseFloat(d.amount) || 0;
    const outNum = priceTo > 0 ? (amtNum * priceFrom) / priceTo * 0.9915 : 0;
    const enough = fromTok && amtNum > 0 && amtNum <= (Number(fromTok.amount) || 0);
    const usds = o.querySelectorAll(".amount-usd");
    if (usds[0]) usds[0].textContent = `${PW.fmtUsd(amtNum * priceFrom)} · Balance: ${PW.fmtAmount(fromTok ? fromTok.amount : 0)}`;
    if (usds[1]) usds[1].textContent = `≈ ${PW.fmtAmount(outNum)} ${d.toSym} (${PW.fmtUsd(outNum * priceTo)})`;
    const err = o.querySelector(".field-err");
    if (err) err.textContent = d.amount && !enough ? "Insufficient balance" : "";
    const next = o.querySelector("[data-next]");
    if (next) next.disabled = !enough;
  } else if (f.type === "buy") {
    const price = PW.previewPrice(d.symbol);
    const usd = parseFloat(d.usd) || 0;
    const outNum = price > 0 ? usd / price : 0;
    const rd = o.querySelector(".amount-usd");
    if (rd) rd.textContent = `≈ ${PW.fmtAmount(outNum)} ${d.symbol}`;
    const next = o.querySelector("[data-next]");
    if (next) next.disabled = !(usd > 0);
  }
};

// ---------- decorative QR (offline, deterministic from the address) ----------
PW.drawQR = (canvas, text) => {
  const ctx = canvas.getContext("2d");
  const N = 25;
  const size = canvas.width;
  const cell = size / N;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // deterministic bits from text
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };

  const grid = Array.from({ length: N }, () => Array(N).fill(false));
  const finder = (r, c) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const rr = r + i, cc = c + j;
      if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
      const border = i === 0 || i === 6 || j === 0 || j === 6;
      const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      grid[rr][cc] = border || core;
    }
  };
  const reserved = (r, c) =>
    (r < 8 && c < 8) || (r < 8 && c >= N - 8) || (r >= N - 8 && c < 8) || (r >= N - 9 && r <= N - 5 && c >= N - 9 && c <= N - 5);

  finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
  // alignment pattern bottom-right
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    const rr = N - 7 + i, cc = N - 7 + j;
    grid[rr][cc] = Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0);
  }
  // timing
  for (let i = 8; i < N - 8; i++) { grid[6][i] = i % 2 === 0; grid[i][6] = i % 2 === 0; }
  // data
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (reserved(r, c) || r === 6 || c === 6) continue;
    grid[r][c] = rand() > 0.5;
  }

  ctx.fillStyle = "#0b0b0f";
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (grid[r][c]) ctx.fillRect(Math.floor(c * cell), Math.floor(r * cell), Math.ceil(cell), Math.ceil(cell));
  }
  // center logo knockout
  const lc = size / 2, lr = size * 0.15;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(lc - lr - 3, lc - lr - 3, (lr + 3) * 2, (lr + 3) * 2);
  ctx.fillStyle = "#ab9ff2";
  ctx.beginPath();
  ctx.arc(lc, lc, lr, 0, Math.PI * 2);
  ctx.fill();
};
