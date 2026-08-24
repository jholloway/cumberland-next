(function attachMeasurementRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.measurementRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createMeasurementRule() {
  // Abbreviations expanded to full written words, keyed without periods.
  // Bare `in` is deliberately absent from ordinary matching because it is
  // prose (`10 in the box`); inches expand only from the period form `in.`,
  // enforced by the detection pattern below.
  const MEASUREMENT_WORDS = {
    in: "inches",
    ft: "feet",
    mi: "miles",
    yd: "yards",
    oz: "ounces",
    lb: "pounds",
    lbs: "pounds",
    qt: "quarts",
    gal: "gallons",
  };

  // Longest alternatives first so `lbs` is not consumed as `lb`. The
  // abbreviation must follow a digit with zero or one space. Its optional
  // period is part of the match so sentence-end checks can classify it.
  // Hyphenated adjectives such as `10-ft` need different word forms and are
  // deliberately outside this rule.
  const MEASUREMENT = new RegExp(
    `(?<=[0-9] ?)(in\\.|${Object.keys(MEASUREMENT_WORDS)
      .filter((key) => key !== "in")
      .sort((left, right) => right.length - left.length)
      .join("|")})\\.?(?![A-Za-z])`,
    "gi"
  );

  // A period form followed by a capitalized word mid-text may simply end a
  // sentence or start an address fragment, so it stays unchanged. At a hard
  // boundary (end of text or line) the period is certainly sentence
  // punctuation: those forms expand and keep their period. Periods followed
  // by commas, lowercase words, or digits still expand without one.
  function classifyTrailingPeriod(text, index, end) {
    if (text[end - 1] !== ".") return { isPeriodForm: false };
    let cursor = end;
    while (cursor < text.length && (text[cursor] === " " || text[cursor] === "\t")) {
      cursor += 1;
    }
    if (cursor >= text.length) return { isPeriodForm: true, sentenceFinal: true };
    const character = text[cursor];
    if (character === "\n" || character === "\r") return { isPeriodForm: true, sentenceFinal: true };
    return { isPeriodForm: true, ambiguousCapital: /[A-Z]/.test(character) };
  }

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(MEASUREMENT)) {
      const original = match[0];
      const word = MEASUREMENT_WORDS[original.replace(/\.$/, "").toLowerCase()];
      if (!word) continue;
      const period = classifyTrailingPeriod(text, match.index, match.index + original.length);
      if (period.ambiguousCapital) {
        continue;
      }
      issues.push({
        start: match.index,
        end: match.index + original.length,
        original,
        replacement: word + (period.sentenceFinal ? "." : ""),
        explanation: `Spell out the measurement: use "${word}" instead of "${original}".`,
        ruleId: "R-015",
        canAutoFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-015",
    name: "Expand measurements",
    priority: 200,
    detect,
  };
});
