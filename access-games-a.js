/* ألعاب «فذ للجميع» — مجموعة الأسئلة المصوّرة (الاختيار بالإشارة بالإصبع أو اللمس) */
(function () {
  const { pick, rand, shuffle, toAr } = AK;
  const reg = (id, spec) => { AK.defs[id] = AK.quiz(Object.assign({ id, mode: 'hand' }, spec)); };
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  // عنصر لم يُستخدم في هذا المستوى بعد
  function fresh(G, key, arr) {
    G._u = G._u || {};
    if (G.qi === 0 || !G._u[key] || G._u[key].length >= arr.length) G._u[key] = [];
    const left = arr.filter((_, i) => !G._u[key].includes(i));
    const x = pick(left); G._u[key].push(arr.indexOf(x)); return x;
  }
  AK.fresh = fresh;
  const ALPHA = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');
  AK.ALPHA = ALPHA;
  const HAR = ['َ', 'ِ', 'ُ'], HAR_N = ['فتحة', 'كسرة', 'ضمّة'];
  const WORDS = [
    ['كلب', '🐶'], ['كرة', '⚽'], ['كتاب', '📖'], ['كرسي', '🪑'], ['كيك', '🍰'], ['كولا', '🥤'], ['كرز', '🍒'], ['كنغر', '🦘'],
    ['تفاح', '🍎'], ['تاج', '👑'], ['تلفاز', '📺'], ['تمساح', '🐊'], ['توت', '🍓'], ['تلفون', '☎️'],
    ['بطة', '🦆'], ['بيت', '🏠'], ['بالون', '🎈'], ['بطيخ', '🍉'], ['بيتزا', '🍕'], ['بيض', '🥚'], ['بقرة', '🐄'],
    ['موز', '🍌'], ['مفتاح', '🔑'], ['مطر', '🌧️'], ['مانجو', '🥭'], ['مقص', '✂️'],
    ['سمكة', '🐟'], ['ساعة', '⏰'], ['سيارة', '🚗'], ['سلحفاة', '🐢'], ['سرير', '🛏️'],
    ['شمس', '☀️'], ['شجرة', '🌳'], ['شمعة', '🕯️'],
    ['جمل', '🐪'], ['جزر', '🥕'], ['جبن', '🧀'],
    ['حصان', '🐴'], ['حليب', '🥛'], ['حذاء', '👟'],
    ['خبز', '🍞'], ['خيار', '🥒'], ['خروف', '🐑'],
    ['دجاجة', '🐔'], ['دب', '🐻'], ['دراجة', '🚲'],
    ['ليمون', '🍋'], ['لحم', '🥩'], ['لعبة', '🧸'],
    ['عنب', '🍇'], ['عصفور', '🐦'], ['عين', '👁️'], ['عصير', '🧃'],
    ['فيل', '🐘'], ['فراشة', '🦋'], ['فأر', '🐭'],
    ['قمر', '🌙'], ['قطة', '🐱'], ['قلم', '✏️'],
    ['نحلة', '🐝'], ['نجمة', '⭐'], ['نظارة', '👓'],
    ['زهرة', '🌷'], ['زرافة', '🦒'], ['ذرة', '🌽'], ['ذئب', '🐺'], ['هاتف', '📱'], ['وردة', '🌹'], ['ولد', '👦'], ['يد', '✋']
  ].map(([w, e]) => ({ w, e, f: w[0] }));
  const FOOD = new Set(['كيك', 'كولا', 'كرز', 'تفاح', 'توت', 'بطيخ', 'بيتزا', 'بيض', 'موز', 'مانجو', 'سمكة', 'جزر', 'جبن', 'حليب', 'خبز', 'خيار', 'ليمون', 'لحم', 'عنب', 'عصير', 'ذرة']);

  /* ============ ٤) ما الناقص؟ ============ */
  const NEEDS = [
    { s: '🧒😋', p: 'الطفل جائع', a: { e: '🍕', t: 'بيتزا' } },
    { s: '🧒🥵', p: 'الطفل عطشان', a: { e: '💧', t: 'ماء' } },
    { s: '🧒😴', p: 'الطفل نعسان', a: { e: '🛏️', t: 'سرير' } },
    { s: '🧒🖐️💩', p: 'يدا الطفل متسختان', a: { e: '🧼', t: 'صابون' } },
    { s: '🧒🌧️', p: 'المطر ينزل', a: { e: '☂️', t: 'مظلة' } },
    { s: '🧒🥶', p: 'الطفل يشعر بالبرد', a: { e: '🧥', t: 'معطف' } },
    { s: '🧒📄', p: 'الطفل يريد أن يكتب', a: { e: '✏️', t: 'قلم' } },
    { s: '🧒☀️', p: 'الشمس قوية', a: { e: '🧢', t: 'قبعة' } },
    { s: '🧒🦷', p: 'الطفل يريد تنظيف أسنانه', a: { e: '🪥', t: 'فرشاة' } }
  ];
  const THINGS = [{ e: '🛏️', t: 'سرير' }, { e: '⚽', t: 'كرة' }, { e: '☂️', t: 'مظلة' }, { e: '✏️', t: 'قلم' }, { e: '🚗', t: 'سيارة' }, { e: '🧸', t: 'دمية' }, { e: '🎈', t: 'بالون' }, { e: '🍕', t: 'بيتزا' }, { e: '🧼', t: 'صابون' }, { e: '🧥', t: 'معطف' }];
  const FEEL = [
    { s: '🎁🎉', p: 'الطفل فتح هدية', a: { e: '😀', t: 'سعيد' } },
    { s: '🧸💔', p: 'لعبة الطفل انكسرت', a: { e: '😢', t: 'حزين' } },
    { s: '🐍', p: 'ظهر ثعبان أمام الطفل', a: { e: '😨', t: 'خائف' } },
    { s: '👦🧸🏃', p: 'أخذ أحدهم لعبة الطفل', a: { e: '😠', t: 'غاضب' } },
    { s: '⛈️', p: 'سمع الطفل رعداً قوياً', a: { e: '😨', t: 'خائف' } },
    { s: '🏆👏', p: 'فاز الطفل في المسابقة', a: { e: '🥳', t: 'فرحان' } },
    { s: '🌙🛌', p: 'تأخر الوقت في الليل', a: { e: '😴', t: 'نعسان' } },
    { s: '🎂🎈', p: 'اليوم عيد ميلاد الطفل', a: { e: '😀', t: 'سعيد' } }
  ];
  const FACES = [{ e: '😀', t: 'سعيد' }, { e: '😢', t: 'حزين' }, { e: '😨', t: 'خائف' }, { e: '😠', t: 'غاضب' }, { e: '😴', t: 'نعسان' }, { e: '🥳', t: 'فرحان' }];
  reg('acc-whats-missing', {
    title: 'ما الناقص؟', emoji: '🧩', color: '#fb923c', bg1: '#4a2208', bg2: '#0f0803',
    help: 'ترى صورة طفل وتعرف حاجته. <b>أشِر</b> إلى الشيء الذي ينقصه. في المستويات العليا تعرّف على <b>شعور</b> الطفل.',
    levels: [{ name: 'خياران', sub: 'بالكلمات' }, { name: 'ثلاثة خيارات', sub: 'بالكلمات' }, { name: 'بلا كلمات', sub: 'صور فقط' }, { name: 'المشاعر', sub: 'ثلاثة' }, { name: 'مشاعر أكثر', sub: 'أربعة بلا كلمات' }],
    gen(lv, i, G) {
      if (lv <= 2) {
        const n = fresh(G, 'n', NEEDS), cnt = lv === 0 ? 2 : 3;
        const opts = [Object.assign({ ok: true }, n.a), ...sample(THINGS.filter((x) => x.e !== n.a.e), cnt - 1)];
        return { prompt: n.p + '… ما الذي ينقصه؟', scene: { e: n.s }, options: shuffle(opts), labels: lv !== 2 };
      }
      const f = fresh(G, 'f', FEEL), cnt = lv === 3 ? 3 : 4;
      const opts = [Object.assign({ ok: true }, f.a), ...sample(FACES.filter((x) => x.t !== f.a.t), cnt - 1)];
      return { prompt: f.p + '… كيف يشعر؟', scene: { e: f.s }, options: shuffle(opts), labels: lv !== 4 };
    }
  });

  /* ============ ٥) حركة وصوت ============ */
  reg('acc-move-sound', {
    title: 'حركة وصوت', emoji: '👂', color: '#a78bfa', bg1: '#2a1458', bg2: '#080412',
    help: 'اختر <b>أنت</b> الحرف الذي تحب أن تتدرب عليه، ثم <b>استمع</b> للصوت وأشِر إلى الحرف المناسب. في المستويات العليا تعرّف على <b>الحركة</b> (فتحة، كسرة، ضمّة).',
    levels: [{ name: 'استماع قصير', sub: 'خياران' }, { name: 'ثلاثة حروف', sub: 'استماع أطول' }, { name: 'أربعة حروف', sub: 'استماع طويل' }, { name: 'الحركات', sub: 'فتحة / كسرة / ضمّة' }, { name: 'الحركات صعب', sub: 'بلا إعادة' }],
    levelCfg: [{ listen: 3, n: 2 }, { listen: 5, n: 3 }, { listen: 7, n: 4 }, {}, {}],
    gen(lv, i, G) {
      G.rounds = G.L.rounds || 6;
      if (i === 0) {
        return { prompt: 'اختر الحرف الذي تريد أن نتدرب عليه', free: true, cols: 7, labels: false, silent: false, say: 'اختر الحرف الذي تريد',
          options: ALPHA.map((c) => ({ big: c })), onPick(k) { G.letter = ALPHA[k]; } };
      }
      const L = G.letter || 'ب', hk = rand(0, 2), snd = L + HAR[hk];
      if (lv >= 3) {
        return { prompt: 'أي حركة سمعت؟', silent: true, scene: { big: L }, labels: true, onStart() { setTimeout(() => EDU.speak(snd), 500); },
          replay() { EDU.speak(snd); }, options: HAR.map((h, k) => ({ big: L + h, t: HAR_N[k], ok: k === hk })) };
      }
      const listen = [3, 5, 7][lv], n = [2, 3, 4][lv];
      return {
        prompt: 'استمع جيداً… ثم اختر الحرف', silent: true, hideSceneAfter: listen, hideLabel: '👂 استمع',
        scene: { draw(ctx, x, y, w, h, st, now) { const p = 1 + Math.sin(now / 180) * 0.08; AK.emoji(ctx, '🔊', x + w / 2, y + h / 2, h * 0.6 * p); } },
        onStart(G2, q) { for (let t = 0; t < listen; t += 1.9) setTimeout(() => { if (G2.q === q && G2.phase === 'PLAY') EDU.speak(snd); }, 400 + t * 1000); },
        replay() { EDU.speak(snd); },
        options: shuffle([{ big: L, ok: true }, ...sample(ALPHA.filter((c) => c !== L), n - 1).map((c) => ({ big: c }))])
      };
    }
  });
  AK.defs['acc-move-sound'].levels.forEach((L, i) => Object.assign(L, AK.defs['acc-move-sound'].levelCfg[i], { rounds: 6 }));

  /* ============ ٦) رتّب القصة ============ */
  const STORIES = [
    { n: 'نموّ الوردة', s: [['🌰', 'بذرة'], ['🌱', 'نبتة صغيرة'], ['🌿', 'ساق وأوراق'], ['🌷', 'زهرة']] },
    { n: 'الذهاب إلى المدرسة', s: [['🛏️', 'الاستيقاظ'], ['🚿', 'غسل الوجه'], ['🥣', 'تناول الفطور'], ['🎒', 'حمل الحقيبة'], ['🚌', 'ركوب الحافلة']] },
    { n: 'تنظيف الأسنان', s: [['🪥', 'أخذ الفرشاة'], ['🪥🧴', 'وضع المعجون'], ['😁', 'تفريش الأسنان'], ['🚰', 'غسل الفم'], ['✨', 'أسنان نظيفة']] },
    { n: 'الفراشة', s: [['🥚', 'بيضة'], ['🐛', 'يرقة'], ['🧶', 'شرنقة'], ['🦋', 'فراشة']] },
    { n: 'الكتكوت', s: [['🥚', 'بيضة'], ['🐣', 'يفقس'], ['🐥', 'كتكوت'], ['🐔', 'دجاجة']] },
    { n: 'تحضير ساندويش', s: [['🍞', 'الخبز'], ['🧈', 'نضع الزبدة'], ['🧀', 'نضع الجبن'], ['🥪', 'ساندويش جاهز'], ['😋', 'نأكل']] },
    { n: 'يوم المطر', s: [['☁️', 'غيوم'], ['🌧️', 'مطر'], ['🌈', 'قوس قزح'], ['☀️', 'شمس']] }
  ];
  reg('acc-order-story', {
    title: 'رتّب القصة', emoji: '📚', color: '#4ade80', bg1: '#0f3d22', bg2: '#030c07',
    help: 'اختر الصور <b>بالترتيب الصحيح</b>: ماذا يحدث أولاً؟ ثم ماذا؟ ثم ماذا؟',
    levels: [{ name: 'ثلاث صور', sub: 'بالكلمات' }, { name: 'أربع صور', sub: 'بالكلمات' }, { name: 'أربع صور', sub: 'بلا كلمات' }, { name: 'خمس صور', sub: 'بالكلمات' }, { name: 'خمس صور', sub: 'بلا كلمات' }],
    gen(lv, i, G) {
      const n = [3, 4, 4, 5, 5][lv], st = fresh(G, 's', STORIES.filter((x) => x.s.length >= n)), picks = [];
      for (let k = 0; k < n; k++) picks.push(Math.round((k * (st.s.length - 1)) / (n - 1)));
      const opts = picks.map((idx, k) => ({ e: st.s[idx][0], t: st.s[idx][1], ok: true, ord: k }));
      return { prompt: `قصة «${st.n}»: اختر الصور بالترتيب`, sub: 'ماذا يحدث أولاً؟', ordered: true, labels: lv % 2 === 0 || lv === 3, options: shuffle(opts), wrongMsg: 'ليست هذه الآن 🤔' };
    }
  });

  /* ============ ٨) أين الخطأ؟ ============ */
  const WRONG = [
    { a: '🐟', b: '🌲', qa: 'هل تعيش السمكة في الغابة؟', qb: 'أين تعيش السمكة؟', r: { e: '💧', t: 'الماء' }, o: [{ e: '🌲', t: 'الغابة' }, { e: '🏜️', t: 'الصحراء' }, { e: '🏔️', t: 'الجبل' }] },
    { a: '☀️', b: '🌙', qa: 'هل تظهر الشمس في الليل؟', qb: 'متى تظهر الشمس؟', r: { e: '🌞', t: 'النهار' }, o: [{ e: '🌙', t: 'الليل' }, { e: '⛈️', t: 'العاصفة' }, { e: '🌌', t: 'الظلام' }] },
    { a: '🐕', b: '🧀', qa: 'هل يأكل الكلب الجبن؟', qb: 'ماذا يأكل الكلب؟', r: { e: '🦴', t: 'عظمة' }, o: [{ e: '🧀', t: 'جبن' }, { e: '🥕', t: 'جزر' }, { e: '🍰', t: 'كيك' }] },
    { a: '🐪', b: '❄️', qa: 'هل يعيش الجمل في الثلج؟', qb: 'أين يعيش الجمل؟', r: { e: '🏜️', t: 'الصحراء' }, o: [{ e: '❄️', t: 'الثلج' }, { e: '🌊', t: 'البحر' }, { e: '🌲', t: 'الغابة' }] },
    { a: '✈️', b: '🌊', qa: 'هل تطير الطائرة تحت الماء؟', qb: 'أين تطير الطائرة؟', r: { e: '☁️', t: 'السماء' }, o: [{ e: '🌊', t: 'البحر' }, { e: '🕳️', t: 'تحت الأرض' }, { e: '🏠', t: 'البيت' }] },
    { a: '🚢', b: '🏜️', qa: 'هل تسير السفينة في الصحراء؟', qb: 'أين تسير السفينة؟', r: { e: '🌊', t: 'البحر' }, o: [{ e: '🏜️', t: 'الصحراء' }, { e: '🏔️', t: 'الجبل' }, { e: '🛣️', t: 'الطريق' }] },
    { a: '🐧', b: '🔥', qa: 'هل يعيش البطريق قرب النار؟', qb: 'أين يعيش البطريق؟', r: { e: '❄️', t: 'الثلج' }, o: [{ e: '🔥', t: 'النار' }, { e: '🏜️', t: 'الصحراء' }, { e: '🌋', t: 'البركان' }] },
    { a: '🐦', b: '🌊', qa: 'هل يعيش العصفور في قاع البحر؟', qb: 'أين يعيش العصفور؟', r: { e: '🌳', t: 'الشجرة' }, o: [{ e: '🌊', t: 'البحر' }, { e: '🕳️', t: 'تحت الأرض' }, { e: '🧊', t: 'الثلج' }] }
  ];
  const RIGHT_PAIRS = [['🐟', '💧', 'السمكة في الماء'], ['🐦', '🌳', 'العصفور على الشجرة'], ['🐕', '🦴', 'الكلب والعظمة'], ['🌙', '⭐', 'القمر والنجوم'], ['🚗', '🛣️', 'السيارة على الطريق']];
  reg('acc-whats-wrong', {
    title: 'أين الخطأ؟', emoji: '🔎', color: '#38bdf8', bg1: '#0c3a5c', bg2: '#030b14',
    help: 'تعرض الشاشة صورتين لا تتناسبان! <b>أشِر</b> إلى المكان أو الشيء الصحيح. في المستويات العليا قرّر أولاً: هل الصورة صحيحة أم خاطئة؟',
    levels: [{ name: 'خياران', sub: 'بالكلمات' }, { name: 'ثلاثة خيارات', sub: 'بالكلمات' }, { name: 'بلا كلمات', sub: 'ثلاثة' }, { name: 'صح أم خطأ؟', sub: 'قرّر' }, { name: 'اكتشف الخطأ', sub: 'ثم صحّحه' }],
    gen(lv, i, G) {
      if (lv === 3) {   // صح أم خطأ
        const good = Math.random() < 0.5;
        if (good) { const r = pick(RIGHT_PAIRS); return { prompt: 'هل هذه الصورة صحيحة؟', scene: { e: r[0] + ' ' + r[1], size: 0.8 }, options: shuffle([{ e: '✅', t: 'صحيحة', ok: true }, { e: '❌', t: 'خاطئة' }]) }; }
        const w = fresh(G, 'w', WRONG); return { prompt: 'هل هذه الصورة صحيحة؟', say: w.qa, scene: { e: w.a + ' ' + w.b, size: 0.8 }, options: shuffle([{ e: '✅', t: 'صحيحة' }, { e: '❌', t: 'خاطئة', ok: true }]) };
      }
      const w = fresh(G, 'w', WRONG), cnt = lv === 0 ? 2 : lv === 4 ? 4 : 3;
      const pool = lv === 4 ? [...w.o, { e: '🏠', t: 'البيت' }] : w.o;
      const opts = [Object.assign({ ok: true }, w.r), ...sample(pool, cnt - 1)];
      return { prompt: w.qa, sub: 'اختر الصحيح', say: w.qa + ' ' + w.qb, scene: { e: w.a + ' ' + w.b, size: 0.8 }, options: shuffle(opts), labels: lv !== 2 };
    }
  });

  /* ============ ١٠) المحقق الصغير ============ */
  const COLS = Object.values(AK.COLORS);
  function roomScene(sc) {
    return (ctx, x, y, w, h) => {
      const fl = y + h * 0.82;
      ctx.fillStyle = 'rgba(251,191,36,0.18)'; ctx.fillRect(x + 8, fl, w - 16, h * 0.14);
      const u = Math.min(h * 0.55, w / 6);
      // الباب (يمين)
      const dx = x + w - u * 1.15, dh = u * 1.7;
      AK.rrect(ctx, dx, fl - dh + 4, u * 0.85, dh, 6); ctx.fillStyle = sc.door[1]; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(dx + u * 0.68, fl - dh * 0.45, 5, 0, 7); ctx.fillStyle = '#fde047'; ctx.fill();
      // الكرسي والكرة (يسار)
      const cx = x + u * 1.3, cy = fl - u * 0.5;
      AK.emoji(ctx, '🪑', cx, cy, u * 1.2);
      const off = { under: [0, u * 0.42], over: [0, -u * 0.78], beside: [u * 0.95, u * 0.2] }[sc.pos];
      AK.emoji(ctx, '⚽', cx + off[0], cy + off[1], u * 0.42);
      // الطاولة والتفاح (وسط)
      const tx = x + w * 0.5, tw = u * 2.4;
      ctx.fillStyle = '#92400e'; ctx.fillRect(tx - tw / 2, fl - u * 0.5, tw, u * 0.12); ctx.fillRect(tx - tw / 2 + 8, fl - u * 0.4, 8, u * 0.4); ctx.fillRect(tx + tw / 2 - 16, fl - u * 0.4, 8, u * 0.4);
      for (let k = 0; k < sc.apples; k++) AK.emoji(ctx, '🍎', tx - tw / 2 + 18 + (k % 5) * (tw - 30) / 4.2, fl - u * 0.7 - Math.floor(k / 5) * u * 0.32, u * 0.34);
    };
  }
  reg('acc-detective', {
    title: 'المحقق الصغير', emoji: '🕵️', color: '#f59e0b', bg1: '#3d2a08', bg2: '#0d0803',
    help: 'انظر جيداً إلى الصورة، ثم تختفي! <b>أشِر</b> إلى الإجابة: أين الكرة؟ كم تفاحة؟ ما لون الباب؟',
    levels: [{ name: 'الصورة تبقى', sub: 'سهل' }, { name: 'تذكّر ٩ ثوان', sub: '' }, { name: 'تذكّر ٦ ثوان', sub: '' }, { name: 'تذكّر ٤ ثوان', sub: '' }, { name: 'تذكّر ٣ ثوان', sub: 'صعب' }],
    gen(lv, i, G) {
      const sc = { pos: pick(['under', 'over', 'beside']), apples: rand(1, 5), door: pick(COLS) };
      const kind = ['pos', 'apples', 'door'][i % 3 === 0 ? rand(0, 2) : (i + lv) % 3];
      const hide = [0, 9, 6, 4, 3][lv];
      const q = { scene: { draw: roomScene(sc) }, sceneH: 0.4, hideSceneAfter: hide || undefined };
      if (kind === 'pos') {
        const names = { under: 'تحت الكرسي', over: 'فوق الكرسي', beside: 'بجانب الكرسي' }, em = { under: '⬇️', over: '⬆️', beside: '➡️' };
        return Object.assign(q, { prompt: 'أين كانت الكرة؟', options: Object.keys(names).map((k) => ({ e: em[k], t: names[k], ok: k === sc.pos })) });
      }
      if (kind === 'apples') {
        const set = new Set([sc.apples]); while (set.size < 3) set.add(rand(1, 5));
        return Object.assign(q, { prompt: 'كم تفاحة كانت في الصورة؟', options: shuffle([...set]).map((n) => ({ big: toAr(n), t: '', ok: n === sc.apples, c: '#fde047' })), labels: false });
      }
      const oc = shuffle([sc.door, ...sample(COLS.filter((c) => c[0] !== sc.door[0]), 2)]);
      return Object.assign(q, { prompt: 'ما لون الباب؟', options: oc.map((c) => ({ shape: 'circle', c: c[1], t: c[0], ok: c[0] === sc.door[0] })) });
    }
  });

  /* ============ ١١) استمع ثم تكلّم ============ */
  const PAIRS = [['ك', 'ت'], ['ب', 'م'], ['س', 'ش'], ['ر', 'ل'], ['ع', 'غ'], ['ح', 'ه'], ['د', 'ذ'], ['ف', 'ث'], ['ص', 'س'], ['ق', 'ك']];
  const basket = (L) => ({ draw(ctx, cx, cy, s) { AK.emoji(ctx, '🧺', cx, cy, s * 1.0); EDU.text(ctx, L, cx, cy + s * 0.12, s * 0.5, '#fff', '#000'); } });
  reg('acc-listen-speak', {
    title: 'استمع ثم تكلّم', emoji: '🧺', color: '#f472b6', bg1: '#4a1238', bg2: '#0e030a',
    help: 'اسمع الصوت ثم ضعه في <b>السلة</b> الصحيحة بالإشارة. بعد كل إجابة يمكنك أن <b>تقلّد الصوت</b> بصوتك إن أحببت — ليس مطلوباً!',
    levels: [{ name: 'صوتان مختلفان', sub: 'سلتان' }, { name: 'صوتان متقاربان', sub: 'سلتان' }, { name: 'ثلاث سلال', sub: 'أصوات' }, { name: 'كلمات', sub: 'أول حرف' }, { name: 'كلمات', sub: 'ثلاث سلال' }],
    gen(lv, i, G) {
      const easy = [['ب', 'ك'], ['م', 'س'], ['ر', 'ف'], ['ت', 'ج'], ['ل', 'ش']];
      if (lv <= 2) {
        const letters = lv === 0 ? pick(easy) : lv === 1 ? pick(PAIRS) : sample(ALPHA.filter((c) => 'بتسمركلعدف'.includes(c)), 3);
        const t = pick(letters), snd = t + HAR[rand(0, 2)];
        return { prompt: 'استمع ثم ضع الصوت في السلة الصحيحة', silent: true, say: snd, scene: { e: '🔊', size: 0.7 }, sceneH: 0.22, onStart() { setTimeout(() => EDU.speak(snd), 500); }, replay() { EDU.speak(snd); },
          options: letters.map((L) => Object.assign(basket(L), { ok: L === t })), labels: false, onComplete() { setTimeout(() => AK.G && AK.G.say('🗣️ قلّدني إن أحببت: ' + t, 2200), 900); } };
      }
      const L3 = lv === 3 ? pick(PAIRS) : sample('بتسمكلعمف'.split(''), 3);
      const t = pick(L3), w = pick(WORDS.filter((x) => x.f === t));
      return { prompt: 'بأي حرف تبدأ هذه الكلمة؟', silent: true, scene: { e: w.e, size: 0.8 }, sceneH: 0.3, onStart() { setTimeout(() => EDU.speak(w.w), 500); }, replay() { EDU.speak(w.w); },
        options: L3.map((L) => Object.assign(basket(L), { ok: L === t })), labels: false, onComplete() { setTimeout(() => AK.G && AK.G.say('🗣️ قل: ' + w.w, 2200), 900); } };
    }
  });

  /* ============ ١٢) الممثل الصغير ============ */
  reg('acc-little-actor', {
    title: 'الممثل الصغير', emoji: '🛒', color: '#34d399', bg1: '#0a3b30', bg2: '#020d0a', video: true,
    help: 'أنت الآن <b>في السوبر ماركت</b>! سترى نفسك على الشاشة. اشترِ فقط الأشياء التي <b>تبدأ بالحرف المطلوب</b> بالإشارة إليها.',
    levels: [{ name: 'حرف الكاف', sub: 'أربع بضائع' }, { name: 'حرف الباء', sub: 'ست بضائع' }, { name: 'حرف الميم', sub: 'ست بضائع' }, { name: 'حرف يختاره اللعب', sub: 'ثماني بضائع' }, { name: 'أحرف متنوعة', sub: 'تسع بضائع' }],
    gen(lv, i, G) {
      const foods = WORDS.filter((x) => FOOD.has(x.w));
      const letters = ['ك', 'ب', 'م', 'ت', 'ع', 'س', 'ل', 'ج', 'ح', 'خ'], pickL = [() => 'ك', () => 'ب', () => 'م', () => pick(letters), () => pick(letters)][lv];
      let L = pickL();
      let ok = foods.filter((x) => x.f === L); if (ok.length < 2) { L = 'ك'; ok = foods.filter((x) => x.f === L); }
      const total = [4, 6, 6, 8, 9][lv], nOk = lv === 0 ? 2 : Math.min(ok.length, lv >= 3 ? 3 : 2);
      const bad = sample(foods.filter((x) => x.f !== L), total - nOk);
      const opts = [...sample(ok, nOk).map((x) => ({ e: x.e, t: x.w, ok: true, say: x.w })), ...bad.map((x) => ({ e: x.e, t: x.w }))];
      return { prompt: `🛒 اشترِ ما يبدأ بحرف «${L}»`, say: `اشترِ الأشياء التي تبدأ بحرف ${L}`, options: shuffle(opts), labels: true, maxCard: 170 };
    }
  });

  /* ============ ١٣) الكلمة المكسورة ============ */
  function wordBoxes(word, blank, hint) {
    return (ctx, x, y, w, h, st, now) => {
      const n = word.length, bs = Math.min(h * 0.8, (w - 120) / n - 8, 90), gap = 10;
      const total = n * bs + (n - 1) * gap, x0 = x + w / 2 + total / 2 - bs;           // أول حرف من اليمين
      for (let k = 0; k < n; k++) {
        const bx = x0 - k * (bs + gap), by = y + h / 2 - bs / 2;
        AK.rrect(ctx, bx, by, bs, bs, 12);
        const isBlank = k === blank && !(st && st.complete);
        ctx.fillStyle = isBlank ? 'rgba(253,224,71,0.25)' : 'rgba(255,255,255,0.14)'; ctx.fill();
        ctx.strokeStyle = isBlank ? '#fde047' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3; ctx.stroke();
        EDU.text(ctx, isBlank ? (Math.floor(now / 500) % 2 ? '؟' : '') : word[k], bx + bs / 2, by + bs / 2, bs * 0.7, isBlank ? '#fde047' : '#fff');
      }
      if (hint) AK.emoji(ctx, hint, x + 56, y + h / 2, Math.min(h * 0.7, 80));
    };
  }
  reg('acc-broken-word', {
    title: 'الكلمة المكسورة', emoji: '🔤', color: '#60a5fa', bg1: '#0e2a5c', bg2: '#030812',
    help: 'الكلمة ينقصها حرف! <b>أشِر</b> إلى الحرف الناقص. في المستويات العليا حدّد: هل الحرف الناقص في <b>أول</b> الكلمة أم <b>وسطها</b> أم <b>آخرها</b>؟',
    levels: [{ name: 'مع صورة', sub: 'ثلاثة حروف' }, { name: 'مع صورة', sub: 'أربعة خيارات' }, { name: 'بلا صورة', sub: '' }, { name: 'أين الحرف؟', sub: 'أول / وسط / آخر' }, { name: 'تحدٍّ', sub: 'حرف ثم موضعه' }],
    gen(lv, i, G) {
      const pool = WORDS.filter((x) => x.w.length >= 3 && x.w.length <= (lv >= 4 ? 6 : 5)), wd = fresh(G, 'w', pool);
      const blank = rand(0, wd.w.length - 1), letter = wd.w[blank];
      const askPos = lv === 3 || (lv === 4 && i % 2 === 1);
      const scene = { draw: wordBoxes(wd.w, blank, lv <= 1 ? wd.e : null) };
      if (askPos) {
        const pos = blank === 0 ? 0 : blank === wd.w.length - 1 ? 2 : 1;
        return { prompt: 'أين الحرف الناقص في الكلمة؟', sub: 'أول الكلمة أم وسطها أم آخرها', say: 'أين الحرف الناقص؟', scene, sceneH: 0.3,
          options: [{ big: 'الأول', ok: pos === 0 }, { big: 'الوسط', ok: pos === 1 }, { big: 'الأخير', ok: pos === 2 }], labels: false, cols: 3, onComplete() { /* يُكشف الحرف */ } };
      }
      const cnt = lv === 0 ? 3 : 4;
      const opts = shuffle([{ big: letter, ok: true }, ...sample(ALPHA.filter((c) => c !== letter && !wd.w.includes(c)), cnt - 1).map((c) => ({ big: c }))]);
      return { prompt: 'ما الحرف الناقص؟', say: 'ما الحرف الناقص في كلمة ' + wd.w, scene, sceneH: 0.3, options: opts, labels: false };
    }
  });

  /* ============ ١٥) إشارة واحدة ============ */
  const SIM = [['🐕', '🐩'], ['🐱', '🐈'], ['🍎', '🍏'], ['🐻', '🐼'], ['😀', '😃'], ['🐦', '🐤'], ['🐢', '🐊']];
  const CATS = [
    { n: 'حيوانات المزرعة', it: ['🐄', '🐑', '🐓', '🐖', '🐴', '🐐'] },
    { n: 'الطيور', it: ['🐦', '🦅', '🦜', '🦆', '🦉', '🐧'] },
    { n: 'حيوانات أليفة', it: ['🐶', '🐱', '🐰', '🐹', '🐦', '🐠'] },
    { n: 'آكلات اللحوم', it: ['🦁', '🐯', '🐺', '🐊', '🦈', '🐆'] },
    { n: 'الخضار', it: ['🥕', '🥦', '🌽', '🥒', '🍆', '🥔'] },
    { n: 'الفواكه', it: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉'] },
    { n: 'الملابس', it: ['👕', '👖', '🧥', '👗', '🧦', '🧢'] },
    { n: 'وسائل النقل', it: ['🚗', '🚌', '🚲', '✈️', '🚢', '🚂'] }
  ];
  reg('acc-one-signal', {
    title: 'إشارة واحدة', emoji: '☝️', color: '#fb7185', bg1: '#4c1020', bg2: '#0e0308',
    help: 'كلها متشابهة إلا <b>واحدة</b> مختلفة! أشِر إليها وثبّت إصبعك. في المستويات العليا: أيها <b>لا ينتمي</b> للمجموعة؟',
    levels: [{ name: 'متشابهات', sub: 'أربعة' }, { name: 'متشابهات', sub: 'ستة' }, { name: 'من لا ينتمي؟', sub: 'حيوانات وطعام' }, { name: 'من لا ينتمي؟', sub: 'ستة' }, { name: 'من لا ينتمي؟', sub: 'تسعة' }],
    gen(lv, i, G) {
      const n = [4, 6, 4, 6, 9][lv];
      let items, odd, prompt;
      if (lv <= 1) { const p = fresh(G, 's', SIM), s = Math.random() < 0.5 ? 0 : 1; items = Array(n - 1).fill(p[s]); odd = p[1 - s]; prompt = 'أشِر إلى المختلف'; }
      else {
        const c = fresh(G, 'c', CATS), others = CATS.filter((x) => x !== c);
        const main = c.it; items = []; for (let k = 0; k < n - 1; k++) items.push(main[k % main.length]);
        const o = pick(others); odd = pick(o.it.filter((e) => !main.includes(e))); prompt = `من لا ينتمي إلى «${c.n}»؟`;
        items = shuffle(items);
      }
      const opts = shuffle([...items.map((e) => ({ e })), { e: odd, ok: true }]);
      return { prompt, say: prompt, options: opts, labels: false, cols: n <= 4 ? 5 : undefined, maxCard: 180 };
    }
  });

  /* ============ ١٧) تغيّر القاعدة ============ */
  const SH = Object.keys(AK.SHAPES).filter((k) => ['circle', 'square', 'triangle', 'star'].includes(k));
  reg('acc-change-rule', {
    title: 'تغيّرت القاعدة', emoji: '🔀', color: '#c084fc', bg1: '#33104f', bg2: '#0a0312',
    help: 'نلعب حسب <b>اللون</b> مرة، وحسب <b>الشكل</b> مرة! اقرأ القاعدة (أو استمع لها) ثم اختر كل ما يناسبها.',
    levels: [{ name: 'حسب اللون', sub: 'ستة' }, { name: 'حسب الشكل', sub: 'ستة' }, { name: 'لون أو شكل', sub: 'تتبدّل' }, { name: 'لون أو شكل', sub: 'تسعة' }, { name: 'تحدّي القواعد', sub: 'اثنا عشر' }],
    gen(lv, i, G) {
      const n = [6, 6, 6, 9, 12][lv];
      const rule = lv === 0 ? 'color' : lv === 1 ? 'shape' : (i % 2 === 0 ? pick(['color', 'shape']) : (G.lastRule === 'color' ? 'shape' : 'color'));
      const banner = G.lastRule && G.lastRule !== rule ? '🔀 تغيّرت القاعدة!' : null; G.lastRule = rule;
      const cols = sample(['red', 'blue', 'green', 'yellow'], 3), shapes = sample(SH, 3);
      const tc = pick(cols), ts = pick(shapes);
      let items = [];
      for (let k = 0; k < n; k++) items.push({ shape: pick(shapes), c: AK.COLORS[pick(cols)][1], key: 0 });
      const okf = (o) => (rule === 'color' ? o.c === AK.COLORS[tc][1] : o.shape === ts);
      for (let k = 0; k < 2; k++) { items[k] = rule === 'color' ? { shape: pick(shapes), c: AK.COLORS[tc][1] } : { shape: ts, c: AK.COLORS[pick(cols)][1] }; }
      while (items.filter(okf).length > Math.ceil(n * 0.6)) { const j = items.findIndex(okf); items[j] = { shape: rule === 'color' ? pick(shapes) : pick(shapes.filter((s) => s !== ts)), c: rule === 'color' ? AK.COLORS[pick(cols.filter((c) => c !== tc))][1] : AK.COLORS[pick(cols)][1] }; if (!items.filter(okf).length) break; }
      items = shuffle(items).map((o) => Object.assign(o, { ok: okf(o) }));
      const prompt = rule === 'color' ? `نلعب حسب اللون: اختر كل اللون ${AK.COLORS[tc][0]}` : `نلعب حسب الشكل: اختر كل ${AK.SHAPES[ts] === 'دائرة' ? 'الدوائر' : AK.SHAPES[ts] === 'مربع' ? 'المربعات' : AK.SHAPES[ts] === 'مثلث' ? 'المثلثات' : 'النجوم'}`;
      return { prompt, say: prompt, banner, options: items, labels: false, maxCard: 130, wrongMsg: 'ليس حسب القاعدة 🤔' };
    }
  });

  /* ============ ١٩) صنّف الكنوز ============ */
  const TCOL = {
    brown: ['بني', ['🥔', '🌰', '🍫', '🪵', '🐻', '🍪', '🥥', '🍂']],
    green: ['أخضر', ['🥦', '🐸', '🌿', '🥒', '🍏', '🐢', '🌵', '🥬']],
    red: ['أحمر', ['🍎', '🍓', '🍅', '🌹', '❤️', '🍒', '🚒', '🦀']],
    yellow: ['أصفر', ['🍌', '⭐', '🐥', '🌻', '🍋', '🧀', '🌽', '🐝']],
    blue: ['أزرق', ['🐳', '🦋', '🧢', '💎', '🫐', '🌀', '🐬', '🔵']],
    orange: ['برتقالي', ['🍊', '🥕', '🎃', '🦊', '🏀', '🐠', '🍑', '🔶']]
  };
  reg('acc-sort-treasures', {
    title: 'صنّف الكنوز', emoji: '💎', color: '#fbbf24', bg1: '#4d3306', bg2: '#0e0902',
    help: 'اجمع الأشياء التي لها <b>اللون المطلوب</b> لتفتح الكنز! اختر الألوان الصحيحة فقط.',
    levels: [{ name: 'لونان', sub: 'ستة أشياء' }, { name: 'ثلاثة ألوان', sub: 'سبعة أشياء' }, { name: 'أربعة ألوان', sub: 'ثمانية' }, { name: 'ستة ألوان', sub: 'تسعة' }, { name: 'كنز كبير', sub: 'عشرة' }],
    gen(lv, i, G) {
      const nCol = [2, 3, 4, 5, 6][lv], total = [6, 7, 8, 9, 10][lv];
      const keys = Object.keys(TCOL), target = fresh(G, 't', keys), others = sample(keys.filter((k) => k !== target), nCol - 1);
      const nOk = lv < 2 ? 3 : 4, ok = sample(TCOL[target][1], nOk).map((e) => ({ e, ok: true }));
      const bad = []; let k = 0; while (bad.length < total - nOk) { const c = others[k++ % others.length]; const e = pick(TCOL[c][1]); if (!bad.find((b) => b.e === e)) bad.push({ e }); }
      return { prompt: `اجمع كل الأشياء ذات اللون ${TCOL[target][0]} 💎`, say: `اجمع الأشياء ذات اللون ${TCOL[target][0]}`, options: shuffle([...ok, ...bad]), labels: false, maxCard: 150,
        onComplete() { setTimeout(() => AK.G && AK.G.say('🎉 فتحت الكنز! 💰', 1800), 300); } };
    }
  });

  /* ============ ٢٠) ابنِ مدينة ============ */
  const PARTS = [
    { k: 'roof', shape: 'triangle', say: 'سقف' }, { k: 'door', shape: 'rect', say: 'باب' }, { k: 'win', shape: 'circle', say: 'شباك' },
    { k: 'chim', shape: 'square', say: 'مدخنة' }, { k: 'deco', shape: 'star', say: 'نجمة' }
  ];
  function drawHouse(ctx, x, y, w, h, cfg, shown) {
    const s = Math.min(w * 0.4, h * 0.4), cx = x + w / 2, by = y + h * 0.95;
    const has = (k) => !shown || shown.includes(k);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(cx - s * 0.8, by - s * 1.2, s * 1.6, s * 1.2);       // جدار البيت
    if (has('chim')) { ctx.fillStyle = cfg.chim; ctx.fillRect(cx + s * 0.4, by - s * 2.05, s * 0.3, s * 0.6); }
    if (has('roof')) { ctx.beginPath(); ctx.moveTo(cx - s * 1.0, by - s * 1.2); ctx.lineTo(cx, by - s * 2.1); ctx.lineTo(cx + s * 1.0, by - s * 1.2); ctx.closePath(); ctx.fillStyle = cfg.roof; ctx.fill(); }
    if (has('door')) { ctx.fillStyle = cfg.door; ctx.fillRect(cx - s * 0.62, by - s * 0.75, s * 0.4, s * 0.75); }
    if (has('win')) { ctx.beginPath(); ctx.arc(cx + s * 0.3, by - s * 0.68, s * 0.24, 0, 7); ctx.fillStyle = cfg.win; ctx.fill(); }
    if (has('deco')) { AK.drawShape(ctx, 'star', cx, by - s * 2.35, s * 0.22, cfg.deco); }
  }
  reg('acc-build-city', {
    title: 'ابنِ مدينة', emoji: '🏘️', color: '#f87171', bg1: '#4a1515', bg2: '#0d0404',
    help: 'دائرة = <b>شباك</b> • مستطيل = <b>باب</b> • مثلث = <b>سقف</b>. قلّد البيت الظاهر: اختر القطع ذات <b>الشكل واللون</b> المناسبين وسيُبنى بيتك!',
    levels: [{ name: 'ثلاث قطع', sub: 'مع الدليل' }, { name: 'ثلاث قطع', sub: 'بلا دليل' }, { name: 'الألوان مهمّة', sub: 'ثلاث قطع' }, { name: 'أربع قطع', sub: 'مع مدخنة' }, { name: 'خمس قطع', sub: 'مع نجمة' }],
    gen(lv, i, G) {
      const nParts = [3, 3, 3, 4, 5][lv], parts = PARTS.slice(0, nParts), ck = Object.keys(AK.COLORS);
      const cs = sample(ck, nParts), cfg = {}; parts.forEach((p, k) => { cfg[p.k] = AK.COLORS[cs[k]][1]; });
      const opts = parts.map((p) => ({ shape: p.shape, c: cfg[p.k], part: p.k, ok: true, t: p.say }));
      parts.slice(0, lv >= 2 ? 3 : 2).forEach((p, k) => {                               // مموّهات
        if (lv >= 2) opts.push({ shape: p.shape, c: AK.COLORS[pick(ck.filter((c) => AK.COLORS[c][1] !== cfg[p.k]))][1] });
        else opts.push({ shape: pick(['diamond', 'star']), c: cfg[parts[(k + 1) % nParts].k] });
      });
      const options = shuffle(opts);
      const scene = { draw(ctx, x, y, w, h, st) {
        const half = w / 2;
        drawHouse(ctx, x, y, half, h, cfg, null);
        EDU.text(ctx, '⬅️', x + half, y + h / 2, 30, '#fde047');
        const shown = [...st.done].map((k) => options[k].part);
        ctx.save(); ctx.globalAlpha = 0.9; drawHouse(ctx, x + half, y, half, h, cfg, shown); ctx.restore();
        EDU.text(ctx, 'بيتي', x + half * 1.5, y + 16, 16, '#cbd5e1'); EDU.text(ctx, 'المطلوب', x + half * 0.5, y + 16, 16, '#cbd5e1');
      } };
      return { prompt: 'قلّد البيت: اختر القطع المناسبة', sub: lv === 0 ? 'دائرة = شباك • مستطيل = باب • مثلث = سقف' : '', say: 'ابنِ بيتاً مثل الصورة', scene, sceneH: 0.42, options, labels: lv === 0, maxCard: 130,
        onComplete() { setTimeout(() => AK.G && AK.G.say('🏠 بنيت بيتاً جميلاً!', 1800), 300); } };
    }
  });
})();
