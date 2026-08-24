const test = require("node:test");
const assert = require("node:assert/strict");
const timeRule = require("../src/rules/time-rule.js");

function replacements(text) {
  return timeRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("detects and normalizes approved meridiem forms", () => {
  assert.deepEqual(replacements("7 PM | 7:02 PM | 7pm | 07:02 PM | 7 P.M. | 7.02 PM"), [
    ["7 PM", "7 p.m."],
    ["7:02 PM", "7:02 p.m."],
    ["7pm", "7 p.m."],
    ["07:02 PM", "7:02 p.m."],
    ["7 P.M.", "7 p.m."],
    ["7.02 PM", "7:02 p.m."],
  ]);
});

test("detects meridiem suffixes with no space before them", () => {
  assert.deepEqual(replacements("9:30PM 12:45am 11:59P.M."), [
    ["9:30PM", "9:30 p.m."],
    ["12:45am", "12:45 a.m."],
    ["11:59P.M.", "11:59 p.m."],
  ]);
});

test("preserves explicit minutes on exact-hour meridiem times", () => {
  assert.deepEqual(replacements("7:00 PM and 7 PM"), [
    ["7:00 PM", "7:00 p.m."],
    ["7 PM", "7 p.m."],
  ]);
});

test("converts valid colon-separated 24-hour times", () => {
  assert.deepEqual(replacements("19:00 00:30 12:00 23:59"), [
    ["19:00", "7:00 p.m."],
    ["00:30", "12:30 a.m."],
    ["12:00", "12:00 p.m."],
    ["23:59", "11:59 p.m."],
  ]);
});

test("does not flag excluded formats or standalone meridiems", () => {
  assert.deepEqual(replacements("7:00 1900 19.00 noon midnight AM PM A.M. P.M."), []);
});

test("does not flag a 24-hour time that carries a meridiem suffix", () => {
  // The numeric part is an invalid meridiem form, so the rule leaves the
  // whole expression alone rather than replacing it and doubling the
  // meridiem (`5:02 p.m. PM`).
  assert.deepEqual(replacements("Event starts 17:02 PM."), []);
});

test("consumes a sentence-ending period after a 24-hour time", () => {
  // The normalized form ends in a period, so consuming the source period
  // prevents `7:00 p.m..` after the fix.
  assert.deepEqual(replacements("The meeting begins at 19:00."), [
    ["19:00.", "7:00 p.m."],
  ]);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = timeRule.detect("7 PM, 7 PM, and 19:00");
  assert.equal(issues.length, 3);
  assert.deepEqual(issues.map((issue) => issue.original), ["7 PM", "7 PM", "19:00"]);
  assert.ok(issues[0] !== issues[1]);
});

test("preserves range separators and surrounding punctuation through replacements", () => {
  const text = "The meeting begins at 9 AM - 5 PM.";
  const issues = timeRule.detect(text);
  let output = text;
  for (let index = issues.length - 1; index >= 0; index -= 1) {
    const issue = issues[index];
    output = `${output.slice(0, issue.start)}${issue.replacement}${output.slice(issue.end)}`;
  }
  assert.equal(output, "The meeting begins at 9 a.m. - 5 p.m.");
});

test("does not duplicate a period following a meridiem time", () => {
  const issue = timeRule.detect("Begins at 7 PM.")[0];
  assert.equal(issue.original, "7 PM.");
  assert.equal(issue.replacement, "7 p.m.");
});
