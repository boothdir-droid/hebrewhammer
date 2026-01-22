/**
 * Simple scraper that fetches the three profile pages, extracts results heuristically,
 * normalizes them, and writes data/tournaments.json. This is intended to run in CI (GitHub Actions).
 *
 * Environment variables:
 * - FLOW_URL
 * - WRESTLING_URL
 * - TRACK_URL
 *
 * If env vars not set, uses default sample URLs you provided.
 */

import fs from "fs";
import fetch from "node-fetch";
import cheerio from "cheerio";

const FLOW = process.env.FLOW_URL || "https://www.flowrestling.org/nextgen/people/13583018?tab=home";
const WRESTLING = process.env.WRESTLING_URL || "https://www.wrestlingtournaments.com/wrestlerProfile/76818?tab=results";
const TRACK = process.env.TRACK_URL || "https://www.trackwrestling.com/membership/ViewProfile.jsp?twId=1225324138";

function normalizeDate(raw) {
  if (!raw) return "";
  const x = raw.trim();
  const parsed = Date.parse(x);
  if (!isNaN(parsed)) return new Date(parsed).toISOString().slice(0,10);
  const m = x.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const mon = String(Number(m[1])).padStart(2,"0");
    const day = String(Number(m[2])).padStart(2,"0");
    let year = m[3];
    if (year.length === 2) year = "20" + year;
    return `${year}-${mon}-${day}`;
  }
  return x;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": "HebrewHammerScraper/1.0 (+https://hebrewhammer.live/)" } });
  if (!res.ok) {
    console.warn("Fetch failed", url, res.status);
    return "";
  }
  return await res.text();
}

function dedupe(existing, parsed) {
  const map = new Map();
  existing.forEach(e => {
    const key = `${(e.title||"").trim()}|${(e.date||"").trim()}|${(e.result||"").trim()}|${(e.source||"")}`;
    map.set(key, e);
  });
  parsed.forEach(p => {
    const key = `${(p.title||"").trim()}|${(p.date||"").trim()}|${(p.result||"").trim()}|${(p.source||"")}`;
    if (!map.has(key)) map.set(key, p);
  });
  return Array.from(map.values()).sort((a,b) => {
    const da = Date.parse(a.date) || 0;
    const db = Date.parse(b.date) || 0;
    return db - da;
  });
}

async function parseFlow(html) {
  const $ = cheerio.load(html);
  const results = [];
  $("table").each((i, t) => {
    const headers = $(t).find("th").map((i,th) => $(th).text().toLowerCase()).get().join(" ");
    if (headers.includes("event") || headers.includes("result") || headers.includes("tournament")) {
      $(t).find("tbody tr").each((i, tr) => {
        const cells = $(tr).find("td").map((i,td) => $(td).text().trim()).get();
        const item = {};
        if (cells.length >= 3) {
          item.date = normalizeDate(cells[0]);
          item.title = cells[1];
          item.result = cells.slice(2).join(" | ");
        } else {
          item.title = cells.join(" | ");
        }
        results.push({...item, source:"flow", link: FLOW});
      });
    }
  });

  $(".results, .result-list, .profile-results").find("li, .row").each((i, el) => {
    const text = $(el).text().trim().replace(/\s{2,}/g, " | ");
    if (!text) return;
    const parts = text.split("|").map(s => s.trim()).filter(Boolean);
    const item = {};
    if (parts.length >= 3) {
      item.date = normalizeDate(parts[0]);
      item.title = parts[1];
      item.result = parts.slice(2).join(" - ");
    } else if (parts.length === 2) {
      item.title = parts[0];
      item.result = parts[1];
    } else {
      item.title = text;
    }
    results.push({...item, source:"flow", link: FLOW});
  });

  return results;
}

async function parseWrestling(html) {
  const $ = cheerio.load(html);
  const results = [];
  $("table").each((i, t) => {
    const headers = $(t).find("th").text().toLowerCase();
    if (headers.includes("event") || headers.includes("place") || headers.includes("opponent")) {
      $(t).find("tbody tr").each((i, tr) => {
        const cells = $(tr).find("td").map((i,td) => $(td).text().trim()).get();
        const item = {};
        if (cells.length >= 3) {
          item.date = normalizeDate(cells[0]);
          item.title = cells[1];
          item.result = cells[2];
        } else item.title = cells.join(" | ");
        results.push({...item, source:"wrestlingtournaments", link: WRESTLING});
      });
    }
  });

  $(".profileResults, .results").find("li, tr").each((i, el) => {
    const text = $(el).text().trim().replace(/\s{2,}/g, " | ");
    if (!text) return;
    const parts = text.split("|").map(s => s.trim()).filter(Boolean);
    const item = {};
    if (parts.length >= 3) {
      item.date = normalizeDate(parts[0]);
      item.title = parts[1];
      item.result = parts.slice(2).join(" - ");
    } else if (parts.length === 2) {
      item.title = parts[0];
      item.result = parts[1];
    } else item.title = text;
    results.push({...item, source:"wrestlingtournaments", link: WRESTLING});
  });

  return results;
}

async function parseTrack(html) {
  const $ = cheerio.load(html);
  const results = [];
  $("table").each((i, t) => {
    const headers = $(t).find("th").text().toLowerCase();
    if (headers.includes("tournament") || headers.includes("place") || headers.includes("result")) {
      $(t).find("tbody tr").each((i, tr) => {
        const cells = $(tr).find("td").map((i,td) => $(td).text().trim()).get();
        const item = {};
        if (cells.length >= 3) {
          item.date = normalizeDate(cells[0]);
          item.title = cells[1];
          item.result = cells[2];
        } else item.title = cells.join(" | ");
        results.push({...item, source:"track", link: TRACK});
      });
    }
  });

  $(".competition-history, .results").find("li, tr").each((i, el) => {
    const text = $(el).text().trim().replace(/\s{2,}/g, " | ");
    if (!text) return;
    const parts = text.split("|").map(s => s.trim()).filter(Boolean);
    const item = {};
    if (parts.length >= 3) {
      item.date = normalizeDate(parts[0]);
      item.title = parts[1];
      item.result = parts.slice(2).join(" - ");
    } else if (parts.length === 2) {
      item.title = parts[0];
      item.result = parts[1];
    } else item.title = text;
    results.push({...item, source:"track", link: TRACK});
  });

  return results;
}

async function main() {
  try {
    const existing = JSON.parse(fs.existsSync("data/tournaments.json") ? fs.readFileSync("data/tournaments.json","utf8") : "[]");

    const [flowHtml, wrestHtml, trackHtml] = await Promise.all([fetchHtml(FLOW), fetchHtml(WRESTLING), fetchHtml(TRACK)]);
    const parsed = [
      ...(await parseFlow(flowHtml)),
      ...(await parseWrestling(wrestHtml)),
      ...(await parseTrack(trackHtml))
    ];

    parsed.forEach(p => { if (p.date) p.date = normalizeDate(p.date); });

    const merged = dedupe(existing, parsed);
    fs.writeFileSync("data/tournaments.json", JSON.stringify(merged, null, 2));
    console.log("Wrote data/tournaments.json with", merged.length, "entries");
  } catch (err) {
    console.error("Scraper error", err);
    process.exit(1);
  }
}

main();
