(function attachTimeRule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.timeRule = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createTimeRule() {
  // Evaluate meridiem forms first so the numeric part of `07:02 PM` is not
  // reported a second time by the 24-hour pattern below.
  // Colon/dot guards prevent matching components inside a time with seconds.
  const MERIDIEM_TIME = /(?<![\w:.])\b(\d{1,2})(?:(:|\.)(\d{2}))?\s*(A\.?M\.?|P\.?M\.?)(?!\w)/gi;

  // Requiring two-digit hours keeps ambiguous forms such as `7:00` out of
  // this rule while still recognizing valid colon-separated 24-hour times.
  // A following sentence period is consumed so the normalized `a.m.`/`p.m.`
  // ending supplies the single period, mirroring the meridiem pattern above.
  const TWENTY_FOUR_HOUR_TIME = /(?<![\w:.])\b(?:[01]\d|2[0-3]):[0-5]\d\b(?![:.]\d)\.?/g;

  function normalizeMeridiem(value) {
    return value.toUpperCase().startsWith("A") ? "a.m." : "p.m.";
  }

  function buildMeridiemReplacement(hourText, minuteText, meridiem) {
    const hour = Number(hourText);
    const minute = minuteText === undefined ? undefined : Number(minuteText);

    if (hour < 1 || hour > 12 || (minute !== undefined && minute > 59)) {
      return null;
    }

    const hourOutput = String(hour);
    // Keep explicit `:00` minutes when the source supplied them; both forms
    // are valid, and preserving the source shape minimizes the edit.
    const minuteOutput = minuteText === undefined ? "" : `:${String(minute).padStart(2, "0")}`;
    return `${hourOutput}${minuteOutput} ${normalizeMeridiem(meridiem)}`;
  }

  function buildTwentyFourHourReplacement(match) {
    const timeText = match.endsWith(".") ? match.slice(0, -1) : match;
    const [hourText, minuteText] = timeText.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const isMorning = hour < 12;
    // Convert the hour only; minutes remain two digits by definition of the
    // detector, including `00` for exact-hour 24-hour input.
    const outputHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${outputHour}:${String(minute).padStart(2, "0")} ${isMorning ? "a.m." : "p.m."}`;
  }

  function detect(text) {
    const matches = [];
    // Every meridiem match owns its range, including invalid forms such as
    // `17:02 PM`, so the 24-hour pattern never re-reports the numeric part,
    // which would leave a doubled meridiem after the fix is applied.
    const meridiemRanges = [];

    for (const match of text.matchAll(MERIDIEM_TIME)) {
      const [original, hourText, , minuteText, meridiem] = match;
      const start = match.index;
      const end = start + original.length;
      meridiemRanges.push({ start, end });
      const replacement = buildMeridiemReplacement(hourText, minuteText, meridiem);
      if (replacement && replacement !== original) {
        matches.push({
          start,
          end,
          original,
          replacement,
          explanation: "Use lowercase a.m. or p.m. and remove leading zeroes from the hour.",
          ruleId: "R-001",
          canAutoFix: true,
        });
      }
    }

    // Both match iterators yield document order, so one forward pointer is
    // enough to test each 24-hour finding against the meridiem ranges.
    let rangeIndex = 0;
    for (const match of text.matchAll(TWENTY_FOUR_HOUR_TIME)) {
      const original = match[0];
      const start = match.index;
      const end = start + original.length;

      while (rangeIndex < meridiemRanges.length && meridiemRanges[rangeIndex].end <= start) {
        rangeIndex += 1;
      }
      const ownerRange = meridiemRanges[rangeIndex];
      if (ownerRange && ownerRange.start < end) continue;

      const replacement = buildTwentyFourHourReplacement(original);
      matches.push({
        start,
        end,
        original,
        replacement,
        explanation: "Use 12-hour time with lowercase a.m. or p.m.",
        ruleId: "R-001",
        canAutoFix: true,
      });
    }

    return matches.sort((left, right) => left.start - right.start);
  }

  return {
    id: "R-001",
    name: "Standardize time format",
    priority: 100,
    detect,
  };
});
