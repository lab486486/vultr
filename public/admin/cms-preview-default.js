/**
 * Decap CMS editor UX:
 * - Keep side-by-side preview off by default (full writing focus).
 * - Label the native preview control as "미리보기".
 * - When preview is on, treat it as a centered modal (not a split pane).
 * - Editor column is wider than the live post for comfortable WYSIWYG writing.
 */
(function () {
  const STORAGE_KEY = "cms.preview-visible";
  const BTN_ATTR = "data-cms-preview-btn";
  const OPEN_CLASS = "cms-preview-modal-open";

  try {
    localStorage.setItem(STORAGE_KEY, "false");
  } catch {
    /* ignore private mode */
  }

  function isPreviewTitle(title) {
    const t = (title || "").trim();
    return (
      t === "미리보기 토글" ||
      t === "Toggle preview" ||
      t.includes("미리보기") ||
      /preview/i.test(t)
    );
  }

  function findPreviewToggle(root) {
    const candidates = root.querySelectorAll("button[title], [role='button'][title]");
    for (const el of candidates) {
      if (isPreviewTitle(el.getAttribute("title"))) return el;
    }
    return null;
  }

  function enhanceButton(btn) {
    if (!btn || btn.getAttribute(BTN_ATTR) === "1") return;
    btn.setAttribute(BTN_ATTR, "1");
    btn.classList.add("cms-preview-toggle-btn");

    if (!btn.querySelector(".cms-preview-toggle-label")) {
      const label = document.createElement("span");
      label.className = "cms-preview-toggle-label";
      label.textContent = "미리보기";
      btn.appendChild(label);
    }
  }

  function ensureBackdrop() {
    let backdrop = document.querySelector("[data-cms-preview-backdrop]");
    if (backdrop) return backdrop;
    backdrop = document.createElement("div");
    backdrop.className = "cms-preview-backdrop";
    backdrop.dataset.cmsPreviewBackdrop = "1";
    backdrop.addEventListener("click", () => {
      const btn = findPreviewToggle(document.getElementById("nc-root") || document.body);
      if (btn) btn.click();
    });
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function ensureCloseButton() {
    let closeBtn = document.querySelector("[data-cms-preview-close]");
    if (closeBtn) return closeBtn;
    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "cms-preview-close";
    closeBtn.dataset.cmsPreviewClose = "1";
    closeBtn.setAttribute("aria-label", "미리보기 닫기");
    closeBtn.textContent = "닫기";
    closeBtn.addEventListener("click", () => {
      const btn = findPreviewToggle(document.getElementById("nc-root") || document.body);
      if (btn) btn.click();
    });
    document.body.appendChild(closeBtn);
    return closeBtn;
  }

  function previewIsVisible(root) {
    // Decap renders PreviewPaneFrame / PreviewPaneContainer only when preview is on.
    return Boolean(
      root.querySelector('[class*="PreviewPaneFrame"]') ||
        root.querySelector('[class*="PreviewPaneContainer"] iframe') ||
        root.querySelector(".SplitPane .Pane2")
    );
  }

  function syncModalState(root) {
    const open = previewIsVisible(root);
    document.documentElement.classList.toggle(OPEN_CLASS, open);
    ensureBackdrop();
    ensureCloseButton();
  }

  function scan(root) {
    const btn = findPreviewToggle(root);
    if (btn) enhanceButton(btn);
    syncModalState(root);
  }

  function start() {
    ensureBackdrop();
    ensureCloseButton();
    const root = document.getElementById("nc-root") || document.body;
    scan(root);
    const observer = new MutationObserver(() => scan(root));
    observer.observe(root, { childList: true, subtree: true });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.documentElement.classList.contains(OPEN_CLASS)) {
        const btn = findPreviewToggle(root);
        if (btn) btn.click();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
