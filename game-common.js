/* مساعدات مشتركة للألعاب: ضبط الكانفاس للشاشات، التحكم باللمس/الفأرة/اليد، حفظ النتائج، أصوات بسيطة */
(function () {
  if (window.GC) return;
  const GC = (window.GC = {});

  /* ---------- الكانفاس: يملأ الشاشة ويدعم الشاشات عالية الدقة ---------- */
  GC.view = { w: window.innerWidth, h: window.innerHeight, dpr: 1 };

  GC.fitCanvas = function (canvas, onResize) {
    function fit() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      GC.view.w = w;
      GC.view.h = h;
      GC.view.dpr = dpr;
      if (onResize) onResize(w, h, dpr);
    }
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => setTimeout(fit, 250));
    fit();
  };

  // يُستدعى في بداية كل إطار رسم: يجعل الإحداثيات بوحدات CSS
  GC.begin = function (ctx) {
    const d = GC.view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  };

  /* ---------- المدخلات: اليد (الكاميرا) أو الإصبع/الفأرة، والأحدث يفوز ---------- */
  const input = (GC.input = { x: 0, y: 0, active: false, mode: 'none', last: 0, down: false });
  const POINTER_IDLE = 1500;

  function ignoreTarget(t) {
    return t && t.closest && t.closest('button, a, .overlay, .overlay-panel, #remote-back-btn');
  }
  function fromPointer(e, down) {
    if (ignoreTarget(e.target)) return;
    input.x = e.clientX;
    input.y = e.clientY;
    input.active = true;
    input.mode = 'pointer';
    input.last = performance.now();
    if (down !== undefined) input.down = down;
  }
  window.addEventListener('pointermove', (e) => fromPointer(e));
  window.addEventListener('pointerdown', (e) => fromPointer(e, true));
  window.addEventListener('pointerup', () => { input.down = false; });
  window.addEventListener('pointercancel', () => { input.down = false; });

  // nx, ny: إحداثيات اليد من MediaPipe (0..1). نوسّع المنطقة المفيدة حتى لا يضطر اللاعب لمد يده إلى حافة الكاميرا
  GC.setHand = function (nx, ny) {
    if (performance.now() - input.last < POINTER_IDLE) return;
    const m = 0.12;
    const cl = (v) => Math.max(0, Math.min(1, (v - m) / (1 - 2 * m)));
    input.x = cl(1 - nx) * GC.view.w;
    input.y = cl(ny) * GC.view.h;
    input.active = true;
    input.mode = 'hand';
  };
  GC.clearHand = function () {
    if (input.mode === 'hand') input.active = false;
  };

  /* ---------- الكاميرا ---------- */
  GC.startCamera = async function (video, tracker) {
    const cam = new Camera(video, {
      onFrame: async () => { await tracker.send({ image: video }); },
      width: 640,
      height: 480,
      facingMode: 'user'
    });
    await cam.start();
    return cam;
  };

  /* ---------- حفظ النتائج ---------- */
  GC.store = {
    get(key) { try { return Number(localStorage.getItem(key)) || 0; } catch (e) { return 0; } },
    set(key, v) { try { localStorage.setItem(key, String(v)); } catch (e) { /* تجاهل */ } }
  };

  /* ---------- أصوات بسيطة ---------- */
  let ac = null;
  GC.audioInit = function () {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    if (!ac) ac = new A();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  GC.beep = function (freq, dur, type, vol, delay, slideTo) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  };

  GC.vibrate = function (ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* تجاهل */ } };
})();
