const test = require("node:test");
const assert = require("node:assert/strict");
const trailingWhitespaceRule = require("../src/rules/trailing-whitespace-rule.js");

function findings(text) {
  return trailingWhitespaceRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

function fixedText(text) {
  let output = text;
  const issues = trailingWhitespaceRule.detect(text);
  for (let index = issues.length - 1; index >= 0; index -= 1) {
    const issue = issues[index];
    output = `${output.slice(0, issue.start)}${issue.replacement}${output.slice(issue.end)}`;
  }
  return output;
}

test("removes spaces and tabs before line breaks and at end of text", () => {
  assert.deepEqual(findings("word  \nnext\t\nlast   "), [
    ["  ", ""],
    ["\t", ""],
    ["   ", ""],
  ]);
  assert.equal(fixedText("one \ntwo\t\nthree   "), "one\ntwo\nthree");
});

test("preserves CRLF endings while removing the run before them", () => {
  const issues = trailingWhitespaceRule.detect("windows  \r\nkept");
  assert.deepEqual(issues.map((issue) => issue.original), ["  "]);
  assert.equal(fixedText("windows  \r\nkept"), "windows\r\nkept");
});

test("empties whitespace-only lines completely", () => {
  assert.equal(fixedText("before\n   \nafter"), "before\n\nafter");
  assert.equal(fixedText("\t\t\nstart"), "\nstart");
});

test("leaves clean lines and interior spacing untouched", () => {
  assert.deepEqual(findings("clean lines\nno trailing here"), []);
  assert.deepEqual(findings("interior  spacing belongs to R-006"), []);
});

test("does not treat non-breaking spaces as trailing whitespace", () => {
  assert.deepEqual(findings("sticky\u00A0\u00A0\nnext"), []);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = trailingWhitespaceRule.detect("a \nb \nc ");
  assert.equal(issues.length, 3);
  assert.ok(issues[0] !== issues[1]);
});

test("applies through the review session with offset adjustment", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(trailingWhitespaceRule);
  const text = "first  \nsecond";
  let state = session.scan(text);

  state = session.applyAutomaticFix(text);
  assert.equal(state.text, "first\nsecond");
});
