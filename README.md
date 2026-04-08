# 🧠 Sales Brain by Holaprime

AI-powered marketing intelligence tool. Paste any URL — get a complete marketing kit with deploy-ready landing pages, ad creatives, email sequences, and sales intelligence.

## Features

- **📦 Product Summary** — Company analysis, differentiators, pricing, metrics
- **🎯 Ideal Customer** — Full ICP with persona, demographics, psychographics
- **🔥 Pain Points** — Severity-scored pains, unspoken pains, solution mapping
- **💎 Value Props** — Primary value prop, USPs, elevator pitch
- **🖥️ Landing Page** — Full HTML page with live preview, responsive toggle, download
- **📣 Ad Creatives** — Google Search/Display, Facebook Feed, Instagram Feed + Reel
- **✉️ Email Sequences** — 9 emails with inbox mockup, copy HTML for any ESP
- **❓ FAQs** — 5 categories, accordion style

## Quick Deploy to Vercel

### Option 1: One-Click (Recommended)

1. Push this folder to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repo
4. Add environment variable:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** Your API key from [console.anthropic.com](https://console.anthropic.com/)
5. Click **Deploy**

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# From this project folder:
vercel

# Set your API key
vercel env add ANTHROPIC_API_KEY

# Deploy to production
vercel --prod
```

### Option 3: Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env.local

# Run dev server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
salesbrain-vercel/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.js      ← Server-side API proxy (keeps key secure)
│   ├── globals.css            ← Global styles + animations
│   ├── layout.js              ← Root layout with SEO meta
│   └── page.js                ← Entry point
├── components/
│   └── SalesBrain.js          ← Main app component (client-side)
├── next.config.js
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
└── .env.example
```

## How It Works

1. User pastes a URL in the frontend
2. Frontend calls `/api/analyze` (Next.js API route)
3. API route adds the `ANTHROPIC_API_KEY` server-side and forwards to Claude
4. Claude uses web search to scrape the URL content
5. Each tab sends a specialized prompt to generate marketing assets
6. Results render as realistic mockups (Google ads, Facebook posts, email clients, etc.)

## Cost Per Use

| Action | Estimated Cost |
|--------|---------------|
| URL Scrape | ~$0.035 |
| Each Analysis Tab | ~$0.047 |
| **Full Kit (all 8 tabs)** | **~$0.41** |
| 100 URLs/month | ~$41/month |

Uses Claude Sonnet 4.6 at $3/$15 per million tokens.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

## Security

- API key is **never exposed** to the browser
- All Anthropic calls go through the `/api/analyze` server route
- Vercel encrypts environment variables at rest

## License

Internal use — Holaprime Marketing Team
