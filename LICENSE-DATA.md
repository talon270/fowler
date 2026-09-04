# Data licences

The code in this repository is mine. The linguistic data is not, and one of
the four sources is **share-alike** — the data derived from it here carries
the same terms.

| Source | Licence | Used for |
|---|---|---|
| [English Wiktionary](https://en.wiktionary.org) via [kaikki.org](https://kaikki.org) | **CC BY-SA 4.0** | Glosses, quotations with author/year, register tags |
| Coxhead's [Academic Word List](https://www.wgtn.ac.nz/lals/resources/academicwordlist) | Free for educational use — **not a formal open licence** | The 570-family, 10-sublist ladder base |
| [Open English WordNet](https://en-word.net) (`oewn:2021`) | **MIT** | Synsets for the register (cluster) drill |
| [wordfreq](https://github.com/rspeer/wordfreq) 3.1.1 | **Apache-2.0** | Zipf frequency band, ladder order past the AWL |

## What that means here

**The generated data block inside `fowler.html` is derived from Wiktionary
and is therefore CC BY-SA 4.0.** Anyone redistributing this app redistributes
that data under the same licence, with attribution. The block is marked
`GENERATED:POOL` and is the only part of the file this applies to; the
`GENERATED:CLUSTERS` block is a join of that data against WordNet (MIT) and
carries the more restrictive of the two, CC BY-SA. Everything outside the
GENERATED markers is hand-written.

**The AWL is not formally open.** Coxhead's list is free for educational use
and mirrored widely, but carries no CC or other open licence. It decides pool
membership and ladder order only — no AWL text itself is reproduced beyond
the words and their sublist number, which are facts, not the compiler's
expression.

**No source here is non-commercial.** Nothing here is restricted the way
Filin's KELLY list restricts that app.

## What is not from these sources

`build/sources/roots.json` — the ~150+ Latin and Greek roots, their spelling
variants and their meanings — is **hand-written**, compiled from general
classical-roots knowledge rather than transcribed from any one copyrighted
glossary. The *join* between a root and the pool words that carry it is a
substring match computed at build time (`build/build_data.py`, `stage_roots`)
and is a heuristic, not verified etymology — see `LICENSE-DATA.md`'s sibling
note in `PLAN-fowler.md` Part B4 and the assumed-vs-solid table in the app's
own Settings view.
