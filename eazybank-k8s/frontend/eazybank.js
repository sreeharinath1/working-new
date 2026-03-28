import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
//  ██████  ██████  ███    ██ ███████ ██  ██████     ██████  ██████
// ██      ██    ██ ████   ██ ██      ██ ██          ██   ██ ██
// ██      ██    ██ ██ ██  ██ █████   ██ ██          ██████  ██
// ██      ██    ██ ██  ██ ██ ██      ██ ██          ██   ██ ██
//  ██████  ██████  ██   ████ ██      ██  ██████     ██   ██ ██████
// ═══════════════════════════════════════════════════════════════
// CONFIG — Edit these values to match your deployment
// ───────────────────────────────────────────────────────────────

const CONFIG = {
  // ── EC2 / Server ────────────────────────────────────────────
  EC2_IP: "13.233.158.149",           // Your AWS EC2 public IP

  // ── Keycloak / Auth ─────────────────────────────────────────
  KC_REALM:   "master",               // Keycloak realm name
  KC_CLIENT:  "eazybank-callcenter-cc", // Keycloak client ID
  KC_SECRET:  "",                     // Keycloak client secret (leave "" if public)

  // ── Token refresh (ms) ──────────────────────────────────────
  REFRESH_MS: 50_000,                 // Auto-refresh token every 50s

  // ── NodePort (only used in DIRECT mode) ─────────────────────
  DEFAULT_GW_PORT: "30564",           // Spring Cloud Gateway NodePort
  DEFAULT_KC_PORT: "31479",           // Keycloak NodePort

  // ── Nginx base paths (NGINX mode, relative URLs) ────────────
  // All API calls go to  /eazybank/<service>/api/<endpoint>
  // Nginx proxies them → Spring Cloud Gateway → microservices
  BASE_ACCOUNTS: "/eazybank/accounts/api",
  BASE_LOANS:    "/eazybank/loans/api",
  BASE_CARDS:    "/eazybank/cards/api",

  // ── Correlation header (Customer 360) ───────────────────────
  CORRELATION_HEADER: "eazybank-correlation-id",
};

// ═══════════════════════════════════════════════════════════════
// STYLES (CSS-in-JS via template literal injected into <head>)
// ═══════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --ink:#080b12; --ink1:#0d1120; --ink2:#121729; --ink3:#18202f; --ink4:#1e2840;
  --rim:#ffffff0a; --rim2:#ffffff14; --rim3:#ffffff20; --rim4:#ffffff2e;
  --neon:#00ffe0; --neon2:#00c8b4; --neondim:#00ffe01a; --neonborder:#00ffe033;
  --gold:#f0c040; --golddim:#f0c0401a; --goldborder:#f0c04033;
  --rose:#ff4d6d; --rosedim:#ff4d6d18; --roseborder:#ff4d6d33;
  --sky:#4da6ff; --skydim:#4da6ff18; --skyborder:#4da6ff33;
  --lime:#7fff6e; --limedim:#7fff6e18;
  --tx:#e8edf5; --tx2:#9aa4b8; --mu:#4e5a72; --mu2:#2e3548;
  --syne:'Syne',sans-serif; --mono:'Space Mono',monospace;
  --r6:6px; --r8:8px; --r10:10px; --r12:12px; --r16:16px;
}

html, body, #root { height: 100%; background: var(--ink); color: var(--tx); font-family: var(--mono); overflow: hidden; }

body::before {
  content:''; position:fixed; inset:0; pointer-events:none; z-index:0; opacity:.4;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}

.eb-shell { display:grid; grid-template-columns:72px 220px 1fr; grid-template-rows:56px 1fr; height:100vh; position:relative; z-index:1; }

/* TOPBAR */
.eb-topbar { grid-column:1/-1; display:flex; align-items:center; padding:0 20px 0 0; background:var(--ink1); border-bottom:1px solid var(--rim2); gap:12px; z-index:40; position:relative; }
.eb-topbar::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:1px; background:linear-gradient(90deg,#00ffe000,#00ffe066,#00ffe000); }
.eb-brand-strip { width:72px; height:56px; display:flex; align-items:center; justify-content:center; background:var(--ink); border-right:1px solid var(--rim2); border-bottom:1px solid var(--neonborder); flex-shrink:0; }
.eb-brand-logo { width:36px; height:36px; border-radius:10px; background:var(--neondim); border:1px solid var(--neonborder); display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 0 20px #00ffe022,inset 0 0 10px #00ffe011; }
.eb-brand-text { padding:0 16px; border-right:1px solid var(--rim2); }
.eb-brand-name { font-family:var(--syne); font-size:17px; font-weight:800; color:var(--neon); text-shadow:0 0 20px #00ffe088; letter-spacing:-.02em; }
.eb-brand-sub { font-size:9px; color:var(--mu); letter-spacing:.15em; text-transform:uppercase; }
.eb-cfg-row { display:flex; align-items:center; gap:8px; flex:1; }
.eb-cfg-seg { display:flex; align-items:center; gap:6px; padding:0 14px; border-right:1px solid var(--rim2); height:56px; }
.eb-cfg-lbl { font-size:9px; color:var(--mu); text-transform:uppercase; letter-spacing:.1em; white-space:nowrap; }
.eb-cfg-input { background:transparent; border:none; outline:none; color:var(--neon); font-family:var(--mono); font-size:11px; }
.eb-cfg-input.ip { width:125px; } .eb-cfg-input.port { width:44px; }
.eb-mode-wrap { display:flex; gap:3px; }
.eb-mode-btn { padding:4px 10px; border-radius:5px; font-size:10px; cursor:pointer; border:1px solid var(--rim2); background:transparent; color:var(--mu); font-family:var(--mono); transition:all .15s; }
.eb-mode-btn.on { background:var(--neondim); border-color:var(--neonborder); color:var(--neon); text-shadow:0 0 8px var(--neon); }
.eb-tok { display:flex; align-items:center; gap:7px; padding:6px 12px; border-radius:20px; border:1px solid var(--rim2); background:var(--ink2); font-size:11px; transition:all .3s; }
.eb-tok.ok { border-color:var(--neonborder); background:var(--neondim); }
.eb-tok.err { border-color:var(--roseborder); background:var(--rosedim); }
.eb-tok-dot { width:6px; height:6px; border-radius:50%; background:var(--mu2); transition:all .3s; flex-shrink:0; }
.eb-tok.ok .eb-tok-dot { background:var(--neon); box-shadow:0 0 6px var(--neon); animation:blink 2s infinite; }
.eb-tok.err .eb-tok-dot { background:var(--rose); }
.eb-tok.ok .eb-tok-txt { color:var(--neon); }
.eb-tok.err .eb-tok-txt { color:var(--rose); }
.eb-tok-exp { color:var(--mu); font-size:10px; }
@keyframes blink { 0%,100%{opacity:1}50%{opacity:.4} }
.eb-av { width:32px; height:32px; border-radius:50%; background:var(--ink3); border:1px solid var(--rim3); display:flex; align-items:center; justify-content:center; font-size:11px; font-family:var(--syne); font-weight:700; color:var(--neon); cursor:pointer; margin-left:auto; margin-right:8px; flex-shrink:0; }

/* ICON RAIL */
.eb-rail { background:var(--ink); border-right:1px solid var(--rim2); display:flex; flex-direction:column; align-items:center; padding:12px 0; gap:4px; overflow-y:auto; }
.eb-rail-ic { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px; cursor:pointer; transition:all .15s; border:1px solid transparent; position:relative; }
.eb-rail-ic:hover { background:var(--ink3); border-color:var(--rim2); }
.eb-rail-ic.on { background:var(--neondim); border-color:var(--neonborder); }
.eb-rail-ic.on::after { content:''; position:absolute; right:-1px; top:25%; bottom:25%; width:2px; background:var(--neon); border-radius:2px 0 0 2px; box-shadow:0 0 6px var(--neon); }
.eb-rail-sep { width:24px; height:1px; background:var(--rim2); margin:4px 0; }

/* SIDEBAR */
.eb-sidebar { background:var(--ink1); border-right:1px solid var(--rim2); overflow-y:auto; display:flex; flex-direction:column; }
.eb-sb-search { padding:12px; border-bottom:1px solid var(--rim2); }
.eb-sb-si { display:flex; align-items:center; gap:8px; background:var(--ink2); border:1px solid var(--rim2); border-radius:var(--r8); padding:7px 11px; transition:border-color .15s; }
.eb-sb-si:focus-within { border-color:var(--neonborder); }
.eb-sb-si input { background:transparent; border:none; outline:none; color:var(--tx); font-family:var(--mono); font-size:13px; width:100%; }
.eb-sb-si input::placeholder { color:var(--mu); }
.eb-sb-lbl { font-size:9px; text-transform:uppercase; letter-spacing:.12em; color:var(--mu2); padding:8px 16px 4px; }
.eb-ni { display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:var(--r8); cursor:pointer; font-size:12.5px; color:var(--tx2); transition:all .15s; border:1px solid transparent; margin:0 8px 1px; position:relative; }
.eb-ni:hover { background:var(--ink3); color:var(--tx); }
.eb-ni.on { background:var(--ink3); color:var(--neon); border-color:var(--rim2); }
.eb-ni.on::before { content:''; position:absolute; left:-1px; top:20%; bottom:20%; width:2px; background:var(--neon); border-radius:0 2px 2px 0; box-shadow:0 0 8px var(--neon); }
.eb-ni-ic { width:22px; height:22px; border-radius:6px; background:var(--ink2); display:flex; align-items:center; justify-content:center; font-size:12px; flex-shrink:0; }
.eb-ni.on .eb-ni-ic { background:var(--neondim); }
.eb-ni-badge { font-size:9px; background:var(--ink2); padding:2px 5px; border-radius:4px; color:var(--mu); flex-shrink:0; }
.eb-ni-live { width:5px; height:5px; border-radius:50%; background:var(--neon); box-shadow:0 0 4px var(--neon); flex-shrink:0; }
.eb-sb-footer { margin-top:auto; padding:12px; border-top:1px solid var(--rim2); }
.eb-sb-stat { display:flex; justify-content:space-between; margin-bottom:4px; }
.eb-sb-k { font-size:9px; text-transform:uppercase; color:var(--mu); }
.eb-sb-v { font-size:9px; color:var(--neon2); }
.eb-sb-arch { font-size:10px; color:var(--mu2); line-height:1.7; margin-top:8px; }
.eb-sb-arch span { color:var(--neon); font-size:9px; }

/* MAIN */
.eb-main { overflow-y:auto; background:var(--ink); position:relative; }
.eb-page { display:none; padding:24px 28px; min-height:calc(100vh - 56px); animation:pageIn .18s ease; }
.eb-page.on { display:block; }
@keyframes pageIn { from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none} }

/* PAGE HEADER */
.eb-ph { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:22px; }
.eb-ph h2 { font-family:var(--syne); font-size:24px; font-weight:800; letter-spacing:-.03em; margin-bottom:3px; line-height:1.1; }
.eb-ph h2 em { color:var(--neon); font-style:normal; text-shadow:0 0 20px #00ffe055; }
.eb-ph p { font-size:12px; color:var(--tx2); line-height:1.5; }
.eb-route-pill { font-size:10px; color:var(--mu); background:var(--ink2); border:1px solid var(--rim2); padding:4px 12px; border-radius:20px; }

/* STAT CARDS */
.eb-stat-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
.eb-stat { background:var(--ink1); border:1px solid var(--rim2); border-radius:var(--r12); padding:14px 16px; position:relative; overflow:hidden; transition:border-color .2s; }
.eb-stat:hover { border-color:var(--rim3); }
.eb-stat .s-ico { position:absolute; right:12px; top:10px; font-size:20px; opacity:.12; }
.eb-stat .s-lbl { font-size:9px; text-transform:uppercase; letter-spacing:.1em; color:var(--mu); margin-bottom:8px; }
.eb-stat .s-val { font-family:var(--syne); font-size:24px; font-weight:700; line-height:1; margin-bottom:4px; }
.eb-stat .s-sub { font-size:10px; color:var(--mu); }
.eb-stat.neon { border-color:var(--neonborder); } .eb-stat.neon .s-val { color:var(--neon); text-shadow:0 0 16px #00ffe066; }
.eb-stat.gold { border-color:var(--goldborder); } .eb-stat.gold .s-val { color:var(--gold); }
.eb-stat.rose { border-color:var(--roseborder); } .eb-stat.rose .s-val { color:var(--rose); }
.eb-stat.sky { border-color:var(--skyborder); } .eb-stat.sky .s-val { color:var(--sky); }

/* SERVICE GRID */
.eb-svc-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
.eb-svc { background:var(--ink1); border:1px solid var(--rim2); border-radius:var(--r12); padding:16px; cursor:pointer; transition:all .2s; position:relative; overflow:hidden; }
.eb-svc::after { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:var(--c,transparent); }
.eb-svc:hover { border-color:var(--rim3); transform:translateY(-2px); background:var(--ink2); }
.eb-svc-head { display:flex; align-items:center; gap:7px; margin-bottom:7px; }
.eb-svc-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; box-shadow:0 0 6px currentColor; }
.eb-svc-name { font-family:var(--syne); font-size:13px; font-weight:600; flex:1; }
.eb-svc-port { font-size:9px; color:var(--mu); background:var(--ink3); padding:2px 7px; border-radius:20px; }
.eb-svc-desc { font-size:11px; color:var(--tx2); line-height:1.55; margin-bottom:10px; }
.eb-svc-foot { display:flex; align-items:center; justify-content:space-between; }
.eb-svc-eps { font-size:10px; color:var(--mu); }
.eb-svc-eps b { color:var(--neon2); }
.eb-svc-arr { font-size:11px; color:var(--mu); transition:all .2s; }
.eb-svc:hover .eb-svc-arr { color:var(--neon); transform:translateX(3px); }

/* ACTIVITY */
.eb-act { background:var(--ink1); border:1px solid var(--rim2); border-radius:var(--r12); padding:16px; }
.eb-act h3 { font-size:11px; font-weight:400; color:var(--tx2); margin-bottom:12px; display:flex; align-items:center; gap:8px; text-transform:uppercase; letter-spacing:.1em; }
.eb-act h3::after { content:''; flex:1; height:1px; background:var(--rim2); }
.eb-act-empty { text-align:center; padding:24px; color:var(--mu); font-size:12px; }
.eb-act-item { display:flex; align-items:center; gap:9px; padding:8px 0; border-bottom:1px solid var(--rim); }
.eb-act-item:last-child { border-bottom:none; }
.eb-act-ic { width:28px; height:28px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
.eb-act-ic.ok { background:var(--neondim); } .eb-act-ic.err { background:var(--rosedim); }
.eb-act-body { flex:1; min-width:0; }
.eb-act-title { font-size:12px; color:var(--tx2); margin-bottom:1px; }
.eb-act-meta { font-size:10px; color:var(--mu); }
.eb-act-code { font-size:10px; padding:2px 7px; border-radius:20px; }
.ac-2{background:var(--neondim);color:var(--neon);border:1px solid var(--neonborder)}
.ac-4{background:var(--golddim);color:var(--gold);border:1px solid var(--goldborder)}
.ac-5{background:var(--rosedim);color:var(--rose);border:1px solid var(--roseborder)}

/* BANKING LAYOUT */
.eb-b-layout { display:grid; grid-template-columns:1fr 340px; gap:16px; align-items:start; }

/* TABS */
.eb-tabs { display:flex; gap:2px; background:var(--ink1); border:1px solid var(--rim2); border-radius:var(--r10); padding:3px; width:fit-content; margin-bottom:16px; }
.eb-tab { padding:6px 16px; border-radius:7px; cursor:pointer; font-size:12px; color:var(--mu); transition:all .15s; display:flex; align-items:center; gap:5px; border:none; background:transparent; }
.eb-tab:hover { color:var(--tx2); }
.eb-tab.on { background:var(--ink3); color:var(--neon); box-shadow:0 0 12px #00ffe018; }

/* FORM CARD */
.eb-fc { background:var(--ink1); border:1px solid var(--rim2); border-radius:var(--r12); overflow:hidden; margin-bottom:14px; }
.eb-fc-head { padding:14px 18px; border-bottom:1px solid var(--rim2); display:flex; align-items:center; gap:9px; }
.eb-fc-icon { width:26px; height:26px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:13px; }
.eb-fc-title { font-family:var(--syne); font-size:14px; font-weight:600; flex:1; }
.eb-method { font-size:9px; font-weight:700; padding:3px 7px; border-radius:4px; }
.m-post{background:var(--skydim);color:var(--sky)} .m-get{background:var(--neondim);color:var(--neon)}
.m-put{background:var(--golddim);color:var(--gold)} .m-delete{background:var(--rosedim);color:var(--rose)}
.eb-fc-body { padding:16px 18px; }

/* FORM */
.eb-fr { margin-bottom:12px; }
.eb-fr label { display:block; font-size:9px; text-transform:uppercase; letter-spacing:.08em; color:var(--mu); margin-bottom:4px; }
.eb-fr input, .eb-fr select, .eb-fr textarea { width:100%; background:var(--ink2); border:1px solid var(--rim2); border-radius:var(--r8); padding:8px 12px; color:var(--tx); font-family:var(--mono); font-size:13px; outline:none; transition:all .2s; }
.eb-fr input:focus, .eb-fr select:focus { border-color:var(--neonborder); background:var(--ink3); box-shadow:0 0 0 3px #00ffe00a; }
.eb-fr input::placeholder { color:var(--mu2); }
.eb-fr select option { background:var(--ink2); }
.eb-fr-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.eb-fr-hint { font-size:10px; color:var(--mu2); margin-top:3px; }

/* BUTTONS */
.eb-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:var(--r8); border:none; font-family:var(--mono); font-size:12px; font-weight:700; cursor:pointer; transition:all .18s; white-space:nowrap; text-transform:uppercase; letter-spacing:.04em; }
.eb-btn.primary { background:var(--neon); color:var(--ink); box-shadow:0 0 20px #00ffe033; }
.eb-btn.primary:hover { background:var(--neon2); transform:translateY(-1px); box-shadow:0 4px 20px #00ffe044; }
.eb-btn.ghost { background:transparent; border:1px solid var(--rim3); color:var(--tx2); }
.eb-btn.ghost:hover { border-color:var(--neonborder); color:var(--neon); background:var(--neondim); }
.eb-btn.danger { background:var(--rosedim); border:1px solid var(--roseborder); color:var(--rose); }
.eb-btn.danger:hover { background:var(--rose); color:#fff; border-color:var(--rose); }
.eb-btn.sm { padding:5px 12px; font-size:10px; }
.eb-btn-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }

/* RESPONSE BOX */
.eb-res { border:1px solid var(--rim2); border-radius:var(--r10); overflow:hidden; background:var(--ink2); margin-top:12px; }
.eb-res-head { padding:7px 12px; display:flex; align-items:center; gap:7px; border-bottom:1px solid var(--rim); background:var(--ink3); }
.eb-res-body { padding:10px 12px; font-size:11px; line-height:1.75; white-space:pre-wrap; max-height:240px; overflow-y:auto; color:var(--tx2); }
.eb-pill { padding:3px 8px; border-radius:20px; font-size:10px; font-weight:700; }
.p2{background:var(--neondim);color:var(--neon);border:1px solid var(--neonborder)}
.p4{background:var(--golddim);color:var(--gold);border:1px solid var(--goldborder)}
.p5{background:var(--rosedim);color:var(--rose);border:1px solid var(--roseborder)}

/* DATA CARDS */
.eb-d-card { background:var(--ink2); border:1px solid var(--rim2); border-radius:var(--r12); overflow:hidden; margin-bottom:12px; }
.eb-d-card-h { padding:16px 18px; background:var(--ink3); border-bottom:1px solid var(--rim2); }
.eb-d-name { font-family:var(--syne); font-size:18px; font-weight:700; margin-bottom:2px; }
.eb-d-meta { font-size:11px; color:var(--mu); display:flex; align-items:center; gap:10px; }
.eb-d-badge { font-size:9px; padding:2px 8px; border-radius:20px; background:var(--neondim); color:var(--neon); border:1px solid var(--neonborder); }
.eb-d-body { padding:14px 18px; }
.eb-d-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.eb-d-item { background:var(--ink1); border:1px solid var(--rim); border-radius:var(--r8); padding:9px 12px; }
.eb-d-item.span2 { grid-column:1/-1; }
.eb-di-l { font-size:9px; color:var(--mu); text-transform:uppercase; letter-spacing:.07em; margin-bottom:3px; }
.eb-di-v { font-size:12px; color:var(--tx); }

/* FIN WIDGET */
.eb-fin { background:var(--ink2); border:1px solid var(--rim2); border-radius:var(--r12); overflow:hidden; margin-bottom:12px; }
.eb-fin-h { padding:14px 18px; background:var(--ink3); border-bottom:1px solid var(--rim2); display:flex; justify-content:space-between; align-items:flex-start; }
.eb-fin-type { font-family:var(--syne); font-size:16px; font-weight:700; }
.eb-fin-num { font-size:10px; color:var(--mu); margin-top:2px; }
.eb-fin-b { padding:14px 18px; }
.eb-prog-wrap { margin-bottom:12px; }
.eb-prog-labels { display:flex; justify-content:space-between; margin-bottom:5px; }
.eb-prog-labels span { font-size:10px; color:var(--mu); }
.eb-prog-labels b { font-size:11px; font-weight:700; }
.eb-prog-bar { height:4px; background:var(--rim2); border-radius:2px; overflow:hidden; }
.eb-prog-fill { height:100%; border-radius:2px; transition:width .6s ease; }
.eb-amt-row { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.eb-amt-item { text-align:center; background:var(--ink1); border:1px solid var(--rim); border-radius:var(--r8); padding:9px 6px; }
.eb-ai-l { font-size:9px; color:var(--mu); text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px; }
.eb-ai-v { font-family:var(--syne); font-size:15px; font-weight:700; }
.eb-ai-v.neon{color:var(--neon)} .eb-ai-v.gold{color:var(--gold)} .eb-ai-v.rose{color:var(--rose)} .eb-ai-v.sky{color:var(--sky)}

/* CUSTOMER 360 */
.eb-c360-hdr { background:var(--ink1); border:1px solid var(--neonborder); border-radius:var(--r12); padding:18px; margin-bottom:14px; display:flex; align-items:center; gap:14px; box-shadow:0 0 30px #00ffe00a; }
.eb-c360-av { width:48px; height:48px; border-radius:50%; background:var(--neondim); border:2px solid var(--neonborder); display:flex; align-items:center; justify-content:center; font-family:var(--syne); font-size:18px; font-weight:800; color:var(--neon); flex-shrink:0; box-shadow:0 0 16px #00ffe033; }
.eb-c360-name { font-family:var(--syne); font-size:18px; font-weight:700; margin-bottom:3px; }
.eb-c360-row { font-size:11px; color:var(--tx2); display:flex; gap:14px; }

/* GW GRID */
.eb-gw-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.eb-gw-panel { background:var(--ink1); border:1px solid var(--rim2); border-radius:var(--r12); overflow:hidden; }
.eb-gw-head { padding:11px 14px; border-bottom:1px solid var(--rim2); display:flex; align-items:center; gap:7px; font-size:12px; font-family:var(--syne); font-weight:600; }
.eb-gw-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; box-shadow:0 0 5px currentColor; }
.eb-gw-body { padding:10px; }
.eb-gw-btn { width:100%; display:flex; align-items:center; gap:7px; padding:8px 10px; border-radius:var(--r8); border:1px solid var(--rim2); background:transparent; color:var(--tx2); font-family:var(--mono); font-size:11px; cursor:pointer; transition:all .15s; margin-bottom:5px; text-align:left; }
.eb-gw-btn:hover { background:var(--ink3); border-color:var(--neonborder); color:var(--neon); }
.eb-gw-method { font-size:8px; padding:2px 5px; border-radius:3px; background:var(--neondim); color:var(--neon); flex-shrink:0; }

/* TOAST */
.eb-toast-wrap { position:fixed; bottom:18px; right:18px; z-index:9999; display:flex; flex-direction:column; gap:6px; align-items:flex-end; pointer-events:none; }
.eb-toast { background:var(--ink3); border:1px solid var(--rim3); border-radius:var(--r10); padding:10px 14px; font-size:12px; display:flex; align-items:center; gap:8px; animation:toastIn .25s ease; box-shadow:0 8px 32px #00000099; max-width:280px; }
@keyframes toastIn { from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none} }
.eb-toast.ok{border-color:var(--neonborder)} .eb-toast.err{border-color:var(--roseborder)} .eb-toast.info{border-color:var(--skyborder)}

/* SCROLLBAR */
::-webkit-scrollbar{width:3px;height:3px} ::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--rim3);border-radius:2px} ::-webkit-scrollbar-thumb:hover{background:var(--rim4)}
`;

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════
const fmt = (n) => (n ? Number(n).toLocaleString("en-IN") : "0");
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ResBox({ data }) {
  if (!data) return null;
  const { status, statusText, ms, method, path, body } = data;
  const sc = status < 300 ? "p2" : status < 500 ? "p4" : "p5";
  return (
    <div className="eb-res">
      <div className="eb-res-head">
        <span className={`eb-pill ${sc}`}>{status} {statusText}</span>
        <span style={{ color: "var(--mu)", fontSize: 10 }}>{ms}ms</span>
        <span style={{ color: "var(--mu)", fontSize: 10, marginLeft: "auto" }}>{method} {path}</span>
      </div>
      <div className="eb-res-body" dangerouslySetInnerHTML={{ __html: esc(typeof body === "string" ? body : JSON.stringify(body, null, 2)) }} />
    </div>
  );
}

function AccountCard({ d }) {
  if (!d) return null;
  const a = d.accountsDto || d;
  return (
    <div className="eb-d-card">
      <div className="eb-d-card-h">
        <div className="eb-d-name">{d.name || "Account"}</div>
        <div className="eb-d-meta">
          <span>✉ {d.email || "—"}</span>
          <span>☎ {d.mobileNumber || "—"}</span>
          <span className="eb-d-badge">{a.accountType || "Account"}</span>
        </div>
      </div>
      <div className="eb-d-body">
        <div className="eb-d-grid">
          <div className="eb-d-item"><div className="eb-di-l">Account #</div><div className="eb-di-v">{a.accountNumber || "—"}</div></div>
          <div className="eb-d-item"><div className="eb-di-l">Type</div><div className="eb-di-v">{a.accountType || "—"}</div></div>
          <div className="eb-d-item span2"><div className="eb-di-l">Branch</div><div className="eb-di-v">{a.branchAddress || "—"}</div></div>
        </div>
      </div>
    </div>
  );
}

function LoanCard({ d }) {
  if (!d) return null;
  const pct = d.totalLoan ? Math.min(100, Math.round((d.amountPaid / d.totalLoan) * 100)) : 0;
  const col = pct > 75 ? "var(--neon)" : pct > 40 ? "var(--gold)" : "var(--sky)";
  return (
    <div className="eb-fin">
      <div className="eb-fin-h">
        <div><div className="eb-fin-type">{d.loanType || "Loan"}</div><div className="eb-fin-num">Loan # {d.loanNumber || "—"}</div></div>
        <span className="eb-pill p2">{pct}% repaid</span>
      </div>
      <div className="eb-fin-b">
        <div className="eb-prog-wrap">
          <div className="eb-prog-labels"><span>Repayment</span><b>{pct}%</b></div>
          <div className="eb-prog-bar"><div className="eb-prog-fill" style={{ width: `${pct}%`, background: col }} /></div>
        </div>
        <div className="eb-amt-row">
          <div className="eb-amt-item"><div className="eb-ai-l">Total</div><div className="eb-ai-v gold">₹{fmt(d.totalLoan)}</div></div>
          <div className="eb-amt-item"><div className="eb-ai-l">Paid</div><div className="eb-ai-v neon">₹{fmt(d.amountPaid)}</div></div>
          <div className="eb-amt-item"><div className="eb-ai-l">Outstanding</div><div className="eb-ai-v rose">₹{fmt(d.outstandingAmount)}</div></div>
        </div>
      </div>
    </div>
  );
}

function CardWidget({ d }) {
  if (!d) return null;
  const pct = d.totalLimit ? Math.min(100, Math.round((d.amountUsed / d.totalLimit) * 100)) : 0;
  const col = pct > 80 ? "var(--rose)" : pct > 50 ? "var(--gold)" : "var(--neon)";
  const pc = pct > 80 ? "p5" : pct > 50 ? "p4" : "p2";
  return (
    <div className="eb-fin">
      <div className="eb-fin-h">
        <div><div className="eb-fin-type">{d.cardType || "Card"}</div><div className="eb-fin-num">**** {String(d.cardNumber || "0000").slice(-4)}</div></div>
        <span className={`eb-pill ${pc}`}>{pct}% used</span>
      </div>
      <div className="eb-fin-b">
        <div className="eb-prog-wrap">
          <div className="eb-prog-labels"><span>Utilization</span><b>{pct}%</b></div>
          <div className="eb-prog-bar"><div className="eb-prog-fill" style={{ width: `${pct}%`, background: col }} /></div>
        </div>
        <div className="eb-amt-row">
          <div className="eb-amt-item"><div className="eb-ai-l">Limit</div><div className="eb-ai-v gold">₹{fmt(d.totalLimit)}</div></div>
          <div className="eb-amt-item"><div className="eb-ai-l">Used</div><div className="eb-ai-v rose">₹{fmt(d.amountUsed)}</div></div>
          <div className="eb-amt-item"><div className="eb-ai-l">Available</div><div className="eb-ai-v neon">₹{fmt(d.availableAmount)}</div></div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  // ── Config state ────────────────────────────────────────────
  const [ec2Ip, setEc2Ip]       = useState(CONFIG.EC2_IP);
  const [mode, setMode]         = useState("nginx"); // "nginx" | "direct"
  const [gwPort, setGwPort]     = useState(CONFIG.DEFAULT_GW_PORT);
  const [kcPort, setKcPort]     = useState(CONFIG.DEFAULT_KC_PORT);

  // ── Auth state ──────────────────────────────────────────────
  const [token, setToken]       = useState(null);
  const [tokOk, setTokOk]       = useState(false);
  const [tokExp, setTokExp]     = useState(0);      // unix ms expiry
  const [tokSecs, setTokSecs]   = useState(0);      // countdown display

  // ── Nav state ───────────────────────────────────────────────
  const [page, setPage]         = useState("dash"); // current page id
  const [navSearch, setNavSearch] = useState("");

  // ── Activity log ────────────────────────────────────────────
  const [actLog, setActLog]     = useState([]);

  // ── Toast ───────────────────────────────────────────────────
  const [toasts, setToasts]     = useState([]);

  // ── Form states (per page) ──────────────────────────────────
  // Accounts
  const [acTab, setAcTab]       = useState("create");
  const [acName, setAcName]     = useState("");
  const [acEmail, setAcEmail]   = useState("");
  const [acMobile, setAcMobile] = useState("");
  const [acFetchM, setAcFetchM] = useState("");
  const [acFetchData, setAcFetchData] = useState(null);
  const [auName, setAuName]     = useState(""); const [auMobile, setAuMobile] = useState("");
  const [auEmail, setAuEmail]   = useState(""); const [auAccno, setAuAccno]   = useState("");
  const [auType, setAuType]     = useState("Savings"); const [auAddr, setAuAddr] = useState("");
  const [adMobile, setAdMobile] = useState("");
  // Loans
  const [lnTab, setLnTab]       = useState("create");
  const [lnMobile, setLnMobile] = useState(""); const [lnFetchM, setLnFetchM] = useState("");
  const [lnFetchData, setLnFetchData] = useState(null);
  const [luMobile, setLuMobile] = useState(""); const [luNum, setLuNum]     = useState("");
  const [luType, setLuType]     = useState("Home Loan"); const [luTotal, setLuTotal] = useState("");
  const [luPaid, setLuPaid]     = useState(""); const [luOut, setLuOut]     = useState("");
  const [ldMobile, setLdMobile] = useState("");
  // Cards
  const [cdTab, setCdTab]       = useState("create");
  const [cdMobile, setCdMobile] = useState(""); const [cdFetchM, setCdFetchM] = useState("");
  const [cdFetchData, setCdFetchData] = useState(null);
  const [cuMobile, setCuMobile] = useState(""); const [cuNum, setCuNum]     = useState("");
  const [cuType, setCuType]     = useState("Credit Card"); const [cuTotal, setCuTotal] = useState("");
  const [cuUsed, setCuUsed]     = useState(""); const [cuAvail, setCuAvail] = useState("");
  const [cddMobile, setCddMobile] = useState("");
  // Customer 360
  const [c3Mobile, setC3Mobile] = useState(""); const [c3Data, setC3Data]   = useState(null);
  // Response boxes
  const [res, setRes]           = useState({}); // keyed by opId

  // ── Inject CSS once ─────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // ── Countdown ticker ────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (tokExp > 0) setTokSecs(Math.max(0, Math.round((tokExp - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [tokExp]);

  // ── Derived gateway/kc URLs ─────────────────────────────────
  const gwBase = mode === "nginx" ? "" : `http://${ec2Ip}:${gwPort}`;
  const kcUrl  = mode === "nginx"
    ? `/realms/${CONFIG.KC_REALM}/protocol/openid-connect/token`
    : `http://${ec2Ip}:${kcPort}/realms/${CONFIG.KC_REALM}/protocol/openid-connect/token`;

  // ── Token fetch ─────────────────────────────────────────────
  const fetchToken = useCallback(async () => {
    try {
      const r = await fetch(kcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=client_credentials&client_id=${CONFIG.KC_CLIENT}&client_secret=${CONFIG.KC_SECRET}&scope=openid profile email`,
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      setToken(d.access_token);
      setTokOk(true);
      setTokExp(Date.now() + d.expires_in * 1000);
    } catch (e) {
      setToken(null); setTokOk(false); setTokExp(0);
    }
  }, [kcUrl]);

  useEffect(() => {
    fetchToken();
    const id = setInterval(fetchToken, CONFIG.REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchToken]);

  // ── Toast helper ─────────────────────────────────────────────
  const toast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // ── API engine ───────────────────────────────────────────────
  const api = useCallback(async (method, path, body, opId, extraHdrs = {}) => {
    const t0 = Date.now();
    setRes((r) => ({ ...r, [opId]: { loading: true, method, path } }));
    try {
      const h = { "Content-Type": "application/json", ...extraHdrs };
      if (token) h["Authorization"] = "Bearer " + token;
      const opts = { method, headers: h };
      if (body && ["POST", "PUT", "PATCH"].includes(method)) opts.body = JSON.stringify(body);
      const r = await fetch(gwBase + path, opts);
      const ms = Date.now() - t0;
      const txt = await r.text();
      let parsed = null;
      try { parsed = JSON.parse(txt); } catch {}
      setRes((prev) => ({ ...prev, [opId]: { status: r.status, statusText: r.statusText, ms, method, path, body: parsed || txt } }));
      toast((r.ok ? "✓ " : "⚠ ") + r.status + " " + r.statusText, r.ok ? "ok" : "err");
      setActLog((l) => [{ method, path, status: r.status, ms, type: r.ok ? "ok" : "err", time: new Date().toLocaleTimeString() }, ...l].slice(0, 10));
      return parsed;
    } catch (e) {
      const ms = Date.now() - t0;
      setRes((prev) => ({ ...prev, [opId]: { status: 0, statusText: "Network Error", ms, method, path, body: e.message } }));
      toast("✗ " + e.message, "err");
      setActLog((l) => [{ method, path, status: 0, ms, type: "err", time: new Date().toLocaleTimeString() }, ...l].slice(0, 10));
      return null;
    }
  }, [token, gwBase, toast]);

  // ── API handlers ─────────────────────────────────────────────
  const acCreate = async () => {
    if (!acName || !acEmail || !acMobile) return toast("⚠ Fill all fields", "err");
    await api("POST", `${CONFIG.BASE_ACCOUNTS}/create`, { name: acName, email: acEmail, mobileNumber: acMobile }, "ac-create");
  };
  const acFetch = async () => {
    if (!acFetchM) return toast("⚠ Enter mobile", "err");
    const d = await api("GET", `${CONFIG.BASE_ACCOUNTS}/fetch?mobileNumber=${acFetchM}`, null, "ac-fetch");
    setAcFetchData(d);
  };
  const acUpdate = async () => {
    if (!auMobile) return toast("⚠ Enter mobile", "err");
    await api("PUT", `${CONFIG.BASE_ACCOUNTS}/update`, { name: auName, email: auEmail, mobileNumber: auMobile, accountsDto: { accountNumber: parseInt(auAccno) || 0, accountType: auType, branchAddress: auAddr } }, "ac-update");
  };
  const acDelete = async () => {
    if (!adMobile) return toast("⚠ Enter mobile", "err");
    if (!window.confirm(`Delete account for ${adMobile}?`)) return;
    await api("DELETE", `${CONFIG.BASE_ACCOUNTS}/delete?mobileNumber=${adMobile}`, null, "ac-delete");
  };
  const lnCreate = async () => {
    if (!lnMobile) return toast("⚠ Enter mobile", "err");
    await api("POST", `${CONFIG.BASE_LOANS}/create?mobileNumber=${lnMobile}`, null, "ln-create");
  };
  const lnFetch = async () => {
    if (!lnFetchM) return toast("⚠ Enter mobile", "err");
    const d = await api("GET", `${CONFIG.BASE_LOANS}/fetch?mobileNumber=${lnFetchM}`, null, "ln-fetch");
    setLnFetchData(d);
  };
  const lnUpdate = async () => {
    if (!luMobile || !luNum) return toast("⚠ Enter mobile+loan#", "err");
    await api("PUT", `${CONFIG.BASE_LOANS}/update`, { mobileNumber: luMobile, loanNumber: luNum, loanType: luType, totalLoan: +luTotal, amountPaid: +luPaid, outstandingAmount: +luOut }, "ln-update");
  };
  const lnDelete = async () => {
    if (!ldMobile) return toast("⚠ Enter mobile", "err");
    if (!window.confirm(`Delete loan for ${ldMobile}?`)) return;
    await api("DELETE", `${CONFIG.BASE_LOANS}/delete?mobileNumber=${ldMobile}`, null, "ln-delete");
  };
  const cdCreate = async () => {
    if (!cdMobile) return toast("⚠ Enter mobile", "err");
    await api("POST", `${CONFIG.BASE_CARDS}/create?mobileNumber=${cdMobile}`, null, "cd-create");
  };
  const cdFetch = async () => {
    if (!cdFetchM) return toast("⚠ Enter mobile", "err");
    const d = await api("GET", `${CONFIG.BASE_CARDS}/fetch?mobileNumber=${cdFetchM}`, null, "cd-fetch");
    setCdFetchData(d);
  };
  const cdUpdate = async () => {
    if (!cuMobile || !cuNum) return toast("⚠ Enter mobile+card#", "err");
    await api("PUT", `${CONFIG.BASE_CARDS}/update`, { mobileNumber: cuMobile, cardNumber: cuNum, cardType: cuType, totalLimit: +cuTotal, amountUsed: +cuUsed, availableAmount: +cuAvail }, "cd-update");
  };
  const cdDelete = async () => {
    if (!cddMobile) return toast("⚠ Enter mobile", "err");
    if (!window.confirm(`Delete card for ${cddMobile}?`)) return;
    await api("DELETE", `${CONFIG.BASE_CARDS}/delete?mobileNumber=${cddMobile}`, null, "cd-delete");
  };
  const custFetch = async () => {
    if (!c3Mobile) return toast("⚠ Enter mobile", "err");
    const d = await api("GET", `${CONFIG.BASE_ACCOUNTS}/fetchCustomerDetails?mobileNumber=${c3Mobile}`, null, "c3", { [CONFIG.CORRELATION_HEADER]: "portal-" + Date.now() });
    setC3Data(d);
  };
  const infoCall = (path, opId) => api("GET", path, null, opId);

  const fillDemo = () => { setAcName("Sree Kumar"); setAcEmail("sree@eazybytes.com"); setAcMobile("9876543210"); };

  // ── Sidebar items ────────────────────────────────────────────
  const navItems = [
    { id: "dash",     icon: "◈", label: "Dashboard",    badge: null,   live: false },
    { id: "accounts", icon: "🏦", label: "Accounts",     badge: "8080", live: true  },
    { id: "loans",    icon: "💳", label: "Loans",        badge: "8090", live: true  },
    { id: "cards",    icon: "💰", label: "Cards",        badge: "9000", live: true  },
    { id: "customer", icon: "👤", label: "Customer 360°", badge: null,  live: false },
    { id: "gateway",  icon: "⚡", label: "Gateway Info", badge: null,   live: false },
  ];
  const filteredNav = navItems.filter(n => n.label.toLowerCase().includes(navSearch.toLowerCase()));

  // ── Sidebar footer display ───────────────────────────────────
  const sfGw = mode === "nginx" ? "nginx:30080" : `${ec2Ip}:${gwPort}`;
  const sfKc = mode === "nginx" ? "nginx:30080" : `${ec2Ip}:${kcPort}`;

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className="eb-shell">
      {/* ── TOPBAR ── */}
      <header className="eb-topbar">
        <div className="eb-brand-strip"><div className="eb-brand-logo">🏦</div></div>
        <div className="eb-brand-text">
          <div className="eb-brand-name">EAZYBANK</div>
          <div className="eb-brand-sub">Command Center</div>
        </div>
        <div className="eb-cfg-row">
          <div className="eb-cfg-seg">
            <span className="eb-cfg-lbl">EC2</span>
            <input className="eb-cfg-input ip" value={ec2Ip} onChange={e => setEc2Ip(e.target.value)} spellCheck={false} />
          </div>
          <div className="eb-cfg-seg">
            <span className="eb-cfg-lbl">Mode</span>
            <div className="eb-mode-wrap">
              <button className={`eb-mode-btn ${mode === "nginx" ? "on" : ""}`} onClick={() => setMode("nginx")}>NGINX</button>
              <button className={`eb-mode-btn ${mode === "direct" ? "on" : ""}`} onClick={() => setMode("direct")}>DIRECT</button>
            </div>
          </div>
          {mode === "direct" && (
            <div className="eb-cfg-seg">
              <span className="eb-cfg-lbl">GW</span>
              <input className="eb-cfg-input port" value={gwPort} onChange={e => setGwPort(e.target.value)} />
              <span className="eb-cfg-lbl" style={{ marginLeft: 10 }}>KC</span>
              <input className="eb-cfg-input port" value={kcPort} onChange={e => setKcPort(e.target.value)} />
            </div>
          )}
          <div className={`eb-tok ${tokOk ? "ok" : "err"}`}>
            <div className="eb-tok-dot" />
            <span className="eb-tok-txt">{tokOk ? "AUTHED" : "AUTH_ERR"}</span>
            {tokOk && <span className="eb-tok-exp">{tokSecs}s</span>}
          </div>
          <div className="eb-av">SR</div>
        </div>
      </header>

      {/* ── ICON RAIL ── */}
      <div className="eb-rail">
        {navItems.map((n, i) => (
          <div key={n.id} className={`eb-rail-ic ${page === n.id ? "on" : ""}`} onClick={() => setPage(n.id)} title={n.label}>
            {n.icon}
          </div>
        ))}
      </div>

      {/* ── SIDEBAR ── */}
      <aside className="eb-sidebar">
        <div className="eb-sb-search">
          <div className="eb-sb-si">
            <span>⌕</span>
            <input placeholder="Search pages..." value={navSearch} onChange={e => setNavSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ padding: "0 0 8px" }}>
          <div className="eb-sb-lbl">Overview</div>
          {filteredNav.filter(n => n.id === "dash").map(n => (
            <div key={n.id} className={`eb-ni ${page === n.id ? "on" : ""}`} onClick={() => setPage(n.id)}>
              <div className="eb-ni-ic">{n.icon}</div><div style={{ flex: 1 }}>{n.label}</div>
            </div>
          ))}
          <div className="eb-sb-lbl">Banking</div>
          {filteredNav.filter(n => ["accounts","loans","cards"].includes(n.id)).map(n => (
            <div key={n.id} className={`eb-ni ${page === n.id ? "on" : ""}`} onClick={() => setPage(n.id)}>
              <div className="eb-ni-ic">{n.icon}</div>
              <div style={{ flex: 1 }}>{n.label}</div>
              {n.badge && <span className="eb-ni-badge">{n.badge}</span>}
              {n.live && <div className="eb-ni-live" />}
            </div>
          ))}
          <div className="eb-sb-lbl">Analytics</div>
          {filteredNav.filter(n => ["customer","gateway"].includes(n.id)).map(n => (
            <div key={n.id} className={`eb-ni ${page === n.id ? "on" : ""}`} onClick={() => setPage(n.id)}>
              <div className="eb-ni-ic">{n.icon}</div><div style={{ flex: 1 }}>{n.label}</div>
            </div>
          ))}
        </div>
        <div className="eb-sb-footer">
          <div className="eb-sb-stat"><span className="eb-sb-k">Gateway</span><span className="eb-sb-v">{sfGw}</span></div>
          <div className="eb-sb-stat"><span className="eb-sb-k">Keycloak</span><span className="eb-sb-v">{sfKc}</span></div>
          <div className="eb-sb-arch">Browser→<span>Nginx</span>→Gateway→Svc</div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="eb-main">

        {/* DASHBOARD */}
        <div className={`eb-page ${page === "dash" ? "on" : ""}`}>
          <div className="eb-ph">
            <div>
              <h2>Welcome, <em>EazyBank</em></h2>
              <p>Production · Nginx → Spring Cloud Gateway → K8s Microservices · EC2 <span style={{ color: "var(--neon)" }}>{ec2Ip}</span></p>
            </div>
          </div>
          <div className="eb-stat-row">
            <div className="eb-stat neon"><div className="s-ico">🌐</div><div className="s-lbl">Frontend</div><div className="s-val">NGINX</div><div className="s-sub">2 replicas · :30080</div></div>
            <div className="eb-stat sky"><div className="s-ico">⚡</div><div className="s-lbl">API Gateway</div><div className="s-val">ClusterIP</div><div className="s-sub">gatewayserver:8072</div></div>
            <div className="eb-stat gold"><div className="s-ico">🔐</div><div className="s-lbl">Auth Status</div><div className="s-val">{tokOk ? "Active" : "Error"}</div><div className="s-sub">{tokOk ? `JWT · ${tokSecs}s left` : "Keycloak unreachable"}</div></div>
            <div className="eb-stat"><div className="s-ico">☸️</div><div className="s-lbl">K8s Services</div><div className="s-val">7</div><div className="s-sub">accounts·loans·cards·gw·cfg·eureka·msg</div></div>
          </div>
          <div className="eb-svc-grid">
            {[
              { color: "var(--neon)",  icon: "🏦", name: "Accounts Service", port: ":8080",  desc: "Create and manage bank accounts. Savings, current and salary accounts with branch address management.", eps: 6,  target: "accounts" },
              { color: "var(--sky)",   icon: "💳", name: "Loans Service",    port: ":8090",  desc: "Home, vehicle and personal loan management. Track repayment with outstanding amounts and payment history.", eps: 5, target: "loans" },
              { color: "var(--gold)",  icon: "💰", name: "Cards Service",    port: ":9000",  desc: "Credit and debit card management. Monitor spending limits, utilization and available credit in real time.", eps: 5, target: "cards" },
              { color: "var(--lime)",  icon: "👤", name: "Customer 360°",   port: "gateway", desc: "Aggregated profile — single gateway call returns account + loan + card via Feign client orchestration.", eps: 1, target: "customer" },
              { color: "var(--mu)",    icon: "⚡", name: "Gateway Info",     port: ":8072",  desc: "contact-info, build-info and java-version endpoints for all services via Spring Cloud Gateway.", eps: 9, target: "gateway" },
              { color: "var(--rose)",  icon: "🔐", name: "Keycloak Auth",   port: mode === "direct" ? `:${kcPort}` : ":30080", desc: `OAuth2 client credentials. Token auto-fetched on load and refreshed every ${CONFIG.REFRESH_MS/1000}s. All calls authenticated automatically.`, eps: null, target: null },
            ].map((s, i) => (
              <div key={i} className="eb-svc" style={{ "--c": s.color }} onClick={() => s.target && setPage(s.target)}>
                <div className="eb-svc-head">
                  <div className="eb-svc-dot" style={{ color: s.color, background: s.color }} />
                  <div className="eb-svc-name">{s.name}</div>
                  <div className="eb-svc-port">{s.port}</div>
                </div>
                <div className="eb-svc-desc">{s.desc}</div>
                <div className="eb-svc-foot">
                  <span className="eb-svc-eps">{s.eps ? <><b>{s.eps}</b> endpoints</> : (tokOk ? <span style={{ color: "var(--neon)" }}>✓ Token active</span> : <span style={{ color: "var(--rose)" }}>✗ Auth error</span>)}</span>
                  {s.target && <span className="eb-svc-arr">→</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="eb-act">
            <h3>Recent Activity</h3>
            {actLog.length === 0
              ? <div className="eb-act-empty">// No activity yet — make an API call to see it here</div>
              : actLog.map((a, i) => (
                <div key={i} className="eb-act-item">
                  <div className={`eb-act-ic ${a.type}`}>{a.type === "ok" ? "✓" : "✗"}</div>
                  <div className="eb-act-body">
                    <div className="eb-act-title">{a.method} {a.path}</div>
                    <div className="eb-act-meta">{a.time} · {a.ms}ms</div>
                  </div>
                  <span className={`eb-act-code ${a.status < 300 && a.status > 0 ? "ac-2" : a.status < 500 && a.status > 0 ? "ac-4" : "ac-5"}`}>{a.status || "ERR"}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* ACCOUNTS */}
        <div className={`eb-page ${page === "accounts" ? "on" : ""}`}>
          <div className="eb-ph">
            <div><h2><em>Accounts</em></h2><p>GET/POST/PUT/DELETE · {CONFIG.BASE_ACCOUNTS}</p></div>
            <span className="eb-route-pill">eazybank-ms/accounts:8080</span>
          </div>
          <div className="eb-b-layout">
            <div>
              <div className="eb-tabs">
                {["create","fetch","update","delete"].map(t => (
                  <button key={t} className={`eb-tab ${acTab === t ? "on" : ""}`} onClick={() => setAcTab(t)}>
                    {t === "create" ? "⚡ Create" : t === "fetch" ? "⌕ Fetch" : t === "update" ? "✎ Update" : "✕ Delete"}
                  </button>
                ))}
              </div>
              {acTab === "create" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--skydim)" }}>⚡</div><div className="eb-fc-title">Create New Account</div><span className="eb-method m-post">POST</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr"><label>Full Name</label><input value={acName} onChange={e => setAcName(e.target.value)} placeholder="e.g. Madan Reddy" /></div>
                    <div className="eb-fr"><label>Email</label><input value={acEmail} onChange={e => setAcEmail(e.target.value)} type="email" placeholder="e.g. user@eazybytes.com" /></div>
                    <div className="eb-fr"><label>Mobile Number</label><input value={acMobile} onChange={e => setAcMobile(e.target.value)} placeholder="e.g. 4354437687" /><div className="eb-fr-hint">// 10-digit · used as customer ID</div></div>
                    <div className="eb-btn-row">
                      <button className="eb-btn primary" onClick={acCreate}>⚡ Create Account</button>
                      <button className="eb-btn ghost sm" onClick={fillDemo}>Fill Demo</button>
                    </div>
                    <ResBox data={res["ac-create"]} />
                  </div>
                </div>
              )}
              {acTab === "fetch" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--neondim)" }}>⌕</div><div className="eb-fc-title">Fetch Account</div><span className="eb-method m-get">GET</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr"><label>Mobile Number</label><input value={acFetchM} onChange={e => setAcFetchM(e.target.value)} placeholder="e.g. 4354437687" /></div>
                    <div className="eb-btn-row"><button className="eb-btn primary" onClick={acFetch}>⌕ Fetch Account</button></div>
                    <ResBox data={res["ac-fetch"]} />
                    <AccountCard d={acFetchData} />
                  </div>
                </div>
              )}
              {acTab === "update" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--golddim)" }}>✎</div><div className="eb-fc-title">Update Account</div><span className="eb-method m-put">PUT</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr-2">
                      <div className="eb-fr"><label>Full Name</label><input value={auName} onChange={e => setAuName(e.target.value)} placeholder="Updated name" /></div>
                      <div className="eb-fr"><label>Mobile</label><input value={auMobile} onChange={e => setAuMobile(e.target.value)} placeholder="4354437687" /></div>
                    </div>
                    <div className="eb-fr"><label>Email</label><input value={auEmail} onChange={e => setAuEmail(e.target.value)} placeholder="user@eazybytes.com" /></div>
                    <div className="eb-fr-2">
                      <div className="eb-fr"><label>Account Number</label><input value={auAccno} onChange={e => setAuAccno(e.target.value)} placeholder="1105557729" /></div>
                      <div className="eb-fr"><label>Account Type</label><select value={auType} onChange={e => setAuType(e.target.value)}><option>Savings</option><option>Current</option><option>Salary</option></select></div>
                    </div>
                    <div className="eb-fr"><label>Branch Address</label><input value={auAddr} onChange={e => setAuAddr(e.target.value)} placeholder="123 Main Street, New York" /></div>
                    <div className="eb-btn-row"><button className="eb-btn primary" onClick={acUpdate}>💾 Update</button></div>
                    <ResBox data={res["ac-update"]} />
                  </div>
                </div>
              )}
              {acTab === "delete" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--rosedim)" }}>✕</div><div className="eb-fc-title">Delete Account</div><span className="eb-method m-delete">DELETE</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr"><label>Mobile Number</label><input value={adMobile} onChange={e => setAdMobile(e.target.value)} placeholder="e.g. 4354437687" /></div>
                    <div className="eb-btn-row"><button className="eb-btn danger" onClick={acDelete}>✕ Delete Account</button></div>
                    <ResBox data={res["ac-delete"]} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="eb-fc">
                <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--neondim)" }}>ℹ</div><div className="eb-fc-title">Service Info</div></div>
                <div className="eb-fc-body">
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {["contact-info","build-info","java-version"].map(ep => (
                      <button key={ep} className="eb-btn ghost sm" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => infoCall(`${CONFIG.BASE_ACCOUNTS}/${ep}`, `ac-info-${ep}`)}>{ep}</button>
                    ))}
                  </div>
                  {["contact-info","build-info","java-version"].map(ep => <ResBox key={ep} data={res[`ac-info-${ep}`]} />)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOANS */}
        <div className={`eb-page ${page === "loans" ? "on" : ""}`}>
          <div className="eb-ph">
            <div><h2><em>Loans</em></h2><p>GET/POST/PUT/DELETE · {CONFIG.BASE_LOANS}</p></div>
            <span className="eb-route-pill">eazybank-ms/loans:8090</span>
          </div>
          <div className="eb-b-layout">
            <div>
              <div className="eb-tabs">
                {["create","fetch","update","delete"].map(t => (
                  <button key={t} className={`eb-tab ${lnTab === t ? "on" : ""}`} onClick={() => setLnTab(t)}>
                    {t === "create" ? "⚡ Create" : t === "fetch" ? "⌕ Fetch" : t === "update" ? "✎ Update" : "✕ Delete"}
                  </button>
                ))}
              </div>
              {lnTab === "create" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--skydim)" }}>💳</div><div className="eb-fc-title">Create Loan</div><span className="eb-method m-post">POST</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr"><label>Mobile Number</label><input value={lnMobile} onChange={e => setLnMobile(e.target.value)} placeholder="e.g. 4354437687" /><div className="eb-fr-hint">// system auto-generates loan number, type and amounts</div></div>
                    <div className="eb-btn-row"><button className="eb-btn primary" onClick={lnCreate}>⚡ Create Loan</button></div>
                    <ResBox data={res["ln-create"]} />
                  </div>
                </div>
              )}
              {lnTab === "fetch" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--neondim)" }}>⌕</div><div className="eb-fc-title">Fetch Loan</div><span className="eb-method m-get">GET</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr"><label>Mobile Number</label><input value={lnFetchM} onChange={e => setLnFetchM(e.target.value)} placeholder="e.g. 4354437687" /></div>
                    <div className="eb-btn-row"><button className="eb-btn primary" onClick={lnFetch}>⌕ Fetch Loan</button></div>
                    <ResBox data={res["ln-fetch"]} />
                    <LoanCard d={lnFetchData} />
                  </div>
                </div>
              )}
              {lnTab === "update" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--golddim)" }}>✎</div><div className="eb-fc-title">Update Loan</div><span className="eb-method m-put">PUT</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr-2">
                      <div className="eb-fr"><label>Mobile</label><input value={luMobile} onChange={e => setLuMobile(e.target.value)} placeholder="4354437687" /></div>
                      <div className="eb-fr"><label>Loan Number</label><input value={luNum} onChange={e => setLuNum(e.target.value)} placeholder="10071469799154" /></div>
                    </div>
                    <div className="eb-fr"><label>Loan Type</label><select value={luType} onChange={e => setLuType(e.target.value)}><option>Home Loan</option><option>Vehicle Loan</option><option>Personal Loan</option><option>Education Loan</option></select></div>
                    <div className="eb-fr-2">
                      <div className="eb-fr"><label>Total Loan (₹)</label><input value={luTotal} onChange={e => setLuTotal(e.target.value)} type="number" placeholder="100000" /></div>
                      <div className="eb-fr"><label>Amount Paid (₹)</label><input value={luPaid} onChange={e => setLuPaid(e.target.value)} type="number" placeholder="10000" /></div>
                    </div>
                    <div className="eb-fr"><label>Outstanding (₹)</label><input value={luOut} onChange={e => setLuOut(e.target.value)} type="number" placeholder="90000" /></div>
                    <div className="eb-btn-row"><button className="eb-btn primary" onClick={lnUpdate}>💾 Update Loan</button></div>
                    <ResBox data={res["ln-update"]} />
                  </div>
                </div>
              )}
              {lnTab === "delete" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--rosedim)" }}>✕</div><div className="eb-fc-title">Delete Loan</div><span className="eb-method m-delete">DELETE</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr"><label>Mobile Number</label><input value={ldMobile} onChange={e => setLdMobile(e.target.value)} placeholder="e.g. 4354437687" /></div>
                    <div className="eb-btn-row"><button className="eb-btn danger" onClick={lnDelete}>✕ Delete Loan</button></div>
                    <ResBox data={res["ln-delete"]} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="eb-fc">
                <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--skydim)" }}>ℹ</div><div className="eb-fc-title">Service Info</div></div>
                <div className="eb-fc-body">
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {["contact-info","build-info","java-version"].map(ep => (
                      <button key={ep} className="eb-btn ghost sm" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => infoCall(`${CONFIG.BASE_LOANS}/${ep}`, `ln-info-${ep}`)}>{ep}</button>
                    ))}
                  </div>
                  {["contact-info","build-info","java-version"].map(ep => <ResBox key={ep} data={res[`ln-info-${ep}`]} />)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARDS */}
        <div className={`eb-page ${page === "cards" ? "on" : ""}`}>
          <div className="eb-ph">
            <div><h2><em>Cards</em></h2><p>GET/POST/PUT/DELETE · {CONFIG.BASE_CARDS}</p></div>
            <span className="eb-route-pill">eazybank-ms/cards:9000</span>
          </div>
          <div className="eb-b-layout">
            <div>
              <div className="eb-tabs">
                {["create","fetch","update","delete"].map(t => (
                  <button key={t} className={`eb-tab ${cdTab === t ? "on" : ""}`} onClick={() => setCdTab(t)}>
                    {t === "create" ? "⚡ Create" : t === "fetch" ? "⌕ Fetch" : t === "update" ? "✎ Update" : "✕ Delete"}
                  </button>
                ))}
              </div>
              {cdTab === "create" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--skydim)" }}>💰</div><div className="eb-fc-title">Create Card</div><span className="eb-method m-post">POST</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr"><label>Mobile Number</label><input value={cdMobile} onChange={e => setCdMobile(e.target.value)} placeholder="e.g. 4354437687" /><div className="eb-fr-hint">// system auto-generates card number and sets default limits</div></div>
                    <div className="eb-btn-row"><button className="eb-btn primary" onClick={cdCreate}>⚡ Create Card</button></div>
                    <ResBox data={res["cd-create"]} />
                  </div>
                </div>
              )}
              {cdTab === "fetch" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--neondim)" }}>⌕</div><div className="eb-fc-title">Fetch Card</div><span className="eb-method m-get">GET</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr"><label>Mobile Number</label><input value={cdFetchM} onChange={e => setCdFetchM(e.target.value)} placeholder="e.g. 4354437687" /></div>
                    <div className="eb-btn-row"><button className="eb-btn primary" onClick={cdFetch}>⌕ Fetch Card</button></div>
                    <ResBox data={res["cd-fetch"]} />
                    <CardWidget d={cdFetchData} />
                  </div>
                </div>
              )}
              {cdTab === "update" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--golddim)" }}>✎</div><div className="eb-fc-title">Update Card</div><span className="eb-method m-put">PUT</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr-2">
                      <div className="eb-fr"><label>Mobile</label><input value={cuMobile} onChange={e => setCuMobile(e.target.value)} placeholder="4354437687" /></div>
                      <div className="eb-fr"><label>Card Number</label><input value={cuNum} onChange={e => setCuNum(e.target.value)} placeholder="100107091026" /></div>
                    </div>
                    <div className="eb-fr"><label>Card Type</label><select value={cuType} onChange={e => setCuType(e.target.value)}><option>Credit Card</option><option>Debit Card</option></select></div>
                    <div className="eb-fr-2">
                      <div className="eb-fr"><label>Total Limit (₹)</label><input value={cuTotal} onChange={e => setCuTotal(e.target.value)} type="number" placeholder="100000" /></div>
                      <div className="eb-fr"><label>Amount Used (₹)</label><input value={cuUsed} onChange={e => setCuUsed(e.target.value)} type="number" placeholder="10000" /></div>
                    </div>
                    <div className="eb-fr"><label>Available (₹)</label><input value={cuAvail} onChange={e => setCuAvail(e.target.value)} type="number" placeholder="90000" /></div>
                    <div className="eb-btn-row"><button className="eb-btn primary" onClick={cdUpdate}>💾 Update Card</button></div>
                    <ResBox data={res["cd-update"]} />
                  </div>
                </div>
              )}
              {cdTab === "delete" && (
                <div className="eb-fc">
                  <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--rosedim)" }}>✕</div><div className="eb-fc-title">Delete Card</div><span className="eb-method m-delete">DELETE</span></div>
                  <div className="eb-fc-body">
                    <div className="eb-fr"><label>Mobile Number</label><input value={cddMobile} onChange={e => setCddMobile(e.target.value)} placeholder="e.g. 4354437687" /></div>
                    <div className="eb-btn-row"><button className="eb-btn danger" onClick={cdDelete}>✕ Delete Card</button></div>
                    <ResBox data={res["cd-delete"]} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="eb-fc">
                <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--golddim)" }}>ℹ</div><div className="eb-fc-title">Service Info</div></div>
                <div className="eb-fc-body">
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {["contact-info","build-info","java-version"].map(ep => (
                      <button key={ep} className="eb-btn ghost sm" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => infoCall(`${CONFIG.BASE_CARDS}/${ep}`, `cd-info-${ep}`)}>{ep}</button>
                    ))}
                  </div>
                  {["contact-info","build-info","java-version"].map(ep => <ResBox key={ep} data={res[`cd-info-${ep}`]} />)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOMER 360 */}
        <div className={`eb-page ${page === "customer" ? "on" : ""}`}>
          <div className="eb-ph">
            <div><h2>Customer <em>360°</em></h2><p>Aggregated profile · single gateway call via Feign client</p></div>
            <span className="eb-route-pill">GET {CONFIG.BASE_ACCOUNTS}/fetchCustomerDetails</span>
          </div>
          <div className="eb-b-layout">
            <div>
              <div className="eb-fc">
                <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--neondim)" }}>👤</div><div className="eb-fc-title">Fetch Full Profile</div><span className="eb-method m-get">GET</span></div>
                <div className="eb-fc-body">
                  <div className="eb-fr"><label>Mobile Number</label><input value={c3Mobile} onChange={e => setC3Mobile(e.target.value)} placeholder="e.g. 4354437687" /><div className="eb-fr-hint">// returns account + loan + card in one call</div></div>
                  <div className="eb-btn-row"><button className="eb-btn primary" onClick={custFetch}>⌕ Fetch 360° Profile</button></div>
                  <ResBox data={res["c3"]} />
                </div>
              </div>
              {c3Data && (
                <div>
                  {c3Data.name && (
                    <div className="eb-c360-hdr">
                      <div className="eb-c360-av">{c3Data.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}</div>
                      <div>
                        <div className="eb-c360-name">{c3Data.name}</div>
                        <div className="eb-c360-row"><span>✉ {c3Data.email || "—"}</span><span>☎ {c3Data.mobileNumber || "—"}</span></div>
                      </div>
                    </div>
                  )}
                  <AccountCard d={c3Data} />
                  {c3Data.loansDto && <LoanCard d={c3Data.loansDto} />}
                  {c3Data.cardsDto && <CardWidget d={c3Data.cardsDto} />}
                </div>
              )}
            </div>
            <div>
              <div className="eb-fc">
                <div className="eb-fc-head"><div className="eb-fc-icon" style={{ background: "var(--neondim)" }}>💡</div><div className="eb-fc-title">How it works</div></div>
                <div className="eb-fc-body" style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.8 }}>
                  <p style={{ color: "var(--neon)", marginBottom: 8 }}>GET /api/fetchCustomerDetails</p>
                  <p style={{ marginBottom: 8, color: "var(--mu)" }}>// Accounts → OpenFeign → Loans + Cards</p>
                  <p>Returns combined JSON — no client-side stitching needed.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GATEWAY INFO */}
        <div className={`eb-page ${page === "gateway" ? "on" : ""}`}>
          <div className="eb-ph">
            <div><h2>Gateway <em>Info</em></h2><p>contact-info · build-info · java-version for all services</p></div>
          </div>
          <div className="eb-gw-grid">
            {[
              { label: "Accounts :8080", color: "var(--neon)", base: CONFIG.BASE_ACCOUNTS, key: "ac" },
              { label: "Loans :8090",    color: "var(--sky)",  base: CONFIG.BASE_LOANS,    key: "ln" },
              { label: "Cards :9000",    color: "var(--gold)", base: CONFIG.BASE_CARDS,    key: "cd" },
            ].map(svc => (
              <div key={svc.key} className="eb-gw-panel">
                <div className="eb-gw-head">
                  <div className="eb-gw-dot" style={{ color: svc.color, background: svc.color }} />
                  {svc.label}
                </div>
                <div className="eb-gw-body">
                  {["contact-info","build-info","java-version"].map(ep => (
                    <button key={ep} className="eb-gw-btn" onClick={() => infoCall(`${svc.base}/${ep}`, `gw-${svc.key}-${ep}`)}>
                      <span className="eb-gw-method">GET</span>{ep}
                    </button>
                  ))}
                  {["contact-info","build-info","java-version"].map(ep => <ResBox key={ep} data={res[`gw-${svc.key}-${ep}`]} />)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* TOASTS */}
      <div className="eb-toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`eb-toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CONFIG REFERENCE — All Variables & Their Roles
// ═══════════════════════════════════════════════════════════════
//
//  ┌─────────────────────────────────────────────────────────┐
//  │  const CONFIG = { ... }  (top of file, edit freely)     │
//  └─────────────────────────────────────────────────────────┘
//
//  EC2_IP          → AWS EC2 public IPv4 address
//                    Used in DIRECT mode for all API calls
//                    Also shown on Dashboard UI
//                    Default: "13.233.158.149"
//
//  KC_REALM        → Keycloak realm name
//                    Inserted into token URL path: /realms/<KC_REALM>/...
//                    Default: "master"
//
//  KC_CLIENT       → Keycloak client ID (client_credentials grant)
//                    Sent as client_id in token request body
//                    Default: "eazybank-callcenter-cc"
//
//  KC_SECRET       → Keycloak client secret
//                    Sent as client_secret in token request body
//                    Leave "" for public clients
//                    Default: "" (empty)
//
//  REFRESH_MS      → Token auto-refresh interval in milliseconds
//                    Token is re-fetched every N ms automatically
//                    Default: 50000 (50 seconds)
//
//  DEFAULT_GW_PORT → Spring Cloud Gateway NodePort (DIRECT mode only)
//                    Editable live in the topbar when DIRECT mode is on
//                    Default: "30564"
//
//  DEFAULT_KC_PORT → Keycloak NodePort (DIRECT mode only)
//                    Editable live in the topbar when DIRECT mode is on
//                    Default: "31479"
//
//  BASE_ACCOUNTS   → URL prefix for Accounts service endpoints
//                    Example: /eazybank/accounts/api
//                    All account CRUD + info calls append to this
//
//  BASE_LOANS      → URL prefix for Loans service endpoints
//                    Example: /eazybank/loans/api
//
//  BASE_CARDS      → URL prefix for Cards service endpoints
//                    Example: /eazybank/cards/api
//
//  CORRELATION_HEADER → HTTP header name for request tracing
//                    Sent on Customer 360 calls
//                    Value: "portal-<timestamp>"
//                    Default: "eazybank-correlation-id"
//
//  ┌─────────────────────────────────────────────────────────┐
//  │  Runtime State (React useState — not in CONFIG)          │
//  └─────────────────────────────────────────────────────────┘
//
//  ec2Ip           → Live editable EC2 IP (topbar input, DIRECT mode)
//  mode            → "nginx" | "direct" — routing mode toggle
//  gwPort          → Live editable Gateway NodePort (DIRECT mode)
//  kcPort          → Live editable Keycloak NodePort (DIRECT mode)
//  token           → Current JWT access_token string (null if not authed)
//  tokOk           → Boolean — true when token is valid
//  tokExp          → Unix ms timestamp when current token expires
//  tokSecs         → Countdown seconds shown in topbar chip
//  page            → Active page id: "dash"|"accounts"|"loans"|"cards"|"customer"|"gateway"
//  navSearch       → Sidebar search filter string
//  actLog          → Array of last 10 API call records (for Dashboard activity)
//  toasts          → Array of active toast notifications
//  res             → Object keyed by opId → last response data per operation
//
//  ┌─────────────────────────────────────────────────────────┐
//  │  Derived (computed from state, not stored)               │
//  └─────────────────────────────────────────────────────────┘
//
//  gwBase          → "" (NGINX mode) or "http://<ec2Ip>:<gwPort>" (DIRECT)
//  kcUrl           → Full Keycloak token endpoint URL
//  sfGw / sfKc     → Sidebar footer display strings
