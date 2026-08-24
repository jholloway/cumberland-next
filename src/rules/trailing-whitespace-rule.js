(function attachTrailingWhitespaceRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.trailingWhitespaceRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createTrailingWhitespaceRule() {
  // A finding is a run of spaces and tabs directly before a line break or
  // the end of the text. The lookahead keeps carriage returns outside the
  // match so CRLF endings survive the fix intact. Only literal spaces and
  // tabs qualify; non-breaking spaces are left alone. This rule outranks
  // R-006 so an end-of-line run is removed outright instead of being
  // collapsed to one space first.
  const TRAILING_WHITESPACE = /[ \t]+(?=[\r\n]|$)/g;

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(TRAILING_WHITESPACE)) {
      issues.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        replacement: "",
        explanation: "Remove the spaces and tabs at the end of this line.",
        ruleId: "R-010",
        canAutoFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-010",
    name: "Remove trailing whitespace",
    priority: 200,
    detect,
  };
});
