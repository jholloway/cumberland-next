(function attachDateRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.dateRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createDateRule() {
  // Canonical output names keyed by every accepted spelled form, including
  // abbreviations. `May` maps to itself because it has no short form.
  const MONTH_NAMES = {
    jan: "January", january: "January",
    feb: "February", february: "February",
    mar: "March", march: "March",
    apr: "April", april: "April",
    may: "May",
    jun: "June", june: "June",
    jul: "July", july: "July",
    aug: "August", august: "August",
    sep: "September", sept: "September", september: "September",
    oct: "October", october: "October",
    nov: "November", november: "November",
    dec: "December", december: "December",
  };

  // Longest alternatives first so `september` is not consumed as `sep`.
  const MONTH_PATTERN =
    "(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|" +
    "august|aug|september|sept|sep|october|oct|november|nov|december|dec)";
  const ORDINAL_SUFFIX = "(?:st|nd|rd|th)";

  // `23 June`, `23rd of June`, `23 June 2026`. Consume an abbreviation
  // period only before a year; otherwise preserve sentence punctuation.
  const DAY_FIRST_BRANCH =
    `\\b(\\d{1,2})${ORDINAL_SUFFIX}?\\b\\s+(?:of\\s+)?${MONTH_PATTERN}(?![a-z])(?:\\.(?=(?:,\\s*|\\s)\\d{4}\\b))?`;

  // `Jun. 23rd`, `June 23rd, 2026`, `JUNE 23`. A sentence period after the
  // day is left for surrounding text.
  const MONTH_FIRST_BRANCH =
    `\\b${MONTH_PATTERN}\\.?\\s+(\\d{1,2})${ORDINAL_SUFFIX}?\\b`;

  // The optional year separator accepts a comma or bare whitespace so
  // `June 23 2026` normalizes to the comma form.
  const YEAR_TAIL = "(?:(?:,\\s*|\\s)(\\d{4})\\b)?";

  // One combined pattern instead of two independent ones: with the day-first
  // branch first, the scanner consumes each whole date before considering the
  // next position, so `June 23 October 7` cannot misread `23 October` as a
  // day-first date, and `23 June 23rd of June` cannot misread `June 23rd` as
  // a month-first date. Capture groups are positional: branch one yields
  // day/month/year as 1/2/3, branch two as 4/5/6.
  const NAMED_DATE = new RegExp(`${DAY_FIRST_BRANCH}${YEAR_TAIL}|${MONTH_FIRST_BRANCH}${YEAR_TAIL}`, "gi");

  // `6/23`, `6/23/2026`, `06/07`. The lookbehind keeps decimal fragments such
  // as the `5/10` inside `8.5/10` out of detection scope. A trailing segment
  // of two to four digits is consumed so partial-year junk like `6/23/26` is
  // skipped whole instead of being converted and leaving `/26` behind. The
  // final negative lookahead also prevents the month/day prefix of malformed
  // slash expressions such as `6/23/20260` or `6/23/` from being rewritten.
  const NUMERIC_DATE = /(?<![\d./])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b(?!\/)/g;

  const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const MONTHS_BY_NUMBER = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const MONTH_NUMBER_BY_NAME = new Map(
    MONTHS_BY_NUMBER.map((monthName, index) => [monthName, index + 1])
  );

  function monthNameFor(token) {
    return MONTH_NAMES[token.replace(/\.$/, "").toLowerCase()];
  }

  function buildReplacement(monthName, dayText, yearText) {
    const day = String(Number(dayText));
    return yearText === undefined ? `${monthName} ${day}` : `${monthName} ${day}, ${yearText}`;
  }

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function maximumDay(month, yearText) {
    if (month !== 2 || yearText === undefined) return DAYS_IN_MONTH[month - 1];
    return isLeapYear(Number(yearText)) ? 29 : 28;
  }

  function isValidCalendarDate(month, day, yearText) {
    return (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= maximumDay(month, yearText)
    );
  }

  function namedReplacement(monthToken, dayText, yearText) {
    const monthName = monthNameFor(monthToken);
    const month = MONTH_NUMBER_BY_NAME.get(monthName);
    const day = Number(dayText);
    if (!monthName || !isValidCalendarDate(month, day, yearText)) return null;
    return buildReplacement(monthName, dayText, yearText);
  }

  function numericReplacement(firstText, secondText, yearText) {
    // Two-digit trailing segments such as `6/23/26` are ambiguous year
    // forms the rule does not standardize, so the whole expression is left
    // alone rather than partially converted.
    if (yearText !== undefined && yearText.length !== 4) return null;

    let month = Number(firstText);
    let day = Number(secondText);
    if (month > 12 && day <= 12) {
      // Unambiguous day-first numeric form such as `23/6`; ambiguous forms
      // where both sides are 12 or less stay month-first per US convention.
      [month, day] = [day, month];
    }
    if (!isValidCalendarDate(month, day, yearText)) {
      return null;
    }
    return buildReplacement(MONTHS_BY_NUMBER[month - 1], String(day), yearText);
  }

  function detect(text) {
    const matches = [];

    for (const match of text.matchAll(NAMED_DATE)) {
      const [, dayFirstDay, dayFirstMonth, dayFirstYear, monthFirstMonth, monthFirstDay, monthFirstYear] = match;
      const replacement = dayFirstMonth !== undefined
        ? namedReplacement(dayFirstMonth, dayFirstDay, dayFirstYear)
        : namedReplacement(monthFirstMonth, monthFirstDay, monthFirstYear);
      if (replacement && replacement !== match[0]) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          original: match[0],
          replacement,
          explanation: "Spell out the month and use numerals without an ordinal suffix, e.g. June 23.",
          ruleId: "R-002",
          canAutoFix: true,
        });
      }
    }

    for (const match of text.matchAll(NUMERIC_DATE)) {
      const [, first, second, year] = match;
      const replacement = numericReplacement(first, second, year);
      if (replacement && replacement !== match[0]) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          original: match[0],
          replacement,
          explanation: "Spell out the month and use numerals without an ordinal suffix, e.g. June 23.",
          ruleId: "R-002",
          canAutoFix: true,
        });
      }
    }

    return matches.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-002",
    name: "Standardize date format",
    priority: 100,
    detect,
  };
});
