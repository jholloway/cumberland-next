(function attachRangeDashRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.rangeDashRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createRangeDashRule() {
  // A candidate is a hyphen, en dash, or em dash between a number-like
  // token and a following digit. The left neighbor is captured so its
  // context can be checked, and the flanking single spaces are consumed so
  // the replacement is always a normalized ` to `.
  const RANGE_DASH = /([0-9a-zA-Z.])( ?)([-\u2013\u2014])( ?)(?=[0-9])/g;

  // Multi-part identifiers such as phone numbers (`615-555-0100`) and
  // Social Security numbers (`123-45-6789`) are chains of dash-separated
  // digit groups; genuine ranges never continue into another group. The
  // left check looks for an existing digit-dash-digit tail before the
  // candidate, and the right check looks for one after it.
  const LEFT_CHAIN = /[\d.)] ?[-\u2013\u2014] ?[\d.]*$/;
  const RIGHT_CHAIN = /^\d+(?: ?[-\u2013\u2014] ?)\d/;

  function isMeridiemEnding(text, leftIndex) {
    return leftIndex > 0 && /[aApP]/.test(text.slice(leftIndex - 1, leftIndex));
  }

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(RANGE_DASH)) {
      const [, leftCharacter, , , ] = match;
      const start = match.index + 1;
      const end = match.index + match[0].length;

      // A bare letter before the dash means a word such as `and-5`, not a
      // range; a letter qualifies only as the end of a meridiem (`9 AM-5 PM`).
      if (/[a-zA-Z]/.test(leftCharacter) && !isMeridiemEnding(text, match.index)) {
        continue;
      }

      if (LEFT_CHAIN.test(text.slice(Math.max(0, start - 8), start))) {
        continue;
      }
      if (RIGHT_CHAIN.test(text.slice(end, end + 16))) {
        continue;
      }

      issues.push({
        start,
        end,
        original: text.slice(start, end),
        replacement: " to ",
        explanation: 'Use "to" between times, dates, or numbers in a range instead of a dash.',
        ruleId: "R-013",
        canAutoFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-013",
    name: "Convert range dashes",
    priority: 100,
    detect,
  };
});
