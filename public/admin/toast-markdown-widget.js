/**
 * Decap CMS custom widget: Toast UI Editor (@toast-ui/editor)
 * Outputs markdown for the blog `body` field.
 */
(function () {
  var UPLOAD_URL = "/api/upload";
  var PUBLIC_BASE =
    "https://pub-9b066cc3e4094ff8946656c10cbb9f3d.r2.dev";
  var MAX_WIDTH = 800;
  var JPEG_QUALITY = 0.8;

  function getEditorCtor() {
    if (window.toastui && window.toastui.Editor) return window.toastui.Editor;
    if (window.Editor) return window.Editor;
    return null;
  }

  function compressImage(file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      return Promise.resolve(file);
    }
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
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
        if (scale === 1 && file.size < 300 * 1024) {
          resolve(file);
          return;
        }
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        var ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        var outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        canvas.toBlob(
          function (blob) {
            if (!blob || blob.size >= file.size) {
              resolve(file);
              return;
            }
            var ext = outputType === "image/png" ? ".png" : ".jpg";
            resolve(
              new File([blob], file.name.replace(/\.[^.]+$/, "") + ext, {
                type: outputType,
                lastModified: Date.now(),
              }),
            );
          },
          outputType,
          outputType === "image/jpeg" ? JPEG_QUALITY : undefined,
        );
      };
      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }

  function uploadBlob(blob) {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var rawName = blob.name || "image.png";
    var safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
    var key = "uploads/" + year + "/" + month + "/" + Date.now() + "-" + safeName;
    var base = UPLOAD_URL.replace(/\/$/, "");

    return fetch(base + "/" + key, {
      method: "PUT",
      headers: { "Content-Type": blob.type || "application/octet-stream" },
      body: blob,
      credentials: "same-origin",
    }).then(function (response) {
      if (!response.ok) {
        return response.text().then(function (text) {
          throw new Error(text || "HTTP " + response.status);
        });
      }
      return response.json();
    }).then(function (data) {
      return data.url || PUBLIC_BASE + "/" + key;
    });
  }

  var ToastMarkdownControl = createClass({
    displayName: "ToastMarkdownControl",

    getInitialState: function () {
      return { error: null };
    },

    componentDidMount: function () {
      var EditorCtor = getEditorCtor();
      if (!EditorCtor) {
        this.setState({
          error: "Toast UI Editor를 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
        });
        return;
      }

      var self = this;
      var initial = typeof this.props.value === "string" ? this.props.value : "";
      var editorHeight = Math.max(560, window.innerHeight - 220) + "px";

      this._updatingFromEditor = false;
      this.editor = new EditorCtor({
        el: this._el,
        // Tall writing surface; horizontal prose width stays ~44rem via CSS.
        height: editorHeight,
        minHeight: "560px",
        initialValue: initial,
        initialEditType: "wysiwyg",
        previewStyle: "tab",
        hideModeSwitch: false,
        usageStatistics: false,
        language: "ko-KR",
        autofocus: false,
        toolbarItems: [
          ["heading", "bold", "italic", "strike"],
          ["hr", "quote"],
          ["ul", "ol", "task", "indent", "outdent"],
          ["table", "image", "link"],
          ["code", "codeblock"],
          ["scrollSync"],
        ],
        hooks: {
          addImageBlobHook: function (blob, callback) {
            return compressImage(blob)
              .then(uploadBlob)
              .then(function (url) {
                callback(url, "image");
              })
              .catch(function (err) {
                alert("이미지 업로드 실패: " + (err && err.message ? err.message : err));
              });
          },
        },
        events: {
          change: function () {
            if (!self.editor) return;
            self._updatingFromEditor = true;
            self.props.onChange(self.editor.getMarkdown());
            self._updatingFromEditor = false;
          },
        },
      });
    },

    componentWillUnmount: function () {
      if (this.editor) {
        try {
          this.editor.destroy();
        } catch (_) {
          /* ignore */
        }
        this.editor = null;
      }
    },

    shouldComponentUpdate: function (nextProps, nextState) {
      if (nextState.error !== this.state.error) return true;
      // External editors: avoid React re-renders wiping the DOM.
      if (
        this.editor &&
        !this._updatingFromEditor &&
        typeof nextProps.value === "string" &&
        nextProps.value !== this.editor.getMarkdown()
      ) {
        this.editor.setMarkdown(nextProps.value, false);
      }
      return false;
    },

    isValid: function () {
      return true;
    },

    render: function () {
      var self = this;
      if (this.state.error) {
        return h(
          "div",
          { className: this.props.classNameWrapper, style: { color: "#b00020" } },
          this.state.error,
        );
      }
      return h("div", {
        id: this.props.forID,
        className: (this.props.classNameWrapper || "") + " toast-markdown-widget",
        ref: function (el) {
          self._el = el;
        },
      });
    },
  });

  var ToastMarkdownPreview = createClass({
    displayName: "ToastMarkdownPreview",
    render: function () {
      var value = this.props.value || "";
      return h(
        "pre",
        {
          style: {
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "13px",
            lineHeight: "1.55",
          },
        },
        value,
      );
    },
  });

  CMS.registerWidget("toast-markdown", ToastMarkdownControl, ToastMarkdownPreview);
})();
