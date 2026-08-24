(function attachExpansionRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.expansionRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createExpansionRule() {
  // Developer-maintained map of standalone abbreviations expanded to their
  // full form. To add an expansion: add an entry here, and also add the
  // abbreviation to IGNORED_CAPS_WORDS in src/rules/caps-rule.js so the
  // all-caps rule never claims it first. Keys are matched case-sensitively
  // as whole words.
  const EXPANSIONS = {
    TN: "Tennessee",
  };

  const ABBREVIATION_PATTERN = Object.keys(EXPANSIONS)
    .sort((left, right) => right.length - left.length)
    .join("|");
  const ABBREVIATION = new RegExp(`\\b(?:${ABBREVIATION_PATTERN})\\b`, "g");

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(ABBREVIATION)) {
      const original = match[0];
      const replacement = EXPANSIONS[original];
      issues.push({
        start: match.index,
        end: match.index + original.length,
        original,
        replacement,
        explanation: `Expand the abbreviation ${original} to ${replacement}.`,
        ruleId: "R-004",
        canAutoFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-004",
    name: "Expand approved abbreviations",
    priority: 200,
    detect,
  };
});
