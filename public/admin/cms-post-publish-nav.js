/**
 * After Decap publish, jump back to the collection list.
 */
(function () {
  function goToCollectionList(collection) {
    if (!collection) return;
    const target = `#/collections/${collection}`;
    window.setTimeout(function () {
      if (location.hash !== target) {
        location.hash = target;
      }
    }, 400);
  }

  function register() {
    if (!window.CMS || typeof window.CMS.registerEventListener !== "function") {
      window.setTimeout(register, 50);
      return;
    }

    window.CMS.registerEventListener({
      name: "postPublish",
      handler: function (data) {
        try {
          var entry = data && data.entry;
          var collection = entry && typeof entry.get === "function" ? entry.get("collection") : "";
          goToCollectionList(collection);
        } catch (e) {
          /* ignore */
        }
      },
    });
  }

  register();
})();
