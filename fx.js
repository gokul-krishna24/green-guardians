/* Green Guardians — motion & cursor effects (desktop cursor FX, mobile touch FX) */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s) => [...document.querySelectorAll(s)];

  /* Scroll progress bar */
  const bar = document.getElementById('scroll-progress');
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Stagger children reveal delays */
  $$('.reveal').forEach((el, i) => { el.style.setProperty('--d', `${(i % 4) * 90}ms`); });

  /* Floating particles (leaves/pollen) */
  const cv = document.getElementById('particles');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let W, H, dpr = Math.min(devicePixelRatio || 1, 2);
    const N = innerWidth < 640 ? 22 : 50;
    const mouse = { x: -999, y: -999 };
    const resize = () => { W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; };
    resize(); addEventListener('resize', resize);
    const P = Array.from({ length: N }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 2 + .6) * dpr, vx: (Math.random() - .5) * .25 * dpr, vy: -(Math.random() * .35 + .1) * dpr, a: Math.random() * .5 + .2 }));
    addEventListener('pointermove', e => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; }, { passive: true });
    (function loop() {
      ctx.clearRect(0, 0, W, H);
      for (const p of P) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy), R = 120 * dpr;
        if (d < R) { p.x += dx / d * (R - d) * .04; p.y += dy / d * (R - d) * .04; }
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52,211,153,${p.a})`; ctx.fill();
      }
      requestAnimationFrame(loop);
    })();
  }

  if (fine && !reduce) {
    document.documentElement.classList.add('has-cursor');
    /* Custom cursor: dot + lagging ring + background spotlight */
    const dot = document.getElementById('cursor-dot'), ring = document.getElementById('cursor-ring'), spot = document.getElementById('cursor-spot');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, sx = mx, sy = my;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`; }, { passive: true });
    (function follow() {
      rx += (mx - rx) * .18; ry += (my - ry) * .18; sx += (mx - sx) * .08; sy += (my - sy) * .08;
      ring.style.transform = `translate(${rx}px,${ry}px)`;
      spot.style.transform = `translate(${sx}px,${sy}px)`;
      requestAnimationFrame(follow);
    })();
    const hoverSel = 'a,button,.st-tab,.b-item,.flip,summary,label,select,input,textarea';
    document.addEventListener('pointerover', e => { if (e.target.closest(hoverSel)) document.body.classList.add('cursor-hover'); });
    document.addEventListener('pointerout', e => { if (e.target.closest(hoverSel)) document.body.classList.remove('cursor-hover'); });
    document.addEventListener('pointerdown', () => document.body.classList.add('cursor-down'));
    document.addEventListener('pointerup', () => document.body.classList.remove('cursor-down'));
    document.addEventListener('mouseleave', () => document.body.classList.add('cursor-out'));
    document.addEventListener('mouseenter', () => document.body.classList.remove('cursor-out'));

    /* Card spotlight + 3D tilt (delegated so dynamic cards work too) */
    document.addEventListener('pointermove', e => {
      const card = e.target.closest('.glass-card, .stat-card');
      if (!card) return;
      const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px'); card.style.setProperty('--my', y + 'px');
      if (card.closest('.flip') || card.closest('#drawer')) return;
      const tx = ((y / r.height) - .5) * -6, ty = ((x / r.width) - .5) * 6;
      card.style.transform = `perspective(900px) rotateX(${tx}deg) rotateY(${ty}deg) translateY(-2px)`;
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const card = e.target.closest('.glass-card, .stat-card');
      if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
    });

    /* Magnetic buttons */
    $$('.cta-btn, .ghost-btn, .ping-btn').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${(e.clientX - r.left - r.width / 2) * .25}px ${(e.clientY - r.top - r.height / 2) * .35}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });

    /* Hero parallax */
    const hero = document.querySelector('#hero h1');
    addEventListener('pointermove', e => {
      if (scrollY > innerHeight) return;
      hero.style.translate = `${(e.clientX / innerWidth - .5) * -14}px ${(e.clientY / innerHeight - .5) * -8}px`;
    }, { passive: true });
  }

  /* Tap ripple (works on touch + mouse) */
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest('button, .st-tab, .b-item, .cta-btn, .ghost-btn, .m-link');
    if (!t) return;
    const r = t.getBoundingClientRect(), s = Math.max(r.width, r.height);
    const rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
    t.style.overflow = 'hidden';
    t.appendChild(rip);
    setTimeout(() => rip.remove(), 650);
  });

  /* Mobile: light haptic feedback on key taps */
  if (navigator.vibrate && !fine) {
    document.addEventListener('click', e => { if (e.target.closest('.st-tab, .cta-btn, #ping-btn, .flip')) navigator.vibrate(12); });
  }
})();
