import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// CONFIGURATION (Simulating external config.js)
// ==========================================
// In a real app, this would be in public/config.js:
// window.APP_CONFIG = { ec2Ip: "13.233.158.149", clientId: "...", clientSecret: "..." };
const getExternalConfig = () => window.APP_CONFIG || {};

// ==========================================
// CSS STYLES (Preserving Exact Visual Identity)
// ==========================================
const globalStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #080b12; --ink1: #0d1120; --ink2: #121729; --ink3: #18202f; --ink4: #1e2840;
    --rim: #ffffff0a; --rim2: #ffffff14; --rim3: #ffffff20; --rim4: #ffffff2e;
    --neon: #00ffe0; --neon2: #00c8b4; --neondim: #00ffe01a; --neonborder: #00ffe033;
    --gold: #f0c040; --golddim: #f0c0401a; --goldborder: #f0c04033;
    --rose: #ff4d6d; --rosedim: #ff4d6d18; --roseborder: #ff4d6d33;
    --sky: #4da6ff; --skydim: #4da6ff18; --skyborder: #4da6ff33;
    --lime: #7fff6e; --limedim: #7fff6e18;
    --tx: #e8edf5; --tx2: #9aa4b8; --mu: #4e5a72; --mu2: #2e3548;
    --syne: 'Syne', sans-serif; --mono: 'Space Mono', monospace; --body: 'Inter', sans-serif;
    --r6: 6px; --r8: 8px; --r10: 10px; --r12: 12px; --r16: 16px; --r20: 20px; --r24: 24px;
  }
  html, body { height: 100%; background: var(--ink); color: var(--tx); font-family: var(--body); overflow: hidden; }
  body::before {
    content: ''; position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0; opacity: .5;
  }
  .shell { display: grid; grid-template-columns: 72px 220px 1fr; grid-template-rows: 56px 1fr; height: 100vh; position: relative; z-index: 1; }
  .topbar { grid-column: 1/-1; display: flex; align-items: center; padding: 0 20px 0 0; background: var(--ink1); border-bottom: 1px solid var(--rim2); gap: 12px; z-index: 40; position: relative; }
  .topbar::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, var(--neon)00, var(--neon)66, var(--neon)00); }
  .brand-strip { width: 72px; height: 56px; display: flex; align-items: center; justify-content: center; background: var(--ink); border-right: 1px solid var(--rim2); border-bottom: 1px solid var(--neonborder); flex-shrink: 0; }
  .brand-logo { width: 36px; height: 36px; border-radius: 10px; background: var(--neondim); border: 1px solid var(--neonborder); display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 0 20px var(--neon)22, inset 0 0 10px var(--neon)11; }
  .brand-text { padding: 0 16px; border-right: 1px solid var(--rim2); }
  .brand-name { font-family: var(--syne); font-size: 17px; font-weight: 800; color: var(--neon); text-shadow: 0 0 20px var(--neon)88; letter-spacing: -.02em; }
  .brand-sub { font-size: 9px; color: var(--mu); font-family: var(--mono); letter-spacing: .15em; text-transform: uppercase; }
  .cfg-row { display: flex; align-items: center; gap: 8px; flex: 1; }
  .cfg-seg { display: flex; align-items: center; gap: 6px; padding: 0 14px; border-right: 1px solid var(--rim2); height: 56px; }
  .cfg-lbl { font-size: 9px; font-family: var(--mono); color: var(--mu); text-transform: uppercase; letter-spacing: .1em; white-space: nowrap; }
  .cfg-seg input { background: transparent; border: none; outline: none; color: var(--neon); font-family: var(--mono); font-size: 11px; }
  .cfg-seg input.ip-in { width: 125px; } .cfg-seg input.port-in { width: 44px; }
  .mode-wrap { display: flex; gap: 3px; }
  .mode-btn { padding: 4px 10px; border-radius: 5px; font-size: 10px; cursor: pointer; border: 1px solid var(--rim2); background: transparent; color: var(--mu); font-family: var(--mono); transition: all .15s; }
  .mode-btn.on { background: var(--neondim); border-color: var(--neonborder); color: var(--neon); text-shadow: 0 0 8px var(--neon); }
  .tok-chip { display: flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 20px; border: 1px solid var(--rim2); background: var(--ink2); font-size: 11px; font-family: var(--mono); transition: all .3s; }
  .tok-chip.ok { border-color: var(--neonborder); background: var(--neondim); }
  .tok-chip.err { border-color: var(--roseborder); background: var(--rosedim); }
  .tok-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mu2); transition: all .3s; flex-shrink: 0; }
  .tok-chip.ok .tok-dot { background: var(--neon); box-shadow: 0 0 6px var(--neon); animation: blink 2s infinite; }
  .tok-chip.err .tok-dot { background: var(--rose); }
  .tok-chip.ok .tok-txt { color: var(--neon); } .tok-chip.err .tok-txt { color: var(--rose); }
  .tok-exp { color: var(--mu); font-size: 10px; }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
  .av-btn { width: 32px; height: 32px; border-radius: 50%; background: var(--ink3); border: 1px solid var(--rim3); display: flex; align-items: center; justify-content: center; font-size: 11px; font-family: var(--syne); font-weight: 700; color: var(--neon); cursor: pointer; margin-left: auto; margin-right: 8px; flex-shrink: 0; }
  .icon-rail { background: var(--ink); border-right: 1px solid var(--rim2); display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 4px; overflow-y: auto; }
  .ir-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; transition: all .15s; border: 1px solid transparent; position: relative; }
  .ir-icon:hover { background: var(--ink3); border-color: var(--rim2); }
  .ir-icon.on { background: var(--neondim); border-color: var(--neonborder); }
  .ir-icon.on::after { content: ''; position: absolute; right: -1px; top: 25%; bottom: 25%; width: 2px; background: var(--neon); border-radius: 2px 0 0 2px; box-shadow: 0 0 6px var(--neon); }
  .ir-sep { width: 24px; height: 1px; background: var(--rim2); margin: 4px 0; }
  .sidebar { background: var(--ink1); border-right: 1px solid var(--rim2); overflow-y: auto; display: flex; flex-direction: column; }
  .sb-search { padding: 12px; border-bottom: 1px solid var(--rim2); }
  .sb-search-inner { display: flex; align-items: center; gap: 8px; background: var(--ink2); border: 1px solid var(--rim2); border-radius: var(--r8); padding: 7px 11px; transition: border-color .15s; }
  .sb-search-inner:focus-within { border-color: var(--neonborder); }
  .sb-search-inner input { background: transparent; border: none; outline: none; color: var(--tx); font-family: var(--body); font-size: 13px; width: 100%; }
  .sb-search-inner input::placeholder { color: var(--mu); }
  .sb-search-inner span { color: var(--mu); font-size: 12px; }
  .sb-section { padding: 0 8px; margin: 8px 0; }
  .sb-lbl { font-size: 9px; font-family: var(--mono); text-transform: uppercase; letter-spacing: .12em; color: var(--mu2); padding: 8px 8px 4px; font-weight: 400; }
  .ni { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: var(--r8); cursor: pointer; font-size: 12.5px; color: var(--tx2); transition: all .15s; border: 1px solid transparent; margin-bottom: 1px; position: relative; }
  .ni:hover { background: var(--ink3); color: var(--tx); }
  .ni.on { background: var(--ink3); color: var(--neon); border-color: var(--rim2); }
  .ni.on::before { content: ''; position: absolute; left: -1px; top: 20%; bottom: 20%; width: 2px; background: var(--neon); border-radius: 0 2px 2px 0; box-shadow: 0 0 8px var(--neon); }
  .ni-ic { width: 22px; height: 22px; border-radius: 6px; background: var(--ink2); display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; transition: background .15s; }
  .ni.on .ni-ic { background: var(--neondim); }
  .ni-txt { flex: 1; font-size: 12.5px; }
  .ni-badge { font-family: var(--mono); font-size: 9px; background: var(--ink2); padding: 2px 5px; border-radius: 4px; color: var(--mu); flex-shrink: 0; }
  .ni-live { width: 5px; height: 5px; border-radius: 50%; background: var(--neon); box-shadow: 0 0 4px var(--neon); flex-shrink: 0; }
  .sb-footer { margin-top: auto; padding: 12px; border-top: 1px solid var(--rim2); }
  .sb-stat { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .sb-stat-k { font-size: 9px; font-family: var(--mono); color: var(--mu); text-transform: uppercase; }
  .sb-stat-v { font-family: var(--mono); font-size: 9px; color: var(--neon2); }
  .sb-arch { font-size: 10px; color: var(--mu2); line-height: 1.7; margin-top: 8px; font-family: var(--mono); }
  .sb-arch span { color: var(--neon); font-size: 9px; }
  .main { overflow-y: auto; background: var(--ink); position: relative; padding: 24px 28px; }
  .page { animation: pageIn .18s ease; }
  @keyframes pageIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .ph { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; }
  .ph-left h2 { font-family: var(--syne); font-size: 24px; font-weight: 800; letter-spacing: -.03em; margin-bottom: 3px; line-height: 1.1; }
  .ph-left h2 em { color: var(--neon); font-style: normal; text-shadow: 0 0 20px var(--neon)55; }
  .ph-left p { font-size: 12px; color: var(--tx2); line-height: 1.5; font-family: var(--mono); }
  .ph-right { display: flex; gap: 8px; align-items: center; }
  .route-pill { font-family: var(--mono); font-size: 10px; color: var(--mu); background: var(--ink2); border: 1px solid var(--rim2); padding: 4px 12px; border-radius: 20px; }
  .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .stat { background: var(--ink1); border: 1px solid var(--rim2); border-radius: var(--r12); padding: 14px 16px; position: relative; overflow: hidden; transition: border-color .2s; cursor: default; }
  .stat:hover { border-color: var(--rim3); }
  .stat .s-ico { position: absolute; right: 12px; top: 10px; font-size: 20px; opacity: .12; }
  .stat .s-lbl { font-size: 9px; font-family: var(--mono); text-transform: uppercase; letter-spacing: .1em; color: var(--mu); margin-bottom: 8px; }
  .stat .s-val { font-family: var(--syne); font-size: 24px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
  .stat .s-sub { font-size: 10px; font-family: var(--mono); color: var(--mu); }
  .stat.neon { border-color: var(--neonborder); } .stat.neon .s-val { color: var(--neon); text-shadow: 0 0 16px var(--neon)66; }
  .stat.gold { border-color: var(--goldborder); } .stat.gold .s-val { color: var(--gold); }
  .stat.rose { border-color: var(--roseborder); } .stat.rose .s-val { color: var(--rose); }
  .stat.sky { border-color: var(--skyborder); } .stat.sky .s-val { color: var(--sky); }
  .stat::before { content: ''; position: absolute; inset: 0; border-radius: var(--r12); opacity: 0; transition: opacity .3s; box-shadow: inset 0 0 30px var(--neon)0a; }
  .stat:hover::before { opacity: 1; }
  .svc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .svc { background: var(--ink1); border: 1px solid var(--rim2); border-radius: var(--r12); padding: 16px; cursor: pointer; transition: all .2s; position: relative; overflow: hidden; }
  .svc::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--c, transparent); }
  .svc:hover { border-color: var(--rim3); transform: translateY(-2px); background: var(--ink2); }
  .svc-head { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
  .svc-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }
  .svc-name { font-family: var(--syne); font-size: 13px; font-weight: 600; flex: 1; }
  .svc-port { font-family: var(--mono); font-size: 9px; color: var(--mu); background: var(--ink3); padding: 2px 7px; border-radius: 20px; }
  .svc-desc { font-size: 11px; color: var(--tx2); line-height: 1.55; margin-bottom: 10px; }
  .svc-foot { display: flex; align-items: center; justify-content: space-between; }
  .svc-eps { font-size: 10px; color: var(--mu); font-family: var(--mono); } .svc-eps b { color: var(--neon2); }
  .svc-arr { font-size: 11px; color: var(--mu); transition: all .2s; }
  .svc:hover .svc-arr { color: var(--neon); transform: translateX(3px); }
  .act-section { background: var(--ink1); border: 1px solid var(--rim2); border-radius: var(--r12); padding: 16px; }
  .act-section h3 { font-size: 11px; font-family: var(--mono); font-weight: 400; color: var(--tx2); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: .1em; }
  .act-section h3::after { content: ''; flex: 1; height: 1px; background: var(--rim2); }
  .act-empty { text-align: center; padding: 24px; color: var(--mu); font-size: 12px; font-family: var(--mono); }
  .act-item { display: flex; align-items: center; gap: 9px; padding: 8px 0; border-bottom: 1px solid var(--rim); }
  .act-item:last-child { border-bottom: none; }
  .act-ic { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
  .act-ic.ok { background: var(--neondim); } .act-ic.err { background: var(--rosedim); } .act-ic.info { background: var(--skydim); }
  .act-body { flex: 1; min-width: 0; }
  .act-title { font-size: 12px; color: var(--tx2); margin-bottom: 1px; font-family: var(--mono); }
  .act-meta { font-size: 10px; color: var(--mu); font-family: var(--mono); }
  .act-code { font-family: var(--mono); font-size: 10px; padding: 2px 7px; border-radius: 20px; }
  .ac-2 { background: var(--neondim); color: var(--neon); border: 1px solid var(--neonborder); }
  .ac-4 { background: var(--golddim); color: var(--gold); border: 1px solid var(--goldborder); }
  .ac-5 { background: var(--rosedim); color: var(--rose); border: 1px solid var(--roseborder); }
  .b-layout { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
  .tabs { display: flex; gap: 2px; background: var(--ink1); border: 1px solid var(--rim2); border-radius: var(--r10); padding: 3px; width: fit-content; margin-bottom: 16px; }
  .tab { padding: 6px 16px; border-radius: 7px; cursor: pointer; font-size: 12px; font-family: var(--mono); color: var(--mu); transition: all .15s; display: flex; align-items: center; gap: 5px; }
  .tab:hover { color: var(--tx2); }
  .tab.on { background: var(--ink3); color: var(--neon); box-shadow: 0 0 12px var(--neon)18; }
  .fc { background: var(--ink1); border: 1px solid var(--rim2); border-radius: var(--r12); overflow: hidden; margin-bottom: 14px; }
  .fc-head { padding: 14px 18px; border-bottom: 1px solid var(--rim2); display: flex; align-items: center; gap: 9px; }
  .fc-icon { width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 13px; }
  .fc-title { font-family: var(--syne); font-size: 14px; font-weight: 600; flex: 1; }
  .method { font-family: var(--mono); font-size: 9px; font-weight: 700; padding: 3px 7px; border-radius: 4px; }
  .m-post { background: var(--skydim); color: var(--sky); } .m-get { background: var(--neondim); color: var(--neon); }
  .m-put { background: var(--golddim); color: var(--gold); } .m-delete { background: var(--rosedim); color: var(--rose); }
  .fc-body { padding: 16px 18px; }
  .fr { margin-bottom: 12px; }
  .fr label { display: block; font-size: 9px; font-family: var(--mono); text-transform: uppercase; letter-spacing: .08em; color: var(--mu); margin-bottom: 4px; }
  .fr input, .fr select, .fr textarea { width: 100%; background: var(--ink2); border: 1px solid var(--rim2); border-radius: var(--r8); padding: 8px 12px; color: var(--tx); font-family: var(--mono); font-size: 13px; outline: none; transition: all .2s; }
  .fr input:focus, .fr select:focus, .fr textarea:focus { border-color: var(--neonborder); background: var(--ink3); box-shadow: 0 0 0 3px var(--neon)0a; }
  .fr input::placeholder { color: var(--mu2); }
  .fr select option { background: var(--ink2); }
  .fr-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .fr-hint { font-size: 10px; color: var(--mu2); font-family: var(--mono); margin-top: 3px; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: var(--r8); border: none; font-family: var(--mono); font-size: 12px; font-weight: 700; cursor: pointer; transition: all .18s; white-space: nowrap; text-transform: uppercase; letter-spacing: .04em; }
  .btn-primary { background: var(--neon); color: var(--ink); box-shadow: 0 0 20px var(--neon)33; }
  .btn-primary:hover { background: var(--neon2); transform: translateY(-1px); box-shadow: 0 4px 20px var(--neon)44; }
  .btn-ghost { background: transparent; border: 1px solid var(--rim3); color: var(--tx2); }
  .btn-ghost:hover { border-color: var(--neonborder); color: var(--neon); background: var(--neondim); }
  .btn-danger { background: var(--rosedim); border: 1px solid var(--roseborder); color: var(--rose); }
  .btn-danger:hover { background: var(--rose); color: #fff; border-color: var(--rose); }
  .btn-sm { padding: 5px 12px; font-size: 10px; }
  .btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
  .res { border: 1px solid var(--rim2); border-radius: var(--r10); overflow: hidden; background: var(--ink2); margin-top: 12px; }
  .res-head { padding: 7px 12px; display: flex; align-items: center; gap: 7px; border-bottom: 1px solid var(--rim); background: var(--ink3); }
  .res-body { padding: 10px 12px; font-family: var(--mono); font-size: 11px; line-height: 1.75; white-space: pre-wrap; max-height: 240px; overflow-y: auto; color: var(--tx2); }
  .pill { padding: 3px 8px; border-radius: 20px; font-family: var(--mono); font-size: 10px; font-weight: 700; }
  .p2 { background: var(--neondim); color: var(--neon); border: 1px solid var(--neonborder); }
  .p4 { background: var(--golddim); color: var(--gold); border: 1px solid var(--goldborder); }
  .p5 { background: var(--rosedim); color: var(--rose); border: 1px solid var(--roseborder); }
  .res-ms { font-family: var(--mono); font-size: 10px; color: var(--mu); margin-left: auto; }
  .d-card { background: var(--ink2); border: 1px solid var(--rim2); border-radius: var(--r12); overflow: hidden; margin-bottom: 12px; }
  .d-card-h { padding: 16px 18px; background: var(--ink3); border-bottom: 1px solid var(--rim2); position: relative; }
  .d-card-h::after { content: '◈'; position: absolute; right: 14px; bottom: -6px; font-size: 52px; opacity: .04; color: var(--neon); }
  .d-name { font-family: var(--syne); font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .d-meta { font-size: 11px; font-family: var(--mono); color: var(--mu); display: flex; align-items: center; gap: 10px; }
  .d-badge { font-size: 9px; font-family: var(--mono); padding: 2px 8px; border-radius: 20px; background: var(--neondim); color: var(--neon); border: 1px solid var(--neonborder); }
  .d-body { padding: 14px 18px; }
  .d-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .d-item { background: var(--ink1); border: 1px solid var(--rim); border-radius: var(--r8); padding: 9px 12px; }
  .d-item.span2 { grid-column: 1/-1; }
  .d-item .di-l { font-size: 9px; font-family: var(--mono); color: var(--mu); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 3px; }
  .d-item .di-v { font-family: var(--mono); font-size: 12px; color: var(--tx); }
  .fin { background: var(--ink2); border: 1px solid var(--rim2); border-radius: var(--r12); overflow: hidden; margin-bottom: 12px; }
  .fin-h { padding: 14px 18px; background: var(--ink3); border-bottom: 1px solid var(--rim2); display: flex; justify-content: space-between; align-items: flex-start; }
  .fin-type { font-family: var(--syne); font-size: 16px; font-weight: 700; }
  .fin-num { font-family: var(--mono); font-size: 10px; color: var(--mu); margin-top: 2px; }
  .fin-b { padding: 14px 18px; }
  .prog-wrap { margin-bottom: 12px; }
  .prog-labels { display: flex; justify-content: space-between; margin-bottom: 5px; }
  .prog-labels span { font-size: 10px; font-family: var(--mono); color: var(--mu); }
  .prog-labels b { font-size: 11px; font-weight: 700; }
  .prog-bar { height: 4px; background: var(--rim2); border-radius: 2px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 2px; transition: width .6s ease; }
  .amt-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .amt-item { text-align: center; background: var(--ink1); border: 1px solid var(--rim); border-radius: var(--r8); padding: 9px 6px; }
  .amt-item .ai-l { font-size: 9px; font-family: var(--mono); color: var(--mu); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 4px; }
  .amt-item .ai-v { font-family: var(--syne); font-size: 15px; font-weight: 700; }
  .ai-v.neon { color: var(--neon); } .ai-v.gold { color: var(--gold); } .ai-v.rose { color: var(--rose); } .ai-v.sky { color: var(--sky); }
  .c360-hdr { background: var(--ink1); border: 1px solid var(--neonborder); border-radius: var(--r12); padding: 18px; margin-bottom: 14px; display: flex; align-items: center; gap: 14px; box-shadow: 0 0 30px var(--neon)0a; }
  .c360-av { width: 48px; height: 48px; border-radius: 50%; background: var(--neondim); border: 2px solid var(--neonborder); display: flex; align-items: center; justify-content: center; font-family: var(--syne); font-size: 18px; font-weight: 800; color: var(--neon); flex-shrink: 0; box-shadow: 0 0 16px var(--neon)33; }
  .c360-name { font-family: var(--syne); font-size: 18px; font-weight: 700; margin-bottom: 3px; }
  .c360-row { font-size: 11px; font-family: var(--mono); color: var(--tx2); display: flex; gap: 14px; }
  .gw-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .gw-panel { background: var(--ink1); border: 1px solid var(--rim2); border-radius: var(--r12); overflow: hidden; }
  .gw-head { padding: 11px 14px; border-bottom: 1px solid var(--rim2); display: flex; align-items: center; gap: 7px; font-size: 12px; font-family: var(--syne); font-weight: 600; }
  .gw-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 5px currentColor; }
  .gw-body { padding: 10px; }
  .gw-btn { width: 100%; display: flex; align-items: center; gap: 7px; padding: 8px 10px; border-radius: var(--r8); border: 1px solid var(--rim2); background: transparent; color: var(--tx2); font-family: var(--mono); font-size: 11px; cursor: pointer; transition: all .15s; margin-bottom: 5px; text-align: left; }
  .gw-btn:hover { background: var(--ink3); border-color: var(--neonborder); color: var(--neon); }
  .gw-method { font-family: var(--mono); font-size: 8px; padding: 2px 5px; border-radius: 3px; background: var(--neondim); color: var(--neon); flex-shrink: 0; }
  #toast-wrap { position: fixed; bottom: 18px; right: 18px; z-index: 9999; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; pointer-events: none; }
  .toast { background: var(--ink3); border: 1px solid var(--rim3); border-radius: var(--r10); padding: 10px 14px; font-size: 12px; font-family: var(--mono); display: flex; align-items: center; gap: 8px; animation: toastIn .25s ease; box-shadow: 0 8px 32px #00000099; max-width: 280px; pointer-events: all; }
  @keyframes toastIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }
  .toast.ok { border-color: var(--neonborder); } .toast.err { border-color: var(--roseborder); } .toast.info { border-color: var(--skyborder); }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--rim3); border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--rim4); }
`;

// ==========================================
// UTILITY COMPONENTS & FUNCTIONS
// ==========================================
const fmt = (n) => n ? Number(n).toLocaleString('en-IN') : '0';

const ResBox = ({ res }) => {
  if (!res) return null;
  const { method, path, status, statusText, ms, data, error } = res;
  const sc = status < 300 ? 'p2' : status < 500 ? 'p4' : 'p5';

  if (error) {
    return (
      <div className="res">
        <div className="res-head">
          <span className="pill p5">Network Error</span>
          <span className="res-ms">{ms}ms</span>
        </div>
        <div className="res-body" style={{ color: 'var(--rose)' }}>
          {error}
          {`\n\n// Check:\n// kubectl get pods\n// kubectl get svc nginx-frontend\n// Security Group port open?`}
        </div>
      </div>
    );
  }

  let pretty = data;
  if (typeof data === 'object') pretty = JSON.stringify(data, null, 2);

  return (
    <div className="res">
      <div className="res-head">
        <span className={`pill ${sc}`}>{status} {statusText}</span>
        <span style={{ color: 'var(--mu)', fontSize: '10px', fontFamily: 'var(--mono)' }}>{ms}ms</span>
        <span className="res-ms">{method} {path}</span>
      </div>
      <div className="res-body">{pretty}</div>
    </div>
  );
};

const RenderAccount = ({ data }) => {
  if (!data) return null;
  const a = data.accountsDto || data;
  return (
    <div className="d-card">
      <div className="d-card-h">
        <div className="d-name">{data.name || 'Account'}</div>
        <div className="d-meta">
          <span>✉ {data.email || '—'}</span>
          <span>☎ {data.mobileNumber || '—'}</span>
          <span className="d-badge">{a.accountType || 'Account'}</span>
        </div>
      </div>
      <div className="d-body">
        <div className="d-grid">
          <div className="d-item">
            <div className="di-l">Account #</div>
            <div className="di-v">{a.accountNumber || '—'}</div>
          </div>
          <div className="d-item">
            <div className="di-l">Type</div>
            <div className="di-v">{a.accountType || '—'}</div>
          </div>
          <div className="d-item span2">
            <div className="di-l">Branch</div>
            <div className="di-v">{a.branchAddress || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RenderLoan = ({ data }) => {
  if (!data) return null;
  const pct = data.totalLoan ? Math.min(100, Math.round((data.amountPaid / data.totalLoan) * 100)) : 0;
  const col = pct > 75 ? 'var(--neon)' : pct > 40 ? 'var(--gold)' : 'var(--sky)';
  return (
    <div className="fin">
      <div className="fin-h">
        <div>
          <div className="fin-type">{data.loanType || 'Loan'}</div>
          <div className="fin-num">Loan # {data.loanNumber || '—'}</div>
        </div>
        <span className="pill p2">{pct}% repaid</span>
      </div>
      <div className="fin-b">
        <div className="prog-wrap">
          <div className="prog-labels">
            <span>Repayment</span><b>{pct}%</b>
          </div>
          <div className="prog-bar">
            <div className="prog-fill" style={{ width: `${pct}%`, background: col }}></div>
          </div>
        </div>
        <div className="amt-row">
          <div className="amt-item">
            <div className="ai-l">Total</div>
            <div className="ai-v gold">₹{fmt(data.totalLoan)}</div>
          </div>
          <div className="amt-item">
            <div className="ai-l">Paid</div>
            <div className="ai-v neon">₹{fmt(data.amountPaid)}</div>
          </div>
          <div className="amt-item">
            <div className="ai-l">Outstanding</div>
            <div className="ai-v rose">₹{fmt(data.outstandingAmount)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RenderCard = ({ data }) => {
  if (!data) return null;
  const pct = data.totalLimit ? Math.min(100, Math.round((data.amountUsed / data.totalLimit) * 100)) : 0;
  const col = pct > 80 ? 'var(--rose)' : pct > 50 ? 'var(--gold)' : 'var(--neon)';
  return (
    <div className="fin">
      <div className="fin-h">
        <div>
          <div className="fin-type">{data.cardType || 'Card'}</div>
          <div className="fin-num">**** {(data.cardNumber || '0000').slice(-4)}</div>
        </div>
        <span className={`pill ${pct > 80 ? 'p5' : pct > 50 ? 'p4' : 'p2'}`}>{pct}% used</span>
      </div>
      <div className="fin-b">
        <div className="prog-wrap">
          <div className="prog-labels">
            <span>Utilization</span><b>{pct}%</b>
          </div>
          <div className="prog-bar">
            <div className="prog-fill" style={{ width: `${pct}%`, background: col }}></div>
          </div>
        </div>
        <div className="amt-row">
          <div className="amt-item">
            <div className="ai-l">Limit</div>
            <div className="ai-v gold">₹{fmt(data.totalLimit)}</div>
          </div>
          <div className="amt-item">
            <div className="ai-l">Used</div>
            <div className="ai-v rose">₹{fmt(data.amountUsed)}</div>
          </div>
          <div className="amt-item">
            <div className="ai-l">Available</div>
            <div className="ai-v neon">₹{fmt(data.availableAmount)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN APPLICATION COMPONENT
// ==========================================
export default function EazyBankApp() {
  // Config & State
  const extConfig = getExternalConfig();
  const [mode, setMode] = useState('nginx');
  const [cfg, setCfg] = useState({
    ip: extConfig.ec2Ip || '13.233.158.149',
    gwPort: '30564',
    kcPort: '31479',
    kcRealm: 'master',
    kcClient: extConfig.clientId || 'eazybank-callcenter-cc',
    kcSecret: extConfig.clientSecret || '',
    refreshMs: extConfig.tokenRefreshInterval || 50000
  });

  const [token, setToken] = useState(null);
  const [tokenExp, setTokenExp] = useState(0);
  const [authError, setAuthError] = useState(null);

  const [activePage, setActivePage] = useState('dash');
  const [searchQuery, setSearchQuery] = useState('');
  const [activity, setActivity] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Computed Config URLs
  const GW_URL = mode === 'nginx' ? '' : `http://${cfg.ip}:${cfg.gwPort}`;
  const KC_URL = mode === 'nginx'
    ? `/realms/${cfg.kcRealm}/protocol/openid-connect/token`
    : `http://${cfg.ip}:${cfg.kcPort}/realms/${cfg.kcRealm}/protocol/openid-connect/token`;

  // Token Management
  const fetchToken = async () => {
    try {
      const res = await fetch(KC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${cfg.kcClient}&client_secret=${cfg.kcSecret}&scope=openid profile email`
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setToken(d.access_token);
      setTokenExp(d.expires_in);
      setAuthError(null);
    } catch (e) {
      setToken(null);
      setTokenExp(0);
      setAuthError(e.message);
    }
  };

  useEffect(() => {
    fetchToken();
    const interval = setInterval(fetchToken, cfg.refreshMs);
    return () => clearInterval(interval);
  }, [KC_URL, cfg.kcClient, cfg.kcSecret, cfg.refreshMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTokenExp(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // UI Helpers
  const addToast = (msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const addActivity = (method, path, status, ms, type) => {
    const time = new Date().toLocaleTimeString();
    setActivity(prev => [{ method, path, status, ms, type, time }, ...prev].slice(0, 10));
  };

  const apiCall = async (method, path, body = null, headers = {}) => {
    const t0 = Date.now();
    try {
      const h = { 'Content-Type': 'application/json', ...headers };
      if (token) h['Authorization'] = 'Bearer ' + token;
      const opts = { method, headers: h };
      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) opts.body = JSON.stringify(body);

      const r = await fetch(GW_URL + path, opts);
      const ms = Date.now() - t0;
      const txt = await r.text();
      let data = txt;
      try { data = JSON.parse(txt); } catch (e) {}

      const type = r.ok ? 'ok' : 'err';
      addToast((r.ok ? '✓ ' : '⚠ ') + r.status + ' ' + r.statusText, type);
      addActivity(method, path, r.status, ms, type);

      return { method, path, status: r.status, statusText: r.statusText, ms, data, error: null };
    } catch (e) {
      const ms = Date.now() - t0;
      addToast('✗ ' + e.message, 'err');
      addActivity(method, path, 0, ms, 'err');
      return { method, path, status: 0, statusText: 'Error', ms, data: null, error: e.message };
    }
  };

  // Nav helper
  const isNavMatch = (key) => key.includes(searchQuery.toLowerCase());

  // Renderers
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <div className="shell">

        {/* TOPBAR */}
        <header className="topbar">
          <div className="brand-strip"><div className="brand-logo">🏦</div></div>
          <div className="brand-text">
            <div className="brand-name">EAZYBANK</div>
            <div className="brand-sub">Command Center</div>
          </div>

          <div className="cfg-row">
            <div className="cfg-seg">
              <span className="cfg-lbl">EC2</span>
              <input className="ip-in" value={cfg.ip} onChange={e => setCfg({...cfg, ip: e.target.value})} spellCheck="false" />
            </div>
            <div className="cfg-seg">
              <span className="cfg-lbl">Mode</span>
              <div className="mode-wrap">
                <button className={`mode-btn ${mode === 'nginx' ? 'on' : ''}`} onClick={() => setMode('nginx')}>NGINX</button>
                <button className={`mode-btn ${mode === 'direct' ? 'on' : ''}`} onClick={() => setMode('direct')}>DIRECT</button>
              </div>
            </div>
            {mode === 'direct' && (
              <div className="cfg-seg">
                <span className="cfg-lbl">GW</span>
                <input className="port-in" value={cfg.gwPort} onChange={e => setCfg({...cfg, gwPort: e.target.value})} />
                <span className="cfg-lbl" style={{ marginLeft: '10px' }}>KC</span>
                <input className="port-in" value={cfg.kcPort} onChange={e => setCfg({...cfg, kcPort: e.target.value})} />
              </div>
            )}
            <div className={`tok-chip ${!authError && token ? 'ok' : 'err'}`}>
              <div className="tok-dot"></div>
              <span className="tok-txt">{!authError && token ? 'AUTHED' : 'AUTH_ERR'}</span>
              <span className="tok-exp">{!authError && token ? `${tokenExp}s` : ''}</span>
            </div>
            <div className="av-btn">SR</div>
          </div>
        </header>

        {/* ICON RAIL */}
        <div className="icon-rail">
          <div className={`ir-icon ${activePage === 'dash' ? 'on' : ''}`} onClick={() => setActivePage('dash')} title="Dashboard">◈</div>
          <div className="ir-sep"></div>
          <div className={`ir-icon ${activePage === 'accounts' ? 'on' : ''}`} onClick={() => setActivePage('accounts')} title="Accounts">🏦</div>
          <div className={`ir-icon ${activePage === 'loans' ? 'on' : ''}`} onClick={() => setActivePage('loans')} title="Loans">💳</div>
          <div className={`ir-icon ${activePage === 'cards' ? 'on' : ''}`} onClick={() => setActivePage('cards')} title="Cards">💰</div>
          <div className="ir-sep"></div>
          <div className={`ir-icon ${activePage === 'customer' ? 'on' : ''}`} onClick={() => setActivePage('customer')} title="Customer 360">👤</div>
          <div className={`ir-icon ${activePage === 'gateway' ? 'on' : ''}`} onClick={() => setActivePage('gateway')} title="Gateway Info">⚡</div>
        </div>

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sb-search">
            <div className="sb-search-inner">
              <span>⌕</span>
              <input placeholder="Search pages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="sb-section">
            <div className="sb-lbl">Overview</div>
            {isNavMatch('dashboard') && (
              <div className={`ni ${activePage === 'dash' ? 'on' : ''}`} onClick={() => setActivePage('dash')}>
                <div className="ni-ic">◈</div><div className="ni-txt">Dashboard</div>
              </div>
            )}

            <div className="sb-lbl">Banking</div>
            {isNavMatch('accounts') && (
              <div className={`ni ${activePage === 'accounts' ? 'on' : ''}`} onClick={() => setActivePage('accounts')}>
                <div className="ni-ic">🏦</div><div className="ni-txt">Accounts</div>
                <span className="ni-badge">8080</span><div className="ni-live"></div>
              </div>
            )}
            {isNavMatch('loans') && (
              <div className={`ni ${activePage === 'loans' ? 'on' : ''}`} onClick={() => setActivePage('loans')}>
                <div className="ni-ic">💳</div><div className="ni-txt">Loans</div>
                <span className="ni-badge">8090</span><div className="ni-live"></div>
              </div>
            )}
            {isNavMatch('cards') && (
              <div className={`ni ${activePage === 'cards' ? 'on' : ''}`} onClick={() => setActivePage('cards')}>
                <div className="ni-ic">💰</div><div className="ni-txt">Cards</div>
                <span className="ni-badge">9000</span><div className="ni-live"></div>
              </div>
            )}

            <div className="sb-lbl">Analytics</div>
            {isNavMatch('customer 360') && (
              <div className={`ni ${activePage === 'customer' ? 'on' : ''}`} onClick={() => setActivePage('customer')}>
                <div className="ni-ic">👤</div><div className="ni-txt">Customer 360°</div>
              </div>
            )}
            {isNavMatch('gateway info') && (
              <div className={`ni ${activePage === 'gateway' ? 'on' : ''}`} onClick={() => setActivePage('gateway')}>
                <div className="ni-ic">⚡</div><div className="ni-txt">Gateway Info</div>
              </div>
            )}
          </div>
          <div className="sb-footer">
            <div className="sb-stat"><span className="sb-stat-k">Gateway</span><span className="sb-stat-v">{mode === 'nginx' ? 'nginx:30080' : `${cfg.ip}:${cfg.gwPort}`}</span></div>
            <div className="sb-stat"><span className="sb-stat-k">Keycloak</span><span className="sb-stat-v">{mode === 'nginx' ? 'nginx:30080' : `${cfg.ip}:${cfg.kcPort}`}</span></div>
            <div className="sb-arch">Browser→<span>{mode === 'nginx' ? 'Nginx' : 'Gateway'}</span>→Svc</div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          {activePage === 'dash' && <PageDashboard cfg={cfg} mode={mode} authError={authError} tokenExp={tokenExp} activity={activity} nav={setActivePage} />}
          {activePage === 'accounts' && <PageAccounts apiCall={apiCall} addToast={addToast} />}
          {activePage === 'loans' && <PageLoans apiCall={apiCall} addToast={addToast} />}
          {activePage === 'cards' && <PageCards apiCall={apiCall} addToast={addToast} />}
          {activePage === 'customer' && <PageCustomer apiCall={apiCall} addToast={addToast} />}
          {activePage === 'gateway' && <PageGateway apiCall={apiCall} />}
        </main>
      </div>

      {/* TOASTS */}
      <div id="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </>
  );
}

// ==========================================
// PAGE COMPONENTS
// ==========================================

function PageDashboard({ cfg, mode, authError, tokenExp, activity, nav }) {
  return (
    <div className="page on">
      <div className="ph">
        <div className="ph-left">
          <h2>Welcome, <em>EazyBank</em></h2>
          <p>Production · {mode === 'nginx' ? 'Nginx → Spring Cloud Gateway' : 'Direct API Gateway'} · K8s Microservices · EC2 <span style={{ color: 'var(--neon)' }}>{cfg.ip}</span></p>
        </div>
      </div>
      <div className="stat-row">
        <div className="stat neon"><div className="s-ico">🌐</div><div className="s-lbl">Frontend</div><div className="s-val">{mode === 'nginx' ? 'NGINX' : 'DIRECT'}</div><div className="s-sub">{mode === 'nginx' ? '2 replicas · :30080' : 'Direct connection'}</div></div>
        <div className="stat sky"><div className="s-ico">⚡</div><div className="s-lbl">API Gateway</div><div className="s-val">ClusterIP</div><div className="s-sub">gatewayserver:{mode === 'nginx' ? '8072' : cfg.gwPort}</div></div>
        <div className="stat gold"><div className="s-ico">🔐</div><div className="s-lbl">Auth Status</div><div className="s-val">{!authError ? 'Active' : 'Error'}</div><div className="s-sub">{!authError ? `JWT · expires ${tokenExp}s` : 'Keycloak unreachable'}</div></div>
        <div className="stat"><div className="s-ico">☸️</div><div className="s-lbl">K8s Services</div><div className="s-val">7</div><div className="s-sub">accounts·loans·cards·gw·cfg·eureka·msg</div></div>
      </div>
      <div className="svc-grid">
        <div className="svc" style={{ '--c': 'var(--neon)' }} onClick={() => nav('accounts')}>
          <div className="svc-head"><div className="svc-dot" style={{ color: 'var(--neon)', background: 'var(--neon)' }}></div><div className="svc-name">Accounts Service</div><div className="svc-port">:8080</div></div>
          <div className="svc-desc">Create and manage bank accounts. Supports savings, current and salary accounts with branch address management.</div>
          <div className="svc-foot"><span className="svc-eps"><b>6</b> endpoints · CRUD + info</span><span className="svc-arr">→</span></div>
        </div>
        <div className="svc" style={{ '--c': 'var(--sky)' }} onClick={() => nav('loans')}>
          <div className="svc-head"><div className="svc-dot" style={{ color: 'var(--sky)', background: 'var(--sky)' }}></div><div className="svc-name">Loans Service</div><div className="svc-port">:8090</div></div>
          <div className="svc-desc">Home, vehicle and personal loan management. Track repayment with outstanding amounts and payment history.</div>
          <div className="svc-foot"><span className="svc-eps"><b>5</b> endpoints · CRUD + info</span><span className="svc-arr">→</span></div>
        </div>
        <div className="svc" style={{ '--c': 'var(--gold)' }} onClick={() => nav('cards')}>
          <div className="svc-head"><div className="svc-dot" style={{ color: 'var(--gold)', background: 'var(--gold)' }}></div><div className="svc-name">Cards Service</div><div className="svc-port">:9000</div></div>
          <div className="svc-desc">Credit and debit card management. Monitor spending limits, utilization percentage and available credit in real time.</div>
          <div className="svc-foot"><span className="svc-eps"><b>5</b> endpoints · CRUD + info</span><span className="svc-arr">→</span></div>
        </div>
        <div className="svc" style={{ '--c': 'var(--lime)' }} onClick={() => nav('customer')}>
          <div className="svc-head"><div className="svc-dot" style={{ color: 'var(--lime)', background: 'var(--lime)' }}></div><div className="svc-name">Customer 360°</div><div className="svc-port">gateway</div></div>
          <div className="svc-desc">Aggregated profile — single gateway call returns account + loan + card via Feign client orchestration.</div>
          <div className="svc-foot"><span className="svc-eps"><b>1</b> endpoint · Feign</span><span className="svc-arr">→</span></div>
        </div>
        <div className="svc" style={{ '--c': 'var(--mu)' }} onClick={() => nav('gateway')}>
          <div className="svc-head"><div className="svc-dot" style={{ color: 'var(--mu)', background: 'var(--mu)' }}></div><div className="svc-name">Gateway Info</div><div className="svc-port">:8072</div></div>
          <div className="svc-desc">contact-info, build-info and java-version endpoints for all services via Spring Cloud Gateway.</div>
          <div className="svc-foot"><span className="svc-eps"><b>9</b> info endpoints</span><span className="svc-arr">→</span></div>
        </div>
        <div className="svc" style={{ '--c': 'var(--rose)' }}>
          <div className="svc-head"><div className="svc-dot" style={{ color: 'var(--rose)', background: 'var(--rose)' }}></div><div className="svc-name">Keycloak Auth</div><div className="svc-port">:{mode === 'nginx' ? '30080' : cfg.kcPort}</div></div>
          <div className="svc-desc">OAuth2 client credentials. Token auto-fetched on load and refreshed automatically.</div>
          <div className="svc-foot">
            <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--mu)' }}>
              {!authError ? <><span style={{ color: 'var(--neon)' }}>✓ Token active</span> · refresh {cfg.refreshMs/1000}s</> : <span style={{ color: 'var(--rose)' }}>✗ {authError}</span>}
            </span>
          </div>
        </div>
      </div>
      <div className="act-section">
        <h3>Recent Activity</h3>
        <div>
          {activity.length === 0 ? (
            <div className="act-empty">// No activity yet — make an API call to see it here</div>
          ) : (
            activity.map((a, i) => (
              <div key={i} className="act-item">
                <div className={`act-ic ${a.type}`}>{a.type === 'ok' ? '✓' : a.type === 'err' ? '✗' : '·'}</div>
                <div className="act-body">
                  <div className="act-title">{a.method} {a.path}</div>
                  <div className="act-meta">{a.time} · {a.ms}ms</div>
                </div>
                {a.status ? <span className={`act-code ${a.status < 300 ? 'ac-2' : a.status < 500 ? 'ac-4' : 'ac-5'}`}>{a.status}</span> : <span className="act-code ac-5">ERR</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PageAccounts({ apiCall, addToast }) {
  const [tab, setTab] = useState('create');
  const [form, setForm] = useState({ createName: '', createEmail: '', createMobile: '', fetchMobile: '', upName: '', upMobile: '', upEmail: '', upAccNo: '', upType: 'Savings', upAddr: '', delMobile: '' });
  const [res, setRes] = useState({ create: null, fetch: null, update: null, delete: null, info: null });

  const fillDemo = () => setForm({ ...form, createName: 'Sree Kumar', createEmail: 'sree@eazybytes.com', createMobile: '9876543210' });

  const handleCreate = async () => {
    if (!form.createName || !form.createEmail || !form.createMobile) return addToast('⚠ Fill all fields', 'err');
    setRes({ ...res, create: await apiCall('POST', '/eazybank/accounts/api/create', { name: form.createName, email: form.createEmail, mobileNumber: form.createMobile }) });
  };
  const handleFetch = async () => {
    if (!form.fetchMobile) return addToast('⚠ Enter mobile', 'err');
    setRes({ ...res, fetch: await apiCall('GET', `/eazybank/accounts/api/fetch?mobileNumber=${form.fetchMobile}`) });
  };
  const handleUpdate = async () => {
    if (!form.upMobile) return addToast('⚠ Enter mobile', 'err');
    setRes({ ...res, update: await apiCall('PUT', '/eazybank/accounts/api/update', { name: form.upName, email: form.upEmail, mobileNumber: form.upMobile, accountsDto: { accountNumber: parseInt(form.upAccNo) || 0, accountType: form.upType, branchAddress: form.upAddr } }) });
  };
  const handleDelete = async () => {
    if (!form.delMobile) return addToast('⚠ Enter mobile', 'err');
    if (!window.confirm(`Delete account for ${form.delMobile}?`)) return;
    setRes({ ...res, delete: await apiCall('DELETE', `/eazybank/accounts/api/delete?mobileNumber=${form.delMobile}`) });
  };
  const handleInfo = async (path) => setRes({ ...res, info: await apiCall('GET', path) });

  return (
    <div className="page on">
      <div className="ph">
        <div className="ph-left"><h2><em>Accounts</em></h2><p>GET/POST/PUT/DELETE · /eazybank/accounts/api</p></div>
        <div className="ph-right"><span className="route-pill">eazybank-ms/accounts:8080</span></div>
      </div>
      <div className="b-layout">
        <div>
          <div className="tabs">
            <div className={`tab ${tab === 'create' ? 'on' : ''}`} onClick={() => setTab('create')}>⚡ Create</div>
            <div className={`tab ${tab === 'fetch' ? 'on' : ''}`} onClick={() => setTab('fetch')}>⌕ Fetch</div>
            <div className={`tab ${tab === 'update' ? 'on' : ''}`} onClick={() => setTab('update')}>✎ Update</div>
            <div className={`tab ${tab === 'delete' ? 'on' : ''}`} onClick={() => setTab('delete')}>✕ Delete</div>
          </div>

          {tab === 'create' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--skydim)' }}>⚡</div><div className="fc-title">Create New Account</div><span className="method m-post">POST</span></div>
                <div className="fc-body">
                  <div className="fr"><label>Full Name</label><input value={form.createName} onChange={e => setForm({...form, createName: e.target.value})} placeholder="e.g. Madan Reddy" /></div>
                  <div className="fr"><label>Email</label><input type="email" value={form.createEmail} onChange={e => setForm({...form, createEmail: e.target.value})} placeholder="e.g. user@eazybytes.com" /></div>
                  <div className="fr"><label>Mobile Number</label><input value={form.createMobile} onChange={e => setForm({...form, createMobile: e.target.value})} placeholder="e.g. 4354437687" /><div className="fr-hint">// 10-digit · used as customer ID</div></div>
                  <div className="btn-row">
                    <button className="btn btn-primary" onClick={handleCreate}>⚡ Create Account</button>
                    <button className="btn btn-ghost btn-sm" onClick={fillDemo}>Fill Demo</button>
                  </div>
                  <ResBox res={res.create} />
                </div>
              </div>
            </div>
          )}

          {tab === 'fetch' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--neondim)' }}>⌕</div><div className="fc-title">Fetch Account</div><span className="method m-get">GET</span></div>
                <div className="fc-body">
                  <div className="fr"><label>Mobile Number</label><input value={form.fetchMobile} onChange={e => setForm({...form, fetchMobile: e.target.value})} placeholder="e.g. 4354437687" /></div>
                  <div className="btn-row"><button className="btn btn-primary" onClick={handleFetch}>⌕ Fetch Account</button></div>
                  <ResBox res={res.fetch} />
                </div>
              </div>
              {res.fetch && !res.fetch.error && <RenderAccount data={res.fetch.data} />}
            </div>
          )}

          {tab === 'update' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--golddim)' }}>✎</div><div className="fc-title">Update Account</div><span className="method m-put">PUT</span></div>
                <div className="fc-body">
                  <div className="fr-2">
                    <div className="fr"><label>Full Name</label><input value={form.upName} onChange={e => setForm({...form, upName: e.target.value})} placeholder="Updated name" /></div>
                    <div className="fr"><label>Mobile</label><input value={form.upMobile} onChange={e => setForm({...form, upMobile: e.target.value})} placeholder="4354437687" /></div>
                  </div>
                  <div className="fr"><label>Email</label><input value={form.upEmail} onChange={e => setForm({...form, upEmail: e.target.value})} placeholder="user@eazybytes.com" /></div>
                  <div className="fr-2">
                    <div className="fr"><label>Account Number</label><input value={form.upAccNo} onChange={e => setForm({...form, upAccNo: e.target.value})} placeholder="1105557729" /></div>
                    <div className="fr"><label>Account Type</label>
                      <select value={form.upType} onChange={e => setForm({...form, upType: e.target.value})}>
                        <option>Savings</option><option>Current</option><option>Salary</option>
                      </select>
                    </div>
                  </div>
                  <div className="fr"><label>Branch Address</label><input value={form.upAddr} onChange={e => setForm({...form, upAddr: e.target.value})} placeholder="123 Main Street, New York" /></div>
                  <div className="btn-row"><button className="btn btn-primary" onClick={handleUpdate}>💾 Update</button></div>
                  <ResBox res={res.update} />
                </div>
              </div>
            </div>
          )}

          {tab === 'delete' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--rosedim)' }}>✕</div><div className="fc-title">Delete Account</div><span className="method m-delete">DELETE</span></div>
                <div className="fc-body">
                  <div className="fr"><label>Mobile Number</label><input value={form.delMobile} onChange={e => setForm({...form, delMobile: e.target.value})} placeholder="e.g. 4354437687" /></div>
                  <div className="btn-row"><button className="btn btn-danger" onClick={handleDelete}>✕ Delete Account</button></div>
                  <ResBox res={res.delete} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="fc">
            <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--neondim)' }}>ℹ</div><div className="fc-title">Service Info</div></div>
            <div className="fc-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => handleInfo('/eazybank/accounts/api/contact-info')}>contact-info</button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => handleInfo('/eazybank/accounts/api/build-info')}>build-info</button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => handleInfo('/eazybank/accounts/api/java-version')}>java-version</button>
              </div>
              <ResBox res={res.info} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageLoans({ apiCall, addToast }) {
  const [tab, setTab] = useState('create');
  const [form, setForm] = useState({ createMobile: '', fetchMobile: '', upMobile: '', upNum: '', upType: 'Home Loan', upTotal: '', upPaid: '', upOut: '', delMobile: '' });
  const [res, setRes] = useState({ create: null, fetch: null, update: null, delete: null, info: null });

  const handleCreate = async () => {
    if (!form.createMobile) return addToast('⚠ Enter mobile', 'err');
    setRes({ ...res, create: await apiCall('POST', `/eazybank/loans/api/create?mobileNumber=${form.createMobile}`) });
  };
  const handleFetch = async () => {
    if (!form.fetchMobile) return addToast('⚠ Enter mobile', 'err');
    setRes({ ...res, fetch: await apiCall('GET', `/eazybank/loans/api/fetch?mobileNumber=${form.fetchMobile}`) });
  };
  const handleUpdate = async () => {
    if (!form.upMobile || !form.upNum) return addToast('⚠ Enter mobile+loan#', 'err');
    setRes({ ...res, update: await apiCall('PUT', '/eazybank/loans/api/update', { mobileNumber: form.upMobile, loanNumber: form.upNum, loanType: form.upType, totalLoan: +form.upTotal, amountPaid: +form.upPaid, outstandingAmount: +form.upOut }) });
  };
  const handleDelete = async () => {
    if (!form.delMobile) return addToast('⚠ Enter mobile', 'err');
    if (!window.confirm(`Delete loan for ${form.delMobile}?`)) return;
    setRes({ ...res, delete: await apiCall('DELETE', `/eazybank/loans/api/delete?mobileNumber=${form.delMobile}`) });
  };
  const handleInfo = async (path) => setRes({ ...res, info: await apiCall('GET', path) });

  return (
    <div className="page on">
      <div className="ph">
        <div className="ph-left"><h2><em>Loans</em></h2><p>GET/POST/PUT/DELETE · /eazybank/loans/api</p></div>
        <div className="ph-right"><span className="route-pill">eazybank-ms/loans:8090</span></div>
      </div>
      <div className="b-layout">
        <div>
          <div className="tabs">
            <div className={`tab ${tab === 'create' ? 'on' : ''}`} onClick={() => setTab('create')}>⚡ Create</div>
            <div className={`tab ${tab === 'fetch' ? 'on' : ''}`} onClick={() => setTab('fetch')}>⌕ Fetch</div>
            <div className={`tab ${tab === 'update' ? 'on' : ''}`} onClick={() => setTab('update')}>✎ Update</div>
            <div className={`tab ${tab === 'delete' ? 'on' : ''}`} onClick={() => setTab('delete')}>✕ Delete</div>
          </div>

          {tab === 'create' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--skydim)' }}>💳</div><div className="fc-title">Create Loan</div><span className="method m-post">POST</span></div>
                <div className="fc-body">
                  <div className="fr"><label>Mobile Number</label><input value={form.createMobile} onChange={e => setForm({...form, createMobile: e.target.value})} placeholder="e.g. 4354437687" /><div className="fr-hint">// system auto-generates loan number, type and amounts</div></div>
                  <div className="btn-row"><button className="btn btn-primary" onClick={handleCreate}>⚡ Create Loan</button></div>
                  <ResBox res={res.create} />
                </div>
              </div>
            </div>
          )}

          {tab === 'fetch' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--neondim)' }}>⌕</div><div className="fc-title">Fetch Loan</div><span className="method m-get">GET</span></div>
                <div className="fc-body">
                  <div className="fr"><label>Mobile Number</label><input value={form.fetchMobile} onChange={e => setForm({...form, fetchMobile: e.target.value})} placeholder="e.g. 4354437687" /></div>
                  <div className="btn-row"><button className="btn btn-primary" onClick={handleFetch}>⌕ Fetch Loan</button></div>
                  <ResBox res={res.fetch} />
                </div>
              </div>
              {res.fetch && !res.fetch.error && <RenderLoan data={res.fetch.data} />}
            </div>
          )}

          {tab === 'update' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--golddim)' }}>✎</div><div className="fc-title">Update Loan</div><span className="method m-put">PUT</span></div>
                <div className="fc-body">
                  <div className="fr-2">
                    <div className="fr"><label>Mobile</label><input value={form.upMobile} onChange={e => setForm({...form, upMobile: e.target.value})} placeholder="4354437687" /></div>
                    <div className="fr"><label>Loan Number</label><input value={form.upNum} onChange={e => setForm({...form, upNum: e.target.value})} placeholder="10071469799154" /></div>
                  </div>
                  <div className="fr"><label>Loan Type</label>
                    <select value={form.upType} onChange={e => setForm({...form, upType: e.target.value})}>
                      <option>Home Loan</option><option>Vehicle Loan</option><option>Personal Loan</option><option>Education Loan</option>
                    </select>
                  </div>
                  <div className="fr-2">
                    <div className="fr"><label>Total Loan (₹)</label><input type="number" value={form.upTotal} onChange={e => setForm({...form, upTotal: e.target.value})} placeholder="100000" /></div>
                    <div className="fr"><label>Amount Paid (₹)</label><input type="number" value={form.upPaid} onChange={e => setForm({...form, upPaid: e.target.value})} placeholder="10000" /></div>
                  </div>
                  <div className="fr"><label>Outstanding (₹)</label><input type="number" value={form.upOut} onChange={e => setForm({...form, upOut: e.target.value})} placeholder="90000" /></div>
                  <div className="btn-row"><button className="btn btn-primary" onClick={handleUpdate}>💾 Update Loan</button></div>
                  <ResBox res={res.update} />
                </div>
              </div>
            </div>
          )}

          {tab === 'delete' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--rosedim)' }}>✕</div><div className="fc-title">Delete Loan</div><span className="method m-delete">DELETE</span></div>
                <div className="fc-body">
                  <div className="fr"><label>Mobile Number</label><input value={form.delMobile} onChange={e => setForm({...form, delMobile: e.target.value})} placeholder="e.g. 4354437687" /></div>
                  <div className="btn-row"><button className="btn btn-danger" onClick={handleDelete}>✕ Delete Loan</button></div>
                  <ResBox res={res.delete} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="fc">
            <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--skydim)' }}>ℹ</div><div className="fc-title">Service Info</div></div>
            <div className="fc-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => handleInfo('/eazybank/loans/api/contact-info')}>contact-info</button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => handleInfo('/eazybank/loans/api/build-info')}>build-info</button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => handleInfo('/eazybank/loans/api/java-version')}>java-version</button>
              </div>
              <ResBox res={res.info} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageCards({ apiCall, addToast }) {
  const [tab, setTab] = useState('create');
  const [form, setForm] = useState({ createMobile: '', fetchMobile: '', upMobile: '', upNum: '', upType: 'Credit Card', upTotal: '', upUsed: '', upAvail: '', delMobile: '' });
  const [res, setRes] = useState({ create: null, fetch: null, update: null, delete: null, info: null });

  const handleCreate = async () => {
    if (!form.createMobile) return addToast('⚠ Enter mobile', 'err');
    setRes({ ...res, create: await apiCall('POST', `/eazybank/cards/api/create?mobileNumber=${form.createMobile}`) });
  };
  const handleFetch = async () => {
    if (!form.fetchMobile) return addToast('⚠ Enter mobile', 'err');
    setRes({ ...res, fetch: await apiCall('GET', `/eazybank/cards/api/fetch?mobileNumber=${form.fetchMobile}`) });
  };
  const handleUpdate = async () => {
    if (!form.upMobile || !form.upNum) return addToast('⚠ Enter mobile+card#', 'err');
    setRes({ ...res, update: await apiCall('PUT', '/eazybank/cards/api/update', { mobileNumber: form.upMobile, cardNumber: form.upNum, cardType: form.upType, totalLimit: +form.upTotal, amountUsed: +form.upUsed, availableAmount: +form.upAvail }) });
  };
  const handleDelete = async () => {
    if (!form.delMobile) return addToast('⚠ Enter mobile', 'err');
    if (!window.confirm(`Delete card for ${form.delMobile}?`)) return;
    setRes({ ...res, delete: await apiCall('DELETE', `/eazybank/cards/api/delete?mobileNumber=${form.delMobile}`) });
  };
  const handleInfo = async (path) => setRes({ ...res, info: await apiCall('GET', path) });

  return (
    <div className="page on">
      <div className="ph">
        <div className="ph-left"><h2><em>Cards</em></h2><p>GET/POST/PUT/DELETE · /eazybank/cards/api</p></div>
        <div className="ph-right"><span className="route-pill">eazybank-ms/cards:9000</span></div>
      </div>
      <div className="b-layout">
        <div>
          <div className="tabs">
            <div className={`tab ${tab === 'create' ? 'on' : ''}`} onClick={() => setTab('create')}>⚡ Create</div>
            <div className={`tab ${tab === 'fetch' ? 'on' : ''}`} onClick={() => setTab('fetch')}>⌕ Fetch</div>
            <div className={`tab ${tab === 'update' ? 'on' : ''}`} onClick={() => setTab('update')}>✎ Update</div>
            <div className={`tab ${tab === 'delete' ? 'on' : ''}`} onClick={() => setTab('delete')}>✕ Delete</div>
          </div>

          {tab === 'create' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--skydim)' }}>💰</div><div className="fc-title">Create Card</div><span className="method m-post">POST</span></div>
                <div className="fc-body">
                  <div className="fr"><label>Mobile Number</label><input value={form.createMobile} onChange={e => setForm({...form, createMobile: e.target.value})} placeholder="e.g. 4354437687" /><div className="fr-hint">// system auto-generates card number and sets default limits</div></div>
                  <div className="btn-row"><button className="btn btn-primary" onClick={handleCreate}>⚡ Create Card</button></div>
                  <ResBox res={res.create} />
                </div>
              </div>
            </div>
          )}

          {tab === 'fetch' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--neondim)' }}>⌕</div><div className="fc-title">Fetch Card</div><span className="method m-get">GET</span></div>
                <div className="fc-body">
                  <div className="fr"><label>Mobile Number</label><input value={form.fetchMobile} onChange={e => setForm({...form, fetchMobile: e.target.value})} placeholder="e.g. 4354437687" /></div>
                  <div className="btn-row"><button className="btn btn-primary" onClick={handleFetch}>⌕ Fetch Card</button></div>
                  <ResBox res={res.fetch} />
                </div>
              </div>
              {res.fetch && !res.fetch.error && <RenderCard data={res.fetch.data} />}
            </div>
          )}

          {tab === 'update' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--golddim)' }}>✎</div><div className="fc-title">Update Card</div><span className="method m-put">PUT</span></div>
                <div className="fc-body">
                  <div className="fr-2">
                    <div className="fr"><label>Mobile</label><input value={form.upMobile} onChange={e => setForm({...form, upMobile: e.target.value})} placeholder="4354437687" /></div>
                    <div className="fr"><label>Card Number</label><input value={form.upNum} onChange={e => setForm({...form, upNum: e.target.value})} placeholder="100107091026" /></div>
                  </div>
                  <div className="fr"><label>Card Type</label>
                    <select value={form.upType} onChange={e => setForm({...form, upType: e.target.value})}>
                      <option>Credit Card</option><option>Debit Card</option>
                    </select>
                  </div>
                  <div className="fr-2">
                    <div className="fr"><label>Total Limit (₹)</label><input type="number" value={form.upTotal} onChange={e => setForm({...form, upTotal: e.target.value})} placeholder="100000" /></div>
                    <div className="fr"><label>Amount Used (₹)</label><input type="number" value={form.upUsed} onChange={e => setForm({...form, upUsed: e.target.value})} placeholder="10000" /></div>
                  </div>
                  <div className="fr"><label>Available (₹)</label><input type="number" value={form.upAvail} onChange={e => setForm({...form, upAvail: e.target.value})} placeholder="90000" /></div>
                  <div className="btn-row"><button className="btn btn-primary" onClick={handleUpdate}>💾 Update Card</button></div>
                  <ResBox res={res.update} />
                </div>
              </div>
            </div>
          )}

          {tab === 'delete' && (
            <div className="tc on">
              <div className="fc">
                <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--rosedim)' }}>✕</div><div className="fc-title">Delete Card</div><span className="method m-delete">DELETE</span></div>
                <div className="fc-body">
                  <div className="fr"><label>Mobile Number</label><input value={form.delMobile} onChange={e => setForm({...form, delMobile: e.target.value})} placeholder="e.g. 4354437687" /></div>
                  <div className="btn-row"><button className="btn btn-danger" onClick={handleDelete}>✕ Delete Card</button></div>
                  <ResBox res={res.delete} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="fc">
            <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--golddim)' }}>ℹ</div><div className="fc-title">Service Info</div></div>
            <div className="fc-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => handleInfo('/eazybank/cards/api/contact-info')}>contact-info</button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => handleInfo('/eazybank/cards/api/build-info')}>build-info</button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => handleInfo('/eazybank/cards/api/java-version')}>java-version</button>
              </div>
              <ResBox res={res.info} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageCustomer({ apiCall, addToast }) {
  const [mobile, setMobile] = useState('');
  const [res, setRes] = useState(null);

  const handleFetch = async () => {
    if (!mobile) return addToast('⚠ Enter mobile', 'err');
    setRes(await apiCall('GET', `/eazybank/accounts/api/fetchCustomerDetails?mobileNumber=${mobile}`, null, { 'eazybank-correlation-id': 'portal-' + Date.now() }));
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="page on">
      <div className="ph">
        <div className="ph-left"><h2>Customer <em>360°</em></h2><p>Aggregated profile · single gateway call via Feign client</p></div>
        <div className="ph-right"><span className="route-pill">GET /eazybank/accounts/api/fetchCustomerDetails</span></div>
      </div>
      <div className="b-layout">
        <div>
          <div className="fc">
            <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--neondim)' }}>👤</div><div className="fc-title">Fetch Full Profile</div><span className="method m-get">GET</span></div>
            <div className="fc-body">
              <div className="fr"><label>Mobile Number</label><input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="e.g. 4354437687" /><div className="fr-hint">// returns account + loan + card in one call</div></div>
              <div className="btn-row"><button className="btn btn-primary" onClick={handleFetch}>⌕ Fetch 360° Profile</button></div>
              <ResBox res={res} />
            </div>
          </div>

          {res && res.data && !res.error && (
            <div>
              {res.data.name && (
                <div className="c360-hdr">
                  <div className="c360-av">{getInitials(res.data.name)}</div>
                  <div>
                    <div className="c360-name">{res.data.name}</div>
                    <div className="c360-row">
                      <span>✉ {res.data.email || '—'}</span>
                      <span>☎ {res.data.mobileNumber || '—'}</span>
                    </div>
                  </div>
                </div>
              )}
              <RenderAccount data={res.data} />
              {res.data.loansDto && <RenderLoan data={res.data.loansDto} />}
              {res.data.cardsDto && <RenderCard data={res.data.cardsDto} />}
            </div>
          )}
        </div>
        <div>
          <div className="fc">
            <div className="fc-head"><div className="fc-icon" style={{ background: 'var(--neondim)' }}>💡</div><div className="fc-title">How it works</div></div>
            <div className="fc-body" style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--tx2)', lineHeight: 1.8 }}>
              <p style={{ color: 'var(--neon)', marginBottom: '8px' }}>GET /api/fetchCustomerDetails</p>
              <p style={{ marginBottom: '8px', color: 'var(--mu)' }}>// Accounts → OpenFeign → Loans + Cards</p>
              <p>Returns combined JSON — no client-side stitching needed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageGateway({ apiCall }) {
  const [acRes, setAcRes] = useState(null);
  const [lnRes, setLnRes] = useState(null);
  const [cdRes, setCdRes] = useState(null);

  const call = async (path, setter) => setter(await apiCall('GET', path));

  return (
    <div className="page on">
      <div className="ph">
        <div className="ph-left"><h2>Gateway <em>Info</em></h2><p>contact-info · build-info · java-version for all services</p></div>
      </div>
      <div className="gw-grid">
        <div className="gw-panel">
          <div className="gw-head"><div className="gw-dot" style={{ color: 'var(--neon)', background: 'var(--neon)' }}></div>Accounts :8080</div>
          <div className="gw-body">
            <button className="gw-btn" onClick={() => call('/eazybank/accounts/api/contact-info', setAcRes)}><span className="gw-method">GET</span>contact-info</button>
            <button className="gw-btn" onClick={() => call('/eazybank/accounts/api/build-info', setAcRes)}><span className="gw-method">GET</span>build-info</button>
            <button className="gw-btn" onClick={() => call('/eazybank/accounts/api/java-version', setAcRes)}><span className="gw-method">GET</span>java-version</button>
            <ResBox res={acRes} />
          </div>
        </div>
        <div className="gw-panel">
          <div className="gw-head"><div className="gw-dot" style={{ color: 'var(--sky)', background: 'var(--sky)' }}></div>Loans :8090</div>
          <div className="gw-body">
            <button className="gw-btn" onClick={() => call('/eazybank/loans/api/contact-info', setLnRes)}><span className="gw-method">GET</span>contact-info</button>
            <button className="gw-btn" onClick={() => call('/eazybank/loans/api/build-info', setLnRes)}><span className="gw-method">GET</span>build-info</button>
            <button className="gw-btn" onClick={() => call('/eazybank/loans/api/java-version', setLnRes)}><span className="gw-method">GET</span>java-version</button>
            <ResBox res={lnRes} />
          </div>
        </div>
        <div className="gw-panel">
          <div className="gw-head"><div className="gw-dot" style={{ color: 'var(--gold)', background: 'var(--gold)' }}></div>Cards :9000</div>
          <div className="gw-body">
            <button className="gw-btn" onClick={() => call('/eazybank/cards/api/contact-info', setCdRes)}><span className="gw-method">GET</span>contact-info</button>
            <button className="gw-btn" onClick={() => call('/eazybank/cards/api/build-info', setCdRes)}><span className="gw-method">GET</span>build-info</button>
            <button className="gw-btn" onClick={() => call('/eazybank/cards/api/java-version', setCdRes)}><span className="gw-method">GET</span>java-version</button>
            <ResBox res={cdRes} />
          </div>
        </div>
      </div>
    </div>
  );
}
