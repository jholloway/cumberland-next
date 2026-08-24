const test = require("node:test");
const assert = require("node:assert/strict");
const streetDirectionRule = require("../src/rules/street-direction-rule.js");

function replacements(text) {
  return streetDirectionRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("expands the documented prefix forms", () => {
  assert.deepEqual(replacements("N Main Street"), [["N", "North"]]);
  assert.deepEqual(replacements("N. Main Street"), [["N.", "North"]]);
});

test("expands every direction in prefix position", () => {
  assert.deepEqual(replacements("123 S Elm St, 450 NE Broadway, W End Blvd, 7 SW 5th Ave"), [
    ["S", "South"],
    ["NE", "Northeast"],
    ["W", "West"],
    ["SW", "Southwest"],
  ]);
});

test("expands directions after a house number without needing a suffix", () => {
  assert.deepEqual(replacements("123 N Main was the old address"), [["N", "North"]]);
});

test("emits a direction between number and suffix exactly once", () => {
  const issues = streetDirectionRule.detect("123 S Elm St");
  assert.equal(issues.length, 1);
});

test("expands directions after the street name", () => {
  assert.deepEqual(replacements("Main St N"), [["N", "North"]]);
  assert.deepEqual(replacements("Oak Avenue SE"), [["SE", "Southeast"]]);
});

test("handles multiword street names", () => {
  assert.deepEqual(replacements("N Martin Luther King Jr Blvd"), [["N", "North"]]);
});

test("protects non-address uses of the letters", () => {
  assert.deepEqual(replacements("E. coli bacteria, vitamin E, John E. Smith"), []);
  assert.deepEqual(replacements("bare N with no address nearby"), []);
});

test("safely expands period forms, preserving sentence-final periods", () => {
  // Expansion is parse-independent: whether the period ends the
  // abbreviation or the sentence, the direction still means North.
  assert.deepEqual(replacements("Meet on Main St N."), [["N.", "North."]]);
  assert.deepEqual(replacements("Office at 450 NE. Nashville next"), [["NE.", "Northeast"]]);
});

test("leaves lowercase forms untouched", () => {
  assert.deepEqual(replacements("n main street s elm st"), []);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = streetDirectionRule.detect("N Main St and S Broad St");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("applies through the review session with offset adjustment", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(streetDirectionRule);
  const text = "123 N Main St";
  let state = session.scan(text);

  state = session.applyAutomaticFix(text);
  assert.equal(state.text, "123 North Main St");
});
