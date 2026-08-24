const test = require("node:test");
const assert = require("node:assert/strict");
const measurementRule = require("../src/rules/measurement-rule.js");

function replacements(text) {
  return measurementRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("converts the documented feet forms", () => {
  assert.deepEqual(replacements("a 10 ft pole"), [["ft", "feet"]]);
  assert.deepEqual(replacements("a 10 ft. pole"), [["ft.", "feet"]]);
});

test("converts the full abbreviation list", () => {
  assert.deepEqual(replacements("3 mi, 7 yd, 8 oz, 6 lb, 2 qt, 4 gal"), [
    ["mi", "miles"],
    ["yd", "yards"],
    ["oz", "ounces"],
    ["lb", "pounds"],
    ["qt", "quarts"],
    ["gal", "gallons"],
  ]);
});

test("expands lbs and in. forms mid-sentence", () => {
  assert.deepEqual(replacements("weighs 6 lbs. today"), [["lbs.", "pounds"]]);
  assert.deepEqual(replacements("a 10 in. board"), [["in.", "inches"]]);
});

test("never expands bare in without a period", () => {
  assert.deepEqual(replacements("find it in the 10 acre park"), []);
  assert.deepEqual(replacements("10 in stock arrives"), []);
});

test("expands at hard boundaries but stays conservative mid-text", () => {
  assert.deepEqual(replacements("the pole is 10 ft."), [["ft.", "feet."]]);
  assert.deepEqual(replacements("it grew 3 mi. Nashville awaits"), []);
  assert.deepEqual(replacements("run 3 mi. then rest"), [["mi.", "miles"]]);
});

test("requires a preceding number", () => {
  assert.deepEqual(replacements("the ft club and oz committee"), []);
  assert.deepEqual(findingsSafe("10-ft pole"), []);
});

function findingsSafe(text) {
  return measurementRule.detect(text);
}

test("keeps compact number forms convertible", () => {
  assert.deepEqual(replacements("a 10ft pipe"), [["ft", "feet"]]);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = measurementRule.detect("2 mi or 4 mi");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("applies through the review session with offset adjustment", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(measurementRule);
  const text = "trail: 5 mi";
  let state = session.scan(text);

  state = session.applyAutomaticFix(text);
  assert.equal(state.text, "trail: 5 miles");
});
