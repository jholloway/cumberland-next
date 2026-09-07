(function attachReviewSession(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CumberlandNext = root.CumberlandNext || {};
    root.CumberlandNext.createReviewSession = factory().createReviewSession;
  }
})(typeof globalThis === "object" ? globalThis : this, function createReviewModule() {
  function cloneIssue(issue) {
    return { ...issue };
  }

  function inferEditRange(previousText, currentText) {
    let prefix = 0;
    const maxPrefix = Math.min(previousText.length, currentText.length);
    while (prefix < maxPrefix && previousText[prefix] === currentText[prefix]) {
      prefix += 1;
    }

    let suffix = 0;
    const maxSuffix = Math.min(previousText.length - prefix, currentText.length - prefix);
    while (
      suffix < maxSuffix &&
      previousText[previousText.length - 1 - suffix] === currentText[currentText.length - 1 - suffix]
    ) {
      suffix += 1;
    }

    return { start: prefix, end: previousText.length - suffix };
  }

  function validatedEditRange(previousText, currentText, suppliedRange) {
    if (
      !suppliedRange ||
      !Number.isInteger(suppliedRange.start) ||
      !Number.isInteger(suppliedRange.end) ||
      suppliedRange.start < 0 ||
      suppliedRange.end < suppliedRange.start ||
      suppliedRange.end > previousText.length
    ) {
      return inferEditRange(previousText, currentText);
    }

    const replacementLength =
      currentText.length - (previousText.length - (suppliedRange.end - suppliedRange.start));
    if (replacementLength < 0) return inferEditRange(previousText, currentText);

    // A selection captured before input is trusted only when the unchanged
    // text on both sides still lines up. This keeps unusual browser edits,
    // undo/redo, and programmatic input safe by falling back to text diffing.
    const prefixMatches =
      previousText.slice(0, suppliedRange.start) === currentText.slice(0, suppliedRange.start);
    const suffixMatches =
      previousText.slice(suppliedRange.end) ===
      currentText.slice(suppliedRange.start + replacementLength);

    return prefixMatches && suffixMatches
      ? { start: suppliedRange.start, end: suppliedRange.end }
      : inferEditRange(previousText, currentText);
  }

  function createReviewSession(rule) {
    let issues = [];
    let currentIndex = -1;
    let scanCount = 0;

    function currentIssue() {
      return currentIndex < 0 ? null : issues[currentIndex] || null;
    }

    function snapshot() {
      // Return copies so rendering code cannot mutate the live session state.
      return {
        issues: issues.map(cloneIssue),
        currentIndex,
        currentIssue: currentIssue() ? cloneIssue(currentIssue()) : null,
        scanCount,
      };
    }

    function scan(text) {
      // A scan is the boundary for skip/manual decisions: rebuilding it
      // intentionally discards all statuses from the previous analysis.
      issues = rule.detect(text).map((issue) => ({ ...issue, status: "pending", stale: false }));
      currentIndex = issues.length ? 0 : -1;
      scanCount += 1;
      return snapshot();
    }

    function adjustForEdit(previousText, currentText, suppliedRange) {
      // Direct edits no longer invalidate the whole scan. Prefer the actual
      // textarea selection captured before input so identical occurrences
      // retain their own identities; fall back to a shared-prefix/suffix diff
      // when the browser cannot describe one contiguous edit.
      if (previousText === currentText) return snapshot();

      const editRange = validatedEditRange(previousText, currentText, suppliedRange);
      const delta = currentText.length - previousText.length;
      // Re-detect for validation only: keep queue identity and decisions, and
      // never add new findings until Analyze. Context can change even when
      // the matched substring is untouched (TN becoming TNT, for example).
      const liveIssues = new Map(rule.detect(currentText).map((issue) => [
        `${issue.ruleId}:${issue.start}:${issue.end}`, issue,
      ]));

      issues.forEach((issue) => {
        const wasStale = issue.stale;
        let touchedByEdit = false;
        if (issue.end <= editRange.start) {
          // Findings before the changed range keep their existing offsets.
        } else if (
          issue.start >= editRange.end &&
          !(wasStale && editRange.start === editRange.end && issue.start === editRange.start)
        ) {
          issue.start += delta;
          issue.end += delta;
        } else {
          // Even when identical text happens to slide into the same offsets,
          // the captured operation proves that this occurrence was touched.
          touchedByEdit = true;
        }
        const inBounds = issue.start >= 0 && issue.end <= currentText.length;
        const originalStillMatches =
          inBounds && currentText.slice(issue.start, issue.end) === issue.original;
        const liveIssue = liveIssues.get(`${issue.ruleId}:${issue.start}:${issue.end}`);
        const contextStillMatches = liveIssue &&
          liveIssue.original === issue.original &&
          liveIssue.replacement === issue.replacement &&
          JSON.stringify(liveIssue.options) === JSON.stringify(issue.options);

        if (wasStale && !touchedByEdit) {
          // Do not silently bind a stale occurrence to identical text that
          // later slides under its old offsets. A direct edit of that range
          // (including undo) may still restore it below.
          issue.stale = true;
        } else {
          issue.stale = !originalStillMatches || !contextStillMatches || (touchedByEdit && !wasStale);
        }
      });

      return snapshot();
    }

    function advance() {
      if (!issues.length) {
        currentIndex = -1;
        return;
      }
      // Skipped issues stay in the scan so the queue deliberately wraps and
      // gives the user another chance to reconsider them.
      currentIndex = (currentIndex + 1) % issues.length;
    }

    function skip() {
      const issue = currentIssue();
      if (!issue) return snapshot();
      issue.status = "skipped";
      advance();
      return snapshot();
    }

    function applyAutomaticFix(text, chosenReplacement) {
      const issue = currentIssue();
      if (!issue || !issue.canAutoFix) {
        return { text, ...snapshot() };
      }

      // Safety invariant: a replacement is applied only against text that
      // still matches the recorded original, so a stale finding can never
      // splice into the wrong location.
      if (issue.stale || text.slice(issue.start, issue.end) !== issue.original) {
        return { text, ...snapshot() };
      }

      // Rules may offer alternate replacements; the caller's choice must be
      // a string, and offset math uses whichever value is applied.
      const replacement = typeof chosenReplacement === "string" ? chosenReplacement : issue.replacement;
      const updatedText = `${text.slice(0, issue.start)}${replacement}${text.slice(issue.end)}`;
      // Keep the existing scan stable. Only ranges after the replacement need
      // to move; the detector runs again only when the user clicks Analyze.
      const delta = replacement.length - (issue.end - issue.start);
      const removedIndex = currentIndex;

      issues.splice(removedIndex, 1);
      issues.forEach((remainingIssue) => {
        if (remainingIssue.start >= issue.end) {
          remainingIssue.start += delta;
          remainingIssue.end += delta;
        }
      });

      if (!issues.length) {
        currentIndex = -1;
      } else if (removedIndex >= issues.length) {
        currentIndex = 0;
      } else {
        currentIndex = removedIndex;
      }

      return { text: updatedText, ...snapshot() };
    }

    function markManuallyFixed(text) {
      const issue = currentIssue();
      if (!issue || !issue.canManualFix) {
        return { text, ...snapshot() };
      }

      // Manual resolution records the user's decision without changing text
      // or revalidating the finding against the edited content.
      issues.splice(currentIndex, 1);
      if (!issues.length) {
        currentIndex = -1;
      } else if (currentIndex >= issues.length) {
        currentIndex = 0;
      }

      return { text, ...snapshot() };
    }

    return {
      scan,
      adjustForEdit,
      skip,
      applyAutomaticFix,
      markManuallyFixed,
      snapshot,
    };
  }

  return { createReviewSession };
});
