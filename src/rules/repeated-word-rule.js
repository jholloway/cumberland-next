(function attachRepeatedWordRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.repeatedWordRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createRepeatedWordRule() {
  // A finding is two identical words separated only by spaces or tabs on
  // the same line, compared case-insensitively. Apostrophes count as word
  // characters so contractions qualify (`don't don't`). Repetitions across
  // a line break are ignored because they often span paragraph boundaries,
  // and some repetitions are legitimate grammar (`that that`, `had had`),
  // which is why this rule offers human review instead of an automatic fix.
  const REPEATED_WORD = /\b([A-Za-z']+)([ \t]+)\1\b/gi;

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(REPEATED_WORD)) {
      issues.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        replacement: "",
        explanation:
          "These repeated words may be a typo. Delete one unless the repetition is intentional.",
        ruleId: "R-017",
        canAutoFix: false,
        canManualFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-017",
    name: "Flag repeated words",
    priority: 200,
    detect,
  };
});
