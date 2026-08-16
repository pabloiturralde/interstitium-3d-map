# Manuscripts & Drafts

Private working drafts of unpublished manuscripts related to *The Human
Interstitium, Interactive 3D Map*. Kept here for version history and a dated
provenance trail ahead of submission.

> **Manuscript drafts: all rights reserved.** © 2026 Pablo Iturralde, Brown University ·
> ORCID: [0000-0003-4106-4433](https://orcid.org/0000-0003-4106-4433).
> Confidential, not for distribution. **These drafts are excluded from the CC BY 4.0
> licence that covers the software** (root [`LICENSE`](../LICENSE)); the unpublished
> manuscript text and figures remain all-rights-reserved until published.

## Structure

```
manuscripts/
├── README.md                                    (this file)
├── COPYRIGHT-HEADER.md                          (paste at the top of each draft)
└── comprehensive-interstitial-cell-atlas/
    ├── README.md
    ├── MANIFEST.md                              (asset inventory + pre-submission checklist)
    ├── manuscript_v16_FBCNS.md                  (current text, clean)
    ├── Iturralde_2026_FBCNS_v16_submission.docx  (submission file)
    ├── Iturralde_2026_v16_circulation_proof.html (reading copy, figures embedded)
    ├── manuscript.md                            (v10, frozen reference)
    ├── Iturralde_2026_..._v9/v10.docx           (frozen earlier drafts)
    ├── refs.bib                                 (41 entries)
    ├── figures/                                 (Figures 1-4, publication resolution)
    └── submission_figures/                      (Figure1-4.png, BMC upload set)
```

One folder per paper. Keep a dated filename or rely on git history for
versions (e.g. `manuscript.md`, not `manuscript_v3_final_FINAL.md`); the
numbered `.docx` files at this level are the frozen submission drafts.

---

## Establishing a defensible timestamp

A git commit alone is **weak** proof of priority, commit dates can be edited.
Strengthen it with a cryptographic timestamp that doesn't depend on trusting
GitHub or your own clock.

### OpenTimestamps (free, blockchain-anchored)

1. Install: `pip install opentimestamps-client`
2. Stamp a file: `ots stamp manuscript.pdf`
   → produces `manuscript.pdf.ots`
3. Commit **both** the file and its `.ots` proof to this repo.
4. Later, verify anytime: `ots verify manuscript.pdf.ots`
   (upgrade the proof after a few hours once it's anchored: `ots upgrade manuscript.pdf.ots`)

The `.ots` file proves the exact bytes existed at/before a Bitcoin-anchored
time, independent, verifiable, and free.

### Stronger scholarly priority (optional, and **public**)

- **Preprint** (bioRxiv / arXiv / SSRN): a public, dated, citable DOI, the
  strongest priority for scholarly work. Makes the work public, so confirm your
  target journal allows prior preprints before posting.
- **Formal copyright registration** (e.g. U.S. Copyright Office) for a
  registered record.

### Reminders

- Copyright protects your **expression** (text, figures), **not ideas, methods
  or findings**. For methods/inventions, talk to Brown's IP/tech-transfer office.
- "Private repo" is confidentiality by access control, not a legal seal.
- For anything tied to a real filing or dispute, consult Brown's research /
  IP office, this file is practical guidance, not legal advice.
