const test = require("node:test");
const assert = require("node:assert/strict");
const expansionRule = require("../src/rules/expansion-rule.js");

function replacements(text) {
  return expansionRule.detect(text).map((issue) => [issue.original, issue.replacement]);
}

test("expands a standalone TN to Tennessee", () => {
  assert.deepEqual(replacements("Nashville, TN 37201"), [["TN", "Tennessee"]]);
});

test("does not flag TN inside larger words or other casings", () => {
  assert.deepEqual(replacements("TNT tn Tn MNTN Tennessee"), []);
});

test("flags every occurrence independently and preserves ordering", () => {
  const issues = expansionRule.detect("TN and TN again");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("reports exact ranges within surrounding text", () => {
  const text = "Based in TN since 1963.";
  const [issue] = expansionRule.detect(text);
  assert.equal(issue.original, text.slice(issue.start, issue.end));
  assert.equal(issue.replacement, "Tennessee");
});

test("expansion survives possessive forms through the fix", () => {
  const text = "The TN fair";
  const [issue] = expansionRule.detect(text);
  const output = `${text.slice(0, issue.start)}${issue.replacement}${text.slice(issue.end)}`;
  assert.equal(output, "The Tennessee fair");
});
