/* ================================================================
   app.js — VerifyDoc Uganda
   Mobile sidebar, animations, button ripples, scroll effects
   ================================================================ */

'use strict';

/* Mark body so CSS animations only apply when JS is running */
document.body.classList.add('js-ready');

/* ── Sidebar Toggle (mobile) ─────────────────────────────────── */
(function () {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const openBtn  = document.getElementById('sidebar-open');
  const closeBtn = document.getElementById('sidebar-close');

  if (!sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  if (openBtn)  openBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  /* Close on nav-item click (mobile) */
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth < 768) closeSidebar();
    });
  });

  /* Reset on resize */
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) closeSidebar();
  });
})();

/* ── Ripple Effect on Buttons ────────────────────────────────── */
(function () {
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn, .portal-cta, .stat-card');
    if (!btn) return;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-wave';

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.4;
    ripple.style.cssText = `
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size / 2}px;
      top:${e.clientY - rect.top - size / 2}px;
    `;

    btn.style.position = btn.style.position || 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
})();

/* ── Intersection Observer — fade / slide-up animations ─────── */
(function () {
  const targets = document.querySelectorAll('.anim-fade, .anim-up, .portal-card, .how-step, .stat-card');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(el => observer.observe(el));
})();

/* ── Count-up for stat numbers ───────────────────────────────── */
(function () {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const fmt = n => n.toLocaleString();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const end   = parseInt(el.dataset.count, 10);
      const dur   = 1400;
      const step  = 16;
      const steps = dur / step;
      let   cur   = 0;
      const inc   = end / steps;

      const tick = setInterval(() => {
        cur = Math.min(cur + inc, end);
        el.textContent = fmt(Math.floor(cur));
        if (cur >= end) clearInterval(tick);
      }, step);

      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
})();

/* ── Landing page: hero typewriter tag ──────────────────────── */
(function () {
  const el = document.getElementById('hero-typewriter');
  if (!el) return;

  const words = ['Medical Schools', 'Hospitals', 'Clinics', 'Employers', 'Regulators'];
  let wi = 0, ci = 0, deleting = false;

  function tick() {
    const word = words[wi];
    if (!deleting) {
      el.textContent = word.slice(0, ++ci);
      if (ci === word.length) { deleting = true; setTimeout(tick, 1800); return; }
    } else {
      el.textContent = word.slice(0, --ci);
      if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
    }
    setTimeout(tick, deleting ? 55 : 90);
  }
  setTimeout(tick, 800);
})();

/* ── Smooth active link highlight based on scroll (landing) ─── */
(function () {
  const sections = document.querySelectorAll('section[id]');
  if (!sections.length) return;

  const navLinks = document.querySelectorAll('.landing-nav a[href^="#"]');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }, { passive: true });
})();

/* ── Portal card tilt on mouse move ─────────────────────────── */
(function () {
  document.querySelectorAll('.portal-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();
