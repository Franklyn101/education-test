// Live price engine: fetches real prices from CoinGecko, applies subtle live
// jitter so values tick like a real wallet, and falls back to baked-in
// baselines when offline.
var PW = window.PW || (window.PW = {});

// symbol -> { price, change24h }
PW.livePrices = {};
PW.pricesLive = false;

// Realistic offline fallbacks (used if the network request fails).
PW.BASELINE = {
  SOL: { price: 75.78, change24h: 2.6 },
  ETH: { price: 1913.29, change24h: 0.0 },
  USDC: { price: 0.9996, change24h: 0.0 },
  BTC: { price: 64771, change24h: -0.2 },
  BONK: { price: 0.00000248, change24h: -1.6 },
  XMR: { price: 393.13, change24h: 4.1 },
  ZEC: { price: 510.7, change24h: 0.4 },
  DASH: { price: 31.05, change24h: -1.6 },
  ZEN: { price: 4.23, change24h: 3.9 },
  DCR: { price: 12.89, change24h: 0.9 },
  FIRO: { price: 0.630101, change24h: -2.3 },
  ARRR: { price: 0.213463, change24h: -8.2 },
  SCRT: { price: 0.03167377, change24h: -2.1 },
  ROSE: { price: 0.00562377, change24h: -0.2 },
  BEAM: { price: 0.00885012, change24h: -0.1 },
  GRIN: { price: 0.01444067, change24h: -7.1 },
  MOB: { price: 0.078036, change24h: -0.7 },
};

// Guarantee every token in every account has a non-zero starting price so the
// UI never renders $0.00 while waiting on (or failing) the network.
PW._ensureBaseline = () => {
  const accounts = (PW.wallet && PW.wallet.accounts) || [PW.state];
  for (const acct of accounts) {
    for (const t of (acct && acct.tokens) || []) {
      const sym = t.symbol;
      if (!sym || PW.livePrices[sym]) continue;
      const cat = PW.CATALOG && PW.CATALOG[sym];
      const b = PW.BASELINE[sym] || (cat ? { price: cat.price, change24h: cat.change || 0 } : null) || { price: 1, change24h: 0 };
      PW.livePrices[sym] = { price: b.price, change24h: b.change24h };
    }
  }
};

// Fetch live prices for every token across ALL accounts. Resilient by design:
// a failed request never zeroes a price — whatever we already have (live value
// or baseline) is kept, so the wallet always shows realistic numbers.
PW.fetchPrices = async () => {
  PW._ensureBaseline();
  const accounts = (PW.wallet && PW.wallet.accounts) || [PW.state];
  const pairs = [];
  const seen = new Set();
  for (const acct of accounts) {
    for (const t of acct.tokens || []) {
      if (t.coingeckoId && !seen.has(t.coingeckoId)) {
        seen.add(t.coingeckoId);
        pairs.push({ id: t.coingeckoId, symbol: t.symbol });
      }
    }
  }
  if (!pairs.length) return;

  const id2sym = {};
  pairs.forEach((p) => { id2sym[p.id] = p.symbol; });

  // Chunk so a long id list can't blow the URL or trip rate limits.
  const chunks = [];
  for (let i = 0; i < pairs.length; i += 25) chunks.push(pairs.slice(i, i + 25));

  let anyOk = false;
  for (const chunk of chunks) {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=" +
      encodeURIComponent(chunk.map((c) => c.id).join(",")) +
      "&vs_currencies=usd&include_24hr_change=true";
    let data = null;
    for (let attempt = 0; attempt < 2 && !data; attempt++) {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        data = await r.json();
      } catch (e) {
        if (attempt === 0) await new Promise((res) => setTimeout(res, 700));
      }
    }
    if (!data) continue; // keep existing/baseline prices for this chunk
    for (const id in data) {
      const sym = id2sym[id];
      const d = data[id];
      if (sym && d && typeof d.usd === "number" && d.usd > 0) {
        PW.livePrices[sym] = {
          price: d.usd,
          change24h: typeof d.usd_24h_change === "number" ? d.usd_24h_change : 0,
        };
        anyOk = true;
      }
    }
  }
  PW.pricesLive = anyOk;
};

// Effective price for a token = manual override if set, else current live price.
PW.priceOf = (token) => {
  if (token.priceOverride !== null && token.priceOverride !== undefined && token.priceOverride !== "") {
    return Number(token.priceOverride) || 0;
  }
  const lp = PW.livePrices[token.symbol];
  return lp ? lp.price : 0;
};

PW.change24hOf = (token) => {
  const lp = PW.livePrices[token.symbol];
  return lp ? lp.change24h : 0;
};

// Small random walk so on-screen numbers move gently.
PW._jitter = () => {
  for (const sym in PW.livePrices) {
    const vol = sym === "USDC" ? 0.0002 : 0.0025; // stablecoins barely move
    const delta = (Math.random() * 2 - 1) * vol;
    const p = PW.livePrices[sym];
    p.price = Math.max(0, p.price * (1 + delta));
  }
};

PW.startPriceLoop = (onTick) => {
  if (PW._tickTimer) clearInterval(PW._tickTimer);
  PW._tickTimer = setInterval(() => {
    if (!PW.state.freezePrices) PW._jitter();
    onTick();
  }, 3500);

  // Periodically re-sync with real market prices.
  if (PW._refetchTimer) clearInterval(PW._refetchTimer);
  PW._refetchTimer = setInterval(() => {
    if (!PW.state.freezePrices) PW.fetchPrices().then(onTick);
  }, 60000);
};
