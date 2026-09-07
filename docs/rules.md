# Rule catalog

This document is the source of truth for the behavior users should expect from every enabled Cumberland Next rule. It is written for content owners first; implementation-specific notes appear only when they help a developer avoid changing approved behavior.

For the implementation process, see [Adding a rule](adding-a-rule.md).

## Rule summary

| ID | Rule | Resolution | Priority | Module |
| --- | --- | --- | ---: | --- |
| R-001 | Standardize numeric time expressions | Automatic | 100 | [`time-rule.js`](../src/rules/time-rule.js) |
| R-002 | Standardize date format | Automatic | 100 | [`date-rule.js`](../src/rules/date-rule.js) |
| R-003 | Reduce all-caps emphasis | Automatic, with alternatives | 100 | [`caps-rule.js`](../src/rules/caps-rule.js) |
| R-004 | Expand approved abbreviations | Automatic | 200 | [`expansion-rule.js`](../src/rules/expansion-rule.js) |
| R-005 | Remove fake bullets | Automatic | 100 | [`bullet-rule.js`](../src/rules/bullet-rule.js) |
| R-006 | Reduce repeated spaces | Automatic | 100 | [`extra-space-rule.js`](../src/rules/extra-space-rule.js) |
| R-007 | Standardize phone numbers | Automatic | 100 | [`phone-rule.js`](../src/rules/phone-rule.js) |
| R-008 | Expand street names | Automatic | 200 | [`street-name-rule.js`](../src/rules/street-name-rule.js) |
| R-009 | Replace ampersands | Automatic | 100 | [`ampersand-rule.js`](../src/rules/ampersand-rule.js) |
| R-010 | Remove trailing whitespace | Automatic | 200 | [`trailing-whitespace-rule.js`](../src/rules/trailing-whitespace-rule.js) |
| R-011 | Flag weak link text | Manual | 200 | [`link-text-rule.js`](../src/rules/link-text-rule.js) |
| R-012 | Flag raw URLs | Manual | 300 | [`raw-url-rule.js`](../src/rules/raw-url-rule.js) |
| R-013 | Convert range dashes | Automatic | 100 | [`range-dash-rule.js`](../src/rules/range-dash-rule.js) |
| R-014 | Spell out small numbers | Automatic | 100 | [`small-number-rule.js`](../src/rules/small-number-rule.js) |
| R-015 | Expand measurements | Automatic | 200 | [`measurement-rule.js`](../src/rules/measurement-rule.js) |
| R-016 | Collapse blank lines | Automatic | 100 | [`blank-line-rule.js`](../src/rules/blank-line-rule.js) |
| R-017 | Flag repeated words | Manual | 200 | [`repeated-word-rule.js`](../src/rules/repeated-word-rule.js) |
| R-018 | Expand street directions | Automatic | 200 | [`street-direction-rule.js`](../src/rules/street-direction-rule.js) |

## Behavior shared by all rules

- Each matching occurrence is a separate finding, even when matches are repeated or adjacent.
- An automatic finding offers its documented replacement and can be skipped.
- A manual finding asks the user to edit the text, mark it fixed, or skip it.
- A fix changes the smallest practical span and preserves unrelated words, punctuation, spacing, indentation, and line breaks unless the rule explicitly targets them.
- A rule may match text in an unusual context unless its section lists that context as an exception. The user can skip a false positive.
- When two findings overlap, the higher-priority rule owns the text. Equal priorities are resolved by rule ID.
- A fresh analysis rebuilds all findings from the current text.

## R-001: Standardize numeric time expressions

Times use lowercase `a.m.` or `p.m.`, and the hour has no leading zero. If the source includes `:00`, the correction keeps it.

| Input | Result |
| --- | --- |
| `7 PM` | `7 p.m.` |
| `07:02 PM` | `7:02 p.m.` |
| `7 P.M.` | `7 p.m.` |
| `7.02 PM` | `7:02 p.m.` |
| `7:00 PM` | `7:00 p.m.` |
| `19:00` | `7:00 p.m.` |
| `00:30` | `12:30 a.m.` |
| `12:00` | `12:00 p.m.` |

**Leaves unchanged:** `noon`, `midnight`, standalone meridiem markers, `1900`, `19.00`, and an ambiguous time without a meridiem such as `7:00`, and times containing seconds such as `12:30:45` or `07:02:30 PM`. These longer times are left whole rather than partially rewritten.

**Developer notes:** Both sides of a range are separate findings. R-013 handles the separator between them.

## R-002: Standardize date format

Dates use a full title-cased month, a numeric day without a leading zero or ordinal suffix, and a comma before a supplied four-digit year.

| Input | Result |
| --- | --- |
| `6/23/2026` | `June 23, 2026` |
| `Jun. 23rd` | `June 23` |
| `06/07` | `June 7` |
| `23 June` | `June 23` |
| `23rd of June` | `June 23` |
| `JUNE 23RD` | `June 23` |

All twelve months are recognized by full name or common abbreviation, including `Sept`. A bare-space year is normalized to comma form. Day-first abbreviated dates also retain their year: `23 Jun. 2026` becomes `June 23, 2026`. An abbreviation period without a following year remains as surrounding punctuation.

Numeric slash dates are treated as US month-first when both positions are plausible. An unambiguous day-first form such as `23/6` is converted.

**Leaves unchanged:** Already-compliant dates; standalone months; impossible dates such as `April 31`; invalid leap days; two-digit years; incomplete or malformed slash expressions; and slash fragments inside decimals such as `8.5/10`.

**Developer notes:** Both sides of a date range are separate findings; R-013 owns the separator. The complete calendar date must be valid before a correction is offered.

## R-003: Reduce all-caps emphasis

One or more consecutive capitalized words on the same line are treated as one finding. Each word must contain at least two letters.

| Input | Primary result |
| --- | --- |
| `WAIT` | `wait` |
| `OK GO` | `ok go` |
| `PLEASE READ THIS` | `please read this` |
| `DON'T WAIT` | `don't wait` |

The primary action lowercases the run. Secondary actions offer Title Case and Sentence case.

**Leaves unchanged:** Single letters, mixed-case words, identifiers such as `R-001` and `3M`, and words on the developer-maintained ignore list. The initial ignore list includes `MAC`, `MNPD`, and `TITANS`.

Digits, punctuation, ignored words, and line breaks split a run into separate findings.

**Developer notes:** Extend `IGNORED_CAPS_WORDS` in `caps-rule.js`, one uppercase word per line. Higher-priority rules own direct overlaps, such as `PM` within a time.

## R-004: Expand approved abbreviations

Approved standalone abbreviations are expanded to their full form.

| Input | Result |
| --- | --- |
| `Nashville, TN 37201` | `Nashville, Tennessee 37201` |

Matching is case-sensitive and applies to a whole word. `TNT`, `tn`, `Tn`, and `MNTN` remain unchanged.

**Developer notes:** Add new entries to `EXPANSIONS` in `expansion-rule.js` and to `IGNORED_CAPS_WORDS` in `caps-rule.js`. Priority 200 lets the expansion win a direct overlap with R-003.

## R-005: Remove fake bullets

At the start of a line, a bullet-like character followed by a space or tab is removed along with the spacing after it. Indentation before the bullet is preserved.

| Input | Result |
| --- | --- |
| `- This is a bullet` | `This is a bullet` |
| `  •  Indented item` | `  Indented item` |

Recognized markers include hyphens, asterisks, common dash characters, common Unicode bullets, and common filled or hollow bullet shapes.

**Leaves unchanged:** Negative numbers, markers without following whitespace, horizontal rules, inline bullet characters, ordered-list numbers, and lines beginning with `+`, `>`, or `#`.

## R-006: Reduce repeated spaces

A run of two or more ordinary spaces after visible content becomes one space.

| Input | Result |
| --- | --- |
| `Hello  world` | `Hello world` |

**Leaves unchanged:** Line-start indentation, runs after tabs or line breaks, single spaces, tabs, non-breaking spaces, and blank lines.

**Developer notes:** R-010 has higher priority and removes a run immediately before a line break instead of leaving one space.

## R-007: Standardize phone numbers

Recognized North American phone numbers use three digit groups separated by hyphens. A leading `1` or `+1` is removed.

| Input | Result |
| --- | --- |
| `(615) 555-0100` | `615-555-0100` |
| `615.555.0100` | `615-555-0100` |
| `615 555 0100` | `615-555-0100` |
| `6155550100` | `615-555-0100` |
| `+1 (615) 555-0100` | `615-555-0100` |

Mixed spaces, periods, hyphens, en dashes, em dashes, and figure dashes are accepted as separators. Extensions remain untouched.

**Leaves unchanged:** Already-compliant numbers; seven-digit local numbers; area codes or exchanges beginning with 0 or 1; N11 service codes; and unseparated eleven-digit strings that could be account numbers.

## R-008: Expand street names

Capitalized street suffix abbreviations are expanded to full words. Supported results include `Avenue`, `Boulevard`, `Circle`, `Court`, `Drive`, `Highway`, `Lane`, `Pike`, `Parkway`, `Place`, `Road`, `Square`, `Street`, `Terrace`, `Turnpike`, and `Trail`.

| Input | Result |
| --- | --- |
| `123 Main St` | `123 Main Street` |
| `456 Oak Rd` | `456 Oak Road` |
| `789 Elm Ave.` | `789 Elm Avenue` |
| `See you at Oak Ave.` | `See you at Oak Avenue.` |

Both forms with and without a period are recognized. At the end of the text or a line, the abbreviation expands and a sentence-ending period is preserved. In the middle of text, a period followed by a capitalized word remains unchanged because it may end a sentence.

`St` and `Dr` are expanded only when a nearby house number shows that they are street suffixes. This protects names and titles such as `St. Jude Church` and `Dr. Smith`.

**Leaves unchanged:** Lowercase abbreviations, full street names, ambiguous `St` or `Dr` without a house number, and square-footage notation such as `1,500 Sq Ft`.

**Developer notes:** Priority 200 lets street expansions win direct overlaps with R-003. The suffix words are also part of R-003's ignore list.

## R-009: Replace ampersands

A standalone ampersand becomes `and`.

| Input | Result |
| --- | --- |
| `Tom & Jerry` | `Tom and Jerry` |
| `& Co. presents` | `and Co. presents` |

**Leaves unchanged:** Attached forms such as `AT&T`, `R&D`, `B&B`, and `Q&A`; URL query separators; HTML entities; and adjacent ampersands such as `&&`.

The replacement covers only the ampersand, so surrounding spacing remains unchanged.

## R-010: Remove trailing whitespace

Spaces and tabs immediately before a line break or the end of the text are removed.

| Input | Result |
| --- | --- |
| `word  ` followed by a line break | `word` followed by the same line break |
| `last   ` at the end of the text | `last` |

Whitespace-only lines become empty lines. Carriage returns are preserved, so CRLF line endings remain CRLF.

**Leaves unchanged:** Interior spacing and non-breaking spaces.

## R-011: Flag weak link text

The phrases `click here` and `this link`, in any casing, are flagged for manual rewriting because they do not describe a link's destination.

| Input | Result |
| --- | --- |
| `Click Here for details` | Manual review |
| `Follow THIS LINK to register` | Manual review |

The user replaces the phrase with descriptive wording, such as `View the 2026 budget report`, and marks it fixed.

**Leaves unchanged:** Related but different phrases such as `click this link`, `clicking here`, and `this linked page`.

**Developer notes:** Priority 200 prevents an all-caps match such as `CLICK HERE` from receiving a competing lowercase suggestion.

## R-012: Flag raw URLs

An address beginning with `http://` or `https://`, in any casing, is flagged for manual rewriting. The user supplies descriptive link text and uses the address as the link target in the publishing system.

| Input | Result |
| --- | --- |
| `See https://example.com/parks today` | URL flagged for manual review |

The match continues to the next whitespace and includes a query string. Sentence punctuation attached to the end is excluded from the finding.

**Leaves unchanged:** Addresses without a scheme, such as `www.example.com`, and other schemes such as `ftp://`.

**Developer notes:** Priority 300 makes the URL one finding and suppresses all overlapping automatic findings, including state and street abbreviations as well as date-like, phone-like, and all-caps fragments.

## R-013: Convert range dashes

Hyphens, en dashes, and em dashes between number-like range endpoints become the word `to`, with one space on each side.

| Input | Result |
| --- | --- |
| `9 a.m.-5 p.m.` | `9 a.m. to 5 p.m.` |
| `19:00-21:00` | `19:00 to 21:00` |
| `Jun. 23-25` | `Jun. 23 to 25` |
| `10-15 copies` | `10 to 15 copies` |
| `2023-2024` | `2023 to 2024` |

**Leaves unchanged:** Phone numbers, Social Security numbers, other multi-part digit chains, hyphenated words, and negative numbers.

## R-014: Spell out small numbers

Bare numerals from 1 through 10 become lowercase words when they appear to be prose.

| Input | Result |
| --- | --- |
| `I have 3 apples` | `I have three apples` |
| `choose 1` | `choose one` |

**Leaves unchanged:** Decimal numbers (including fractional digits in `1.5` and `.5`), times, dates, phone fragments, numeric ranges and chains, list markers, street-address numbers, currency or symbol-prefixed numbers, ordinals such as `1st`, and numbers above ten.

Month-adjacent numbers are treated conservatively, so an ambiguous expression such as `May 5` remains unchanged. Identifier-like prose without a structural signal, such as `Section 3`, is still flagged and may be skipped.

## R-015: Expand measurements

Supported measurement abbreviations immediately following a number are expanded. The supported units are inches, feet, miles, yards, ounces, pounds, quarts, and gallons.

| Input | Result |
| --- | --- |
| `10 ft` | `10 feet` |
| `3 mi.` | `3 miles` |
| `6 lbs.` | `6 pounds` |
| `10in.` | `10inches` |

Matching allows no space or one space between the number and unit and preserves that spacing. A sentence-ending period at a text or line boundary is preserved.

**Leaves unchanged:** Bare `in` without a period, units without a preceding number, hyphenated adjective forms such as `10-ft`, and a period form followed by a capitalized word in the middle of text.

**Known limitation:** The expansion is literal. For example, `a 10 in. board` becomes `a 10 inches board` and may need a manual grammatical edit.

**Developer notes:** Priority 200 lets an all-caps measurement expand instead of being lowercased by R-003.

## R-016: Collapse blank lines

Two or more consecutive blank lines become one blank line, including at the start or end of the text. Spaces or tabs on otherwise blank lines are removed as part of the correction.

| Input | Result |
| --- | --- |
| `A` followed by three blank lines and `B` | `A` followed by one blank line and `B` |

A single blank line is already compliant. The document's CRLF or LF line-ending convention is preserved.

**Developer notes:** Trailing whitespace on the preceding content line belongs to R-010 and is outside this finding.

## R-017: Flag repeated words

Two identical words separated only by spaces or tabs on the same line are flagged for manual review. Matching is case-insensitive and includes both words in the finding.

| Input | Result |
| --- | --- |
| `the the end` | Manual review |
| `The the fact` | Manual review |
| `don't don't do that` | Manual review |

The user removes one word when the repetition is accidental or skips the finding when it is intentional.

**Leaves unchanged:** Repetition across line breaks, repeated numbers, and words that only share a partial spelling.

**Developer notes:** Priority 200 keeps an all-caps duplicate such as `THE THE` together as one manual finding.

## R-018: Expand street directions

Uppercase directional abbreviations are expanded in a recognized street-address context. Results include `North`, `South`, `East`, `West`, `Northeast`, `Northwest`, `Southeast`, and `Southwest`.

| Input | Result |
| --- | --- |
| `N Main Street` | `North Main Street` |
| `123 S Elm St` | `123 South Elm St` |
| `450 NE Broadway` | `450 Northeast Broadway` |
| `Main St N` | `Main St North` |
| `22nd Ave S.` | `22nd Ave South.` |

A direction qualifies directly after a house number, before a street name and known suffix, or after a known suffix. Forms with periods are expanded in all qualifying contexts. A period at the end of the text or line is kept as sentence punctuation.

**Leaves unchanged:** Lowercase prose and abbreviations outside an address context, such as `E. coli`, `vitamin E`, middle initials, and a bare `N`.

**Developer notes:** Priority 200 lets directions win direct overlaps with R-003. Context matching must emit each occurrence only once.
