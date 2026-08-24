const test = require("node:test");
const assert = require("node:assert/strict");
const phoneRule = require("../src/rules/phone-rule.js");

function replacements(text) {
  return phoneRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("converts parenthesized, dotted, spaced, and dashed forms", () => {
  assert.deepEqual(replacements("(615) 555-0100 615.555.0100 615 555 0100"), [
    ["(615) 555-0100", "615-555-0100"],
    ["615.555.0100", "615-555-0100"],
    ["615 555 0100", "615-555-0100"],
  ]);
});

test("converts bare ten-digit numbers", () => {
  assert.deepEqual(replacements("Call 6155550100 today."), [["6155550100", "615-555-0100"]]);
});

test("drops the country code while converting", () => {
  assert.deepEqual(replacements("+1 (615) 555-0100 1-615.555.0100 +1 615 555 0100 1-615-555-0100"), [
    ["+1 (615) 555-0100", "615-555-0100"],
    ["1-615.555.0100", "615-555-0100"],
    ["+1 615 555 0100", "615-555-0100"],
    ["1-615-555-0100", "615-555-0100"],
  ]);
});

test("normalizes dash lookalikes such as en and em dashes", () => {
  assert.deepEqual(replacements("615\u2013555\u20130100 and \u2014main office\u2014"), [
    ["615\u2013555\u20130100", "615-555-0100"],
  ]);
});

test("leaves the approved format untouched", () => {
  assert.deepEqual(replacements("Dial 615-555-0100 for help."), []);
});

test("ignores invalid numbering plan candidates", () => {
  assert.deepEqual(replacements("215-555-0100 is fine but not 115-555-0100."), []);
  assert.deepEqual(replacements("615-211-0100 and 911-555-0100 are service codes."), []);
  assert.deepEqual(replacements("12345678901 is eleven digits without a plus sign."), []);
});

test("does not flag times, dates, years, or short numbers", () => {
  assert.deepEqual(replacements("Meet at 19:00 on 6/23 in room 100 for 2026 planning."), []);
});

test("preserves extensions and surrounding text outside the match", () => {
  const text = "Main line (615) 555-0100 ext. 42.";
  const [issue] = phoneRule.detect(text);
  assert.equal(issue.original, "(615) 555-0100");
  const output = `${text.slice(0, issue.start)}${issue.replacement}${text.slice(issue.end)}`;
  assert.equal(output, "Main line 615-555-0100 ext. 42.");
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = phoneRule.detect("615.555.0100 and 615.555.0100");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("applies through the review session with offset adjustment", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(phoneRule);
  const text = "Office: (615) 555-0100";
  let state = session.scan(text);

  state = session.applyAutomaticFix(text);
  assert.equal(state.text, "Office: 615-555-0100");
});
