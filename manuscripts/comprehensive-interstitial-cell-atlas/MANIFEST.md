# Asset manifest, v11 (FBCNS submission set)

Last updated 2026-08-16. Every file the submission depends on, what generates it, and
what state it is in. Update this file whenever a figure or the tool is rebuilt.

## Manuscript

| File | State |
| --- | --- |
| `Iturralde_2026_FBCNS_v16_submission.docx` | **Submission file.** v15 with the two orphaned table notes repaired. The Table 1 lineage key and the Table 2 abbreviations line had been left behind in the body when the tables moved to the end of the document in v13; both now sit directly beneath their own table. The abbreviations line was also carrying Heading 2 style, so it appeared in the body as a section heading; it is now a 9pt italic table note matching the Table 1 key. Found while reading the iThenticate report, not flagged by it. |
| `manuscript_v16_FBCNS.md` | Source of the submission docx. Clean text, first-person singular; Table 1 note carries the lineage-to-row mapping. |
| `Iturralde_2026_v16_circulation_proof.html` | **Reading copy for circulation**: figures embedded in position as data URIs, exports to PDF as-is. All four figures re-embedded 14 Aug from the clean submission PNGs at 1700px on the long side, JPEG q0.90 — the previous embeds of Figures 3 and 4 carried damaged JPEG scan data. Figure images capped at 5.9in tall so a tall portrait figure and its caption fit inside one page box. |
| `Iturralde_2026_proof_with_figures.html` | Printable proof, all four figures embedded as data URIs. |
| `The cellular lining of a continuous fluid compartment, v16 circulation proof.pdf` | The circulated PDF. Timestamped; see **Timestamp proof** below. |
| `refs.bib` | 41 entries. [24] corrected to *Nat. Genet.* 55, 66-77 (2023). Vancouver-compatible, which is what BMC needs. |

### Removed from the repository, 16 August 2026

Working drafts v4–v15, `manuscript.md`, `cover-letter-FBCNS.md`,
`presubmission-inquiries.md`, `SUBMISSION-STEPS.md` and `SUBMISSION-COMMANDS.txt` were
removed from the public repository **and from its git history** (`git filter-repo`, force
push). The repository is public and reference [42] points reviewers at it, so submission
correspondence, APC-negotiation notes and pitches to other journals did not belong there.
All of it is retained privately in `~/Documents/manuscript-private/`.

Superseded standalone builds `_v1.1.0.html` and `_v1.1.1.html` were removed in the same
pass; both remain archived on their Zenodo version records.

## Timestamp proof

| Field | Value |
| --- | --- |
| File | `The cellular lining of a continuous fluid compartment, v16 circulation proof.pdf` |
| SHA-256 | `1449b0d1996c670dd4234d5e518798c5ce5ce1f94c4a2a96651f851c6c40ad5f` |
| Proof | same filename with `.ots` appended |
| Anchored | Bitcoin blocks **962633** and **962636** |

Transactions:

- `1f16efb66860304523105662c4922150e4fe5134a948c166f0044430529753fe` (block 962633)
- `5358510a8ac9a0d7a28e97dcb21c257682e476526eba1cb57ae8b3a1bb25426f` (block 962636)

Two independent confirmations; three calendar servers still show pending, which does not
matter once any block attestation exists. The block timestamp is the priority date and is
checkable on any block explorer without OpenTimestamps, without a Bitcoin node, and
independently of this repository continuing to exist.

`ots verify` requires a local Bitcoin node and will fail without one. To check without a
node, use the web verifier at opentimestamps.org, or look up either transaction above.

**The proof binds those exact bytes.** Regenerating the PDF, even cosmetically, invalidates
the `.ots`; a fresh timestamp would be required. Never keep an `.ots` whose PDF has
changed — it looks like evidence and verifies against nothing.

## Figures

Four figures, all rendered deterministically from the interactive model. Two resolutions
are maintained deliberately.

| Figure | Content | Publication file | Proof file |
| --- | --- | --- | --- |
| 1 | Thirteen populations on a schematic body, insets A-F, lineage key | `figures/Figure1_key_figure.png` (1430×959) | `figures/proof/Figure1_key_figure.jpg` |
| 2 | Stromal identity × fluid compartment crosswalk, measured baseline velocities | `figures/Figure2_compartment_crosswalk.png` | `figures/proof/…jpg` |
| 3 | Hydration state reconfiguring all compartments, four states | `figures/Figure3_hydration_states.png` | `figures/proof/…jpg` |
| 4 | Six scenario states linking populations to compartment pathophysiology | `figures/Figure4_scenarios.png` (1275×1500) | `figures/proof/…jpg` |

- **Publication PNGs**: full resolution, in `repo/figures/` and mirrored in this paper
  folder. These are what a journal receives.
- **Proof JPEGs**: flattened on white, capped at 1500 px long edge, embedded as data
  URIs inside the proof HTML. This exists because the full-resolution PNGs exceeded
  iOS Safari's decoded-image budget and Figure 4, being last and largest, silently
  failed to render on phones. Do not "fix" the proof by pointing it back at the PNGs.
- **Figure 1 is designated "Key Figure" in v10.** That is a Cell Press device; drop the
  designation for BMC.
- Figure 4 panel f places "11 Perivascular CSF space" inside the frame, the corrected
  version. If Figure 4 is ever re-exported, check that label first.

### Submission figure set

`submission_figures/Figure1.png` … `Figure4.png`, the four publication PNGs renamed to
BMC's expected convention, one file per figure. Upload these four at submission; the
manuscript carries legends only.

## Interactive tool

| File | Role |
| --- | --- |
| `repo/Interstitial-System-3D-Map.html` + `interstitium-model.js` + `three-d-stage.js` | Development source. Script tag carries `?v=3` for cache busting. |
| `repo/Interstitial-System-3D-Map-Mobile.html` | Mobile layout. |
| `repo/Interstitial-System-3D-Map_desktop_v1.1.2.html` | **Standalone deposit build**, everything inlined, opens offline. The manuscript cites the v1.1.0 build by DOI; that record is unchanged and still resolves. |
| `repo/Interstitial-System-3D-Map_mobile_v1.1.2.html` | Standalone mobile build. |
| `repo/index.html` | Device router. Decides on input type (touch points, `pointer: coarse`, `hover: none`) and viewport **width**, not screen resolution: an earlier resolution test sent 1366×768 laptops to the touch build. Both builds stay reachable by direct link from the fallback list. |

Both standalone builds are currently **in sync** with the working copies at the project
root. Regenerate them whenever `interstitium-model.js` changes, or the deposit will
archive an older model than the one that produced the figures.

## Deposit and citation metadata

| File | Note |
| --- | --- |
| `repo/.zenodo.json` | Version 1.1.2, `access_right: open`, `license: cc-by-4.0`, 23 references. Read only by the Zenodo GitHub webhook, which is **not in use** — releases are published by hand via "New version" so the curated figures and README PDF survive. It is the source of truth to paste from, not an automation. |
| `repo/CITATION.cff` | v1.1.2, `license: CC-BY-4.0`. Agrees with `.zenodo.json`. |
| `repo/LICENSE` | **CC BY 4.0**, consistent with the open deposit. Prior all-rights-reserved text preserved in `LICENSE-previous-all-rights-reserved.txt` and governs any copy circulated before the v1.1.0 release. |
| `repo/RELEASING.md` | The release procedure. Version has to be updated in three places before tagging. |
| Concept DOI | 10.5281/zenodo.21584350, always resolves to latest. Cite the **version** DOI in the manuscript. |
| Version DOIs | v1.1.0 `21584351` (cited as [42] in the submission), v1.1.1 `21956307`, v1.1.2 `21957747`. |

## Reader-facing documents

| File | Note |
| --- | --- |
| `Iturralde_2026_proof_with_figures.html` | Printable proof, all four figures embedded as data URIs, `break-inside: avoid` on figure blocks. Source for the reading PDF. Still says v10 in the title, bump when v11 body is final. |
| `readme-pdf/README.html` | Formatted README for PDF export. Carries the IHG framing and the full source list: 23 works the map draws on, grouped as structural/cellular basis (19) and baseline flow velocities (4). The review cites 41; the remainder address matters the map does not depict. Uses static font weights — a variable-axis Newsreader request was producing an 18 MB export from a text-only document. |
| `repo/README.md` | Repository README, same content in Markdown. |

## Before submitting to FBCNS

1. ~~Clear the audit notes~~, done in v12.
2. ~~Replace `LICENSE`~~, done. Confirm you are content with CC BY 4.0 before making the repository public; reverting means restoring the old LICENSE **and** setting `.zenodo.json` back to `restricted`.
3. ~~Decide "we" vs "I"~~, done: first-person singular throughout the body, third-person in Declarations.
4. Bump version to 1.1.0 in `.zenodo.json` and `CITATION.cff`, cut the release, record
   the new version DOI in the manuscript's availability section.
5. Run the text through iThenticate (Brown Library) before submitting, see the Originality note below.
6. Drop the "Key Figure" designation from the Figure 1 legend (Cell Press device).
7. Upload the four figure PNGs as separate files at submission, one file per figure, named `Figure1.png`…`Figure4.png`.
8. ~~Decide on suggested reviewers~~, done: four named with ORCIDs in the cover letter.

## Version history

| Version | Date | Change |
| --- | --- | --- |
| v9 | 2026-07 | IHG hypothesis introduced. Ref [24] cited as bioRxiv preprint (wrong). |
| v10 | 2026-07-29 | Ref [24] corrected to *Nat. Genet.* 55, 66-77. Reference list completed to 41 (had been described as 33). Figures embedded in proof as data URIs to survive mobile. |
| v16 | 2026-08-14 | Table 1 lineage key and Table 2 abbreviations note moved from the body to directly under their tables; abbreviations note demoted from Heading 2 to a 9pt italic table note. Circulation-proof figures re-embedded from clean sources after JPEG damage was found in Figures 3 and 4; figure images capped at 5.9in tall so Figures 2 and 4 print with their captions attached. `SUBMISSION-STEPS.md` added. iThenticate: 12% total, top source 1%, 0 integrity flags, no text change required. |
| v15 | 2026-08-13 | Table 1 lineage shading restored on the row-number column, colours sampled from the Figure 1 legend; table note rebuilt as a keyed swatch list naming the rows in each lineage. |
| v14 | 2026-08-13 | Body text moved to first-person singular (4 sentences). Circulation proof and Markdown source regenerated. `SUBMISSION-COMMANDS.txt` added at the repo root. |
| v11 | 2026-08-12 | Restructured for FBCNS. Tool released as v1.1.0 under CC BY 4.0; standalone builds renamed; deposit set to open.  History-first order; membership criterion added; IHG moved before the atlas; competing-models section added; 19 meta-text audit flags; Cell Press devices removed; Availability of data section added. Tool deposit set to open, v1.1.0. |

## Originality check

A local scan found **no verbatim overlap of 8 or more consecutive words** between the
manuscript body and the titles of any of the 41 cited references, and no duplicated
sentences within the manuscript. That is a useful negative but it is **not a plagiarism
check**, it compares against this reference list only, not against a publication corpus.

Before submitting, run the text through a similarity service with a real corpus:

- **iThenticate / Iterthenticate via Brown University Library**: the same engine most
  publishers use at screening. Usually free to Brown affiliates through the Library or the
  Graduate School; ask for the "similarity check" service.
- **Turnitin** through Brown's teaching-support tools, if iThenticate is unavailable.

Expect a nonzero score. Reference lists, marker gene strings (`PDGFRA, CD34, PI16`)
standard method phrases and journal names all match legitimately. What matters is whether
any *prose* sentence matches a source, check the flagged passages individually rather
than the headline percentage.

## Typography pass (v12.1)

Em dashes and en dashes removed from all document and interface text, and pipe characters
removed from the manuscript. Replacements were made by sense rather than mechanically:
a colon where the second half explains the first, a comma for parenthetical asides, a full
stop where two independent clauses were being joined.

- Manuscript: 14 em dashes reset by hand; Box 1 converted from a pipe-bordered grid table
  to plain bullets; `--` en dash markup in page ranges and compounds reduced to hyphens.
  Two cited titles that carry a dash in the original (Popescu 2010, Siegenthaler 2024) now
  use a colon.
- Interface text: 115 in `interstitium-model.js`, plus the two page shells and
  `three-d-stage.js`. Verified first that no dash was used as a string delimiter.
- Standalone deposit builds regenerated from the cleaned sources. **18 dashes remain inside
  the bundler's own JavaScript comments** in those compiled files; they are machine
  boilerplate, invisible to any reader, and compiled output should not be hand-edited.
- Markdown table pipes in this file and the READMEs were **kept**: they are table structure,
  not prose, and removing them would break rendering on GitHub.

## Figure order and page fit (v12.2)

Two defects introduced by the history-first restructure, both fixed.

**Citation order.** Moving IHG ahead of the atlas inverted which figure was cited first;
order had become 2, 4, 3, 1, which BMC screening queries. Fixed without renumbering any
file: Figure 1 is now cited in the membership-criterion section, where the whole-body map
of the thirteen admitted populations belongs, and the sentence in the IHG section names
Figure 3 before Figure 4. First-citation order is now 1, 2, 3, 4, and physical placement
matches (Figures 1 and 2 with the criterion, 3 and 4 with IHG). Figure files, legends and
`submission_figures/` names are unchanged.

**Page overflow in the proof.** The printable box is about 875 px tall; the two portrait
figure blocks measured 1032 px and 1044 px, and `break-inside: avoid` on the whole
`<figure>` meant the engine had to overflow or strand them. The rule now sits on
`.fig img` alone, with `break-after: avoid` keeping the caption with its image when the
pair fits and letting it flow when it cannot.

## Incident note: the dash pass broke the model script

The v12.1 typography pass included a cleanup rule that stripped a trailing comma before a
newline. In prose that is harmless. In `interstitium-model.js` it deleted **live JavaScript
syntax**, so both standalone builds failed to boot with `SyntaxError`. Repaired in v12.2:

- 182 commas restored inside object literals and argument lists, including method-shorthand
  entries (`apply(){`) and array elements separated by a blank line, which the first repair
  pass missed.
- One getter/setter pair in the `G` proxy needed its separating comma back.
- 7 commas that the repair had wrongly added after `for` and `function` block closes were
  removed. These were the residual parse errors.
- `three-d-stage.js` was restored from the pristine starter rather than patched. It is
  machine boilerplate with no reader-facing prose, so dash removal bought nothing there.
- Verified by parsing each file as a module and by loading the desktop map in a browser:
  the scene builds, all six systems and the atlas overlay render, and the console is clean.

**Lesson for any future bulk text pass: never run prose rules over `.js` or over `.html`
files containing inline script.** Restrict them to Markdown and to text nodes.

## Journal compliance, checked against the guidelines

Verified against the FBCNS submission guidelines and the Review article type page.

| Requirement | State |
| --- | --- |
| Double-line spacing | Set document-wide |
| Line numbering, continuous | Set |
| Page numbering | Footer field added |
| No page breaks in manuscript | Removed; the docx now flows |
| Abstract, structured, under 350 words | 331 words, background / main body / conclusion, no citations |
| Keywords, three to ten | 10 |
| Declarations, all seven subheadings | Present |
| List of abbreviations | Added |
| Availability, software format | All eight fields present |
| Figure titles under 15 words | 11, 7, 7, 9 |
| Figure legends under 300 words | 262, 296, 193, 295 |
| Figure keys inside the graphic | Yes, Figure 1 lineage strip |
| Figures as separate files, cited in order | `submission_figures/Figure1-4.png`, order 1-2-3-4 |
| Tables built as table objects, colour used only where it carries meaning | Table 1 row-number column shaded by lineage, keyed to Figure 1; the key also names the rows, so the mapping survives grayscale printing. Flag at submission if the journal insists on monochrome tables. |
| Tables over one page placed at the end, with a pointer in the text | Note added under Figure legends |
| No commas inside numerals | None found |
| Web links as numbered references | DOI is [42], repository is [43], both with access dates |
| Vancouver reference style | Matches the existing `[n]` scheme |

### Two items that need your judgment

**Figure resolution: resolved, with one caveat.** Measured against the journal's target of
roughly 300 dpi at 170 mm full width (2008 px), the four figures now stand at:

| Figure | Pixels | dpi at 170 mm |
| --- | --- | --- |
| 1 | 2008 x 1346 | 300 |
| 2 | 2221 x 2603 | 332 |
| 3 | 2502 x 2004 | 374 |
| 4 | 1976 x 2324 | 295 |

Figures 2, 3 and 4 were already at or effectively at target; my earlier note that all four
fell short was wrong, because it measured the capped proof JPEGs rather than these files.
Figure 4 at 295 dpi rounds to the target and needs nothing.

**Figure 1 was resampled, not re-rendered.** It was 1430 px (214 dpi) and is now 2008 px by
two-pass high-quality interpolation. For a flat schematic with solid fills and large type
this holds up well and satisfies the journal's operative requirements, which are legibility
at final size and line weights above 0.25 pt. It is not the same thing as re-rendering from
the model: no new detail exists, the pixels were interpolated. If production queries it, the
honest fix is to regenerate the composite from the tool at native 2008 px. The original
1430 px file is preserved in the Zenodo deposit.

**APC.** Handled in the submission correspondence, which is held privately and is not
part of this repository.

## Why the tool needs GitHub Pages as well as Zenodo

Zenodo serves deposited files as downloads and does not execute HTML in the browser. That
is deliberate on their side, it is not a misconfiguration of the record, and it cannot be
changed by editing the deposit. A reader who clicks the HTML file on Zenodo gets a file on
disk, which on a phone is close to useless.

So the deposit and the live version do different jobs, and the manuscript now says so:

- **Project home page**, reference [43], https://pabloiturralde.github.io/interstitium-3d-map/
  runs in the browser with no download. This is the link to give readers, reviewers and
  anyone on a phone.
- **Archived version**, reference [42], DOI 10.5281/zenodo.21584351 (the **version** DOI for v1.1.0;
  concept DOI is 10.5281/zenodo.21584350), is the citable frozen
  copy. Its two builds are self-contained single files that open offline once downloaded.

This is exactly the split BMC's "Project home page" and "Archived version" fields are for,
so no policy tension arises: the archive stays immutable and citable, the live copy stays
usable.

### Turning Pages on, after the repository is public

1. GitHub, repository Settings, Pages.
2. Source: Deploy from a branch. Branch `main`, folder `/ (root)`. Save.
3. Wait for the first build, about a minute, then confirm the URL loads.
4. Test on a phone. `index.html` routes by user agent, touch points and short-edge width,
   so an iPhone or Android lands on the mobile build and a desktop lands on the desktop one.
   Both builds remain reachable by direct link from the fallback list if the routing guesses
   wrong.

If the URL ever needs to change, the manuscript reference [43] and both READMEs are the
three places to update.

## iThenticate similarity report, 14 August 2026

Submission ID `trn:oid:::3117:614383307`. 12% overall, 55 sources, largest single source 1%
(researchsquare.com), 0 integrity flags, no text manipulation detected. Nothing in the report
required a change to the manuscript text. Where the 12% sits, and why each cluster is expected:

| Location | Weight | Reading |
| --- | --- | --- |
| Reference list, manuscript pp. 25–28 | Heaviest, 9–11 sources per page | Most of the 12%. Citation strings match the papers they cite. Re-running with *exclude bibliography* enabled would report roughly 6–8%. |
| Tables 1 and 2, pp. 33–35 | 14 sources on the Table 1 page alone | Marker-gene strings (PDGFRA, CD34, RGS5, CSPG4) match every paper that lists them. Unavoidable in a marker table. |
| Availability of data, Declarations, pp. 23–24 | researchsquare.com, github.com | The github match is this repository — a self-match. The remainder is BMC's own software-availability template, which the journal requires. |
| Boxes 1–2 and glossary, pp. 21–22 | fluidsbarrierscns.biomedcentral.com | Journal boilerplate matching the journal. |
| Body prose, pp. 11–19 | 1–3 sub-1% sources per page, no cluster | The part that matters, and it is clean. |

Two advisory match groups, neither an action item:

- **1 Missing Citation.** Quoted text without a citation, almost certainly `"Historically neglected"`
  in *What unifies these populations*, where the phrase names a rejected inclusion criterion rather
  than quoting a source. Dropping the quotation marks clears the flag. Left as authored pending a
  decision; see `SUBMISSION-STEPS.md` step 1.2.
- **11 Missing Quotations, 1%.** Short standard definitions — the ISCT minimal criteria for
  mesenchymal stromal cells, the CADASIL description. Standard terminology, cited in place.

No re-run is needed for v16. Only the position of two table notes changed; no sentence was altered.
