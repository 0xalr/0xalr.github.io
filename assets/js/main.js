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
      var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
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

  /* ---------- ambient particles ---------- */
  function setupParticles() {
    var canvas = document.querySelector(".particles");
    if (!canvas || !canvas.getContext) return function () {};
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, parts = [], color = "164,184,108", raf = null;

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
      var count = Math.round(Math.min(70, Math.max(26, (w * h) / 24000)));
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.4 + 0.4,
          vx: (Math.random() - 0.5) * 0.12, vy: -(Math.random() * 0.18 + 0.03),
          a: Math.random() * 0.5 + 0.15, tw: Math.random() * Math.PI * 2
        });
      }
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!reduceMotion) {
          p.x += p.vx; p.y += p.vy;
          if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
          if (p.x < -5) p.x = w + 5; else if (p.x > w + 5) p.x = -5;
        }
        var alpha = p.a * (0.65 + 0.35 * Math.sin((t || 0) / 1400 + p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + color + "," + alpha.toFixed(3) + ")";
        ctx.fill();
      }
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    }
    function start() { if (raf == null) { raf = requestAnimationFrame(draw); } }
    function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }

    readColor(); resize(); draw(0);
    if (!reduceMotion) start();
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { resize(); if (reduceMotion) draw(0); }, 150); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (!reduceMotion) start(); });
    return function () { readColor(); if (reduceMotion) draw(0); };
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

  /* ---------- contact form ---------- */
  function setupContact() {
    var form = document.getElementById("contact-form");
    if (!form || !window.fetch) return;
    var status = form.querySelector(".form-status");
    var btn = form.querySelector("button[type=submit]");
    var label = btn.querySelector(".btn-label");
    var fields = [
      { el: form.elements.name, err: document.getElementById("f-name-err"), ok: function (v) { return v.trim().length > 0; } },
      { el: form.elements.email, err: document.getElementById("f-email-err"), ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); } },
      { el: form.elements.message, err: document.getElementById("f-message-err"), ok: function (v) { return v.trim().length > 0; } }
    ];
    function check(f) {
      var good = f.ok(f.el.value);
      f.el.setAttribute("aria-invalid", good ? "false" : "true");
      if (good) f.el.removeAttribute("aria-describedby"); else f.el.setAttribute("aria-describedby", f.err.id);
      f.err.hidden = good;
      return good;
    }
    fields.forEach(function (f) {
      f.el.addEventListener("blur", function () { if (f.el.value) check(f); });
      f.el.addEventListener("input", function () { if (f.el.getAttribute("aria-invalid") === "true") check(f); });
    });
    function setStatus(msg, kind) {
      status.textContent = msg;
      status.className = "form-status" + (kind ? " is-" + kind : "");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (f) { if (!check(f) && !firstBad) firstBad = f.el; });
      if (firstBad) { firstBad.focus(); setStatus("Please fix the highlighted fields.", "err"); return; }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (data._honey) return; // bot
      data._replyto = data.email;

      btn.disabled = true; label.textContent = "Sending…"; setStatus("");
      fetch(form.getAttribute("data-ajax"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, body: j }; });
      }).then(function (res) {
        var success = res.ok && (res.body.success === true || res.body.success === "true");
        if (success) {
          form.reset();
          fields.forEach(function (f) { f.el.removeAttribute("aria-invalid"); });
          setStatus("Thanks — your message is on its way. I'll reply by email.", "ok");
        } else if (/activat/i.test(res.body.message || "")) {
          setStatus("The contact form is still being set up, so your message wasn't delivered. Please try again later.", "err");
        } else {
          setStatus("Sorry, the message couldn't be sent" + (res.body.message ? " (" + res.body.message + ")" : "") + ". Please try again in a moment.", "err");
        }
      }).catch(function () {
        setStatus("Network error — please check your connection and try again.", "err");
      }).then(function () {
        btn.disabled = false; label.textContent = "Send message";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var refreshParticles = setupParticles();
    setupTheme(refreshParticles);
    setupHeader();
    setupReveal();
    setupFilters();
    setupContact();
  });
})();
