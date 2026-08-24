const test = require("node:test");
const assert = require("node:assert/strict");
const rangeDashRule = require("../src/rules/range-dash-rule.js");

function findings(text) {
  return rangeDashRule.detect(text);
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

test("converts the documented time range forms", () => {
  assert.equal(fixedText("Open 9 a.m.-5 p.m. daily."), "Open 9 a.m. to 5 p.m. daily.");
  assert.equal(fixedText("Open 9 a.m. - 5 p.m. daily."), "Open 9 a.m. to 5 p.m. daily.");
  assert.equal(fixedText("Open 9AM-5PM daily."), "Open 9AM to 5PM daily.");
  assert.equal(fixedText("Open 19:00-21:00 daily."), "Open 19:00 to 21:00 daily.");
});

test("converts date and number ranges", () => {
  assert.equal(fixedText("Jun. 23-25 only"), "Jun. 23 to 25 only");
  assert.deepEqual(findings("6/23-6/24 window").map((issue) => issue.original), ["-"]);
  assert.equal(fixedText("Bring 10-15 copies"), "Bring 10 to 15 copies");
  assert.equal(fixedText("pages 3 - 7"), "pages 3 to 7");
});

test("accepts en and em dashes as range indicators", () => {
  assert.equal(fixedText("10\u201315 people"), "10 to 15 people");
  assert.equal(fixedText("10\u201415 people"), "10 to 15 people");
});

test("keeps phone numbers, Social Security numbers, and chains intact", () => {
  assert.deepEqual(findings("Call 615-555-0100 or 1-615-555-0100."), []);
  assert.deepEqual(findings("SSN 123-45-6789 on file"), []);
});

test("keeps hyphenated words and negative numbers intact", () => {
  assert.deepEqual(findings("a well-known fact"), []);
  assert.deepEqual(findings("and-5 makes no sense"), []);
  assert.deepEqual(findings("-5 degrees overnight"), []);
});

test("keeps year ranges convertible while rejecting digit chains", () => {
  assert.equal(fixedText("fiscal years 2023-2024"), "fiscal years 2023 to 2024");
  assert.deepEqual(findings("version 1-2-3"), []);
});

test("reports every occurrence independently and preserves ordering", () => {
  const issues = findings("3-7 and 8-12");
  assert.equal(issues.length, 2);
  assert.ok(issues[0] !== issues[1]);
});

test("reports exact ranges within surrounding text", () => {
  const text = "Open 9 a.m.-5 p.m.";
  const [issue] = findings(text);
  assert.equal(issue.original, text.slice(issue.start, issue.end));
  assert.equal(issue.replacement, " to ");
});
