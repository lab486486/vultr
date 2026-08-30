/**
 * Decap sidebar visual order + section dividers (vultr).
 *
 * IMPORTANT: Do not move React-managed collection <a> nodes — that breaks
 * Decap routing/clicks. Use flex `order` + border dividers instead.
 *
 *   사이트 설정
 *   ──
 *   애드센스 / 쿠팡파트너스
 *   ──
 *   기존 글 목록 / 새 글쓰기
 */
(function () {
  var MARK = "data-cms-sidebar-ordered";

  function getRoot() {
    return document.getElementById("nc-root");
  }

  function getSidebar(root) {
    return root.querySelector("aside") || root.querySelector('[class*="SidebarNav"]') ||
      root.querySelector('[class*="Sidebar"]');
  }

  function hrefOf(el) {
    return (el.getAttribute("href") || "").split("?")[0];
  }

  function isExactCollection(href, name) {
    return href === "#/collections/" + name || href === "#/collections/" + name + "/";
  }

  function findLinks(sidebar) {
    var all = Array.prototype.slice.call(
      sidebar.querySelectorAll('a[href^="#/collections/"], a.cms-coupang-nav'),
    );
    var byKey = {
      site: null,
      adsense: null,
      coupang: null,
      blog: null,
      blog_new: null,
    };

    all.forEach(function (link) {
      // Skip entry deep-links in case they appear in nav chrome
      var href = hrefOf(link);
      if (href.indexOf("/entries/") !== -1) return;

      if (link.classList.contains("cms-coupang-nav")) {
        byKey.coupang = link;
        return;
      }
      if (isExactCollection(href, "site")) byKey.site = link;
      else if (isExactCollection(href, "adsense")) byKey.adsense = link;
      else if (isExactCollection(href, "blog_new")) byKey.blog_new = link;
      else if (isExactCollection(href, "blog")) byKey.blog = link;
    });

    return byKey;
  }

  function rowFor(link) {
    if (!link) return null;
    return link.closest("li") || link;
  }

  function clearSectionClasses(sidebar) {
    sidebar.querySelectorAll(".cms-nav-section-start").forEach(function (el) {
      el.classList.remove("cms-nav-section-start");
    });
  }

  function applyOrder(sidebar) {
    var links = findLinks(sidebar);
    var rows = {
      site: rowFor(links.site),
      adsense: rowFor(links.adsense),
      coupang: rowFor(links.coupang),
      blog: rowFor(links.blog),
      blog_new: rowFor(links.blog_new),
    };

    var sample = rows.site || rows.adsense || rows.blog || rows.blog_new || rows.coupang;
    if (!sample || !sample.parentElement) return false;

    var parent = sample.parentElement;
    parent.classList.add("cms-sidebar-nav-list");
    parent.setAttribute(MARK, "1");

    // Flex order — keep DOM ownership with React
    var orderMap = [
      [rows.site, 10],
      [rows.adsense, 30],
      [rows.coupang, 40],
      [rows.blog, 60],
      [rows.blog_new, 70],
    ];

    orderMap.forEach(function (pair) {
      var node = pair[0];
      var order = pair[1];
      if (!node) return;
      node.style.order = String(order);
    });

    clearSectionClasses(sidebar);

    // Visual dividers via border on first item of each following section
    var monetizeStart = rows.adsense || rows.coupang;
    var postsStart = rows.blog || rows.blog_new;
    if (monetizeStart) monetizeStart.classList.add("cms-nav-section-start");
    if (postsStart) postsStart.classList.add("cms-nav-section-start");

    return true;
  }

  var pending = false;
  var lastSig = "";

  function signature(sidebar) {
    var links = findLinks(sidebar);
    return [
      links.site ? "1" : "0",
      links.adsense ? "1" : "0",
      links.coupang ? "1" : "0",
      links.blog ? "1" : "0",
      links.blog_new ? "1" : "0",
    ].join("");
  }

  function sync() {
    var root = getRoot();
    if (!root) return;
    var sidebar = getSidebar(root);
    if (!sidebar) return;

    var sig = signature(sidebar);
    // Still re-apply order classes cheaply; avoid work if nav not ready
    if (sig === "00000") return;
    if (sig === lastSig && sidebar.querySelector(".cms-sidebar-nav-list[" + MARK + "]")) {
      return;
    }
    if (applyOrder(sidebar)) lastSig = sig;
  }

  function schedule() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      sync();
    });
  }

  function start() {
    var root = getRoot();
    if (!root || !root.firstElementChild) {
      window.requestAnimationFrame(start);
      return;
    }
    schedule();
    var observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("hashchange", schedule);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
