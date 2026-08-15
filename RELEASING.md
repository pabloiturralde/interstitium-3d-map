# Archiving on Zenodo & minting a DOI

This repository is configured for **GitHub → Zenodo** integration. Cutting a
GitHub release triggers Zenodo to archive a snapshot of the code and mint a
citable DOI automatically. The metadata for each archive is read from
[`.zenodo.json`](./.zenodo.json).

> **Access note (changed for v1.1.0):** `.zenodo.json` now sets `access_right`
> to `open` with `license: cc-by-4.0`, so the archived files are publicly
> downloadable. This is required by *Fluids and Barriers of the CNS*, which is
> fully open access and expects cited resources to be reachable, a reader who
> cannot open the model cannot reproduce Figures 3 and 4.
>
> [`LICENSE`](./LICENSE) was replaced with CC BY 4.0 to match, and
> `CITATION.cff` carries `license: CC-BY-4.0`. All three now agree. The prior
> all-rights-reserved terms are kept in
> [`LICENSE-previous-all-rights-reserved.txt`](./LICENSE-previous-all-rights-reserved.txt)
> and govern any copy circulated before this release. If you decide against
> CC BY, revert **both** that file over `LICENSE` **and** `access_right` to
> `restricted`, never one without the other. Note that CC BY cannot be
> withdrawn from copies already distributed under it, so settle this before the
> repository goes public.
>
> **Manuscript drafts under `manuscripts/` are excluded**: they remain
> all-rights-reserved and confidential. See
> [`manuscripts/README.md`](./manuscripts/README.md).
>
> Timing: keep the GitHub repository private until you submit, then make it
> public and cut the release. Zenodo archives private repos too, so nothing is
> lost by waiting.

## One-time setup

1. Push this repository to GitHub (private is fine, Zenodo archives private
   repos too).
2. Sign in at **https://zenodo.org** with your GitHub account (or link GitHub
   under *Account → Linked accounts*).
3. Go to **https://zenodo.org/account/settings/github/**: your repositories
   are listed there.
4. Flip the toggle **ON** next to `interstitium-3d-map`. This installs the
   release webhook. Do this *before* creating the release below.

## Cut a release (every version)

1. Update the version number in **three** places so they agree:
   - `.zenodo.json` → `"version"`
   - `CITATION.cff` → `version` and `date-released`
   - the release tag itself

   For v11 of the manuscript this is **1.1.0** / **2026-08-12** / tag **v1.1.0**.
2. On GitHub: **Releases → Draft a new release**.
3. Create the tag, **`v1.1.0`** for this release (semantic versioning; Zenodo
   treats each new tag as a new version of the same concept-DOI).
4. Give it a title and notes, then **Publish release**.
5. Within a minute or two the archive appears at
   **https://zenodo.org/account/settings/github/** with a DOI badge next to the
   repo. Zenodo issues two DOIs:
   - a **concept DOI** that always resolves to the latest version, and
   - a **version DOI** unique to this specific release.

## After the first release

1. Copy the **concept-DOI badge** Markdown from the Zenodo repository page.
2. Paste it at the top of [`README.md`](./README.md), replacing the
   placeholder badge line.
3. Add the resolved DOI to `CITATION.cff` as an `identifiers:` entry and to the
   README citation block, e.g.:

   ```yaml
   identifiers:
     - type: doi
       value: 10.5281/zenodo.21584351
       description: Concept DOI (all versions)
   ```

## Fields Zenodo pulls from `.zenodo.json`

Title, authors + ORCID + affiliation, description, keywords, upload type
(`software`), language, access level, and related identifiers all come from
`.zenodo.json`, they override whatever GitHub would guess, so keep that file
authoritative and the release notes short.
