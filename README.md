# The Human Interstitium, Interactive 3D Map

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.21584350.svg)](https://doi.org/10.5281/zenodo.21584350)

**Published record:** https://doi.org/10.5281/zenodo.21584350 (concept DOI, resolves to the latest version)

An interactive, literature-grounded 3D visualization of the human interstitium
and the five fluid systems it physically connects: the **circulatory**
**lymphatic**, **glymphatic**, **ventricular (CSF)**, and **nervous** systems.
Built as a schematic composite informed by the primary literature rather than a
raw electron-microscopy reconstruction.

**This interactive map is the digital companion to the review *"The cellular lining of a continuous fluid compartment: an interstitial cell atlas and the Interstitial Hydraulic Gating hypothesis"* (Iturralde, 2026), submitted to *Fluids and Barriers of the CNS*, referred to below as the *Interstitial Cell Atlas*, and the working instrument of that review's central hypothesis.** It renders the atlas's thirteen stromal/interstitial cell populations as a toggleable overlay and stages the review's disease scenarios, perineural-space collapse, glymphatic clearance failure, ischemic small-vessel disease (CADASIL/NOTCH3), and edema, as one-click, figure-exportable views.

### The hypothesis this tool visualizes

**Interstitial Hydraulic Gating (IHG)**: the central hypothesis of the companion review (draft v16), holds that the interstitium is not passive packing but a mechanically active, hydration-dependent gate on every compartment it bounds. Interstitial volume, set by local matrix protein composition and systemic hydration, determines the calibre of the axons, capillaries and perivascular conduits running through it. Two opposite failures of that gate converge on the same tissue: **collapse** (dehydration, matrix compaction) throttles perineural and perivascular conduits, while **distension** (edema, congestion) raises pressure on the same structures, so neurodegeneration and cerebral small-vessel disease are reachable by a single mechanical route.

The map is where that claim becomes testable. Hydration is a continuous, model-wide parameter rather than an illustration: moving it recomputes channel width, matrix density, protein conformation, fluid volume and flow rate for all five systems at once, and the live constriction/congestion panel reports each system's deviation from normal. Figures 3 and 4 of the review are deterministic presets of this same model, so a reader can reproduce, or contradict, the published panels by sweeping the parameter themselves.

> **Author:** Pablo Iturralde · ORCID: [`0000-0003-4106-4433`](https://orcid.org/0000-0003-4106-4433)
> **Affiliation:** Brown University
> **Copyright:** © 2026 Pablo Iturralde
> **Version:** 1.1.2 · 2026-08-15
> **Status:** Public. Companion manuscript submitted to *Fluids and Barriers of the CNS*, 2026-08-15; under editorial consideration.
> **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) from the v1.1.0 release onward. See [`LICENSE`](./LICENSE).

**v1.1.2 (patch, 2026-08-15)** — interface and documentation only. No change to the model, geometry, data, figures, or any manuscript content.
>
> - Added a 761–1149px layout band so laptop-width windows get the full desktop interface. Previously the fixed panels overlapped badly in that range: `#scenarios` covered the systems list, `#warn` covered the controls, and `#atlas` floated over the model at `left:376px`.
> - In that band the legend and literature list open on demand from a rail in the header, and the flow-warning panel reveals itself when a system leaves nominal flow, releasing its reserved space back to the control panel otherwise.
> - Corrected the device router to decide on input type (touch points, `pointer: coarse`, `hover: none`) and viewport **width**, not screen resolution. The old test sent 1366×768 laptops to the touch build.
> - Expanded the in-app literature list from 4 entries to all **19** sources the model actually cites, and aligned the Zenodo `references` field to the same set.
> - Gave `#atlas` a phone-width slot; it previously overflowed at `≤760px`.
>
> **v1.1.1 (patch, 2026-08-15)** — interface fix only. No change to the model, geometry, data, figures, or any manuscript content.
>
> - Repaired 59 malformed `rgba()` values and 3 malformed `cubic-bezier()` values across the mobile and desktop stylesheets. Each was missing an argument separator (`rgba(255,255,255.03)` for `rgba(255,255,255,.03)`), so CSS parsers discarded the whole declaration and unselected control buttons rendered with no background fill.
> - Raised unselected-control contrast on both builds: label text from 0.58–0.62 to 0.78–0.82 alpha, a `rgba(255,255,255,.07)` fill and `.22` border on every control class, and toggled-off system rows from 0.4 to 0.72 opacity.
> - Selected controls keep the solid light pill with dark text on both builds.
>
> The companion manuscript and the concept DOI it cites are unaffected.

---

## Contents

| File | Description |
|------|-------------|
| `Interstitial-System-3D-Map.html` | Desktop version (source; loads three.js via CDN) |
| `Interstitial-System-3D-Map_desktop_v1.1.2.html` | Desktop, self-contained single file (as archived on Zenodo) |
| `Interstitial-System-3D-Map-Mobile.html` | Mobile version, tap-select, bottom-sheet UI, confocal palette |
| `Interstitial-System-3D-Map_mobile_v1.1.2.html` | Mobile, self-contained single file (as archived on Zenodo) |
| `interstitium-model.js` | Shared model: geometry, materials, systems, flows, hydration logic |
| `three-d-stage.js` | 3D viewer/exporter shell (renderer, lighting, OrbitControls, OBJ/GLB export) |
| `index.html` | Redirect to the desktop version |
| `figures/` | Figures 1-4 of the companion review, rendered from this model |
| `manuscripts/` | Manuscript drafts (current: v12, FBCNS format), see [`manuscripts/README.md`](./manuscripts/README.md) |

## Running it

- **Desktop:** open `Interstitial-System-3D-Map.html` in a modern browser (Chrome, Safari, Firefox, Edge).
- **In a browser, no download:** https://pabloiturralde.github.io/interstitium-3d-map/ — served by GitHub Pages, routes phones and tablets to the touch build automatically. This is the link to give readers and reviewers.
- **Offline / portable:** open `Interstitial-System-3D-Map_desktop_v1.1.2.html` (or `Interstitial-System-3D-Map_mobile_v1.1.2.html`) directly, no server needed.
- **iPhone / iPad:** save `Interstitial-System-3D-Map_mobile_v1.1.2.html` to the **Files** app and open it there.
  Do **not** open it through a Google Drive link, Drive serves HTML as plain text and will show source code instead of running it.

> A `*.standalone.html` build still fetches the three.js library from a CDN on
> first load, so an internet connection is needed the first time unless a fully
> inlined build is produced.

## Features

- **Dual scale**: whole-body organ schematic with a microstructural callout anchored at the cortical-meningeal boundary, where all five systems converge.
- **~1,000 named parts** across color-coded types, with tap/click-to-identify and literature notes.
- **Flow animation**: erythrocytes, lymph uptake, interstitial drift, action potentials, the glymphatic clearance cycle (CSF influx / amyloid efflux), and ventricular CSF.
- **Time-speed control**: 1× / 2× / 10× / 100× / 1000× to reveal slow fluidic dynamics.
- **Hydration scenarios**: Dehydrated / Low / Normal / High, affecting every system: channel width, matrix density, protein conformation, fluid volume, and flow rate.
- **Constriction / congestion assessment**: a live per-system flow-vs-normal panel with blinking warnings for constriction (dehydration) and congestion/edema, plus an axonal-damage risk alert for the nervous system.
- **Flow-rate metrics**: hover (desktop) or tap (mobile) any duct or flowing molecule for a live velocity readout and % of normal.
- **Palettes**: Confocal, Textbook, Neon (desktop); mobile is locked to Confocal.
- **Export**: download the model as OBJ+MTL or GLB (e.g. for Blender).

## Figures

The four figures of the companion review are generated from this same model and
live in [`figures/`](./figures) (mirrored inside the paper folder at
[`manuscripts/comprehensive-interstitial-cell-atlas/figures/`](./manuscripts/comprehensive-interstitial-cell-atlas/figures)):

| Figure | Content |
|--------|---------|
| `Figure1_key_figure.png` | Thirteen interstitial/stromal populations on a schematic human body, insets A-F, five-lineage colour key |
| `Figure2_compartment_crosswalk.png` | Stromal cell identity mapped onto fluid-transport compartment |
| `Figure3_hydration_states.png` | Hydration state reconfiguring every fluid compartment across four states |
| `Figure4_scenarios.png` | Six scenario states linking atlas populations to compartment pathophysiology |

Rendering is deterministic, the same scenario and hydration settings reproduce
the published panels exactly. Figures 3 and 4 are the visual statement of the
review's **Interstitial Hydraulic Gating** hypothesis: interstitial volume, set by
local matrix protein composition and systemic hydration, as a mechanical gate on
the axons, capillaries and perivascular conduits the compartment bounds.

## Scientific basis

The model is a schematic synthesis grounded in the **41 references** of the companion
review ([`manuscripts/comprehensive-interstitial-cell-atlas/refs.bib`](./manuscripts/comprehensive-interstitial-cell-atlas/refs.bib)).
Its structural claims rest on, among others:

- Benias, P. C., et al. (2018). *Structure and distribution of an unrecognized interstitium in human tissues.* Scientific Reports.
- Cenaj, O., et al. (2021). *Evidence for continuity of interstitial spaces across tissue and organ boundaries in humans.* Communications Biology.
- Iliff, J. J., et al. (2012). *A paravascular pathway facilitates CSF flow… (the glymphatic system).* Science Translational Medicine.
- Louveau, A., et al. (2015). *Structural and functional features of central nervous system lymphatic vessels.* Nature.
- Møllgård, K., et al. (2023). *A mesothelium divides the subarachnoid space into functional compartments.* Science.

The baseline flow velocities the hydration model scales, the quantitative spine of the
IHG hypothesis, come from direct measurement: Chary & Jain (1989, interstitial bulk
flow), Mestre et al. (2018, perivascular CSF), Fischer et al. (1996, initial
lymphatics), and Scallan et al. (2010, Starling exchange).

It is a conceptual and hypothesis-generating visualization, not a voxel-accurate
anatomical dataset: velocities are literature-anchored at the normal state and scaled by
the model's hydration law, so cross-state values are predictions to be tested.

## Archiving & DOI

This repository is wired for **GitHub → Zenodo** integration: cutting a GitHub
release archives a snapshot and mints a citable DOI, using the metadata in
[`.zenodo.json`](./.zenodo.json). Full step-by-step in [`RELEASING.md`](./RELEASING.md).
A machine-readable citation lives in [`CITATION.cff`](./CITATION.cff) (GitHub
renders a "Cite this repository" button from it).

The record is **published and open** at https://doi.org/10.5281/zenodo.21584350 (concept DOI, always resolves to the latest version). From release **v1.1.0** it is fully **open**: `.zenodo.json` sets
`access_right: open` with `license: cc-by-4.0`, matching [`LICENSE`](./LICENSE)
and the open-access terms of the companion journal. The repository stays private
until the manuscript is submitted, then goes public and the release is cut, Zenodo archives private repositories too, so nothing is lost by waiting.

## Citation

> Iturralde, P. (2026). *The Human Interstitium, Interactive 3D Map* (Version 1.1.2) [Software]. Zenodo. https://doi.org/10.5281/zenodo.21584350
>
> Companion to: Iturralde, P. (2026). *The cellular lining of a continuous fluid compartment: an interstitial cell atlas and the Interstitial Hydraulic Gating hypothesis.* Submitted to *Fluids and Barriers of the CNS*., current draft v12, 41 references.

**DOI:** [`10.5281/zenodo.21584350`](https://doi.org/10.5281/zenodo.21584350) — concept DOI, all versions.
Version DOIs: [`…21956307`](https://doi.org/10.5281/zenodo.21956307) (v1.1.1), [`…21584351`](https://doi.org/10.5281/zenodo.21584351) (v1.1.0).

## License

**Creative Commons Attribution 4.0 International (CC BY 4.0)** from the v1.1.0
release onward, share and adapt with attribution. See [`LICENSE`](./LICENSE).
Copies distributed before that release remain under the earlier
all-rights-reserved terms, retained in
[`LICENSE-previous-all-rights-reserved.txt`](./LICENSE-previous-all-rights-reserved.txt).
