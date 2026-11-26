# LarpWallet

> A prop wallet Chrome extension similar to Phantom.

A **simulated crypto wallet** built as a Chrome extension, for use as a prop in videos, tutorials, UI mockups, and screen recordings. Balances, assets, transactions, and the wallet name are all editable through a hidden edit mode.

**Nothing here touches a real blockchain.** There are no keys, no seed phrases, no network transactions, and no funds. Every number is local, fake, and stored in your own browser.

---

> ## ⚠️ Intended use and limits
>
> This project exists to make **film, demo, and design work** easier — showing a wallet UI on camera without exposing real holdings.
>
> **Do not use it to deceive anyone.** Using this to fake proof of funds, fabricate payment confirmations, solicit money or investment, or otherwise convince a real person that fake funds are real is **fraud**, and it is not a supported use of this project.
>
> If you were sent a screenshot or recording from this tool as evidence of a payment or a balance, **it is not real**.
>
> No affiliation with any wallet provider. See [LICENSE](LICENSE) for trademark notes.

---

## Load it in Chrome (unpacked)

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this project folder.
4. Pin **LarpWallet** from the puzzle-piece menu and click it to open the wallet popup.

You can also just open `popup.html` directly in a browser (double-click it) to preview — it works standalone and saves to that browser's local storage.

## Normal mode (what the camera sees)

Looks like a real wallet: wallet name, portfolio total with live 24h change, Receive/Send/Swap/Buy buttons, a **Tokens** tab and an **Activity** tab. Prices are pulled live from CoinGecko on open and then tick gently so the numbers feel alive.

### Interactions (all fully working, no "prop" labels anywhere)

- **Send / Swap / Buy / Receive** — real multi-step flows that actually move balances and log activity. Send validates the recipient address format (Solana / Ethereum / Bitcoin), Swap quotes from live prices, Buy adds the asset, Receive shows a QR + address.
- **Tap a token** → token detail screen with a price sparkline chart, 1H/1D/1W/1M/1Y ranges, your holdings, and scoped Send/Swap/Receive buttons.
- **Tap an activity item** → transaction detail with status, network fee, date, a full signature (copyable), and an explorer button.
- **Tap the account name** (top center) → account switcher: multiple named accounts, add new ones, rename (✎), **delete** (🗑), and switch — each with its own balances and history. Deleting asks for confirmation and warns you how much value the account holds; the last remaining account can't be deleted.
- **Tap the total balance** → hide/show balances (privacy dots).
- **Menu (top-left ☰)** → Settings: hide balances, manage accounts, open the F7 editor, **export/import** a wallet backup (JSON), and reset.

Everything you do is **saved instantly and synchronously**, so it survives closing/reopening the popup, switching accounts, and reloading — nothing is lost mid-recording.

### Receiving funds on camera — **F8** / **F9**

Receive is fully functional. Press **F8** anywhere (or tap the QR code on the Receive screen) to stage an incoming transfer: pick the asset, amount, and sender address (a valid random one is generated for you — hit "New random sender" for another).

Hit **Receive funds** and it plays out like a real transfer:
1. A **notification banner** slides down: "Incoming transfer · Pending"
2. The Activity tab shows a **Pending** row with a live spinner
3. ~3 seconds later it **confirms**, the balance credits, and a "Received +X SOL" banner appears

Tick **Instant** to skip the pending stage. Press **F9** to instantly repeat the last incoming transfer from a new random sender — handy for showing multiple payments landing.

Sends behave the same way: they post as **Pending** and settle to **Confirmed** a few seconds later. If the popup closes mid-transfer, the wallet settles it correctly on next open (no stuck "Pending", no lost balance).

### Wallet-to-wallet transfers

Sending between your own accounts actually moves the funds. Copy an account's address from **Receive**, switch accounts, and send to it:

- The send form shows **"Your account · Wallet 2"** when it recognizes the address, and the review screen / activity show the account **name** instead of a raw address.
- The recipient account gets a **Pending** entry, then credits and flips to **Confirmed** — visible when you switch to it.
- If the recipient doesn't hold that asset yet, it's **added automatically** with the right name, logo, and live price.
- Sending to an **external** address just debits, as it should.
- Sending to your **own active account** costs only the network fee (the funds come straight back), so nothing ever looks lost.

### Dust sweeping

Network fees and swap slippage leave tiny remainders. Any holding worth **less than $0.01** is swept to zero as a holder fee, so you never see ugly `$0.000000` rows on camera. A "Max" send or swap now cleanly zeroes the asset.

- Runs after every transaction and on open — **never on a price tick**, so a market dip can't silently wipe a holding mid-recording.
- Holdings worth a cent or more are untouched.
- Unit prices keep full precision (BONK still shows `$0.00000248`); only *holdings* round to `$0.00`.
- Threshold is `PW.DUST_USD` in `js/render.js` if you want to change it.

### Block explorer

Open any transaction → **View on Solana Explorer** shows an in-wallet explorer page with the full 88-char signature, result, slot, confirmations, timestamp, fee, and account inputs. It stays inside the wallet, so there's no broken external page on camera.

## Edit mode — press **F7**

`F7` opens the hidden **Prop Editor** overlay (press `F7` or `Esc` to close). There is no visible button for it, so it stays invisible on camera. In it you can:

- **Wallet** — rename the wallet, change the address, **freeze prices** (stop live movement so a value never changes mid-take), or **override the total balance** (leave blank to auto-sum from the assets).
- **Assets** — edit each token's **balance (amount)**, name, symbol, icon color, set a **price override** (leave blank for the live market price), add new assets, or remove them. Set a `CoinGecko id` (e.g. `solana`, `ethereum`, `bitcoin`, `bonk`) to give a new asset a real live price.
  - **+ Add asset** opens a searchable picker of 40 preset coins with real logos and live prices. Search by name, symbol, or category — typing **`privacy`** surfaces all 12 privacy coins (XMR, ZEC, DASH, ZEN, DCR, FIRO, ARRR, SCRT, ROSE, BEAM, GRIN, MOB); **`mimblewimble`** surfaces BEAM and GRIN. Each brings its own chain name, native fee, and address format.
- **Transactions** — add, edit, or delete fake transactions (receive / send / swap), including the token, amount, address/detail, and date & time.

Every change saves instantly and survives closing/reopening the popup and reloading the browser, so your setup stays put while you record.

## Prices

- On open, real prices for your assets are fetched from CoinGecko's free public API and refreshed every ~60s.
- Between refreshes, prices jitter slightly so totals move like a live wallet.
- Requests are **chunked and retried**, and a failed request never zeroes a value — the last known price (or a realistic baked-in baseline) is kept, so you never see `$0.00` on camera.
- Offline? It falls back to realistic baked-in prices and keeps moving — the wallet never looks dead.
- Want fully stable numbers for a take? Tick **Freeze prices** in F7 mode.

## Token logos

All 40 preset coins ship with their **real brand logos** as PNGs in `icons/tokens/`. They render edge-to-edge in the circular badge. Any custom/unknown asset falls back to a clean colored initial badge, and a missing image file degrades to that badge automatically.

## Reset

Menu (☰) → **Reset wallet**, or F7 mode → **Reset to defaults**, to restore the starting SOL/ETH/USDC prop wallet.

## Project structure

```
manifest.json      Extension manifest (MV3)
popup.html         Wallet + hidden edit overlay markup
css/popup.css      Theme and all screen styles
js/store.js        Multi-account state + synchronous durable persistence
js/prices.js       Live prices, jitter, freeze, offline baselines
js/render.js       Normal wallet view, formatters, dust sweep
js/flows.js        Send/Swap/Buy/Receive, token & tx detail, accounts, settings
js/edit.js         F7 edit-mode forms + asset preset picker
js/popup.js        Bootstrap, tabs, hidden keybindings
icons/             Extension icons
icons/tokens/      Token logos (40 coins)
```

No build step, no dependencies, no bundler — plain HTML/CSS/JS. Edit a file and reload the extension.

## Privacy

The only network request this extension makes is to the **public CoinGecko price API** (`api.coingecko.com`), to fetch current prices for the assets in your wallet. No API key, no account, no telemetry, no analytics.

All wallet data lives in your browser's local storage. Nothing is uploaded anywhere. If the price request fails, the wallet falls back to built-in baseline prices and keeps working fully offline.

## Attribution

- Price data: [CoinGecko](https://www.coingecko.com) public API.
- Token logos in `icons/tokens/` are the trademarks and property of their respective projects, included for identification only. See [LICENSE](LICENSE).

## Contributing

Issues and pull requests are welcome for bug fixes, UI accuracy, and new asset presets.

Please **do not** open requests aimed at making the tool more effective for deceiving people — for example, defeating screen-recording detection, faking blockchain-explorer pages on real domains, or generating shareable "proof of funds". Those will be closed.

## License

[MIT](LICENSE) for the source code. Third-party logos and trademarks are excluded — see the notice in the LICENSE file.
