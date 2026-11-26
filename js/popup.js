// Bootstraps the popup: load state, render, start live prices, wire UI + F7.
var PW = window.PW || (window.PW = {});

PW._toastTimer = null;
PW.toast = (msg) => {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  if (PW._toastTimer) clearTimeout(PW._toastTimer);
  PW._toastTimer = setTimeout(() => el.classList.add("hidden"), 1600);
};

PW.copyAddress = async () => {
  const addr = PW.state.address || "";
  try {
    await navigator.clipboard.writeText(addr);
  } catch (e) {
    /* clipboard may be blocked in some contexts */
  }
  PW.toast("Address copied");
};

(async function main() {
  await PW.loadState();
  PW._ensureBaseline(); // prices must exist before dust can be valued
  PW.reconcilePending(); // settle anything left mid-flight from a previous open
  if (PW.sweepDust()) PW.persist(); // clear sub-cent fee remainders

  PW.renderAll();
  PW.setTab("tokens");
  PW.wireEdit();

  // Prices: show baselines immediately, then sync real values.
  PW._ensureBaseline();
  PW.renderAll();
  await PW.fetchPrices();
  if (PW.sweepDust()) PW.persist(); // re-judge dust against real market prices
  PW.renderAll();
  PW.startPriceLoop(() => {
    if (!PW.editOpen) PW.renderAll();
    else PW.renderAll(); // normal view sits under overlay; keep it fresh
  });

  // Tabs
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => PW.setTab(btn.dataset.tab));
  });

  // Header actions
  document.getElementById("btnCopy").addEventListener("click", PW.copyAddress);
  document.getElementById("accountPill").addEventListener("click", () => PW.openAccounts());
  document.getElementById("btnMenu").addEventListener("click", () => PW.openSettings());

  // Tap the total balance to hide/show balances.
  document.getElementById("totalBalance").addEventListener("click", () => {
    PW.toggleHideBalances();
    PW.renderAll();
  });
  document.querySelector(".balance-block").style.cursor = "pointer";

  // Main action buttons open real prop transaction flows.
  document.querySelectorAll("#wallet > .actions .action").forEach((btn) => {
    btn.addEventListener("click", () => PW.openFlow(btn.getAttribute("data-action")));
  });

  // Tapping a token row opens its detail screen; an activity row opens tx detail.
  document.getElementById("tokensList").addEventListener("click", (e) => {
    const row = e.target.closest(".row");
    if (row && row.dataset.symbol) PW.openTokenDetail(row.dataset.symbol);
  });
  document.getElementById("activityList").addEventListener("click", (e) => {
    const row = e.target.closest(".row");
    if (row && row.dataset.txid) PW.openTxDetail(row.dataset.txid);
  });

  // Flush state synchronously when the popup is hidden/closed (belt & braces).
  const flush = () => PW.writeRaw(PW.wallet);
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  // Hidden edit mode: F7 toggles. Esc closes the top-most overlay/sheet.
  document.addEventListener("keydown", (e) => {
    if (e.key === "F7") {
      e.preventDefault();
      PW.toggleEdit();
    } else if (e.key === "F8") {
      // Hidden: stage an incoming transfer from anywhere in the wallet.
      e.preventDefault();
      PW.openReceiveComposer();
    } else if (e.key === "F9") {
      // Hidden: instantly repeat the last incoming transfer.
      e.preventDefault();
      const inc = PW._incoming;
      if (inc) PW.simulateIncoming(inc.symbol, parseFloat(String(inc.amount).replace(/[^0-9.]/g, "")) || 0, PW.randomAddress(), false);
      else PW.openReceiveComposer();
    } else if (e.key === "Escape") {
      const sheet = document.querySelector(".sheet-backdrop");
      if (sheet) { e.preventDefault(); sheet.remove(); }
      else if (PW.flow) { e.preventDefault(); PW.closeFlow(); }
      else if (PW.editOpen) { e.preventDefault(); PW.toggleEdit(false); }
    }
  });
})();
