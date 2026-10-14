# Wallahi I Fumbled

A Solana memecoin regret calculator. Paste a wallet, see how much SOL you'd have if you'd sold every memecoin at its all-time high.

## 1. Get a Solana Tracker API key (free)

1. Go to https://www.solanatracker.io/account and sign up.
2. In the dashboard sidebar, click **Data API** (https://www.solanatracker.io/account/data-api).
3. Click the copy button next to your API key. Keep it private.

The free plan gives 10,000 requests a month at 3 per second. Each wallet check uses about 2 + (number of sells checked) requests, so a "Top 15" check costs about 17. That's roughly 600 checks a month. Results are cached for an hour per wallet, so repeat checks are free. If the site takes off, the Advanced plan (€50/month) gives 200,000 requests.

## 2. Put it online with Vercel (free)

1. Create a free account at https://github.com and make a new repository. Upload the three items from this folder: `index.html`, `vercel.json`, and the `api` folder (with `fumble.js` inside).
2. Create a free account at https://vercel.com (sign in with GitHub).
3. Click **Add New → Project**, pick your repository, and click **Deploy**. No build settings needed.
4. In the project, open **Settings → Environment Variables**. Add:
   - Name: `SOLANA_TRACKER_API_KEY`
   - Value: your key from step 1
5. Go to **Deployments**, open the latest one's menu, and click **Redeploy** so the key takes effect.

Your site is live at the `.vercel.app` address Vercel shows. You can attach your own domain under **Settings → Domains**.

## Doing it all from your phone

Everything works in your phone's browser (Safari or Chrome). GitHub's phone upload can't upload folders, so the `api` file is added a different way:

1. **Unzip**: in the Files app, tap the zip to unzip it.
2. **GitHub**: at github.com, tap **+ → New repository**, name it `wallahi-i-fumbled`, tick **Add a README**, tap **Create**.
3. **Upload two files**: in the repository, tap **Add file → Upload files**, choose `index.html` and `vercel.json`, tap **Commit changes**.
4. **Add the server file**: tap **Add file → Create new file**. In the name box type exactly `api/fumble.js` (typing the `/` makes the folder). Open `fumble.js` on your phone, select all, copy, paste it into the big box, then tap **Commit changes**.
5. **Vercel**: at vercel.com, sign in with GitHub, tap **Add New → Project**, pick `wallahi-i-fumbled`. Open **Environment Variables**, add `SOLANA_TRACKER_API_KEY` with your key, then tap **Deploy**.

## How it works

- `index.html` is the page visitors see.
- `api/fumble.js` runs on Vercel's servers. It holds your API key (visitors never see it), pulls the wallet's token positions sorted by biggest sells, looks up each token's all-time high, and does the math.
- Fumbled = Σ (all-time high − average sell price) × tokens sold, converted to SOL at today's price.
- If you'd held = same, using today's price.

Opening `index.html` directly on your computer shows the design and the "See an example" card, but live checks only work once deployed.
