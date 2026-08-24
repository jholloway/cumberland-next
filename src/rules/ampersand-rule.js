(function attachAmpersandRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.ampersandRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createAmpersandRule() {
  // A finding is an ampersand with no word character on either side, so
  // `Tom & Jerry` is flagged while attached forms keep their ampersand:
  // brands (`AT&T`, `R&D`), URL query separators (`?page=2&sort=asc`), and
  // HTML entities (`&amp;`) all touch word characters. Adjacent ampersands
  // such as `&&` never qualify because each neighbor blocks the other.
  const STANDALONE_AMPERSAND = /(?<![\w&])&(?![\w&])/g;

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(STANDALONE_AMPERSAND)) {
      issues.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        replacement: "and",
        explanation: 'Use "and" instead of an ampersand.',
        ruleId: "R-009",
        canAutoFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-009",
    name: "Replace ampersands",
    priority: 100,
    detect,
  };
});
