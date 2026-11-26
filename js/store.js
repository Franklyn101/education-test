// Shared namespace + state persistence.
//
// Persistence is SYNCHRONOUS via localStorage (durable inside an extension
// popup even if it closes immediately after a change) and mirrored to
// chrome.storage.local as a best-effort backup. The wallet supports multiple
// named accounts; PW.state always points at the active account's data so all
// existing rendering/flow/edit code keeps working unchanged.
var PW = window.PW || (window.PW = {});

PW.STORAGE_KEY = "pw_wallet_v2";
PW.LEGACY_KEY = "pw_state_v1"; // single-account shape from earlier versions
PW.hasChromeStorage = !!(window.chrome && chrome.storage && chrome.storage.local);

// ---------- raw storage ----------
PW._lsGet = (k) => {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : undefined; } catch (e) { return undefined; }
};
PW._lsSet = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
};

PW.writeRaw = (obj) => {
  PW._lsSet(PW.STORAGE_KEY, obj); // synchronous + durable
  if (PW.hasChromeStorage) {
    try { chrome.storage.local.set({ [PW.STORAGE_KEY]: obj }); } catch (e) { /* ignore */ }
  }
};

// ---------- random generators (fake but well-formed) ----------
PW.B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
PW.randomAddress = () => {
  let s = "";
  for (let i = 0; i < 44; i++) s += PW.B58[Math.floor(Math.random() * PW.B58.length)];
  return s;
};
PW.randomSig = () => {
  let s = "";
  for (let i = 0; i < 88; i++) s += PW.B58[Math.floor(Math.random() * PW.B58.length)];
  return s;
};

// ---------- defaults ----------
PW.defaultAccountData = () => {
  const now = Date.now();
  const hour = 3600 * 1000;
  return {
    walletName: "Wallet 1",
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    freezePrices: false,
    totalOverride: null,
    tokens: [
      { symbol: "SOL", name: "Solana", coingeckoId: "solana", amount: 42.5, priceOverride: null, iconColor: "#9945FF" },
      { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", amount: 3.25, priceOverride: null, iconColor: "#627EEA" },
      { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", amount: 1500, priceOverride: null, iconColor: "#2775CA" },
    ],
    txns: [
      { id: "t1", type: "receive", symbol: "SOL", amount: 5.0, address: "3nF2rGxqK8vN5pQ1wY7dLmT9sB4hJ6aZ8xQaR2cV3nF", ts: now - 2 * hour, sig: PW.randomSig() },
      { id: "t2", type: "send", symbol: "ETH", amount: 0.5, address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", ts: now - 26 * hour, sig: PW.randomSig() },
      { id: "t3", type: "swap", symbol: "USDC", amount: 250, address: "USDC → SOL", ts: now - 3 * 24 * hour, sig: PW.randomSig() },
      { id: "t4", type: "receive", symbol: "USDC", amount: 1000, address: "8dP1qkLmR3nT5vW7xY9zA2bC4dE6fG8hJ2kLm4nP6qR", ts: now - 6 * 24 * hour, sig: PW.randomSig() },
    ],
  };
};

// A fresh, empty account (used when the user adds one).
PW.emptyAccountData = (name) => {
  const d = PW.defaultAccountData();
  d.walletName = name;
  d.address = PW.randomAddress();
  d.tokens = d.tokens.map((t) => ({ ...t, amount: 0 }));
  d.txns = [];
  return d;
};

PW.defaultWallet = () => ({ version: 2, active: 0, hideBalances: false, accounts: [PW.defaultAccountData()] });

// ---------- migration / normalization ----------
PW.migrateAccount = (s) => {
  const d = PW.defaultAccountData();
  const out = Object.assign({}, d, s);
  out.tokens = (s.tokens || d.tokens).map((t) => Object.assign({ priceOverride: null, iconColor: "#888" }, t));
  out.txns = (s.txns || d.txns).map((tx) => Object.assign({ sig: PW.randomSig() }, tx));
  if (out.totalOverride === undefined) out.totalOverride = null;
  return out;
};

PW.normalizeWallet = (w) => {
  if (w && Array.isArray(w.accounts) && w.accounts.length) {
    w.version = 2;
    w.hideBalances = !!w.hideBalances;
    w.accounts = w.accounts.map(PW.migrateAccount);
    w.active = Math.min(Math.max(0, w.active | 0), w.accounts.length - 1);
    return w;
  }
  // legacy single-account object
  if (w && w.tokens) return { version: 2, active: 0, hideBalances: false, accounts: [PW.migrateAccount(w)] };
  return PW.defaultWallet();
};

// ---------- load / persist ----------
PW.wallet = null;
PW.state = null; // active account (a reference into PW.wallet.accounts)

PW.loadState = async () => {
  let w = PW._lsGet(PW.STORAGE_KEY);
  if (!w) {
    const legacy = PW._lsGet(PW.LEGACY_KEY);
    if (legacy) w = legacy;
  }
  if (!w && PW.hasChromeStorage) {
    try {
      w = await new Promise((res) =>
        chrome.storage.local.get([PW.STORAGE_KEY, PW.LEGACY_KEY], (r) => res(r[PW.STORAGE_KEY] || r[PW.LEGACY_KEY]))
      );
    } catch (e) { /* ignore */ }
  }
  PW.wallet = PW.normalizeWallet(w);
  PW.state = PW.wallet.accounts[PW.wallet.active];
  PW.writeRaw(PW.wallet); // persist normalized shape
  return PW.state;
};

PW.persist = () => {
  PW.writeRaw(PW.wallet);
  return Promise.resolve();
};

PW.resetState = () => {
  PW.wallet = PW.defaultWallet();
  PW.state = PW.wallet.accounts[0];
  PW.persist();
  return Promise.resolve(PW.state);
};

// ---------- account operations ----------
PW.switchAccount = (i) => {
  if (i < 0 || i >= PW.wallet.accounts.length) return;
  PW.wallet.active = i;
  PW.state = PW.wallet.accounts[i];
  PW.persist();
};

PW.addAccount = () => {
  const acct = PW.emptyAccountData("Wallet " + (PW.wallet.accounts.length + 1));
  PW.wallet.accounts.push(acct);
  PW.switchAccount(PW.wallet.accounts.length - 1);
  return acct;
};

// Remove an account. The last remaining account can never be deleted.
// Keeps you on the same account you were viewing: removing one *before* the
// active index shifts it down, otherwise the index stays (clamped to range).
PW.deleteAccount = (i) => {
  if (!PW.wallet || PW.wallet.accounts.length <= 1) return false;
  if (i < 0 || i >= PW.wallet.accounts.length) return false;
  PW.wallet.accounts.splice(i, 1);
  if (i < PW.wallet.active) PW.wallet.active -= 1;
  if (PW.wallet.active >= PW.wallet.accounts.length) PW.wallet.active = PW.wallet.accounts.length - 1;
  if (PW.wallet.active < 0) PW.wallet.active = 0;
  PW.state = PW.wallet.accounts[PW.wallet.active];
  PW.persist();
  return true;
};

PW.renameAccount = (i, name) => {
  if (PW.wallet.accounts[i]) {
    PW.wallet.accounts[i].walletName = name;
    PW.persist();
  }
};

PW.toggleHideBalances = () => {
  PW.wallet.hideBalances = !PW.wallet.hideBalances;
  PW.persist();
};
PW.hidden = () => !!(PW.wallet && PW.wallet.hideBalances);

// Import a wallet blob (from Settings → Import). Returns true on success.
PW.importWallet = (obj) => {
  try {
    PW.wallet = PW.normalizeWallet(obj);
    PW.state = PW.wallet.accounts[PW.wallet.active];
    PW.persist();
    return true;
  } catch (e) {
    return false;
  }
};
