/* ============================================================
   METRO SUL — script.js
   Canvas animation, interactions, scroll reveals, UI behaviour
   ============================================================ */

'use strict';

/* ── UTILITY ─────────────────────────────────────────────── */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max)); }

/* ══════════════════════════════════════════════════════════════
   PRELOADER
   ══════════════════════════════════════════════════════════════ */
(function initPreloader() {
  const el = document.getElementById('preloader');
  if (!el) return;

  const dismiss = () => {
    el.classList.add('hidden');
    document.body.style.overflow = '';
  };

  document.body.style.overflow = 'hidden';

  if (prefersReducedMotion) {
    dismiss();
    return;
  }

  window.addEventListener('load', () => {
    setTimeout(dismiss, 800);
  });

  // Fallback if load takes too long
  setTimeout(dismiss, 3500);
})();

/* ══════════════════════════════════════════════════════════════
   HEADER — scroll behaviour + mobile nav
   ══════════════════════════════════════════════════════════════ */
(function initHeader() {
  const header   = document.getElementById('header');
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  if (!header) return;

  // Scroll state
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (y > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastY = y;
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Footer year
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      mobileNav.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        closeMobileNav();
      }
    });
  }
})();

/* Global mobile nav close (called inline from HTML) */
function closeMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (!hamburger || !mobileNav) return;
  hamburger.classList.remove('open');
  mobileNav.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  mobileNav.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════════════════
   SCROLL REVEAL
   ══════════════════════════════════════════════════════════════ */
(function initReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  if (prefersReducedMotion) {
    elements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
})();

/* ══════════════════════════════════════════════════════════════
   COOKIE NOTICE
   ══════════════════════════════════════════════════════════════ */
(function initCookieNotice() {
  const notice = document.getElementById('cookie-notice');
  const btn    = document.getElementById('cookie-accept');
  if (!notice || !btn) return;

  if (localStorage.getItem('ms_cookie_accepted')) {
    notice.classList.add('hidden');
    return;
  }

  // Small delay before showing
  setTimeout(() => { notice.style.display = ''; }, 2000);

  btn.addEventListener('click', () => {
    notice.classList.add('hidden');
    localStorage.setItem('ms_cookie_accepted', '1');
  });
})();

/* ══════════════════════════════════════════════════════════════
   HERO CANVAS ANIMATION
   Urban Time Signal — Blue Plasma ↔ Orange Combustion
   ══════════════════════════════════════════════════════════════ */
(function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Skip heavy canvas on reduced motion
  if (prefersReducedMotion) {
    canvas.style.opacity = '0.2';
    drawStaticBackground();
    return;
  }

  // ── Config ──────────────────────────────────────────────
  const C = {
    blue:        '#009DFF',
    plasma:      '#37D8FF',
    blueGlow:    'rgba(0,157,255,',
    orange:      '#FF6A00',
    amber:       '#FFB000',
    orangeGlow:  'rgba(255,106,0,',
    white:       'rgba(244,248,255,',
    ring:        { r: 0, speed: 0.002 },
    numParticles: 180,
    numSparks:    60,
    numOrbs:      8,
  };

  // ── State ────────────────────────────────────────────────
  let W = 0, H = 0, cx = 0, cy = 0, ring_r = 0;
  let raf = null;
  let t = 0;
  let mouse = { x: -9999, y: -9999 };

  // Particle pools
  let particles = [];
  let sparks    = [];
  let orbs      = [];
  let arcTrails = [];

  // ── Resize ──────────────────────────────────────────────
  function resize() {
    const hero = document.getElementById('hero');
    W = hero ? hero.offsetWidth  : window.innerWidth;
    H = hero ? hero.offsetHeight : window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
    cx = W / 2;
    cy = H / 2;
    ring_r = Math.min(W, H) * 0.28;
    initParticles();
  }

  window.addEventListener('resize', resize, { passive: true });

  // ── Mouse / Touch ────────────────────────────────────────
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }, { passive: true });

  canvas.addEventListener('mouseleave', () => {
    mouse.x = -9999; mouse.y = -9999;
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (!e.touches.length) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
  }, { passive: true });

  // ── Particle factory ─────────────────────────────────────
  function makeParticle(side) {
    // side: 'blue' (left hemisphere), 'orange' (right hemisphere)
    const isBlue = side === 'blue';

    // Spawn on the ring, left or right half
    const halfOffset = isBlue
      ? rand(Math.PI * 0.5, Math.PI * 1.5)   // left half
      : rand(-Math.PI * 0.5, Math.PI * 0.5);  // right half

    const angle  = halfOffset;
    const radius = ring_r * rand(0.85, 1.15);

    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: (Math.random() - 0.5) * (isBlue ? -0.6 : 0.6),
      vy: (Math.random() - 0.5) * 0.6,
      life: 1,
      decay: rand(0.004, 0.012),
      radius: rand(1, 3.5),
      isBlue,
      angle,
      drifting: Math.random() < 0.4,
    };
  }

  function makeSpark() {
    const isBlue = Math.random() < 0.5;
    const angle  = rand(0, Math.PI * 2);
    const radius = ring_r * rand(0.95, 1.05);
    const speed  = rand(0.8, 2.2);
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: Math.cos(angle + (isBlue ? 0.5 : -0.5)) * speed + (Math.random()-0.5)*0.5,
      vy: Math.sin(angle + (isBlue ? 0.5 : -0.5)) * speed + (Math.random()-0.5)*0.5,
      life: 1,
      decay: rand(0.02, 0.06),
      radius: rand(0.5, 2),
      isBlue,
    };
  }

  function makeOrb() {
    const isBlue = Math.random() < 0.5;
    const angle  = rand(0, Math.PI * 2);
    const dist   = ring_r * rand(0.6, 1.4);
    return {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      radius: rand(4, 12),
      life: 1,
      decay: rand(0.002, 0.006),
      isBlue,
      orbitAngle: angle,
      orbitSpeed: rand(0.001, 0.003) * (Math.random() < 0.5 ? 1 : -1),
      orbitDist: dist,
    };
  }

  function makeArcTrail() {
    const isBlue = Math.random() < 0.5;
    const startAngle = rand(0, Math.PI * 2);
    const arc        = rand(0.3, 1.2);
    return {
      startAngle,
      arc,
      radius: ring_r * rand(0.7, 1.3),
      isBlue,
      life: 1,
      decay: rand(0.01, 0.025),
    };
  }

  function initParticles() {
    particles = Array.from({ length: C.numParticles }, () =>
      makeParticle(Math.random() < 0.5 ? 'blue' : 'orange')
    );
    sparks    = Array.from({ length: C.numSparks }, makeSpark);
    orbs      = Array.from({ length: C.numOrbs   }, makeOrb);
    arcTrails = Array.from({ length: 6            }, makeArcTrail);
  }

  // ── Draw ─────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // ── Subtle radial background glow ────────────────────
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ring_r * 1.8);
    bgGrad.addColorStop(0,   'rgba(7,17,31,0.4)');
    bgGrad.addColorStop(0.5, 'rgba(3,5,10,0.2)');
    bgGrad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Arc trails ───────────────────────────────────────
    arcTrails.forEach(arc => {
      if (arc.life <= 0) return;
      const col = arc.isBlue ? C.blueGlow : C.orangeGlow;
      ctx.save();
      ctx.globalAlpha = arc.life * 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, arc.radius, arc.startAngle, arc.startAngle + arc.arc);
      ctx.strokeStyle = arc.isBlue ? C.plasma : C.amber;
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.restore();
    });

    // ── Main orbital ring ─────────────────────────────────
    // Outer thin ring
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.arc(cx, cy, ring_r * 1.08, 0, Math.PI * 2);
    ctx.strokeStyle = '#8D9AAD';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();

    // Inner ring dim
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.beginPath();
    ctx.arc(cx, cy, ring_r * 0.92, 0, Math.PI * 2);
    ctx.strokeStyle = '#8D9AAD';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();

    // Blue half ring (left, animated glow)
    const blueGlowAmount = 0.55 + 0.15 * Math.sin(t * 1.3);
    ctx.save();
    ctx.globalAlpha = blueGlowAmount;
    ctx.beginPath();
    ctx.arc(cx, cy, ring_r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.strokeStyle = C.plasma;
    ctx.lineWidth = 2;
    ctx.shadowColor  = C.blue;
    ctx.shadowBlur   = 18;
    ctx.stroke();
    ctx.restore();

    // Blue ring glow pass
    ctx.save();
    ctx.globalAlpha = 0.2 + 0.1 * Math.sin(t * 1.3);
    ctx.beginPath();
    ctx.arc(cx, cy, ring_r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.strokeStyle = C.blue;
    ctx.lineWidth = 8;
    ctx.filter = 'blur(8px)';
    ctx.stroke();
    ctx.restore();

    // Orange half ring (right, animated glow)
    const orangeGlowAmount = 0.55 + 0.15 * Math.sin(t * 1.1 + 1);
    ctx.save();
    ctx.globalAlpha = orangeGlowAmount;
    ctx.beginPath();
    ctx.arc(cx, cy, ring_r, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 2;
    ctx.shadowColor = C.orange;
    ctx.shadowBlur  = 18;
    ctx.stroke();
    ctx.restore();

    // Orange glow pass
    ctx.save();
    ctx.globalAlpha = 0.2 + 0.1 * Math.sin(t * 1.1 + 1);
    ctx.beginPath();
    ctx.arc(cx, cy, ring_r, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.strokeStyle = C.orange;
    ctx.lineWidth = 8;
    ctx.filter = 'blur(8px)';
    ctx.stroke();
    ctx.restore();

    // ── Junction sparks (top & bottom of ring) ────────────
    const junctionPoints = [
      { angle: Math.PI * 0.5,  isBlue: true  },  // bottom
      { angle: Math.PI * 1.5,  isBlue: true  },  // top
    ];

    junctionPoints.forEach(jp => {
      const jx = cx + Math.cos(jp.angle) * ring_r;
      const jy = cy + Math.sin(jp.angle) * ring_r;
      const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3 + jp.angle));

      // Blue dot
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(jx, jy, 4, 0, Math.PI * 2);
      ctx.fillStyle = C.plasma;
      ctx.shadowColor = C.blue;
      ctx.shadowBlur  = 16;
      ctx.fill();
      ctx.restore();

      // Orange dot on same point (polarity meeting)
      ctx.save();
      ctx.globalAlpha = pulse * 0.6;
      ctx.beginPath();
      ctx.arc(jx, jy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = C.amber;
      ctx.shadowColor = C.orange;
      ctx.shadowBlur  = 12;
      ctx.fill();
      ctx.restore();
    });

    // ── Central core ─────────────────────────────────────
    const corePulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.5));

    // Mouse-reactive shift
    const mx = mouse.x !== -9999 ? mouse.x : cx;
    const my = mouse.y !== -9999 ? mouse.y : cy;
    const dxM = (mx - cx) * 0.02;
    const dyM = (my - cy) * 0.02;

    const coreGrad = ctx.createRadialGradient(
      cx + dxM, cy + dyM, 0,
      cx, cy, ring_r * 0.35
    );
    coreGrad.addColorStop(0,   `rgba(55,216,255,${0.08 * corePulse})`);
    coreGrad.addColorStop(0.4, `rgba(0,157,255,${0.04 * corePulse})`);
    coreGrad.addColorStop(0.7, `rgba(255,106,0,${0.04 * corePulse})`);
    coreGrad.addColorStop(1,   'rgba(0,0,0,0)');

    ctx.save();
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, ring_r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Core white dot
    ctx.save();
    ctx.globalAlpha = corePulse * 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#F4F8FF';
    ctx.shadowColor = '#F4F8FF';
    ctx.shadowBlur  = 20;
    ctx.fill();
    ctx.restore();

    // ── Orbs ─────────────────────────────────────────────
    orbs.forEach(orb => {
      if (orb.life <= 0) return;
      orb.orbitAngle += orb.orbitSpeed;
      orb.x = cx + Math.cos(orb.orbitAngle) * orb.orbitDist;
      orb.y = cy + Math.sin(orb.orbitAngle) * orb.orbitDist;
      orb.life -= orb.decay;

      const orbAlpha = orb.life * 0.3;
      const col      = orb.isBlue ? C.blue : C.orange;
      const grd = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
      grd.addColorStop(0, col.replace(')', ',0.4)').replace('rgb', 'rgba').replace('#', 'rgba('));
      grd.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.save();
      ctx.globalAlpha = orbAlpha;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);

      if (orb.isBlue) {
        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        g.addColorStop(0, 'rgba(55,216,255,0.8)');
        g.addColorStop(1, 'rgba(0,157,255,0)');
        ctx.fillStyle = g;
      } else {
        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        g.addColorStop(0, 'rgba(255,176,0,0.8)');
        g.addColorStop(1, 'rgba(255,106,0,0)');
        ctx.fillStyle = g;
      }

      ctx.shadowColor = orb.isBlue ? C.blue : C.orange;
      ctx.shadowBlur  = 12;
      ctx.fill();
      ctx.restore();
    });

    // ── Particles ─────────────────────────────────────────
    particles.forEach(p => {
      if (p.life <= 0) return;

      // Mouse interaction — mild attraction to mouse on same side
      if (mouse.x !== -9999) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 200 && dist > 1) {
          p.vx += (dx / dist) * 0.015;
          p.vy += (dy / dist) * 0.015;
        }
      }

      // Gentle orbit pull back toward ring
      const toRingX  = cx + Math.cos(p.angle) * ring_r - p.x;
      const toRingY  = cy + Math.sin(p.angle) * ring_r - p.y;
      p.vx += toRingX * 0.0005;
      p.vy += toRingY * 0.0005;

      // Velocity damping
      p.vx *= 0.97;
      p.vy *= 0.97;

      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      const a = p.life * (p.isBlue ? 0.7 : 0.65);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.isBlue ? C.plasma : C.amber;
      ctx.shadowColor = p.isBlue ? C.blue : C.orange;
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.restore();
    });

    // ── Sparks ───────────────────────────────────────────
    sparks.forEach(s => {
      if (s.life <= 0) return;
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy *= 0.96;
      s.life -= s.decay;

      ctx.save();
      ctx.globalAlpha = s.life * 0.8;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 4, s.y - s.vy * 4);
      ctx.strokeStyle = s.isBlue ? C.plasma : C.amber;
      ctx.lineWidth   = s.radius;
      ctx.lineCap     = 'round';
      ctx.shadowColor = s.isBlue ? C.blue : C.orange;
      ctx.shadowBlur  = 6;
      ctx.stroke();
      ctx.restore();
    });

    // ── Respawn dead particles / sparks / orbs ────────────
    const isMobile = W < 700;
    const particleMax = isMobile ? 80 : C.numParticles;
    const sparkMax    = isMobile ? 25 : C.numSparks;

    particles.forEach((p, i) => {
      if (p.life <= 0) {
        particles[i] = makeParticle(p.isBlue ? 'blue' : 'orange');
      }
    });

    sparks.forEach((s, i) => {
      if (s.life <= 0) {
        sparks[i] = makeSpark();
      }
    });

    orbs.forEach((o, i) => {
      if (o.life <= 0) {
        orbs[i] = makeOrb();
      }
    });

    arcTrails.forEach((a, i) => {
      if (a.life <= 0) {
        arcTrails[i] = makeArcTrail();
      }
      a.life -= a.decay;
    });

    // ── Time-pulse distortion lines ───────────────────────
    if (!isMobile && Math.sin(t * 0.7) > 0.8) {
      const lineAlpha = (Math.sin(t * 0.7) - 0.8) * 5;
      ctx.save();
      ctx.globalAlpha = lineAlpha * 0.15;
      ctx.beginPath();
      ctx.moveTo(0, cy + Math.sin(t) * 20);
      ctx.lineTo(W, cy + Math.sin(t + 1) * 20);
      ctx.strokeStyle = C.blue;
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Static fallback ──────────────────────────────────────
  function drawStaticBackground() {
    resize();
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(cx, cy, ring_r, 0, Math.PI * 2);
    ctx.strokeStyle = '#009DFF';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── Animation loop ────────────────────────────────────────
  function tick() {
    t += 0.016;
    draw();
    raf = requestAnimationFrame(tick);
  }

  // ── Init ─────────────────────────────────────────────────
  resize();
  tick();

  // Pause when off-screen (performance)
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      if (!raf) raf = requestAnimationFrame(tick);
    } else {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    }
  }, { threshold: 0 });

  observer.observe(canvas);
})();

/* ══════════════════════════════════════════════════════════════
   SONIC MAP — subtle hover drift (desktop only)
   ══════════════════════════════════════════════════════════════ */
(function initSonicMapDrift() {
  if (prefersReducedMotion || window.innerWidth < 700) return;

  const tracks = document.querySelectorAll('.sonic-map__track');
  tracks.forEach(track => {
    // Random initial offset for organic feel
    const dx = rand(-8, 8);
    const dy = rand(-4, 4);
    track.style.setProperty('--drift-x', `${dx}px`);
    track.style.setProperty('--drift-y', `${dy}px`);
  });
})();

/* ══════════════════════════════════════════════════════════════
   SMOOTH ANCHOR SCROLL
   ══════════════════════════════════════════════════════════════ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const headerH = document.getElementById('header')?.offsetHeight || 70;
      const top     = target.getBoundingClientRect().top + window.scrollY - headerH;
      window.scrollTo({ top, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
    });
  });
})();

/* ══════════════════════════════════════════════════════════════
   TRACK ARCHIVE — keyboard accessibility
   ══════════════════════════════════════════════════════════════ */
(function initTrackArchive() {
  const tracks = document.querySelectorAll('.track-archive__track');
  tracks.forEach(track => {
    track.setAttribute('tabindex', '0');
    track.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        // Could open a detail panel — for now just a focus-visible ring
        track.focus();
      }
    });
  });
})();

/* ══════════════════════════════════════════════════════════════
   FOCUS MANAGEMENT — visible focus utility
   ══════════════════════════════════════════════════════════════ */
(function initFocusVisible() {
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-focus');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-focus');
    }
  });
})();

/* ══════════════════════════════════════════════════════════════
   CYCLE PILLARS — micro entrance stagger on scroll
   ══════════════════════════════════════════════════════════════ */
(function initCyclePillars() {
  if (prefersReducedMotion) return;

  const pillars = document.querySelectorAll('.cycle__pillar');
  if (!pillars.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = Array.from(pillars).indexOf(entry.target);
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, idx * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  pillars.forEach(p => {
    p.style.opacity = '0';
    p.style.transform = 'translateY(16px)';
    p.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(p);
  });
})();

/* ══════════════════════════════════════════════════════════════
   RUNTIME CLOCK DISPLAY (micro-detail in hero coords)
   ══════════════════════════════════════════════════════════════ */
(function initLiveClock() {
  const el = document.querySelector('.hero__coords--tr');
  if (!el) return;

  const update = () => {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(now.getMinutes()).padStart(2, '0');
    const ss  = String(now.getSeconds()).padStart(2, '0');
    const line1 = `CHRONOS ⟷ KAIROS`;
    const line2 = `${hh}:${mm}:${ss} / UTC-3 / CYCLE ACTIVE`;
    el.innerHTML = `${line1}<br />${line2}`;
  };

  update();
  setInterval(update, 1000);
})();

console.log(
  '%cMETRO SUL\n%cUrban Time Signal — Active\nhttps://www.metrosulofficial.com',
  'font-family:monospace;font-size:18px;font-weight:bold;color:#009DFF',
  'font-family:monospace;font-size:11px;color:#8D9AAD'
);
