# Fowler — English vocabulary for academic writing and exam verbal

Written 2026-09-04, against an empty `engo/` folder.

Method: the design was settled over six rounds of questions. Every data claim
below was **measured**, not assumed — a 20 MB byte-range slice of the kaikki
English dump (9,160 entries) for the structural questions, and 79 individually
fetched per-word records (59 AWL headwords, 20 GRE-level words) for the coverage
questions. Two of my own earlier recommendations were wrong and are corrected in
Part A. Nothing was checked by reading about the data; every number came from
running against it.

**Nothing below is implemented — this is the plan.**

The app is **Fowler**, after *Modern English Usage* — the book that is entirely
about which of two near-synonyms is the right one. The folder stays `engo/`; the
app file is `fowler.html` and the repo is `fowler`.

---

## Part 0 — confirmed intent

| Decision | Settled as |
|---|---|
| The gap | Writing precision **and** GRE/CAT verbal — the same gap, since near-synonym discrimination is what both reward |
| Typing | Allowed in the app. MCQ is the bulk; one typed drill exists |
| Question form | A real sentence with one word blanked, four candidates |
| Scheduling | `hind`'s SRS lifted wholesale — due queue, configurable day boundary, streaks with grace days, undo restoring exact prior schedule |
| Word pool | Academic Word List (570 families, 10 pre-ordered sublists) + a `wordfreq` Zipf band |
| Sentences | Wiktionary quotations, with author and year. **A word with no quotation does not ship** |
| Ladder | AWL sublists 1–10, then frequency bands of ~300. Each rung gated at 30 questions, 80% |
| Timing | Untimed by default. An optional timed mode exists because the exam is timed, tracked as a separate number |
| Cluster drill | WordNet synsets, discriminating **neutral vs. marked** register |
| Pool size | Everything that qualifies. Home states the finishable horizon at your real daily rate |
| Answer screen | Tested sense, Latin/Greek root with its other descendants, the cluster with register labels, citation author and year |
| Roots view | Yes — ~150 hand-written roots, each listing the words from your own pool |
| Capture | Yes, as an explicitly second-class card: word→meaning only, marked as such |
| File shape | One HTML, hard 15 MB budget, build fails loudly if exceeded |
| Home metric | Due + streak, plus **words held** (passed at an interval of 21 days or more), with words-seen beside it |
| Deploy | Own public repo, PWA, `LICENSE-DATA.md` |
| The guard | **Never lose review history.** Built during the skeleton phase, not after |

---

## Part A — findings, ranked

### A1 · MODEL GAP (high) — resolved: Wiktionary does not tag elevated register

I recommended filtering the word pool to Wiktionary's `formal` and `literary`
tags. That filter does not exist at any usable density.

Across 9,160 entries in the sampled slice: `formal` appears **9 times**,
`literary` **6**, `poetic` **5**. The marked-downward registers are dense by
comparison — `obsolete` 186, `slang` 122, `rare` 113, `informal` 101, `archaic`
94, `dated` 63, `derogatory` 49, `colloquial` 48. Across all 59 AWL headwords
fetched individually, **not one** carried `formal` or `literary`.

English Wiktionary marks registers that fall *below* neutral. Unmarked means
"neutral or formal", and the two are indistinguishable in the data.

**Fix:** the tags become an **annotation, never a filter**. Pool membership is
decided by AWL list plus Zipf band alone. The cluster drill's axis inverts: the
question is "which of these four belongs in an essay", where three carry
`informal` / `slang` / `colloquial` / `dated` / `archaic` / `derogatory` /
`obsolete` and one is unmarked. This is the smallest fix because it changes only
which direction the drill discriminates, and keeps every other component.

**This is a narrower claim than "teaches formal register" and the app must say
so.** Home names the axis: Fowler tests whether a word is too casual, too dated
or too loaded for academic prose. It does not rank neutral words by formality,
because nothing in the data can.

### A2 · DESIGN RISK (high) — resolved: the no-sentence rule is nearly free

"Ship no word without a quotation" looked expensive. On a random alphabetical
slice, only **36.3%** of lemma entries (n/v/adj/adv, excluding inflected forms)
carried a quotation over 40 characters with a `ref`. That implied losing
two-thirds of the pool.

That number is an artefact of sampling alphabetically through Wiktionary's tail.
Measured against words that would actually be drilled:

| Set | Coverage |
|---|---|
| 59 AWL headwords | **58/59 — 98%** (only *region*) |
| 20 GRE-level words | **19/20 — 95%** (only *mendacious*) |

**Fix:** none needed. The rule stands as designed and costs roughly 2–5% of the
real pool. Home prints the dropped count anyway, because the number being small
is a finding, not a reason to hide it.

### A3 · MODEL GAP (medium): no official GRE or CAT word list exists

ETS has never published a GRE lexicon; every "GRE 1000 words" is a publisher's
reconstruction and is copyrighted. CAT has no stated lexicon at all.

**Fix:** the AWL (Coxhead, 570 word families, pre-split into 10 frequency-ordered
sublists) plus a `wordfreq` Zipf band. The README states this substitution in
plain words rather than implying the list is exam-derived. This is the smallest
honest fix — the alternative, scraping a crowdsourced list, buys a marginally
better exam feel at the cost of redistributing someone else's copyrighted
reconstruction under an unclear licence.

### A4 · DESIGN RISK (medium): `wordfreq`'s corpus is not academic prose

`wordfreq` 3.1.1 (Apache-2.0) blends web text, subtitles, books and social media.
Ordering the band by its Zipf score answers "how rare is this word in general
English", not "how academic is it". Those diverge: a common technical term ranks
as rare, and a rare-but-casual word ranks alongside a rare-but-scholarly one.

**Fix:** state it on the card and in the README, the way `hind` states that a
frequency rank counts spellings rather than senses. The band decides *order*,
never *membership in the academic pool* — that is the AWL's job. Do not
substitute a better corpus: COCA is paid, and building one from a Wikipedia dump
is a second project.

### A5 · DESIGN RISK (medium): a cluster question with two right answers

WordNet synsets are built for near-synonymy, so most clusters contain words that
are genuinely interchangeable in a given sentence. Marking one wrong would teach
a distinction that does not exist — the same failure class as `hind`'s कमलौ
question occupying two paradigm slots.

**Fix:** generate a cluster question only where the candidates' register tags
**differ**, with at least one unmarked and at least one marked. Where every
candidate is unmarked, the words are interchangeable enough that the question is
broken and is not asked. Where every candidate is marked the same way, likewise.
Home prints how many clusters survived. Verify over at least 1,200 generated
questions before shipping, as `hind` did, rather than reasoning about it.

### A6 · NOISE (low): the AWL's licence is not a formal open licence

Coxhead's Academic Word List is free for educational use and is mirrored widely,
but it does not carry a CC or other formal open licence. Wiktionary data is
CC BY-SA 4.0 and is **share-alike** — anything derived from it here inherits
those terms. WordNet is permissively licensed. `wordfreq` is Apache-2.0.

**Fix:** `LICENSE-DATA.md` in the shape of `hind`'s, naming all four sources with
their actual terms, and flagging the AWL as "free for educational use, not a
formal open licence" rather than glossing it as open. The generated data block
inside `fowler.html` is marked and is CC BY-SA.

### A7 · BUG (medium): the first sense is usually the wrong sense

Found while assembling real cards for the design. Taking `senses[0]` from a
kaikki record produces a card that teaches something other than the word you
meant:

| Word | `senses[0]` returns | The sense the pool wants |
|---|---|---|
| *dogged* | "simple past and past participle of **dog**" | persistent, tenacious |
| *tenacious* | "Holding together; cohesive" | holding firmly to a purpose |
| *obstinate* | "Of a facial feature or expression, fixed and unmoving" | stubborn, unyielding |

**Fix:** pick the sense by **the one whose own quotation is longest and carries
no `form-of` tag**, then confirm the headword's surface form appears in that
quotation. Rejecting `form-of` senses alone fixes *dogged*; requiring the sense
to own the citation fixes the other two, because the citation and the gloss then
cannot disagree. This is the smallest fix because it adds no external data — the
kaikki record already carries everything needed to make the choice.

### A8 · BUG (medium): the citation carries a surface form, not the lemma

The quotation that makes a word drillable rarely spells it the way the headword
does:

| Headword | As it appears in its own citation |
|---|---|
| *laconic* | **laconick** (Pope, 1736) |
| *mulish* | **mulishly** (Orwell, 1934) |
| *pigheaded* | **pig-headed** (Crane, 1895) |

**Fix:** blank the sentence by matching the **surface form**, not the lemma —
a case-insensitive match allowing an internal hyphen and a common inflectional
suffix. The typed recall drill accepts every form that appears in the citation
alongside the modern lemma, because the quotation is the evidence and the app
should not mark a learner wrong for reading it. A word whose citation contains
no matchable form is dropped like a word with no citation at all, and counted in
the same number.

### A9 · Scale, extrapolated

**These are estimates, not measurements, and the build confirms or corrects
them.** Method: 41.7% of sampled entries were lemma n/v/adj/adv; a Zipf band
covering roughly ranks 5,000–50,000 should yield 8,000–15,000 headwords; per-word
payload (word, pos, tested gloss, root, synset ids, one citation with its ref,
tags, Zipf) minifies to an estimated 350–500 bytes.

| Quantity | Estimate |
|---|---|
| Headwords shipped | 8,000–15,000 |
| Data block | 4–8 MB |
| Total `fowler.html` | 6–11 MB, against a 15 MB budget |
| Clusters surviving the A5 guard | **Unknown.** Measure at build; if under ~400 the cluster drill is thin and Home must say so |

The cluster count is the one number that could invalidate a decision, so it gets
measured in step B3 before any drill is built on top of it.

Add **137 KB** of embedded fonts (below), which is under 1% of the budget.

---

## Part B — the build

Each step is independently shippable and gets run before the next begins.

**B1 · The pipeline skeleton.** `build/build_data.py`, Python 3.14 with a fresh
`.venv` — every pre-existing venv on this machine targets a dead 3.13 and needs
rebuilding. Stream the 3.2 GB kaikki dump once, never load it, and emit a compact
candidate JSONL. Verify by counting entries and printing five records.

**B2 · Pool selection.** AWL sublists plus `wordfreq` Zipf band, then the
citation filter. Output: the shipped word list with per-stage drop counts, so the
Home numbers come from the build rather than being typed in.

**B3 · Clusters, and the measurement that gates them.** WordNet synsets joined to
Wiktionary tags, with the A5 guard applied. **Print the surviving cluster count
before building the drill.** If it is thin, the drill ships as a smaller view
with the count stated, not as a headline feature.

**B4 · Roots.** ~150 Latin and Greek roots and affixes, hand-written, each mapped
to the words in the shipped pool that contain it. Hand-written because no
machine-readable English morphology source is trustworthy enough — the same
reasoning that kept stroke-order diagrams out of `hind`.

**B5 · The skeleton, and the guard.** `fowler.html` running end to end on 20 fake
words: storage under one namespaced key, `SCHEMA_VERSION`, a migration path,
backup/restore, CSV export, router, both themes, empty state. **The guard is
built here.** Seed the old schema shape and reload before calling this done.

**B6 · Cloze drill.** Blanked sentence, four candidates, `hind`'s SRS behind it,
undo restoring the exact prior schedule from a snapshot.

**B7 · Recall drill.** Definition plus blanked sentence, type the word, first
letter given. Its own accuracy number, never merged into B6's.

**B8 · Cluster drill.** Per B3's measured count.

**B9 · Gate.** 30 questions at 80% opens the next rung.

**B10 · Roots view.** Reference, not a drill.

**B11 · Capture.** Second-class cards, marked as such wherever they are counted.

**B12 · Progress.** Cards per day over 12 weeks, per-drill accuracy kept separate,
ladder distribution, timed-mode accuracy separate again, second-class share.

**B13 · Settings.** Day boundary, timed mode off by default, backup/restore, CSV
export, and an assumed-vs-solid table.

**B14 · PWA.** `index.html`, `sw.js`, `manifest.webmanifest`, icons.

**B15 · Ship.** README in the six-section shape, `LICENSE-DATA.md` per A6, git
repo, deploy.

### Verification, at Gate 2

Playwright against `file://`, driving real clicks rather than `page.evaluate`,
with the standing checklist: zero console errors on a fresh and a seeded profile,
old-schema seed survives reload, both themes, empty / single / realistic-volume
states, no `alert()` or `confirm()` anywhere, estimated numbers visibly marked,
backup/restore round-trips. Plus the A5 guard verified over 1,200 generated
cluster questions.

---

## Part C — the design

`DESIGN-fowler.html` is the visual spec. It opens from `file://`, carries every
screen, and its two drills actually grade a click rather than showing a second
static mock of the answered state. Every sentence in it is a real Wiktionary
quotation with its author and year.

**Warm neutrals only, and one accent.** Oxblood, the editor's pen, marks both a
wrong answer and a word carrying a register label — the same category of thing.
Moss green is the only second hue and means correct. Gold marks a number derived
from an estimate, as in every other app here.

**Newsreader for the sentence, Geist for the app, JetBrains Mono for every
number.** The specimen is a published sentence; setting it in the UI sans
flattens it into chrome. All four faces are latin-subset and **embedded as
base64**, because Chrome will not load a linked font over `file://` and a phone
running the PWA has no Geist installed. Total 137 KB.

**Nothing is centred.** Home splits action from standing claim; the drill puts
the reading column at a 56-character measure on the left with the meta rail on
the right. Verified with no horizontal overflow and even gutters at 1920, 1500,
1024, 768 and 375 px.

**Neutral is drawn as an absence** — an outline chip with no fill — because the
data does not assert neutrality, it merely has no label. A filled "formal" badge
would be the app inventing a claim per A1.

Verified by Playwright driving real clicks: 30 checks, all passing — zero console
errors, all three webfonts resolving, both themes, the answer screen hidden until
answered, undo restoring the unanswered state, the 1736 spelling accepted by
recall, and no browser dialog raised at any point.

---

---

## Out of scope

- **Audio and pronunciation.** A second data source, a second failure mode, and
  not what either goal needs.
- **Etymology beyond the root.** The roots view exists to make unseen words
  guessable; full etymological trees are a different app.
- **A better SRS.** `hind`'s scheduler ships as-is. FSRS tuning is a change to
  make once there is real review history to tune against, not before.
- **Generated sentences.** A5 and A2 together mean the citations are sufficient.
  Writing sentences would be the app inventing evidence.
- **Any language but English.**
- **Sync, accounts, backend.** Backup/restore is the transfer mechanism.
- **A better frequency corpus.** Per A4 — building one from a Wikipedia dump is a
  separate project, and the README states the limit instead.
