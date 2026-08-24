const test = require("node:test");
const assert = require("node:assert/strict");
const bulletRule = require("../src/rules/bullet-rule.js");

function findings(text) {
  return bulletRule.detect(text);
}

function fixedText(text) {
  // Apply from the end so recorded ranges stay valid without reproducing the
  // session's offset-adjustment logic in this test helper.
  let output = text;
  const issues = findings(text);
  for (let index = issues.length - 1; index >= 0; index -= 1) {
    const issue = issues[index];
    output = `${output.slice(0, issue.start)}${issue.replacement}${output.slice(issue.end)}`;
  }
  return output;
}

test("removes a basic hyphen bullet and its trailing spaces", () => {
  const text = "- This is a bullet";
  assert.deepEqual(findings(text).map((issue) => [issue.original, issue.replacement]), [
    ["- ", ""],
  ]);
  assert.equal(fixedText(text), "This is a bullet");
});

test("recognizes asterisks, dashes, and unicode bullets", () => {
  assert.deepEqual(fixedText("* star"), "star");
  assert.deepEqual(fixedText("\u2013 en dash item"), "en dash item");
  assert.deepEqual(fixedText("\u2014 em dash item"), "em dash item");
  assert.deepEqual(fixedText("\u2022 round bullet"), "round bullet");
  assert.deepEqual(fixedText("\u2023 triangle item"), "triangle item");
  assert.deepEqual(fixedText("\u2043 hyphen bullet"), "hyphen bullet");
  assert.deepEqual(fixedText("\u25CF black circle"), "black circle");
  assert.deepEqual(fixedText("\u25E6 white bullet"), "white bullet");
});

test("removes runs of repeated bullet characters", () => {
  assert.equal(fixedText("-- double dash"), "double dash");
  assert.equal(fixedText("\u2014\u2014 doubled em dash"), "doubled em dash");
});

test("preserves indentation before the bullet", () => {
  const text = "Intro:\n  - indented item\n    \u2022 deeper item";
  const issues = findings(text);
  assert.deepEqual(issues.map((issue) => issue.original), ["- ", "\u2022 "]);
  assert.equal(issues[0].start, 9);
  assert.equal(fixedText(text), "Intro:\n  indented item\n    deeper item");
});

test("handles the first line, blank lines, and CRLF endings", () => {
  assert.equal(fixedText("- first line"), "first line");
  assert.equal(fixedText("Top\r\n- second\r\n* third"), "Top\r\nsecond\r\nthird");
});

test("reports each line as an independent occurrence in order", () => {
  const text = "- one\n- two\n- three";
  const issues = findings(text);
  assert.equal(issues.length, 3);
  assert.ok(issues[0] !== issues[1]);
  for (let index = 0; index < issues.length; index += 1) {
    assert.equal(issues[index].original, text.slice(issues[index].start, issues[index].end));
  }
});

test("does not flag negative numbers or missing-space forms", () => {
  assert.deepEqual(findings("-5 degrees is cold"), []);
  assert.deepEqual(findings("-noSpaceAfterDash"), []);
  assert.deepEqual(findings("*emphasis* at line start"), []);
});

test("does not flag horizontal rules or excluded characters", () => {
  assert.deepEqual(findings("-----"), []);
  assert.deepEqual(findings("----------"), []);
  assert.deepEqual(findings("+1 615-555-0100"), []);
  assert.deepEqual(findings("> quoted text"), []);
  assert.deepEqual(findings("# A heading"), []);
  assert.deepEqual(findings("1. An ordered list stays untouched."), []);
});

test("does not flag bullets away from the start of a line", () => {
  assert.deepEqual(findings("See - this dash mid-line"), []);
  assert.deepEqual(findings("Text * more text"), []);
});

test("requires only whitespace between characters and content and removes all of it", () => {
  assert.equal(fixedText("-\tTabbed content"), "Tabbed content");
  assert.equal(fixedText("-     Widely spaced"), "Widely spaced");
});

test("applies through the review session with offset adjustment", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(bulletRule);
  const text = "- first\n- second";
  let state = session.scan(text);

  // One fix removes only the current occurrence; the later range shifts left
  // by the removed length and the next bullet becomes current.
  state = session.applyAutomaticFix(text);
  assert.equal(state.text, "first\n- second");
  assert.equal(state.issues.length, 1);
  assert.equal(state.issues[0].start, 6);
  assert.equal(state.issues[0].original, "- ");
});
