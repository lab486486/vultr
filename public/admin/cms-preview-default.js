/**
 * Decap CMS editor UX:
 * - Action bar under body: 삭제(기존) | 미리보기 | 발행
 * - Hide duplicate top Publish / Delete controls
 * - Modal preview
 */
(function () {
  const STORAGE_KEY = "cms.preview-visible";
  const BTN_ATTR = "data-cms-preview-btn";
  const BAR_ATTR = "data-cms-editor-actions";
  const OPEN_CLASS = "cms-preview-modal-open";

  try {
    localStorage.setItem(STORAGE_KEY, "false");
  } catch {
    /* ignore */
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
      if (el.closest(`[${BAR_ATTR}]`)) continue;
      if (isPreviewTitle(el.getAttribute("title"))) return el;
    }
    return null;
  }

  function isPublishLabel(text) {
    const t = (text || "").replace(/\s+/g, " ").trim();
    return (
      t === "Publish" ||
      t === "Publishing..." ||
      t === "게시" ||
      t === "게시 중..." ||
      /^Publish\b/i.test(t) ||
      (t.startsWith("게시") && !t.includes("철회") && !t.includes("됨"))
    );
  }

  function isPublishNowLabel(text) {
    const t = (text || "").replace(/\s+/g, " ").trim();
    return (
      t === "Publish now" ||
      t === "Publish Now" ||
      t === "지금 게시" ||
      /publish\s*now/i.test(t)
    );
  }

  function isDeleteLabel(text) {
    const t = (text || "").replace(/\s+/g, " ").trim();
    return (
      t === "Delete entry" ||
      t === "Delete Entry" ||
      t === "항목 삭제" ||
      t === "게시된 항목 삭제" ||
      t === "게시 안된 항목 삭제" ||
      /^Delete\b/i.test(t)
    );
  }

  function findToolbarButton(root, matcher) {
    const nodes = root.querySelectorAll("button, [role='button']");
    for (const el of nodes) {
      if (el.closest(`[${BAR_ATTR}]`)) continue;
      const cls = typeof el.className === "string" ? el.className : "";
      if (matcher(el, cls)) return el;
    }
    return null;
  }

  function findPublishButton(root) {
    return findToolbarButton(
      root,
      (el, cls) => /PublishButton/i.test(cls) || isPublishLabel(el.textContent)
    );
  }

  function findDeleteButton(root) {
    return findToolbarButton(
      root,
      (el, cls) => /DeleteButton/i.test(cls) || isDeleteLabel(el.textContent)
    );
  }

  function findBodyAnchor(root) {
    const byField = root.querySelector('[data-cms-field="body"]');
    if (byField) return byField;
    const wrap = root.querySelector(".cms-tui-editor-wrap");
    if (wrap) {
      return (
        wrap.closest('[class*="ControlContainer"]') ||
        wrap.closest('[class*="ControlPane"]') ||
        wrap.parentElement ||
        wrap
      );
    }
    return null;
  }

  function hideNativeToggle(btn) {
    if (!btn || btn.getAttribute(BTN_ATTR) === "1") return;
    btn.setAttribute(BTN_ATTR, "1");
    btn.classList.add("cms-preview-native-hidden");
    btn.setAttribute("aria-hidden", "true");
    btn.tabIndex = -1;
  }

  function clickPublishNow(root) {
    const items = root.querySelectorAll(
      '[class*="DropdownItem"], [class*="dropdown"], li, button, a, [role="menuitem"]'
    );
    for (const item of items) {
      if (item.closest(`[${BAR_ATTR}]`)) continue;
      if (isPublishNowLabel(item.textContent)) {
        item.click();
        return true;
      }
    }
    return false;
  }

  function triggerPublish(root) {
    const publishBtn = findPublishButton(root);
    if (!publishBtn) return;
    publishBtn.click();
    window.setTimeout(() => {
      if (!clickPublishNow(root)) {
        window.setTimeout(() => clickPublishNow(root), 120);
      }
    }, 40);
  }

  function triggerDelete(root) {
    const deleteBtn = findDeleteButton(root);
    if (deleteBtn) deleteBtn.click();
  }

  function rebuildActionBar(bar, root, canDelete) {
    bar.innerHTML = "";

    if (canDelete) {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "cms-editor-action-btn cms-editor-action-delete";
      deleteBtn.setAttribute("data-cms-action", "delete");
      deleteBtn.setAttribute("title", "삭제");
      deleteBtn.textContent = "삭제";
      deleteBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        triggerDelete(root);
      });
      bar.appendChild(deleteBtn);

      const sep0 = document.createElement("span");
      sep0.className = "cms-editor-action-sep";
      sep0.setAttribute("aria-hidden", "true");
      sep0.textContent = "|";
      bar.appendChild(sep0);
    }

    const previewBtn = document.createElement("button");
    previewBtn.type = "button";
    previewBtn.className = "cms-editor-action-btn cms-editor-action-preview";
    previewBtn.setAttribute("data-cms-action", "preview");
    previewBtn.setAttribute("title", "미리보기");
    previewBtn.textContent = "미리보기";
    previewBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const toggle = findPreviewToggle(root);
      if (toggle) toggle.click();
    });
    bar.appendChild(previewBtn);

    const sep = document.createElement("span");
    sep.className = "cms-editor-action-sep";
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "|";
    bar.appendChild(sep);

    const publishBtn = document.createElement("button");
    publishBtn.type = "button";
    publishBtn.className = "cms-editor-action-btn cms-editor-action-publish";
    publishBtn.setAttribute("data-cms-action", "publish");
    publishBtn.setAttribute("title", "발행");
    publishBtn.textContent = "발행";
    publishBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      triggerPublish(root);
    });
    bar.appendChild(publishBtn);
  }

  function ensureActionBar(root) {
    const anchor = findBodyAnchor(root);
    if (!anchor || !anchor.parentElement) return null;

    const canDelete = Boolean(findDeleteButton(root));
    let bar = root.querySelector(`[${BAR_ATTR}]`);
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "cms-editor-actions";
      bar.setAttribute(BAR_ATTR, "1");
      rebuildActionBar(bar, root, canDelete);
      bar.dataset.deleteVisible = canDelete ? "1" : "0";
    } else if (bar.dataset.deleteVisible !== (canDelete ? "1" : "0")) {
      rebuildActionBar(bar, root, canDelete);
      bar.dataset.deleteVisible = canDelete ? "1" : "0";
    }

    if (bar.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement("afterend", bar);
    }

    return bar;
  }

  function syncProxyState(bar, open) {
    if (!bar) return;
    const previewBtn = bar.querySelector('[data-cms-action="preview"]');
    if (!previewBtn) return;
    previewBtn.setAttribute("aria-pressed", open ? "true" : "false");
    previewBtn.classList.toggle("is-active", open);
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
    return Boolean(
      root.querySelector('[class*="PreviewPaneFrame"]') ||
        root.querySelector('[class*="PreviewPaneContainer"] iframe') ||
        root.querySelector(".SplitPane .Pane2")
    );
  }

  function syncModalState(root, bar) {
    const open = previewIsVisible(root);
    document.documentElement.classList.toggle(OPEN_CLASS, open);
    syncProxyState(bar, open);
    ensureBackdrop();
    ensureCloseButton();
  }

  function scan(root) {
    const nativeBtn = findPreviewToggle(root);
    if (nativeBtn) hideNativeToggle(nativeBtn);
    const bar = ensureActionBar(root);
    syncModalState(root, bar);
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
