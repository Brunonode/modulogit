import { useState, useEffect } from "react";

/* ════════════════════════════════════════════════════════
   WEB AUDIO — motor de som (sem arquivos externos)
════════════════════════════════════════════════════════ */
function createAudioCtx() {
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
}

function playSound(type) {
  const ctx = createAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const play = (freq, start, dur, vol = 0.3, shape = "sine") => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = shape; osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(vol, now + start + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + start + dur);
    osc.start(now + start); osc.stop(now + start + dur + 0.05);
  };

  if (type === "group_created") {
    play(523, 0.0, 0.12, 0.25); play(659, 0.1, 0.12, 0.25);
    play(784, 0.2, 0.12, 0.28); play(1047, 0.32, 0.3, 0.32);
    play(784, 0.45, 0.12, 0.18); play(1047, 0.52, 0.4, 0.28);
  } else if (type === "notification") {
    play(880, 0, 0.1, 0.2); play(1100, 0.12, 0.15, 0.22);
  } else if (type === "success") {
    play(440, 0, 0.08, 0.2); play(550, 0.09, 0.08, 0.2); play(660, 0.18, 0.2, 0.25);
  } else if (type === "install") {
    play(392, 0, 0.1, 0.2); play(523, 0.1, 0.1, 0.2);
    play(659, 0.2, 0.1, 0.22); play(784, 0.3, 0.25, 0.28);
  } else if (type === "point") {
    play(660, 0, 0.06, 0.3, "square"); play(880, 0.07, 0.1, 0.2);
  } else if (type === "set_won") {
    [523, 659, 784, 1047].forEach((f, i) => play(f, i * 0.08, 0.14, 0.25));
  } else if (type === "match_won") {
    [523, 659, 784, 1047, 1319].forEach((f, i) => play(f, i * 0.07, 0.18, 0.28));
    play(1047, 0.42, 0.4, 0.3);
  } else if (type === "error") {
    play(220, 0, 0.15, 0.25, "sawtooth"); play(180, 0.15, 0.2, 0.2, "sawtooth");
  }
  setTimeout(() => { try { ctx.close(); } catch { /**/ } }, 2000);
}

/* ════════════════════════════════════════════════════════
   PWA INSTALL MANAGER
════════════════════════════════════════════════════════ */
function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    setIsInstalled(standalone);
    if (ios && !standalone) setCanInstall(true);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setIsInstalled(true); setCanInstall(false); playSound("success"); });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (isIOS) return "ios";
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") { setIsInstalled(true); setCanInstall(false); playSound("install"); return "installed"; }
      return "dismissed";
    }
    playSound("install");
    setIsInstalled(true);
    setCanInstall(false);
    return "simulated";
  }

  return { canInstall, isIOS, isInstalled, install };
}

/* ════════════════════════════════════════════════════════
   WEB NOTIFICATIONS
════════════════════════════════════════════════════════ */
async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

function sendNotification(title, body, icon = "🏖️") {
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'>" + icon + "</text></svg>"
      });
    } catch { /**/ }
  }
}

/* ════════════════════════════════════════════════════════
   ALGORITMO DE JOGO PROGRESSIVO
════════════════════════════════════════════════════════ */
function buildPartnershipMatrix(rodadas) {
  const parceria = {};
  const confronto = {};
  const descansos = {};

  rodadas.forEach(r => {
    if (r.status === "bye") {
      const uid = r.bye_uid;
      descansos[uid] = (descansos[uid] || 0) + 1;
      return;
    }
    const { d1, d2 } = r;
    [[d1[0], d1[1]], [d2[0], d2[1]]].forEach(([a, b]) => {
      if (!parceria[a]) parceria[a] = {};
      if (!parceria[b]) parceria[b] = {};
      parceria[a][b] = (parceria[a][b] || 0) + 1;
      parceria[b][a] = (parceria[b][a] || 0) + 1;
    });
    const keyA = [...d1].sort().join("-");
    const keyB = [...d2].sort().join("-");
    if (!confronto[keyA]) confronto[keyA] = {};
    if (!confronto[keyB]) confronto[keyB] = {};
    confronto[keyA][keyB] = (confronto[keyA][keyB] || 0) + 1;
    confronto[keyB][keyA] = (confronto[keyB][keyA] || 0) + 1;
  });

  return { parceria, confronto, descansos };
}

function sortearProgressivo(presentes, rodadas) {
  if (presentes.length < 2) return null;

  const { parceria, confronto, descansos } = buildPartnershipMatrix(rodadas);

  const getPartnership = (a, b) => (parceria[a]?.[b] || 0);
  const getDescanso = (uid) => descansos[uid] || 0;
  const getConfrontoKey = (d1, d2) => {
    const k1 = [...d1].sort().join("-");
    const k2 = [...d2].sort().join("-");
    return confronto[k1]?.[k2] || 0;
  };

  let jogadores = [...presentes];
  let bye_uid = null;

  if (jogadores.length % 2 !== 0) {
    const sorted = [...jogadores].sort((a, b) => getDescanso(a) - getDescanso(b));
    bye_uid = sorted[0];
    jogadores = jogadores.filter(u => u !== bye_uid);
  }

  const allPairs = [];
  for (let i = 0; i < jogadores.length; i++) {
    for (let j = i + 1; j < jogadores.length; j++) {
      allPairs.push([jogadores[i], jogadores[j]]);
    }
  }

  const scorePair = (a, b) => getPartnership(a, b) * 10 + Math.random();
  const bestRound = findBestPairing(jogadores, allPairs, scorePair, getConfrontoKey);

  return { duplas: bestRound.pairs, bye_uid, confronto_score: bestRound.confrontoScore };
}

function findBestPairing(jogadores, allPairs, scorePair, getConfrontoKey) {
  const scored = allPairs
    .map(([a, b]) => ({ pair: [a, b], score: scorePair(a, b) }))
    .sort((a, b) => a.score - b.score);

  const n = jogadores.length;
  const numPairs = n / 2;
  const used = new Set();
  const chosen = [];

  for (const { pair } of scored) {
    if (chosen.length >= numPairs) break;
    const [a, b] = pair;
    if (!used.has(a) && !used.has(b)) {
      chosen.push(pair);
      used.add(a); used.add(b);
    }
  }

  const matchups = [];
  for (let i = 0; i < chosen.length - 1; i += 2) {
    const d1 = chosen[i], d2 = chosen[i + 1];
    if (d2) matchups.push({ d1, d2, confrontoScore: getConfrontoKey(d1, d2) });
  }

  return { pairs: chosen, matchups, confrontoScore: matchups.reduce((s, m) => s + m.confrontoScore, 0) };
}

function explainRound(duplas, parceria_matrix, bye_uid, getUserFn) {
  return duplas.map(pair => {
    const [a, b] = pair;
    const times = parceria_matrix[a]?.[b] || 0;
    const ua = getUserFn(a), ub = getUserFn(b);
    if (times === 0) return `${ua?.apelido} & ${ub?.apelido} — nunca jogaram juntos ✨`;
    return `${ua?.apelido} & ${ub?.apelido} — ${times}x juntos`;
  });
}

/* ════════════════════════════════════════════════════════
   ESTILOS
════════════════════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Nunito:wght@300;400;500;600;700;800;900&display=swap');

:root {
  --ocean:#0B4F6C; --ocean2:#073B52; --teal:#1A9B8C; --teal2:#137A6E;
  --sand:#FBF5E6; --sand2:#F0E6CC; --sand3:#E8D9B5;
  --sun:#F5A623; --sun2:#E8911A; --coral:#E8533A; --coral2:#C0392B;
  --sky:#7DD3E8; --grass:#2ECC71; --purple:#9B59B6;
  --white:#FFFFFF; --text:#1A1A2E; --muted:#6B7280;
  --card:rgba(255,255,255,0.97); --r:16px; --r2:22px;
  --sh:0 4px 20px rgba(11,79,108,0.11); --sh2:0 8px 40px rgba(11,79,108,0.2);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito',sans-serif;background:var(--sand);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased}
.app{max-width:430px;margin:0 auto;min-height:100vh;position:relative;background:var(--sand);overflow-x:hidden}

.hdr{background:linear-gradient(135deg,var(--ocean2) 0%,var(--ocean) 55%,var(--teal) 100%);padding:14px 20px 16px;position:sticky;top:0;z-index:60;box-shadow:0 2px 16px rgba(0,0,0,0.22)}
.logo{font-family:'Barlow Condensed',cursive;font-size:27px;font-weight:900;color:var(--sun);letter-spacing:1px}
.logo span{color:var(--sky)}
.logo-sub{font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;margin-top:1px}
.av-btn{width:38px;height:38px;border-radius:50%;background:var(--sun);color:var(--ocean2);font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center;border:2.5px solid rgba(255,255,255,0.3);cursor:pointer}

.bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--ocean2);display:flex;justify-content:space-around;align-items:center;height:64px;z-index:60;border-top:1px solid rgba(255,255,255,0.07)}
.nbtn{display:flex;flex-direction:column;align-items:center;gap:2px;color:rgba(255,255,255,0.38);font-size:10px;font-weight:700;cursor:pointer;padding:8px 12px;border-radius:12px;transition:all .18s;border:none;background:none}
.nbtn.active{color:var(--sun)}
.nbtn:hover:not(.active){color:var(--sky)}
.nico{font-size:21px;line-height:1}

.fab{position:fixed;bottom:76px;right:calc(50% - 200px);width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,var(--sun),var(--coral));color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(232,83,58,0.42);cursor:pointer;border:none;z-index:55;transition:transform .2s}
.fab:hover{transform:scale(1.1)}

.main{padding:16px 16px 82px}
.card{background:var(--card);border-radius:var(--r2);box-shadow:var(--sh);overflow:hidden}
.card+.card{margin-top:12px}
.cp{padding:16px}
.stitle{font-family:'Barlow Condensed',cursive;font-size:21px;font-weight:800;color:var(--ocean);letter-spacing:.4px;margin-bottom:12px;display:flex;align-items:center;gap:7px}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;padding:11px 20px;border-radius:12px;border:none;cursor:pointer;transition:all .18s;line-height:1}
.btn-p{background:linear-gradient(135deg,var(--teal),var(--ocean));color:#fff;box-shadow:0 4px 14px rgba(26,155,140,.32)}
.btn-p:hover{transform:translateY(-1px)}
.btn-sun{background:linear-gradient(135deg,var(--sun),var(--sun2));color:#fff;box-shadow:0 4px 14px rgba(245,166,35,.32)}
.btn-coral{background:linear-gradient(135deg,var(--coral),var(--coral2));color:#fff}
.btn-grass{background:linear-gradient(135deg,#27AE60,#2ECC71);color:#fff}
.btn-ghost{background:transparent;color:var(--ocean);border:2px solid var(--ocean)}
.btn-ghost:hover{background:var(--ocean);color:#fff}
.btn-ghost-red{background:transparent;color:var(--coral);border:2px solid var(--coral)}
.btn-purple{background:linear-gradient(135deg,var(--purple),#8E44AD);color:#fff}
.btn-sm{padding:7px 13px;font-size:12px;border-radius:10px}
.btn-xs{padding:5px 10px;font-size:11px;border-radius:8px}
.btn-blk{width:100%}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none!important}

.fg{margin-bottom:14px}
.flbl{font-size:11px;font-weight:800;color:var(--ocean);letter-spacing:.8px;text-transform:uppercase;margin-bottom:5px;display:block}
.finp{width:100%;padding:11px 14px;border:2px solid var(--sand2);border-radius:12px;font-family:'Nunito',sans-serif;font-size:14px;color:var(--text);background:#fff;transition:border-color .2s;outline:none}
.finp:focus{border-color:var(--teal)}
.fsel{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='%236B7280' viewBox='0 0 10 7'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center;padding-right:34px}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rgrp{display:flex;flex-wrap:wrap;gap:7px}
.rbtn{padding:8px 13px;border-radius:10px;border:2px solid var(--sand2);font-size:13px;font-weight:700;cursor:pointer;transition:all .18s;background:#fff;color:var(--muted)}
.rbtn.sel{border-color:var(--teal);background:rgba(26,155,140,.1);color:var(--teal)}

.tabs{display:flex;background:var(--sand2);border-radius:12px;padding:3px;margin-bottom:16px;gap:2px}
.tab{flex:1;padding:8px 4px;text-align:center;font-size:11px;font-weight:800;border-radius:9px;cursor:pointer;transition:all .18s;color:var(--muted);border:none;background:none}
.tab.active{background:#fff;color:var(--ocean);box-shadow:0 2px 8px rgba(0,0,0,.09)}

.overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.sheet{background:var(--sand);border-radius:26px 26px 0 0;width:100%;max-width:430px;max-height:94vh;overflow-y:auto;padding:20px;animation:slideUp .28s cubic-bezier(.34,1.56,.64,1)}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.sh-handle{width:36px;height:4px;background:var(--sand3);border-radius:2px;margin:0 auto 18px}
.sh-title{font-family:'Barlow Condensed',cursive;font-size:26px;font-weight:900;color:var(--ocean);margin-bottom:16px}

.trow{display:flex;align-items:center;justify-content:space-between;padding:7px 0}
.tgl{position:relative;width:44px;height:24px;flex-shrink:0}
.tgl input{display:none}
.tgl-sl{position:absolute;inset:0;background:var(--sand3);border-radius:24px;cursor:pointer;transition:.2s}
.tgl input:checked+.tgl-sl{background:var(--teal)}
.tgl-sl::after{content:'';position:absolute;left:3px;top:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 4px rgba(0,0,0,.2)}
.tgl input:checked+.tgl-sl::after{transform:translateX(20px)}

.div{height:1px;background:var(--sand2);margin:14px 0}
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0}

.stat-pill{background:#fff;border-radius:14px;padding:10px 12px;text-align:center;flex:1;min-width:66px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.spv{font-family:'Barlow Condensed',cursive;font-size:26px;font-weight:900;color:var(--ocean);line-height:1}
.spl{font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}

.pcard{background:var(--card);border-radius:var(--r2);box-shadow:var(--sh);overflow:hidden;cursor:pointer;transition:transform .18s,box-shadow .18s;margin-bottom:12px}
.pcard:hover{transform:translateY(-2px);box-shadow:var(--sh2)}
.pcard-hdr{padding:14px 16px 10px}
.pcard-title{font-weight:800;font-size:17px;margin:4px 0 3px}
.pcard-meta{font-size:12px;color:var(--muted);display:flex;gap:10px;flex-wrap:wrap}
.pcard-foot{padding:10px 16px;background:rgba(11,79,108,0.04);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}

.badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;white-space:nowrap}
.b-bt{background:rgba(26,155,140,.14);color:var(--teal)}
.b-fv{background:rgba(245,166,35,.14);color:var(--sun2)}
.b-camp{background:rgba(232,83,58,.14);color:var(--coral)}
.b-cas{background:rgba(46,204,113,.14);color:#27AE60}
.b-prog{background:rgba(155,89,182,.14);color:var(--purple)}
.b-open{background:rgba(125,211,232,.2);color:var(--ocean)}
.b-live{background:rgba(232,83,58,.14);color:var(--coral)}
.b-done{background:rgba(107,114,128,.12);color:var(--muted)}

.alert{border-radius:12px;padding:12px 14px;font-size:13px;font-weight:600;margin-bottom:12px}
.alert-info{background:rgba(125,211,232,.18);color:var(--ocean);border:1px solid rgba(125,211,232,.4)}
.alert-warn{background:rgba(245,166,35,.12);color:var(--sun2);border:1px solid rgba(245,166,35,.3)}
.alert-success{background:rgba(46,204,113,.12);color:#27AE60;border:1px solid rgba(46,204,113,.3)}

.rk-item{display:flex;align-items:center;gap:11px;padding:11px 16px;border-bottom:1px solid var(--sand2)}
.rk-item:last-child{border-bottom:none}
.rk-pos{font-family:'Barlow Condensed',cursive;font-size:22px;font-weight:900;color:var(--muted);width:26px;text-align:center;flex-shrink:0}
.rk-pos.gold{color:#F5A623}.rk-pos.silver{color:#9CA3AF}.rk-pos.bronze{color:#B45309}
.rk-name{font-weight:800;font-size:14px}
.rk-sub{font-size:11px;color:var(--muted);margin-top:1px}
.rk-pts{font-family:'Barlow Condensed',cursive;font-size:24px;font-weight:900;color:var(--teal);margin-left:auto;line-height:1}
.rk-pts-lbl{font-size:10px;color:var(--muted)}

.gcard{background:var(--card);border-radius:var(--r2);box-shadow:var(--sh);padding:16px;margin-bottom:12px;cursor:pointer;transition:transform .18s;display:flex;align-items:center;gap:13px}
.gcard:hover{transform:translateY(-2px)}
.gicon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}

.empty{text-align:center;padding:48px 20px;color:var(--muted)}
.empty-ico{font-size:48px;margin-bottom:12px}
.empty-t{font-family:'Barlow Condensed',cursive;font-size:22px;font-weight:800;color:var(--ocean);margin-bottom:4px}
.empty-s{font-size:13px}

.toast{position:fixed;top:76px;left:50%;transform:translateX(-50%);background:var(--ocean2);color:#fff;padding:10px 20px;border-radius:30px;font-size:13px;font-weight:700;z-index:500;animation:toastIn .3s cubic-bezier(.34,1.56,.64,1);box-shadow:0 4px 20px rgba(0,0,0,.28);white-space:nowrap;max-width:92%}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

.gbanner{position:fixed;top:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;z-index:600;pointer-events:none}
.gbanner-inner{margin:12px 16px;background:linear-gradient(135deg,var(--ocean),var(--teal));border-radius:18px;padding:14px 18px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.3);animation:bannerDrop .45s cubic-bezier(.34,1.56,.64,1)}
@keyframes bannerDrop{from{opacity:0;transform:translateY(-80px)}to{opacity:1;transform:translateY(0)}}
.gbanner-ico{font-size:32px;line-height:1;flex-shrink:0}
.gbanner-title{font-family:'Barlow Condensed',cursive;font-size:20px;font-weight:900;color:#fff;line-height:1}
.gbanner-sub{font-size:12px;color:rgba(255,255,255,.75);margin-top:2px}

.pwa-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:700;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s}
.pwa-card{background:#fff;border-radius:28px;padding:28px 24px;width:100%;max-width:380px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:popIn .4s cubic-bezier(.34,1.56,.64,1)}
@keyframes popIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
.pwa-icon{font-size:64px;margin-bottom:12px;line-height:1}
.pwa-title{font-family:'Barlow Condensed',cursive;font-size:30px;font-weight:900;color:var(--ocean);margin-bottom:8px}
.pwa-sub{font-size:14px;color:var(--muted);margin-bottom:20px;line-height:1.5}
.pwa-features{display:flex;flex-direction:column;gap:8px;margin-bottom:22px;text-align:left}
.pwa-feat{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:var(--text)}
.pwa-feat-ico{width:32px;height:32px;border-radius:10px;background:rgba(26,155,140,.12);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.pwa-ios-steps{background:var(--sand);border-radius:16px;padding:14px;text-align:left;margin-bottom:20px}
.pwa-ios-step{display:flex;align-items:flex-start;gap:10px;padding:6px 0;border-bottom:1px solid var(--sand2);font-size:13px}
.pwa-ios-step:last-child{border-bottom:none}
.pwa-ios-num{width:22px;height:22px;border-radius:50%;background:var(--ocean);color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.pwa-installed{background:linear-gradient(135deg,rgba(46,204,113,.1),rgba(26,155,140,.1));border-radius:16px;padding:16px;margin-bottom:16px}

.cad-screen{min-height:100vh;background:linear-gradient(160deg,var(--ocean2) 0%,var(--teal) 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
.cad-screen::before{content:'🎾';position:absolute;font-size:200px;opacity:.04;top:-40px;right:-40px;line-height:1}
.cad-screen::after{content:'⚽';position:absolute;font-size:150px;opacity:.04;bottom:-20px;left:-20px;line-height:1}
.cad-card{background:#fff;border-radius:28px;padding:28px 24px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.cad-logo{font-family:'Barlow Condensed',cursive;font-size:40px;font-weight:900;color:var(--ocean);text-align:center;margin-bottom:4px}
.cad-logo span{color:var(--teal)}
.cad-sub{font-size:13px;color:var(--muted);text-align:center;margin-bottom:24px}
.cad-step-dots{display:flex;gap:6px;justify-content:center;margin-bottom:20px}
.cad-dot{width:8px;height:8px;border-radius:50%;background:var(--sand2);transition:all .3s}
.cad-dot.active{background:var(--teal);width:24px;border-radius:4px}
.cad-dot.done{background:var(--grass)}
.cad-success{text-align:center;padding:10px 0}
.cad-success-ico{font-size:64px;margin-bottom:12px;animation:bounce .6s ease}
@keyframes bounce{0%{transform:scale(.5)}60%{transform:scale(1.15)}100%{transform:scale(1)}}

.prog-header{background:linear-gradient(135deg,var(--purple),#6C3483);padding:16px 20px 18px;color:#fff}
.prog-present-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.prog-player{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border-radius:12px;cursor:pointer;transition:all .18s;border:2px solid transparent}
.prog-player.present{background:rgba(26,155,140,.12);border-color:var(--teal)}
.prog-player.absent{opacity:.4}
.prog-player.resting{background:rgba(245,166,35,.12);border-color:var(--sun)}
.prog-player-name{font-size:10px;font-weight:700;color:var(--ocean);text-align:center}
.prog-player-status{font-size:9px;color:var(--muted);font-weight:600}
.prog-round{background:#fff;border-radius:16px;padding:14px;margin-bottom:10px;box-shadow:0 2px 10px rgba(0,0,0,.06);border-left:4px solid var(--teal)}
.prog-round.current{border-left-color:var(--sun);background:rgba(245,166,35,.04)}
.prog-round.done{border-left-color:var(--grass);opacity:.8}
.prog-round-title{font-family:'Barlow Condensed',cursive;font-size:17px;font-weight:900;color:var(--ocean);margin-bottom:8px}
.prog-matchup{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--sand2)}
.prog-matchup:last-child{border-bottom:none}
.prog-team{font-size:13px;font-weight:700;flex:1;text-align:center}
.prog-vs{font-family:'Barlow Condensed',cursive;font-size:16px;font-weight:900;color:var(--muted)}
.prog-result{font-family:'Barlow Condensed',cursive;font-size:18px;font-weight:900;color:var(--teal)}
.prog-bye{background:rgba(245,166,35,.08);border-radius:10px;padding:6px 12px;font-size:12px;color:var(--sun2);font-weight:700;text-align:center;margin-top:8px}
.prog-explain{font-size:11px;color:var(--muted);font-style:italic;margin-top:4px}
.matrix-cell{width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',cursive;font-size:14px;font-weight:900}

.fab-backdrop{position:fixed;inset:0;z-index:54}
.fab-menu{position:fixed;bottom:148px;right:calc(50% - 210px);display:flex;flex-direction:column;align-items:flex-end;gap:10px;z-index:56}
.fab-item{display:flex;align-items:center;gap:10px;animation:fabItemIn .2s cubic-bezier(.34,1.56,.64,1)}
@keyframes fabItemIn{from{opacity:0;transform:scale(.7) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
.fab-item-btn{background:#fff;border:none;border-radius:14px;padding:10px 16px;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;color:var(--ocean);cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.18);white-space:nowrap;display:flex;align-items:center;gap:8px}
.fab-item-btn:hover{background:var(--sand)}
.fab.open{transform:rotate(45deg)}
`;

/* ════════════════════════════════════════════════════════
   DADOS INICIAIS
════════════════════════════════════════════════════════ */
const ME = 1;
const USERS = [
  { id: 1, nome: "Bruno Custódio",  apelido: "Bruno",   genero: "M", categoria: "B", avatar: "BC", color: "#0B4F6C" },
  { id: 2, nome: "Ana Paula",       apelido: "Ana",     genero: "F", categoria: "A", avatar: "AP", color: "#E8533A" },
  { id: 3, nome: "Carlos Melo",     apelido: "Carlão",  genero: "M", categoria: "B", avatar: "CM", color: "#1A9B8C" },
  { id: 4, nome: "Fernanda Lima",   apelido: "Fer",     genero: "F", categoria: "B", avatar: "FL", color: "#F5A623" },
  { id: 5, nome: "Rafael Nunes",    apelido: "Rafa",    genero: "M", categoria: "C", avatar: "RN", color: "#3498DB" },
  { id: 6, nome: "Juliana Soares",  apelido: "Ju",      genero: "F", categoria: "C", avatar: "JS", color: "#2ECC71" },
  { id: 7, nome: "Diego Farias",    apelido: "Diegão",  genero: "M", categoria: "A", avatar: "DF", color: "#073B52" },
  { id: 8, nome: "Mariana Costa",   apelido: "Mari",    genero: "F", categoria: "A", avatar: "MC", color: "#9B59B6" },
];

const INIT_PLAYS = [
  {
    id: 1, nome: "Play da Galera · Sábado", esporte: "BT", tipo: "campeonato", tipo_jogo: "normal",
    status: "em_andamento", data: "2025-05-24", horario: "08:00", local: "Arena Beach Três Rios",
    endereco: "Av. Central, 450", vagas: 8, inscritos: [1, 2, 3, 4, 5, 6, 7, 8],
    tipo_dupla: "misto", misto_obrigatorio: true, categoria: false, formato: "pontos_corridos",
    quem_lanca: "admin",
    financeiro: { aluguel: 200, extras: 30, pix_chave: "bruno@advocacia.com.br", pix_nome: "Bruno Custódio", pix_tipo: "email" },
    admin_id: 1, privado: false,
    pagamentos: [
      { user_id: 1, status: "confirmado" }, { user_id: 2, status: "confirmado" },
      { user_id: 3, status: "pago" },       { user_id: 4, status: "pendente" },
      { user_id: 5, status: "pendente" },   { user_id: 6, status: "pendente" },
      { user_id: 7, status: "pago" },       { user_id: 8, status: "pendente" },
    ],
    duplas: [{ id: 1, j1: 1, j2: 2 }, { id: 2, j1: 3, j2: 4 }, { id: 3, j1: 5, j2: 6 }, { id: 4, j1: 7, j2: 8 }],
    partidas: [
      { id: 1, dupla_a: 1, dupla_b: 2, sets: [{ a: 6, b: 3 }, { a: 6, b: 4 }], status: "encerrada", vencedor: 1, log: [] },
      { id: 2, dupla_a: 3, dupla_b: 4, sets: [], status: "pendente", vencedor: null, log: [] },
    ],
    campeonato_ranking: [
      { user_id: 1, pts: 7, v: 2, d: 0, titulos: 0 },
      { user_id: 2, pts: 7, v: 2, d: 0, titulos: 0 },
      { user_id: 3, pts: 1, v: 0, d: 1, titulos: 0 },
    ],
  },
  {
    id: 2, nome: "Pelada Progressiva · Domingo", esporte: "FV", tipo: "casual", tipo_jogo: "progressivo",
    status: "em_andamento", data: "2025-05-25", horario: "09:00", local: "Quadra Municipal",
    endereco: "Rua das Flores, 100", vagas: 10, inscritos: [1, 2, 3, 4, 5, 6, 7, 8],
    tipo_dupla: "livre", misto_obrigatorio: false, categoria: false, formato: null,
    quem_lanca: "admin",
    financeiro: { aluguel: 160, extras: 0, pix_chave: "11999887766", pix_nome: "Carlos Melo", pix_tipo: "telefone" },
    admin_id: 1, privado: false,
    pagamentos: [
      { user_id: 1, status: "confirmado" }, { user_id: 2, status: "confirmado" },
      { user_id: 3, status: "confirmado" }, { user_id: 4, status: "confirmado" },
    ],
    presentes: [1, 2, 3, 4],
    rodadas: [
      {
        id: 1, d1: [1, 2], d2: [3, 4], result: { a: 18, b: 14 }, status: "done", bye_uid: null,
        duplas: [[1, 2], [3, 4]],
        matchups: [{ d1: [1, 2], d2: [3, 4], result: { a: 18, b: 14 }, status: "done", vencedor: "a" }],
        explicacao: ["Bruno & Ana — nunca jogaram juntos ✨", "Carlão & Fer — nunca jogaram juntos ✨"],
      },
    ],
    duplas: null, partidas: [], campeonato_ranking: [],
  },
];

const INIT_GROUPS = [
  {
    id: 1, nome: "Turma do Beach", esporte: "BT", icon: "🎾", color: "#1A9B8C",
    membros: [1, 2, 3, 4, 5, 6, 7, 8], admin_id: 1, privado: true, codigo: "BEACH2025",
    ranking: [
      { user_id: 1, pts: 42, v: 14, d: 3, titulos: 2 }, { user_id: 7, pts: 38, v: 12, d: 4, titulos: 1 },
      { user_id: 2, pts: 35, v: 11, d: 5, titulos: 1 }, { user_id: 8, pts: 28, v: 9,  d: 6, titulos: 0 },
      { user_id: 3, pts: 22, v: 7,  d: 8, titulos: 0 }, { user_id: 4, pts: 18, v: 5,  d: 9, titulos: 0 },
      { user_id: 5, pts: 12, v: 4,  d: 11, titulos: 0 },{ user_id: 6, pts: 8,  v: 2,  d: 13, titulos: 0 },
    ],
    plays_count: 12, temporada: 2025,
  },
];

/* ════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════ */
const getUser  = id => USERS.find(u => u.id === id);
const fmtMoney = v  => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
const fmtDate  = d  => new Date(d + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
const sportLbl = s  => s === "BT" ? "Beach Tennis" : "Futevôlei";
const sportEmo = s  => s === "BT" ? "🎾" : "⚽";
const calcPer  = (fin, n) => n > 0 ? ((fin.aluguel || 0) + (fin.extras || 0)) / n : 0;
const isIOSDevice = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function Av({ user, size = 40 }) {
  if (!user) return null;
  return (
    <div className="av" style={{ width: size, height: size, background: user.color, color: "#fff", fontSize: size * 0.34 }}>
      {user.avatar}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TOAST + BANNER
════════════════════════════════════════════════════════ */
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">{msg}</div>;
}

function GlobalBanner({ ico, title, sub, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="gbanner">
      <div className="gbanner-inner">
        <div className="gbanner-ico">{ico}</div>
        <div className="gbanner-text">
          <div className="gbanner-title">{title}</div>
          {sub && <div className="gbanner-sub">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODAL PWA
════════════════════════════════════════════════════════ */
function PWAModal({ onClose, onInstall, installed }) {
  const ios = isIOSDevice();
  const [step, setStep] = useState(installed ? "done" : "prompt");

  async function handleInstall() {
    const result = await onInstall();
    if (result === "ios") setStep("ios");
    else setStep("done");
  }

  return (
    <div className="pwa-modal" onClick={onClose}>
      <div className="pwa-card" onClick={e => e.stopPropagation()}>
        {step === "prompt" && (
          <>
            <div className="pwa-icon">🏖️</div>
            <div className="pwa-title">Instalar BeachPlay</div>
            <div className="pwa-sub">Adicione à sua tela inicial e acesse rapidinho, como um app nativo!</div>
            <div className="pwa-features">
              {[["📲", "Ícone na tela inicial"], ["⚡", "Abre em tela cheia"], ["🔔", "Notificações de partidas"], ["📶", "Funciona offline"]].map(([i, t]) => (
                <div key={t} className="pwa-feat"><div className="pwa-feat-ico">{i}</div><span>{t}</span></div>
              ))}
            </div>
            <button className="btn btn-p btn-blk" style={{ marginBottom: 10 }} onClick={handleInstall}>📲 Instalar agora</button>
            <button className="btn btn-ghost btn-blk" onClick={onClose}>Agora não</button>
          </>
        )}
        {step === "ios" && (
          <>
            <div className="pwa-icon">📱</div>
            <div className="pwa-title">Instalar no iPhone</div>
            <div className="pwa-sub">Siga os passos abaixo no Safari:</div>
            <div className="pwa-ios-steps">
              {[["1", "Toque em □↑ (Compartilhar) na barra inferior do Safari"], ["2", "Role a lista e toque em 'Adicionar à Tela de Início'"], ["3", "Confirme tocando 'Adicionar' no canto superior direito"]].map(([n, t]) => (
                <div key={n} className="pwa-ios-step"><div className="pwa-ios-num">{n}</div><span>{t}</span></div>
              ))}
            </div>
            <button className="btn btn-p btn-blk" onClick={() => { setStep("done"); playSound("success"); }}>✅ Já adicionei!</button>
          </>
        )}
        {step === "done" && (
          <>
            <div className="pwa-icon">🎉</div>
            <div className="pwa-title">Instalado!</div>
            <div className="pwa-installed">
              <div style={{ fontSize: 13, color: "var(--teal)", fontWeight: 700, textAlign: "center" }}>✅ BeachPlay está na sua tela inicial</div>
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 4 }}>Abra pelo ícone para tela cheia</div>
            </div>
            <button className="btn btn-p btn-blk" onClick={onClose}>Continuar jogando 🎾</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TELA DE CADASTRO
════════════════════════════════════════════════════════ */
function CadastroScreen({ onDone }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nome: "", apelido: "", telefone: "", cidade: "",
    genero: "", esporte: "BT", categoria: "", email: "", senha: "",
  });
  const [senhaErro, setSenhaErro] = useState("");
  const [showPWA, setShowPWA] = useState(false);
  const [banner, setBanner] = useState(null);
  const pwa = usePWA();
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const step1Ok = form.nome.trim().length >= 2;
  const step2Ok = form.genero && form.categoria;
  const step3Ok = form.email.includes("@") && form.senha.length >= 6;

  function avancar() {
    setSenhaErro("");
    if (step === 3) { finish(); return; }
    setStep(p => p + 1);
  }

  function finish() {
    setStep(4);
    playSound("success");
    setBanner({ ico: "🎉", title: `Bem-vindo, ${form.apelido || form.nome.split(" ")[0]}!`, sub: "Conta criada com sucesso · Bora jogar! 🎾" });
    requestNotificationPermission();
    setTimeout(() => { setShowPWA(true); playSound("notification"); }, 2000);
    setTimeout(() => onDone(form), 6000);
  }

  async function handlePWAInstall() { return await pwa.install(); }
  function handlePWAClose() { setShowPWA(false); onDone(form); }

  const CATS = [
    ["A", "A", "Profissional"],
    ["B", "B", "Avançado"],
    ["C", "C", "Intermediário"],
    ["D", "D", "Básico"],
    ["Iniciante", "🌱", "Iniciante"],
  ];

  const stepTitles = ["", "Quem é você?", "Seu esporte", "Acesso seguro"];
  const stepIcos   = ["", "👤", "🎾", "🔐"];

  return (
    <div className="cad-screen">
      {banner && <GlobalBanner {...banner} onDone={() => setBanner(null)} />}
      <div className="cad-card">
        <div className="cad-logo">Beach<span>Play</span></div>
        <div className="cad-sub">Beach Tennis &amp; Futevôlei</div>

        {step < 4 && (
          <>
            <div className="cad-step-dots" style={{ marginBottom: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className={`cad-dot ${step === i ? "active" : step > i ? "done" : ""}`} />
              ))}
            </div>
            <div style={{ textAlign: "center", marginBottom: 18, fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
              {stepIcos[step]} {stepTitles[step]} &nbsp;·&nbsp; Passo {step} de 3
            </div>
          </>
        )}

        {/* ── PASSO 1: Identificação ── */}
        {step === 1 && (
          <div>
            <div className="fg">
              <label className="flbl">Nome completo *</label>
              <input className="finp" placeholder="Ex: Carlos Melo" value={form.nome}
                onChange={e => s("nome", e.target.value)} autoFocus />
            </div>
            <div className="fg">
              <label className="flbl">Apelido na quadra</label>
              <input className="finp" placeholder="Como te chamam? Ex: Carlão"
                value={form.apelido} onChange={e => s("apelido", e.target.value)} />
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                Aparece no ranking e nos sorteios de duplas
              </div>
            </div>
            <div className="frow">
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="flbl">Telefone / WhatsApp</label>
                <input className="finp" type="tel" placeholder="(11) 99999-9999"
                  value={form.telefone} onChange={e => s("telefone", e.target.value)} />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="flbl">Cidade</label>
                <input className="finp" placeholder="Sua cidade"
                  value={form.cidade} onChange={e => s("cidade", e.target.value)} />
              </div>
            </div>
            <button className="btn btn-p btn-blk" style={{ marginTop: 20 }}
              disabled={!step1Ok} onClick={avancar}>
              Próximo →
            </button>
          </div>
        )}

        {/* ── PASSO 2: Esporte ── */}
        {step === 2 && (
          <div>
            <div className="fg">
              <label className="flbl">Gênero *</label>
              <div className="rgrp">
                {[["M", "♂ Masculino"], ["F", "♀ Feminino"], ["O", "⚧ Outro"]].map(([v, l]) => (
                  <button key={v} className={`rbtn ${form.genero === v ? "sel" : ""}`}
                    onClick={() => s("genero", v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="fg">
              <label className="flbl">Esporte preferido</label>
              <div className="rgrp">
                {[["BT", "🎾 Beach Tennis"], ["FV", "⚽ Futevôlei"], ["AMBOS", "🏅 Ambos"]].map(([v, l]) => (
                  <button key={v} className={`rbtn ${form.esporte === v ? "sel" : ""}`}
                    onClick={() => s("esporte", v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="fg">
              <label className="flbl">Categoria / Nível *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {CATS.map(([v, ico, desc]) => (
                  <button key={v} onClick={() => s("categoria", v)}
                    style={{
                      padding: "10px 12px", borderRadius: 12, border: `2px solid ${form.categoria === v ? "var(--teal)" : "var(--sand2)"}`,
                      background: form.categoria === v ? "rgba(26,155,140,.1)" : "#fff",
                      cursor: "pointer", textAlign: "left", transition: "all .18s",
                    }}>
                    <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 20, fontWeight: 900, color: form.categoria === v ? "var(--teal)" : "var(--ocean)" }}>{ico}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Voltar</button>
              <button className="btn btn-p" style={{ flex: 2 }} disabled={!step2Ok} onClick={avancar}>Próximo →</button>
            </div>
          </div>
        )}

        {/* ── PASSO 3: Acesso ── */}
        {step === 3 && (
          <div>
            <div className="fg">
              <label className="flbl">E-mail *</label>
              <input className="finp" type="email" placeholder="seu@email.com"
                value={form.email} onChange={e => s("email", e.target.value)} />
            </div>
            <div className="fg">
              <label className="flbl">Senha *</label>
              <input className="finp" type="password" placeholder="Mínimo 6 caracteres"
                value={form.senha} onChange={e => { s("senha", e.target.value); setSenhaErro(""); }} />
            </div>
            <div className="fg" style={{ marginBottom: 6 }}>
              <label className="flbl">Confirmar senha *</label>
              <input className="finp" type="password" placeholder="Repita a senha"
                onChange={e => setSenhaErro(e.target.value !== form.senha ? "As senhas não coincidem" : "")} />
            </div>
            {senhaErro && <div className="alert alert-warn" style={{ marginBottom: 12 }}>⚠️ {senhaErro}</div>}
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              🔔 Você receberá notificações de partidas e convites de grupos
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>← Voltar</button>
              <button className="btn btn-sun" style={{ flex: 2 }}
                disabled={!step3Ok || !!senhaErro} onClick={avancar}>🎉 Criar conta!</button>
            </div>
          </div>
        )}

        {/* ── PASSO 4: Sucesso ── */}
        {step === 4 && (
          <div className="cad-success">
            <div className="cad-success-ico">🏖️</div>
            <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 28, fontWeight: 900, color: "var(--ocean)" }}>
              Conta criada!
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6, marginBottom: 12 }}>
              Bem-vindo ao BeachPlay, <strong>{form.apelido || form.nome.split(" ")[0]}</strong>!
            </div>
            {form.cidade && (
              <div style={{ fontSize: 13, color: "var(--teal)", fontWeight: 700, marginBottom: 16 }}>
                📍 {form.cidade}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--teal)", animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Preparando seu perfil...</span>
            </div>
          </div>
        )}
      </div>
      {showPWA && <PWAModal onClose={handlePWAClose} onInstall={handlePWAInstall} installed={pwa.isInstalled} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   CRIAR PLAY
════════════════════════════════════════════════════════ */
function CreatePlayModal({ onClose, onCreate, groups = [] }) {
  const today = new Date().toISOString().split("T")[0];
  const myGroups = groups.filter(g => g.membros.includes(ME));
  const [f, setF] = useState({
    nome: "", esporte: "BT", tipo: "casual", tipo_jogo: "normal",
    data: today, horario: "08:00", local: "", vagas: 8,
    aluguel: 0, pix_chave: "", group_id: myGroups[0]?.id || "",
  });
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));

  function create() {
    const grp = myGroups.find(g => String(g.id) === String(f.group_id));
    const novo = {
      id: Date.now(),
      nome: f.nome || `Play ${sportLbl(f.esporte)} · ${fmtDate(f.data)}`,
      esporte: f.esporte, tipo: f.tipo, tipo_jogo: f.tipo_jogo,
      status: "aberto", data: f.data, horario: f.horario,
      local: f.local || "A definir", endereco: "", vagas: Number(f.vagas),
      inscritos: grp ? [...new Set([ME, ...grp.membros])] : [ME],
      tipo_dupla: "livre", misto_obrigatorio: false, categoria: false,
      formato: null, quem_lanca: "admin",
      financeiro: { aluguel: Number(f.aluguel), extras: 0, pix_chave: f.pix_chave, pix_nome: "", pix_tipo: "email" },
      admin_id: ME, privado: !!grp, group_id: grp?.id || null,
      pagamentos: [{ user_id: ME, status: "confirmado" }],
      presentes: f.tipo_jogo === "progressivo" ? [ME] : undefined,
      rodadas: f.tipo_jogo === "progressivo" ? [] : undefined,
      duplas: null, partidas: [], campeonato_ranking: [],
    };
    onCreate(novo);
    onClose();
  }

  const tipoDescricoes = {
    casual: "Jogo livre, sem tabela",
    campeonato: "Com tabela e ranking",
    progressivo: "Duplas sorteadas a cada rodada",
  };
  const tipoAtual = f.tipo_jogo === "progressivo" ? "progressivo" : f.tipo;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sh-handle" />
        <div className="sh-title">🎾 Novo Play</div>

        {/* Grupo vinculado */}
        {myGroups.length > 0 && (
          <div className="fg">
            <label className="flbl">Vincular a um grupo</label>
            <select className="finp fsel" value={f.group_id} onChange={e => s("group_id", e.target.value)}>
              <option value="">— Sem grupo (play aberto) —</option>
              {myGroups.map(g => (
                <option key={g.id} value={g.id}>{g.icon} {g.nome}</option>
              ))}
            </select>
            {f.group_id && (
              <div style={{ fontSize: 11, color: "var(--teal)", marginTop: 4, fontWeight: 600 }}>
                ✅ Todos os membros do grupo serão inscritos automaticamente
              </div>
            )}
          </div>
        )}

        <div className="fg">
          <label className="flbl">Nome do play</label>
          <input className="finp" placeholder="Ex: Play de Sábado — deixe em branco para gerar automaticamente"
            value={f.nome} onChange={e => s("nome", e.target.value)} />
        </div>

        <div className="fg">
          <label className="flbl">Esporte</label>
          <div className="rgrp">
            <button className={`rbtn ${f.esporte === "BT" ? "sel" : ""}`} onClick={() => s("esporte", "BT")}>🎾 Beach Tennis</button>
            <button className={`rbtn ${f.esporte === "FV" ? "sel" : ""}`} onClick={() => s("esporte", "FV")}>⚽ Futevôlei</button>
          </div>
        </div>

        <div className="fg">
          <label className="flbl">Tipo de play</label>
          <div className="rgrp">
            {[["casual", "🎮 Casual"], ["campeonato", "🏆 Campeonato"], ["progressivo", "🔄 Progressivo"]].map(([v, l]) => (
              <button key={v} className={`rbtn ${tipoAtual === v ? "sel" : ""}`}
                onClick={() => { s("tipo", v === "progressivo" ? "casual" : v); s("tipo_jogo", v === "progressivo" ? "progressivo" : "normal"); }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{tipoDescricoes[tipoAtual]}</div>
        </div>

        <div className="frow">
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="flbl">Data</label>
            <input className="finp" type="date" value={f.data} onChange={e => s("data", e.target.value)} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="flbl">Horário</label>
            <input className="finp" type="time" value={f.horario} onChange={e => s("horario", e.target.value)} />
          </div>
        </div>

        <div className="fg" style={{ marginTop: 14 }}>
          <label className="flbl">Local / Quadra</label>
          <input className="finp" placeholder="Ex: Arena Beach Central"
            value={f.local} onChange={e => s("local", e.target.value)} />
        </div>

        <div className="frow">
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="flbl">Vagas</label>
            <input className="finp" type="number" min={2} max={32} value={f.vagas}
              onChange={e => s("vagas", e.target.value)} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="flbl">Aluguel (R$)</label>
            <input className="finp" type="number" min={0} placeholder="0" value={f.aluguel}
              onChange={e => s("aluguel", e.target.value)} />
          </div>
        </div>

        {Number(f.aluguel) > 0 && (
          <div className="fg" style={{ marginTop: 14 }}>
            <label className="flbl">Chave Pix para cobrança</label>
            <input className="finp" placeholder="CPF, e-mail, telefone ou chave aleatória"
              value={f.pix_chave} onChange={e => s("pix_chave", e.target.value)} />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="btn btn-p" style={{ flex: 2 }} onClick={create}>✅ Criar Play</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   CRIAR GRUPO
════════════════════════════════════════════════════════ */
function CreateGroupModal({ onClose, onCreate }) {
  const [f, setF] = useState({ nome: "", esporte: "BT", icon: "🎾", privado: true });
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));
  const ICONS = ["🎾", "⚽", "🏅", "🌊", "🔥", "⚡", "🏆", "🎯"];

  function create() {
    const g = {
      id: Date.now(), nome: f.nome || "Novo Grupo", esporte: f.esporte, icon: f.icon,
      color: f.esporte === "BT" ? "#1A9B8C" : "#F5A623",
      membros: [ME], admin_id: ME, privado: f.privado,
      codigo: Math.random().toString(36).substr(2, 6).toUpperCase(),
      ranking: [{ user_id: ME, pts: 0, v: 0, d: 0, titulos: 0 }],
      plays_count: 0, temporada: 2025,
    };
    onCreate(g);
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sh-handle" />
        <div className="sh-title">👥 Criar Grupo</div>
        <div className="fg"><label className="flbl">Nome do grupo</label><input className="finp" placeholder="Ex: Turma do Beach" value={f.nome} onChange={e => s("nome", e.target.value)} /></div>
        <div className="fg"><label className="flbl">Esporte</label><div className="rgrp"><button className={`rbtn ${f.esporte === "BT" ? "sel" : ""}`} onClick={() => s("esporte", "BT")}>🎾 Beach Tennis</button><button className={`rbtn ${f.esporte === "FV" ? "sel" : ""}`} onClick={() => s("esporte", "FV")}>⚽ Futevôlei</button></div></div>
        <div className="fg"><label className="flbl">Ícone</label><div className="rgrp">{ICONS.map(i => <button key={i} className={`rbtn ${f.icon === i ? "sel" : ""}`} style={{ fontSize: 20, padding: "6px 10px" }} onClick={() => s("icon", i)}>{i}</button>)}</div></div>
        <div className="trow" style={{ marginBottom: 16 }}><span style={{ fontSize: 14, fontWeight: 700 }}>🔒 Grupo privado</span><label className="tgl"><input type="checkbox" checked={f.privado} onChange={e => s("privado", e.target.checked)} /><span className="tgl-sl" /></label></div>
        <button className="btn btn-p btn-blk" disabled={!f.nome} onClick={create}>✅ Criar Grupo</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   LANÇAR RESULTADO INLINE
════════════════════════════════════════════════════════ */
function LancarResultadoInline({ onSave, label = "pontos" }) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [open, setOpen] = useState(false);

  if (!open) return <button className="btn btn-p btn-sm btn-blk" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>⚡ Lançar resultado</button>;

  return (
    <div style={{ background: "var(--sand)", borderRadius: 12, padding: 12, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>DUPLA A</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <button style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(232,83,58,.1)", color: "var(--coral)", fontSize: 18, fontWeight: 900, cursor: "pointer" }} onClick={() => setA(x => Math.max(0, x - 1))}>−</button>
            <span style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 32, fontWeight: 900, color: "var(--ocean)", minWidth: 32, textAlign: "center" }}>{a}</span>
            <button style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(26,155,140,.1)", color: "var(--teal)", fontSize: 18, fontWeight: 900, cursor: "pointer" }} onClick={() => setA(x => x + 1)}>+</button>
          </div>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 18, fontWeight: 900, color: "var(--muted)" }}>×</div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>DUPLA B</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <button style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(232,83,58,.1)", color: "var(--coral)", fontSize: 18, fontWeight: 900, cursor: "pointer" }} onClick={() => setB(x => Math.max(0, x - 1))}>−</button>
            <span style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 32, fontWeight: 900, color: "var(--ocean)", minWidth: 32, textAlign: "center" }}>{b}</span>
            <button style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(26,155,140,.1)", color: "var(--teal)", fontSize: 18, fontWeight: 900, cursor: "pointer" }} onClick={() => setB(x => x + 1)}>+</button>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setOpen(false)}>Cancelar</button>
        <button className="btn btn-p btn-sm" style={{ flex: 2 }} disabled={a === b} onClick={() => { onSave(a, b); setOpen(false); }}>✅ Confirmar {a}×{b}</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TELA PELADA PROGRESSIVA
════════════════════════════════════════════════════════ */
function ProgressivePlayScreen({ play, onBack, onUpdate }) {
  const [lp, setLp] = useState(play);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("rodadas");
  const isAdmin = lp.admin_id === ME;

  function update(up) { setLp(up); onUpdate(up); }

  function togglePresente(uid) {
    if (!isAdmin) return;
    const np = lp.presentes.includes(uid) ? lp.presentes.filter(x => x !== uid) : [...lp.presentes, uid];
    update({ ...lp, presentes: np });
  }

  function sortearProxima() {
    const rodadasFeitas = lp.rodadas || [];
    const result = sortearProgressivo(lp.presentes, rodadasFeitas);
    if (!result) { setToast("⚠️ Mínimo 2 jogadores presentes"); return; }
    const { parceria } = buildPartnershipMatrix(rodadasFeitas);
    const explicacao = explainRound(result.duplas, parceria, result.bye_uid, getUser);
    const matchups = [];
    for (let i = 0; i < result.duplas.length - 1; i += 2) {
      const d1 = result.duplas[i], d2 = result.duplas[i + 1];
      if (d2) matchups.push({ d1, d2, result: null, status: "pending" });
    }
    const novaRodada = {
      id: (lp.rodadas?.length || 0) + 1,
      duplas: result.duplas, matchups, bye_uid: result.bye_uid,
      status: "current", explicacao,
    };
    update({ ...lp, rodadas: [...(lp.rodadas || []), novaRodada] });
    playSound("success");
    setToast(`🎲 Rodada ${novaRodada.id} sorteada!`);
  }

  function lancarResultadoMatchup(rodadaId, matchupIdx, scoreA, scoreB) {
    const venc = scoreA > scoreB ? "a" : "b";
    const newRodadas = lp.rodadas.map(r => {
      if (r.id !== rodadaId) return r;
      const nm = r.matchups.map((m, i) => i !== matchupIdx ? m : { ...m, result: { a: scoreA, b: scoreB }, status: "done", vencedor: venc });
      const allDone = nm.every(m => m.status === "done");
      return { ...r, matchups: nm, status: allDone ? "done" : "current" };
    });

    let crk = [...(lp.campeonato_ranking || [])];
    const rodada = lp.rodadas.find(r => r.id === rodadaId);
    const m = rodada?.matchups[matchupIdx];
    if (m) {
      const winD = venc === "a" ? m.d1 : m.d2;
      const loseD = venc === "a" ? m.d2 : m.d1;
      winD.forEach(uid => { const i = crk.findIndex(x => x.user_id === uid); if (i === -1) crk.push({ user_id: uid, pts: 3, v: 1, d: 0 }); else crk[i] = { ...crk[i], pts: crk[i].pts + 3, v: crk[i].v + 1 }; });
      loseD.forEach(uid => { const i = crk.findIndex(x => x.user_id === uid); if (i === -1) crk.push({ user_id: uid, pts: 1, v: 0, d: 1 }); else crk[i] = { ...crk[i], pts: crk[i].pts + 1, d: crk[i].d + 1 }; });
      crk.sort((a, b) => b.pts - a.pts);
    }
    update({ ...lp, rodadas: newRodadas, campeonato_ranking: crk });
    playSound("point");
    setToast("✅ Resultado salvo!");
  }

  const { parceria } = buildPartnershipMatrix(lp.rodadas || []);

  function MatrixCell({ uid_a, uid_b }) {
    if (uid_a === uid_b) return <div className="matrix-cell" style={{ background: "var(--sand2)", color: "var(--muted)" }}>—</div>;
    const v = parceria[uid_a]?.[uid_b] || 0;
    const bg = v === 0 ? "rgba(46,204,113,.15)" : v === 1 ? "rgba(245,166,35,.15)" : "rgba(232,83,58,.12)";
    const color = v === 0 ? "#27AE60" : v === 1 ? "var(--sun2)" : "var(--coral)";
    return <div className="matrix-cell" style={{ background: bg, color }}>{v}</div>;
  }

  return (
    <div>
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      <div className="prog-header">
        <button onClick={onBack} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 13px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>← Voltar</button>
        <div style={{ fontSize: 11, opacity: .65, letterSpacing: 2, textTransform: "uppercase" }}>⚽ Pelada Progressiva</div>
        <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 26, fontWeight: 900, marginTop: 3 }}>{lp.nome}</div>
        <div style={{ fontSize: 12, opacity: .7, marginTop: 2 }}>📅 {fmtDate(lp.data)} · 📍 {lp.local}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          {[["✅", lp.presentes?.length || 0, "Presentes"], ["🎲", (lp.rodadas || []).length, "Rodadas"], ["🏅", lp.campeonato_ranking?.length || 0, "Jogadores"]].map(([e, v, l]) => (
            <div key={l}><div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 24, fontWeight: 900, color: "#fff" }}>{e} {v}</div><div style={{ fontSize: 10, opacity: .6, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div></div>
          ))}
        </div>
      </div>

      <div className="main" style={{ paddingTop: 16 }}>
        <div className="tabs">
          {["presentes", "rodadas", "ranking", "matriz"].map(t => (
            <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "presentes" ? "👥 Presentes" : t === "rodadas" ? "🎲 Rodadas" : t === "ranking" ? "🏅 Rank" : "📊 Matriz"}
            </button>
          ))}
        </div>

        {tab === "presentes" && (
          <div>
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              {isAdmin ? "Toque nos jogadores para marcar presença" : "Aguarde o admin marcar as presenças"}
            </div>
            <div className="prog-present-grid">
              {lp.inscritos.map(uid => {
                const u = getUser(uid);
                const pres = lp.presentes?.includes(uid);
                return (
                  <div key={uid} className={`prog-player ${pres ? "present" : "absent"}`} onClick={() => togglePresente(uid)}>
                    <Av user={u} size={44} />
                    <div className="prog-player-name">{u?.apelido}</div>
                    <div className="prog-player-status">{pres ? "✅ Presente" : "⏳ Aguard."}</div>
                  </div>
                );
              })}
            </div>
            {isAdmin && (
              <button className="btn btn-purple btn-blk" style={{ marginTop: 8 }} onClick={sortearProxima} disabled={!lp.presentes || lp.presentes.length < 4}>
                🎲 Sortear Próxima Rodada ({lp.presentes?.length || 0} presentes)
              </button>
            )}
            <div className="alert alert-warn" style={{ marginTop: 12 }}>
              💡 A cada novo jogador que chegar, marque a presença e sorteie uma nova rodada. O algoritmo evita repetições de duplas e adversários.
            </div>
          </div>
        )}

        {tab === "rodadas" && (
          <div>
            {(!lp.rodadas || lp.rodadas.length === 0) ? (
              <div className="empty"><div className="empty-ico">🎲</div><div className="empty-t">Nenhuma rodada ainda</div><div className="empty-s">Marque as presenças e sorteie</div></div>
            ) : (
              [...lp.rodadas].reverse().map(rodada => (
                <div key={rodada.id} className={`prog-round ${rodada.status === "current" ? "current" : rodada.status === "done" ? "done" : ""}`}>
                  <div className="prog-round-title">
                    Rodada {rodada.id}
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginLeft: 8 }}>{rodada.status === "done" ? "✅ Concluída" : "🔴 Em andamento"}</span>
                  </div>
                  {rodada.matchups?.map((m, i) => {
                    const ua1 = getUser(m.d1[0]), ua2 = getUser(m.d1[1]);
                    const ub1 = getUser(m.d2[0]), ub2 = getUser(m.d2[1]);
                    return (
                      <div key={i}>
                        <div className="prog-matchup">
                          <div className="prog-team" style={{ color: m.result?.a > m.result?.b ? "var(--teal)" : undefined }}>{ua1?.apelido} & {ua2?.apelido}</div>
                          <div className="prog-vs">{m.result ? <span className="prog-result">{m.result.a}×{m.result.b}</span> : "VS"}</div>
                          <div className="prog-team" style={{ color: m.result?.b > m.result?.a ? "var(--teal)" : undefined }}>{ub1?.apelido} & {ub2?.apelido}</div>
                        </div>
                        {m.status === "pending" && isAdmin && <LancarResultadoInline onSave={(a, b) => lancarResultadoMatchup(rodada.id, i, a, b)} />}
                      </div>
                    );
                  })}
                  {rodada.bye_uid && <div className="prog-bye">⏸️ {getUser(rodada.bye_uid)?.apelido} descansa nessa rodada</div>}
                  {rodada.explicacao && <div style={{ marginTop: 8 }}>{rodada.explicacao.map((e, i) => <div key={i} className="prog-explain">• {e}</div>)}</div>}
                </div>
              ))
            )}
            {isAdmin && lp.presentes?.length >= 4 && (
              <button className="btn btn-purple btn-blk" style={{ marginTop: 8 }} onClick={sortearProxima}>🎲 Nova Rodada</button>
            )}
          </div>
        )}

        {tab === "ranking" && (
          <div>
            {!lp.campeonato_ranking?.length ? (
              <div className="empty"><div className="empty-ico">🏅</div><div className="empty-t">Sem resultados</div></div>
            ) : (
              <div className="card">
                {lp.campeonato_ranking.map((r, i) => {
                  const u = getUser(r.user_id);
                  return (
                    <div key={r.user_id} className="rk-item" style={{ background: r.user_id === ME ? "rgba(26,155,140,.05)" : "" }}>
                      <div className={`rk-pos ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
                      <Av user={u} size={38} />
                      <div style={{ flex: 1 }}><div className="rk-name">{u?.nome}</div><div className="rk-sub">{r.v || 0}V · {r.d || 0}D</div></div>
                      <div><div className="rk-pts">{r.pts}</div><div className="rk-pts-lbl">pts</div></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "matriz" && (
          <div>
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              🟢 0 = nunca jogaram juntos · 🟡 1 = 1 vez · 🔴 2+ = muitas vezes
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 4 }}>
                <thead>
                  <tr>
                    <th style={{ width: 48 }} />
                    {lp.presentes?.map(uid => { const u = getUser(uid); return <th key={uid} style={{ width: 32, textAlign: "center" }}><Av user={u} size={24} /></th>; })}
                  </tr>
                </thead>
                <tbody>
                  {lp.presentes?.map(uid_a => {
                    const ua = getUser(uid_a);
                    return (
                      <tr key={uid_a}>
                        <td style={{ paddingRight: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 4 }}><Av user={ua} size={22} /><span style={{ fontSize: 11, fontWeight: 700, color: "var(--ocean)" }}>{ua?.apelido}</span></div></td>
                        {lp.presentes?.map(uid_b => <td key={uid_b} style={{ textAlign: "center" }}><MatrixCell uid_a={uid_a} uid_b={uid_b} /></td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
              A matriz mostra quantas vezes cada par jogou <strong>junto</strong> (como dupla). O algoritmo prioriza os pares com menor número.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   HOME
════════════════════════════════════════════════════════ */
function Home({ plays, groups, onPlay, onGroup }) {
  const me = getUser(ME);
  const mine = plays.filter(p => p.inscritos.includes(ME));
  const myGroups = groups.filter(g => g.membros.includes(ME));

  function PCard({ p }) {
    const per = calcPer(p.financeiro, p.inscritos.length);
    const isProgressive = p.tipo_jogo === "progressivo";
    return (
      <div className="pcard" onClick={() => onPlay(p)}>
        <div className="pcard-hdr">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            <span className={`badge ${p.esporte === "BT" ? "b-bt" : "b-fv"}`}>{sportEmo(p.esporte)} {sportLbl(p.esporte)}</span>
            {isProgressive ? <span className="badge b-prog">🔄 Progressivo</span> : <span className={`badge ${p.tipo === "campeonato" ? "b-camp" : "b-cas"}`}>{p.tipo === "campeonato" ? "🏆 Campeonato" : "🎮 Casual"}</span>}
            <span className={`badge ${p.status === "em_andamento" ? "b-live" : "b-open"}`}>{p.status === "em_andamento" ? "🔴 Ao vivo" : "Aberto"}</span>
          </div>
          <div className="pcard-title">{p.nome}</div>
          <div className="pcard-meta"><span>📅 {fmtDate(p.data)} {p.horario}</span><span>📍 {p.local}</span><span>👥 {p.inscritos.length}/{p.vagas}</span></div>
        </div>
        <div className="pcard-foot">
          {isProgressive && <span style={{ fontSize: 12, color: "var(--purple)", fontWeight: 700 }}>✅ {p.presentes?.length || 0} presentes · {(p.rodadas || []).length} rodadas</span>}
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--teal)", marginLeft: "auto" }}>{fmtMoney(per)}/pessoa</span>
        </div>
      </div>
    );
  }

  return (
    <div className="main">
      <div style={{ background: "linear-gradient(135deg,var(--ocean2),var(--teal))", borderRadius: "var(--r2)", padding: 20, marginBottom: 16, color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "rgba(255,255,255,.05)", borderRadius: "50%" }} />
        <div style={{ fontSize: 12, opacity: .65, marginBottom: 3 }}>Olá, {me.apelido} 👋</div>
        <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 32, fontWeight: 900 }}>Bora jogar?</div>
        <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
          {[["🎾", mine.length, "Plays"], ["👥", myGroups.length, "Grupos"], ["🥇", 2, "Títulos"]].map(([e, v, l]) => (
            <div key={l}><div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 26, fontWeight: 900, color: "var(--sun)" }}>{e} {v}</div><div style={{ fontSize: 10, opacity: .6, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div></div>
          ))}
        </div>
      </div>
      <div className="stitle">📅 Meus Plays</div>
      {mine.map(p => <PCard key={p.id} p={p} />)}
      <div className="stitle">👥 Meus Grupos</div>
      {myGroups.map(g => (
        <div key={g.id} className="gcard" onClick={() => onGroup(g)}>
          <div className="gicon" style={{ background: g.color + "22" }}>{g.icon}</div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 15 }}>{g.nome}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sportEmo(g.esporte)} {g.membros.length} membros · {g.plays_count} plays</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 22, fontWeight: 900, color: g.color }}>{g.ranking.find(r => r.user_id === ME)?.pts ?? 0}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>pts</div></div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TELA GRUPOS
════════════════════════════════════════════════════════ */
function GruposScreen({ groups, onGroup, onCreateGroup }) {
  const myGroups = groups.filter(g => g.membros.includes(ME));
  return (
    <div className="main">
      <div className="stitle">👥 Meus Grupos</div>
      {myGroups.map(g => (
        <div key={g.id} className="gcard" onClick={() => onGroup(g)}>
          <div className="gicon" style={{ background: g.color + "22" }}>{g.icon}</div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 15 }}>{g.nome}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Código: <strong>{g.codigo}</strong> · {g.membros.length} membros</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 22, fontWeight: 900, color: g.color }}>{g.ranking.find(r => r.user_id === ME)?.pts ?? 0}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>pts</div></div>
        </div>
      ))}
      <button className="btn btn-p btn-blk" style={{ marginTop: 4 }} onClick={onCreateGroup}>+ Criar Grupo</button>
      <button className="btn btn-ghost btn-blk" style={{ marginTop: 10 }}>🔑 Entrar com código</button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   DETALHE DO GRUPO
════════════════════════════════════════════════════════ */
function GroupDetail({ group, onBack }) {
  return (
    <div>
      <div style={{ background: `linear-gradient(135deg,${group.color}dd,${group.color})`, padding: "14px 20px 18px", color: "#fff" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 13px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>← Voltar</button>
        <div style={{ fontSize: 40, marginBottom: 6 }}>{group.icon}</div>
        <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 28, fontWeight: 900 }}>{group.nome}</div>
        <div style={{ fontSize: 12, opacity: .8, marginTop: 3 }}>{sportEmo(group.esporte)} {sportLbl(group.esporte)} · {group.membros.length} membros · Cód: {group.codigo}</div>
      </div>
      <div className="main" style={{ paddingTop: 16 }}>
        <div className="card">
          {group.ranking.map((r, i) => {
            const u = getUser(r.user_id);
            return (
              <div key={r.user_id} className="rk-item" style={{ background: r.user_id === ME ? "rgba(26,155,140,.05)" : "" }}>
                <div className={`rk-pos ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
                <Av user={u} size={38} />
                <div style={{ flex: 1 }}><div className="rk-name">{u?.nome} {r.user_id === ME && <span style={{ fontSize: 10, color: "var(--teal)" }}>você</span>}</div><div className="rk-sub">{r.v}V · {r.d}D {r.titulos > 0 && `· 🏆${r.titulos}`}</div></div>
                <div><div className="rk-pts">{r.pts}</div><div className="rk-pts-lbl">pts</div></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   DETALHE DO PLAY (não-progressivo)
════════════════════════════════════════════════════════ */
/* calcula ranking a partir das partidas encerradas */
function calcRankingCamp(duplas, partidas) {
  const rk = {};
  const get = uid => { if (!rk[uid]) rk[uid] = { user_id: uid, pts: 0, v: 0, d: 0, sg: 0 }; return rk[uid]; };
  (partidas || []).filter(p => p.status === "encerrada").forEach(p => {
    const da = (duplas || []).find(d => d.id === p.dupla_a);
    const db = (duplas || []).find(d => d.id === p.dupla_b);
    if (!da || !db) return;
    const winA = p.vencedor === p.dupla_a;
    const sA = (p.sets || []).filter(s => s.a > s.b).length;
    const sB = (p.sets || []).filter(s => s.b > s.a).length;
    [da.j1, da.j2].filter(Boolean).forEach(uid => {
      const r = get(uid);
      if (winA) { r.pts += 3; r.v += 1; r.sg += sA - sB; } else { r.d += 1; r.sg += sA - sB; }
    });
    [db.j1, db.j2].filter(Boolean).forEach(uid => {
      const r = get(uid);
      if (!winA) { r.pts += 3; r.v += 1; r.sg += sB - sA; } else { r.d += 1; r.sg += sB - sA; }
    });
  });
  return Object.values(rk).sort((a, b) => b.pts - a.pts || b.v - a.v || b.sg - a.sg);
}

function PlayDetailScreen({ play, onBack, onUpdate }) {
  const [lp, setLp] = useState(play);
  const [tab, setTab] = useState("info");
  const [toast, setToast] = useState(null);
  const isAdmin = lp.admin_id === ME;
  const isCamp = lp.tipo === "campeonato";

  function update(up) { setLp(up); onUpdate?.(up); }

  /* ── Formar duplas automaticamente ── */
  function gerarDuplas() {
    const shuffled = [...lp.inscritos].sort(() => Math.random() - 0.5);
    const duplas = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      duplas.push({ id: i / 2 + 1, j1: shuffled[i], j2: shuffled[i + 1] });
    }
    if (shuffled.length % 2 !== 0) {
      duplas.push({ id: duplas.length + 1, j1: shuffled[shuffled.length - 1], j2: null });
    }
    update({ ...lp, duplas, status: "em_andamento" });
    playSound("success");
    setToast("👥 Duplas formadas!");
    setTab("duplas");
  }

  /* ── Gerar tabela de partidas (todos contra todos) ── */
  function gerarPartidas() {
    const d = lp.duplas.filter(d => d.j2 !== null);
    const partidas = [];
    for (let i = 0; i < d.length; i++) {
      for (let j = i + 1; j < d.length; j++) {
        partidas.push({ id: partidas.length + 1, dupla_a: d[i].id, dupla_b: d[j].id, sets: [], status: "pendente", vencedor: null, log: [] });
      }
    }
    update({ ...lp, partidas, status: "em_andamento" });
    playSound("success");
    setToast(`⚡ ${partidas.length} partidas geradas!`);
    setTab("partidas");
  }

  /* ── Lançar resultado ── */
  function lancarResultado(partidaId, scoreA, scoreB) {
    const sets = scoreA > scoreB
      ? Array(scoreA).fill({ a: 6, b: 4 }).concat(Array(scoreB).fill({ a: 3, b: 6 }))
      : Array(scoreB).fill({ a: 4, b: 6 }).concat(Array(scoreA).fill({ a: 6, b: 3 }));
    const partida = lp.partidas.find(p => p.id === partidaId);
    const vencedor = scoreA > scoreB ? partida.dupla_a : partida.dupla_b;
    const newPartidas = lp.partidas.map(p =>
      p.id !== partidaId ? p : { ...p, sets, status: "encerrada", vencedor }
    );
    const newRanking = calcRankingCamp(lp.duplas, newPartidas);
    const allDone = newPartidas.every(p => p.status === "encerrada");
    update({ ...lp, partidas: newPartidas, campeonato_ranking: newRanking, status: allDone ? "encerrado" : "em_andamento" });
    playSound("point");
    setToast("✅ Resultado salvo!");
  }

  const per = calcPer(lp.financeiro, lp.inscritos.length);
  const temDuplas = lp.duplas && lp.duplas.length > 0;
  const temPartidas = lp.partidas && lp.partidas.length > 0;
  const ranking = calcRankingCamp(lp.duplas, lp.partidas);

  /* helper: nome de uma dupla */
  const nomeDupla = d => {
    if (!d) return "—";
    const a = getUser(d.j1)?.apelido || "?";
    const b = d.j2 ? getUser(d.j2)?.apelido || "?" : "BYE";
    return `${a} & ${b}`;
  };

  const tabsDisponiveis = [
    { id: "info", lbl: "📋 Info" },
    { id: "duplas", lbl: "👥 Duplas" },
    ...(isCamp ? [{ id: "partidas", lbl: "⚡ Partidas" }, { id: "ranking", lbl: "🏅 Ranking" }] : []),
  ];

  return (
    <div>
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,var(--ocean2),var(--teal))", padding: "14px 20px 0", color: "#fff" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,.18)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 13px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>← Voltar</button>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
          <span className={`badge ${lp.esporte === "BT" ? "b-bt" : "b-fv"}`}>{sportEmo(lp.esporte)} {sportLbl(lp.esporte)}</span>
          <span className={`badge ${lp.tipo === "campeonato" ? "b-camp" : "b-cas"}`}>{lp.tipo === "campeonato" ? "🏆 Campeonato" : "🎮 Casual"}</span>
          <span className={`badge ${lp.status === "em_andamento" ? "b-live" : lp.status === "encerrado" ? "b-done" : "b-open"}`}>
            {lp.status === "em_andamento" ? "🔴 Ao vivo" : lp.status === "encerrado" ? "✅ Encerrado" : "Aberto"}
          </span>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 26, fontWeight: 900 }}>{lp.nome}</div>
        <div style={{ fontSize: 12, opacity: .7, marginTop: 2, marginBottom: 14 }}>
          📅 {fmtDate(lp.data)} às {lp.horario} &nbsp;·&nbsp; 📍 {lp.local} &nbsp;·&nbsp; 👥 {lp.inscritos.length}/{lp.vagas}
        </div>
        <div className="tabs" style={{ margin: "0 -0px 0" }}>
          {tabsDisponiveis.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.lbl}</button>
          ))}
        </div>
      </div>

      <div className="main" style={{ paddingTop: 16 }}>

        {/* ── INFO ── */}
        {tab === "info" && (
          <>
            {/* CTA para admin iniciar */}
            {isAdmin && lp.status === "aberto" && (
              <div className="alert alert-warn" style={{ marginBottom: 12 }}>
                ⚠️ Play ainda não iniciado. Vá para a aba <strong>Duplas</strong> para formar os times e iniciar.
              </div>
            )}

            {/* Financeiro */}
            <div className="card cp" style={{ marginBottom: 12 }}>
              <div className="stitle" style={{ fontSize: 16, marginBottom: 10 }}>💰 Financeiro</div>
              <div style={{ background: "rgba(11,79,108,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                  <span>Aluguel</span><span>{fmtMoney(lp.financeiro.aluguel)}</span>
                </div>
                {lp.financeiro.extras > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                    <span>Extras</span><span>{fmtMoney(lp.financeiro.extras)}</span>
                  </div>
                )}
                <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 36, fontWeight: 900, color: "var(--teal)", textAlign: "center", marginTop: 8 }}>{fmtMoney(per)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>por pessoa · {lp.inscritos.length} participantes</div>
              </div>
            </div>

            {/* Participantes */}
            <div className="card cp" style={{ marginBottom: 12 }}>
              <div className="stitle" style={{ fontSize: 16, marginBottom: 10 }}>👥 Participantes</div>
              {lp.inscritos.map(uid => {
                const u = getUser(uid);
                const pag = lp.pagamentos?.find(p => p.user_id === uid);
                const statusColor = pag?.status === "confirmado" || pag?.status === "pago" ? { bg: "rgba(46,204,113,.15)", color: "#27AE60" } : { bg: "rgba(245,166,35,.15)", color: "var(--sun2)" };
                return (
                  <div key={uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--sand2)" }}>
                    <Av user={u} size={34} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{u?.nome}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Cat. {u?.categoria}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: statusColor.bg, color: statusColor.color }}>
                      {pag?.status === "confirmado" ? "✓ Confirmado" : pag?.status === "pago" ? "✓ Pago" : "⏳ Pendente"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pix */}
            {lp.financeiro.pix_chave && (
              <div className="card cp">
                <div className="stitle" style={{ fontSize: 16, marginBottom: 10 }}>⚡ Pix</div>
                <div style={{ background: "linear-gradient(135deg,rgba(26,155,140,.08),rgba(11,79,108,.06))", border: "2px dashed var(--teal)", borderRadius: 16, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Chave Pix ({lp.financeiro.pix_tipo})</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ocean)", background: "#fff", padding: "8px 14px", borderRadius: 10, wordBreak: "break-all" }}>{lp.financeiro.pix_chave}</div>
                  {lp.financeiro.pix_nome && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>{lp.financeiro.pix_nome}</div>}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── DUPLAS ── */}
        {tab === "duplas" && (
          <>
            {!temDuplas ? (
              <div>
                <div className="empty">
                  <div className="empty-ico">👥</div>
                  <div className="empty-t">Duplas não formadas</div>
                  <div className="empty-s">Sorteie ou forme as duplas para iniciar o campeonato</div>
                </div>
                {isAdmin && (
                  <button className="btn btn-p btn-blk" style={{ marginTop: 8 }} onClick={gerarDuplas}>
                    🎲 Sortear duplas aleatoriamente
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="alert alert-success" style={{ marginBottom: 12 }}>
                  ✅ {lp.duplas.length} duplas formadas · {lp.inscritos.length} jogadores
                </div>
                {lp.duplas.map((d, i) => {
                  const ua = getUser(d.j1), ub = d.j2 ? getUser(d.j2) : null;
                  return (
                    <div key={d.id} className="card" style={{ marginBottom: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 26, fontWeight: 900, color: "var(--ocean)", width: 30 }}>#{i + 1}</div>
                      <Av user={ua} size={38} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{ua?.apelido || ua?.nome}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Cat. {ua?.categoria}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)" }}>&</div>
                      {ub ? (
                        <>
                          <Av user={ub} size={38} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: 14 }}>{ub?.apelido || ub?.nome}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>Cat. {ub?.categoria}</div>
                          </div>
                        </>
                      ) : (
                        <div style={{ flex: 1, fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>Sem par (BYE)</div>
                      )}
                    </div>
                  );
                })}
                {isAdmin && !temPartidas && (
                  <button className="btn btn-sun btn-blk" style={{ marginTop: 8 }} onClick={gerarPartidas}>
                    ⚡ Gerar tabela de partidas
                  </button>
                )}
                {isAdmin && (
                  <button className="btn btn-ghost btn-blk" style={{ marginTop: 10 }} onClick={gerarDuplas}>
                    🔄 Resortear duplas
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* ── PARTIDAS ── */}
        {tab === "partidas" && (
          <>
            {!temPartidas ? (
              <div>
                <div className="empty">
                  <div className="empty-ico">⚡</div>
                  <div className="empty-t">Nenhuma partida ainda</div>
                  <div className="empty-s">{temDuplas ? "Gere a tabela na aba Duplas" : "Forme as duplas primeiro"}</div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  {[["⏳", "pendente"], ["🔴", "em_andamento"], ["✅", "encerrada"]].map(([e, s]) => {
                    const n = lp.partidas.filter(p => p.status === s).length;
                    return n > 0 ? <span key={s} className="badge b-open">{e} {n} {s === "pendente" ? "pendentes" : s === "em_andamento" ? "em jogo" : "encerradas"}</span> : null;
                  })}
                </div>
                {lp.partidas.map(p => {
                  const da = lp.duplas.find(d => d.id === p.dupla_a);
                  const db = lp.duplas.find(d => d.id === p.dupla_b);
                  const encerrada = p.status === "encerrada";
                  const sA = (p.sets || []).filter(s => s.a > s.b).length;
                  const sB = (p.sets || []).filter(s => s.b > s.a).length;
                  return (
                    <div key={p.id} className="card" style={{ marginBottom: 10, padding: "12px 16px", borderLeft: `4px solid ${encerrada ? "var(--grass)" : "var(--sand3)"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: encerrada || !isAdmin ? 0 : 8 }}>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: encerrada && p.vencedor === p.dupla_a ? "var(--teal)" : "var(--text)" }}>{nomeDupla(da)}</div>
                        </div>
                        <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 22, fontWeight: 900, color: encerrada ? "var(--teal)" : "var(--muted)", minWidth: 52, textAlign: "center" }}>
                          {encerrada ? `${sA}×${sB}` : "VS"}
                        </div>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: encerrada && p.vencedor === p.dupla_b ? "var(--teal)" : "var(--text)" }}>{nomeDupla(db)}</div>
                        </div>
                      </div>
                      {!encerrada && isAdmin && (
                        <LancarResultadoInline onSave={(a, b) => lancarResultado(p.id, a, b)} label="sets vencidos" />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ── RANKING ── */}
        {tab === "ranking" && (
          <>
            {ranking.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">🏅</div>
                <div className="empty-t">Ranking vazio</div>
                <div className="empty-s">Lance resultados de partidas para ver o ranking</div>
              </div>
            ) : (
              <div className="card">
                {ranking.map((r, i) => {
                  const u = getUser(r.user_id);
                  return (
                    <div key={r.user_id} className="rk-item" style={{ background: r.user_id === ME ? "rgba(26,155,140,.05)" : "" }}>
                      <div className={`rk-pos ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </div>
                      <Av user={u} size={38} />
                      <div style={{ flex: 1 }}>
                        <div className="rk-name">{u?.apelido || u?.nome}</div>
                        <div className="rk-sub">{r.v}V · {r.d}D · SG {r.sg > 0 ? "+" : ""}{r.sg}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="rk-pts">{r.pts}</div>
                        <div className="rk-pts-lbl">pts</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   APP RAIZ
════════════════════════════════════════════════════════ */
export default function App() {
  const [cadastroDone, setCadastroDone] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState("home");
  const [nav, setNav] = useState("home");
  const [plays, setPlays] = useState(INIT_PLAYS);
  const [groups, setGroups] = useState(INIT_GROUPS);
  const [selPlay, setSelPlay] = useState(null);
  const [selGroup, setSelGroup] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreatePlay, setShowCreatePlay] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [banner, setBanner] = useState(null);
  const [toast, setToast] = useState(null);
  const [showPWA, setShowPWA] = useState(false);
  const pwa = usePWA();

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  function go(n) { setNav(n); setScreen(n); setSelPlay(null); setSelGroup(null); }
  function openPlay(p) { setSelPlay(p); setScreen(p.tipo_jogo === "progressivo" ? "progressive" : "play"); }
  function openGroup(g) { setSelGroup(g); setScreen("group"); }
  function updatePlay(up) { setPlays(prev => prev.map(p => p.id === up.id ? up : p)); setSelPlay(up); }

  function handleCreatePlay(p) {
    setPlays(prev => [...prev, p]);
    playSound("success");
    setBanner({ ico: "🎾", title: `Play "${p.nome}" criado!`, sub: `${fmtDate(p.data)} às ${p.horario} · ${p.local}` });
    setToast(`✅ Play criado com sucesso!`);
  }

  function handleCreateGroup(g) {
    setGroups(prev => [...prev, g]);
    playSound("group_created");
    setBanner({ ico: "👥", title: `Grupo "${g.nome}" criado!`, sub: `Código de convite: ${g.codigo} · Compartilhe com os jogadores` });
    sendNotification("Grupo criado! 🎾", `O grupo "${g.nome}" foi criado com sucesso. Código: ${g.codigo}`, "👥");
    setToast(`🎉 Grupo criado! Código: ${g.codigo}`);
  }

  const NAV = [
    { id: "home", ico: "🏠", lbl: "Início" }, { id: "plays", ico: "🎾", lbl: "Plays" },
    { id: "grupos", ico: "👥", lbl: "Grupos" }, { id: "ranking", ico: "🏅", lbl: "Ranking" },
    { id: "perfil", ico: "👤", lbl: "Perfil" },
  ];
  const showHdr = !["play", "progressive", "group"].includes(screen);

  function handleLogout() {
    setCadastroDone(false);
    setCurrentUser(null);
    setScreen("home");
    setNav("home");
    setSelPlay(null);
    setSelGroup(null);
  }

  if (!cadastroDone) return (
    <div className="app">
      <CadastroScreen onDone={(userData) => {
        setCadastroDone(true);
        setCurrentUser(userData);
        setBanner({ ico: "🏖️", title: `Bem-vindo, ${userData.apelido || userData.nome.split(" ")[0]}!`, sub: "Sua conta foi criada. Bora jogar!" });
        playSound("success");
      }} />
    </div>
  );

  return (
    <div className="app">
      {banner && <GlobalBanner {...banner} onDone={() => setBanner(null)} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {showHdr && (
        <div className="hdr">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div><div className="logo">Beach<span>Play</span></div><div className="logo-sub">Beach Tennis & Futevôlei</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {pwa.canInstall && !pwa.isInstalled && (
                <button className="btn btn-sun btn-sm" onClick={() => setShowPWA(true)} style={{ fontSize: 11, padding: "6px 10px" }}>📲 Instalar</button>
              )}
              <div className="av-btn">BC</div>
            </div>
          </div>
        </div>
      )}

      {screen === "home" && <Home plays={plays} groups={groups} onPlay={openPlay} onGroup={openGroup} />}

      {screen === "plays" && (
        <div className="main">
          <div className="stitle">🎾 Todos os Plays</div>
          {plays.map(p => {
            const per = calcPer(p.financeiro, p.inscritos.length);
            const isProg = p.tipo_jogo === "progressivo";
            return (
              <div key={p.id} className="pcard" onClick={() => openPlay(p)}>
                <div className="pcard-hdr">
                  <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                    <span className={`badge ${p.esporte === "BT" ? "b-bt" : "b-fv"}`}>{sportEmo(p.esporte)}</span>
                    {isProg ? <span className="badge b-prog">🔄 Progressivo</span> : <span className={`badge ${p.tipo === "campeonato" ? "b-camp" : "b-cas"}`}>{p.tipo === "campeonato" ? "🏆" : "🎮"}</span>}
                    <span className={`badge ${p.status === "em_andamento" ? "b-live" : "b-open"}`}>{p.status === "em_andamento" ? "🔴 Ao vivo" : "Aberto"}</span>
                  </div>
                  <div className="pcard-title">{p.nome}</div>
                  <div className="pcard-meta"><span>📅 {fmtDate(p.data)}</span><span>📍 {p.local}</span><span>👥 {p.inscritos.length}/{p.vagas}</span></div>
                </div>
                <div className="pcard-foot"><span style={{ fontSize: 13, fontWeight: 800, color: "var(--teal)" }}>{fmtMoney(per)}/pessoa</span></div>
              </div>
            );
          })}
        </div>
      )}

      {screen === "grupos" && <GruposScreen groups={groups} onGroup={openGroup} onCreateGroup={() => setShowCreateGroup(true)} />}

      {screen === "ranking" && (
        <div className="main">
          <div className="stitle">🏅 Ranking Geral</div>
          <div className="card">
            {[{ user_id: 7, pts: 68, v: 22, d: 6, titulos: 2 }, { user_id: 1, pts: 60, v: 20, d: 9, titulos: 2 }, { user_id: 2, pts: 55, v: 18, d: 9, titulos: 1 }, { user_id: 8, pts: 42, v: 14, d: 12, titulos: 0 }, { user_id: 3, pts: 38, v: 12, d: 13, titulos: 1 }].map((r, i) => {
              const u = getUser(r.user_id);
              return (
                <div key={r.user_id} className="rk-item" style={{ background: r.user_id === ME ? "rgba(26,155,140,.05)" : "" }}>
                  <div className={`rk-pos ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
                  <Av user={u} size={40} />
                  <div style={{ flex: 1 }}><div className="rk-name">{u?.nome}</div><div className="rk-sub">{r.v}V · {r.d}D {r.titulos > 0 && `· 🏆${r.titulos}`}</div></div>
                  <div><div className="rk-pts">{r.pts}</div><div className="rk-pts-lbl">pts</div></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {screen === "perfil" && (
        <div className="main">
          {/* Card do usuário */}
          <div className="card cp" style={{ textAlign: "center", marginBottom: 12 }}>
            {(() => {
              const u = currentUser;
              const initials = u ? (u.apelido || u.nome || "?").slice(0, 2).toUpperCase() : "BC";
              const nome = u?.nome || "Bruno Custódio";
              const apelido = u?.apelido || "";
              const cat = u?.categoria || "B";
              const cidade = u?.cidade || "";
              const esporte = u?.esporte || "BT";
              return (
                <>
                  <div style={{ width: 70, height: 70, borderRadius: "50%", background: "var(--ocean)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, margin: "0 auto 12px" }}>{initials}</div>
                  <div style={{ fontFamily: "'Barlow Condensed',cursive", fontSize: 26, fontWeight: 900 }}>{nome}</div>
                  {apelido && <div style={{ color: "var(--teal)", fontSize: 13, fontWeight: 700 }}>"{apelido}"</div>}
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <span>Cat. {cat}</span>
                    <span>{sportEmo(esporte)} {sportLbl(esporte)}</span>
                    {cidade && <span>📍 {cidade}</span>}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Estatísticas */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[["60", "Pts"], ["20", "Vitórias"], ["2", "Títulos"], ["69%", "Aprov."]].map(([v, l]) => (
              <div key={l} className="stat-pill"><div className="spv">{v}</div><div className="spl">{l}</div></div>
            ))}
          </div>

          {/* PWA */}
          {pwa.canInstall && !pwa.isInstalled && (
            <button className="btn btn-sun btn-blk" style={{ marginBottom: 12 }} onClick={() => setShowPWA(true)}>
              📲 Instalar app na tela inicial
            </button>
          )}
          {pwa.isInstalled && <div className="alert alert-success" style={{ marginBottom: 12 }}>✅ BeachPlay instalado na tela inicial!</div>}

          {/* Sair */}
          <div style={{ height: 1, background: "var(--sand2)", margin: "8px 0 16px" }} />
          <button className="btn btn-ghost-red btn-blk" onClick={() => {
            if (window.confirm("Tem certeza que deseja sair?")) handleLogout();
          }}>
            🚪 Sair do app
          </button>
        </div>
      )}

      {screen === "play" && selPlay && <PlayDetailScreen play={selPlay} onBack={() => go(nav)} onUpdate={updatePlay} />}
      {screen === "progressive" && selPlay && <ProgressivePlayScreen play={selPlay} onBack={() => go(nav)} onUpdate={updatePlay} />}
      {screen === "group" && selGroup && <GroupDetail group={selGroup} onBack={() => go("grupos")} />}

      {showHdr && (
        <>
          {fabOpen && <div className="fab-backdrop" onClick={() => setFabOpen(false)} />}
          {fabOpen && (
            <div className="fab-menu">
              <div className="fab-item" style={{ animationDelay: "0.05s" }}>
                <div className="fab-item-btn" onClick={() => { setFabOpen(false); setShowCreateGroup(true); }}>
                  👥 Criar Grupo
                </div>
              </div>
              <div className="fab-item" style={{ animationDelay: "0s" }}>
                <div className="fab-item-btn" onClick={() => { setFabOpen(false); setShowCreatePlay(true); }}>
                  🎾 Criar Play
                </div>
              </div>
            </div>
          )}
          <button className={`fab ${fabOpen ? "open" : ""}`} onClick={() => setFabOpen(o => !o)}>+</button>
        </>
      )}

      <div className="bnav">
        {NAV.map(n => (
          <button key={n.id} className={`nbtn ${nav === n.id ? "active" : ""}`} onClick={() => go(n.id)}>
            <span className="nico">{n.ico}</span>{n.lbl}
          </button>
        ))}
      </div>

      {showCreatePlay && <CreatePlayModal onClose={() => setShowCreatePlay(false)} onCreate={handleCreatePlay} groups={groups} />}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreate={handleCreateGroup} />}
      {showPWA && <PWAModal onClose={() => setShowPWA(false)} onInstall={() => pwa.install()} installed={pwa.isInstalled} />}
    </div>
  );
}
