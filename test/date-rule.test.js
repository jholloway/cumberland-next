const test = require("node:test");
const assert = require("node:assert/strict");
const dateRule = require("../src/rules/date-rule.js");

function replacements(text) {
  return dateRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("detects and normalizes the documented incorrect forms", () => {
  assert.deepEqual(replacements("6/23/2026 Jun 23 June 23rd Jun 23rd Jun. 23 Jun. 23rd 6/23"), [
    ["6/23/2026", "June 23, 2026"],
    ["Jun 23", "June 23"],
    ["June 23rd", "June 23"],
    ["Jun 23rd", "June 23"],
    ["Jun. 23", "June 23"],
    ["Jun. 23rd", "June 23"],
    ["6/23", "June 23"],
  ]);
});

test("leaves already-compliant dates unchanged", () => {
  assert.deepEqual(replacements("June 23 October 7 December 31 May 9 June 23, 2026"), []);
});

test("normalizes every month including September abbreviations", () => {
  assert.deepEqual(replacements("Jan 3 Feb 3 Mar 3 Apr 3 May 3 Jul 3 Aug 3 Sep 3 Sept 3rd Oct 3 Nov 3 Dec 3"), [
    ["Jan 3", "January 3"],
    ["Feb 3", "February 3"],
    ["Mar 3", "March 3"],
    ["Apr 3", "April 3"],
    ["Jul 3", "July 3"],
    ["Aug 3", "August 3"],
    ["Sep 3", "September 3"],
    ["Sept 3rd", "September 3"],
    ["Oct 3", "October 3"],
    ["Nov 3", "November 3"],
    ["Dec 3", "December 3"],
  ]);
});

test("converts day-first and of-phrased forms", () => {
  assert.deepEqual(replacements("23 June 23rd of June 23 June 2026 2nd October"), [
    ["23 June", "June 23"],
    ["23rd of June", "June 23"],
    ["23 June 2026", "June 23, 2026"],
    ["2nd October", "October 2"],
  ]);
});

test("normalizes non-standard month casing", () => {
  assert.deepEqual(replacements("JUNE 23RD june 23rd SePt 3"), [
    ["JUNE 23RD", "June 23"],
    ["june 23rd", "June 23"],
    ["SePt 3", "September 3"],
  ]);
});

test("preserves years from numeric dates and strips leading zeroes", () => {
  assert.deepEqual(replacements("06/07 12/25/2026 6/23 2026"), [
    ["06/07", "June 7"],
    ["12/25/2026", "December 25, 2026"],
    ["6/23", "June 23"],
  ]);
});

test("normalizes a bare-space year into the comma form", () => {
  assert.deepEqual(replacements("June 23rd 2026"), [["June 23rd 2026", "June 23, 2026"]]);
});

test("does not flag excluded or ambiguous numeric forms", () => {
  // `13/45` has no valid month; `2/30` exceeds February; `6/23/26` carries
  // an unsupported two-digit year; the `5/10` inside `8.5/10` is a decimal
  // fragment. Standalone month names without a day are also out of scope.
  assert.deepEqual(replacements("13/45 2/30 6/23/26 8.5/10"), []);
  assert.deepEqual(replacements("January February May"), []);
});

test("rejects impossible named and numeric calendar dates", () => {
  assert.deepEqual(replacements("Feb 30th April 31st 31 April 2/29/2025 February 29th 2025"), []);
  assert.deepEqual(replacements("2/29/2024 February 29th 2024"), [
    ["2/29/2024", "February 29, 2024"],
    ["February 29th 2024", "February 29, 2024"],
  ]);
});

test("does not partially rewrite malformed slash date expressions", () => {
  assert.deepEqual(replacements("6/23/2 6/23/20260 6/23/2026x 6/23/"), []);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = dateRule.detect("Jun 1 and Jun 1 and 6/2");
  assert.equal(issues.length, 3);
  assert.deepEqual(issues.map((issue) => issue.original), ["Jun 1", "Jun 1", "6/2"]);
  assert.ok(issues[0] !== issues[1]);
});

test("preserves surrounding punctuation through replacements", () => {
  const text = "Sessions run Jun. 1st - Jun. 2nd.";
  const issues = dateRule.detect(text);
  let output = text;
  for (let index = issues.length - 1; index >= 0; index -= 1) {
    const issue = issues[index];
    output = `${output.slice(0, issue.start)}${issue.replacement}${output.slice(issue.end)}`;
  }
  assert.equal(output, "Sessions run June 1 - June 2.");
});

test("flags matching text wherever it occurs and reports exact ranges", () => {
  const text = "Contact review@city.example before 6/23.";
  const [issue] = dateRule.detect(text);
  assert.equal(issue.original, text.slice(issue.start, issue.end));
  assert.equal(issue.replacement, "June 23");
});
