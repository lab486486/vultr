/**
 * Decap CMS: hide the split preview pane by default so the editor is full width.
 * The built-in eye toggle remains; we restyle it as a clear "미리보기" button.
 */
(function () {
  try {
    localStorage.setItem("cms.preview-visible", "false");
  } catch (_) {
    /* ignore quota / private mode */
  }

  function isPreviewToggle(btn) {
    var title = (btn.getAttribute("title") || "").toLowerCase();
    return (
      title.indexOf("미리보기") !== -1 ||
      title.indexOf("toggle preview") !== -1 ||
      title.indexOf("preview") !== -1
    );
  }

  function enhanceButton(btn) {
    if (!btn || btn.dataset.cmsPreviewBtn === "1") return;
    if (!isPreviewToggle(btn)) return;

    btn.dataset.cmsPreviewBtn = "1";
    btn.classList.add("cms-preview-btn");
    btn.setAttribute("aria-label", "미리보기");

    if (!btn.querySelector(".cms-preview-btn-label")) {
      var label = document.createElement("span");
      label.className = "cms-preview-btn-label";
      label.textContent = "미리보기";
      btn.appendChild(label);
    }
  }

  function scan(root) {
    (root || document).querySelectorAll("button[title]").forEach(enhanceButton);
  }

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var nodes = mutations[i].addedNodes;
      for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches("button[title]")) enhanceButton(node);
        if (node.querySelectorAll) scan(node);
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    scan(document);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      observer.observe(document.body, { childList: true, subtree: true });
      scan(document);
    });
  }
})();
