(function attachBulletRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.bulletRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createBulletRule() {
  // Characters treated as fake bullets at the start of a line: ASCII hyphen
  // and asterisk, figure/en/em dashes and the horizontal bar, and common
  // unicode round, triangular, and square bullet glyphs. Deliberately absent:
  // `+` (phone numbers), `>` (quotations), `#` (headings), and digits
  // (ordered lists are a separate concern).
  const BULLET_CHARS =
    "\\u2012-\\u2015\\u00B7\\u2022\\u2023\\u2027\\u2043\\u2219" +
    "\\u25A0\\u25AA\\u25CB\\u25CF\\u25E6\\-*";

  // A finding is a run of bullet characters at the start of a line followed
  // by at least one space or tab. The required whitespace keeps negative
  // numbers (`-5 degrees`), emphasis markers (`*word*`), and horizontal
  // rules (`-----`) out of scope. Leading indentation is captured so the
  // issue range can exclude it and the user's indentation is preserved.
  const FAKE_BULLET = new RegExp(`^([ \\t]*)([${BULLET_CHARS}]+)([ \\t]+)`, "gm");

  function detect(text) {
    const issues = [];

    for (const match of text.matchAll(FAKE_BULLET)) {
      const start = match.index + match[1].length;
      const end = match.index + match[0].length;
      issues.push({
        start,
        end,
        original: text.slice(start, end),
        replacement: "",
        explanation: "Remove the fake bullet characters at the start of this line.",
        ruleId: "R-005",
        canAutoFix: true,
      });
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-005",
    name: "Remove fake bullets",
    priority: 100,
    detect,
  };
});
