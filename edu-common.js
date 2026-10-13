/* مكوّنات مشتركة للألعاب التعليمية: قائمة المستويات، الحفظ، الكاميرا، رسم الفيديو والهيكل، مؤثرات */
(function () {
  if (window.EDU) return;
  const EDU = (window.EDU = { active: false });

  EDU.toAr = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
  EDU.rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  EDU.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  EDU.shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  EDU.mobile = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);

  EDU.speak = function (text, lang) {
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'ar-SA'; u.rate = lang === 'en-US' ? 0.85 : 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* تجاهل */ }
  };

  /* ---------------- الأنماط ---------------- */
  const css = `
    .edu-overlay { position: fixed; inset: 0; z-index: 30; display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; padding: 16px; overflow-y: auto; color: #fff; font-family: 'Segoe UI', Tahoma, sans-serif;
      background: radial-gradient(circle at 50% 0%, var(--edu-bg1, #123), var(--edu-bg2, #050a14) 75%); }
    .edu-overlay > * { flex-shrink: 0; }
    .edu-overlay h1 { margin: 0 0 6px; font-size: clamp(1.8rem, 7vw, 3rem); color: var(--edu-c, #5eead4); text-shadow: 0 0 16px var(--edu-c, #5eead4); }
    .edu-overlay p { margin: 0 0 14px; max-width: 600px; line-height: 1.7; color: #cbd5e1; font-size: clamp(0.92rem, 3.4vw, 1.12rem); }
    .edu-overlay button { font-family: inherit; cursor: pointer; color: #fff; border: 2px solid var(--edu-c, #5eead4); background: rgba(255,255,255,0.08);
      border-radius: 50px; padding: 12px 38px; font-size: clamp(1.05rem, 4.4vw, 1.35rem); font-weight: 700; }
    .edu-overlay button:active { transform: scale(0.97); }
    .edu-lv { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 0 0 16px; width: min(94vw, 480px); }
    .edu-lv button { padding: 6px 0; border-radius: 14px; border-color: transparent; background: rgba(255,255,255,0.1); font-size: 1.1rem; line-height: 1.25; }
    .edu-lv button small { display: block; font-size: 0.68rem; min-height: 1em; font-weight: 400; }
    .edu-lv button.sel { background: var(--edu-c, #5eead4); color: #04141a; }
    .edu-lv button:disabled { opacity: 0.35; cursor: not-allowed; }
    #edu-go { background: var(--edu-c, #5eead4); color: #04141a; }
    .edu-hidden { display: none !important; }
    .edu-loader { border: 5px solid rgba(255,255,255,0.12); border-top-color: var(--edu-c, #5eead4); border-radius: 50%; width: 48px; height: 48px; animation: edu-spin 1s linear infinite; margin-bottom: 14px; }
    @keyframes edu-spin { to { transform: rotate(360deg); } }
    #edu-menu { position: fixed; z-index: 12; top: calc(10px + env(safe-area-inset-top)); left: calc(10px + env(safe-area-inset-left)); display: none;
      font-family: inherit; color: #fff; background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.25); border-radius: 12px; padding: 8px 14px; font-size: 0.95rem; font-weight: 700; cursor: pointer; }
    @media (max-height: 520px) { .edu-overlay h1 { margin-bottom: 2px; } .edu-overlay p { margin-bottom: 6px; } .edu-lv { margin-bottom: 8px; } .edu-overlay button { padding: 8px 26px; } }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------------- قائمة المستويات ----------------
     o: { id, title, emoji, desc, levels:[{name, sub}], color, bg1, bg2, onStart(levelIndex) } */
  EDU.init = function (o) {
    const root = document.documentElement;
    if (o.color) root.style.setProperty('--edu-c', o.color);
    if (o.bg1) root.style.setProperty('--edu-bg1', o.bg1);
    if (o.bg2) root.style.setProperty('--edu-bg2', o.bg2);
    const ov = document.createElement('div'); ov.className = 'edu-overlay';
    ov.innerHTML = `<div class="edu-loader" id="edu-ld"></div><h1>${o.emoji} ${o.title}</h1><p id="edu-desc">${o.loading || 'جاري تشغيل الكاميرا...'}</p>
      <div class="edu-lv edu-hidden" id="edu-lv"></div><button id="edu-go" class="edu-hidden">ابدأ</button>`;
    document.body.appendChild(ov);
    const menuBtn = document.createElement('button'); menuBtn.id = 'edu-menu'; menuBtn.textContent = '☰ المستويات'; document.body.appendChild(menuBtn);
    const lvEl = ov.querySelector('#edu-lv'), goBtn = ov.querySelector('#edu-go'), descEl = ov.querySelector('#edu-desc'), titleEl = ov.querySelector('h1'), ld = ov.querySelector('#edu-ld');
    let unlocked = Math.max(1, Math.min(o.levels.length, GC.store.get(o.id + '_unlocked') || 1));
    let selected = 0, ready = false, label = 'ابدأ';
    const baseTitle = `${o.emoji} ${o.title}`;

    function render() {
      lvEl.innerHTML = '';
      o.levels.forEach((L, i) => {
        const b = document.createElement('button');
        const locked = i >= unlocked, stars = GC.store.get(o.id + '_stars_' + i);
        b.className = i === selected ? 'sel' : '';
        b.disabled = locked;
        b.innerHTML = (locked ? '🔒' : (i + 1)) + `<small>${locked ? '' : '⭐'.repeat(stars)}</small>`;
        b.title = L.name + (L.sub ? ' - ' + L.sub : '');
        b.addEventListener('click', () => { selected = i; render(); });
        lvEl.appendChild(b);
      });
      const L = o.levels[selected];
      goBtn.textContent = `${label}: ${selected + 1} - ${L.name}`;
    }
    const api = {
      ready(msg) { ready = true; ld.classList.add('edu-hidden'); if (msg) descEl.innerHTML = msg; lvEl.classList.remove('edu-hidden'); goBtn.classList.remove('edu-hidden'); render(); },
      show(title, msg, nextLabel) {
        EDU.active = false; menuBtn.style.display = 'none';
        titleEl.textContent = title || baseTitle; if (msg) descEl.innerHTML = msg; label = nextLabel || 'ابدأ';
        ov.classList.remove('edu-hidden'); ld.classList.add('edu-hidden');
        if (ready) { lvEl.classList.remove('edu-hidden'); goBtn.classList.remove('edu-hidden'); render(); }
      },
      // نهاية مستوى: stars 0 = خسارة
      finish(stars, extraMsg, level) {
        const win = stars > 0, last = level === o.levels.length - 1;
        if (win) {
          const k = o.id + '_stars_' + level;
          if (stars > GC.store.get(k)) GC.store.set(k, stars);
          if (!last && unlocked < level + 2) { unlocked = level + 2; GC.store.set(o.id + '_unlocked', unlocked); }
          selected = last ? 0 : level + 1;
          [523, 659, 784, 1047].forEach((f, i) => GC.beep(f, 0.2, 'triangle', 0.16, i * 0.11));
        } else { selected = level; [330, 262, 196].forEach((f, i) => GC.beep(f, 0.25, 'square', 0.12, i * 0.15)); }
        const title = win ? (last ? 'أنهيت كل المستويات! 🏆' : 'أحسنت! أتممت المستوى 🎉') : 'حاول مرة أخرى 💪';
        api.show(title, `${win ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) + '<br>' : ''}${extraMsg || ''}`, win ? (last ? 'العب من جديد' : 'المستوى التالي') : 'حاول مجدداً');
      },
      hide() { ov.classList.add('edu-hidden'); menuBtn.style.display = 'block'; }
    };
    goBtn.addEventListener('click', () => { GC.audioInit(); api.hide(); EDU.active = true; o.onStart(selected); });
    menuBtn.addEventListener('click', () => api.show());
    return api;
  };

  /* ---------------- الكاميرا ---------------- */
  EDU.makeVideo = function () {
    const v = document.createElement('video');
    v.autoplay = true; v.playsInline = true; v.muted = true;
    v.style.cssText = 'position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;';
    document.body.appendChild(v);
    return v;
  };
  EDU.startHands = async function (video, onResults, maxHands) {
    if (typeof Hands === 'undefined') throw new Error('hands');
    const hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    hands.setOptions({ maxNumHands: maxHands || 2, modelComplexity: EDU.mobile ? 0 : 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
    hands.onResults(onResults);
    const cam = new Camera(video, { onFrame: async () => { if (EDU.active) await hands.send({ image: video }); }, width: 640, height: 480, facingMode: 'user' });
    await cam.start();
    return hands;
  };
  EDU.startPose = async function (video, onResults) {
    if (typeof Pose === 'undefined') throw new Error('pose');
    const pose = new Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
    pose.setOptions({ modelComplexity: EDU.mobile ? 0 : 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.55, minTrackingConfidence: 0.55 });
    pose.onResults(onResults);
    const cam = new Camera(video, { onFrame: async () => { if (EDU.active) await pose.send({ image: video }); }, width: 640, height: 480, facingMode: 'user' });
    await cam.start();
    return pose;
  };

  // كاميرا خام بلا تتبع (لتحليل الألوان مثلاً)
  EDU.startRaw = async function (video) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    video.srcObject = stream;
    await video.play();
  };

  // مستطيل بنسبة الفيديو داخل منطقة (contain)
  EDU.fitRect = function (video, area) {
    const asp = video && video.videoWidth ? video.videoWidth / video.videoHeight : 4 / 3;
    let sw = area.w, sh = area.w / asp;
    if (sh > area.h) { sh = area.h; sw = area.h * asp; }
    return { x: area.x + (area.w - sw) / 2, y: area.y + (area.h - sh) / 2, w: sw, h: sh };
  };
  EDU.drawVideo = function (ctx, video, r, alpha) {
    if (!video || !video.videoWidth) return;
    ctx.save(); ctx.globalAlpha = alpha === undefined ? 0.5 : alpha;
    ctx.translate(r.x + r.w, r.y); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, r.w, r.h); ctx.restore();
  };
  // معالم (غير معكوسة) -> نقطة شاشة معكوسة كالمرآة
  EDU.pt = (r, l) => ({ x: r.x + (1 - l.x) * r.w, y: r.y + l.y * r.h });
  const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
  EDU.drawSkeleton = function (ctx, lm, r, color, width) {
    if (!lm) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 5; ctx.lineCap = 'round'; ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.beginPath();
    BONES.forEach(([a, b]) => { const p = EDU.pt(r, lm[a]), q = EDU.pt(r, lm[b]); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); });
    ctx.stroke();
    const n = EDU.pt(r, lm[0]); ctx.beginPath(); ctx.arc(n.x, n.y, (width || 5) * 2.2, 0, 7); ctx.stroke();
    ctx.restore();
  };

  /* ---------------- متتبّع حركات الجسم: قفز / تصفيق / قرفصاء / أوضاع ----------------
     يستقبل معالم Pose ويحسب أحداثاً (jumps, claps, squats) وأوضاعاً لحظية */
  EDU.makeBody = function () {
    const b = { lm: null, asp: 4 / 3, base: null, jumps: 0, claps: 0, squats: 0, last: 0, vis: false, f: {}, stillSince: 0, prevC: null };
    const d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    b.P = (i) => ({ x: b.lm[i].x * b.asp, y: b.lm[i].y, v: b.lm[i].visibility === undefined ? 1 : b.lm[i].visibility });
    b.events = [];
    b.ev = function (type, now) { b.lastEvent = type; b.events.push({ t: now, type }); if (b.events.length > 60) b.events.shift(); };
    b.reset = function () { b.jumps = 0; b.claps = 0; b.squats = 0; b.up = false; b.down = false; b.apart = true; b.events = []; };
    b.update = function (lm, now, asp) {
      if (asp) b.asp = asp;
      if (!lm) { b.vis = false; return; }
      b.lm = lm; b.last = now;
      const P = b.P;
      const sw = Math.max(0.03, d(P(11), P(12))), shY = (P(11).y + P(12).y) / 2;
      b.vis = P(11).v > 0.4 && P(12).v > 0.4;
      if (!b.base) b.base = { y: shY, sw };
      b.base.sw += (sw - b.base.sw) * 0.05;
      let dy = (shY - b.base.y) / b.base.sw;                 // موجب = للأسفل
      if (Math.abs(dy) < 0.3) b.base.y += (shY - b.base.y) * 0.04;
      // قفزة: ترتفع الكتفان ثم تعودان
      if (dy < -0.5 && !b.up) b.up = true;
      if (b.up && dy > -0.2) { b.up = false; b.jumps++; b.ev('jump', now); }
      // قرفصاء: تنخفضان ثم تعودان
      if (dy > 0.6 && !b.down) b.down = true;
      if (b.down && dy < 0.25) { b.down = false; b.squats++; b.ev('squat', now); }
      // تصفيق: تباعد اليدين ثم التقاؤهما أمام الصدر
      const wd = d(P(15), P(16)) / b.base.sw, wy = (P(15).y + P(16).y) / 2;
      const chest = wy > shY - b.base.sw * 0.6 && wy < shY + b.base.sw * 2.6;
      if (wd > 0.95) b.apart = true;
      if (b.apart && wd < 0.4 && chest && P(15).v > 0.3 && P(16).v > 0.3) { b.apart = false; b.claps++; b.ev('clap', now); }
      b.dy = dy; b.sw = b.base.sw; b.shY = shY; b.wd = wd;
      // سكون: لا حركة ملحوظة
      const cx = (P(11).x + P(12).x) / 2, c = { x: cx, y: shY, w: P(15).y + P(16).y };
      if (!b.prevC || Math.abs(c.x - b.prevC.x) / b.base.sw > 0.12 || Math.abs(c.y - b.prevC.y) / b.base.sw > 0.12 || Math.abs(c.w - b.prevC.w) / b.base.sw > 0.2) { b.stillSince = now; b.prevC = c; }
    };
    return b;
  };

  // تحميل مكتبة Vision الحديثة (Pose متعدد / Face) عند الحاجة
  EDU.vision = async function () {
    if (!EDU._v) EDU._v = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
    return EDU._v;
  };
  EDU.faceLandmarker = async function () {
    const V = await EDU.vision();
    const fs = await V.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    const opts = (delegate) => ({
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate },
      runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true
    });
    try { return await V.FaceLandmarker.createFromOptions(fs, opts('GPU')); }
    catch (e) { return await V.FaceLandmarker.createFromOptions(fs, opts('CPU')); }
  };

  /* ---------------- مؤثرات ---------------- */
  EDU.fx = {
    list: [],
    burst(x, y, colors, n) {
      for (let i = 0; i < (n || 30); i++) this.list.push({ x, y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.8) * 12, life: 1, c: colors[i % colors.length], s: 3 + Math.random() * 4 });
    },
    draw(ctx, dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life -= dt * 1.2;
        if (p.life <= 0) { this.list.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s);
      }
      ctx.globalAlpha = 1;
    }
  };
  EDU.text = function (ctx, t, x, y, size, color, glow) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 ${size}px Tahoma`;
    ctx.fillStyle = color || '#fff';
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
    ctx.fillText(t, x, y); ctx.shadowBlur = 0;
  };
})();
