(function attachExtraSpaceRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.extraSpaceRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createExtraSpaceRule() {
  // A finding is a run of two or more literal spaces (U+0020) that begins
  // right after visible content. Requiring non-whitespace immediately before
  // the run keeps line-start indentation out of scope (no position inside an
  // indented run can match) as well as text-leading runs; a tab or newline
  // before the run also disqualifies it. Tabs and non-breaking spaces are
  // not spaces for this rule and are left untouched.
  const EXTRA_SPACES = /(?<=\S)( {2,})/g;

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(EXTRA_SPACES)) {
      issues.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        replacement: " ",
        explanation: "Reduce multiple consecutive spaces to one space.",
        ruleId: "R-006",
        canAutoFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-006",
    name: "Reduce repeated spaces",
    priority: 100,
    detect,
  };
});
