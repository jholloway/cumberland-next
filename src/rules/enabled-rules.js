(function attachEnabledRules(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.enabledRules = factory().collectEnabledRules(root.CumberlandNext);
  }
})(typeof globalThis === "object" ? globalThis : this, function createEnabledRulesModule() {
  function isRule(candidate) {
    return (
      candidate !== null &&
      typeof candidate === "object" &&
      typeof candidate.id === "string" &&
      typeof candidate.detect === "function"
    );
  }

  function collectEnabledRules(api) {
    if (!api || typeof api !== "object") {
      throw new TypeError("The rule API namespace must be an object.");
    }

    // Rule modules are attached to the namespace in index.html script order.
    // Collecting them here makes that load list the single production rule
    // manifest while leaving non-rule factories and helpers out.
    return Object.freeze(Object.values(api).filter(isRule));
  }

  return { collectEnabledRules };
});
