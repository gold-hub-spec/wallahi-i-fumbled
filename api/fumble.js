// Server function: holds the API key, fetches wallet data from Solana Tracker,
// and computes the fumble numbers. Deployed automatically by Vercel at /api/fumble.

const BASE = "https://data.solanatracker.io";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Free plan allows 3 requests/second, so space calls ~350 ms apart.
let lastCall = 0;
async function st(path, key) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = Math.max(0, lastCall + 350 - Date.now());
    if (wait) await sleep(wait);
    lastCall = Date.now();

    const res = await fetch(BASE + path, { headers: { "x-api-key": key } });
    if (res.status === 429) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      const err = new Error(`Solana Tracker returned ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
  const err = new Error("Rate limited by Solana Tracker");
  err.status = 429;
  throw err;
}

module.exports = async function handler(req, res) {
  const key = process.env.SOLANA_TRACKER_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "The site owner hasn't added a Solana Tracker API key yet." });
  }

  const wallet = String(req.query.wallet || "").trim();
  if (!WALLET_RE.test(wallet)) {
    return res.status(400).json({ error: "That doesn't look like a Solana wallet address." });
  }
  const depth = Math.min(25, Math.max(5, parseInt(req.query.depth, 10) || 15));

  try {
    const solPrice = (await st(`/price?token=${SOL_MINT}`, key)).price;

    const pos = await st(
      `/v2/pnl/wallets/${wallet}/positions?sort=proceeds&direction=desc&filter=all&limit=${Math.min(depth * 2, 100)}`,
      key
    );

    const excluded = { dust: 0, noAth: 0, soldAtTop: 0 };
    const candidates = [];
    for (const p of pos.positions || []) {
      const sold = p.volume?.tokensSold || 0;
      const sellUsd = p.volume?.sellUsd || 0;
      if (p.token === SOL_MINT || sold <= 0) continue; // never sold
      if (sellUsd < 1) { excluded.dust++; continue; }
      candidates.push(p);
      if (candidates.length >= depth) break;
    }

    const positions = [];
    for (const p of candidates) {
      let ath = null, athTime = null;
      try {
        const a = await st(`/tokens/${p.token}/ath`, key);
        ath = a.highest_price || null;
        athTime = a.timestamp || null;
      } catch (_) { /* treated as no ATH */ }
      if (!ath) { excluded.noAth++; continue; }

      const tokensSold = p.volume.tokensSold;
      const sellUsd = p.volume.sellUsd;
      const avgSell = sellUsd / tokensSold;
      const current = p.current?.price ?? p.meta?.price ?? 0;

      const peakUsd = Math.max(0, ath - avgSell) * tokensSold;
      const diamondUsd = Math.max(0, current - avgSell) * tokensSold;
      if (peakUsd <= 0) excluded.soldAtTop++;

      positions.push({
        token: p.token,
        symbol: p.meta?.symbol || "???",
        name: p.meta?.name || "",
        image: p.meta?.image || null,
        tokensSold,
        sellUsd,
        avgSell,
        current,
        ath,
        athTime,
        lastSell: p.timing?.lastSell || null,
        multiple: ath / avgSell,
        peakUsd,
        peakSol: peakUsd / solPrice,
        diamondUsd,
        diamondSol: diamondUsd / solPrice,
      });
    }

    positions.sort((a, b) => b.peakUsd - a.peakUsd);
    const sum = (k) => positions.reduce((s, p) => s + p[k], 0);

    // Cache each wallet for an hour at Vercel's edge to save API credits.
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=600");
    return res.status(200).json({
      wallet,
      solPrice,
      depth,
      totalPositions: pos.stats?.total ?? null,
      scored: positions.length,
      excluded,
      peakSol: sum("peakSol"),
      peakUsd: sum("peakUsd"),
      diamondSol: sum("diamondSol"),
      diamondUsd: sum("diamondUsd"),
      positions,
    });
  } catch (e) {
    const status = e.status || 500;
    const msg =
      status === 401 || status === 403 ? "The site's API key was rejected. Check it in Vercel settings." :
      status === 429 ? "Too many checks right now. Try again in a minute." :
      status === 404 ? "Solana Tracker has no trading history for this wallet." :
      "Couldn't reach Solana Tracker. Try again shortly.";
    return res.status(status === 404 ? 404 : 502).json({ error: msg });
  }
};
