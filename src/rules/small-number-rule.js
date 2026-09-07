(function attachSmallNumberRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.smallNumberRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createSmallNumberRule() {
  const NUMBER_WORDS = {
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
  };

  const STANDALONE_NUMBER = /\b(10|[1-9])\b/g;

  const MONTH_NAMES =
    "January|February|March|April|May|June|July|August|September|October|November|December|" +
    "Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec";
  const MONTH_BEFORE = new RegExp(`(?:${MONTH_NAMES})\\.?\\s*$`, "i");
  const MONTH_AFTER = new RegExp(`^\\s*(?:${MONTH_NAMES})\\b`, "i");

  const STREET_SUFFIXES =
    "St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place|" +
    "Pk|Pike|Pkwy|Parkway|Cir|Circle|Ter|Terrace|Tpke|Turnpike|Trl|Trail|Sq|Square|Hwy|Highway|" +
    "Way";
  // Addresses are `number name suffix`, so allow a few capitalized name
  // words between the number and the suffix; name words may start with
  // digits (`5th`) or carry apostrophes, and suffixes may be upper- or
  // lowercase (`5 Main St`, `9 Elm road`). All-caps addresses stay flagged.
  const STREET_AFTER = new RegExp(
    "^\\s+(?:[A-Z0-9][A-Za-z0-9'-]*\\s+){0,3}(?:" +
      STREET_SUFFIXES.split("|").flatMap((word) => [word, word.toLowerCase()]).join("|") +
      ")\\.?(?:\\s|$|,)",
    ""
  );

  const MERIDIEM_AFTER = /^\s?[APap]\.?[Mm]\.?(?![A-Za-z])/;

  function isStructured(text, index, end) {
    const previous = text[index - 1];
    const next = text.slice(end, end + 48);
    const before = text.slice(Math.max(0, index - 32), index);

    if (previous && ".+-/:&$#@".includes(previous)) return true;
    if (/^[.:),/]/.test(next)) return true;
    // A hyphenated adjective such as `10-ft` is a compound, not prose.
    if (/^-[A-Za-z]/.test(next)) return true;
    // A numeral flanking a dash-digit group belongs to a range or chain
    // (`10-15`, `1-2-3`), which R-013 and the phone rule own instead.
    if (/^[ ]?[-\u2013\u2014][ ]?\d/.test(next)) return true;
    if (/\d[ ]?[-\u2013\u2014] ?$/.test(before)) return true;
    if (/^\.\d/.test(next)) return true;
    if (MERIDIEM_AFTER.test(next)) return true;
    if (MONTH_BEFORE.test(before)) return true;
    if (MONTH_AFTER.test(next)) return true;
    if (STREET_AFTER.test(next)) return true;
    return false;
  }

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(STANDALONE_NUMBER)) {
      if (isStructured(text, match.index, match.index + match[0].length)) {
        continue;
      }
      issues.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        replacement: NUMBER_WORDS[match[0]],
        explanation: "Spell out numbers one through ten in words.",
        ruleId: "R-014",
        canAutoFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-014",
    name: "Spell out small numbers",
    priority: 100,
    detect,
  };
});
