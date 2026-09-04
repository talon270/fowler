# Source files

Not committed — together about 3.4 GB, and every one is a published download
that can be fetched again. `build/build_data.py` expects these exact filenames
in this directory.

| File | Bytes | Where it comes from |
|---|---|---|
| `kaikki-en.jsonl` | 3.2 GB | `https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl` |
| `awl.json` | 6 KB | Coxhead's Academic Word List, 570 families across 10 sublists, transcribed from `https://www.eapfoundation.com/vocab/academic/awllists/` |

Open English WordNet (`oewn:2021`, MIT) is not a file here — `wn` fetches and
caches it under `~/.wn_data` on first use, via `python -m wn download oewn:2021`.

`wordfreq` (Apache-2.0) ships its frequency tables inside the pip package
itself — nothing to download separately.

The kaikki dump supports range requests, so `curl -C -` resumes a broken
download rather than restarting.

Licences for every source are in `../../LICENSE-DATA.md`.
