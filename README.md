# 书架 · Novel Tracker

A personal tracker for Chinese novels from GongZiCP and JJWXC. Paste a novel URL and it auto-fetches the title, author, word count, chapter count, and tags for you.

## What's in this repo

```
novel-tracker/
├── api/
│   └── scrape.js        ← Vercel serverless function (the scraper)
├── public/
│   ├── index.html       ← The tracker app
│   └── manifest.json    ← PWA manifest (add to home screen)
├── vercel.json          ← Routing config
└── package.json
```

---

## Deployment Guide

### Step 1 — Push to GitHub

1. Create a new repo on GitHub (e.g. `novel-tracker`)
2. In your terminal, inside this folder:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/novel-tracker.git
git push -u origin main
```

### Step 2 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Select your `novel-tracker` repo
4. Leave all settings as default — Vercel auto-detects everything
5. Click **"Deploy"**

That's it. Vercel gives you a URL like `https://novel-tracker-xxx.vercel.app`.

> Every time you push to GitHub, Vercel auto-redeploys. No manual steps needed.

### Step 3 — Add to Home Screen

**On iPhone (Safari):**
1. Open your Vercel URL in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap "Add"

**On Android (Chrome):**
1. Open your Vercel URL in Chrome
2. Tap the three dots menu
3. Tap "Add to Home Screen"

---

## How to use

1. Find a novel on GongZiCP or JJWXC
2. Copy the URL from your browser
3. Paste it into the tracker and tap **Fetch**
4. Review the auto-filled data, add your notes and rating
5. Tap **Add to shelf**

---

## Notes

- Data is stored in your browser's localStorage — it stays on your device
- The scraper works on a best-effort basis; some fields may not parse if the site changes its HTML structure
- GongZiCP may require login for some novels — in that case, fields will be partially filled
