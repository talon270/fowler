# Fowler

English vocabulary for academic writing and GRE/CAT verbal — one HTML file,
built from real Wiktionary quotations rather than invented example sentences.
Open `fowler.html` from `file://` and it runs; no account, no network, no
build step.

The data comes from three published sources, rebuilt with
`build/build_data.py`: [kaikki.org](https://kaikki.org)'s parse of English
Wiktionary (CC BY-SA 4.0), Coxhead's Academic Word List (570 families, 10
sublists), and the Open English WordNet (`oewn:2021`, MIT). Licence terms for
each are in `LICENSE-DATA.md`.

## Setup / how to run it

```sh
open fowler.html          # or just double-click it
```

To regenerate the data from scratch (not needed unless a source changes):

```sh
python3.14 -m venv build/.venv
build/.venv/bin/pip install -r build/requirements.txt
build/.venv/bin/python -m wn download oewn:2021
# fetch build/sources/kaikki-en.jsonl per build/sources/README.md (3.2 GB)
build/.venv/bin/python build/build_data.py        # runs all stages, ~2 min
```

## What's in it

| View | What it does |
|---|---|
| Home | Due count, streak, words held (21+ day interval) vs. words seen, current rung, an estimated finish horizon |
| Cloze | The main drill — a real quotation with one word blanked, four candidates |
| Recall | Typed drill — gloss and blanked sentence, first letter given, own accuracy number |
| Register | Which of four is marked (informal/slang/dated/archaic/derogatory/obsolete/vulgar/offensive) and therefore doesn't belong in an essay |
| Roots | ~169 hand-written Latin/Greek roots, each listing the pool words that carry it — reference, not a drill |
| Progress | Accuracy per drill, ladder position, kept strictly unaveraged |
| Capture | Word → meaning only, explicitly second-class, never mixed into the headline numbers |
| Settings | Day boundary, timed mode, backup/restore, CSV export, and the assumed-vs-solid table below |

## The things most vocab apps get wrong

**No word ships without someone else's real sentence.** Wiktionary's own
example is often invented for the dictionary; only a `type: "quotation"`
entry — one with a named `ref` — is used, and a word without one simply
doesn't ship. That cost 18 of 570 AWL families (3.2%), not the two-thirds a
naive alphabetical sample suggested.

**The citation is blanked at its own spelling, not the dictionary's.**
*Laconic* is cited from 1736 as "laconick." wiktextract already marks the
exact span it bolded when rendering the citation (`bold_text_offsets`); that
span is what gets blanked and what the typed drill accepts, so a learner
reading the actual 18th-century spelling is never marked wrong for it.

**Register only ever marks down, never up.** Across the whole build, `formal`
and `literary` appear at negligible density in Wiktionary — informal, slang,
dated, archaic, derogatory, obsolete, vulgar and offensive are the tags that
exist in real numbers. So the Register drill never claims a word is
"elevated"; it asks which of four candidates is marked as *too casual, too
dated, or too loaded* for an essay, and a synset gets no question at all
unless it has three unmarked words and at least one marked one.

**A root list is only as honest as its word-matching.** The ~150+ roots
themselves are hand-written; which pool words carry each one is a substring
match, gated to a real morpheme boundary (word start, after a hyphen, or
after a recognized prefix) rather than anywhere in the word. Even so, a
first pass matched "geo" (earth) against "advantageous" and "dungeon," and
"und" (wave) against "misunderstand" — found by running it against the real
21,802-word pool, not by reasoning about it. Every root whose *only* spelling
was under 4 letters was cut outright rather than patched case by case, which
is why the roots list is ~169 instead of the ~214 originally drafted.

**Estimated numbers are gold, everywhere.** The finish horizon on Home is a
straight-line projection from your own logged rate — withheld under 5 logged
days rather than guessed — and always carries the same amber tag every other
app here uses for a derived number.

## What's assumed vs. what's solid

The same table lives in the app's own Settings view.

| Number | Solid | Assumed |
|---|---|---|
| AWL sublist | Coxhead's published grouping | Sublist order isn't a difficulty ranking |
| Zipf score | wordfreq's own frequency measurement | Corpus is web+subtitles+books+social — general rarity, not academic register |
| Register tag | Copied directly from a Wiktionary sense tag | Absence means neutral-or-formal, never verified-formal |
| Root grouping | Root spelling and meaning are hand-written | Word membership is a boundary-checked substring match, not verified etymology |
| Finish horizon | Computed from your own logged rate | A straight-line extrapolation, withheld under 5 logged days |

## Scale, as actually built (PLAN-fowler.md's A9 was an estimate; this is the measurement)

| Quantity | A9 estimate | Actual |
|---|---|---|
| Headwords shipped | 8,000–15,000 | **21,802** (12,330 nouns · 5,778 adj · 2,743 verbs · 951 adv) |
| AWL coverage | ~98% | **552 / 570 (96.8%)** |
| `fowler.html` size | 6–11 MB | **11.85 MB**, against the 15 MB hard budget |
| Clusters surviving the A5 guard | unknown, floor ~400 | **241** — under the floor, so Register ships as a smaller view, as the plan itself anticipated |
| Hand-written roots shipped | ~150 | **169** of 214 drafted (45 cut for relying on a 3-letter-only spelling) |
| Ladder | 10 AWL sublists | 10 AWL sublists + **71** frequency bands of ~300 |

## Deployment / data / privacy

No accounts, no backend, no CDN, no telemetry. `localStorage` under
`fowler.state.v1`, versioned with a migration path. `index.html` + `sw.js` +
`manifest.webmanifest` make it installable as an offline PWA. Not yet pushed
to a public repo — do that only once `build/sources/` is confirmed excluded
(it already is, via `.gitignore`) and the licence terms in `LICENSE-DATA.md`
are read alongside it.
