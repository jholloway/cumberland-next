(function attachLinkTextRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.linkTextRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createLinkTextRule() {
  const WEAK_LINK_TEXT = /\b(?:click here|this link)\b/gi;

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(WEAK_LINK_TEXT)) {
      issues.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        replacement: "",
        explanation:
          'Phrases like "click here" do not describe the link destination. Rewrite the text to say where the link goes.',
        ruleId: "R-011",
        canAutoFix: false,
        canManualFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-011",
    name: "Flag weak link text",
    priority: 200,
    detect,
  };
});
