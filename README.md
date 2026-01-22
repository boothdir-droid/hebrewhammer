# README for hebrewhammer static site
This repo contains a static website and an automated scraper that updates `data/tournaments.json`.

Quick start:
1. Add this repo to GitHub.
2. In the repo Settings -> Secrets, set optional secrets:
   - `FLOW_URL`, `WRESTLING_URL`, `TRACK_URL` (if you wish to override the defaults).
3. Enable GitHub Pages (or use Netlify) to serve the site.
4. Add photos into `assets/` (photo1.jpg, photo2.jpg).
5. The scheduled Action will run every 6 hours and update `data/tournaments.json`.

To run the scraper locally:
- cd scripts
- npm install
- node scrape.js

Notes:
- Review Terms of Service of target websites before scraping.
- If TrackWrestling requires login, its data may be partial.

