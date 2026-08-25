/**
 * Decap CMS writing UX:
 * - Keep split preview off by default (full writing focus)
 * - Writing pane uses most of the horizontal viewport
 * - "미리보기" button opens Decap preview as a centered popup, not a side pane
 */
(function () {
  var STORAGE_KEY = "cms.preview-visible";
  var POPUP_CLASS = "cms-preview-popup";
  var BTN_ATTR = "data-cms-preview-btn";

  try {
    localStorage.setItem(STORAGE_KEY, "false");
  } catch (_) {
    /* ignore */
  }

  function isPreviewToggle(el) {
    var title = (el.getAttribute("title") || "").trim();
    return (
      title === "미리보기 토글" ||
      title === "Toggle preview" ||
      title.indexOf("미리보기") !== -1 ||
      /preview/i.test(title)
    );
  }

  function findPreviewToggle(root) {
    var list = (root || document).querySelectorAll("button[title], [role='button'][title]");
    for (var i = 0; i < list.length; i++) {
      if (isPreviewToggle(list[i])) return list[i];
    }
    return null;
  }

  function previewIsMounted() {
    return !!document.getElementById("preview-pane");
  }

  function setPopupOpen(open) {
    document.documentElement.classList.toggle(POPUP_CLASS, !!open);
    ensureChrome(!!open);
  }

  function ensureChrome(open) {
    var backdrop = document.getElementById("cms-preview-backdrop");
    var closeBtn = document.getElementById("cms-preview-close");

    if (!open) {
      if (backdrop) backdrop.hidden = true;
      if (closeBtn) closeBtn.hidden = true;
      return;
    }

    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "cms-preview-backdrop";
      backdrop.className = "cms-preview-backdrop";
      backdrop.addEventListener("click", closePreview);
      document.body.appendChild(backdrop);
    }
    backdrop.hidden = false;

    if (!closeBtn) {
      closeBtn = document.createElement("button");
      closeBtn.id = "cms-preview-close";
      closeBtn.type = "button";
      closeBtn.className = "cms-preview-close";
      closeBtn.setAttribute("aria-label", "미리보기 닫기");
      closeBtn.textContent = "닫기";
      closeBtn.addEventListener("click", closePreview);
      document.body.appendChild(closeBtn);
    }
    closeBtn.hidden = false;
  }

  function syncPopupFromDom() {
    setPopupOpen(previewIsMounted());
  }

  function closePreview(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!previewIsMounted()) {
      setPopupOpen(false);
      return;
    }
    var btn = findPreviewToggle(document);
    if (btn) {
      btn.click();
      requestAnimationFrame(function () {
        setTimeout(syncPopupFromDom, 50);
      });
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, "false");
      } catch (_) {
        /* ignore */
      }
      setPopupOpen(false);
    }
  }

  function enhanceButton(btn) {
    if (!btn || btn.getAttribute(BTN_ATTR) === "1") return;
    btn.setAttribute(BTN_ATTR, "1");
    btn.classList.add("cms-preview-btn");
    btn.setAttribute("aria-label", "미리보기");

    if (!btn.querySelector(".cms-preview-btn-label")) {
      var label = document.createElement("span");
      label.className = "cms-preview-btn-label";
      label.textContent = "미리보기";
      btn.appendChild(label);
    }

    btn.addEventListener(
      "click",
      function () {
        // Decap toggles first; sync popup mode on next frames
        requestAnimationFrame(function () {
          setTimeout(syncPopupFromDom, 30);
          setTimeout(syncPopupFromDom, 120);
        });
      },
      false
    );
  }

  function scan(root) {
    var btn = findPreviewToggle(root);
    if (btn) enhanceButton(btn);
    syncPopupFromDom();
  }

  function onKeydown(event) {
    if (event.key === "Escape" && document.documentElement.classList.contains(POPUP_CLASS)) {
      closePreview(event);
    }
  }

  function start() {
    var root = document.getElementById("nc-root") || document.body;
    scan(root);
    var observer = new MutationObserver(function () {
      scan(root);
    });
    observer.observe(root, { childList: true, subtree: true });
    document.addEventListener("keydown", onKeydown);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
