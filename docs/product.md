# Product

## Purpose

Cumberland Next helps the small Nashville.gov content-maintenance team review text received from departments and providers. It finds text that may not follow the website's style guidance and helps editors produce consistent plain text for publishing elsewhere.

The tool improves speed and consistency while leaving people in control of changes that require judgment. It can make mistakes, so every finding is reviewed individually.

## Users

- Fewer than ten Nashville.gov content editors.
- People who understand the organization's content and style practices.
- Developers who maintain the rule set on the team's behalf.

The product does not have accounts, roles, or permissions.

## Workflow

1. Paste plain text into the editor.
2. Select **Analyze**.
3. Review the findings one at a time.
4. Apply a safe automatic correction, make and confirm a manual correction, or skip the finding.
5. Select **Copy text** to copy the editor's exact current contents.

All findings are highlighted, and the current finding is visually distinct. The current explanation and actions stay in a consistent location while the user moves through the queue.

The enabled behavior is defined in the [rule catalog](rules.md).

## Review behavior

- There is no “accept all” action.
- A successful resolution advances to the next finding.
- An automatic fix changes only the matched text and adjusts later finding positions.
- A manual finding remains confirmable after the user edits it.
- Editing one part of the text does not discard unrelated findings. A finding whose original text changed is marked as edited and cannot be fixed automatically.
- Skipped findings remain highlighted and return for reconsideration after the queue cycles.
- **Analyze** always starts a fresh review from the editor's current text. Previous skips and resolution states do not carry over.
- Empty, whitespace-only, and compliant input produces a clear “No issues found” message.
- **Copy text** copies exactly what is in the editor, including user edits and skipped findings.

## Content and delivery boundaries

- Input and output are plain text.
- Source material may originate in Word documents, PDFs, or email, but users paste the text themselves.
- There is no artificial product limit on input length. Most content is short, but several thousand characters should remain practical.
- The application runs as static files without a backend or network service.
- Chrome is the primary browser. Current Firefox and Safari releases are also supported targets.
- The interface supports light and dark themes, defaults to the system preference, and keeps a manual selection for the current page session only.

## Non-goals

- Publishing directly to Nashville.gov.
- Importing Word, PDF, or email files.
- Authentication or access control.
- Persistent storage, review history, or audit history.
- Rich-text or document-format preservation.
- General-purpose grammar or copy editing.
- User-configurable rules.
- Sharing links or downloading generated files.

Rules are added by developers only. Every rule change must update the rule catalog and automated tests.
