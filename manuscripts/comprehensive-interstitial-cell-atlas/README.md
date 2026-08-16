# Comprehensive Interstitial Cell Atlas

One-paper folder. Review manuscript, single author. **Target: *Fluids and Barriers of the CNS* (BMC), accepts unsolicited reviews; direct submission.**

See `MANIFEST.md` for the full asset inventory and the pre-submission checklist.

> **Manuscript drafts: all rights reserved.** © 2026 Pablo Iturralde, Brown University ·
> ORCID: [0000-0003-4106-4433](https://orcid.org/0000-0003-4106-4433).
> Confidential, not for distribution. **These drafts are excluded from the CC BY 4.0
> licence that covers the software** (root [`LICENSE`](../../LICENSE)); the unpublished
> manuscript text and figures remain all-rights-reserved until published.

## Contents
- `Iturralde_2026_FBCNS_v16_submission.docx`, **current draft (v16), submission-ready.** FBCNS/BMC format; audit changes executed, no annotations; first-person singular voice; Table 1 row numbers shaded by lineage to match Figure 1; both table notes sit under their tables. Cleared iThenticate at 12% total / 1% top source / 0 integrity flags.
- `Iturralde_2026_v16_circulation_proof.html`, reading copy with figures in position; export to PDF for circulation.
- `manuscript_v16_FBCNS.md`, source of the docx.
- `manuscript_v12/v14/v15_FBCNS.md`, `..._v13/v14/v15_submission.docx`, superseded, kept for provenance.
- `manuscript_v11_FBCNS.md`, `..._v11_working.docx`, superseded annotated draft.
- `manuscript.md`, v10, frozen reference copy; opens with the copyright header. Includes Tables 1 and 2 as in-text tables, the legends for all four figures, plus the Highlights, Outstanding Questions, and Glossary boxes.
- **New in v10:** reference list corrected and completed, **41 entries** (the list had been described as 33), and reference [24] (Madissoon *et al.*) corrected to the published paper: *A spatially resolved atlas of the human lung characterizes a gland-associated immune niche*, **Nat. Genet. 55, 66-77 (2023)**, doi [10.1038/s41588-022-01243-4](https://doi.org/10.1038/s41588-022-01243-4). The earlier drafts cited it as a 2021 bioRxiv preprint (v8 and before) and then as *Genome Biol.* 24, 41 (v9); both were wrong. Fixed in `manuscript.md`, `refs.bib`, the v10 `.docx`, and the figure proof.
- **New in v9:** the *Interstitial Hydraulic Gating* (IHG) hypothesis, interstitial volume, set by local matrix protein composition and systemic hydration, as a mechanical gate on the axons, capillaries and perivascular conduits the compartment bounds. Added as a named section (replacing the former "hypothetical paradigm" heading), with a matching Highlight, abstract sentence, Glossary entry, Outstanding Question, and a Concluding-remarks tie-in.
- `Iturralde_2026_Comprehensive_Interstitial_Cell_Atlas_v10.docx`, **current submission draft (v10)**, figures placed and captioned.
- `Iturralde_2026_Comprehensive_Interstitial_Cell_Atlas_v9.docx`, previous draft, kept for provenance.
- `Iturralde_2026_proof_with_figures.html`, printable proof with all four figures in position (source for the reading PDF).
- `refs.bib`, references (**41 entries**; numbering matches the `[n]` citations in the text). v9/v10 add [34]-[41]: the measured flow-velocity and capillary-exchange sources behind Figure 2a and Table 2 ([34]-[37], the quantitative anchors of the IHG hypothesis), human DRG telocytes [38], and the dermal-papilla / MSC-epigenetics sources for Table 1 ([39]-[41]). Reference [24] (Madissoon) is corrected to the published *Nature Genetics* 55, 66-77 (2023) version.
- `figures/`, figure exports at publication resolution.
  - `Figure1_key_figure.png`, thirteen interstitial/stromal populations mapped onto a schematic human body, with lineage-coloured callouts (A-F insets).
  - `Figure2_compartment_crosswalk.png`, stromal cell identity mapped onto fluid-transport compartment.
  - `Figure3_hydration_states.png`, hydration state reconfiguring every fluid compartment across four states.
  - `Figure4_scenarios.png`, six scenario states linking atlas populations to compartment pathophysiology.

Figures are rendered deterministically from the companion 3D model (`../../interstitium-model.js`); the same PNGs are mirrored in the repository-level `../../figures/` folder for the interactive map's documentation.

## Timestamp checklist
1. `ots stamp manuscript.md` → `manuscript.md.ots`
2. Commit **both** files.
3. After a few hours: `ots upgrade manuscript.md.ots`, then commit the upgraded proof.
4. Verify anytime: `ots verify manuscript.md.ots`

> Re-stamp whenever the file's bytes change, a proof only covers the exact version it was made from.
