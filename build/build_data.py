"""Turn the kaikki English dump into the data blocks inside `fowler.html`.

Python for data, never for serving: this runs on a laptop when a source
changes, and its product is committed. Nothing here executes at page load.

What the output *means*, since that is the part worth stating (see
PLAN-fowler.md Part A for the findings that produced each rule below):

  · English Wiktionary marks registers that fall *below* neutral — informal,
    slang, colloquial, dated, archaic, derogatory, obsolete — and does not mark
    "formal" or "literary" at any usable density (A1). Register tags are
    therefore an annotation on every card, never a pool filter, and the
    cluster drill's axis is "which of these belongs in an essay" rather than
    "which is elevated".

  · A word ships only if a sense of it owns a real quotation — `type
    == "quotation"`, meaning it carries a `ref` (A2). An `example` with no
    `ref` is not evidence of anything and is never used.

  · The first sense in a kaikki record is usually the wrong sense (A7). The
    chosen sense is the one whose own quotation is both real (has a `ref`)
    and longest, among senses that are not themselves a `form-of`/`alt-of` of
    another word — so the gloss and the citation can never disagree.

  · A citation almost never spells the headword the way the entry does (A8).
    wiktextract already marks the exact surface span with
    `bold_text_offsets`; that span, not the lemma, is what gets blanked, and
    it is what the typed-recall drill accepts.

Run:
    python3.14 -m venv build/.venv
    build/.venv/bin/pip install -r build/requirements.txt
    build/.venv/bin/python build/build_data.py
"""
from __future__ import annotations

import collections
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "sources"
CANDIDATES_PATH = SRC / "candidates.jsonl"
KAIKKI_PATH = SRC / "kaikki-en.jsonl"
AWL_PATH = SRC / "awl.json"
APP = HERE.parent / "fowler.html"

LEMMA_POS = {"noun", "verb", "adj", "adv"}

# A1: the registers Wiktionary actually marks, all of them below neutral.
# Unmarked means "neutral or formal" — the two are indistinguishable in the
# data, so an unmarked word is never asserted to be *elevated*, only that
# nothing here flags it as too casual, dated or loaded for an essay.
# `vulgar`/`offensive` are not in A1's own prose example but are the same
# category of thing and had to be added after a real run: without them the
# cluster generator picked "motherfucker" as the answer to "which of these
# belongs in an essay", because that word carries no *other* register tag.
MARKED_REGISTER = {"informal", "slang", "colloquial", "dated", "archaic",
                    "derogatory", "obsolete", "vulgar", "offensive"}

# A7: a sense carrying either tag is not what the word "means" on its own —
# it is a grammatical form or a spelling variant of some other headword.
NON_LEMMA_SENSE = {"form-of", "alt-of"}

REF_RE = re.compile(r"^(\d{4})(?:\s+\w+\s+\d+)?,\s*([^,]+),")


# --- B1: stream the dump once, emit a compact candidate per lemma ----------


def read_jsonl(path: pathlib.Path):
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def parse_ref(ref: str) -> tuple[str | None, int | None]:
    m = REF_RE.match(ref.strip())
    if not m:
        return None, None
    year = int(m.group(1))
    author = m.group(2).strip()
    # A quoted string here is an article/book title standing in for an
    # unnamed author ("2013 April 6, "The attack of the MOOCs", in The
    # Economist:") — that is not a name, so leave the field empty rather
    # than showing a title where the answer screen promises an author.
    if author[:1] in "“‘\"'":
        return None, year
    return author or None, year


def best_quote(sense: dict) -> dict | None:
    """The longest real quotation on this sense, or None.

    A2's rule: `type == "quotation"` is wiktextract's own marker for a cited
    example (it carries a `ref`); a plain `example` is invented for the
    dictionary and is not evidence a learner can be shown as an author's
    sentence.
    """
    best = None
    for ex in sense.get("examples") or []:
        if ex.get("type") != "quotation" or not ex.get("ref"):
            continue
        text = (ex.get("text") or "").strip()
        if len(text) <= 40:
            continue
        if best is None or len(text) > len(best["text"]):
            best = ex
    return best


def surface_span(quote: dict, word: str) -> tuple[int, int, str] | None:
    """Where the headword's surface form sits in the quotation (A8).

    `bold_text_offsets` is wiktextract's own answer to this — the span it
    bolded when rendering the citation — and is trusted first. Only when it
    is missing does a case-insensitive regex step in, allowing an internal
    hyphen and a handful of common inflectional suffixes, because a citation
    almost never spells the headword as the headword.
    """
    text = quote["text"]
    offsets = quote.get("bold_text_offsets") or []
    if offsets:
        i, j = offsets[0]
        if 0 <= i < j <= len(text):
            return i, j, text[i:j]
    pattern = re.escape(word).replace(r"\-", "-?") + r"(?:e?s|e?d|ing|ly)?"
    m = re.search(pattern, text, re.IGNORECASE)
    if m:
        return m.start(), m.end(), text[m.start():m.end()]
    return None


def choose_sense(entry: dict) -> dict | None:
    """A7 + A8 together: the sense whose own citation names the word.

    Rejecting `form-of`/`alt-of` senses fixes cases like *dogged* landing on
    "past tense of dog". Requiring the chosen sense's citation to actually
    contain the headword's surface form is what stops a technically-lemma
    sense from winning on quote length alone while meaning something else.
    """
    best = None
    for sense in entry.get("senses") or []:
        tags = set(sense.get("tags") or [])
        if tags & NON_LEMMA_SENSE:
            continue
        quote = best_quote(sense)
        if quote is None:
            continue
        span = surface_span(quote, entry.get("word", ""))
        if span is None:
            continue
        length = len(quote["text"])
        if best is None or length > best["_len"]:
            gloss = (sense.get("glosses") or [None])[0]
            if not gloss:
                continue
            author, year = parse_ref(quote["ref"])
            best = {
                "gloss": gloss,
                "tags": sorted(tags & MARKED_REGISTER),
                "quote": quote["text"],
                "blank_start": span[0],
                "blank_end": span[1],
                "surface": span[2],
                "author": author,
                "year": year,
                "_len": length,
            }
    if best is not None:
        del best["_len"]
    return best


def stage_candidates() -> None:
    """B1. One record per (word, pos) lemma entry that has a usable sense."""
    if not KAIKKI_PATH.exists():
        raise SystemExit(f"missing {KAIKKI_PATH.name}. See build/sources/README.md")

    seen = 0
    kept = 0
    with CANDIDATES_PATH.open("w", encoding="utf-8") as out:
        for entry in read_jsonl(KAIKKI_PATH):
            pos = entry.get("pos")
            word = entry.get("word")
            if pos not in LEMMA_POS or not word or not re.fullmatch(r"[a-z][a-z'-]*", word):
                continue
            seen += 1
            sense = choose_sense(entry)
            if sense is None:
                continue
            kept += 1
            rec = {"word": word, "pos": pos, **sense}
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")

    (SRC / "stats_b1.json").write_text(json.dumps({"seen": seen, "kept": kept}), encoding="utf-8")
    print(f"B1: {seen} candidate lemma entries scanned, {kept} kept "
          f"({kept/seen:.1%}) — dropped for no qualifying sense/citation")
    print(f"  -> {CANDIDATES_PATH.relative_to(HERE.parent)} "
          f"({CANDIDATES_PATH.stat().st_size/1_048_576:.1f} MB)")
    print("  five records:")
    with CANDIDATES_PATH.open(encoding="utf-8") as fh:
        for i, line in enumerate(fh):
            if i >= 5:
                break
            print("   ", line.strip()[:160])


# --- B2: pool selection — AWL + Zipf band, then the citation filter --------


def stage_pool() -> None:
    import wordfreq

    if not CANDIDATES_PATH.exists():
        raise SystemExit("run stage_candidates first (B1) — no candidates.jsonl")

    awl: dict[str, list[str]] = json.loads(AWL_PATH.read_text(encoding="utf-8"))
    awl_sublist: dict[str, int] = {}
    for sub, words in awl.items():
        for w in words:
            awl_sublist[w] = int(sub)

    by_word: dict[str, dict] = {}
    with CANDIDATES_PATH.open(encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            cur = by_word.get(rec["word"])
            if cur is None or len(rec["quote"]) > len(cur["quote"]):
                by_word[rec["word"]] = rec

    total_candidates = len(by_word)

    # Zipf band per A4/A9: rank 5,000-50,000-ish by wordfreq, stated as
    # ordering only — membership in the academic pool is the AWL's job, this
    # decides where a non-AWL word sits on the ladder, and only within a band
    # frequent enough that "worth drilling" is a defensible claim at all.
    # Bounds measured directly against wordfreq's own top_n_list rather than
    # guessed: rank 5,000 ("wtf") sits at zipf 4.22, rank 50,000
    # ("impertinent") at zipf 2.55. A first guess of 2.5-5.5 let in
    # everything above rank ~600 too — words far too basic to be worth a
    # card — and doubled the shipped pool past A9's own estimate.
    ZIPF_MIN, ZIPF_MAX = 2.55, 4.22

    shipped: list[dict] = []
    drop_no_zipf_band = 0
    for word, rec in by_word.items():
        sub = awl_sublist.get(word)
        zipf = wordfreq.zipf_frequency(word, "en")
        if sub is None and not (ZIPF_MIN <= zipf <= ZIPF_MAX):
            drop_no_zipf_band += 1
            continue
        rec["awl_sublist"] = sub
        rec["zipf"] = round(zipf, 2)
        shipped.append(rec)

    awl_covered = sum(1 for r in shipped if r["awl_sublist"] is not None)
    print(f"B2: {total_candidates} unique headwords with a usable citation")
    print(f"  AWL words with a citation: {awl_covered} / 570 families "
          f"({awl_covered/570:.1%})")
    print(f"  dropped, no AWL entry and outside the {ZIPF_MIN}-{ZIPF_MAX} Zipf band: "
          f"{drop_no_zipf_band}")
    print(f"  shipped: {len(shipped)}")

    # The ladder: AWL sublists 1-10 first (Part 0), then non-AWL words in
    # bands of ~300, ordered by Zipf descending (more frequent = easier).
    # Band order is frequency only, never a claim about how academic a word
    # is — A4's limit, restated where the ladder is actually built.
    BAND_SIZE = 300
    non_awl = sorted((r for r in shipped if r["awl_sublist"] is None),
                      key=lambda r: -r["zipf"])
    band_count = max(1, -(-len(non_awl) // BAND_SIZE))  # ceil div
    for r in shipped:
        r["rung"] = f"awl{r['awl_sublist']}" if r["awl_sublist"] is not None else None
    for i, r in enumerate(non_awl):
        r["rung"] = f"band{i // BAND_SIZE + 1}"
    print(f"  ladder: 10 AWL sublists + {band_count} frequency bands of ~{BAND_SIZE}")

    out_path = SRC / "pool.jsonl"
    with out_path.open("w", encoding="utf-8") as out:
        for rec in shipped:
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"  -> {out_path.relative_to(HERE.parent)} "
          f"({out_path.stat().st_size/1_048_576:.1f} MB)")


# --- B3: clusters, gated by the A5 guard -----------------------------------

POS_TO_WN = {"noun": ("n",), "verb": ("v",), "adj": ("a", "s"), "adv": ("r",)}


def stage_clusters() -> None:
    """B3. A cluster question only where register tags genuinely differ.

    A5's guard: a WordNet synset is built for near-synonymy, so most of its
    members are interchangeable in a sentence — marking one "wrong" there
    would teach a distinction that isn't real. A synset only produces a
    question when it has at least one marked member and at least three
    unmarked ones. Per DESIGN-fowler.html's `#cluster` screen, the marked
    word is the target ("which one stays out of academic prose") and the
    three unmarked words are the distractors — one question per marked
    member, so a synset with several marked words yields several cards
    rather than being capped at one. Where a synset has every member on one
    side of that line, it is skipped, not forced into a question.
    """
    import wn

    pool_path = SRC / "pool.jsonl"
    if not pool_path.exists():
        raise SystemExit("run stage_pool first (B2) — no pool.jsonl")

    # Restricted to the shipped pool, not every candidate B1 kept: a cluster
    # distractor has to be a word the app actually teaches elsewhere, or the
    # drill introduces vocabulary through the back door of a WordNet synset.
    # This also cuts the WordNet lookups from ~130k candidate words to ~20k
    # pool words.
    tags_by_word: dict[str, list[str]] = {}
    with pool_path.open(encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            tags_by_word[rec["word"]] = rec["tags"]

    en = wn.Wordnet("oewn:2021")
    seen_synsets: set[str] = set()
    clusters: list[dict] = []
    considered = 0

    for pos, wn_codes in POS_TO_WN.items():
        for word, tags in tags_by_word.items():
            for code in wn_codes:
                for ss in en.synsets(word, pos=code):
                    if ss.id in seen_synsets:
                        continue
                    seen_synsets.add(ss.id)
                    considered += 1
                    members = [w.lemma() for w in ss.words() if " " not in w.lemma()]
                    unmarked = [w for w in members if w in tags_by_word and not tags_by_word[w]]
                    marked = [w for w in members if w in tags_by_word and tags_by_word[w]]
                    if len(unmarked) < 3 or not marked:
                        continue
                    for target in marked:
                        clusters.append({
                            "synset": ss.id,
                            "pos": pos,
                            "answer": {"word": target, "tags": tags_by_word[target]},
                            "distractors": unmarked[:3],
                            "gloss": ss.definition(),
                        })

    print(f"B3: {considered} synsets touched a pool word")
    print(f"  surviving the A5 guard: {len(clusters)}")
    if len(clusters) < 400:
        print("  ! under ~400 — the cluster drill ships as a smaller view, per A9")

    out_path = SRC / "clusters.jsonl"
    with out_path.open("w", encoding="utf-8") as out:
        for c in clusters:
            out.write(json.dumps(c, ensure_ascii=False) + "\n")
    print(f"  -> {out_path.relative_to(HERE.parent)}")
    for c in clusters[:3]:
        print("   ", c["answer"]["word"], c["answer"]["tags"], "vs", c["distractors"],
              "—", c["gloss"][:60])


# --- B4: roots, hand-written, joined to the shipped pool -------------------

ROOTS_PATH = SRC / "roots.json"
ROOT_FLOOR = 2  # per DESIGN-fowler.html's own example ("ubi—, 2 words in pool")

# Common Latin/Greek prefixes and combining forms. A root substring counts as
# a real match only at word start, after a hyphen, or immediately after one
# of these — never buried mid-word. Found necessary by running B4 on the
# real pool: without this, "geo" (earth) matched "advantageous", "bourgeois"
# and "dungeon", and "gen" (birth) matched "urgent" — every one a coincidence
# of spelling, not a shared root.
PREFIXES = {
    "a", "ab", "abs", "ad", "ac", "af", "ag", "al", "an", "ap", "ar", "as", "at",
    "ambi", "amphi", "ana", "ante", "anti", "apo", "auto",
    "bi", "bio", "by",
    "circum", "co", "col", "com", "con", "cor", "contra", "counter",
    "de", "demi", "di", "dia", "dis", "dys",
    "e", "ec", "ef", "em", "en", "epi", "equi", "ex", "extra", "extro",
    "fore",
    "hemi", "hetero", "homo", "hyper", "hypo",
    "il", "im", "in", "infra", "inter", "intra", "intro", "ir",
    "macro", "mal", "mega", "meta", "micro", "mid", "mis", "mono", "multi",
    "neo", "non",
    "ob", "oc", "of", "omni", "op", "out", "over",
    "pan", "para", "per", "peri", "poly", "post", "pre", "pro", "pseudo",
    "quasi",
    "re", "retro",
    "self", "semi", "sub", "suc", "suf", "sug", "sup", "sur", "sus", "super", "supra", "syn", "sym",
    "tele", "trans",
    "ultra", "un", "under", "uni", "up",
    "with",
}


def root_matches(word: str, variant: str) -> bool:
    """True if `variant` sits at a real morpheme boundary in `word`.

    Word start, right after a hyphen, or right after a recognized prefix —
    never buried in the middle of an unrelated word.
    """
    start = 0
    while True:
        i = word.find(variant, start)
        if i < 0:
            return False
        if i == 0 or word[i - 1] == "-" or word[:i] in PREFIXES:
            return True
        start = i + 1


def stage_roots() -> None:
    """B4. ~150 hand-written roots, each listing the pool words that carry it.

    The root list itself (build/sources/roots.json) is hand-written — no
    machine-readable English morphology source is trustworthy enough, the
    same reasoning hind gives for keeping stroke-order diagrams hand-written
    rather than generated. The word-to-root *join* below is a substring
    match, which is a heuristic and not verified etymology: "gen" (birth)
    will also catch "urgent", which has nothing to do with it. This is the
    one place in the pipeline that ships a claim nobody checked word by word,
    so the app must say "words sharing this spelling", never "descended
    from"; roots.json is where a false match gets fixed by hand once found.
    """
    pool_path = SRC / "pool.jsonl"
    if not pool_path.exists():
        raise SystemExit("run stage_pool first (B2) — no pool.jsonl")

    words = []
    with pool_path.open(encoding="utf-8") as fh:
        for line in fh:
            words.append(json.loads(line)["word"])
    words = sorted(set(words))

    roots = json.loads(ROOTS_PATH.read_text(encoding="utf-8"))
    kept = []
    dropped_short = 0
    for r in roots:
        variants = r["r"]
        # A 3-letter substring collides with unrelated words often enough to
        # be a real problem, found by running this on real data: "sue" (a
        # variant of sequ-/to follow) matched "tissue"; "lat" (fer-/to carry)
        # matched "accumulate" and "calculator". Prefer a root's own 4+
        # letter variants for matching; fall back to a 3-letter one only when
        # the root has no longer spelling to match on at all.
        # A root with no variant 4 letters or longer is dropped outright, not
        # matched on its short spelling. Verified by running against the
        # real pool: even with the boundary rule above, 3-letter-only roots
        # failed badly — "und" (wave) caught "misunderstand", "vid/vis" (to
        # see) caught "divide", "son" (sound) caught "arson". Boundary
        # position isn't enough signal at 3 characters; the false-positive
        # rate across the roots checked this way was the majority, not the
        # exception, so the category is cut rather than patched root by root.
        match_on = [v for v in variants if len(v) >= 4]
        dropped_short += len(variants) - len(match_on)
        if not match_on:
            continue
        matches = sorted(w for w in words if any(root_matches(w, v) for v in match_on))
        if len(matches) >= ROOT_FLOOR:
            kept.append({"root": "—, ".join(variants) + "—", "meaning": r["m"], "words": matches})

    print(f"B4: {len(roots)} hand-written roots, {len(kept)} with >= {ROOT_FLOOR} pool words")
    print(f"  {dropped_short} short (<4-letter) variants skipped in favour of a longer spelling of the same root")
    total_links = sum(len(r["words"]) for r in kept)
    print(f"  {total_links} word-root links total")
    out_path = SRC / "roots_joined.jsonl"
    with out_path.open("w", encoding="utf-8") as out:
        for r in kept:
            out.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"  -> {out_path.relative_to(HERE.parent)}")
    for r in kept[:3]:
        print("   ", r["root"], r["meaning"], "—", r["words"][:6])


# --- splice: write POOL/CLUSTERS/ROOTS/META into fowler.html ---------------


def splice(name: str, payload: str) -> None:
    """Rewrite one GENERATED block in fowler.html, leaving everything else alone."""
    text = APP.read_text(encoding="utf-8")
    start = f"/* GENERATED:{name} */"
    end = f"/* END GENERATED:{name} */"
    i, j = text.find(start), text.find(end)
    if i < 0 or j < 0:
        raise SystemExit(f"marker for {name} not found in {APP.name}")
    text = text[: i + len(start)] + "\n" + payload + "\n" + text[j:]
    APP.write_text(text, encoding="utf-8")


def stage_splice() -> None:
    """Replace the B5 fake-seed blocks with the real, built data."""
    pool_path, clusters_path, roots_path = SRC / "pool.jsonl", SRC / "clusters.jsonl", SRC / "roots_joined.jsonl"
    for p in (pool_path, clusters_path, roots_path):
        if not p.exists():
            raise SystemExit(f"missing {p.name} — run the earlier stages first")

    pool = []
    with pool_path.open(encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            r["id"] = r["word"] + "|" + r["pos"]
            pool.append(r)

    clusters = [json.loads(line) for line in clusters_path.open(encoding="utf-8")]
    roots = [json.loads(line) for line in roots_path.open(encoding="utf-8")]

    rungs_present = {r["rung"] for r in pool}
    awl_rungs = [f"awl{i}" for i in range(1, 11) if f"awl{i}" in rungs_present]
    band_rungs = sorted((r for r in rungs_present if r and r.startswith("band")),
                         key=lambda r: int(r[4:]))
    rungs = awl_rungs + band_rungs

    awl_covered = sum(1 for r in pool if r["awl_sublist"] is not None)

    # A2's own measurement was scoped to a fixed, countable universe (58/59
    # AWL headwords, 19/20 GRE words) — not "how many Wiktionary entries in
    # the whole dictionary lack a citation", which is a different, far
    # larger and mostly-irrelevant number (a first version of this computed
    # candidates-scanned minus candidates-kept across the *entire* dump and
    # got 740,180, which is meaningless as a pool statistic). The AWL is the
    # one fixed-size list here, so its own shortfall is the honest number.
    meta = {
        "pool_total": len(pool),
        "awl_covered": awl_covered,
        "awl_total": 570,
        "dropped_no_citation": 570 - awl_covered,
        "clusters_total": len(clusters),
        "rungs": rungs,
        "zipf_band_words": 300,
        "is_fake_seed": False,
    }

    blocks = {
        "META": "const DATA_META = " + json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + ";",
        "POOL": "const POOL = " + json.dumps(pool, ensure_ascii=False, separators=(",", ":")) + ";",
        "CLUSTERS": "const CLUSTERS = " + json.dumps(clusters, ensure_ascii=False, separators=(",", ":")) + ";",
        "ROOTS": "const ROOTS = " + json.dumps(roots, ensure_ascii=False, separators=(",", ":")) + ";",
    }
    for name, payload in blocks.items():
        splice(name, payload)
        print(f"  spliced {name}: {len(payload)/1024:.0f} KB")

    # Part 0's stated budget: "hard 15 MB, build fails loudly if exceeded."
    # A silent overshoot is exactly the kind of thing this house style is
    # built to catch before it ships, not after.
    BUDGET_MB = 15
    size_mb = APP.stat().st_size / 1_048_576
    print(f"\n{APP.name} is now {size_mb:.2f} MB")
    if size_mb > BUDGET_MB:
        raise SystemExit(f"OVER BUDGET: {size_mb:.2f} MB > {BUDGET_MB} MB — narrow the Zipf band "
                          f"in stage_pool (ZIPF_MIN/ZIPF_MAX) and rerun pool -> clusters -> roots -> splice")


def main() -> int:
    stage = sys.argv[1] if len(sys.argv) > 1 else "all"
    if stage in ("candidates", "all"):
        stage_candidates()
    if stage in ("pool", "all"):
        stage_pool()
    if stage in ("clusters", "all"):
        stage_clusters()
    if stage in ("roots", "all"):
        stage_roots()
    if stage in ("splice", "all"):
        stage_splice()
    return 0


if __name__ == "__main__":
    sys.exit(main())
