/**
 * Sidebar: "쿠팡파트너스 API Key" → /admin/coupang (new tab)
 */
(function () {
  const PAGE = "/admin/coupang";
  const ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 7h10a2 2 0 0 1 2 2v1H5V9a2 2 0 0 1 2-2Zm12 5H5v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5ZM9 15.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>';
  const EXTERNAL_ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h6v2H7v10h10v-4h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/></svg>';

  let started = false;
  let pending = false;

  function getRoot() {
    return document.getElementById("nc-root");
  }

  function getSidebar(root) {
    return root.querySelector("aside") || root.querySelector('[class*="Sidebar"]');
  }

  function copySampleClasses(from, to) {
    if (!from) return;
    from.classList.forEach(function (cls) {
      if (cls.indexOf("cms-") === 0) return;
      to.classList.add(cls);
    });
  }

  function ensureNavLink(root) {
    const sidebar = getSidebar(root);
    if (!sidebar) return;

    let link = sidebar.querySelector("a.cms-coupang-nav");
    const shortlinks = sidebar.querySelector("a.cms-shortlinks-nav");
    const adsense =
      sidebar.querySelector('a[href="#/collections/adsense"]') ||
      sidebar.querySelector('a[href*="#/collections/adsense"]');
    const sample =
      shortlinks ||
      adsense ||
      sidebar.querySelector('a[href="#/collections/nav"]') ||
      sidebar.querySelector('a[href^="#/collections/"]');
    if (!sample || !sample.parentElement) return;

    if (!link) {
      link = document.createElement("a");
      link.className = "cms-coupang-nav cms-collection-link";
      link.dataset.collection = "coupang";
      copySampleClasses(sample, link);

      const icon = document.createElement("span");
      icon.className = "cms-collection-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = ICON;
      link.appendChild(icon);

      const label = document.createElement("span");
      label.className = "cms-coupang-label";
      label.textContent = "쿠팡파트너스 API Key";
      link.appendChild(label);

      link.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        window.open(PAGE, "_blank", "noopener");
      });
    }

    if (!link.querySelector(".cms-coupang-external")) {
      const external = document.createElement("span");
      external.className = "cms-coupang-external";
      external.setAttribute("aria-hidden", "true");
      external.title = "새 창에서 열기";
      external.innerHTML = EXTERNAL_ICON;
      link.appendChild(external);
    }

    link.href = PAGE;
    link.target = "_blank";
    link.rel = "noopener";
    link.title = "쿠팡파트너스 API Key 설정";

    // Place above shortlinks (or adsense) so it sits near monetization tools.
    const anchor = shortlinks || adsense;
    if (anchor && anchor.parentElement === sample.parentElement) {
      if (link.nextElementSibling !== anchor) {
        anchor.parentElement.insertBefore(link, anchor);
      }
    } else if (!link.isConnected) {
      sample.parentElement.insertBefore(link, sample);
    }
  }

  function sync() {
    const root = getRoot();
    if (!root) return;
    ensureNavLink(root);
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
    if (started) return;
    started = true;
    const root = getRoot();
    if (!root) return;
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("hashchange", schedule);
    schedule();
  }

  function waitForCms() {
    const root = getRoot();
    if (root && root.firstElementChild) {
      start();
      return;
    }
    window.requestAnimationFrame(waitForCms);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForCms);
  } else {
    waitForCms();
  }
})();
