const test = require("node:test");
const assert = require("node:assert/strict");
const blankLineRule = require("../src/rules/blank-line-rule.js");

function findings(text) {
  return blankLineRule.detect(text);
}

function fixedText(text) {
  let output = text;
  const issues = findings(text);
  for (let index = issues.length - 1; index >= 0; index -= 1) {
    const issue = issues[index];
    output = `${output.slice(0, issue.start)}${issue.replacement}${output.slice(issue.end)}`;
  }
  return output;
}

test("collapses runs of blank lines to one blank line", () => {
  assert.equal(fixedText("A\n\n\n\nB"), "A\n\nB");
  assert.equal(fixedText("A\n\n\n\n\nB"), "A\n\nB");
});

test("cleans stray spaces and tabs on otherwise-blank lines", () => {
  assert.equal(fixedText("A\n  \n\t\nB"), "A\n\nB");
});

test("leaves single blank lines untouched", () => {
  assert.deepEqual(findings("A\n\nB"), []);
  assert.equal(fixedText("Para one.\n\nPara two."), "Para one.\n\nPara two.");
});

test("handles leading, trailing, and interior positions uniformly", () => {
  assert.equal(fixedText("\n\n\nA"), "\n\nA");
  assert.equal(fixedText("A\n\n\n"), "A\n\n");
  assert.equal(fixedText("\nA\n\n\nB\n\n\nC\n\n"), "\nA\n\nB\n\nC\n\n");
});

test("preserves CRLF convention inside collapsed runs", () => {
  const issues = findings("A\r\n\r\n\r\n\r\nB");
  assert.deepEqual(issues.map((issue) => [issue.original, issue.replacement]), [
    ["\r\n\r\n\r\n\r\n", "\r\n\r\n"],
  ]);
  assert.equal(fixedText("A\r\n\r\n\r\n\r\nB"), "A\r\n\r\nB");
});

test("does not overlap trailing whitespace owned by R-010", () => {
  // The run starts at the first line break; the spaces before it are not
  // ours. With one blank line present there is nothing to collapse.
  assert.deepEqual(findings("A  \n\nB"), []);
  const [issue] = findings("A  \n\n\nB");
  assert.deepEqual([issue.start, issue.end], [3, 6]);
});

test("reports every run independently and preserves ordering", () => {
  const issues = findings("a\n\n\nb\n\n\n\nc");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("applies through the review session with offset adjustment", () => {
  const { createReviewSession } = require("../src/review/review-session.js");
  const session = createReviewSession(blankLineRule);
  const text = "One\n\n\nTwo";
  let state = session.scan(text);

  state = session.applyAutomaticFix(text);
  assert.equal(state.text, "One\n\nTwo");
});
