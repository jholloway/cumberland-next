const test = require("node:test");
const assert = require("node:assert/strict");
const capsRule = require("../src/rules/caps-rule.js");

function replacements(text) {
  return capsRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("flags a run of caps words as one issue", () => {
  assert.deepEqual(replacements("PLEASE READ THIS before posting"), [
    ["PLEASE READ THIS", "please read this"],
  ]);
});

test("flags two-letter words and single-word runs", () => {
  assert.deepEqual(replacements("OK GO, WAIT!"), [
    ["OK GO", "ok go"],
    ["WAIT", "wait"],
  ]);
});

test("never flags single letters or mixed-case words", () => {
  assert.deepEqual(replacements("I A PDFDocument ABCdef R-001 3M Tennessee Titans"), []);
});

test("ignores allowlisted abbreviations completely", () => {
  assert.deepEqual(replacements("MAC MNPD TITANS mac mnpd titans"), []);
});

test("allowlisted words split runs instead of being lowercased", () => {
  assert.deepEqual(replacements("MNPD OFFICERS NAMED TODAY"), [
    ["OFFICERS NAMED TODAY", "officers named today"],
  ]);
  assert.deepEqual(replacements("GO TITANS AND GO"), [
    ["GO", "go"],
    ["AND GO", "and go"],
  ]);
});

test("handles contractions and preserves punctuation and digits", () => {
  assert.deepEqual(replacements("DON'T WAIT -- WORLD CUP 2026 CHAMPIONS!"), [
    ["DON'T WAIT", "don't wait"],
    ["WORLD CUP", "world cup"],
    ["CHAMPIONS", "champions"],
  ]);
});

test("digits and punctuation break runs", () => {
  assert.deepEqual(replacements("WORLD CUP 2026 CHAMPIONS"), [
    ["WORLD CUP", "world cup"],
    ["CHAMPIONS", "champions"],
  ]);
});

test("line breaks split runs into separate issues", () => {
  assert.deepEqual(replacements("PLEASE\n   READ THIS"), [
    ["PLEASE", "please"],
    ["READ THIS", "read this"],
  ]);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = capsRule.detect("HURRY HURRY FREE. FREE ADMISSION");
  assert.equal(issues.length, 2);
  assert.deepEqual(issues.map((issue) => issue.original), ["HURRY HURRY FREE", "FREE ADMISSION"]);
  assert.ok(issues[0] !== issues[1]);
});

test("reports exact ranges within surrounding text", () => {
  const text = "Notice: ACT NOW, seats fill fast.";
  const [issue] = capsRule.detect(text);
  assert.equal(issue.original, text.slice(issue.start, issue.end));
  assert.equal(issue.replacement, "act now");
});

test("offers alternative casings as secondary options", () => {
  const [issue] = capsRule.detect("PLEASE READ THIS");
  assert.equal(issue.replacement, "please read this");
  assert.deepEqual(issue.options.map((option) => option.label), ["Title Case", "Sentence case"]);
  assert.equal(issue.options[0].value, "Please Read This");
  assert.equal(issue.options[1].value, "Please read this");
});
