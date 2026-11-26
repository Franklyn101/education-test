// Hidden edit mode (toggled by F7). Renders forms bound to PW.state; every
// change mutates state, persists, and re-renders the normal view underneath.
var PW = window.PW || (window.PW = {});

PW.editOpen = false;

PW.toggleEdit = (force) => {
  PW.editOpen = force === undefined ? !PW.editOpen : !!force;
  document.getElementById("editOverlay").classList.toggle("hidden", !PW.editOpen);
  if (PW.editOpen) PW.buildEdit();
};

// Called after a structural change (add/remove asset or txn) or on open.
PW.buildEdit = () => {
  const s = PW.state;
  document.getElementById("fldName").value = s.walletName || "";
  document.getElementById("fldAddress").value = s.address || "";
  document.getElementById("fldTotalOverride").value =
    s.totalOverride === null || s.totalOverride === undefined ? "" : s.totalOverride;
  document.getElementById("fldFreeze").checked = !!s.freezePrices;
  PW.buildTokenEditors();
  PW.buildTxnEditors();
};

PW.commit = async (rerenderEditStructure) => {
  await PW.persist();
  PW.renderAll();
  if (rerenderEditStructure) PW.buildEdit();
};

// ---------- asset editors ----------
PW.buildTokenEditors = () => {
  const wrap = document.getElementById("editTokens");
  wrap.innerHTML = "";
  PW.state.tokens.forEach((t, i) => {
    const card = document.createElement("div");
    card.className = "edit-card";
    card.innerHTML = `
      <div class="edit-card-head">
        <strong>${PW.esc(t.symbol || "Asset")}</strong>
        <button class="remove-btn" data-rm="${i}">Remove</button>
      </div>
      <div class="grid-2">
        <label class="field"><span>Symbol</span><input type="text" data-f="symbol" data-i="${i}" value="${PW.esc(t.symbol)}" /></label>
        <label class="field"><span>Name</span><input type="text" data-f="name" data-i="${i}" value="${PW.esc(t.name)}" /></label>
      </div>
      <div class="grid-2" style="margin-top:8px">
        <label class="field"><span>Balance (amount)</span><input type="number" step="any" data-f="amount" data-i="${i}" value="${t.amount}" /></label>
        <label class="field"><span>Price override ($)</span><input type="number" step="any" data-f="priceOverride" data-i="${i}" value="${t.priceOverride ?? ""}" placeholder="live" /></label>
      </div>
      <div class="grid-2" style="margin-top:8px">
        <label class="field"><span>CoinGecko id (for live price)</span><input type="text" data-f="coingeckoId" data-i="${i}" value="${PW.esc(t.coingeckoId)}" placeholder="solana" /></label>
        <label class="field"><span>Icon color</span><input type="text" data-f="iconColor" data-i="${i}" value="${PW.esc(t.iconColor)}" placeholder="#9945FF" /></label>
      </div>`;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll("input[data-f]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const i = Number(inp.dataset.i);
      const f = inp.dataset.f;
      const t = PW.state.tokens[i];
      if (!t) return;
      if (f === "amount") {
        t.amount = inp.value === "" ? 0 : Number(inp.value);
      } else if (f === "priceOverride") {
        t.priceOverride = inp.value === "" ? null : Number(inp.value);
      } else {
        t[f] = inp.value;
        if (f === "symbol") PW._ensureBaseline();
      }
      PW.commit(false);
    });
  });

  wrap.querySelectorAll("button[data-rm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      PW.state.tokens.splice(Number(btn.dataset.rm), 1);
      PW.commit(true);
    });
  });
};

// "Add asset" opens a searchable preset picker (BTC, ETH, SOL, …) plus a
// "Custom asset" escape hatch for a blank manual entry.
PW.addToken = () => PW.openAssetPreset();

PW.addCustomToken = () => {
  PW.state.tokens.push({
    symbol: "NEW",
    name: "New Asset",
    coingeckoId: "",
    amount: 0,
    priceOverride: 1,
    iconColor: "#7d6ce8",
  });
  PW.commit(true);
};

PW.openAssetPreset = () => {
  const owned = new Set(PW.state.tokens.map((t) => (t.symbol || "").toUpperCase()));
  const rows = Object.keys(PW.CATALOG)
    .map((sym) => {
      const c = PW.CATALOG[sym];
      const already = owned.has(sym);
      const tok = { symbol: sym, name: c.name, iconColor: c.iconColor };
      return `<div class="sheet-item preset ${already ? "disabled" : ""}" data-preset="${sym}">
        ${PW.assetIcon(tok)}
        <div class="row-main"><div class="row-title">${PW.esc(c.name)}</div><div class="row-sub">${PW.esc(sym)} · ${PW.fmtPrice(c.price)}</div></div>
        ${already ? '<span class="preset-added">Added</span>' : '<span class="preset-plus">+</span>'}
      </div>`;
    })
    .join("");
  const html = `<div class="sheet-title">Add asset</div>
    <div class="preset-search-wrap"><input class="preset-search" id="presetSearch" placeholder="Search assets" spellcheck="false" /></div>
    <div class="sheet-item custom" data-preset="__custom__">
      <span class="token-icon" style="background:#3a3a44">+</span>
      <div class="row-main"><div class="row-title">Custom asset</div><div class="row-sub">Enter details manually</div></div>
    </div>
    <div id="presetList">${rows}</div>`;
  PW.sheet(html, (back) => {
    const add = (sym) => {
      if (sym === "__custom__") { PW.addCustomToken(); back.remove(); return; }
      if (owned.has(sym)) { PW.toast(sym + " already added"); return; }
      const c = PW.CATALOG[sym];
      PW.state.tokens.push({ symbol: sym, name: c.name, coingeckoId: c.coingeckoId, amount: 0, priceOverride: null, iconColor: c.iconColor });
      PW._ensureBaseline();
      PW.persist();
      PW.renderAll();
      if (PW.fetchPrices) PW.fetchPrices().then(PW.renderAll);
      back.remove();
      if (PW.editOpen) PW.buildEdit();
      PW.toast(sym + " added");
    };
    back.querySelectorAll("[data-preset]").forEach((el) => el.addEventListener("click", () => add(el.dataset.preset)));
    const search = back.querySelector("#presetSearch");
    if (search) {
      search.addEventListener("input", () => {
        const q = search.value.trim().toLowerCase();
        back.querySelectorAll("#presetList .sheet-item").forEach((it) => {
          const sym = it.dataset.preset;
          const c = PW.CATALOG[sym];
          const match =
            !q ||
            sym.toLowerCase().includes(q) ||
            (c && c.name.toLowerCase().includes(q)) ||
            (c && c.tags && c.tags.includes(q));
          it.style.display = match ? "" : "none";
        });
      });
    }
  });
};

// ---------- transaction editors ----------
PW._tsToLocalInput = (ts) => {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

PW.buildTxnEditors = () => {
  const wrap = document.getElementById("editTxns");
  wrap.innerHTML = "";
  PW.state.txns.forEach((tx, i) => {
    const card = document.createElement("div");
    card.className = "edit-card";
    const opts = ["receive", "send", "swap"]
      .map((o) => `<option value="${o}"${tx.type === o ? " selected" : ""}>${o}</option>`)
      .join("");
    card.innerHTML = `
      <div class="edit-card-head">
        <strong>Tx ${i + 1}</strong>
        <button class="remove-btn" data-rmtx="${i}">Remove</button>
      </div>
      <div class="grid-2">
        <label class="field"><span>Type</span><select data-tf="type" data-i="${i}">${opts}</select></label>
        <label class="field"><span>Token symbol</span><input type="text" data-tf="symbol" data-i="${i}" value="${PW.esc(tx.symbol)}" /></label>
      </div>
      <div class="grid-2" style="margin-top:8px">
        <label class="field"><span>Amount</span><input type="number" step="any" data-tf="amount" data-i="${i}" value="${tx.amount}" /></label>
        <label class="field"><span>${tx.type === "swap" ? "Detail (e.g. USDC → SOL)" : "Address"}</span><input type="text" data-tf="address" data-i="${i}" value="${PW.esc(tx.address)}" /></label>
      </div>
      <label class="field" style="margin-top:8px"><span>Date & time</span><input type="datetime-local" data-tf="ts" data-i="${i}" value="${PW._tsToLocalInput(tx.ts)}" /></label>`;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll("[data-tf]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const i = Number(inp.dataset.i);
      const f = inp.dataset.tf;
      const tx = PW.state.txns[i];
      if (!tx) return;
      if (f === "amount") tx.amount = inp.value === "" ? 0 : Number(inp.value);
      else if (f === "ts") tx.ts = inp.value ? new Date(inp.value).getTime() : tx.ts;
      else {
        tx[f] = inp.value;
        if (f === "type") PW.commit(true); // relabel address field
      }
      PW.commit(false);
    });
  });

  wrap.querySelectorAll("button[data-rmtx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      PW.state.txns.splice(Number(btn.dataset.rmtx), 1);
      PW.commit(true);
    });
  });
};

PW.addTxn = () => {
  PW.state.txns.push({
    id: "t" + Date.now(),
    type: "receive",
    symbol: PW.state.tokens[0] ? PW.state.tokens[0].symbol : "SOL",
    amount: 1,
    address: "0x000...0000",
    ts: Date.now(),
  });
  PW.commit(true);
};

// ---------- top-level edit wiring ----------
PW.wireEdit = () => {
  document.getElementById("fldName").addEventListener("input", (e) => {
    PW.state.walletName = e.target.value;
    PW.commit(false);
  });
  document.getElementById("fldAddress").addEventListener("input", (e) => {
    PW.state.address = e.target.value;
    PW.commit(false);
  });
  document.getElementById("fldTotalOverride").addEventListener("input", (e) => {
    PW.state.totalOverride = e.target.value === "" ? null : Number(e.target.value);
    PW.commit(false);
  });
  document.getElementById("fldFreeze").addEventListener("change", (e) => {
    PW.state.freezePrices = e.target.checked;
    PW.commit(false);
  });
  document.getElementById("addToken").addEventListener("click", PW.addToken);
  document.getElementById("addTxn").addEventListener("click", PW.addTxn);
  document.getElementById("editClose").addEventListener("click", () => PW.toggleEdit(false));
  document.getElementById("resetDefaults").addEventListener("click", async () => {
    if (!confirm("Reset the prop wallet to default values?")) return;
    await PW.resetState();
    PW.buildEdit();
    PW.renderAll();
    PW.toast("Reset to defaults");
  });
};
