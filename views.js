"use strict";
/* ============================================================================
   FOWLER · VIEWS
   ----------------------------------------------------------------------------
   Home, Cloze, Recall, Register, Roots, Progress, Capture, Settings.
   Reads POOL / CLUSTERS / ROOTS / DATA_META (defined in fowler.html) and the
   Fowler.* core module. Each view is a pure DOM-returning function registered
   with Fowler.Router.register.
   ========================================================================== */
(function () {
  const { Store, Dates, SRS, Rung, UI, Router } = Fowler;
  const state = () => Store.get();

  const byId = {};
  POOL.forEach((w) => { byId[w.id] = w; });

  function fmtPct(x) { return x === null ? "—" : Math.round(x * 100) + "%"; }

  function pick(arr, n, excludeId) {
    const pool = arr.filter((w) => w.id !== excludeId);
    const out = [];
    const copy = pool.slice();
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
  }

  function blankSentence(quote, start, end, fillWith, cls) {
    const span = UI.el("span", { class: "blank" + (cls ? " " + cls : "") }, [fillWith || ""]);
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode(quote.slice(0, start)));
    frag.appendChild(span);
    frag.appendChild(document.createTextNode(quote.slice(end)));
    return { frag, span };
  }

  function citation(w) {
    if (!w.author && !w.year) return null;
    const parts = [];
    if (w.year) parts.push(String(w.year));
    if (w.author) parts.push(w.author);
    return parts.join(", ");
  }

  function tagChip(tags) {
    if (!tags || !tags.length) return UI.el("span", { class: "tag neutral", text: "neutral" });
    return UI.el("span", { class: "tag", text: tags[0] });
  }

  const FLAME_PATH = "M12 2c1 3-2 4.5-2 7a3 3 0 0 0 6 0c0-1-.3-1.8-.7-2.4C17 8 18 10.3 18 13a6 6 0 1 1-12 0c0-4.5 3.5-6.5 6-11z";

  function flameEl(count, big) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", FLAME_PATH);
    svg.appendChild(path);
    return UI.el("span", { class: "flame" + (big ? " big" : "") }, [svg, UI.el("b", { text: String(count) })]);
  }

  // A single-value SVG ring — used only for "progress toward this rung's
  // gate", the one place in the app a radial has a single 0-100% meaning.
  // The full ladder (ten-plus rungs) stays linear bars on Progress; a page
  // of rings there would be decoration, not information.
  function ringEl(pct, size) {
    size = size || 64;
    const r = (size - 8) / 2, c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, pct));
    const wrap = UI.el("div", { class: "ring", style: "width:" + size + "px;height:" + size + "px" });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    [["track", 0], ["fill", c * (1 - clamped)]].forEach(([cls, offset]) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("class", cls);
      circle.setAttribute("cx", size / 2); circle.setAttribute("cy", size / 2); circle.setAttribute("r", r);
      if (cls === "fill") {
        circle.setAttribute("stroke-dasharray", c);
        circle.setAttribute("stroke-dashoffset", offset);
      }
      svg.appendChild(circle);
    });
    wrap.appendChild(svg);
    wrap.appendChild(UI.el("div", { class: "num mono", text: Math.round(clamped * 100) + "%" }));
    return wrap;
  }

  function chip(label, valueEl, opts) {
    const dd = typeof valueEl === "string" ? UI.el("dd", { class: "big", text: valueEl }) : valueEl;
    return UI.el("div", { class: "chip" + (opts && opts.accent ? " accent" : "") }, [
      UI.el("dt", { text: label }), dd
    ]);
  }

  function updateHeaderStreak() {
    const el = document.getElementById("headerStreak");
    if (!el) return;
    el.textContent = "";
    el.appendChild(flameEl(state().streak.current));
  }

  /* --- Home ---------------------------------------------------------------- */

  function viewHome() {
    const s = state();
    const cur = Rung.progress();
    const held = SRS.heldWords();
    const seen = SRS.seenWords();

    const clozeIds = POOL.filter((w) => Rung.list().indexOf(w.rung) <= s.profile.rungIndex).map((w) => "cloze:" + w.id);
    const recallIds = clozeIds.map((id) => id.replace(/^cloze:/, "recall:"));
    const dueCloze = SRS.dueCount(clozeIds);
    const dueRecall = SRS.dueCount(recallIds);

    const root = UI.el("div");
    root.appendChild(UI.el("h1", { text: "Home" }));

    const app = UI.el("div", { class: "app" });
    const homeGrid = UI.el("div", { class: "home" });

    const lead = UI.el("div", { class: "lead" });
    lead.appendChild(UI.el("div", { class: "duerow" }, [
      UI.el("div", { class: "due mono", text: String(dueCloze + dueRecall) }),
      flameEl(s.streak.current, true)
    ]));
    lead.appendChild(UI.el("p", { class: "duelab", text: "cards due today" }));

    const launch = UI.el("div", { class: "launch" });
    const launchers = [
      ["cloze", "Cloze", "A published sentence with one word removed. Four candidates.", dueCloze],
      ["recall", "Recall", "Type the word from its sense and sentence. First letter given.", dueRecall],
      ["register", "Register", "Which of four belongs in an essay, and which is marked.", CLUSTERS.length],
    ];
    launchers.forEach(([id, name, desc, count]) => {
      const btn = UI.el("button", { type: "button", onclick: () => Router.go(id) }, [
        UI.el("div", {}, [
          UI.el("div", { class: "nm", text: name }),
          UI.el("div", { class: "ds", text: desc })
        ]),
        UI.el("span", { class: "ct mono", text: String(count) })
      ]);
      launch.appendChild(btn);
    });
    const gateBtn = UI.el("button", { type: "button", onclick: () => Router.go("progress") }, [
      UI.el("div", {}, [
        UI.el("div", { class: "nm", text: "Gate · " + cur.rungId }),
        UI.el("div", { class: "ds", text: cur.seen + "/" + cur.need + " questions at " + fmtPct(cur.right / (cur.seen || 1)) + " — needs " + Math.round(cur.threshold * 100) + "%" })
      ]),
      ringEl(cur.seen ? cur.seen / cur.need : 0, 44)
    ]);
    launch.appendChild(gateBtn);
    lead.appendChild(launch);
    homeGrid.appendChild(lead);

    const side = UI.el("div", { class: "side" });
    const heldStat = UI.el("div", { class: "stat" }, [
      UI.el("div", { class: "n", text: String(held.size) }),
      UI.el("div", { class: "l", text: "words held" }),
      UI.el("div", { class: "sub" }, ["Passed at an interval of 21 days or more. ",
        UI.el("span", { class: "mono", text: String(seen.size) }), " words seen, which is the weaker number and is not the headline."])
    ]);
    const rungStat = UI.el("div", { class: "stat" }, [
      UI.el("div", { class: "n", text: cur.rungId + " of " + Rung.list().length }),
      UI.el("div", { class: "l", text: "current rung" }),
      UI.el("div", { class: "sub", text: "AWL sublists, then frequency bands of ~" + (DATA_META.zipf_band_words || 300) + " words." })
    ]);

    // Finish horizon: extrapolated from the logged daily rate, per Home metric
    // rule in PLAN-fowler.md Part 0 — a range with a sample count, gold because
    // it is an estimate, never a bare date.
    const days = Object.keys(s.log).length;
    const totalSeen = Object.values(s.log).reduce((a, d) => a + d.seen, 0);
    const remaining = POOL.length - seen.size;
    let etaEl;
    if (days < 5) {
      etaEl = UI.el("div", { class: "stat" }, [
        UI.el("div", { class: "n", text: "—" }),
        UI.el("div", { class: "l", text: "to finish the pool" }),
        UI.el("div", { class: "sub", text: "Not enough data yet — under 5 logged days." })
      ]);
    } else {
      const perDay = totalSeen / days;
      const etaDays = perDay > 0 ? Math.ceil(remaining / perDay) : null;
      etaEl = UI.el("div", { class: "stat" }, [
        UI.el("div", { class: "n", text: (etaDays === null ? "—" : "~" + etaDays + "d"), style: "color:var(--est)" }),
        UI.el("div", {}, [UI.el("span", { text: "to finish the pool " }), UI.el("span", { class: "est", text: "estimated" })]),
        UI.el("div", { class: "sub" }, ["At your logged rate of ", UI.el("span", { class: "mono", text: perDay.toFixed(1) }),
          "/day over ", UI.el("span", { class: "mono", text: String(days) }), " days."])
      ]);
    }
    const droppedStat = UI.el("div", { class: "stat" }, [
      UI.el("div", { class: "n", text: String(DATA_META.dropped_no_citation || 0) }),
      UI.el("div", { class: "l", text: "AWL words dropped, no citation" }),
      UI.el("div", { class: "sub", text: "Of " + DATA_META.awl_total + " AWL families — Wiktionary carries no usable quotation for the rest, so they do not ship." })
    ]);
    const statgrid = UI.el("div", { class: "statgrid" });
    [heldStat, rungStat, etaEl, droppedStat].forEach((n) => statgrid.appendChild(n));
    side.appendChild(statgrid);
    homeGrid.appendChild(side);
    app.appendChild(homeGrid);
    root.appendChild(app);

    if (DATA_META.is_fake_seed) {
      root.appendChild(UI.el("div", { class: "banner" }, [
        UI.el("div", {}, [
          UI.el("div", { class: "bt", text: "Running on 20 fake seed words" }),
          UI.el("div", { class: "bd", text: "build/build_data.py has not been run against the full kaikki dump yet. Every card here is placeholder content." })
        ])
      ]));
    }
    return root;
  }

  /* --- Cloze drill ----------------------------------------------------------- */

  function drillPool(kind) {
    const s = state();
    return POOL.filter((w) => Rung.list().indexOf(w.rung) <= s.profile.rungIndex);
  }

  function nextDue(ids) {
    const s = state();
    const today = Dates.today();
    const due = ids.filter((id) => !s.cards[id] || s.cards[id].dueKey <= today);
    const from = due.length ? due : ids;
    return from[Math.floor(Math.random() * from.length)];
  }

  // Session-only — never persisted. "Pull forward" is a one-tap escape from
  // the empty state, not a schedule change: the cards are still logged
  // against their real due dates, this only lets today's session draw from
  // the whole unlocked pool instead of showing nothing.
  let pulledForward = false;

  function emptyQueue(ids, forNextTime) {
    const root = UI.el("div", { class: "empty" }, [
      UI.el("div", { class: "empty-mark" }, [(() => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M20 6L9 17l-5-5");
        svg.appendChild(path);
        return svg;
      })()]),
      UI.el("div", { class: "big", text: "Queue clear" }),
      UI.el("div", { text: "All " + ids.length + " cards reviewed. " + forNextTime })
    ]);
    const pull = UI.el("button", { class: "btn", type: "button", text: "Pull forward " + Math.min(20, ids.length), style: "margin-top:16px" });
    pull.addEventListener("click", () => { pulledForward = true; Router.show(); });
    root.appendChild(pull);
    return root;
  }

  function renderVerdict(w, correct, kind) {
    const root = UI.el("div", { class: "verdict" });
    const head = UI.el("div", { class: "vhead" }, [
      UI.el("span", { class: "word", text: w.word }),
      UI.el("span", { class: "pos mono", text: w.pos }),
      tagChip(w.tags)
    ]);
    root.appendChild(head);
    root.appendChild(UI.el("p", { class: "gloss", text: w.gloss }));

    const roots = ROOTS.filter((r) => r.words.includes(w.word));
    if (roots.length) {
      const r = roots[0];
      const dl = UI.el("dl", { class: "fact" }, [
        UI.el("dt", { text: "Root" }),
        UI.el("dd", {}, [
          UI.el("b", { class: "root", text: r.root }), " " + r.meaning,
          UI.el("div", { class: "kin" }, r.words.filter((x) => x !== w.word).map((x) => UI.el("span", { text: x })))
        ])
      ]);
      root.appendChild(dl);
    }

    const cite = citation(w);
    if (cite) root.appendChild(UI.el("p", { class: "src", text: cite }));

    const actions = UI.el("div", { class: "actions" });
    const next = UI.el("button", { class: "btn primary", type: "button", text: "Next card" });
    const undo = UI.el("button", { class: "btn undo", type: "button", text: "Undo — restore prior schedule" });
    undo.addEventListener("click", () => {
      if (SRS.undo(kind + ":" + w.id)) { UI.toast("Restored"); Router.show(); }
    });
    actions.appendChild(next); actions.appendChild(undo);
    root.appendChild(actions);
    next.addEventListener("click", Router.show);
    return root;
  }

  function viewCloze() {
    const pool = drillPool();
    const root = UI.el("div");
    root.appendChild(UI.el("h1", { text: "Cloze" }));
    if (pool.length < 4) return root.appendChild(UI.el("div", { class: "empty" }, [UI.el("div", { class: "big", text: "Not enough words unlocked yet" })])), root;

    const clozeIds = pool.map((w) => "cloze:" + w.id);
    if (!pulledForward && SRS.dueCount(clozeIds) === 0) {
      return root.appendChild(emptyQueue(clozeIds, "Nothing else is due right now.")), root;
    }
    const id = nextDue(clozeIds);
    const w = byId[id.replace(/^cloze:/, "")];
    // A single early rung can be too thin in one part of speech to supply 3
    // distractors on its own (AWL sublist 1 has exactly one adverb) — found
    // by running this, not by reasoning about pool sizes. Distractors fall
    // back to the whole pool in that case; only the tested word itself has
    // to be one the current rung actually unlocked.
    let distractors = pick(pool.filter((x) => x.pos === w.pos), 3, w.id);
    if (distractors.length < 3) {
      distractors = pick(POOL.filter((x) => x.pos === w.pos), 3, w.id);
    }
    const shuffled = [w, ...distractors].sort(() => Math.random() - 0.5);

    const app = UI.el("div", { class: "app" });
    const drill = UI.el("div", { class: "drill" });
    const stage = UI.el("div", { class: "stage" });
    stage.appendChild(UI.el("div", { class: "prompt", text: "Which word completes the sentence" }));
    const { frag, span } = blankSentence(w.quote, w.blank_start, w.blank_end, "", "");
    const spec = UI.el("p", { class: "specimen" });
    spec.appendChild(frag);
    stage.appendChild(spec);
    const srcEl = UI.el("p", { class: "src", style: "visibility:hidden" }, [citation(w) || ""]);
    stage.appendChild(srcEl);

    const timed = state().profile.examMode;
    const TIME_LIMIT = 20; // seconds — the exam is timed, this drill's own clock is not calibrated to it beyond that
    let timeLeft = TIME_LIMIT, timerHandle = null;

    const opts = UI.el("div", { class: "opts" });
    const letters = "ABCD";

    function answer(o, btn) {
      if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
      const correct = !!o && o.id === w.id;
      Array.from(opts.children).forEach((el, j) => {
        el.disabled = true;
        if (shuffled[j].id === w.id) { el.classList.add("correct"); if (correct) el.classList.add("pop"); }
        else if (el === btn) el.classList.add("wrong");
        else el.classList.add("dim");
      });
      span.textContent = (o && o.surface) || w.surface || w.word;
      span.classList.add(correct ? "filled" : "wrongfill");
      srcEl.style.visibility = "visible";
      const opened = Rung.record(correct);
      // Timed and untimed cloze are graded into the same SRS schedule (one
      // card, one interval) but logged under separate accuracy kinds, so a
      // rushed timed answer never quietly drags down the untimed number.
      SRS.grade("cloze:" + w.id, correct, timed ? "cloze_timed" : "cloze");
      stage.appendChild(renderVerdict(w, correct, timed ? "cloze_timed" : "cloze"));
      if (opened) UI.toast("Rung unlocked: " + Rung.current());
    }

    shuffled.forEach((o, i) => {
      const btn = UI.el("button", { class: "opt", type: "button" }, [
        UI.el("span", { class: "k mono", text: letters[i] }),
        UI.el("span", { class: "w", text: o.word })
      ]);
      btn.addEventListener("click", () => answer(o, btn));
      opts.appendChild(btn);
    });
    stage.appendChild(opts);
    drill.appendChild(stage);

    const rail = UI.el("div", { class: "rail" });
    const cur = Rung.progress();
    const c = SRS.card(id);
    rail.appendChild(chip("Due", String(SRS.dueCount(clozeIds))));
    rail.appendChild(chip("This card", UI.el("dd", {}, ["seen ", UI.el("span", { class: "mono", text: c.reps + "×" })])));
    const rungChip = UI.el("div", { class: "chip accent", style: "display:flex;align-items:center;gap:12px" }, [
      ringEl(cur.seen ? cur.seen / cur.need : 0, 48),
      UI.el("div", {}, [
        UI.el("dt", { text: "Rung" }),
        UI.el("dd", { text: cur.rungId }),
        UI.el("div", { style: "font-size:11.5px;color:var(--mute);margin-top:2px", text: "gate at " + Math.round(cur.threshold * 100) + "%" })
      ])
    ]);
    rail.appendChild(rungChip);
    const timingDD = UI.el("dd", { style: "color:var(--mute)", text: timed ? TIME_LIMIT + "s" : "untimed" });
    rail.appendChild(chip("Timing", timingDD));
    drill.appendChild(rail);

    if (timed) {
      timerHandle = setInterval(() => {
        timeLeft -= 1;
        timingDD.textContent = Math.max(0, timeLeft) + "s";
        if (timeLeft <= 0) answer(null, null);
      }, 1000);
      // Leaving the view mid-countdown (another tab clicked) must not leave
      // the interval running against DOM nodes the router just discarded.
      window.addEventListener("hashchange", function stop() {
        if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
        window.removeEventListener("hashchange", stop);
      });
    }
    app.appendChild(drill);
    root.appendChild(app);
    return root;
  }

  /* --- Recall drill (typed) --------------------------------------------------- */

  function viewRecall() {
    const pool = drillPool();
    const root = UI.el("div");
    root.appendChild(UI.el("h1", { text: "Recall" }));
    if (!pool.length) return root.appendChild(UI.el("div", { class: "empty" }, [UI.el("div", { class: "big", text: "Nothing unlocked yet" })])), root;

    const ids = pool.map((w) => "recall:" + w.id);
    const id = nextDue(ids);
    const w = byId[id.replace(/^recall:/, "")];

    const app = UI.el("div", { class: "app" });
    const drill = UI.el("div", { class: "drill" });
    const stage = UI.el("div", { class: "stage" });
    stage.appendChild(UI.el("div", { class: "prompt", text: "Type the word" }));
    stage.appendChild(UI.el("p", { class: "gloss", style: "font-size:16px;color:var(--ink);max-width:56ch", text: w.gloss }));
    const { frag } = blankSentence(w.quote, w.blank_start, w.blank_end, "", "");
    const spec = UI.el("p", { class: "specimen", style: "font-size:19px;margin-top:16px" });
    spec.appendChild(frag);
    stage.appendChild(spec);
    const cite = citation(w);
    if (cite) stage.appendChild(UI.el("p", { class: "src", text: cite }));

    const typed = UI.el("div", { class: "typed" });
    const given = w.word[0];
    typed.appendChild(UI.el("span", { class: "given mono", text: given }));
    const input = UI.el("input", { type: "text", placeholder: w.word.slice(1), autocomplete: "off", spellcheck: "false", "aria-label": "type the word" });
    typed.appendChild(input);
    stage.appendChild(typed);
    const helper = UI.el("p", { class: "helper", text: "First letter given. Enter or Submit to check." });
    stage.appendChild(helper);
    const actions = UI.el("div", { class: "actions", style: "margin-top:20px" });
    const go = UI.el("button", { class: "btn primary", type: "button", text: "Submit" });
    actions.appendChild(go);
    stage.appendChild(actions);

    function accepted(value) {
      const v = (given + value).trim().toLowerCase();
      const forms = [w.word.toLowerCase(), (w.surface || "").toLowerCase()];
      return forms.includes(v);
    }
    function submit() {
      if (go.disabled) return;
      const correct = accepted(input.value);
      go.disabled = true; input.disabled = true;
      // Only cloze drives the gate (DESIGN-fowler.html's cloze rail is the
      // one that shows rung/gate state) — recall and register keep their
      // own accuracy numbers per Part 0 but do not advance the ladder,
      // since neither is rung-filtered the way the cloze pool is.
      SRS.grade("recall:" + w.id, correct, "recall");
      helper.innerHTML = "";
      if (correct) {
        helper.appendChild(UI.el("b", { style: "color:var(--ok)", text: w.word }));
        helper.appendChild(document.createTextNode(" — correct."));
        typed.classList.add("pop");
      } else {
        helper.appendChild(document.createTextNode("The word is "));
        helper.appendChild(UI.el("b", { text: w.word }));
        helper.appendChild(document.createTextNode(". The card returns tomorrow."));
      }
      const next = UI.el("button", { class: "btn", type: "button", text: "Next card" });
      next.addEventListener("click", Router.show);
      actions.appendChild(next);
    }
    go.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    stage.appendChild(document.createComment("verdict on submit"));
    drill.appendChild(stage);

    const rail = UI.el("div", { class: "rail" });
    const cz = SRS.accuracy("cloze"), rc = SRS.accuracy("recall");
    rail.appendChild(chip("Recall accuracy", UI.el("dd", {}, [
      UI.el("span", { class: "big", style: "display:block", text: fmtPct(rc.pct) }),
      UI.el("span", { style: "color:var(--mute);font-size:12.5px", text: "over " + rc.seen + " answers" })
    ])));
    rail.appendChild(chip("Cloze accuracy", UI.el("dd", { class: "big", style: "color:var(--mute)", text: fmtPct(cz.pct) })));
    drill.appendChild(rail);
    app.appendChild(drill);
    root.appendChild(app);
    return root;
  }

  /* --- Register (cluster) drill --------------------------------------------- */

  function viewRegister() {
    const root = UI.el("div");
    root.appendChild(UI.el("h1", { text: "Register" }));
    if (!CLUSTERS.length) return root.appendChild(UI.el("div", { class: "empty" }, [
      UI.el("div", { class: "big", text: "No clusters survived the guard" }),
      UI.el("div", { text: "Every WordNet synset touching the pool was either all-neutral or all-marked." })
    ])), root;

    const c = CLUSTERS[Math.floor(Math.random() * CLUSTERS.length)];
    const options = [{ word: c.answer.word, tags: c.answer.tags, ok: true }]
      .concat(c.distractors.map((w) => ({ word: w, tags: [], ok: false })))
      .sort(() => Math.random() - 0.5);

    const app = UI.el("div", { class: "app" });
    const drill = UI.el("div", { class: "drill" });
    const stage = UI.el("div", { class: "stage" });
    stage.appendChild(UI.el("div", { class: "prompt", text: "One of these is marked. Which one stays out of academic prose" }));
    stage.appendChild(UI.el("p", { class: "gloss", style: "margin-bottom:8px", text: c.gloss }));

    const opts = UI.el("div", { class: "opts" });
    const letters = "ABCD";
    options.forEach((o, i) => {
      const btn = UI.el("button", { class: "opt", type: "button" }, [
        UI.el("span", { class: "k mono", text: letters[i] }),
        UI.el("span", { class: "w", text: o.word }),
        tagChip(o.tags)
      ]);
      btn.addEventListener("click", () => {
        const correct = o.ok;
        Array.from(opts.children).forEach((el, j) => {
          el.disabled = true;
          if (options[j].ok) { el.classList.add("correct"); if (correct) el.classList.add("pop"); }
          else if (el === btn) el.classList.add("wrong");
          else el.classList.add("dim");
        });
        // Only cloze drives the gate — see the note in the recall drill.
        const cardId = "register:" + c.synset;
        SRS.grade(cardId, correct, "register");
        const verdict = UI.el("div", { class: "verdict" });
        verdict.appendChild(UI.el("div", { class: "vhead" }, [
          UI.el("span", { class: "word", text: c.answer.word }),
          tagChip(c.answer.tags)
        ]));
        verdict.appendChild(UI.el("p", { class: "gloss", text: "The other three carry no usage label. That does not make them formal — it makes them unmarked, and Wiktionary cannot tell the two apart." }));
        const actions = UI.el("div", { class: "actions" });
        const next = UI.el("button", { class: "btn primary", type: "button", text: "Next card" });
        next.addEventListener("click", Router.show);
        actions.appendChild(next);
        verdict.appendChild(actions);
        stage.appendChild(verdict);
      });
      opts.appendChild(btn);
    });
    stage.appendChild(opts);
    drill.appendChild(stage);

    const rail = UI.el("div", { class: "rail" });
    rail.appendChild(chip("Clusters", String(CLUSTERS.length)));
    rail.appendChild(chip("Guard", UI.el("dd", { style: "font-size:13.5px", text: "At least one marked candidate and three unmarked, or the question is not generated." })));
    rail.appendChild(chip("Axis", UI.el("dd", { style: "font-size:13.5px" }, ["neutral vs. marked", UI.el("br"), UI.el("span", { style: "color:var(--mute)", text: "not formal vs. informal" })])));
    drill.appendChild(rail);
    app.appendChild(drill);
    root.appendChild(app);
    return root;
  }

  /* --- Roots ------------------------------------------------------------------ */

  function viewRoots() {
    const root = UI.el("div");
    root.appendChild(UI.el("h1", { text: "Roots" }));
    root.appendChild(UI.el("p", { class: "lede", text: "Reference, not a drill. Each root lists the words from your own pool that contain it." }));
    if (!ROOTS.length) return root.appendChild(UI.el("div", { class: "empty" }, [UI.el("div", { class: "big", text: "No roots yet" })])), root;
    const grid = UI.el("div", { class: "roots" });
    ROOTS.forEach((r) => {
      grid.appendChild(UI.el("div", { class: "rootrow" }, [
        UI.el("div", { class: "r", text: r.root }),
        UI.el("div", { class: "m" }, [r.meaning + " · ", UI.el("span", { class: "mono", text: String(r.words.length) }), " words in pool"]),
        UI.el("div", { class: "kin" }, r.words.map((w) => UI.el("span", { text: w })))
      ]));
    });
    root.appendChild(grid);
    return root;
  }

  /* --- Progress ------------------------------------------------------------- */

  function viewProgress() {
    const root = UI.el("div");
    root.appendChild(UI.el("h1", { text: "Progress" }));
    root.appendChild(UI.el("p", { class: "lede", text: "None of these numbers are averaged together — a blended figure would mostly measure which drill you did most of." }));

    const app = UI.el("div", { class: "app", style: "padding:34px 34px 30px" });
    const grid = UI.el("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:44px" });

    const accCol = UI.el("div");
    accCol.appendChild(UI.el("div", { style: "margin-bottom:16px;font-size:14px;font-weight:600;color:var(--ink)", text: "Accuracy by drill" }));
    const bars1 = UI.el("div", { class: "bars" });
    const drillLabels = { cloze: "Cloze", recall: "Recall", register: "Register", cloze_timed: "Exam mode" };
    Object.keys(drillLabels).forEach((kind) => {
      const a = SRS.accuracy(kind);
      if (kind === "cloze_timed" && a.seen === 0) return; // never shown until timed mode is actually used
      const pct = a.pct === null ? 0 : Math.round(a.pct * 100);
      bars1.appendChild(UI.el("div", { class: "bar" }, [
        UI.el("span", { class: "t", text: drillLabels[kind] }),
        UI.el("span", { class: "track" }, [UI.el("span", { class: "fill" + (kind === "cloze_timed" ? " acc" : ""), style: "width:" + pct + "%" })]),
        UI.el("span", { class: "v", text: fmtPct(a.pct) })
      ]));
    });
    accCol.appendChild(bars1);
    grid.appendChild(accCol);

    const rungCol = UI.el("div");
    rungCol.appendChild(UI.el("div", { style: "margin-bottom:16px;font-size:14px;font-weight:600;color:var(--ink)", text: "Ladder" }));
    const bars2 = UI.el("div", { class: "bars" });
    const s = state();
    Rung.list().forEach((r, i) => {
      let label, pct;
      if (i < s.profile.rungIndex) { label = "held"; pct = 100; }
      else if (i === s.profile.rungIndex) {
        const cur = Rung.progress();
        pct = Math.min(100, Math.round((cur.seen / cur.need) * 100));
        label = fmtPct(cur.seen ? cur.right / cur.seen : null);
      } else { label = "locked"; pct = 0; }
      bars2.appendChild(UI.el("div", { class: "bar" }, [
        UI.el("span", { class: "t", text: r }),
        UI.el("span", { class: "track" }, [UI.el("span", { class: "fill" + (i === s.profile.rungIndex ? " acc" : ""), style: "width:" + pct + "%" })]),
        UI.el("span", { class: "v", text: label })
      ]));
    });
    rungCol.appendChild(bars2);
    grid.appendChild(rungCol);

    app.appendChild(grid);
    root.appendChild(app);
    return root;
  }

  /* --- Capture (second-class cards) ------------------------------------------ */

  function viewCapture() {
    const root = UI.el("div");
    root.appendChild(UI.el("h1", { text: "Capture" }));
    root.appendChild(UI.el("p", { class: "lede", text: "Word → meaning only, no vetted sentence behind it. Explicitly second-class: these never count toward the headline accuracy numbers." }));

    const form = UI.el("div", { class: "app", style: "padding:22px" });
    const wf = UI.el("div", { class: "field" }, [UI.el("label", { text: "Word" }), UI.el("input", { id: "cap-word", type: "text" })]);
    const mf = UI.el("div", { class: "field" }, [UI.el("label", { text: "Meaning" }), UI.el("input", { id: "cap-meaning", type: "text" })]);
    const addBtn = UI.el("button", { class: "btn primary", type: "button", text: "Add" });
    form.appendChild(wf); form.appendChild(mf); form.appendChild(addBtn);
    root.appendChild(form);

    const list = UI.el("div", { class: "app", style: "padding:0" });
    function renderList() {
      list.textContent = "";
      const entries = Object.entries(state().captured);
      if (!entries.length) { list.appendChild(UI.el("div", { style: "padding:22px" }, [UI.empty("Nothing captured yet")])); return; }
      const table = UI.el("table", { class: "data" });
      const thead = UI.el("tr", {}, [UI.el("th", { text: "Word" }), UI.el("th", { text: "Meaning" }), UI.el("th", { text: "Added" })]);
      table.appendChild(thead);
      entries.forEach(([w, rec]) => {
        table.appendChild(UI.el("tr", {}, [
          UI.el("td", { text: w }), UI.el("td", { text: rec.meaning }), UI.el("td", { text: rec.addedISO.slice(0, 10) })
        ]));
      });
      const wrap = UI.el("div", { class: "scroll-x", style: "padding:18px 22px" }, [table]);
      list.appendChild(wrap);
    }
    renderList();
    root.appendChild(list);

    addBtn.addEventListener("click", () => {
      const w = document.getElementById("cap-word").value.trim();
      const m = document.getElementById("cap-meaning").value.trim();
      if (!w || !m) { UI.toast("Both a word and a meaning are needed"); return; }
      state().captured[w] = { meaning: m, addedISO: new Date().toISOString() };
      Store.save();
      document.getElementById("cap-word").value = "";
      document.getElementById("cap-meaning").value = "";
      renderList();
      UI.toast("Captured " + w);
    });
    return root;
  }

  /* --- Settings ---------------------------------------------------------------- */

  function viewSettings() {
    const s = state();
    const root = UI.el("div");
    root.appendChild(UI.el("h1", { text: "Settings" }));

    const card = UI.el("div", { class: "app", style: "padding:24px" });

    const boundary = UI.el("div", { class: "field" }, [
      UI.el("label", { text: "Day boundary hour (0–6)" }),
      UI.el("input", { type: "number", min: "0", max: "6", value: String(s.profile.dayBoundaryHour) })
    ]);
    boundary.querySelector("input").addEventListener("change", (e) => {
      const v = Math.max(0, Math.min(6, Number(e.target.value) || 0));
      s.profile.dayBoundaryHour = v; Store.save(); UI.toast("Day boundary set to " + v + ":00");
    });
    card.appendChild(boundary);

    const exam = UI.el("div", { class: "field" }, [
      UI.el("label", {}, [
        UI.el("input", { type: "checkbox", id: "exam-toggle", checked: s.profile.examMode ? "checked" : null }),
        " Timed mode (tracked as its own accuracy number, never merged into untimed)"
      ])
    ]);
    exam.querySelector("input").addEventListener("change", (e) => {
      s.profile.examMode = e.target.checked; Store.save();
    });
    card.appendChild(exam);

    const row = UI.el("div", { class: "row", style: "margin-top:10px" });
    const backupBtn = UI.el("button", { class: "btn", type: "button", text: "Download backup (JSON)" });
    const csvBtn = UI.el("button", { class: "btn", type: "button", text: "Export schedule (CSV)" });
    row.appendChild(backupBtn); row.appendChild(csvBtn);
    card.appendChild(row);

    function download(filename, text, mime) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: mime }));
      a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    }
    backupBtn.addEventListener("click", () => download("fowler-backup-" + Dates.today() + ".json", Store.exportJSON(), "application/json"));
    csvBtn.addEventListener("click", () => download("fowler-schedule-" + Dates.today() + ".csv", Store.exportCSV(), "text/csv"));

    const importField = UI.el("div", { class: "field", style: "margin-top:18px" }, [
      UI.el("label", { text: "Restore from a backup file" }),
      UI.el("input", { type: "file", accept: "application/json" })
    ]);
    importField.querySelector("input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { Store.importJSON(reader.result); UI.toast("Restored"); Router.show(); }
        catch (err) { UI.toast("Could not read that file: " + err.message); }
      };
      reader.readAsText(file);
    });
    card.appendChild(importField);

    // Reset: inline typed confirmation rather than confirm(), per house rule —
    // a modal punishes a typo and freezes browser automation.
    const resetField = UI.el("div", { class: "field", style: "margin-top:18px" }, [
      UI.el("label", { text: 'Type RESET to erase all local progress' }),
      UI.el("input", { type: "text", id: "reset-confirm", placeholder: "RESET" })
    ]);
    const resetBtn = UI.el("button", { class: "btn", type: "button", text: "Erase everything", style: "border-color:var(--accent-line);color:var(--accent)" });
    resetField.appendChild(resetBtn);
    resetBtn.addEventListener("click", () => {
      if (document.getElementById("reset-confirm").value !== "RESET") { UI.toast('Type RESET first'); return; }
      Store.reset(); UI.toast("Progress erased"); Router.show();
    });
    card.appendChild(resetField);

    root.appendChild(card);

    const table = UI.el("table", { class: "data" });
    table.appendChild(UI.el("tr", {}, [UI.el("th", { text: "Number" }), UI.el("th", { text: "Solid" }), UI.el("th", { text: "Assumed" })]));
    [
      ["AWL sublist", "The word is in Coxhead's list — a fixed, published grouping.", "Sublist order is the source's, not a measure of your difficulty with any one word."],
      ["Zipf score", "wordfreq's own measurement of the word's corpus frequency.", "The corpus is web + subtitles + books + social — general rarity, not academic register (A4)."],
      ["Register tag", "Copied directly from a Wiktionary sense tag.", "Absence of a tag means neutral-or-formal, not verified-formal (A1) — Wiktionary cannot tell the two apart."],
      ["Root grouping", "The root spelling and meaning are hand-written.", "Which pool words belong to it is a substring match, not verified etymology (B4) — occasional false positives are possible."],
      ["Finish horizon", "Computed from your own logged rate.", "A straight-line extrapolation from too little history reads badly; under 5 logged days it is withheld rather than shown."]
    ].forEach(([n, solid, assumed]) => {
      table.appendChild(UI.el("tr", {}, [
        UI.el("td", { text: n }),
        UI.el("td", { style: "color:var(--body)", text: solid }),
        UI.el("td", { style: "color:var(--est)", text: assumed })
      ]));
    });
    root.appendChild(UI.el("h2", { text: "What's solid, what's assumed", style: "margin-top:28px" }));
    root.appendChild(UI.el("div", { class: "app scroll-x", style: "padding:6px 22px" }, [table]));

    return root;
  }

  Router.register("home", "Home", viewHome);
  Router.register("cloze", "Cloze", viewCloze);
  Router.register("recall", "Recall", viewRecall);
  Router.register("register", "Register", viewRegister);
  Router.register("roots", "Roots", viewRoots);
  Router.register("progress", "Progress", viewProgress);
  Router.register("capture", "Capture", viewCapture);
  Router.register("settings", "Settings", viewSettings);

  // The streak flame lives in the header, outside any one view's render, so
  // it has to refresh on every navigation rather than once at load.
  const _show = Router.show;
  Router.show = function () { _show(); updateHeaderStreak(); };
})();
