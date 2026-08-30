/**
 * Frequent tags as text links under the tags input (max 5).
 * Clicking a link adds it into the Decap tags list.
 * Data: /admin/tag-stats.json (generated on build).
 */
(function () {
  const WRAP_ATTR = "data-cms-tag-suggestions";
  const HOST_ATTR = "data-cms-tag-suggest-host";
  const HINT_TEXT = "예: 호스팅 → /category/호스팅/";
  const FREQ_LABEL = "자주쓰는 카테고리:";
  const MAX = 5;
  let cachedTags = null;
  let loading = false;
  let adding = false;
  let observer = null;
  let paintToken = 0;

  function loadTags() {
    if (cachedTags) return Promise.resolve(cachedTags);
    if (loading) {
      return new Promise(function (resolve) {
        var n = 0;
        var id = setInterval(function () {
          n += 1;
          if (cachedTags || n > 40) {
            clearInterval(id);
            resolve(cachedTags || []);
          }
        }, 50);
      });
    }
    loading = true;
    return fetch("/admin/tag-stats.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("tag-stats missing");
        return res.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : data && data.tags ? data.tags : [];
        cachedTags = list
          .map(function (item) {
            if (typeof item === "string") return { name: item, count: 0 };
            return { name: String(item.name || "").trim(), count: Number(item.count) || 0 };
          })
          .filter(function (item) {
            return item.name;
          })
          .sort(function (a, b) {
            return b.count - a.count || a.name.localeCompare(b.name, "ko");
          })
          .slice(0, MAX);
        return cachedTags;
      })
      .catch(function () {
        cachedTags = [];
        return cachedTags;
      })
      .finally(function () {
        loading = false;
      });
  }

  function currentTags(field) {
    var values = [];
    field.querySelectorAll("input, textarea").forEach(function (input) {
      var v = String(input.value || "").trim();
      if (v) values.push(v);
    });
    return values;
  }

  function setReactInputValue(input, value) {
    var proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) descriptor.set.call(input, value);
    else input.value = value;

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    try {
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
    } catch {
      /* older browsers */
    }
  }

  function findAddButton(field) {
    var byClass = field.querySelector('[class*="AddButton"]');
    if (byClass) return byClass;

    var buttons = field.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.classList.contains("cms-tag-suggestion-link")) continue;
      var t = (btn.textContent || "").replace(/\s+/g, " ").trim();
      if (/추가|Add/i.test(t) && !/삭제|Delete|Remove|제거/i.test(t)) return btn;
    }

    for (var j = buttons.length - 1; j >= 0; j--) {
      var candidate = buttons[j];
      if (candidate.classList.contains("cms-tag-suggestion-link")) continue;
      var label = (candidate.textContent || "").replace(/\s+/g, " ").trim();
      if (/삭제|Delete|Remove|제거/i.test(label)) continue;
      return candidate;
    }
    return null;
  }

  function findEmptyOrLastInput(field) {
    var inputs = field.querySelectorAll("input[type='text'], input:not([type]), textarea");
    var target = null;
    for (var i = inputs.length - 1; i >= 0; i--) {
      if (!String(inputs[i].value || "").trim()) {
        target = inputs[i];
        break;
      }
    }
    if (!target && inputs.length) target = inputs[inputs.length - 1];
    return target;
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  async function addTag(field, tag) {
    if (adding) return;
    var existing = currentTags(field);
    if (existing.indexOf(tag) !== -1) return;

    adding = true;
    if (observer) observer.disconnect();

    try {
      var target = findEmptyOrLastInput(field);
      var needAdd = !target || String(target.value || "").trim() !== "";

      if (needAdd) {
        var addBtn = findAddButton(field);
        if (addBtn) {
          addBtn.click();
          await wait(80);
          target = findEmptyOrLastInput(field);
        }
      }

      if (!target) {
        await wait(120);
        target = findEmptyOrLastInput(field);
      }
      if (!target) return;

      if (String(target.value || "").trim() && String(target.value || "").trim() !== tag) {
        var addAgain = findAddButton(field);
        if (addAgain) {
          addAgain.click();
          await wait(80);
          target = findEmptyOrLastInput(field);
        }
      }
      if (!target) return;

      target.focus();
      setReactInputValue(target, tag);
      target.blur();
      await wait(30);
    } finally {
      adding = false;
      if (observer) {
        var root = document.getElementById("nc-root") || document.body;
        observer.observe(root, { childList: true, subtree: true });
      }
      scan(true);
    }
  }

  function removeLegacyFrequentSections(root) {
    root.querySelectorAll("[data-cms-tag-frequent]").forEach(function (node) {
      node.remove();
    });
  }

  function ensureHost(tagsField) {
    // Remove old side-by-side host leftovers inside the field.
    tagsField.querySelectorAll("[data-cms-tag-row]").forEach(function (node) {
      node.remove();
    });

    var host = tagsField.querySelector("[" + HOST_ATTR + "]");
    var needsRebuild =
      !host ||
      !host.querySelector(".cms-tag-suggestions-label") ||
      !host.querySelector("[data-cms-tag-links]") ||
      !host.querySelector(".cms-tag-hint");

    if (needsRebuild) {
      if (host) host.remove();
      host = document.createElement("div");
      host.setAttribute(HOST_ATTR, "1");

      var row = document.createElement("div");
      row.className = "cms-tag-suggestions";
      row.setAttribute(WRAP_ATTR, "1");

      var label = document.createElement("span");
      label.className = "cms-tag-suggestions-label";
      label.textContent = FREQ_LABEL;
      row.appendChild(label);

      var links = document.createElement("span");
      links.className = "cms-tag-suggestions-links";
      links.setAttribute("data-cms-tag-links", "1");
      row.appendChild(links);

      host.appendChild(row);

      var hint = document.createElement("p");
      hint.className = "cms-tag-hint";
      hint.textContent = HINT_TEXT;
      host.appendChild(hint);
    }

    // Place after the main control, before Decap hints if any.
    var hintEl = tagsField.querySelector('[class*="ControlHints"]');
    if (hintEl && hintEl.parentElement === tagsField) {
      tagsField.insertBefore(host, hintEl);
    } else if (host.parentElement !== tagsField) {
      tagsField.appendChild(host);
    }

    return host;
  }

  function paintSuggestions(host, tagsField, tags) {
    var wrap = host.querySelector("[data-cms-tag-links]") || host.querySelector("[" + WRAP_ATTR + "]");
    if (!wrap) return;

    var selected = currentTags(tagsField);
    var nextKey = tags
      .map(function (item) {
        return item.name + ":" + (selected.indexOf(item.name) !== -1 ? "1" : "0");
      })
      .join("|");
    if (wrap.dataset.paintKey === nextKey) return;
    wrap.dataset.paintKey = nextKey;
    wrap.innerHTML = "";

    tags.forEach(function (item, index) {
      if (index > 0) {
        var sep = document.createElement("span");
        sep.className = "cms-tag-suggestion-sep";
        sep.textContent = " ";
        wrap.appendChild(sep);
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cms-tag-suggestion-link";
      btn.textContent = item.name;
      btn.dataset.tagName = item.name;
      btn.title = item.name + " · 클릭해서 추가";
      if (selected.indexOf(item.name) !== -1) {
        btn.classList.add("is-selected");
        btn.disabled = true;
      }
      wrap.appendChild(btn);
    });
  }

  function scan(force) {
    var root = document.getElementById("nc-root") || document.body;
    removeLegacyFrequentSections(root);
    var field = root.querySelector('[data-cms-field="tags"]');
    if (!field) return;
    var token = ++paintToken;
    loadTags().then(function (tags) {
      if (!force && token !== paintToken) return;
      var host = ensureHost(field);
      if (!host) return;
      paintSuggestions(host, field, tags);
    });
  }

  function onLinkClick(event) {
    var btn = event.target && event.target.closest ? event.target.closest(".cms-tag-suggestion-link") : null;
    if (!btn) return;
    if (!btn.closest("[" + HOST_ATTR + "]")) return;
    if (btn.disabled) return;

    event.preventDefault();
    event.stopPropagation();

    var field = document.querySelector('[data-cms-field="tags"]');
    if (!field) return;
    var name = (btn.dataset.tagName || "").trim();
    if (!name) return;
    addTag(field, name);
  }

  function start() {
    document.addEventListener("click", onLinkClick, true);
    scan(true);
    var root = document.getElementById("nc-root") || document.body;
    var scheduled = false;
    observer = new MutationObserver(function () {
      if (adding || scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        if (!adding) scan(false);
      });
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
