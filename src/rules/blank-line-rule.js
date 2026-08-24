(function attachBlankLineRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.blankLineRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createBlankLineRule() {
  // A finding is a line break followed by one or more further line breaks
  // that may carry stray spaces or tabs on their otherwise-blank lines. The
  // run starts at the first full break (including its carriage return) so
  // trailing whitespace before it belongs to R-010, not this rule. Runs are
  // collapsed to a single blank line, and the replacement keeps the
  // document's carriage-return convention.
  const BLANK_LINE_RUN = /(?:\r?\n)(?:[ \t]*\r?\n)+/g;

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(BLANK_LINE_RUN)) {
      const original = match[0];
      const replacement = original.includes("\r") ? "\r\n\r\n" : "\n\n";
      if (replacement === original) {
        continue;
      }
      issues.push({
        start: match.index,
        end: match.index + original.length,
        original,
        replacement,
        explanation: "Collapse consecutive blank lines to one blank line.",
        ruleId: "R-016",
        canAutoFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-016",
    name: "Collapse blank lines",
    priority: 100,
    detect,
  };
});
