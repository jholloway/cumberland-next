const test = require("node:test");
const assert = require("node:assert/strict");
const smallNumberRule = require("../src/rules/small-number-rule.js");

function replacements(text) {
  return smallNumberRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("flags standalone numbers one through ten", () => {
  assert.deepEqual(replacements("I have 3 apples and you have 10"), [
    ["3", "three"],
    ["10", "ten"],
  ]);
  assert.deepEqual(replacements("choose 1 wait 5 minutes"), [
    ["1", "one"],
    ["5", "five"],
  ]);
});

test("leaves numbers inside times untouched", () => {
  assert.deepEqual(replacements("Meet at 7 pm or 9:30 or 7.30."), []);
});

test("leaves numbers inside dates untouched", () => {
  assert.deepEqual(replacements("Jun. 3 meeting, parade on 3 Jun, deadline 6/3."), []);
  assert.deepEqual(replacements("May 5 flowers bloom"), []);
});

test("leaves phone number pieces untouched", () => {
  assert.deepEqual(replacements("+1 615-555-0100 is the hotline"), []);
});

test("leaves list markers and ordinals untouched", () => {
  assert.deepEqual(replacements("1. First item\n2) Second item"), []);
  assert.deepEqual(replacements("the 1st place finisher"), []);
});

test("leaves currency symbols and street addresses untouched", () => {
  assert.deepEqual(replacements("a $5 bill"), []);
  assert.deepEqual(replacements("5 Main St and 9 Elm Road"), []);
});

test("keeps larger numbers out of scope", () => {
  assert.deepEqual(replacements("about 15 to 20 attendees in 2026"), []);
});

test("keeps range-flanking numerals untouched", () => {
  assert.deepEqual(replacements("Bring 10-15 copies"), []);
  assert.deepEqual(replacements("Rooms 1-2-3 cost money"), []);
  assert.deepEqual(findingsSafe("pages 3 - 4 list"), []);
});

function findingsSafe(text) {
  return smallNumberRule.detect(text).map((issue) => issue.original);
}

test("keeps digit-initial street names guarding house numbers", () => {
  assert.deepEqual(replacements("Visit 7 SW 5th Ave"), []);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = smallNumberRule.detect("2 of 6 items");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("applies through the review session with offset adjustment", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(smallNumberRule);
  const text = "bring 3 forms";
  let state = session.scan(text);

  state = session.applyAutomaticFix(text);
  assert.equal(state.text, "bring three forms");
});

test("does not spell out fractional digits in decimal numbers", () => {
  assert.deepEqual(replacements("1.5 acres, 0.5 miles, .5 gallons, $2.05, 10.1 feet"), []);
  assert.deepEqual(replacements("Area: 1.5 acres with 3 trees"), [["3", "three"]]);
});
