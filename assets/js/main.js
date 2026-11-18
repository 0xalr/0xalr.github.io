/* ALR — small progressive enhancements. The site works fully without JS. */
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY = "alr-theme";

  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function setupTheme() {
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
    });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      if (mq.addEventListener) mq.addEventListener("change", label);
    }
  }

  function setupHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function setupReveal() {
    var els = document.querySelectorAll(".reveal");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    // Stagger siblings that enter together.
    var io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty("--d", Math.min(i++ * 70, 350) + "ms");
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

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

  document.addEventListener("DOMContentLoaded", function () {
    setupTheme();
    setupHeader();
    setupReveal();
    setupFilters();
  });
})();
