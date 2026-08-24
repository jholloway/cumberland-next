(function attachRawUrlRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.rawUrlRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createRawUrlRule() {
  // A finding starts at an http(s) scheme and runs to the next whitespace.
  // Sentence punctuation glued to the end of the address is trimmed back
  // out of the reported range. Schemes match in any casing.
  const RAW_URL = /\bhttps?:\/\/[^\s]+/gi;
  const TRAILING_PUNCTUATION = /[.,;:!?)\]}"']+$/;

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(RAW_URL)) {
      let original = match[0];
      let end = match.index + original.length;
      const trimmed = original.match(TRAILING_PUNCTUATION);
      if (trimmed) {
        end -= trimmed[0].length;
        original = original.slice(0, -trimmed[0].length);
      }
      issues.push({
        start: match.index,
        end,
        original,
        replacement: "",
        explanation:
          "Replace the raw link with text that describes the destination, and set the address as the link target.",
        ruleId: "R-012",
        canAutoFix: false,
        canManualFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-012",
    name: "Flag raw URLs",
    priority: 200,
    detect,
  };
});
