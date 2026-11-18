/* ALR — progressive enhancements. Every page works without JS. */
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY = "alr-theme";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  /* ---------- theme toggle ---------- */
  function setupTheme(onChange) {
    var btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    function label() {
      var next = currentTheme() === "dark" ? "light" : "dark";
      btn.setAttribute("aria-label", "Switch to " + next + " theme");
      btn.setAttribute("title", "Switch to " + next + " theme");
    }
    label();
    btn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      label();
      onChange();
    });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      if (mq.addEventListener) mq.addEventListener("change", function () { label(); onChange(); });
    }
  }

  /* ---------- header + mobile menu ---------- */
  function setupHeader() {
    var header = document.querySelector(".site-header");
    if (header) {
      var ticking = false, scrolled = null;
      var update = function () {
        ticking = false;
        var s = window.scrollY > 8;
        if (s !== scrolled) { scrolled = s; header.classList.toggle("is-scrolled", s); }
      };
      update();
      window.addEventListener("scroll", function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
    }
    var btn = document.querySelector(".menu-toggle");
    var nav = document.getElementById("site-nav");
    if (!btn || !nav) return;
    function setOpen(open) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      nav.classList.toggle("is-open", open);
    }
    btn.addEventListener("click", function () { setOpen(btn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); btn.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("is-open") && !nav.contains(e.target) && !btn.contains(e.target)) setOpen(false);
    });
  }

  /* ---------- scroll reveal ---------- */
  function setupReveal() {
    var els = document.querySelectorAll(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty("--d", Math.min(i++ * 80, 400) + "ms");
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- ambient particles ----------
     Capped at ~30fps, few particles, paused while scrolling, when the tab is hidden,
     and for reduced-motion users, so it never competes with scrolling. */
  function setupParticles() {
    var canvas = document.querySelector(".particles");
    if (!canvas || !canvas.getContext) return function () {};
    var ctx = canvas.getContext("2d", { alpha: true });
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = 0, h = 0, parts = [], color = "164,184,108", raf = null, lastT = 0, scrolling = false, scrollTimer;
    var FRAME = 1000 / 30;
    var orbit = document.querySelector(".hero .orbit"), angle = 0;

    function readColor() {
      var c = getComputedStyle(root).getPropertyValue("--accent").trim();
      var m = /^#([0-9a-f]{6})$/i.exec(c);
      if (m) {
        var n = parseInt(m[1], 16);
        color = ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
      }
    }
    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(42, Math.max(18, (w * h) / 36000)));
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.3 + 0.5,
          vx: (Math.random() - 0.5) * 0.25, vy: -(Math.random() * 0.35 + 0.06),
          a: Math.random() * 0.45 + 0.18, tw: Math.random() * Math.PI * 2
        });
      }
    }
    function paint(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        ctx.globalAlpha = p.a * (0.65 + 0.35 * Math.sin(t / 1400 + p.tw));
        ctx.fillStyle = "rgb(" + color + ")";
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1;
    }
    function step(t) {
      raf = requestAnimationFrame(step);
      if (scrolling || t - lastT < FRAME) return;
      var dt = Math.min((t - lastT) / 16.7, 3); lastT = t;
      if (orbit) { angle = (angle + 0.0375 * dt) % 360; orbit.style.transform = "rotate(" + angle.toFixed(3) + "deg)"; }
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        if (p.x < -5) p.x = w + 5; else if (p.x > w + 5) p.x = -5;
      }
      paint(t);
    }
    var live = false;
    function start() { if (raf == null && live && !reduceMotion && !document.hidden) raf = requestAnimationFrame(step); }
    function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }

    readColor(); resize(); paint(0);
    // Animate only while the homepage hero is visible; elsewhere the particles are a still image.
    var hero = document.querySelector(".page-home .hero");
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        live = entries[0].isIntersecting;
        root.classList.toggle("ambient-live", live);
        if (live) start(); else stop();
      }, { threshold: 0.15 }).observe(hero);
    }
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { resize(); paint(lastT); }, 200); });
    window.addEventListener("scroll", function () {
      if (!scrolling) { scrolling = true; root.classList.add("is-scrolling"); }
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () { scrolling = false; root.classList.remove("is-scrolling"); }, 160);
    }, { passive: true });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    return function () { readColor(); paint(lastT); };
  }

  /* ---------- writeup filters ---------- */
  function setupFilters() {
    var bar = document.querySelector(".filters");
    if (!bar) return;
    var chips = bar.querySelectorAll(".chip");
    var cards = document.querySelectorAll(".card-grid .card");
    var status = document.querySelector(".filter-status");
    bar.hidden = false;
    bar.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      var shown = 0;
      cards.forEach(function (card) {
        var tags = (card.getAttribute("data-tags") || "").split("|");
        var match = f === "all" || tags.indexOf(f) !== -1;
        card.classList.toggle("is-hidden", !match);
        if (match) { shown++; card.classList.add("is-in"); }
      });
      if (status) status.textContent = shown + (shown === 1 ? " article" : " articles") + " shown";
    });
  }

  /* ---------- contact: copy email ---------- */
  function setupCopy() {
    var btn = document.querySelector(".copy-email");
    if (!btn || !navigator.clipboard) return;
    var status = document.querySelector(".copy-status");
    btn.hidden = false;
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(btn.getAttribute("data-email")).then(function () {
        btn.textContent = "Copied ✓";
        if (status) status.textContent = "Email address copied to clipboard.";
        setTimeout(function () { btn.textContent = "Copy address"; if (status) status.textContent = ""; }, 2200);
      });
    });
  }

  /* ---------- instant navigation fallback ----------
     Browsers with Speculation Rules (Chrome/Edge) prerender pages on hover via the
     <script type="speculationrules"> in <head>. Others get a hover/touch prefetch. */
  function setupPrefetch() {
    if (HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) return;
    var done = {};
    function prefetch(e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.origin !== location.origin || a.target === "_blank" || a.hash && a.pathname === location.pathname) return;
      var url = a.pathname;
      if (done[url]) return;
      done[url] = true;
      var l = document.createElement("link");
      l.rel = "prefetch"; l.href = url;
      document.head.appendChild(l);
    }
    document.addEventListener("mouseover", prefetch, { passive: true });
    document.addEventListener("touchstart", prefetch, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var refreshParticles = setupParticles();
    setupTheme(refreshParticles);
    setupHeader();
    setupReveal();
    setupFilters();
    setupCopy();
    setupPrefetch();
  });
})();
