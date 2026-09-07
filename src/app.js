(function startApp(root) {
  const api = root.CumberlandNext;
  const editor = document.getElementById("editor");
  const highlightLayer = document.getElementById("highlightLayer");
  const highlightContent = document.getElementById("highlightContent");
  const analyzeButton = document.getElementById("analyzeButton");
  const copyButton = document.getElementById("copyButton");
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const issueList = document.getElementById("issueList");
  const currentActions = document.getElementById("currentActions");
  const statusMessage = document.getElementById("statusMessage");
  const characterCount = document.getElementById("characterCount");
  // enabled-rules.js derives this array from the rule scripts loaded before it.
  const ruleRegistry = api.createRuleRegistry(api.enabledRules);
  const session = api.createReviewSession(ruleRegistry);
  let state = session.snapshot();
  let hasAnalyzed = false;
  let initialIssueCount = 0;
  let analysisOutdated = false;
  // Mirrors the editor contents so each input event can diff against the
  // last known text and hand the session a single changed region.
  let knownEditorValue = "";
  let pendingEditorEdit = null;
  let pendingViewportResize = null;
  let manuallySelectedTheme = false;
  const characterSegmenter =
    typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const isDark = theme === "dark";
    const nextAction = isDark ? "Switch to light mode" : "Switch to dark mode";
    themeIcon.textContent = isDark ? "☀" : "☾";
    themeToggle.setAttribute("aria-label", nextAction);
    themeToggle.setAttribute("title", nextAction);
    themeToggle.setAttribute("aria-pressed", String(isDark));
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function setStatus(message) {
    statusMessage.textContent = message;
  }

  function countCharacters(value) {
    if (!characterSegmenter) return Array.from(value).length;

    let count = 0;
    for (const segment of characterSegmenter.segment(value)) count += 1;
    return count;
  }

  function updateCharacterCount() {
    const count = countCharacters(editor.value);
    characterCount.textContent = `${count.toLocaleString()} character${count === 1 ? "" : "s"}`;
  }

  function createTextNode(text) {
    return document.createTextNode(text);
  }

  function describeWhitespace(value) {
    const lineBreaks = (value.match(/\r\n|\r|\n/g) || []).length;
    const withoutLineBreaks = value.replace(/\r\n|\r|\n/g, "");
    const spaces = (withoutLineBreaks.match(/ /g) || []).length;
    const tabs = (withoutLineBreaks.match(/\t/g) || []).length;
    const parts = [];

    if (spaces) parts.push(`${spaces} space${spaces === 1 ? "" : "s"}`);
    if (tabs) parts.push(`${tabs} tab${tabs === 1 ? "" : "s"}`);
    if (lineBreaks) parts.push(`${lineBreaks} line break${lineBreaks === 1 ? "" : "s"}`);
    return parts.join(" + ") || "whitespace";
  }

  function displayIssueValue(value) {
    if (value === "") return "remove";
    return /^[ \t\r\n]+$/.test(value) ? describeWhitespace(value) : value;
  }

  function issueTitle(issue) {
    const original = displayIssueValue(issue.original);
    return issue.canAutoFix && typeof issue.replacement === "string"
      ? `${original} → ${displayIssueValue(issue.replacement)}`
      : original;
  }

  function renderHighlights() {
    const fragment = document.createDocumentFragment();
    let cursor = 0;

    state.issues.forEach((issue, index) => {
      if (issue.stale || issue.start < cursor) return;
      fragment.appendChild(createTextNode(editor.value.slice(cursor, issue.start)));
      const span = document.createElement("span");
      span.className = "issue-highlight";
      span.classList.add(issue.canManualFix ? "is-manual" : "is-auto");
      if (index === state.currentIndex) span.classList.add("is-current");
      if (issue.status === "skipped") span.classList.add("is-skipped");
      span.title = issue.explanation;
      span.textContent = editor.value.slice(issue.start, issue.end);
      fragment.appendChild(span);
      cursor = issue.end;
    });

    fragment.appendChild(createTextNode(editor.value.slice(cursor)));
    // A preformatted element does not create a line box after its final line
    // break, while a textarea does. Give the mirror an invisible character on
    // that last empty line so both elements keep the same scroll height.
    if (editor.value.endsWith("\n")) fragment.appendChild(createTextNode("\u200b"));
    highlightContent.replaceChildren(fragment);
    // Replacing the mirror contents can change its scroll range. Re-apply the
    // textarea's authoritative position after the new content is in place.
    syncScroll();
  }

  function renderIssues() {
    issueList.replaceChildren();

    state.issues.forEach((issue, index) => {
      const item = document.createElement("li");
      item.className = "issue-card";
      item.classList.add(issue.canManualFix ? "is-manual" : "is-auto");
      if (index === state.currentIndex) item.classList.add("is-current");
      if (issue.status === "skipped") item.classList.add("is-skipped");
      if (issue.stale) item.classList.add("is-stale");

      const title = document.createElement("h3");
      title.textContent = issueTitle(issue);

      item.append(title);

      if (issue.stale) {
        const note = document.createElement("p");
        note.className = "issue-edited";
        note.textContent = "Edited since analysis";
        item.append(note);
      }

      issueList.appendChild(item);
    });
  }

  function renderCurrentActions() {
    currentActions.replaceChildren();

    const issue = state.currentIssue;
    if (!issue) return;

    const label = document.createElement("p");
    label.className = "current-actions-label";
    label.textContent = "Current issue";

    const title = document.createElement("h3");
    title.className = "current-actions-title";
    title.textContent = issueTitle(issue);

    const explanation = document.createElement("p");
    explanation.className = "current-actions-explanation";
    explanation.textContent = issue.explanation;

    const panelParts = [label, title, explanation];

    if (issue.stale) {
      const hint = document.createElement("p");
      hint.className = "current-actions-message";
      hint.textContent = issue.canManualFix
        ? "Edited since the last analysis. If your edit resolves it, mark it manually fixed; otherwise Analyze to re-check it."
        : "Edited since the last analysis. Analyze to re-check this occurrence before applying an automatic fix.";
      panelParts.push(hint);
    }

    const actionButtons = document.createElement("div");
    actionButtons.className = "issue-actions";

    // Capabilities come from the rule issue, so the UI needs no rule-specific
    // branching as additional rule types are introduced.
    if (issue.canAutoFix) {
      const fixButton = document.createElement("button");
      fixButton.className = "issue-action issue-action-primary";
      fixButton.type = "button";
      fixButton.textContent = "Fix automatically";
      fixButton.disabled = Boolean(issue.stale);
      fixButton.addEventListener("click", () => {
        const result = session.applyAutomaticFix(editor.value);
        editor.value = result.text;
        knownEditorValue = result.text;
        state = result;
        render();
        focusReviewContinuation();
      });
      actionButtons.appendChild(fixButton);
    }

    if (issue.canManualFix) {
      const manualButton = document.createElement("button");
      manualButton.className = "issue-action issue-action-primary";
      manualButton.type = "button";
      manualButton.textContent = "Mark manually fixed";
      manualButton.addEventListener("click", () => {
        const result = session.markManuallyFixed(editor.value);
        state = result;
        render();
        focusReviewContinuation();
      });
      actionButtons.appendChild(manualButton);
    }

    const skipButton = document.createElement("button");
    skipButton.className = "issue-action";
    skipButton.type = "button";
    skipButton.textContent = "Skip for now";
    skipButton.addEventListener("click", () => {
      const previousRange = state.currentIssue
        ? `${state.currentIssue.start}:${state.currentIssue.end}`
        : null;
      state = session.skip();
      render();
      const current = state.currentIssue;
      // Skipping the only remaining issue wraps back to itself, leaving the
      // screen otherwise unchanged, so record the skip out loud instead.
      if (current && `${current.start}:${current.end}` === previousRange) {
        setStatus("Issue skipped. It stays in this scan and will be offered again.");
      }
      focusReviewContinuation();
    });
    actionButtons.appendChild(skipButton);

    if (Array.isArray(issue.options) && issue.options.length) {
      const optionRow = document.createElement("p");
      optionRow.className = "secondary-options";
      optionRow.append("or apply: ");
      issue.options.forEach((option, index) => {
        if (index > 0) optionRow.append(" · ");
        const link = document.createElement("button");
        link.className = "option-link";
        link.type = "button";
        link.textContent = option.label;
        link.disabled = Boolean(issue.stale);
        link.addEventListener("click", () => {
          const result = session.applyAutomaticFix(editor.value, option.value);
          editor.value = result.text;
          knownEditorValue = result.text;
          state = result;
          render();
          focusReviewContinuation();
        });
        optionRow.appendChild(link);
      });
      panelParts.push(optionRow);
    }

    panelParts.push(actionButtons);
    currentActions.append(...panelParts);
  }

  function renderSummary() {
    if (!hasAnalyzed) {
      setStatus("Analyze text to find issues.");
      return;
    }

    if (analysisOutdated && !state.issues.length) {
      setStatus("Text changed since analysis. Analyze to check for new issues.");
      return;
    }

    if (!initialIssueCount) {
      setStatus("No issues found.");
      return;
    }

    const resolvedCount = initialIssueCount - state.issues.length;
    if (!state.issues.length) {
      setStatus("All detected issues resolved.");
      return;
    }

    const editedCount = state.issues.filter((issue) => issue.stale).length;
    setStatus(
      `Reviewing ${state.currentIndex + 1} of ${state.issues.length}` +
        ` · ${state.issues.length} remaining · ${resolvedCount} resolved` +
        (editedCount ? ` · ${editedCount} edited` : "") +
        (analysisOutdated ? " · Text changed; Analyze to check for new issues." : "")
    );
  }

  function render() {
    renderHighlights();
    renderIssues();
    renderCurrentActions();
    renderSummary();
    updateCharacterCount();
    // Wait for highlight and queue layout before measuring their active items.
    requestAnimationFrame(() => {
      scrollActiveIssueIntoView();
      scrollCurrentCardIntoView();
    });
  }

  function focusReviewContinuation() {
    const nextAction =
      currentActions.querySelector(".issue-action-primary:not(:disabled)") ||
      currentActions.querySelector(".issue-action:not(:disabled)") ||
      currentActions.querySelector(".option-link:not(:disabled)");
    (nextAction || analyzeButton).focus();
  }

  function scrollCurrentCardIntoView() {
    const currentCard = issueList.querySelector(".issue-card.is-current");
    if (!currentCard) return;

    const listRect = issueList.getBoundingClientRect();
    const cardRect = currentCard.getBoundingClientRect();
    const padding = 8;

    if (cardRect.top < listRect.top + padding) {
      issueList.scrollTop += cardRect.top - (listRect.top + padding);
    } else if (cardRect.bottom > listRect.bottom - padding) {
      issueList.scrollTop += cardRect.bottom - (listRect.bottom - padding);
    }
  }

  function scrollActiveIssueIntoView() {
    if (!state.currentIssue || state.currentIssue.stale) return;

    const activeHighlight = highlightContent.querySelector(".issue-highlight.is-current");
    if (!activeHighlight) return;

    const layerRect = highlightLayer.getBoundingClientRect();
    const highlightRect = activeHighlight.getBoundingClientRect();
    const verticalPadding = 16;
    const horizontalPadding = 16;
    let nextScrollTop = highlightLayer.scrollTop;
    let nextScrollLeft = highlightLayer.scrollLeft;

    if (highlightRect.top < layerRect.top + verticalPadding) {
      nextScrollTop += highlightRect.top - (layerRect.top + verticalPadding);
    } else if (highlightRect.bottom > layerRect.bottom - verticalPadding) {
      nextScrollTop += highlightRect.bottom - (layerRect.bottom - verticalPadding);
    }

    if (highlightRect.left < layerRect.left + horizontalPadding) {
      nextScrollLeft += highlightRect.left - (layerRect.left + horizontalPadding);
    } else if (highlightRect.right > layerRect.right - horizontalPadding) {
      nextScrollLeft += highlightRect.right - (layerRect.right - horizontalPadding);
    }

    const scrollTop = Math.max(0, nextScrollTop);
    const scrollLeft = Math.max(0, nextScrollLeft);
    highlightLayer.scrollTop = scrollTop;
    highlightLayer.scrollLeft = scrollLeft;
    editor.scrollTop = scrollTop;
    editor.scrollLeft = scrollLeft;
  }

  function analyze() {
    state = session.scan(editor.value);
    knownEditorValue = editor.value;
    hasAnalyzed = true;
    analysisOutdated = false;
    initialIssueCount = state.issues.length;
    render();
  }

  async function copyText() {
    const text = editor.value;
    try {
      // The modern Clipboard API may be unavailable on local or insecure
      // origins. Its legacy fallback reports failure by returning false, so
      // both paths share one success check before claiming the copy worked.
      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      } else {
        editor.focus();
        editor.select();
        copied = document.execCommand("copy");
        editor.setSelectionRange(editor.value.length, editor.value.length);
      }
      setStatus(copied ? "Text copied." : "Copy failed. Select the text and copy it manually.");
    } catch (error) {
      setStatus("Copy failed. Select the text and copy it manually.");
    }
  }

  function syncScroll() {
    highlightLayer.scrollTop = editor.scrollTop;
    highlightLayer.scrollLeft = editor.scrollLeft;
  }

  function handleViewportResize() {
    if (pendingViewportResize !== null) cancelAnimationFrame(pendingViewportResize);
    pendingViewportResize = requestAnimationFrame(() => {
      pendingViewportResize = null;
      syncScroll();
      scrollActiveIssueIntoView();
      scrollCurrentCardIntoView();
    });
  }

  function editRangeForInput(previousValue, currentValue) {
    // A collapsed beforeinput selection identifies a caret, not the characters
    // removed by Backspace/Delete. Reconstruct that old-text range from the
    // length change; history and unusual edits fall back to the session's diff.
    const edit = pendingEditorEdit;
    pendingEditorEdit = null;
    if (!edit || edit.inputType.startsWith("history")) return null;
    if (edit.start !== edit.end) return { start: edit.start, end: edit.end };

    const removedLength = previousValue.length - currentValue.length;
    if (removedLength > 0 && edit.inputType.startsWith("delete")) {
      if (edit.inputType.endsWith("Backward")) {
        return { start: Math.max(0, edit.start - removedLength), end: edit.start };
      }
      if (edit.inputType.endsWith("Forward")) {
        return { start: edit.start, end: Math.min(previousValue.length, edit.end + removedLength) };
      }
      return null;
    }

    return { start: edit.start, end: edit.end };
  }

  analyzeButton.addEventListener("click", analyze);
  copyButton.addEventListener("click", copyText);
  themeToggle.addEventListener("click", () => {
    manuallySelectedTheme = true;
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
  editor.addEventListener("beforeinput", (event) => {
    pendingEditorEdit = {
      start: editor.selectionStart,
      end: editor.selectionEnd,
      inputType: event.inputType || "",
    };
  });
  editor.addEventListener("input", () => {
    const previousValue = knownEditorValue;
    const editRange = editRangeForInput(previousValue, editor.value);
    knownEditorValue = editor.value;
    if (hasAnalyzed) {
      if (previousValue !== editor.value) analysisOutdated = true;
      // Edits slide and re-validate findings instead of invalidating the
      // whole scan; changed source text or matching context makes a finding stale.
      state = session.adjustForEdit(previousValue, editor.value, editRange);
    }
    renderHighlights();
    renderIssues();
    renderCurrentActions();
    renderSummary();
    updateCharacterCount();
  });
  editor.addEventListener("scroll", syncScroll);
  window.addEventListener("resize", handleViewportResize);

  const systemThemeQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  applyTheme(systemTheme());
  if (systemThemeQuery) {
    const handleSystemThemeChange = (event) => {
      if (!manuallySelectedTheme) applyTheme(event.matches ? "dark" : "light");
    };
    if (systemThemeQuery.addEventListener) {
      systemThemeQuery.addEventListener("change", handleSystemThemeChange);
    } else if (systemThemeQuery.addListener) {
      systemThemeQuery.addListener(handleSystemThemeChange);
    }
  }

  render();
})(window);
