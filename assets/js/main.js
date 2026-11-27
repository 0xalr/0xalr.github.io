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

  /* ---------- mouse trail ----------
     A short, thin tail behind the cursor plus a small ring on click.
     Mouse users only (no touch/pen), off for reduced motion. The canvas is drawn only
     while there is something to show, so an idle pointer costs nothing. */
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function setupTrail() {
    if (reduceMotion || !finePointer) return function () {};
    var c = document.createElement("canvas");
    c.className = "cursor-trail"; c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    var ctx = c.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, pts = [], rings = [], raf = null, rgb = "164,184,108";
    var LIFE = 360, RING = 520, MAX = 40;

    function size() {
      w = window.innerWidth; h = window.innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function readColor() {
      var m = /^#([0-9a-f]{6})$/i.exec(getComputedStyle(root).getPropertyValue("--accent").trim());
      if (m) { var n = parseInt(m[1], 16); rgb = ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255); }
    }
    function kick() { if (raf == null) raf = requestAnimationFrame(frame); }
    function add(x, y, t) {
      var last = pts[pts.length - 1];
      if (last && Math.abs(last.x - x) + Math.abs(last.y - y) < 3) { last.t = t; return; }
      pts.push({ x: x, y: y, t: t });
      if (pts.length > MAX) pts.shift();
    }
    function frame(now) {
      raf = null;
      ctx.clearRect(0, 0, w, h);
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      while (rings.length && now - rings[0].t > RING) rings.shift();
      var n = pts.length;
      if (n > 1) {
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (var pass = 0; pass < 2; pass++) {
          for (var i = 1; i < n; i++) {
            var a = pts[i - 1], b = pts[i];
            var f = Math.max(0, 1 - (now - b.t) / LIFE) * (i / (n - 1)); // fades with age and toward the tail
            if (f <= 0.01) continue;
            ctx.strokeStyle = "rgba(" + rgb + "," + (pass ? 0.8 * f : 0.07 * f).toFixed(3) + ")";
            ctx.lineWidth = pass ? 0.7 + 1.8 * f : 3 + 6 * f;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      if (n) {
        var head = pts[n - 1], k = Math.max(0, 1 - (now - head.t) / LIFE);
        if (k > 0) {
          var g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 9);
          g.addColorStop(0, "rgba(" + rgb + "," + (0.35 * k).toFixed(3) + ")");
          g.addColorStop(1, "rgba(" + rgb + ",0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(head.x, head.y, 9, 0, 6.2832); ctx.fill();
        }
      }
      for (var j = 0; j < rings.length; j++) {
        var r = rings[j], p = (now - r.t) / RING, e = 1 - Math.pow(1 - p, 3);
        ctx.strokeStyle = "rgba(" + rgb + "," + (0.7 * (1 - p)).toFixed(3) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, 4 + 22 * e, 0, 6.2832); ctx.stroke();
      }
      if (pts.length || rings.length) raf = requestAnimationFrame(frame);
    }

    size(); readColor();
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var now = performance.now();
      var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      if (!list.length) list = [e];
      for (var i = 0; i < list.length; i++) add(list[i].clientX, list[i].clientY, now);
      kick();
    }, { passive: true });
    window.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      rings.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      kick();
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { pts = []; });
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(size, 150); });
    return readColor;
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
    var refreshTrail = setupTrail();
    setupTheme(function () { refreshParticles(); refreshTrail(); });
    setupHeader();
    setupReveal();
    setupFilters();
    setupCopy();
    setupPrefetch();
  });
})();
