/**
 * Decap CMS custom media library for Cloudflare R2.
 *
 * Uploads via same-origin Pages Function PUT /api/upload/*
 * and inserts the public R2 URL into the editor field.
 */
(function () {
  var MAX_WIDTH = 800;
  var JPEG_QUALITY = 0.8;
  var SKIP_TYPES = ["image/svg+xml", "image/gif"];

  function isCompressible(file) {
    return file.type && file.type.indexOf("image/") === 0 && SKIP_TYPES.indexOf(file.type) === -1;
  }

  function compressImage(file) {
    if (!isCompressible(file)) {
      return Promise.resolve(file);
    }

    return new Promise(function (resolve) {
      var img = new Image();
      var objectUrl = URL.createObjectURL(file);

      img.onload = function () {
        URL.revokeObjectURL(objectUrl);

        var width = img.naturalWidth;
        var height = img.naturalHeight;
        if (!width || !height) {
          resolve(file);
          return;
        }

        var scale = width > MAX_WIDTH ? MAX_WIDTH / width : 1;
        var targetWidth = Math.round(width * scale);
        var targetHeight = Math.round(height * scale);

        if (scale === 1 && file.size < 300 * 1024) {
          resolve(file);
          return;
        }

        var canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        var ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        var outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        var quality = outputType === "image/jpeg" ? JPEG_QUALITY : undefined;

        canvas.toBlob(
          function (blob) {
            if (!blob || blob.size >= file.size) {
              resolve(file);
              return;
            }

            var ext = outputType === "image/png" ? ".png" : ".jpg";
            var baseName = file.name.replace(/\.[^.]+$/, "") + ext;
            resolve(
              new File([blob], baseName, {
                type: outputType,
                lastModified: Date.now(),
              }),
            );
          },
          outputType,
          quality,
        );
      };

      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  }

  function uploadFile(file, uploadUrl, publicBaseUrl) {
    if (!uploadUrl) {
      return Promise.reject(
        new Error("upload_url이 config.yml media_library.config에 설정되지 않았습니다."),
      );
    }

    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    var key = "uploads/" + year + "/" + month + "/" + Date.now() + "-" + safeName;
    var base = uploadUrl.replace(/\/$/, "");

    return fetch(base + "/" + key, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
      credentials: "same-origin",
    })
      .then(function (response) {
        if (!response.ok) {
          return response.text().then(function (text) {
            throw new Error(text || "HTTP " + response.status);
          });
        }
        return response.json();
      })
      .then(function (data) {
        return data.url || publicBaseUrl + "/" + key;
      });
  }

  function removeNode(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  /**
   * Visible modal avoids silent failures from programmatic input.click()
   * when the browser blocks it outside a direct user gesture.
   */
  function pickFiles(opts) {
    var imagesOnly = opts.imagesOnly !== false;
    var allowMultiple = !!opts.allowMultiple;

    return new Promise(function (resolve) {
      var settled = false;

      function finish(result) {
        if (settled) return;
        settled = true;
        removeNode(overlay);
        resolve(result);
      }

      var overlay = document.createElement("div");
      overlay.setAttribute("data-r2-media-library", "true");
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;";

      var panel = document.createElement("div");
      panel.style.cssText =
        "background:#fff;border-radius:10px;padding:24px 28px;min-width:300px;max-width:90vw;box-shadow:0 12px 40px rgba(0,0,0,.25);font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;";

      var title = document.createElement("p");
      title.textContent = "R2에 이미지 업로드";
      title.style.cssText = "margin:0 0 16px;font-size:16px;font-weight:600;color:#111;";

      var hint = document.createElement("p");
      hint.textContent = "업로드할 파일을 선택하세요.";
      hint.style.cssText = "margin:0 0 20px;color:#555;";

      var input = document.createElement("input");
      input.type = "file";
      input.style.display = "none";
      if (imagesOnly) {
        input.accept = "image/*";
      }
      if (allowMultiple) {
        input.multiple = true;
      }

      var pickBtn = document.createElement("button");
      pickBtn.type = "button";
      pickBtn.textContent = "파일 선택";
      pickBtn.style.cssText =
        "display:inline-block;margin:0 8px 0 0;padding:10px 18px;border:0;border-radius:6px;background:#007788;color:#fff;font:inherit;cursor:pointer;";

      var cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "취소";
      cancelBtn.style.cssText =
        "display:inline-block;padding:10px 18px;border:1px solid #ccc;border-radius:6px;background:#fff;color:#333;font:inherit;cursor:pointer;";

      var status = document.createElement("p");
      status.style.cssText = "margin:16px 0 0;color:#007788;min-height:1.2em;";

      pickBtn.addEventListener("click", function () {
        input.click();
      });

      cancelBtn.addEventListener("click", function () {
        finish({ assets: [] });
      });

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
          finish({ assets: [] });
        }
      });

      input.addEventListener("change", function () {
        var files = Array.from(input.files || []);
        if (files.length === 0) {
          return;
        }
        finish({ files: files });
      });

      panel.appendChild(title);
      panel.appendChild(hint);
      panel.appendChild(input);
      panel.appendChild(pickBtn);
      panel.appendChild(cancelBtn);
      panel.appendChild(status);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
    });
  }

  function init(_ref) {
    var options = _ref.options || {};
    var handleInsert = _ref.handleInsert;
    var cfg = options.config || {};
    var uploadUrl = cfg.upload_url || "";
    var publicBaseUrl = (cfg.public_base_url || "").replace(/\/$/, "");

    return {
      show: function (showOpts) {
        var imagesOnly = showOpts && showOpts.imagesOnly;
        var allowMultiple = showOpts && showOpts.allowMultiple;

        return pickFiles({ imagesOnly: imagesOnly, allowMultiple: allowMultiple }).then(function (
          picked,
        ) {
          if (!picked.files || picked.files.length === 0) {
            return { assets: [] };
          }

          var overlay = document.querySelector("[data-r2-media-library='true']");
          var status = overlay && overlay.querySelector("p:last-child");
          if (status) {
            status.textContent = "압축 및 업로드 중…";
          }

          return Promise.all(
            picked.files.map(function (file) {
              return compressImage(file).then(function (compressed) {
                return uploadFile(compressed, uploadUrl, publicBaseUrl);
              });
            }),
          )
            .then(function (urls) {
              urls.forEach(function (url) {
                if (handleInsert) {
                  handleInsert(url);
                }
              });
              removeNode(overlay);
              return {
                assets: urls.map(function (url, i) {
                  return { url: url, name: picked.files[i].name };
                }),
              };
            })
            .catch(function (err) {
              removeNode(overlay);
              alert("업로드 실패: " + err.message);
              return { assets: [] };
            });
        });
      },

      hide: function () {
        var overlay = document.querySelector("[data-r2-media-library='true']");
        removeNode(overlay);
        return Promise.resolve();
      },

      enableStandalone: function () {
        return false;
      },
    };
  }

  window.R2MediaLibrary = {
    name: "r2",
    init: init,
  };
})();
