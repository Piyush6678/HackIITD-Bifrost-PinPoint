import sharp from "sharp";
import type { Category } from "../../src/lib/constants";

// Illustrated street scenes for the demo reports, drawn as SVG and saved as JPEG. Each one
// is labelled as an illustration so nobody mistakes the demo data for real evidence.

export type SceneState = "before" | "partial" | "after";

const W = 1200;
const H = 900;
const HORIZON = 430;

// Small deterministic generator, so a reseed draws the same pictures.
function random(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const pick = <T>(r: () => number, items: T[]) => items[Math.floor(r() * items.length)];

function buildings(r: () => number, night: boolean) {
  const walls = night ? ["#2b3540", "#33404c", "#283039"] : ["#d9c7a7", "#c9a57c", "#e2d4bd", "#b98d68", "#d6b48f"];
  let x = -20;
  let out = "";
  while (x < W) {
    const w = 140 + r() * 120;
    const h = 170 + r() * 160;
    const top = HORIZON - h;
    out += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${pick(r, walls)}"/>`;
    // A shop shutter at street level and rows of windows above it.
    out += `<rect x="${x + 14}" y="${HORIZON - 70}" width="${w - 28}" height="70" fill="${night ? "#1d242b" : "#8b8f93"}"/>`;
    for (let wy = top + 24; wy < HORIZON - 100; wy += 58) {
      for (let wx = x + 18; wx < x + w - 40; wx += 52) {
        const lit = night ? r() > 0.55 : false;
        out += `<rect x="${wx}" y="${wy}" width="30" height="34" fill="${lit ? "#f3d27a" : night ? "#151b21" : "#6f8597"}"/>`;
      }
    }
    if (r() > 0.5) {
      const sign = pick(r, ["#a63d35", "#2f6db0", "#13a58a", "#c97a1c"]);
      out += `<rect x="${x + 20}" y="${HORIZON - 100}" width="${Math.min(w - 40, 150)}" height="24" fill="${sign}"/>`;
    }
    x += w + 6;
  }
  return out;
}

function street(night: boolean) {
  const asphalt = night ? "#2d3033" : "#5f6366";
  return `
    <rect x="0" y="${HORIZON}" width="${W}" height="70" fill="${night ? "#4a4d50" : "#a9a49a"}"/>
    <rect x="0" y="${HORIZON + 70}" width="${W}" height="14" fill="${night ? "#6b6b6b" : "#d8d3c8"}"/>
    <polygon points="0,${HORIZON + 84} ${W},${HORIZON + 84} ${W},${H} 0,${H}" fill="${asphalt}"/>
    <g fill="${night ? "#8d8a72" : "#e8e3cf"}" opacity="0.8">
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="${60 + i * 250}" y="${H - 170}" width="130" height="12"/>`).join("")}
    </g>`;
}

function sky(night: boolean) {
  return night
    ? `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1426"/><stop offset="1" stop-color="#26324a"/></linearGradient></defs>
       <rect width="${W}" height="${HORIZON}" fill="url(#sky)"/>`
    : `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3ef"/><stop offset="1" stop-color="#eef1ea"/></linearGradient></defs>
       <rect width="${W}" height="${HORIZON}" fill="url(#sky)"/>`;
}

// What differs between categories: the problem itself, drawn in front of the street.
function problem(category: Category, state: SceneState, r: () => number) {
  const cx = 520 + r() * 160;
  const cy = 700 + r() * 40;
  switch (category) {
    case "pothole": {
      if (state === "after") {
        return `<rect x="${cx - 300}" y="${cy - 100}" width="600" height="200" rx="6" fill="#3f4245"/>
                <rect x="${cx - 300}" y="${cy - 100}" width="600" height="200" rx="6" fill="none" stroke="#2c2e30" stroke-width="4"/>`;
      }
      const scale = state === "partial" ? 1 : 1.6;
      const patch = state === "partial"
        ? `<path d="M${cx - 200},${cy - 60} l120,-20 l60,40 l-40,70 l-150,10 z" fill="#46494c" opacity="0.9"/>`
        : "";
      return `${patch}
        <ellipse cx="${cx}" cy="${cy}" rx="${170 * scale}" ry="${62 * scale}" fill="#3a3027"/>
        <ellipse cx="${cx + 8}" cy="${cy + 6}" rx="${140 * scale}" ry="${46 * scale}" fill="#241d17"/>
        <ellipse cx="${cx + 20}" cy="${cy + 14}" rx="${80 * scale}" ry="${20 * scale}" fill="#6d7f8c" opacity="0.7"/>
        <g fill="#7b746a">${Array.from({ length: 9 }, () => `<circle cx="${cx - 180 + r() * 360}" cy="${cy - 60 + r() * 120}" r="${4 + r() * 6}"/>`).join("")}</g>`;
    }
    case "garbage": {
      if (state === "after") {
        return `<rect x="900" y="${HORIZON + 10}" width="70" height="90" rx="8" fill="#2f7d4a"/>
                <rect x="894" y="${HORIZON + 2}" width="82" height="14" rx="4" fill="#256a3c"/>`;
      }
      const n = state === "partial" ? 12 : 40;
      const colours = ["#3d3d3d", "#2f6db0", "#5e7d2b", "#c97a1c", "#a63d35", "#e6e0d0", "#1f1f1f"];
      return `<ellipse cx="${cx}" cy="${HORIZON + 120}" rx="${state === "partial" ? 160 : 360}" ry="60" fill="#4e4436" opacity="0.6"/>
        <g>${Array.from({ length: n }, () => {
          const x = cx - (state === "partial" ? 150 : 330) + r() * (state === "partial" ? 300 : 660);
          const y = HORIZON + 50 + r() * 130;
          return `<ellipse cx="${x}" cy="${y}" rx="${34 + r() * 40}" ry="${24 + r() * 30}" fill="${pick(r, colours)}"/>`;
        }).join("")}</g>`;
    }
    case "streetlight": {
      const lit = state === "after";
      return `<rect x="836" y="160" width="14" height="${HORIZON + 80 - 160}" fill="#6b7177"/>
        <path d="M843,170 q-70,-10 -110,20" stroke="#6b7177" stroke-width="12" fill="none"/>
        <rect x="700" y="182" width="64" height="22" rx="6" fill="${lit ? "#fff3c4" : "#3b4046"}"/>
        ${lit ? `<polygon points="702,204 762,204 900,${H} 560,${H}" fill="#fff1b8" opacity="0.28"/>` : ""}
        ${state === "partial" ? `<rect x="700" y="182" width="64" height="22" rx="6" fill="#d8c27a" opacity="0.45"/>` : ""}`;
    }
    case "waterlogging": {
      if (state === "after") {
        return `<ellipse cx="${cx}" cy="${cy + 20}" rx="120" ry="18" fill="#6f7f88" opacity="0.35"/>`;
      }
      const rx = state === "partial" ? 300 : 620;
      return `<ellipse cx="${W / 2}" cy="${cy}" rx="${rx}" ry="${state === "partial" ? 70 : 150}" fill="#6d8a7c" opacity="0.92"/>
        <g stroke="#a9c3bb" stroke-width="4" fill="none" opacity="0.8">
          ${Array.from({ length: 7 }, () => `<path d="M${W / 2 - rx / 2 + r() * rx},${cy - 60 + r() * 120} q30,-10 60,0"/>`).join("")}
        </g>`;
    }
    case "sewage": {
      const cover = `<ellipse cx="${cx}" cy="${cy}" rx="90" ry="30" fill="#2b2b2b"/><ellipse cx="${cx}" cy="${cy}" rx="78" ry="24" fill="none" stroke="#555" stroke-width="5"/>`;
      if (state === "after") return cover;
      const spread = state === "partial" ? 150 : 330;
      return `<ellipse cx="${cx}" cy="${cy + 20}" rx="${spread}" ry="${spread / 3.2}" fill="#5b4a2c" opacity="0.92"/>
        <ellipse cx="${cx}" cy="${cy}" rx="90" ry="30" fill="#151515"/>
        <g fill="#7a6438">${Array.from({ length: 6 }, () => `<circle cx="${cx - spread / 2 + r() * spread}" cy="${cy - 20 + r() * 60}" r="${6 + r() * 10}"/>`).join("")}</g>`;
    }
    case "encroachment": {
      if (state === "after") return "";
      const stalls = state === "partial" ? 1 : 3;
      return Array.from({ length: stalls }, (_, i) => {
        const x = 180 + i * 300;
        const canopy = pick(r, ["#a63d35", "#2f6db0", "#c97a1c", "#13a58a"]);
        return `<rect x="${x}" y="${HORIZON + 10}" width="230" height="110" fill="#8a6a45"/>
          <polygon points="${x - 20},${HORIZON + 10} ${x + 250},${HORIZON + 10} ${x + 220},${HORIZON - 50} ${x + 10},${HORIZON - 50}" fill="${canopy}"/>
          <g fill="#e2c26a">${Array.from({ length: 5 }, (_, j) => `<circle cx="${x + 30 + j * 42}" cy="${HORIZON + 40}" r="14"/>`).join("")}</g>`;
      }).join("");
    }
    default: {
      // A fallen branch across the footpath.
      if (state === "after") return `<rect x="${cx + 160}" y="${HORIZON + 30}" width="120" height="16" rx="6" fill="#6b4a2b" opacity="0.5"/>`;
      const len = state === "partial" ? 260 : 620;
      return `<path d="M${cx - len / 2},${HORIZON + 90} L${cx + len / 2},${HORIZON + 40}" stroke="#6b4a2b" stroke-width="26" stroke-linecap="round"/>
        <g fill="#4f7a34">${Array.from({ length: state === "partial" ? 5 : 14 }, () => `<circle cx="${cx - len / 2 + r() * len}" cy="${HORIZON + 30 + r() * 70}" r="${26 + r() * 22}"/>`).join("")}</g>`;
    }
  }
}

export async function drawScene(category: Category, state: SceneState, seed: number) {
  const night = category === "streetlight";
  // Same street for before and after: only the problem layer uses a state-specific seed.
  const street_ = random(seed);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${sky(night)}
    ${buildings(street_, night)}
    ${street(night)}
    ${problem(category, state, random(seed * 7 + 3))}
    <rect x="24" y="${H - 58}" width="330" height="36" rx="6" fill="#000" opacity="0.55"/>
    <text x="40" y="${H - 33}" font-family="Arial, sans-serif" font-size="20" fill="#fff">Illustration · demo data</text>
  </svg>`;
  const data = await sharp(Buffer.from(svg)).jpeg({ quality: 78 }).toBuffer();
  return { data, mimeType: "image/jpeg", size: data.length };
}
