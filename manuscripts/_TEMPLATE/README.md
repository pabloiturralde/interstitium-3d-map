# <Paper short title>

One-paper folder. Rename `_TEMPLATE` to a short slug.

## Contents
- `manuscript.md` (or `.docx` / `.pdf`) — the draft; start with the copyright header.
- `manuscript.pdf.ots` — OpenTimestamps proof; commit alongside the file it stamps.
- `figures/` — figure source + exports.
- `refs.bib` — references.

## Timestamp checklist
1. `ots stamp manuscript.pdf` → `manuscript.pdf.ots`
2. Commit **both** files.
3. After a few hours: `ots upgrade manuscript.pdf.ots`, then commit the upgraded proof.
4. Verify anytime: `ots verify manuscript.pdf.ots`

> Re-stamp whenever the file's bytes change — a proof only covers the exact version it was made from.
