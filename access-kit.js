/* «فذ للجميع»: محرّك مشترك لألعاب الأطفال من ذوي صعوبات الحركة والنطق.
   المبادئ: لا حاجة للكلام أبداً • أهداف كبيرة • الاختيار بتثبيت الإصبع (أو اللمس/الفأرة) • لا خسارة ولا وقت ضاغط • تشجيع صوتي ومرئي • زر «مساعدة» للمرافق.
   يعتمد على game-common.js و edu-common.js */
(function () {
  if (window.AK) return;
  const AK = (window.AK = { defs: {}, rules: {} });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toAr = EDU.toAr, pick = EDU.pick, rand = EDU.rand, shuffle = EDU.shuffle;
  Object.assign(AK, { clamp, toAr, pick, rand, shuffle });

  /* ---------------- زمن التثبيت (يضبطه المرافق) ---------------- */
  const DWELLS = [['سريع', 0.9], ['عادي', 1.4], ['بطيء', 2.2]];
  let dwi = 1;
  try { const v = localStorage.getItem('ak_dw'); if (v !== null) dwi = clamp(parseInt(v, 10) || 0, 0, 2); } catch (e) { /* تجاهل */ }
  AK.dwellTime = () => DWELLS[dwi][1];

  const st = document.createElement('style');
  st.textContent = `
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0a0f1e; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
    #ak-canvas { position: fixed; top: 0; left: 0; display: block; }
    #ak-dw { position: fixed; z-index: 12; bottom: calc(10px + env(safe-area-inset-bottom)); right: 10px; display: none; font-family: 'Segoe UI', Tahoma, sans-serif; color: #fff;
      background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; padding: 7px 12px; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
    .ak-badge { display: inline-block; margin: 0 0 10px; padding: 5px 14px; border-radius: 999px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.3); font-size: 0.9rem; }
  `;
  document.head.appendChild(st);

  /* ---------------- أدوات رسم ---------------- */
  AK.COLORS = {
    red: ['أحمر', '#ef4444'], blue: ['أزرق', '#3b82f6'], green: ['أخضر', '#22c55e'], yellow: ['أصفر', '#facc15'],
    orange: ['برتقالي', '#f97316'], purple: ['بنفسجي', '#a855f7'], brown: ['بني', '#92400e'], pink: ['وردي', '#ec4899']
  };
  AK.SHAPES = { circle: 'دائرة', square: 'مربع', rect: 'مستطيل', triangle: 'مثلث', star: 'نجمة', diamond: 'معيّن' };
  AK.drawShape = function (ctx, kind, cx, cy, r, color, stroke) {
    ctx.beginPath();
    if (kind === 'circle') ctx.arc(cx, cy, r, 0, 7);
    else if (kind === 'square') ctx.rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7);
    else if (kind === 'rect') ctx.rect(cx - r * 1.05, cy - r * 0.6, r * 2.1, r * 1.2);
    else if (kind === 'triangle') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 1.05, cy + r * 0.8); ctx.lineTo(cx - r * 1.05, cy + r * 0.8); ctx.closePath(); }
    else if (kind === 'diamond') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.8, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.8, cy); ctx.closePath(); }
    else if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; i ? ctx.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : ctx.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } ctx.closePath(); }
    if (color) { ctx.fillStyle = color; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(2, r * 0.08); ctx.stroke(); }
  };
  AK.emoji = function (ctx, e, x, y, size, alpha) {
    ctx.save(); ctx.fillStyle = '#fff'; if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(e, x, y + size * 0.05); ctx.restore();
  };
  AK.rrect = function (ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  AK.fit = function (ctx, text, maxW, size, weight) {
    ctx.font = `${weight || 800} ${size}px Tahoma`;
    while (size > 10 && ctx.measureText(text).width > maxW) { size -= 1; ctx.font = `${weight || 800} ${size}px Tahoma`; }
    return size;
  };

  /* ---------------- تحميل مكتبات الكاميرا عند الحاجة ---------------- */
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s);
    });
  }
  async function loadLibs(mode) {
    if (mode === 'none') return;
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
    await loadScript(mode === 'pose' ? 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js' : 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
  }

  AK.run = function (id) {
    const def = AK.defs[id];
    if (!def) throw new Error('unknown game ' + id);
    AK.game(def);
  };

  /* ================= اللعبة: الإطار العام ================= */
  AK.game = function (def) {
    document.title = def.title;
    const canvas = document.createElement('canvas'); canvas.id = 'ak-canvas'; document.body.prepend(canvas);
    const ctx = canvas.getContext('2d'), video = EDU.makeVideo();
    const dwBtn = document.createElement('button'); dwBtn.id = 'ak-dw'; document.body.appendChild(dwBtn);
    const showDw = () => { dwBtn.textContent = `⏱ زمن التثبيت: ${DWELLS[dwi][0]}`; };
    showDw();
    dwBtn.addEventListener('click', () => { dwi = (dwi + 1) % 3; try { localStorage.setItem('ak_dw', String(dwi)); } catch (e) { /* تجاهل */ } showDw(); });

    const G = {
      def, ctx, video, canvas, w: 0, h: 0, now: 0, level: 0, L: null, phase: 'MENU', cameraOK: false, mode: def.mode || 'hand',
      ptr: { x: 0, y: 0, on: false, src: '' }, ptrT: 0, handT: 0, click: null, dw: { i: -1, t: 0, cool: 0 },
      pose: null, poseT: 0, body: EDU.makeBody(), pf: {}, cam: { x: 0, y: 0, w: 1, h: 1 }, hh: 110,
      rounds: 5, qi: 0, mistakes: 0, assistFlag: false, assist: null, msg: '', msgT: 0
    };
    G.menu = null;
    G.dwellTime = AK.dwellTime;
    GC.fitCanvas(canvas, (nw, nh) => { G.w = nw; G.h = nh; G.hh = clamp(Math.round(nh * 0.2), 96, 126); });

    /* ---- مدخلات ---- */
    const blocked = (t) => t && t.closest && t.closest('button, .edu-overlay');
    window.addEventListener('pointermove', (e) => { if (blocked(e.target)) return; G.ptr = { x: e.clientX, y: e.clientY, on: true, src: 'ptr' }; G.ptrT = performance.now(); });
    window.addEventListener('pointerdown', (e) => {
      if (blocked(e.target)) return;
      G.ptr = { x: e.clientX, y: e.clientY, on: true, src: 'ptr' }; G.ptrT = performance.now(); G.click = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') G.ptr.on = false; });
    function onHands(res) {
      const lm = res.multiHandLandmarks && res.multiHandLandmarks[0];
      if (!lm) return;
      const now = performance.now();
      if (G.ptr.src === 'ptr' && now - G.ptrT < 2000) return;
      const cl = (v) => clamp((v - 0.1) / 0.8, 0, 1);
      let x = cl(1 - lm[8].x) * G.w, y = cl(lm[8].y) * G.h;
      if (G.ptr.on && G.ptr.src === 'hand') { x = G.ptr.x + (x - G.ptr.x) * 0.4; y = G.ptr.y + (y - G.ptr.y) * 0.4; }   // تنعيم الارتجاف
      G.ptr = { x, y, on: true, src: 'hand' }; G.handT = now;
    }
    function onPose(res) {
      if (!res.poseLandmarks) return;
      G.pose = res.poseLandmarks; G.poseT = performance.now();
      G.body.update(G.pose, G.poseT, video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 4 / 3);
    }

    /* ---- مساعدات الألعاب ---- */
    G.speak = (t) => EDU.speak(t);
    G.say = (t, ms) => { G.msg = t; G.msgT = ms || 1800; };
    G.praise = (x, y) => {
      const w = pick(['أحسنت!', 'ممتاز!', 'رائع!', 'برافو!', 'عمل جميل!']);
      G.say(w + ' 🌟', 1500); EDU.speak(w);
      EDU.fx.burst(x === undefined ? G.w / 2 : x, y === undefined ? G.h / 2 : y, ['#fde047', '#4ade80', '#38bdf8', '#f472b6'], 36);
      [523, 659, 784].forEach((f, i) => GC.beep(f, 0.14, 'triangle', 0.14, i * 0.08));
    };
    G.oops = (t) => { G.mistakes++; G.say(t || 'حاول مرة أخرى 💪', 1400); GC.beep(260, 0.18, 'sine', 0.1, 0, 200); };
    G.begin = (rounds) => { G.rounds = rounds; G.qi = 0; G.mistakes = 0; EDU.fx.list = []; G.msgT = 0; };
    G.finishLevel = (extra) => {
      G.phase = 'MENU';
      const m = G.mistakes, stars = m <= Math.max(1, Math.round(G.rounds * 0.25)) ? 3 : m <= G.rounds ? 2 : 1;   // دائماً ينجح الطفل
      G.menu.finish(stars, extra || `أكملت ${toAr(G.rounds)} جولات 🎉`, G.level);
    };

    // اختيار بالتثبيت أو اللمس: items = [{x,y,w,h,off}]، يعيد رقم العنصر أو -1
    G.pick = (items, dt) => {
      if (G.dw.cool > 0) G.dw.cool -= dt;
      const inside = (it, px, py, pad) => !it.off && px >= it.x - pad && px <= it.x + it.w + pad && py >= it.y - pad && py <= it.y + it.h + pad;
      if (G.click) {
        const c = G.click; G.click = null;
        for (let i = 0; i < items.length; i++) if (inside(items[i], c.x, c.y, 0)) { G.dw.i = -1; G.dw.t = 0; G.dw.cool = 0.5; return i; }
      }
      if (!G.ptr.on || G.dw.cool > 0) { G.dw.i = -1; G.dw.t = 0; return -1; }
      let hit = -1;
      for (let i = 0; i < items.length; i++) if (inside(items[i], G.ptr.x, G.ptr.y, 6)) { hit = i; break; }
      if (hit < 0) { G.dw.i = -1; G.dw.t = 0; return -1; }
      if (hit !== G.dw.i) { G.dw.i = hit; G.dw.t = 0; }
      G.dw.t += dt;
      if (G.dw.t >= AK.dwellTime()) { G.dw.i = -1; G.dw.t = 0; G.dw.cool = 0.7; return hit; }
      return -1;
    };
    G.dwProg = (i) => (G.dw.i === i ? clamp(G.dw.t / AK.dwellTime(), 0, 1) : 0);
    G.ring = (it, i) => {
      const p = G.dwProg(i); if (p <= 0) return;
      ctx.save(); ctx.lineWidth = 8; ctx.strokeStyle = '#fde047'; ctx.lineCap = 'round';
      AK.rrect(ctx, it.x - 5, it.y - 5, it.w + 10, it.h + 10, 22); ctx.globalAlpha = 0.25; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.setLineDash([(it.w + it.h) * 2 * p, 99999]); ctx.stroke(); ctx.restore();
    };
    G.over = (it, i) => G.dw.i === i;

    // زر المساعدة للمرافق (ألعاب الجسم)
    G.drawAssist = (label) => {
      const bw = Math.min(260, G.w * 0.5), bh = 46;
      G.assist = { x: G.w / 2 - bw / 2, y: G.h - bh - 12, w: bw, h: bh };
      ctx.save(); AK.rrect(ctx, G.assist.x, G.assist.y, bw, bh, 23); ctx.fillStyle = 'rgba(15,23,42,0.75)'; ctx.fill();
      ctx.strokeStyle = G.dw.i === 99 ? '#fde047' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      EDU.text(ctx, label || '✔ تمّت بمساعدة المرافق', G.w / 2, G.assist.y + bh / 2, 17, '#e2e8f0');
    };
    G.checkAssist = () => {
      if (!G.assist || !G.click) return false;
      const c = G.click, a = G.assist;
      if (c.x >= a.x && c.x <= a.x + a.w && c.y >= a.y && c.y <= a.y + a.h) { G.click = null; return true; }
      return false;
    };

    // ---- الجسم: نقاط الهيكل على شاشة الكاميرا ----
    G.poseOK = () => G.pose && performance.now() - G.poseT < 600;
    G.J = (i) => {
      if (!G.poseOK()) return null;
      const l = G.pose[i]; if (!l || (l.visibility !== undefined && l.visibility < 0.35)) return null;
      return EDU.pt(G.cam, l);
    };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    G.near = (a, b, k) => { const p = G.J(a), q = typeof b === 'number' ? G.J(b) : b; return !!(p && q && dist(p, q) < (k || 0.7) * G.sw); };
    // أوضاع جاهزة (بالنسبة لعرض المرآة: اليسار/اليمين كما يراهما الطفل على الشاشة)
    G.updatePose = (now) => {
      const f = (G.pf = {});
      const sL = G.J(11), sR = G.J(12);
      if (!sL || !sR) { f.ok = false; return; }
      G.sw = Math.max(20, dist(sL, sR)); f.ok = true;
      const sy = (sL.y + sR.y) / 2, sw = G.sw, nose = G.J(0), wL = G.J(15), wR = G.J(16);
      const up = (w) => w && w.y < sy - 0.4 * sw;
      f.upL = up(wL); f.upR = up(wR); f.armsUp = f.upL && f.upR;
      const out = (w, s, sign) => w && sign * (w.x - s.x) > 0.9 * sw && Math.abs(w.y - s.y) < 0.65 * sw;
      f.outL = out(wL, sL, -1); f.outR = out(wR, sR, 1); f.armsOut = f.outL && f.outR;
      const nearHead = (w) => w && nose && dist(w, nose) < 0.95 * sw && w.y < sy;
      f.headL = nearHead(wL); f.headR = nearHead(wR); f.handHead = f.headL || f.headR; f.handsHead = f.headL && f.headR;
      const mouth = G.J(9) && G.J(10) ? { x: (G.J(9).x + G.J(10).x) / 2, y: (G.J(9).y + G.J(10).y) / 2 } : nose;
      f.mouth = !!(mouth && ((wL && dist(wL, mouth) < 0.55 * sw) || (wR && dist(wR, mouth) < 0.55 * sw)));
      f.shoulders = !!((wL && (dist(wL, sL) < 0.6 * sw || dist(wL, sR) < 0.6 * sw)) || (wR && (dist(wR, sL) < 0.6 * sw || dist(wR, sR) < 0.6 * sw)));
      const kL = G.J(25), kR = G.J(26);
      f.knees = !!((wL && kL && dist(wL, kL) < 0.8 * sw) || (wR && kR && dist(wR, kR) < 0.8 * sw) || (wL && kR && dist(wL, kR) < 0.8 * sw) || (wR && kL && dist(wR, kL) < 0.8 * sw));
      f.squat = G.body.dy > 0.55;
      f.hold = {};
    };
    // مؤقّت ثبات: يعيد true بعد أن يستمر الشرط sec ثانية
    G.held = (key, cond, sec, dt) => {
      G.hs = G.hs || {};
      G.hs[key] = cond ? (G.hs[key] || 0) + dt : 0;
      if (G.hs[key] >= sec) { G.hs[key] = 0; return true; }
      return false;
    };
    // كاميرا الجسم بإطار كبير وهيكل عظمي
    G.drawBodyCam = (area) => {
      G.cam = EDU.fitRect(video, area || { x: 0, y: G.hh, w: G.w, h: G.h - G.hh - 60 });
      if (G.cameraOK) { EDU.drawVideo(ctx, video, G.cam, 0.55); if (G.poseOK()) EDU.drawSkeleton(ctx, G.pose, G.cam, '#5eead4', 6); }
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.strokeRect(G.cam.x, G.cam.y, G.cam.w, G.cam.h);
    };
    G.drawThumb = () => {
      if (!G.cameraOK || G.h < 520 || G.mode !== 'hand') return;
      const vr = EDU.fitRect(video, { x: 10, y: 46, w: 92, h: 64 });
      ctx.save(); AK.rrect(ctx, vr.x, vr.y, vr.w, vr.h, 8); ctx.clip(); EDU.drawVideo(ctx, video, vr, 0.85); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; AK.rrect(ctx, vr.x, vr.y, vr.w, vr.h, 8); ctx.stroke();
    };
    G.header = (prompt, sub) => {
      const hh = G.hh;
      ctx.fillStyle = 'rgba(8,10,24,0.82)'; ctx.fillRect(0, 0, G.w, hh);
      const fs = clamp(G.w * 0.032, 13, 18);
      ctx.textBaseline = 'middle'; ctx.font = `700 ${fs}px Tahoma`;
      ctx.textAlign = 'right'; ctx.fillStyle = '#cbd5e1'; ctx.fillText(`المستوى ${toAr(G.level + 1)}: ${G.L.name}`, G.w - 12, 20);
      ctx.textAlign = 'center'; ctx.fillStyle = '#e2e8f0'; ctx.fillText(`${toAr(Math.min(G.qi + 1, G.rounds))} / ${toAr(G.rounds)}`, G.w / 2, 20);
      const avail = G.w - 230, size = AK.fit(ctx, prompt, avail, clamp(G.w * 0.05, 18, 34));
      EDU.text(ctx, prompt, G.w / 2 + 20, hh * 0.58, size, '#fde047', def.glow || '#6d28d9');
      if (sub) { ctx.font = `600 ${fs}px Tahoma`; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'; ctx.fillText(sub, G.w / 2 + 20, hh * 0.86); }
    };
    G.drawPointer = () => {
      if (!G.ptr.on || G.mode === 'pose' && G.ptr.src !== 'ptr') return;
      ctx.save(); ctx.beginPath(); ctx.arc(G.ptr.x, G.ptr.y, 16, 0, 7); ctx.fillStyle = 'rgba(253,224,71,0.85)'; ctx.fill();
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    };

    /* ---- القائمة ---- */
    GC.store.set('ak_' + def.id + '_unlocked', def.levels.length);     // كل المستويات مفتوحة: المرافق يختار المناسب
    G.menu = EDU.init({
      id: 'ak_' + def.id, title: def.title, emoji: def.emoji, color: def.color, bg1: def.bg1, bg2: def.bg2, levels: def.levels,
      onStart: (i) => { G.level = i; G.L = def.levels[i]; G.phase = 'PLAY'; G.msgT = 0; G.hs = {}; G.click = null; dwBtn.style.display = 'block'; def.start(G, i); }
    });
    const origShow = G.menu.show;
    G.menu.show = function () { dwBtn.style.display = 'none'; return origShow.apply(this, arguments); };
    const BADGE = '<div class="ak-badge">♿ مصمّمة لأطفال ذوي صعوبات الحركة أو النطق — لا حاجة للكلام</div><br>';

    /* ---- الحلقة ---- */
    let last = performance.now();
    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now; G.now = now;
      if (G.ptr.src === 'hand' && now - G.handT > 400) G.ptr.on = false;
      if (G.phase === 'PLAY') {
        if (G.mode === 'pose') G.updatePose(now);
        if (G.msgT > 0) G.msgT -= dt * 1000;
        def.update(G, now, dt);
      }
      GC.begin(ctx);
      const g = ctx.createLinearGradient(0, 0, 0, G.h); g.addColorStop(0, def.bg1 || '#12304a'); g.addColorStop(1, def.bg2 || '#05080f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, G.w, G.h);
      if (G.phase === 'PLAY') {
        def.draw(G, ctx, now, dt);
        if (G.msgT > 0) { ctx.globalAlpha = Math.min(1, G.msgT / 400); EDU.text(ctx, G.msg, G.w / 2, G.h * 0.5, clamp(G.w * 0.07, 24, 54), '#fff', '#16a34a'); ctx.globalAlpha = 1; }
        EDU.fx.draw(ctx, dt);
        G.drawPointer();
      }
      G.click = null;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    AK.tick = frame;

    /* ---- الكاميرا ---- */
    const HELP = (def.help || '') + (G.mode === 'hand' ? '<br>☝️ <b>أشِر بإصبعك</b> نحو الخيار وثبّته لحظة (أو المس الشاشة).' : '<br>🧍 قِف أمام الكاميرا بحيث يظهر جسمك كاملاً. يمكن للمرافق الضغط على زر «تمّت».');
    (async function init() {
      if (G.mode === 'none' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { G.menu.ready(BADGE + HELP); return; }
      try {
        await loadLibs(G.mode);
        if (G.mode === 'pose') await EDU.startPose(video, onPose); else await EDU.startHands(video, onHands, 1);
        G.cameraOK = true; G.menu.ready(BADGE + HELP);
      } catch (e) { console.error(e); G.menu.ready(BADGE + HELP + '<br>تعذر تشغيل الكاميرا — يمكن اللعب باللمس أو الفأرة.'); }
    })();
    AK.G = G;
    return G;
  };

  /* ================= محرّك الأسئلة (اختيار بالتثبيت) =================
     spec: { id,title,emoji,color,bg1,bg2,levels,help,mode,video, gen(lv, i, G) -> question }
     question: { prompt, say, scene:{e,size,draw(ctx,x,y,w,h,st,now)}, hideSceneAfter, options:[{e,t,shape,c,ok,draw,ord}],
                 ordered, free, onPick(i), banner, labels, cols, replay() }                                          */
  AK.quiz = function (spec) {
    const def = Object.assign({}, spec, {
      start(G, lv) { G.begin(G.L.rounds || 5); nextQ(G); },
      update(G, now, dt) { update(G, now, dt); },
      draw(G, ctx, now, dt) { draw(G, ctx, now, dt); }
    });
    function nextQ(G) {
      if (G.qi >= G.rounds) { G.finishLevel(); return; }
      const q = spec.gen(G.level, G.qi, G) || {};
      G.q = q; G.qs = { t0: G.now, done: new Set(), order: 0, wrong: -1, wrongT: 0, miss: 0, hidden: false, endAt: 0, rects: [], rep: null };
      if (!q.silent && (q.say || q.prompt)) setTimeout(() => { if (G.q === q && G.phase === 'PLAY') EDU.speak(q.say || q.prompt); }, 500);
      if (q.onStart) q.onStart(G, q);
      if (q.banner) G.say(q.banner, 2200);
    }
    function layout(G) {
      const q = G.q, s = G.qs, n = q.options.length, hh = G.hh;
      const sceneH = q.scene ? clamp(G.h * (q.sceneH || 0.3), 90, 260) : 0;
      const ay = hh + sceneH + 10, ah = G.h - ay - 16, aw = G.w - 24;
      s.scene = { x: 12, y: hh + 6, w: aw, h: sceneH - 6 };
      const asp = aw / Math.max(1, ah);
      let cols = q.cols || (n <= 3 ? n : n === 4 ? (asp > 1.8 ? 4 : 2) : Math.ceil(Math.sqrt(n * asp)));
      cols = clamp(cols, 1, n);
      const rows = Math.ceil(n / cols), gap = 14;
      const cs = Math.min((aw - gap * (cols - 1)) / cols, (ah - gap * (rows - 1)) / rows, q.maxCard || 200);
      const rects = [];
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols), c = i % cols, inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
        const x0 = G.w / 2 - (inRow * cs + (inRow - 1) * gap) / 2;
        rects.push({ x: x0 + c * (cs + gap), y: ay + (ah - (rows * cs + (rows - 1) * gap)) / 2 + r * (cs + gap), w: cs, h: cs });
      }
      s.rects = rects;
      s.replayR = q.say || q.replay ? { x: 12, y: hh + 8, w: 54, h: 54 } : null;
    }
    function update(G, now, dt) {
      const q = G.q, s = G.qs; if (!q) return;
      if (s.endAt) { if (now >= s.endAt) { G.qi++; nextQ(G); } return; }
      if (q.hideSceneAfter && !s.hidden && now - s.t0 > q.hideSceneAfter * 1000) s.hidden = true;
      if (q.hideSceneAfter && !s.hidden) { G.dw.i = -1; G.dw.t = 0; G.click = null; return; }     // فترة التذكّر: لا اختيار
      const items = s.rects.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h, off: s.done.has(s.rects.indexOf(r)) }));
      if (s.replayR) items.push(Object.assign({}, s.replayR));
      const k = G.pick(items, dt);
      if (k < 0) return;
      if (s.replayR && k === items.length - 1) { if (q.replay) q.replay(G, q); else EDU.speak(q.say || q.prompt); return; }
      choose(G, k);
    }
    function choose(G, k) {
      const q = G.q, s = G.qs, o = q.options[k], r = s.rects[k];
      if (q.free) { if (q.onPick) q.onPick(k, G, q); G.praise(r.x + r.w / 2, r.y + r.h / 2); s.endAt = G.now + 1300; return; }
      let good = !!o.ok;
      if (good && q.ordered && o.ord !== s.order) good = false;
      if (good) {
        s.done.add(k); s.order++; GC.beep(600 + s.done.size * 80, 0.12, 'triangle', 0.14);
        EDU.fx.burst(r.x + r.w / 2, r.y + r.h / 2, ['#4ade80', '#fde047'], 14);
        if (o.say) EDU.speak(o.say);
        const need = q.options.filter((x) => x.ok).length;
        if (s.done.size >= need) { G.praise(); s.endAt = G.now + 1600; s.complete = true; if (q.onComplete) q.onComplete(G, q); }
      } else {
        s.wrong = k; s.wrongT = G.now; s.miss++; G.oops(q.wrongMsg);
      }
    }
    function drawOption(G, ctx, o, r, state, q) {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      ctx.save();
      AK.rrect(ctx, r.x, r.y, r.w, r.h, 20);
      ctx.fillStyle = state === 'done' ? 'rgba(34,197,94,0.35)' : state === 'wrong' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.13)'; ctx.fill();
      ctx.lineWidth = state === 'hint' ? 6 : 3; ctx.strokeStyle = state === 'done' ? '#4ade80' : state === 'wrong' ? '#f87171' : state === 'hint' ? '#fde047' : 'rgba(255,255,255,0.35)'; ctx.stroke();
      const lab = q.labels !== false && o.t, ey = lab ? cy - r.h * 0.1 : cy, size = r.h * (lab ? 0.5 : 0.62);
      if (o.draw) o.draw(ctx, cx, ey, size);
      else if (o.shape) AK.drawShape(ctx, o.shape, cx, ey, size * 0.5, o.c || '#fff', 'rgba(255,255,255,0.8)');
      else if (o.e) AK.emoji(ctx, o.e, cx, ey, size);
      else if (o.big) { EDU.text(ctx, o.big, cx, cy, Math.min(r.h * 0.62, AK.fit(ctx, o.big, r.w * 0.85, r.h * 0.62)), o.c || '#fff'); }
      if (lab) EDU.text(ctx, o.t, cx, r.y + r.h * 0.84, Math.min(r.h * 0.17, AK.fit(ctx, o.t, r.w * 0.9, r.h * 0.17)), '#f1f5f9');
      if (state === 'done') { EDU.text(ctx, '✔', r.x + r.w - 20, r.y + 20, 26, '#4ade80'); }
      if (q.ordered && state === 'done' && o.ord !== undefined) { EDU.text(ctx, toAr(o.ord + 1), r.x + 22, r.y + 22, 26, '#fde047'); }
      ctx.restore();
    }
    function draw(G, ctx, now, dt) {
      const q = G.q, s = G.qs; if (!q) return;
      if (spec.video && G.cameraOK) EDU.drawVideo(ctx, G.video, { x: 0, y: 0, w: G.w, h: G.h }, 0.3);
      layout(G);
      G.drawThumb();
      G.header(q.prompt || '', q.sub);
      // المشهد
      if (q.scene) {
        const sc = s.scene, showScene = !q.hideSceneAfter || !s.hidden;
        ctx.save(); AK.rrect(ctx, sc.x, sc.y, sc.w, sc.h, 20); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill(); ctx.restore();
        if (showScene) {
          if (q.scene.draw) q.scene.draw(ctx, sc.x, sc.y, sc.w, sc.h, s, now);
          else if (q.scene.e) AK.emoji(ctx, q.scene.e, sc.x + sc.w / 2, sc.y + sc.h / 2, Math.min(sc.h * 0.8, sc.w / Math.max(1, [...q.scene.e].length) * 0.95) * (q.scene.size || 1));
          else if (q.scene.big) EDU.text(ctx, q.scene.big, sc.x + sc.w / 2, sc.y + sc.h / 2, Math.min(sc.h * 0.7, AK.fit(ctx, q.scene.big, sc.w * 0.9, sc.h * 0.7)), '#fff', '#7c3aed');
          if (q.hideSceneAfter) { const left = Math.max(0, q.hideSceneAfter - (now - s.t0) / 1000); EDU.text(ctx, (q.hideLabel || '👀 تذكّر…') + ' ' + toAr(Math.ceil(left)), sc.x + sc.w - 70, sc.y + 24, 20, '#fde047'); }
        } else EDU.text(ctx, '❓', sc.x + sc.w / 2, sc.y + sc.h / 2, sc.h * 0.6, '#94a3b8');
      }
      if (s.replayR) {
        const r = s.replayR; AK.rrect(ctx, r.x, r.y, r.w, r.h, 14); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
        ctx.strokeStyle = G.over(r, s.rects.length) ? '#fde047' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke(); EDU.text(ctx, '🔊', r.x + r.w / 2, r.y + r.h / 2, 28, '#fff');
        const p = G.dwProg(s.rects.length); if (p > 0) G.ring(r, s.rects.length);
      }
      // الخيارات
      const showOpts = !q.hideSceneAfter || s.hidden;
      if (showOpts) {
        for (let i = 0; i < q.options.length; i++) {
          let state = s.done.has(i) ? 'done' : (s.wrong === i && now - s.wrongT < 700 ? 'wrong' : (s.miss >= 2 && q.options[i].ok && !s.done.has(i) && (!q.ordered || q.options[i].ord === s.order) && Math.floor(now / 400) % 2 ? 'hint' : ''));
          const r = s.rects[i];
          let rr = r;
          if (state === 'wrong') { const j = Math.sin(now / 30) * 5; rr = { x: r.x + j, y: r.y, w: r.w, h: r.h }; }
          drawOption(G, ctx, q.options[i], rr, state, q);
          G.ring(r, i);
        }
      }
    }
    return def;
  };
})();
