(function attachPhoneRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.phoneRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createPhoneRule() {
  // Separator characters accepted between number groups. Colons and slashes
  // are deliberately absent so times and dates never resemble phones.
  const SEPARATOR = "[ .\\u2012-\\u2015-]";
  const COUNTRY_PREFIX = "(?:\\+?1[ .\\u2012-\\u2015-])?";
  const NOT_WORD_BEFORE = "(?<![\\w.])";
  const NOT_WORD_AFTER = "(?!\\w)";

  // `(615) 555-0100`, `1 (615) 555-0100`, `(615)5550100`.
  const PAREN_NUMBER = new RegExp(
    `${NOT_WORD_BEFORE}(?:\\+?1${SEPARATOR})?\\((\\d{3})\\) ?(\\d{3})(?:${SEPARATOR})?(\\d{4})${NOT_WORD_AFTER}`,
    "g"
  );

  // Separated groups with any mix of accepted separators: `615.555.0100`,
  // `615 555 0100`, `615\u2013555\u20130100`. The approved form
  // `615-555-0100` matches too and is dropped because nothing changes.
  const SEPARATED_NUMBER = new RegExp(
    `${NOT_WORD_BEFORE}${COUNTRY_PREFIX}(\\d{3})${SEPARATOR}(\\d{3})${SEPARATOR}(\\d{4})${NOT_WORD_AFTER}`,
    "g"
  );

  // Bare ten-digit numbers and `+16155550100`. An unprefixed eleven-digit
  // string such as an account number is ignored because without a separator
  // or plus sign there is no way to tell a country code from data.
  const BARE_NUMBER = new RegExp(`${NOT_WORD_BEFORE}(?:\\+1)?(\\d{10})${NOT_WORD_AFTER}`, "g");

  // North American numbering plan sanity checks: the area code and exchange
  // cannot start with 0 or 1, and N11 service codes are not ordinary
  // phone numbers. Invalid candidates stay unchanged.
  function isNanpValid(areaText, exchangeText) {
    const area = String(areaText);
    const exchange = String(exchangeText);
    const startsOkay = (group) => group.charCodeAt(0) > 49 && group.charCodeAt(0) < 58;
    const isServiceCode = (group) => group[1] === "1" && group[2] === "1";
    return (
      startsOkay(area) &&
      startsOkay(exchange) &&
      !isServiceCode(area) &&
      !isServiceCode(exchange)
    );
  }

  function buildReplacement(areaText, exchangeText, lineText) {
    if (!isNanpValid(areaText, exchangeText)) return null;
    return `${areaText}-${exchangeText}-${lineText}`;
  }

  function detect(text) {
    const issues = [];
    const shapes = [
      { pattern: PAREN_NUMBER, area: 1, exchange: 2, line: 3 },
      { pattern: SEPARATED_NUMBER, area: 1, exchange: 2, line: 3 },
    ];

    for (const shape of shapes) {
      for (const match of text.matchAll(shape.pattern)) {
        const replacement = buildReplacement(match[shape.area], match[shape.exchange], match[shape.line]);
        if (replacement && replacement !== match[0]) {
          issues.push({
            start: match.index,
            end: match.index + match[0].length,
            original: match[0],
            replacement,
            explanation: "Format phone numbers as 123-456-7890.",
            ruleId: "R-007",
            canAutoFix: true,
          });
        }
      }
    }

    for (const match of text.matchAll(BARE_NUMBER)) {
      const digits = match[1];
      const replacement = buildReplacement(digits.slice(0, 3), digits.slice(3, 6), digits.slice(6));
      if (replacement && replacement !== match[0]) {
        issues.push({
          start: match.index,
          end: match.index + match[0].length,
          original: match[0],
          replacement,
          explanation: "Format phone numbers as 123-456-7890.",
          ruleId: "R-007",
          canAutoFix: true,
        });
      }
    }

    return issues.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-007",
    name: "Standardize phone numbers",
    priority: 100,
    detect,
  };
});
