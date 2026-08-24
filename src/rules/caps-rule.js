(function attachCapsRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.capsRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createCapsRule() {
  // Developer-maintained list of capitalized words that are never flagged,
  // such as abbreviations and proper names that legitimately use all caps.
  // Matching is by whole word, so listing every word of a phrase protects
  // the phrase while still allowing surrounding emphasis to be flagged.
  // Entries may be written in any case; add one entry per line.
  //
  // Abbreviations owned by the expansion rule (R-004) and the street name
  // rule (R-008) must be listed here so runs containing them split instead
  // of being flagged as emphasis.
  const IGNORED_CAPS_WORDS = [
    "MAC",
    "MNPD",
    "TITANS",
    "TN",
    "AVE",
    "BLVD",
    "CIR",
    "CT",
    "DR",
    "HWY",
    "LN",
    "PK",
    "PKWY",
    "PL",
    "RD",
    "SQ",
    "ST",
    "TER",
    "TPKE",
    "TRL",
  ];
  const ignoredWords = new Set(IGNORED_CAPS_WORDS.map((word) => word.toUpperCase()));

  // A caps word is two or more uppercase letters and may carry an internal
  // apostrophe (`DON'T`). Single letters such as `I` and `A` never qualify.
  const CAPS_WORD_SOURCE = "[A-Z]{2,}(?:['’][A-Z]+)*";
  const CAPS_WORD = new RegExp(CAPS_WORD_SOURCE, "g");

  // A run is one or more caps words separated by spaces or tabs on the
  // same line; a line break ends the run so each block becomes its own
  // review item. Word boundaries at both ends keep mixed-case neighbors
  // out: `PDFDocument`, `ABCdef`, `R-001`, and `3M` produce no finding.
  const CAPS_RUN = new RegExp(`\\b${CAPS_WORD_SOURCE}(?:[ \\t]+${CAPS_WORD_SOURCE})*\\b`, "g");

  function isIgnored(word) {
    return ignoredWords.has(word.toUpperCase());
  }

  // The automatic fix lowercases the run (the documented default), and the
  // interface offers these alternates as secondary choices. Values are
  // computed per occurrence so each stays independently reviewable.
  function casingOptions(original) {
    return [
      {
        label: "Title Case",
        value: original.toLowerCase().replace(/(^|[ \t])([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase()),
      },
      { label: "Sentence case", value: original.toLowerCase().replace(/^([a-z])/, (m, ch) => ch.toUpperCase()) },
    ];
  }

  function detect(text) {
    const issues = [];

    for (const run of text.matchAll(CAPS_RUN)) {
      const base = run.index;
      let groupStart = -1;
      let groupEnd = -1;

      const flushGroup = () => {
        if (groupStart < 0) return;
        const original = text.slice(base + groupStart, base + groupEnd);
        issues.push({
          start: base + groupStart,
          end: base + groupEnd,
          original,
          replacement: original.toLowerCase(),
          options: casingOptions(original),
          explanation: "Avoid using all caps for emphasis; use sentence case instead.",
          ruleId: "R-003",
          canAutoFix: true,
        });
        groupStart = -1;
      };

      for (const word of run[0].matchAll(CAPS_WORD)) {
        // Ignored words split the run so they stay untouched even when
        // surrounded by flagged emphasis (`MNPD OFFICERS NAMED`).
        if (isIgnored(word[0])) {
          flushGroup();
          continue;
        }
        if (groupStart < 0) groupStart = word.index;
        groupEnd = word.index + word[0].length;
      }
      flushGroup();
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-003",
    name: "Reduce all-caps emphasis",
    priority: 100,
    detect,
  };
});
