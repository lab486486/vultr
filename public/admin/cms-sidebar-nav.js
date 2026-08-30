/**
 * Decap sidebar order + dividers for vultr admin:
 *   사이트 설정
 *   ──
 *   애드센스 / 쿠팡파트너스 (수익)
 *   ──
 *   기존 글 목록 / 새 글쓰기
 */
(function () {
  var DIVIDER_ATTR = "data-cms-sidebar-divider";

  function getRoot() {
    return document.getElementById("nc-root");
  }

  function getSidebar(root) {
    return root.querySelector("aside") || root.querySelector('[class*="Sidebar"]');
  }

  function collectionHref(el) {
    return (el.getAttribute("href") || "").split("?")[0];
  }

  function isExactCollection(href, name) {
    return (
      href === "#/collections/" + name ||
      href === "#/collections/" + name + "/"
    );
  }

  /** Prefer the list-item wrapper so Decap layout stays intact. */
  function rowFor(link) {
    if (!link) return null;
    var li = link.closest("li");
    return li || link;
  }

  function findRows(sidebar) {
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
      if (link.classList.contains("cms-coupang-nav")) {
        byKey.coupang = rowFor(link);
        return;
      }
      var href = collectionHref(link);
      if (isExactCollection(href, "site")) byKey.site = rowFor(link);
      else if (isExactCollection(href, "adsense")) byKey.adsense = rowFor(link);
      else if (isExactCollection(href, "blog_new")) byKey.blog_new = rowFor(link);
      else if (isExactCollection(href, "blog")) byKey.blog = rowFor(link);
    });

    return byKey;
  }

  function ensureDivider(id) {
    var el = document.querySelector("[" + DIVIDER_ATTR + '="' + id + '"]');
    if (el) return el;
    el = document.createElement("div");
    el.className = "cms-sidebar-divider";
    el.setAttribute(DIVIDER_ATTR, id);
    el.setAttribute("role", "separator");
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  function parentList(rows) {
    var sample =
      rows.site ||
      rows.adsense ||
      rows.blog ||
      rows.blog_new ||
      rows.coupang;
    return sample && sample.parentElement ? sample.parentElement : null;
  }

  function reorder(sidebar) {
    var rows = findRows(sidebar);
    var parent = parentList(rows);
    if (!parent) return;

    var ordered = [];
    if (rows.site) ordered.push(rows.site);
    ordered.push(ensureDivider("after-site"));
    if (rows.adsense) ordered.push(rows.adsense);
    if (rows.coupang) ordered.push(rows.coupang);
    ordered.push(ensureDivider("after-monetize"));
    if (rows.blog) ordered.push(rows.blog);
    if (rows.blog_new) ordered.push(rows.blog_new);
    if (ordered.length < 2) return;

    var children = Array.prototype.slice.call(parent.children);
    var anchorPrev = null;
    for (var i = 0; i < children.length; i++) {
      if (ordered.indexOf(children[i]) === -1) continue;
      anchorPrev = i > 0 ? children[i - 1] : null;
      while (anchorPrev && ordered.indexOf(anchorPrev) !== -1) {
        var idx = children.indexOf(anchorPrev);
        anchorPrev = idx > 0 ? children[idx - 1] : null;
      }
      break;
    }

    var frag = document.createDocumentFragment();
    ordered.forEach(function (node) {
      frag.appendChild(node);
    });

    if (anchorPrev && anchorPrev.parentNode === parent) {
      parent.insertBefore(frag, anchorPrev.nextSibling);
    } else {
      parent.insertBefore(frag, parent.firstChild);
    }
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      var root = getRoot();
      if (!root) return;
      var sidebar = getSidebar(root);
      if (!sidebar) return;
      reorder(sidebar);
    });
  }

  function start() {
    var root = getRoot();
    if (!root) {
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
