/* ألعاب «فذ للجميع» — مجموعة الجسم والحركة والرسم بالهواء */
(function () {
  const { pick, rand, shuffle, toAr, clamp } = AK;
  const reg = (id, d) => { AK.defs[id] = Object.assign({ id, mode: 'pose' }, d); };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const pauseNext = (G, ms, fn) => { G.wait = { until: G.now + ms, fn }; };
  const waiting = (G) => { if (!G.wait) return false; if (G.now >= G.wait.until) { const f = G.wait.fn; G.wait = null; f(); } return true; };
  const noBody = (G, ctx) => { if (!G.poseOK() || !G.pf.ok) EDU.text(ctx, G.cameraOK ? '🧍 قِف أمام الكاميرا ليظهر جسمك' : '📷 الكاميرا غير متاحة — يمكن للمرافق الضغط على زر «تمّت»', G.w / 2, G.h - 80, clamp(G.w * 0.035, 14, 22), '#fca5a5'); };

  /* ============ ١) أعضاء الجسم ============ */
  // كل عضو: نقاط (قد يكون له جانبان) — i: أرقام معالم MediaPipe التي يُحسب متوسطها، dy: إزاحة رأسية بوحدة عرض الكتفين، arm: جانب الذراع (اليد المُلامسة يجب أن تكون من الجانب الآخر)
  const PARTS = {
    'رأس': { n: 'رأسك', pts: [{ i: [0], dy: -0.55 }] },
    'أنف': { n: 'أنفك', pts: [{ i: [0] }] },
    'فم': { n: 'فمك', pts: [{ i: [9, 10], dy: 0.08 }] },
    'ذقن': { n: 'ذقنك', pts: [{ i: [9, 10], dy: 0.4 }] },
    'أذن': { n: 'أذنك', pts: [{ i: [7] }, { i: [8] }] },
    'كتف': { n: 'كتفك', pts: [{ i: [11] }, { i: [12] }] },
    'بطن': { n: 'بطنك', pts: [{ i: [11, 12, 23, 24] }] },
    'خصر': { n: 'خصرك', pts: [{ i: [23] }, { i: [24] }] },
    'كوع': { n: 'كوعك', pts: [{ i: [13], arm: 'L' }, { i: [14], arm: 'R' }] },
    'رسغ': { n: 'رسغك', pts: [{ i: [15], arm: 'L' }, { i: [16], arm: 'R' }] },
    'إصبع': { n: 'إصبعك', pts: [{ i: [19], arm: 'L' }, { i: [20], arm: 'R' }] },
    'إبهام': { n: 'إبهامك', pts: [{ i: [21], arm: 'L' }, { i: [22], arm: 'R' }] },
    'ركبة': { n: 'ركبتك', pts: [{ i: [25] }, { i: [26] }] },
    'كاحل': { n: 'كاحلك', pts: [{ i: [27] }, { i: [28] }] },
    'كعب': { n: 'كعبك', pts: [{ i: [29] }, { i: [30] }] },
    'قدم': { n: 'قدمك', pts: [{ i: [31] }, { i: [32] }] }
  };
  const T1 = ['رأس', 'كتف', 'بطن', 'ركبة', 'قدم'], T2 = ['أنف', 'فم', 'أذن', 'كوع', 'خصر', 'كاحل'], T3 = ['رسغ', 'إصبع', 'إبهام', 'كعب', 'ذقن'];
  function partPoints(G, name) {
    const out = [];
    PARTS[name].pts.forEach((d) => {
      const ps = d.i.map((k) => G.J(k)); if (ps.some((p) => !p)) return;
      out.push({ name, arm: d.arm, x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length + (d.dy || 0) * G.sw });
    });
    return out;
  }
  AK._partPoints = partPoints;
  reg('acc-body-parts', {
    title: 'أعضاء الجسم', emoji: '🧍', color: '#38bdf8', bg1: '#0c3a5c', bg2: '#030b14',
    help: 'يسألك الجهاز: «<b>أين يدك؟</b>» ويُريك العضو. <b>ضع يدك</b> على العضو المطلوب في جسمك وثبّتها. في المستويات العليا لا تظهر صورة — استمع فقط!',
    levels: [{ name: 'أعضاء كبيرة', sub: 'مع إشارة' }, { name: 'أعضاء كبيرة', sub: 'بلا إشارة' }, { name: 'أعضاء أدق', sub: 'مع إشارة' }, { name: 'أعضاء أدق', sub: 'بلا إشارة' }, { name: 'الأدقّ: رسغ وإصبع', sub: 'بلا صورة' }],
    start(G, lv) {
      const pool = [T1, T1, T2, [...T1, ...T2], [...T3, ...T2]][lv];
      G.begin(6); G.bp = { pool: shuffle(pool), cur: null, show: lv === 0 || lv === 2 }; nextPart(G);
    },
    update(G, now, dt) {
      if (waiting(G)) return;
      const b = G.bp, f = G.pf; if (!b.cur || !f.ok) return;
      const targets = partPoints(G, b.cur), all = [];
      Object.keys(PARTS).forEach((k) => partPoints(G, k).forEach((p) => all.push(p)));
      const hands = [[15, 'L'], [16, 'R'], [19, 'L'], [20, 'R']].map(([i, s]) => ({ p: G.J(i), s })).filter((h) => h.p);
      let touching = false;
      hands.forEach((h) => {
        let best = null, bd = 1e9;
        all.forEach((c) => { if (c.arm && c.arm === h.s) return; const d = dist(h.p, c); if (d < bd) { bd = d; best = c; } });
        if (best && best.name === b.cur && bd < 0.62 * G.sw) touching = true;
      });
      if (!b.armed) { b.gap = touching ? 0 : (b.gap || 0) + dt; if (b.gap > 0.5 || now - b.t0 > 3000) b.armed = true; return; }   // يجب أن تبتعد اليد أولاً
      b.hold = touching ? (b.hold || 0) + dt : 0;
      if (b.hold >= Math.max(0.5, AK.dwellTime() * 0.55)) {
        b.cur = null; const p = targets[0]; G.praise(p ? p.x : undefined, p ? p.y : undefined);
        pauseNext(G, 1700, () => { G.qi++; nextPart(G); });
      }
      if (G.checkAssist()) { b.cur = null; G.praise(); pauseNext(G, 1500, () => { G.qi++; nextPart(G); }); }
    },
    draw(G, ctx, now, dt) {
      const b = G.bp;
      G.drawBodyCam();
      G.header(b.cur ? `ضع يدك على ${PARTS[b.cur].n}` : 'أحسنت!', b.cur ? 'أين يدك؟' : '');
      AK.emoji(ctx, '✋', 52, G.hh + 52, 64);
      if (b.cur && b.show && G.pf.ok) partPoints(G, b.cur).forEach((p) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, G.sw * (0.28 + 0.05 * Math.sin(now / 200)), 0, 7); ctx.lineWidth = 5; ctx.strokeStyle = '#fde047'; ctx.stroke();
      });
      if (b.cur && b.hold > 0) { const q = b.hold / Math.max(0.5, AK.dwellTime() * 0.55); EDU.text(ctx, '⏳'.repeat(Math.ceil(q * 3)), G.w / 2, G.h - 110, 30, '#fff'); }
      noBody(G, ctx); G.drawAssist();
    }
  });
  function nextPart(G) {
    if (G.qi >= G.rounds) { G.finishLevel(); return; }
    const b = G.bp; b.cur = b.pool[G.qi % b.pool.length]; b.armed = false; b.gap = 0; b.hold = 0; b.t0 = G.now;
    setTimeout(() => EDU.speak(`أين يدك؟ ضع يدك على ${PARTS[b.cur].n}`), 300);
  }

  /* ============ ٢) افتح الصندوق ============ */
  const PICS = [['🐘', 'فيل'], ['🌈', 'قوس قزح'], ['🚀', 'صاروخ'], ['🦁', 'أسد'], ['🍰', 'كعكة'], ['🐠', 'سمكة'], ['🎨', 'ألوان'], ['🚒', 'سيارة إطفاء']];
  const SNDS = [
    ['🐱', 'مياو', [[700, 0.15, 'triangle', 0, 500], [600, 0.25, 'triangle', 0.18, 350]]], ['🐄', 'موووو', [[160, 0.8, 'sawtooth', 0, 130]]],
    ['🔔', 'دينغ', [[1200, 0.5, 'sine', 0, 1100], [1600, 0.5, 'sine', 0.12, 1500]]], ['🚗', 'بيب بيب', [[500, 0.15, 'square', 0, 500], [500, 0.15, 'square', 0.25, 500]]],
    ['🐦', 'تغريد', [[1800, 0.1, 'sine', 0, 2400], [2200, 0.1, 'sine', 0.15, 1800], [2000, 0.1, 'sine', 0.3, 2600]]], ['🥁', 'طبل', [[120, 0.2, 'sine', 0, 80], [120, 0.2, 'sine', 0.3, 80], [120, 0.2, 'sine', 0.6, 80]]]
  ];
  const REWARDS = [['⭐', 'نجمة ذهبية'], ['🏆', 'كأس البطل'], ['🎖️', 'ميدالية'], ['🎈', 'بالونات'], ['👑', 'تاج الأبطال']];
  const STORY = ['كان يا ما كان، أرنب صغير اسمه سامي 🐰', 'خرج سامي في الصباح يبحث عن جزرة 🥕', 'قابل صديقه السلحفاة وسألها عن الطريق 🐢', 'ساعدته السلحفاة ووجدا حقل الجزر معاً 🌱', 'أكل سامي وصديقه وناما سعيدين 🌙'];
  reg('acc-open-box', {
    title: 'افتح الصندوق', emoji: '🎁', color: '#f472b6', bg1: '#4a1238', bg2: '#0e030a',
    help: 'مثّل كأنك تفتح الصندوق: <b>ضمّ يديك ثم افتحهما</b> كغطاء، أو <b>ارفع ذراعيك</b> عالياً. ماذا يوجد بالداخل؟',
    levels: [{ name: 'صورة', sub: 'ما في الصندوق؟' }, { name: 'صوت', sub: 'استمع!' }, { name: 'مكافأة', sub: 'هدية' }, { name: 'قصة', sub: 'قطعة من حكاية' }, { name: 'مفاجأة', sub: 'من كل نوع' }],
    start(G, lv) {
      G.begin(5); const bx = (G.bx = { open: 0, state: 'closed', content: null, phase: 'gather', story: [] });
      G.pics = shuffle(PICS); G.snds = shuffle(SNDS); G.rews = shuffle(REWARDS); bx.state = 'closed'; bx.phase = 'gather'; bx.t = 0;
      setTimeout(() => EDU.speak('افتح الصندوق'), 300);
    },
    update(G, now, dt) {
      const bx = G.bx; if (waiting(G)) return;
      if (bx.state === 'closed') {
        const f = G.pf; let opened = G.checkAssist();
        if (f.ok) {
          const wL = G.J(15), wR = G.J(16);
          if (wL && wR) {
            const wd = dist(wL, wR) / G.sw;
            if (wd < 1.15) bx.phase = 'ready';
            else if (bx.phase === 'ready' && wd > 2.1) opened = true;
          }
          if (G.held('up', f.armsUp, 0.45, dt)) opened = true;
        }
        if (opened) openBox(G);
      }
    },
    draw(G, ctx, now, dt) {
      const bx = G.bx;
      G.drawBodyCam({ x: 0, y: G.hh, w: G.w, h: G.h - G.hh - 60 });
      G.header(bx.state === 'closed' ? 'افتح الصندوق!' : 'انظر ماذا بالداخل!', bx.state === 'closed' ? 'ضمّ يديك ثم افتحهما — أو ارفع ذراعيك' : '');
      const cx = G.w / 2, cy = G.h * 0.58, s = Math.min(G.w, G.h) * 0.36;
      ctx.save(); ctx.fillStyle = 'rgba(8,10,24,0.55)'; AK.rrect(ctx, cx - s * 0.9, cy - s * 0.75, s * 1.8, s * 1.55, 30); ctx.fill(); ctx.restore();
      if (bx.state === 'closed') {
        const wob = Math.sin(now / 250) * 0.05; ctx.save(); ctx.translate(cx, cy); ctx.rotate(wob); AK.emoji(ctx, '🎁', 0, 0, s); ctx.restore();
        if (bx.phase === 'ready') EDU.text(ctx, '👐 الآن افتح يديك!', cx, cy + s * 0.65, 26, '#fde047');
      } else {
        const t = (now - bx.t) / 1000, c = bx.content;
        AK.emoji(ctx, '📦', cx, cy + s * 0.35, s * 0.55, 0.9);
        ctx.save(); ctx.globalAlpha = clamp(t * 2, 0, 1) ; AK.emoji(ctx, c.e, cx, cy - s * 0.15 - Math.min(t, 0.6) * 30, s * (c.kind === 'sound' ? 0.6 : 0.85) * (1 + 0.04 * Math.sin(now / 200))); ctx.restore();
        EDU.text(ctx, c.t, cx, cy + s * 0.62, clamp(G.w * 0.05, 20, 38), '#fff', '#7c3aed');
        if (c.kind === 'story') bx.story.slice(-1).forEach((tx) => { EDU.text(ctx, tx, cx, cy - s * 0.62, AK.fit(ctx, tx, G.w * 0.9, 26), '#fde047'); });
      }
      if (bx.state === 'closed') noBody(G, ctx);
      G.drawAssist('✔ فتح الصندوق بمساعدة');
    }
  });
  function openBox(G) {
    const bx = G.bx, lv = G.level, kinds = ['pic', 'sound', 'reward', 'story', 'mix'];
    let kind = kinds[lv]; if (kind === 'mix') kind = pick(['pic', 'sound', 'reward', 'story']);
    let c;
    if (kind === 'pic') { const p = G.pics[G.qi % G.pics.length]; c = { e: p[0], t: p[1], kind }; setTimeout(() => EDU.speak(p[1]), 500); }
    else if (kind === 'sound') { const p = G.snds[G.qi % G.snds.length]; c = { e: p[0], t: '🔊 ' + p[1], kind }; p[2].forEach(([f, d, ty, dl, sl]) => GC.beep(f, d, ty, 0.2, dl, sl)); setTimeout(() => EDU.speak(p[1]), 900); }
    else if (kind === 'reward') { const p = G.rews[G.qi % G.rews.length]; c = { e: p[0], t: 'مبروك! ' + p[1], kind }; EDU.fx.burst(G.w / 2, G.h / 2, ['#fde047', '#f472b6', '#38bdf8', '#4ade80'], 70); [523, 659, 784, 1047].forEach((f, i) => GC.beep(f, 0.18, 'triangle', 0.16, i * 0.1)); }
    else { const tx = STORY[G.qi % STORY.length]; bx.story.push(tx); c = { e: '📜', t: `الجزء ${toAr(G.qi + 1)}`, kind }; setTimeout(() => EDU.speak(tx), 500); }
    bx.state = 'open'; bx.content = c; bx.t = G.now; G.praise();
    pauseNext(G, 4200, () => { G.qi++; if (G.qi >= G.rounds) { G.finishLevel(kind === 'story' || lv === 3 ? 'اكتملت القصة 📖' : null); return; } bx.state = 'closed'; bx.phase = 'gather'; });
  }

  /* ============ ٣) صيد الكلمات (مثّل الحركة) ============ */
  // كل فعل: كاشف يُعيد true عند اكتمال التمثيل. s: حالة خاصة تُصفَّر عند بدء الخطوة.
  const ACTIONS = {
    eat: { e: '🍽️', v: 'يأكل الطعام', init: () => ({ n: 0, was: false }), chk(G, s, dt) { const m = G.pf.mouth; if (m && !s.was) s.n++; s.was = m; s.prog = s.n / 3; return s.n >= 3; } },
    drink: { e: '🥤', v: 'يشرب الماء', init: () => ({ t: 0 }), chk(G, s, dt) { s.t = G.pf.mouth ? s.t + dt : Math.max(0, s.t - dt); s.prog = s.t / 1.3; return s.t >= 1.3; } },
    run: { e: '🏃', v: 'يركض', init: () => ({ n: 0, sg: 0 }), chk(G, s, dt) {
      let d = 0; const pairs = [[25, 26], [27, 28], [15, 16]];
      for (const [a, b] of pairs) { const p = G.J(a), q = G.J(b); if (p && q && Math.abs(p.y - q.y) > 0.28 * G.sw) { d = Math.sign(p.y - q.y); break; } }
      if (d && d !== s.sg) { if (s.sg) s.n++; s.sg = d; } s.prog = s.n / 5; return s.n >= 5; } },
    comb: { e: '💇', v: 'يمشّط شعره', init: () => ({ len: 0, last: null }), chk(G, s, dt) {
      const f = G.pf, w = f.headL ? G.J(15) : f.headR ? G.J(16) : null;
      if (w) { if (s.last) s.len += dist(w, s.last) / G.sw; s.last = w; } else s.last = null; s.prog = s.len / 2.6; return s.len >= 2.6; } },
    wave: { e: '👋', v: 'يلوّح بيده', init: () => ({ n: 0, sx: 0, last: null }), chk(G, s, dt) {
      const f = G.pf, w = f.upL ? G.J(15) : f.upR ? G.J(16) : null;
      if (w) { if (s.last) { const d = Math.sign(w.x - s.last.x); if (Math.abs(w.x - s.last.x) > 0.04 * G.sw && d !== s.sx) { if (s.sx) s.n++; s.sx = d; } } s.last = w; } else s.last = null; s.prog = s.n / 5; return s.n >= 5; } },
    clap: { e: '👏', v: 'يصفّق', init: (G) => ({ b: G.body.claps }), chk(G, s) { s.prog = 0; return G.body.claps > s.b; } }
  };
  AK._ACTIONS = ACTIONS;
  reg('acc-word-hunt', {
    title: 'صيد الكلمات', emoji: '🎯', color: '#4ade80', bg1: '#0f3d22', bg2: '#030c07',
    help: 'ترى صورة طفل يفعل شيئاً. <b>قلّد الفعل</b> بحركة جسمك: يأكل، يشرب، يركض، يمشّط شعره… ثم جمل وتسلسل أحداث!',
    levels: [{ name: 'فعلان', sub: 'يأكل • يشرب' }, { name: 'أربعة أفعال', sub: '+ يركض • يمشّط' }, { name: 'جمل قصيرة', sub: 'فعلان متتاليان' }, { name: 'تسلسل أحداث', sub: 'ثلاثة أفعال' }, { name: 'تسلسل أطول', sub: 'بلا صور' }],
    start(G, lv) {
      G.begin(lv < 2 ? 4 : 3);
      const pool = lv === 0 ? ['eat', 'drink'] : lv === 1 ? ['eat', 'drink', 'run', 'comb'] : ['eat', 'drink', 'run', 'comb', 'wave', 'clap'];
      G.wh = { pool, seq: [], step: 0 }; nextAct(G);
    },
    update(G, now, dt) {
      if (waiting(G)) return;
      const w = G.wh; if (!w.seq.length) return;
      const a = w.seq[w.step], st = w.st;
      let done = G.checkAssist();
      if (G.pf.ok && ACTIONS[a].chk(G, st, dt)) done = true;
      if (done) {
        EDU.fx.burst(G.w / 2, G.h * 0.55, ['#4ade80', '#fde047'], 24); GC.beep(700, 0.12, 'triangle', 0.14);
        w.step++;
        if (w.step >= w.seq.length) { G.praise(); pauseNext(G, 1800, () => { G.qi++; nextAct(G); }); w.done = true; }
        else { w.st = ACTIONS[w.seq[w.step]].init(G); }
      }
    },
    draw(G, ctx, now, dt) {
      const w = G.wh; G.drawBodyCam({ x: G.w * 0.32, y: G.hh, w: G.w * 0.68, h: G.h - G.hh - 60 });
      const sentence = w.seq.map((a) => ACTIONS[a].v).join(' ثم ');
      G.header('الطفل ' + sentence, 'قلّد ما يفعله الطفل');
      // الصورة اليمنى: الطفل والفعل الحالي
      const a = w.seq[Math.min(w.step, w.seq.length - 1)] || 'eat', px = G.w * 0.16, py = G.hh + (G.h - G.hh) * 0.38;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; AK.rrect(ctx, 8, G.hh + 8, G.w * 0.3, G.h - G.hh - 76, 20); ctx.fill();
      if (G.level < 4) { AK.emoji(ctx, '🧒', px - G.w * 0.05, py, G.w * 0.11); AK.emoji(ctx, ACTIONS[a].e, px + G.w * 0.05, py + 10, G.w * 0.09); }
      else EDU.text(ctx, '؟', px, py, G.w * 0.12, '#94a3b8');
      // شريط الخطوات
      const n = w.seq.length, cw = Math.min(70, (G.w * 0.28) / n);
      for (let k = 0; k < n; k++) {
        const x = px - (n * cw) / 2 + k * cw + cw / 2, y = G.hh + (G.h - G.hh) * 0.66;
        ctx.globalAlpha = k <= w.step ? 1 : 0.4; AK.emoji(ctx, k < w.step ? '✅' : ACTIONS[w.seq[k]].e, x, y, cw * 0.7); ctx.globalAlpha = 1;
      }
      const pr = w.st && w.st.prog ? clamp(w.st.prog, 0, 1) : 0;
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(px - G.w * 0.12, G.hh + (G.h - G.hh) * 0.8, G.w * 0.24, 12); ctx.fillStyle = '#4ade80'; ctx.fillRect(px - G.w * 0.12, G.hh + (G.h - G.hh) * 0.8, G.w * 0.24 * pr, 12);
      noBody(G, ctx); G.drawAssist();
    }
  });
  function nextAct(G) {
    if (G.qi >= G.rounds) { G.finishLevel(); return; }
    const w = G.wh, lv = G.level, n = lv < 2 ? 1 : lv === 2 ? 2 : 3;
    let seq = []; while (seq.length < n) { const a = pick(w.pool); if (seq[seq.length - 1] !== a) seq.push(a); }
    w.seq = seq; w.step = 0; w.done = false; w.st = ACTIONS[seq[0]].init(G);
    setTimeout(() => EDU.speak('الطفل ' + seq.map((a) => ACTIONS[a].v).join(' ثم ')), 300);
  }

  /* ============ ٩) ذاكرة حركية ============ */
  const MOVES = {
    head: { e: '🙆', t: 'ضع يدك على رأسك', seat: true, chk: (G) => G.pf.handHead },
    shoulders: { e: '🤗', t: 'المس كتفك', seat: true, chk: (G) => G.pf.shoulders },
    up: { e: '🙌', t: 'ارفع ذراعيك', seat: true, chk: (G) => G.pf.armsUp },
    out: { e: '🤸', t: 'افتح ذراعيك', seat: true, chk: (G) => G.pf.armsOut },
    knees: { e: '🧎', t: 'المس ركبتيك', seat: true, chk: (G) => G.pf.knees },
    clap: { e: '👏', t: 'صفّق', seat: true, ev: 'claps' },
    jump: { e: '🦘', t: 'اقفز', ev: 'jumps' },
    squat: { e: '🪑', t: 'اجلس القرفصاء', ev: 'squats' }
  };
  const SEATED = Object.keys(MOVES).filter((k) => MOVES[k].seat), ALLM = Object.keys(MOVES);
  reg('acc-motor-memory', {
    title: 'ذاكرة حركية', emoji: '🧠', color: '#fbbf24', bg1: '#4d3306', bg2: '#0e0902',
    help: 'اقرأ التعليمات وتذكّر <b>ترتيبها</b> ثم نفّذها: «ضع يدك على رأسك ثم صفّق». المستويات الأولى مناسبة <b>للجلوس</b>.',
    levels: [{ name: 'أمر واحد', sub: 'جلوساً' }, { name: 'أمران', sub: 'جلوساً' }, { name: 'ثلاثة أوامر', sub: 'جلوساً' }, { name: 'أمران', sub: 'مع قفز وقرفصاء' }, { name: 'ثلاثة أو أربعة', sub: 'تحدّي' }],
    start(G, lv) { G.begin(4); G.mm = { seq: [], step: 0, phase: 'SHOW', t: 0 }; nextMem(G); },
    update(G, now, dt) {
      if (waiting(G)) return; const m = G.mm;
      if (m.phase === 'SHOW') { if (now - m.t > m.showMs) { m.phase = 'DO'; m.step = 0; m.base = baseOf(G, m.seq[0]); G.say('الآن دورك! 🏁', 1200); } return; }
      const k = m.seq[m.step], mv = MOVES[k]; let done = G.checkAssist();
      if (G.pf.ok) { if (mv.ev) done = done || G.body[mv.ev] > m.base; else done = done || G.held('mm', mv.chk(G), 0.5, dt); }
      if (done) {
        GC.beep(660, 0.12, 'triangle', 0.14); EDU.fx.burst(G.w / 2, G.h * 0.4, ['#fde047', '#4ade80'], 20); m.step++;
        if (m.step >= m.seq.length) { G.praise(); pauseNext(G, 1800, () => { G.qi++; nextMem(G); }); m.phase = 'WIN'; } else m.base = baseOf(G, m.seq[m.step]);
      }
    },
    draw(G, ctx, now, dt) {
      const m = G.mm; G.drawBodyCam({ x: G.w * 0.3, y: G.hh, w: G.w * 0.7, h: G.h - G.hh - 60 });
      G.header(m.phase === 'SHOW' ? 'تذكّر هذه الأوامر بالترتيب' : 'نفّذ الأوامر بالترتيب', m.phase === 'SHOW' ? 'انظر جيداً…' : `الأمر ${toAr(Math.min(m.step + 1, m.seq.length))} من ${toAr(m.seq.length)}`);
      const x0 = 12, w0 = G.w * 0.28, n = m.seq.length, ch = Math.min(110, (G.h - G.hh - 90) / n);
      m.seq.forEach((k, i) => {
        const y = G.hh + 12 + i * (ch + 8), show = m.phase === 'SHOW' || G.level === 0, cur = m.phase === 'DO' && i === m.step, done = m.phase !== 'SHOW' && i < m.step || m.phase === 'WIN';
        AK.rrect(ctx, x0, y, w0, ch, 16); ctx.fillStyle = done ? 'rgba(34,197,94,0.35)' : cur ? 'rgba(253,224,71,0.25)' : 'rgba(255,255,255,0.1)'; ctx.fill(); ctx.strokeStyle = cur ? '#fde047' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3; ctx.stroke();
        EDU.text(ctx, toAr(i + 1), x0 + 18, y + 18, 22, '#fde047');
        if (done) EDU.text(ctx, '✅', x0 + w0 / 2, y + ch / 2, ch * 0.5, '#fff');
        else if (show || cur && G.level < 2) { AK.emoji(ctx, MOVES[k].e, x0 + w0 * 0.25, y + ch / 2, ch * 0.55); EDU.text(ctx, MOVES[k].t, x0 + w0 * 0.62, y + ch / 2, AK.fit(ctx, MOVES[k].t, w0 * 0.5, 20), '#fff'); }
        else EDU.text(ctx, '❓', x0 + w0 / 2, y + ch / 2, ch * 0.5, '#94a3b8');
      });
      noBody(G, ctx); G.drawAssist('✔ تمّ الأمر بمساعدة');
    }
  });
  const baseOf = (G, k) => (MOVES[k].ev ? G.body[MOVES[k].ev] : 0);
  function nextMem(G) {
    if (G.qi >= G.rounds) { G.finishLevel(); return; }
    const lv = G.level, n = [1, 2, 3, 2, 3 + (G.qi % 2)][lv], pool = lv < 3 ? SEATED : ALLM, m = G.mm;
    const seq = []; while (seq.length < n) { const k = pick(pool); if (seq[seq.length - 1] !== k) seq.push(k); }
    if (lv >= 3 && !seq.some((k) => !MOVES[k].seat)) seq[rand(0, n - 1)] = pick(['jump', 'squat']);
    m.seq = seq; m.step = 0; m.phase = 'SHOW'; m.t = G.now; m.showMs = lv === 0 ? 2500 : 1800 * n + 1500;
    setTimeout(() => EDU.speak(seq.map((k) => MOVES[k].t).join(' ثم ')), 300);
  }

  /* ============ ١٤) لا تتحرّك ============ */
  const COPY = [{ e: '🙌', t: 'ارفع ذراعيك', chk: (G) => G.pf.armsUp }, { e: '🤸', t: 'افتح ذراعيك', chk: (G) => G.pf.armsOut }, { e: '🙆', t: 'ضع يدك على رأسك', chk: (G) => G.pf.handHead }, { e: '🤗', t: 'المس كتفك', chk: (G) => G.pf.shoulders }];
  reg('acc-dont-move', {
    title: 'لا تتحرّك', emoji: '🚦', color: '#22c55e', bg1: '#0f3d22', bg2: '#030c07',
    help: '🟢 <b>أخضر</b>: قلّد الحركة المعروضة. 🔴 <b>أحمر</b>: <b>تجمّد</b> ولا تتحرك حتى يعود الأخضر!',
    levels: [{ name: 'بطيء', sub: 'وقت طويل' }, { name: 'عادي', sub: '' }, { name: 'أسرع', sub: '' }, { name: 'سريع', sub: '' }, { name: 'تحدّي التجمّد', sub: 'تجمّد أطول' }],
    start(G, lv) { G.begin(8); G.dm = { sig: null, me: 0, prev: null, freeze: 0 }; nextSig(G); },
    update(G, now, dt) {
      const d = G.dm; if (waiting(G)) return;
      // طاقة الحركة
      const pts = [0, 11, 12, 13, 14, 15, 16].map((i) => G.J(i)); let e = 0, c = 0;
      if (d.prev && G.sw) pts.forEach((p, i) => { if (p && d.prev[i]) { e += dist(p, d.prev[i]) / G.sw; c++; } });
      d.prev = pts; d.me += ((c ? e / c / Math.max(dt, 0.001) : 0) - d.me) * 0.2;
      const left = d.until - now; let done = G.checkAssist();
      if (d.sig === 'green') {
        if (G.pf.ok && G.held('cp', d.mv.chk(G), 0.5, dt)) done = true;
        if (done) { G.praise(); pauseNext(G, 1400, () => { G.qi++; nextSig(G); }); d.sig = 'wait'; return; }
        if (left <= 0) { G.oops('لا بأس، المرة القادمة! 💪'); pauseNext(G, 1200, () => { G.qi++; nextSig(G); }); d.sig = 'wait'; }
      } else if (d.sig === 'red') {
        if (d.me > 0.55 && G.pf.ok) { if (d.freeze > 0.3) G.say('تجمّد! ✋', 900); d.freeze = 0; } else d.freeze += dt;
        if (d.freeze >= d.need || done) { G.praise(); pauseNext(G, 1400, () => { G.qi++; nextSig(G); }); d.sig = 'wait'; return; }
        if (left <= 0) { G.oops('حاول التجمّد مرة أخرى! 💪'); pauseNext(G, 1200, () => { G.qi++; nextSig(G); }); d.sig = 'wait'; }
      }
    },
    draw(G, ctx, now, dt) {
      const d = G.dm, g = d.sig === 'green', r = d.sig === 'red';
      if (g || r) { ctx.fillStyle = g ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.28)'; ctx.fillRect(0, 0, G.w, G.h); }
      G.drawBodyCam({ x: G.w * 0.25, y: G.hh, w: G.w * 0.75, h: G.h - G.hh - 60 });
      G.header(g ? 'أخضر! قلّد الحركة' : r ? 'أحمر! تجمّد!' : 'استعد…', g ? d.mv.t : r ? 'لا تتحرك حتى يصبح أخضر' : '');
      const cx = G.w * 0.125, cy = G.hh + (G.h - G.hh) * 0.3;
      AK.emoji(ctx, g ? '🟢' : r ? '🔴' : '⚪', cx, cy, Math.min(G.w * 0.2, 150));
      if (g) AK.emoji(ctx, d.mv.e, cx, cy + Math.min(G.w * 0.2, 150), Math.min(G.w * 0.14, 110));
      if (r) { const p = clamp(d.freeze / d.need, 0, 1); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(cx - 60, cy + 110, 120, 14); ctx.fillStyle = '#fff'; ctx.fillRect(cx - 60, cy + 110, 120 * p, 14); EDU.text(ctx, '🧊', cx, cy + 150, 40, '#fff'); }
      noBody(G, ctx); G.drawAssist();
    }
  });
  function nextSig(G) {
    const d = G.dm; if (G.qi >= G.rounds) { G.finishLevel(); return; }
    const lv = G.level, red = G.qi % 2 === 1 ? Math.random() < 0.75 : Math.random() < 0.3;
    d.freeze = 0; d.prev = null; G.hs = {};
    if (red) { d.sig = 'red'; d.need = [3, 3, 3.5, 4, 5.5][lv]; d.until = G.now + (d.need + 6) * 1000; EDU.speak('أحمر! تجمّد'); }
    else { d.sig = 'green'; d.mv = pick(COPY.slice(0, lv < 2 ? 2 : 4)); d.until = G.now + [12, 9, 7, 6, 6][lv] * 1000; EDU.speak('أخضر! ' + d.mv.t); }
  }

  /* ============ ١٦) لعبة القائد ============ */
  const POSES = {
    stand: [[1.9, 1.9], [1.24, 1.24]], armsUp: [[-2.3, -2.3], [-0.84, -0.84]], armsOut: [[Math.PI, Math.PI], [0, 0]],
    leftUp: [[-2.3, -2.3], [1.3, 1.3]], rightUp: [[1.84, 1.84], [-0.84, -0.84]], handsHead: [[Math.PI, -1.2], [0, -1.94]], squat: [[1.7, 1.7], [1.44, 1.44]]
  };
  const PN = { armsUp: 'ارفع ذراعيك', armsOut: 'افتح ذراعيك', leftUp: 'ارفع الذراع اليسرى', rightUp: 'ارفع الذراع اليمنى', handsHead: 'يداك على رأسك', squat: 'اجلس القرفصاء' };
  const classify = (f) => (!f.ok ? null : f.handsHead ? 'handsHead' : f.armsUp ? 'armsUp' : f.armsOut ? 'armsOut' : f.upL && !f.upR ? 'leftUp' : f.upR && !f.upL ? 'rightUp' : f.squat ? 'squat' : null);
  function figure(ctx, cx, cy, s, pose, color, o) {
    const [L, R] = POSES[pose] || POSES.stand, sq = pose === 'squat' ? 0.25 * s : 0, neck = cy - 0.5 * s + sq, hip = cy + 0.2 * s + sq * 0.6;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.moveTo(cx, neck); ctx.lineTo(cx, hip); ctx.stroke();
    const arm = (sx, a) => { const ex = sx + Math.cos(a[0]) * s * 0.38, ey = neck + 0.05 * s + Math.sin(a[0]) * s * 0.38; ctx.beginPath(); ctx.moveTo(sx, neck + 0.05 * s); ctx.lineTo(ex, ey); ctx.lineTo(ex + Math.cos(a[1]) * s * 0.38, ey + Math.sin(a[1]) * s * 0.38); ctx.stroke(); };
    arm(cx - s * 0.05, L); arm(cx + s * 0.05, R);
    const kx = pose === 'squat' ? s * 0.38 : s * 0.16; ctx.beginPath(); ctx.moveTo(cx, hip); ctx.lineTo(cx - kx, hip + s * 0.45 - sq * 0.4); ctx.moveTo(cx, hip); ctx.lineTo(cx + kx, hip + s * 0.45 - sq * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, neck - s * 0.22, s * 0.2, 0, 7); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.05; ctx.stroke();
    if (o.hat) { ctx.fillStyle = o.hat; ctx.beginPath(); ctx.moveTo(cx - s * 0.22, neck - s * 0.33); ctx.lineTo(cx, neck - s * 0.7); ctx.lineTo(cx + s * 0.22, neck - s * 0.33); ctx.closePath(); ctx.fill(); }
    if (o.crown) AK.emoji(ctx, '👑', cx, neck - s * 0.55, s * 0.38);
    ctx.restore();
  }
  const FCOL = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'], FNAME = ['الأحمر', 'الأزرق', 'الأخضر', 'البرتقالي', 'البنفسجي'];
  reg('acc-leader', {
    title: 'لعبة القائد', emoji: '👑', color: '#facc15', bg1: '#4d3a06', bg2: '#0e0a02',
    help: 'عدة شخصيات تتحرك، لكن <b>القائد وحده</b> هو من تقلّده! اعرف القائد ثم قلّد حركته وتجاهل الباقين.',
    levels: [{ name: 'القائد بالتاج', sub: 'ثلاث شخصيات' }, { name: 'القائد بالقبعة', sub: 'حسب اللون' }, { name: 'حسب لون الملابس', sub: 'أربع شخصيات' }, { name: 'حسب المكان', sub: 'الأول من اليمين…' }, { name: 'خمس شخصيات', sub: 'تحدّي' }],
    start(G, lv) { G.begin(3); G.ld = { fig: [], seq: [], step: 0, lead: 0, clue: '' }; nextLead(G); },
    update(G, now, dt) {
      const d = G.ld; if (waiting(G)) return;
      d.fig.forEach((f, i) => { if (i !== d.lead && now > f.next) { f.pose = pick(Object.keys(POSES)); f.next = now + 1400 + Math.random() * 1200; } });
      const target = d.seq[d.step], mine = classify(G.pf); let done = G.checkAssist();
      if (G.held('lead', mine === target, 0.6, dt)) done = true;
      const others = d.fig.filter((f, i) => i !== d.lead).map((f) => f.pose);
      if (mine && mine !== target && others.includes(mine) && G.held('wrong', true, 0.9, dt) && now - (d.lastWrong || 0) > 3500) { d.lastWrong = now; G.oops('قلّد القائد فقط 👑'); }
      if (done) {
        d.step++; EDU.fx.burst(G.w / 2, G.h * 0.3, ['#fde047', '#4ade80'], 24); GC.beep(700, 0.12, 'triangle', 0.14);
        if (d.step >= d.seq.length) { G.praise(); pauseNext(G, 1800, () => { G.qi++; nextLead(G); }); d.done = true; } else d.fig[d.lead].pose = d.seq[d.step];
      }
    },
    draw(G, ctx, now, dt) {
      const d = G.ld; G.drawBodyCam({ x: G.w * 0.3, y: G.h * 0.56, w: G.w * 0.4, h: G.h * 0.4 });
      G.header('من هو القائد؟ قلّده فقط', d.clue);
      const n = d.fig.length, zone = { x: 10, y: G.hh + 4, w: G.w - 20, h: G.h * 0.56 - G.hh - 8 }, s = Math.min(zone.h * 0.46, zone.w / n * 0.7, 150);
      d.fig.forEach((f, i) => {
        const cx = zone.x + zone.w - (i + 0.5) * (zone.w / n), cy = zone.y + zone.h * 0.66;
        const lead = i === d.lead && !d.done;
        if (d.done && i === d.lead) { ctx.beginPath(); ctx.arc(cx, cy, s * 0.8, 0, 7); ctx.fillStyle = 'rgba(253,224,71,0.15)'; ctx.fill(); }
        figure(ctx, cx, cy, s, f.pose, f.color, { hat: f.hat, crown: d.showCrown && i === d.lead });
      });
      const t = d.seq[d.step] || d.seq[d.seq.length - 1];
      AK.rrect(ctx, 10, G.h * 0.56 + 6, G.w * 0.27, 70, 16); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
      EDU.text(ctx, '👑 ' + (PN[t] || ''), 10 + G.w * 0.135, G.h * 0.56 + 41, AK.fit(ctx, '👑 ' + (PN[t] || ''), G.w * 0.25, 20), '#fde047');
      noBody(G, ctx); G.drawAssist('✔ قلّدتُ القائد بمساعدة');
    }
  });
  function nextLead(G) {
    if (G.qi >= G.rounds) { G.finishLevel(); return; }
    const lv = G.level, n = [3, 3, 4, 4, 5][lv], d = G.ld, cols = shuffle([0, 1, 2, 3, 4]).slice(0, n);
    d.lead = rand(0, n - 1); d.done = false; d.step = 0; d.showCrown = lv === 0; d.lastWrong = 0;
    const keys = Object.keys(PN); d.seq = shuffle(keys).slice(0, 2 + (lv >= 2 ? 1 : 0));
    d.fig = cols.map((c, i) => ({ color: FCOL[c], hat: lv === 1 ? FCOL[c] : null, pose: i === d.lead ? d.seq[0] : pick(keys), next: G.now + 800 + Math.random() * 1500 }));
    d.clue = lv === 0 ? 'القائد يلبس التاج' : lv === 1 ? `القائد صاحب القبعة ${FNAME[cols[d.lead]]}` : lv === 2 || lv === 4 ? `القائد يلبس اللون ${FNAME[cols[d.lead]]}` : ['الأول من اليمين', 'الثاني من اليمين', 'الثالث من اليمين', 'الرابع من اليمين'][d.lead];
    if (lv === 4) d.fig.forEach((f) => { f.hat = f.color; });
    setTimeout(() => EDU.speak(d.clue), 300);
  }

  /* ============ ٧) ارسم الحرف في الهواء ============ */
  const LETTER_SETS = [['ا', 'ل', 'و', 'د', 'ر'], ['ب', 'ت', 'ن', 'ي', 'س'], ['ج', 'ح', 'خ', 'ع', 'ف'], ['ق', 'ك', 'م', 'ه', 'ص'], ['ش', 'ض', 'ط', 'غ', 'ز', 'ث']];
  reg('acc-draw-letter', {
    mode: 'hand',
    title: 'ارسم الحرف', emoji: '✍️', color: '#38bdf8', bg1: '#0c3a5c', bg2: '#030b14',
    help: 'يظهر حرف على الشاشة. <b>ارسمه في الهواء</b> بإصبعك السبّابة فوق الحرف! بعد الانتهاء ثبّت إصبعك على «تم».',
    levels: [{ name: 'حروف سهلة', sub: 'ا ل و د ر' }, { name: 'حروف متوسطة', sub: 'ب ت ن ي س' }, { name: 'حروف أصعب', sub: 'ج ح خ ع ف' }, { name: 'حروف أخرى', sub: 'الدليل يختفي' }, { name: 'تحدّي', sub: 'بلا دليل' }],
    start(G, lv) { G.begin(4); G.dl = { letters: shuffle(LETTER_SETS[lv]).slice(0, 4), strokes: [], last: null, cov: 0, pre: 0, t0: 0 }; nextLetter(G); },
    update(G, now, dt) {
      const d = G.dl; if (waiting(G)) return;
      const a = d.area;
      if (G.ptr.on && a && G.ptr.x > a.x && G.ptr.x < a.x + a.s && G.ptr.y > a.y && G.ptr.y < a.y + a.s) {
        const p = { x: G.ptr.x - a.x, y: G.ptr.y - a.y };
        if (!d.last || dist(p, d.last) < a.s * 0.25) { if (d.last && dist(p, d.last) > 1.5) { d.sctx.beginPath(); d.sctx.moveTo(d.last.x, d.last.y); d.sctx.lineTo(p.x, p.y); d.sctx.stroke(); d.dirty = true; } d.pts.push(p); }
        d.last = p;
      } else d.last = null;
      d.chk = (d.chk || 0) + dt;
      if (d.dirty && d.chk > 0.4) { d.chk = 0; d.dirty = false; score(G); const thr = [0.5, 0.55, 0.58, 0.6, 0.62][G.level]; if (d.cov >= thr && d.prec >= 0.5) win(G); }
      const k = G.pick(d.btns, dt);
      if (k === 0) { if (d.cov >= 0.35) win(G); else { G.say('ارسم الحرف أولاً ✍️', 1400); } }
      else if (k === 1) clearDraw(G);
    },
    draw(G, ctx, now, dt) {
      const d = G.dl, a = d.area; if (!a) return;
      G.drawThumb();
      G.header('ارسم الحرف في الهواء', `الحرف «${d.letter}»`);
      ctx.save(); AK.rrect(ctx, a.x - 8, a.y - 8, a.s + 16, a.s + 16, 24); ctx.fillStyle = 'rgba(255,248,231,0.95)'; ctx.fill(); ctx.restore();
      const guideA = G.level === 0 ? 0.35 : G.level === 1 ? 0.2 : G.level === 2 ? 0.12 : G.level === 3 ? clamp(0.2 - (now - d.t0) / 12000, 0, 0.2) : 0;
      if (guideA > 0) { ctx.globalAlpha = guideA * 2.2; ctx.drawImage(d.guide, a.x, a.y, a.s, a.s); ctx.globalAlpha = 1; }
      ctx.drawImage(d.stroke, a.x, a.y, a.s, a.s);
      if (G.level === 4) EDU.text(ctx, d.letter, a.x + a.s - 36, a.y + 34, 48, 'rgba(15,23,42,0.35)');
      if (G.ptr.on && G.ptr.x > a.x && G.ptr.x < a.x + a.s && G.ptr.y > a.y && G.ptr.y < a.y + a.s) { ctx.beginPath(); ctx.arc(G.ptr.x, G.ptr.y, a.s * 0.04, 0, 7); ctx.fillStyle = 'rgba(14,116,144,0.8)'; ctx.fill(); }
      d.btns.forEach((b, i) => {
        AK.rrect(ctx, b.x, b.y, b.w, b.h, 22); ctx.fillStyle = i === 0 ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.15)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.stroke(); G.ring(b, i);
        EDU.text(ctx, i === 0 ? '✔ تم' : '🧽 مسح', b.x + b.w / 2, b.y + b.h / 2, 24, '#fff');
      });
      const p = clamp(d.cov / 0.6, 0, 1); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(a.x, a.y + a.s + 14, a.s, 8); ctx.fillStyle = '#4ade80'; ctx.fillRect(a.x, a.y + a.s + 14, a.s * p, 8);
    }
  });
  function nextLetter(G) {
    const d = G.dl; if (G.qi >= G.rounds) { G.finishLevel(); return; }
    d.letter = d.letters[G.qi % d.letters.length];
    const s = Math.floor(Math.min(G.w * 0.62, G.h - G.hh - 90)), ax = G.w / 2 - s / 2 - (G.w > 700 ? G.w * 0.08 : 0), ay = G.hh + 14;
    d.area = { x: ax, y: ay, s };
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = s; return c; };
    d.guide = mk(); d.stroke = mk(); d.sctx = d.stroke.getContext('2d'); d.sctx.lineWidth = s * 0.075; d.sctx.lineCap = d.sctx.lineJoin = 'round'; d.sctx.strokeStyle = '#0e7490';
    const g = d.guide.getContext('2d'); g.font = `900 ${s * 0.85}px Tahoma`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#334155'; g.fillText(d.letter, s / 2, s * 0.55);
    // قناع للتقييم (٦٤×٦٤): الحرف نفسه، وحرف موسّع للدقة
    const m = (grow) => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = `900 ${64 * 0.85}px Tahoma`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = x.strokeStyle = '#000'; x.lineWidth = grow; x.lineJoin = 'round'; if (grow) x.strokeText(d.letter, 32, 35); x.fillText(d.letter, 32, 35); return x.getImageData(0, 0, 64, 64).data; };
    d.mask = m(0); d.maskBig = m(9);
    d.pts = []; d.last = null; d.cov = 0; d.prec = 1; d.dirty = false; d.t0 = G.now;
    const bw = Math.min(200, G.w * 0.22), bx = ax + s + 24 > G.w - bw - 10 ? G.w - bw - 10 : ax + s + 24;
    d.btns = [{ x: bx, y: G.hh + 40, w: bw, h: 80 }, { x: bx, y: G.hh + 140, w: bw, h: 80 }];
    if (G.w < 700) d.btns = [{ x: G.w - bw - 8, y: G.h - 70, w: bw, h: 60 }, { x: 8, y: G.h - 70, w: bw, h: 60 }];
    setTimeout(() => EDU.speak('ارسم حرف ' + d.letter), 300);
  }
  function score(G) {
    const d = G.dl, c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.drawImage(d.stroke, 0, 0, 64, 64);
    const sd = x.getImageData(0, 0, 64, 64).data; let m = 0, hit = 0, sp = 0, inBig = 0;
    for (let i = 3; i < sd.length; i += 4) { const mk = d.mask[i] > 100, st = sd[i] > 60; if (mk) { m++; if (st) hit++; } if (st) { sp++; if (d.maskBig[i] > 100) inBig++; } }
    d.cov = m ? hit / m : 0; d.prec = sp ? inBig / sp : 1;
  }
  function win(G) { const d = G.dl; if (d.won) return; d.won = true; G.praise(); const prev = d.letter; pauseNext(G, 1800, () => { d.won = false; G.qi++; nextLetter(G); }); }
  function clearDraw(G) { const d = G.dl; d.sctx.clearRect(0, 0, d.area.s, d.area.s); d.cov = 0; d.prec = 1; d.pts = []; d.last = null; }

  /* ============ ١٨) أشكال في بيتي ============ */
  const HOME = [['circle', 'دائرة', 'كوب أو صحن أو كرة'], ['square', 'مربع', 'علبة أو منديل'], ['triangle', 'مثلث', 'قطعة بيتزا أو مسطرة مثلثة'], ['rect', 'مستطيل', 'كتاب أو هاتف'], ['star', 'نجمة', 'لعبة أو ورقة مقصوصة']];
  reg('acc-shapes-home', {
    mode: 'hand',
    title: 'أشكال في بيتي', emoji: '🏠', color: '#a3e635', bg1: '#233d0a', bg2: '#080d02',
    help: 'تطلب منك الشاشة شيئاً على <b>شكل معيّن</b> (دائرة، مربع…). <b>أحضره من بيتك</b> وأرِه للكاميرا، ثم ثبّت إصبعك على «أحضرتُه» (أو يضغط المرافق). نلتقط لك صورة تذكارية!',
    levels: [{ name: 'دائرة ومربع', sub: '' }, { name: 'مثلث ومستطيل', sub: '' }, { name: 'كل الأشكال', sub: 'مع نجمة' }, { name: 'شكل ولون', sub: 'تحدّي' }, { name: 'شيئان', sub: 'من كل شكل' }],
    start(G, lv) {
      G.begin(lv === 4 ? 2 : 3); const pool = [[0, 1], [2, 3], [0, 1, 2, 3, 4], [0, 1, 2, 3], [0, 2, 3]][lv];
      G.sh = { order: shuffle(pool), snaps: [], need: 1, got: 0 }; nextShape(G);
    },
    update(G, now, dt) {
      const s = G.sh; if (waiting(G)) return;
      const k = G.pick([s.btn], dt);
      if (k === 0) {
        s.got++;
        if (s.got < s.need) { G.say('ممتاز! أحضر الثاني 🎉', 1600); GC.beep(600, 0.15, 'triangle', 0.14); return; }
        try { const c = document.createElement('canvas'); c.width = 160; c.height = 120; const x = c.getContext('2d'); x.translate(160, 0); x.scale(-1, 1); x.drawImage(G.video, 0, 0, 160, 120); s.snaps.push(c); } catch (e) { /* تجاهل */ }
        G.praise(); pauseNext(G, 2200, () => { G.qi++; nextShape(G); });
      }
    },
    draw(G, ctx, now, dt) {
      const s = G.sh, [kind, name, ex] = HOME[s.cur], L = G.level;
      G.header(`أحضر شيئاً على شكل ${name}`, L === 3 ? `ولونه ${s.col[0]}` : `مثل: ${ex}`);
      // البطاقة اليمنى: الشكل المطلوب
      const lw = G.w * 0.34, lh = G.h - G.hh - 140, lx = G.w - lw - 12, ly = G.hh + 10;
      AK.rrect(ctx, lx, ly, lw, lh, 22); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.stroke();
      const r = Math.min(lw, lh) * 0.3; AK.drawShape(ctx, kind, lx + lw / 2, ly + lh * 0.45 + Math.sin(now / 400) * 6, r, L === 3 ? s.col[1] : '#fde047', '#fff');
      EDU.text(ctx, name + (s.need > 1 ? ` (${toAr(s.got + 1)}/${toAr(s.need)})` : ''), lx + lw / 2, ly + lh * 0.88, clamp(lw * 0.14, 18, 34), '#fff');
      // الكاميرا
      const area = { x: 12, y: G.hh + 10, w: G.w - lw - 36, h: lh }; const vr = EDU.fitRect(G.video, area);
      if (G.cameraOK) EDU.drawVideo(ctx, G.video, vr, 0.95); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3; ctx.strokeRect(vr.x, vr.y, vr.w, vr.h);
      ctx.save(); ctx.setLineDash([14, 10]); ctx.globalAlpha = 0.8; AK.drawShape(ctx, kind, vr.x + vr.w / 2, vr.y + vr.h / 2, Math.min(vr.w, vr.h) * 0.3, null, '#fde047'); ctx.restore();
      if (!G.cameraOK) EDU.text(ctx, '📷 الكاميرا غير متاحة', vr.x + vr.w / 2, vr.y + vr.h / 2, 24, '#fca5a5');
      // الزر
      const b = s.btn = { x: G.w / 2 - Math.min(160, G.w * 0.3), y: G.h - 100, w: Math.min(320, G.w * 0.6), h: 76 };
      AK.rrect(ctx, b.x, b.y, b.w, b.h, 38); ctx.fillStyle = 'rgba(34,197,94,0.45)'; ctx.fill(); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 4; ctx.stroke(); G.ring(b, 0);
      EDU.text(ctx, '✔ أحضرتُه!', b.x + b.w / 2, b.y + b.h / 2, 30, '#fff');
      s.snaps.forEach((c, i) => { ctx.drawImage(c, 12 + i * 90, G.h - 78, 80, 60); ctx.strokeStyle = '#fde047'; ctx.strokeRect(12 + i * 90, G.h - 78, 80, 60); });
    }
  });
  function nextShape(G) {
    const s = G.sh; if (G.qi >= G.rounds) { G.finishLevel(); return; }
    s.cur = s.order[G.qi % s.order.length]; s.got = 0; s.need = G.level === 4 ? 2 : 1; s.col = pick(Object.values(AK.COLORS));
    s.btn = s.btn || { x: 0, y: 0, w: 1, h: 1 };
    setTimeout(() => EDU.speak('أحضر شيئاً على شكل ' + HOME[s.cur][1]), 300);
  }
})();
