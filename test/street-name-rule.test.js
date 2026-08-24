const test = require("node:test");
const assert = require("node:assert/strict");
const streetNameRule = require("../src/rules/street-name-rule.js");

function replacements(text) {
  return streetNameRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("expands common abbreviations with and without periods", () => {
  assert.deepEqual(replacements("123 Main St, 456 Oak Rd, 789 Elm Ave,"), [
    ["St", "Street"],
    ["Rd", "Road"],
    ["Ave", "Avenue"],
  ]);
});

test("expands a standalone Ave or Ave. to Avenue", () => {
  assert.deepEqual(replacements("The shop is on the Ave"), [["Ave", "Avenue"]]);
  assert.deepEqual(replacements("Meet on the Ave. if it rains"), [["Ave.", "Avenue"]]);
});

test("expands the longer suffix list including Pk and Pkwy", () => {
  assert.deepEqual(replacements("Centennial Pk and Pellissippi Pkwy"), [
    ["Pk", "Pike"],
    ["Pkwy", "Parkway"],
  ]);
  assert.deepEqual(replacements("Cir Ct Hwy Ln Pl Sq Ter Tpke Trl Blvd"), [
    ["Cir", "Circle"],
    ["Ct", "Court"],
    ["Hwy", "Highway"],
    ["Ln", "Lane"],
    ["Pl", "Place"],
    ["Sq", "Square"],
    ["Ter", "Terrace"],
    ["Tpke", "Turnpike"],
    ["Trl", "Trail"],
    ["Blvd", "Boulevard"],
  ]);
});

test("expands at hard boundaries but stays conservative mid-text", () => {
  assert.deepEqual(replacements("See you at Oak Ave."), [["Ave.", "Avenue."]]);
  assert.deepEqual(replacements("The office is on Oak Rd.\nNext section."), [
    ["Rd.", "Road."],
  ]);
  assert.deepEqual(replacements("Visit 123 Main St. Nashville awaits."), []);
});

test("still expands before commas, lowercase words, and digits", () => {
  assert.deepEqual(replacements("123 Main St., Nashville"), [["St.", "Street"]]);
  assert.deepEqual(replacements("on 45 Main St. and beyond"), [["St.", "Street"]]);
  assert.deepEqual(replacements("at 45 Main St. #200"), [["St.", "Street"]]);
});

test("protects Saint and Doctor usages without house numbers", () => {
  assert.deepEqual(replacements("St. Jude Church hosts Dr. Smith today."), []);
  assert.deepEqual(replacements("The St. Patrick's Day parade"), []);
});

test("expands St and Dr when a house number is nearby", () => {
  assert.deepEqual(replacements("123 Main St and 7 River Dr"), [
    ["St", "Street"],
    ["Dr", "Drive"],
  ]);
  assert.deepEqual(replacements("22nd St entrance"), [["St", "Street"]]);
});

test("leaves expanded names and lowercase forms untouched", () => {
  assert.deepEqual(replacements("Main Street, Oak Road, Park Avenue, Elm Boulevard"), []);
  assert.deepEqual(replacements("main st ave blvd rd"), []);
});

test("leaves area notation like Sq Ft untouched", () => {
  assert.deepEqual(replacements("The unit offers 1,500 Sq Ft of space."), []);
});

test("word boundaries keep lookalikes out of scope", () => {
  assert.deepEqual(replacements("1st place first Stop Street"), []);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = streetNameRule.detect("123 Main St and 456 Main St");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("applies through the review session with offset adjustment", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(streetNameRule);
  const text = "123 Main St, Nashville";
  let state = session.scan(text);

  state = session.applyAutomaticFix(text);
  assert.equal(state.text, "123 Main Street, Nashville");
});
