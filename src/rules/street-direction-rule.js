(function attachStreetDirectionRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.streetDirectionRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createStreetDirectionRule() {
  const DIRECTION_NAMES = {
    N: "North",
    S: "South",
    E: "East",
    W: "West",
    NE: "Northeast",
    NW: "Northwest",
    SE: "Southeast",
    SW: "Southwest",
  };

  const STREET_SUFFIXES =
    "St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place|" +
    "Pk|Pike|Pkwy|Parkway|Cir|Circle|Ter|Terrace|Tpke|Turnpike|Trl|Trail|Sq|Square|Hwy|Highway|" +
    "Way";
  const SUFFIX_ALTERNATION = STREET_SUFFIXES.split("|")
    .flatMap((token) => [token, token.toLowerCase()])
    .join("|");

  // Longest alternatives first so `NE` is never consumed as `N`.
  const DIRECTION_ALTERNATION = Object.keys(DIRECTION_NAMES)
    .sort((left, right) => right.length - left.length)
    .join("|");
  const DIRECTION_TOKEN = `(${DIRECTION_ALTERNATION})(\\.?)`;

  // Context one: directly after a house number (`450 NE Broadway`,
  // `123 N Main`). The address structure itself vouches for the direction,
  // regardless of what follows.
  const DIRECTION_AFTER_NUMBER = new RegExp(`(?<=[0-9] )\\b${DIRECTION_TOKEN}(?![A-Za-z])`, "g");

  // Context two: prefix position before up to four name words and a known
  // street suffix (`N Main Street`). Name words may start with digits
  // (`5th Ave`); address structure makes a period form safe even though it
  // precedes a capitalized word.
  const DIRECTION_PREFIX = new RegExp(
    `\\b${DIRECTION_TOKEN}(?=[ ](?:[A-Z][A-Za-z0-9'’-]*[ ]){0,4}(?:${SUFFIX_ALTERNATION})\\b\\.?(?:[\\s,.]|$))`,
    "g"
  );

  // Context three: suffix position after a known street suffix
  // (`Main St N`, `Oak Avenue SE`). The captured leading spaces are excluded
  // from the finding later so a fix cannot alter surrounding formatting.
  const DIRECTION_SUFFIX = new RegExp(
    `(?<=\\b(?:${SUFFIX_ALTERNATION})\\.?)([ ]+)${DIRECTION_TOKEN}(?![A-Za-z])`,
    "g"
  );

  // Address context makes expansion safe whether the dot is an abbreviation
  // mark or sentence punctuation. Keep it only at a hard boundary; mid-text
  // the expanded word no longer needs it. State abbreviations cannot reach
  // this path because they follow city names rather than street suffixes.
  function sentenceFinalPeriod(text, end) {
    if (text[end - 1] !== ".") return false;
    let cursor = end;
    while (cursor < text.length && (text[cursor] === " " || text[cursor] === "\t")) {
      cursor += 1;
    }
    return cursor >= text.length || text[cursor] === "\n" || text[cursor] === "\r";
  }

  function collect(text, start, original, issues, seen) {
    if (seen.has(start)) return;
    const direction = original.replace(/\.$/, "").toUpperCase();
    const fullName = DIRECTION_NAMES[direction];
    if (!fullName) return;
    seen.add(start);
    issues.push({
      start,
      end: start + original.length,
      original,
      replacement:
        fullName + (sentenceFinalPeriod(text, start + original.length) ? "." : ""),
      explanation: `Expand the direction abbreviation ${original} to ${fullName}.`,
      ruleId: "R-018",
      canAutoFix: true,
    });
  }

  function detect(text) {
    const issues = [];
    // Contexts overlap (a direction can sit between a number and a suffix),
    // so identical spans are emitted once.
    const seen = new Set();

    for (const match of text.matchAll(DIRECTION_AFTER_NUMBER)) {
      collect(text, match.index, match[0], issues, seen);
    }
    for (const match of text.matchAll(DIRECTION_PREFIX)) {
      collect(text, match.index, match[0], issues, seen);
    }
    for (const match of text.matchAll(DIRECTION_SUFFIX)) {
      collect(text, match.index + match[1].length, match[0].slice(match[1].length), issues, seen);
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-018",
    name: "Expand street directions",
    priority: 200,
    detect,
  };
});
