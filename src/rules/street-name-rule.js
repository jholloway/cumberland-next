(function attachStreetNameRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.streetNameRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createStreetNameRule() {
  // Developer-maintained map of common United States street suffix
  // abbreviations (USPS style) expanded to their full names. To add one,
  // add an entry here and list it in IGNORED_CAPS_WORDS inside
  // src/rules/caps-rule.js so the all-caps rule never claims it first.
  const STREET_NAMES = {
    Ave: "Avenue",
    Blvd: "Boulevard",
    Cir: "Circle",
    Ct: "Court",
    Dr: "Drive",
    Hwy: "Highway",
    Ln: "Lane",
    Pk: "Pike",
    Pkwy: "Parkway",
    Pl: "Place",
    Rd: "Road",
    Sq: "Square",
    St: "Street",
    Ter: "Terrace",
    Tpke: "Turnpike",
    Trl: "Trail",
  };

  // These abbreviations double as common words (`St` = Saint, `Dr` =
  // Doctor), so they expand only when a house number appears within a few
  // words before them.
  const AMBIGUOUS_ABBREVIATIONS = new Set(["Dr", "St"]);

  // Longest alternatives first so `Pkwy` is never consumed as `Pk`.
  // Capitalized forms only: lowercase `st` in prose stays untouched, and
  // word boundaries keep the `st` inside `1st` out of scope.
  const ABBREVIATION = new RegExp(
    `(?<!\\w)(${Object.keys(STREET_NAMES).sort((left, right) => right.length - left.length).join("|")})(\\.?)(?!\\w)`,
    "g"
  );

  function hasNearbyHouseNumber(text, match) {
    const before = text.slice(Math.max(0, match.index - 40), match.index);
    return /\d{1,6}(?:st|nd|rd|th)?(?:[ ,&-]+\S+){0,2}\s$/i.test(before);
  }

  // A period form followed by a capitalized word mid-text may be a genuine
  // sentence boundary or an address fragment, so it stays unchanged. At a
  // hard boundary (end of text or line) the period is certainly sentence
  // punctuation: those forms expand and keep their period.
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

    for (const match of text.matchAll(ABBREVIATION)) {
      const abbreviation = match[1];
      // Area notation shares the `Sq` token (`1,500 Sq Ft`), so leave it
      // alone when square-footage follows instead of expanding to `Square`.
      if (
        abbreviation === "Sq" &&
        /^ ?ft\b/i.test(text.slice(match.index + match[0].length, match.index + match[0].length + 4))
      ) {
        continue;
      }
      if (AMBIGUOUS_ABBREVIATIONS.has(abbreviation) && !hasNearbyHouseNumber(text, match)) {
        continue;
      }
      const period = classifyTrailingPeriod(text, match.index, match.index + match[0].length);
      if (period.ambiguousCapital) {
        continue;
      }
      issues.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        replacement: STREET_NAMES[abbreviation] + (period.sentenceFinal ? "." : ""),
        explanation: `Expand the street abbreviation ${abbreviation} to ${STREET_NAMES[abbreviation]}.`,
        ruleId: "R-008",
        canAutoFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-008",
    name: "Expand street names",
    priority: 200,
    detect,
  };
});
