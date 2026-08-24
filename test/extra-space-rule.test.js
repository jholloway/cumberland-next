const test = require("node:test");
const assert = require("node:assert/strict");
const extraSpaceRule = require("../src/rules/extra-space-rule.js");

function replacements(text) {
  return extraSpaceRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

function fixedText(text) {
  let output = text;
  const issues = extraSpaceRule.detect(text);
  for (let index = issues.length - 1; index >= 0; index -= 1) {
    const issue = issues[index];
    output = `${output.slice(0, issue.start)}${issue.replacement}${output.slice(issue.end)}`;
  }
  return output;
}

test("collapses double and multiple spaces between words", () => {
  assert.deepEqual(replacements("Hello  world"), [["  ", " "]]);
  assert.equal(fixedText("too    many      spaces here"), "too many spaces here");
});

test("reports each run independently and preserves ordering", () => {
  const issues = extraSpaceRule.detect("a  b  c   d");
  assert.equal(issues.length, 3);
  assert.deepEqual(issues.map((issue) => [issue.start, issue.end]), [
    [1, 3],
    [4, 6],
    [7, 10],
  ]);
  assert.ok(issues[0] !== issues[1]);
});

test("does not touch line-start indentation", () => {
  assert.deepEqual(replacements("Intro:\n  - indented item"), []);
  assert.deepEqual(replacements("      deeply indented"), []);
  assert.equal(fixedText("Top\n    kept indent"), "Top\n    kept indent");
});

test("collapses runs before a line break down to one space", () => {
  assert.deepEqual(replacements("trailing two  \nnext line"), [["  ", " "]]);
  assert.equal(fixedText("trailing three   \nnext"), "trailing three \nnext");
});

test("leaves single spaces, tabs, and non-breaking spaces alone", () => {
  assert.deepEqual(replacements("one two three"), []);
  assert.deepEqual(replacements("tab\tseparated\tvalues"), []);
  assert.deepEqual(replacements("mixed \t spacing"), []);
  assert.deepEqual(replacements("after tab\t  kept"), []);
  assert.deepEqual(replacements("non\u00A0\u00A0breaking kept"), []);
});

test("handles CRLF text and blank lines without touching breaks", () => {
  assert.deepEqual(replacements("windows\r\nline ends"), []);
  assert.deepEqual(fixedText("crlf run  \r\nkept"), "crlf run \r\nkept");
  assert.equal(fixedText("gap\n\n\ngap"), "gap\n\n\ngap");
});

test("reports exact ranges within surrounding text", () => {
  const text = "Before  after";
  const [issue] = extraSpaceRule.detect(text);
  assert.equal(issue.original, text.slice(issue.start, issue.end));
  assert.equal(issue.replacement, " ");
});

test("applies through the review session with offset adjustment", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(extraSpaceRule);
  const text = "a  b  c";
  let state = session.scan(text);

  // Fixing the first run removes one character; the later run shifts left.
  state = session.applyAutomaticFix(text);
  assert.equal(state.text, "a b  c");
  assert.equal(state.issues.length, 1);
  assert.equal(state.issues[0].start, 3);
});
