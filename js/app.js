(function () {
  "use strict";

  const state = {
    dataLanguage: null,
    mediaType: null,
    trialMode: null,
    trialCount: 5,
    trialsReady: false,
  };

  function goToTab(name) {
    const target = document.querySelector('.tab[data-tab="' + name + '"]');
    if (target) target.click();
  }

  // --- Top-level tab switching -------------------------------------------
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");

      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));
      document.getElementById("panel-" + tab.dataset.tab).classList.add("is-active");
    });
  });

  // --- Start Here intro screen --------------------------------------------
  const startIntro = document.getElementById("start-intro");
  const wizardEl = document.getElementById("wizard");
  const btnStartWizard = document.getElementById("btn-start-wizard");

  if (btnStartWizard) {
    btnStartWizard.addEventListener("click", () => {
      startIntro.hidden = true;
      wizardEl.hidden = false;
    });
  }

  // --- Choice-grid fields (single-select cards) ---------------------------
  document.querySelectorAll(".choice-grid").forEach((grid) => {
    const field = grid.dataset.field;
    grid.querySelectorAll(".choice-card").forEach((card) => {
      if (card.disabled) return;
      card.addEventListener("click", () => {
        grid.querySelectorAll(".choice-card").forEach((c) => c.classList.remove("is-selected"));
        card.classList.add("is-selected");
        state[field] = card.dataset.value;
        updateStepValidity(grid.closest(".step"));
      });
    });
  });

  // --- Free-text fields (textarea/input with data-field, outside choice-grids) ---
  document.querySelectorAll("textarea[data-field], input[data-field]").forEach((el) => {
    el.addEventListener("input", () => {
      state[el.dataset.field] = el.value.trim();
      updateStepValidity(el.closest(".step"));
    });
  });

  // --- Step 3: fill in the manual's worked-example prompt -------------------
  const btnUseExample = document.getElementById("btn-use-example-prompt");
  const staticExampleLabel = document.getElementById("prompt-example-static-label");
  const letterBtnGroup = document.getElementById("letter-btn-group");

  function updatePromptExampleUI() {
    if (!staticExampleLabel || !letterBtnGroup || !btnUseExample) return;
    const type = state.taskType || "pvf";
    if (type === "pvf") {
      btnUseExample.hidden = true;
      staticExampleLabel.hidden = false;
      letterBtnGroup.hidden = false;
      renderLetterButtons();
    } else {
      btnUseExample.hidden = false;
      staticExampleLabel.hidden = true;
      letterBtnGroup.hidden = true;
    }
  }

  function renderLetterButtons() {
    const lang = state.dataLanguage || "en";
    const letters = (VFT_DATA.letters && VFT_DATA.letters[lang]) || VFT_DATA.letters.en;
    letterBtnGroup.innerHTML = letters
      .map((l) => `<button type="button" class="letter-btn" data-letter="${l}">${l}</button>`)
      .join("");
    letterBtnGroup.querySelectorAll(".letter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        letterBtnGroup.querySelectorAll(".letter-btn").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        fillPvfExamplePrompt(btn.dataset.letter);
      });
    });
  }

  function fillPvfExamplePrompt(letter) {
    const lang = state.dataLanguage || "en";
    const entry = VFT_DATA.prompts[lang] && VFT_DATA.prompts[lang].pvf;
    if (!entry) return;
    const example = entry.base + "\n\n" + entry.letterLine(letter);
    const textarea = document.getElementById("prompt-textarea");
    textarea.value = example;
    state.taskPrompt = example;
    updateStepValidity(textarea.closest(".step"));
  }

  if (btnUseExample) {
    btnUseExample.addEventListener("click", () => {
      const lang = state.dataLanguage || "en";
      const entry = VFT_DATA.prompts[lang] && VFT_DATA.prompts[lang].svf;
      if (!entry) return;
      const textarea = document.getElementById("prompt-textarea");
      textarea.value = entry;
      state.taskPrompt = entry;
      updateStepValidity(textarea.closest(".step"));
    });
  }

  // --- Step 6: trial mode / trial count -------------------------------------
  const trialCountRow = document.getElementById("trial-count-row");
  const trialCountInput = document.getElementById("trial-count-input");
  const trialModeGrid = document.querySelector('.choice-grid[data-field="trialMode"]');

  function recomputeTrialsReady() {
    if (state.trialMode === "single") {
      state.trialsReady = true;
    } else if (state.trialMode === "multiple") {
      const n = Number(trialCountInput.value);
      const max = syntheticTrialCount();
      state.trialCount = n;
      state.trialsReady = Number.isInteger(n) && n >= 2 && n <= max;
    } else {
      state.trialsReady = false;
    }
    updateStepValidity(document.querySelector('.step[data-step="6"]'));
  }

  if (trialModeGrid) {
    trialModeGrid.querySelectorAll(".choice-card").forEach((card) => {
      card.addEventListener("click", () => {
        trialCountRow.hidden = card.dataset.value !== "multiple";
        recomputeTrialsReady();
      });
    });
  }

  if (trialCountInput) {
    trialCountInput.addEventListener("input", recomputeTrialsReady);
  }

  // --- Step 7: dropzone, example loader, calculate, review, results --------
  const dropzone = document.getElementById("dropzone");
  const dropzoneText = document.getElementById("dropzone-text");
  const fileInput = document.getElementById("file-input");
  const btnLoadExampleData = document.getElementById("btn-load-example-data");
  const btnCalculate = document.getElementById("btn-calculate");
  const btnEditInputs = document.getElementById("btn-edit-inputs");
  const btnReviewBack = document.getElementById("btn-review-back");
  const btnContinueToResults = document.getElementById("btn-continue-to-results");
  const step7Input = document.getElementById("step7-input");
  const step7Review = document.getElementById("step7-review");
  const step7Results = document.getElementById("step7-results");
  // Resolutions for ambiguous cases in the rule-based (phonemic) reading.
  // Semantic ambiguity is no longer resolved this way — the rater scores the
  // semantic reading themselves in step 8 — so in practice this stays empty.
  let reviewResolutions = {};

  let hasData = false;

  function setDropzoneLoaded(label) {
    hasData = true;
    dropzone.classList.add("has-file");
    dropzoneText.textContent = label;
    btnCalculate.disabled = false;
  }

  if (dropzone && fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        setDropzoneLoaded("Loaded: " + fileInput.files[0].name);
      }
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("is-dragover");
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) setDropzoneLoaded("Loaded: " + file.name);
    });
  }

  if (btnLoadExampleData) {
    btnLoadExampleData.addEventListener("click", () => {
      const type = state.taskType || "pvf";
      if (usingSyntheticBatch()) {
        setDropzoneLoaded("Loaded synthetic demo batch: " + syntheticTrialCount() + " trials");
      } else {
        const filename = type === "pvf" ? "phonemic_letter-K_example.txt" : "semantic_animals_example.txt";
        setDropzoneLoaded("Loaded the manual's example transcript: " + filename);
      }
    });
  }

  // --- The scoring loop -----------------------------------------------------
  // Steps 1-6 configure the study and run once. The batch is imported once in
  // step 7. Scoring then loops per trial: score -> that trial's results ->
  // next trial. After the last trial the flow ends at the group results,
  // which is where the download lives.
  const batch = {
    count: 1,
    current: 0,
    scored: [], // scored[i] = that trial's cluster ranges, once scored
  };

  // Bring the top of the wizard into view after switching screens, so the
  // next action is visible instead of wherever the last click left the page.
  // The button just clicked is blurred first — a focused element that then
  // gets hidden can make the browser restore its own scroll position — and
  // the scroll is applied after layout has settled.
  function scrollToWizardTop() {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    const apply = () => {
      const wizard = document.getElementById("wizard");
      if (!wizard) return;
      const top = wizard.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(top, 0));
    };
    apply();
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(apply);
  }

  function showScoringScreen() {
    renderReviewStep();
    step7Input.hidden = true;
    step7Review.hidden = false;
    step7Results.hidden = true;
    scrollToWizardTop();
  }

  function showTrialResults() {
    renderResults();
    step7Input.hidden = true;
    step7Review.hidden = true;
    step7Results.hidden = false;
    scrollToWizardTop();
  }

  if (btnCalculate) {
    btnCalculate.addEventListener("click", () => {
      if (!hasData) return;
      batch.count = state.trialMode === "multiple" ? Math.min(state.trialCount, syntheticTrialCount()) : 1;
      batch.current = 0;
      batch.scored = [];
      showScoringScreen();
    });
  }

  if (btnReviewBack) {
    btnReviewBack.addEventListener("click", () => {
      // From the first trial, back means the import step; otherwise it means
      // the previous trial's results, so a rater can revise what they scored.
      if (batch.current === 0) {
        step7Review.hidden = true;
        step7Input.hidden = false;
      } else {
        batch.current -= 1;
        showTrialResults();
      }
    });
  }

  if (btnContinueToResults) {
    btnContinueToResults.addEventListener("click", () => {
      if (btnContinueToResults.disabled) return;
      batch.scored[batch.current] = manualClusters.map((c) => ({ s: c.s, e: c.e }));
      showTrialResults();
    });
  }

  // "Back to scoring" — revise the trial currently on screen.
  if (btnEditInputs) {
    btnEditInputs.addEventListener("click", showScoringScreen);
  }

  function advanceTrial() {
    if (batch.current < batch.count - 1) {
      batch.current += 1;
      showScoringScreen();
    } else {
      renderGroupResults();
      goToTab("results");
    }
  }

  ["btn-next-trial", "btn-next-trial-top"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", advanceTrial);
  });

  // --- Step 8: manual semantic clustering -----------------------------------
  // Semantic clustering is scored by the rater, not by the tool. The rater
  // drags across adjacent words to define each cluster; because clusters are
  // always contiguous runs, this cannot produce an invalid scoring (no
  // overlaps, no gaps, every word accounted for).
  //
  // Which reading this applies to depends on the task type: in a phonemic
  // trial the semantic reading is the task-discrepant one, in a semantic
  // trial it is the task-congruent one. Either way there is exactly one
  // manual pass per trial; the phonemic reading stays rule-based.

  // The rater's clusters, as {s, e} index ranges into the trial's `words`.
  let manualClusters = [];
  let manualDrag = null;

  const semanticTxEl = document.getElementById("semantic-tx");
  const semanticLiveEl = document.getElementById("semantic-live");
  const semanticLabelEl = document.getElementById("semantic-reading-label");
  const trialProgressScoringEl = document.getElementById("trial-progress-scoring");
  const cheatsheetListEl = document.getElementById("cheatsheet-list");
  const btnSemanticClear = document.getElementById("btn-semantic-clear");

  function semanticIsCongruent(type) {
    return type === "svf";
  }

  function currentTrial() {
    return activeTrial();
  }

  function clusterIndexAt(i) {
    for (let k = 0; k < manualClusters.length; k++) {
      if (i >= manualClusters[k].s && i <= manualClusters[k].e) return k;
    }
    return -1;
  }

  function addManualCluster(s, e) {
    // A new selection absorbs any cluster it touches, so ranges stay disjoint.
    manualClusters = manualClusters.filter((c) => c.e < s || c.s > e);
    manualClusters.push({ s, e });
    manualClusters.sort((a, b) => a.s - b.s);
  }

  // Turns the rater's ranges into the same shape the results renderer expects
  // from a rule-based reading, deriving the metrics from the runs.
  function buildManualReading(trial, ranges) {
    const errorIdx = trial.errorIndices || [];
    const covered = new Set();

    const clusters = ranges
      .slice()
      .sort((a, b) => a.s - b.s)
      .map((rg) => {
        const words = [];
        const errorFlags = [];
        for (let i = rg.s; i <= rg.e; i++) {
          covered.add(i);
          words.push(trial.words[i]);
          errorFlags.push(errorIdx.indexOf(i) !== -1);
        }
        return {
          pos: rg.s,
          words,
          errorFlags,
          rule: "Semantic cluster — manually scored",
          reviewStatus: "manual",
        };
      });

    const nonClustering = [];
    trial.words.forEach((w, i) => {
      if (!covered.has(i)) nonClustering.push({ pos: i, word: w, reviewStatus: "manual" });
    });

    const rows = [
      ...clusters.map((c) => ({ kind: "cluster", pos: c.pos, ...c })),
      ...nonClustering.map((n) => ({ kind: "single", pos: n.pos, word: n.word, reviewStatus: "manual" })),
    ].sort((a, b) => a.pos - b.pos);

    const inClusters = clusters.reduce((a, c) => a + c.words.length, 0);
    const meanClusterSize = clusters.length ? Math.round((inClusters / clusters.length) * 10) / 10 : 0;
    // A switch is any transition between words not in the same cluster,
    // single-word transitions included — i.e. one less than the number of runs.
    const switches = Math.max(clusters.length + nonClustering.length - 1, 0);

    return { clusters, nonClustering, rows, meanClusterSize, switches, count: clusters.length };
  }

  function renderSemanticTranscript() {
    const trial = currentTrial();
    if (!trial || !semanticTxEl) return;
    const errorIdx = trial.errorIndices || [];

    const dragLo = manualDrag ? Math.min(manualDrag.anchor, manualDrag.cur) : -1;
    const dragHi = manualDrag ? Math.max(manualDrag.anchor, manualDrag.cur) : -2;

    semanticTxEl.innerHTML = "";
    trial.words.forEach((w, i) => {
      const ci = clusterIndexAt(i);
      const chip = document.createElement("span");
      const cls = ["semantic-word"];

      if (i >= dragLo && i <= dragHi) {
        cls.push("in-drag");
      } else if (ci !== -1) {
        cls.push("in-cluster");
        const c = manualClusters[ci];
        if (i === c.s) cls.push("at-start");
        else if (i === c.e) cls.push("at-end");
        else cls.push("at-mid");
      }

      chip.className = cls.join(" ");
      chip.dataset.i = i;
      chip.innerHTML = w + (errorIdx.indexOf(i) !== -1 ? ' <span class="err">(error)</span>' : "");
      semanticTxEl.appendChild(chip);

      if (i < trial.words.length - 1) {
        const sep = document.createElement("span");
        const sameCluster = ci !== -1 && ci === clusterIndexAt(i + 1);
        sep.className = "semantic-sep" + (sameCluster ? " inside" : "");
        semanticTxEl.appendChild(sep);
      }
    });
  }

  function renderSemanticLive() {
    const trial = currentTrial();
    if (!trial || !semanticLiveEl) return;
    const reading = buildManualReading(trial, manualClusters);
    semanticLiveEl.innerHTML = reading.clusters.length
      ? `<strong>${reading.clusters.length}</strong> clusters · mean size <strong>${reading.meanClusterSize.toFixed(1)}</strong> · <strong>${reading.switches}</strong> switches · <strong>${reading.nonClustering.length}</strong> non-clustering words`
      : "Nothing grouped yet — every word currently counts as a non-clustering single word.";
  }

  function refreshSemanticStep() {
    renderSemanticTranscript();
    renderSemanticLive();
  }

  function renderReviewStep() {
    const type = state.taskType || "pvf";
    // Reload whatever this trial was scored as before, so going back to a
    // trial shows the rater's own work rather than a blank slate.
    const saved = batch.scored[batch.current];
    manualClusters = saved ? saved.map((c) => ({ s: c.s, e: c.e })) : [];
    manualDrag = null;

    renderProvenance(document.getElementById("provenance-scoring"), currentProvenance());

    const isBatch = batch.count > 1;
    const continueLabel = document.getElementById("continue-to-results-label");
    if (continueLabel) {
      continueLabel.textContent = isBatch ? "See this trial's results" : "Continue to results";
    }
    const scoringCount = document.getElementById("scoring-step-count");
    if (scoringCount) {
      scoringCount.textContent = isBatch ? "Trial " + (batch.current + 1) + " of " + batch.count : "Step 7 of 7";
    }

    if (trialProgressScoringEl) {
      trialProgressScoringEl.hidden = batch.count < 2;
      trialProgressScoringEl.textContent = "Trial " + (batch.current + 1) + " of " + batch.count;
    }

    if (semanticLabelEl) {
      semanticLabelEl.textContent = semanticIsCongruent(type)
        ? "Semantic clustering — task-congruent"
        : "Semantic clustering — task-discrepant, within a phonemic trial";
    }

    if (cheatsheetListEl && !cheatsheetListEl.childElementCount) {
      cheatsheetListEl.innerHTML = (VFT_DATA.semanticRules || [])
        .map((r) => `<li><span class="cheatsheet-rule">${r.n}</span><strong>${r.t}.</strong> ${r.d}</li>`)
        .join("");
    }

    // The rater may legitimately find no clusters at all, so continuing is
    // never blocked.
    btnContinueToResults.disabled = false;
    refreshSemanticStep();
  }

  if (semanticTxEl) {
    semanticTxEl.addEventListener("mousedown", (e) => {
      const chip = e.target.closest(".semantic-word");
      if (!chip) return;
      e.preventDefault();
      manualDrag = { anchor: +chip.dataset.i, cur: +chip.dataset.i };
      renderSemanticTranscript();
    });

    semanticTxEl.addEventListener("mouseover", (e) => {
      if (!manualDrag) return;
      const chip = e.target.closest(".semantic-word");
      if (!chip) return;
      manualDrag.cur = +chip.dataset.i;
      renderSemanticTranscript();
    });

    document.addEventListener("mouseup", () => {
      if (!manualDrag) return;
      const lo = Math.min(manualDrag.anchor, manualDrag.cur);
      const hi = Math.max(manualDrag.anchor, manualDrag.cur);
      if (hi > lo) {
        addManualCluster(lo, hi);
      } else {
        // A plain click dissolves the cluster under it.
        const ci = clusterIndexAt(lo);
        if (ci !== -1) manualClusters.splice(ci, 1);
      }
      manualDrag = null;
      refreshSemanticStep();
    });
  }

  if (btnSemanticClear) {
    btnSemanticClear.addEventListener("click", () => {
      manualClusters = [];
      refreshSemanticStep();
    });
  }

  // Manually scored clusters carry `errorFlags` aligned to `words`, which is
  // exact even when the same word occurs twice in one cluster. Rule-based
  // clusters from the manual's worked examples still match by word.
  // True for anything a human decided: a resolved ambiguous case, or a row
  // from the manually scored semantic reading.
  function isHumanScored(row) {
    return row.reviewStatus === "reviewed" || row.reviewStatus === "manual";
  }

  function isErrorWord(row, word, wordIndex) {
    if (row.errorFlags) return !!row.errorFlags[wordIndex];
    return !!(row.errorWords && row.errorWords.indexOf(word) !== -1);
  }

  // The error words in a cluster row, whichever of the two shapes it carries.
  function errorWordsOf(row) {
    if (!row.words) return [];
    return row.words.filter((w, i) => isErrorWord(row, w, i));
  }

  // --- Which trial is being scored, and where its data comes from ----------
  // Two entirely separate sources, never mixed:
  //   single trial -> VFT_DATA.results, transcribed from the published manual
  //   batch        -> VFT_DATA.illustrativeBatch, synthetic demo data
  // Only semantic trials have a synthetic batch; see step 6.
  function syntheticSet() {
    const lang = state.dataLanguage || "fi";
    const byLang = VFT_DATA.illustrativeBatch && VFT_DATA.illustrativeBatch[lang];
    return (byLang && byLang[state.taskType]) || null;
  }

  function usingSyntheticBatch() {
    return state.trialMode === "multiple" && !!syntheticSet();
  }

  function syntheticTrialCount() {
    const set = syntheticSet();
    return set ? set.length : 0;
  }

  // The phonemic reading is deterministic, so it is computed rather than
  // stored: three or more consecutive words sharing an initial phoneme form a
  // cluster (the manual's special rule for semantic fluency), and exactly two
  // consecutive words cluster when they share the same opening. Verified to
  // reproduce Appendix A's published task-discrepant reading for the worked
  // example exactly.
  function buildPhonemicReading(words, errorIndices) {
    const errorIdx = errorIndices || [];
    const clusters = [];
    const nonClustering = [];
    let i = 0;

    while (i < words.length) {
      let j = i;
      while (j + 1 < words.length && words[j + 1][0].toLowerCase() === words[i][0].toLowerCase()) j++;
      const len = j - i + 1;
      const opening = words[i].slice(0, 2).toLowerCase();
      const isCluster = len >= 3 || (len === 2 && words[i + 1].slice(0, 2).toLowerCase() === opening);

      if (isCluster) {
        const slice = words.slice(i, j + 1);
        clusters.push({
          pos: i,
          words: slice,
          errorFlags: slice.map((w, k) => errorIdx.indexOf(i + k) !== -1),
          rule:
            len >= 3
              ? "1.1 Word-initial phonemes — three or more consecutive words sharing an initial phoneme (special rule for semantic fluency)"
              : "1.1 Word-initial phonemes (shared " + opening + "-)",
        });
      } else {
        for (let k = i; k <= j; k++) nonClustering.push({ pos: k, word: words[k] });
      }
      i = j + 1;
    }

    const inClusters = clusters.reduce((a, c) => a + c.words.length, 0);
    return {
      clusters: clusters,
      nonClusteringWords: nonClustering,
      ambiguousCases: [],
      count: clusters.length,
      meanClusterSize: clusters.length ? Math.round((inClusters / clusters.length) * 10) / 10 : 0,
    };
  }

  function syntheticTrial(index) {
    const src = syntheticSet()[index];
    return {
      trialLabel: "Semantic (SVF) — category Animals",
      synthetic: true,
      words: src.words,
      errorIndices: src.errorIndices,
      errors: src.errorIndices.map((idx) => ({
        word: src.words[idx],
        type: "Repetition — non-sequential",
        note: 'Scored 0 for total score, but counted in its cluster (see "' + src.words[idx] + ' (error)" below).',
      })),
      totalScore: src.totalScore,
      // The semantic (task-congruent) reading comes from the rater, so there
      // is no rule-based reading to seed here.
      clusters: [],
      nonClusteringWords: [],
      ambiguousCases: [],
      meanClusterSize: 0,
      switches: 0,
      taskDiscrepant: buildPhonemicReading(src.words, src.errorIndices),
    };
  }

  function activeTrial() {
    if (usingSyntheticBatch()) return syntheticTrial(batch.current);
    return VFT_DATA.results[state.taskType || "pvf"];
  }

  // Merges a rule-based reading's clusters with the human's resolved choice
  // for any flagged case in that same reading. If a case has no resolution,
  // its first listed option stands in, tagged "flagged" rather than
  // "reviewed". Used for whichever reading is the phonemic one — the semantic
  // reading is scored by hand in step 8 instead.
  function resolveClusterReading(base, resolutions) {
    const cases = base.ambiguousCases || [];
    const clusters = base.clusters.map((c) => ({ ...c }));
    const nonClustering = base.nonClusteringWords.map((n) => ({ ...n }));
    let meanClusterSize = base.meanClusterSize;
    let switches = base.switches;
    let count = base.count;

    cases.forEach((c) => {
      const chosenId = resolutions[c.id];
      const opt = c.options.find((o) => o.id === chosenId) || c.options[0];
      const reviewStatus = chosenId ? "reviewed" : "flagged";
      clusters.push({
        pos: opt.clusterEntry.pos,
        words: opt.clusterEntry.words,
        rule: opt.clusterEntry.rule,
        reviewStatus,
      });
      (opt.extraNonClustering || []).forEach((n) => nonClustering.push({ ...n, reviewStatus }));
      if (opt.meanClusterSize !== undefined) meanClusterSize = opt.meanClusterSize;
      if (opt.switches !== undefined) switches = opt.switches;
      if (opt.count !== undefined) count = opt.count;
    });

    // Merge clusters + non-clustering singles into one row list, ordered by
    // where each first occurred in the participant's actual response.
    const rows = [
      ...clusters.map((c) => ({ kind: "cluster", pos: c.pos, ...c })),
      ...nonClustering.map((n) => ({ kind: "single", pos: n.pos, word: n.word, reviewStatus: n.reviewStatus })),
    ].sort((a, b) => a.pos - b.pos);

    return { clusters, nonClustering, rows, meanClusterSize, switches, count };
  }

  // `manualRanges`, when given, replaces whichever reading is the semantic one
  // for this task type with the rater's own scoring. The other reading stays
  // rule-based.
  function getResolvedResult(trial, type, resolutions, manualRanges) {
    const r = trial;
    if (!r) return null;

    let congruent, discrepant;
    if (manualRanges) {
      const manual = buildManualReading(r, manualRanges);
      if (semanticIsCongruent(type)) {
        congruent = manual;
        discrepant = r.taskDiscrepant ? resolveClusterReading(r.taskDiscrepant, resolutions) : null;
      } else {
        congruent = resolveClusterReading(r, resolutions);
        discrepant = manual;
      }
    } else {
      congruent = resolveClusterReading(r, resolutions);
      discrepant = r.taskDiscrepant ? resolveClusterReading(r.taskDiscrepant, resolutions) : null;
    }

    return { ...r, ...congruent, taskDiscrepant: discrepant, semanticIsCongruent: semanticIsCongruent(type) };
  }

  // Cluster-row rendering, shared by the per-trial results block and the
  // per-trial detail rows in the group view.

  // Manually scored clusters carry no per-row badge — the whole reading is
  // the rater's work, so it is stated once on the table instead.
  function reviewBadge(status) {
    if (status === "reviewed") {
      return '<span class="cluster-review-badge is-reviewed" title="Resolved by a human reviewer in the review step">Manually reviewed</span>';
    }
    if (status === "flagged") {
      return '<span class="cluster-review-badge is-flagged" title="The manual lists more than one valid reading for this cluster">Flagged for review</span>';
    }
    return "";
  }

  function renderClusterRows(rows) {
    return rows
      .map((row) => {
        if (row.kind === "single") {
          return `
            <tr class="cluster-row-single">
              <td class="cluster-words">${row.word}${reviewBadge(row.reviewStatus)}</td>
              <td><span class="cluster-size-badge is-single">—</span></td>
              <td>Non-clustering single word</td>
            </tr>
          `;
        }
        const wordList = row.words.map((w, wi) => (isErrorWord(row, w, wi) ? w + " (error)" : w)).join(", ");
        return `
          <tr>
            <td class="cluster-words">${wordList}${reviewBadge(row.reviewStatus)}</td>
            <td><span class="cluster-size-badge">${row.words.length}</span></td>
            <td>${row.rule}</td>
          </tr>
        `;
      })
      .join("");
  }

  const MANUAL_SCORED_NOTE = "Semantic clustering — scored manually by the rater.";

  // Renders one trial's results into a set of target elements. Group-level
  // aggregation is a separate view, so this is always a single trial.
  function renderResultsInto(els, opts) {
    const type = opts.type || "pvf";
    const r = getResolvedResult(opts.trial, type, opts.resolutions || {}, opts.manualRanges);
    if (!r) return;

    els.badge.textContent = opts.badgeText || r.trialLabel;

    const hasAudio = !!opts.hasAudio;
    const stats = [
      { value: r.totalScore, label: "Total score" },
      { value: r.errors.length, label: "Errors" },
      { value: hasAudio ? "—" : "N/A", label: "Temporal parameters", unavailable: !hasAudio },
      // Always one decimal, so it reads the same here as on the scoring screen.
      { value: Number(r.meanClusterSize).toFixed(1), label: type === "pvf" ? "Mean phonemic cluster size" : "Mean semantic cluster size" },
      { value: r.switches, label: "Number of switches" },
      { value: r.taskDiscrepant ? r.taskDiscrepant.count : "N/A", label: "Task discrepant clusters" },
    ];
    els.statGrid.innerHTML = stats
      .map(
        (s) => `
          <div class="stat-tile${s.unavailable ? " is-unavailable" : ""}">
            <span class="stat-value">${s.value}</span>
            <span class="stat-label">${s.label}</span>
          </div>
        `
      )
      .join("");

    els.clusterBody.innerHTML = renderClusterRows(r.rows);
    if (els.discrepantBody && r.taskDiscrepant) {
      els.discrepantBody.innerHTML = renderClusterRows(r.taskDiscrepant.rows);
    }

    if (els.clusterManualNote) {
      els.clusterManualNote.textContent = r.semanticIsCongruent ? MANUAL_SCORED_NOTE : "";
      els.clusterManualNote.hidden = !r.semanticIsCongruent;
    }
    if (els.discrepantManualNote) {
      els.discrepantManualNote.textContent = r.semanticIsCongruent ? "" : MANUAL_SCORED_NOTE;
      els.discrepantManualNote.hidden = !!r.semanticIsCongruent;
    }

    els.errorList.innerHTML = r.errors.map((e) => `<li><strong>${e.word}</strong> — ${e.type}. ${e.note}</li>`).join("");
    if (els.errorsHeading) {
      els.errorsHeading.hidden = r.errors.length === 0;
    }
    els.errorList.hidden = r.errors.length === 0;
  }

  // --- Step 7 results (wizard-driven) ---------------------------------------
  const step7Els = {
    badge: document.getElementById("results-trial-badge"),
    statGrid: document.getElementById("stat-grid"),
    clusterHeading: document.querySelector('[data-i18n="step7.clusterBreakdown"]'),
    errorsHeading: document.querySelector('[data-i18n="step7.errorsHeading"]'),
    clusterBody: document.getElementById("cluster-table-body"),
    discrepantHeading: document.getElementById("discrepant-heading"),
    discrepantBody: document.getElementById("discrepant-table-body"),
    errorList: document.getElementById("error-list"),
    errorsHeading: document.getElementById("errors-heading"),
    clusterManualNote: document.getElementById("cluster-manual-note"),
    discrepantManualNote: document.getElementById("discrepant-manual-note"),
  };

  function renderResults() {
    const type = state.taskType || "pvf";
    const isLast = batch.current >= batch.count - 1;
    const ranges = batch.scored[batch.current] || [];

    const trial = activeTrial();
    renderResultsInto(step7Els, {
      trial: trial,
      type: type,
      hasAudio: state.mediaType === "voice",
      resolutions: reviewResolutions,
      manualRanges: ranges,
      badgeText:
        batch.count > 1
          ? "Trial " + (batch.current + 1) + " of " + batch.count + " · " + trial.trialLabel
          : trial.trialLabel,
    });

    renderProvenance(document.getElementById("provenance-results"), currentProvenance());

    const progress = document.getElementById("trial-progress-results");
    if (progress) {
      progress.textContent = batch.count > 1 ? "Trial " + (batch.current + 1) + " of " + batch.count : "";
    }

    const label = isLast ? "View group results" : "Next trial";
    ["next-trial-label", "next-trial-label-top"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = label;
    });

    const nav = document.getElementById("trial-nav");
    const navLabel = document.getElementById("trial-nav-label");
    if (nav) nav.hidden = batch.count < 2;
    if (navLabel) {
      navLabel.textContent = "Trial " + (batch.current + 1) + " of " + batch.count + " scored";
    }

    const note = document.getElementById("trial-results-note");
    if (note) {
      note.textContent = isLast
        ? "This is the last trial in the batch. Group-level statistics and the download are on the next screen."
        : "Scoring for this trial is saved. The download is available once every trial in the batch has been scored.";
    }
  }

  // --- Step 7: download results as CSV or JSON ------------------------------
  // TODO(open question, flagged 2026): the exact downloadable-report shape
  // (CSV vs JSON structure, what a "report" even means for this tool — raw
  // per-trial data vs. a formatted summary) is still undefined. Revisit
  // whether this is needed at all before building further on it.
  // The instruction the researcher actually gave the participant, captured in
  // step 3 and carried into the export for traceability. `trialLabel` is a
  // short descriptor of the trial and is exported separately.
  function promptText() {
    return state.taskPrompt || "";
  }

  function csvEscape(value) {
    const str = String(value);
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function buildResultsCSV() {
    const type = state.taskType || "pvf";
    const r = getResolvedResult(activeTrial(), type, reviewResolutions, manualClusters);
    const header = [
      "trial_id",
      "task_type",
      "trial_label",
      "prompt",
      "total_score",
      "errors_count",
      "mean_cluster_size",
      "number_of_switches",
      "task_discrepant_cluster_count",
      "reading",
      "cluster_index",
      "cluster_words",
      "cluster_size",
      "cluster_rule",
      "human_reviewed",
    ];
    const lines = [header.join(",")];

    function addRows(rows, reading) {
      rows.forEach((row, i) => {
        const isSingle = row.kind === "single";
        const wordsText = isSingle
          ? row.word
          : row.words.map((w, wi) => (isErrorWord(row, w, wi) ? w + " (error)" : w)).join("; ");
        lines.push(
          [
            1,
            type.toUpperCase(),
            csvEscape(r.trialLabel),
            csvEscape(promptText()),
            r.totalScore,
            r.errors.length,
            Number(r.meanClusterSize).toFixed(1),
            r.switches,
            r.taskDiscrepant ? r.taskDiscrepant.count : "",
            reading,
            i + 1,
            csvEscape(wordsText),
            isSingle ? "" : row.words.length,
            isSingle ? "Non-clustering single word" : csvEscape(row.rule),
            isHumanScored(row) ? "TRUE" : "FALSE",
          ].join(",")
        );
      });
    }

    addRows(r.rows, "task_congruent");
    if (r.taskDiscrepant) addRows(r.taskDiscrepant.rows, "task_discrepant");

    return lines.join("\n");
  }

  function buildResultsJSON() {
    const type = state.taskType || "pvf";
    const r = getResolvedResult(activeTrial(), type, reviewResolutions, manualClusters);

    function toSequence(rows) {
      return rows.map((row) =>
        row.kind === "single"
          ? { type: "non_clustering_single_word", word: row.word, human_reviewed: isHumanScored(row) }
          : {
              type: "cluster",
              words: row.words,
              error_word: errorWordsOf(row)[0] || null,
              rule: row.rule,
              human_reviewed: isHumanScored(row),
            }
      );
    }

    return JSON.stringify(
      {
        trial_id: 1,
        task_type: type,
        trial_label: r.trialLabel,
        prompt: promptText(),
        total_score: r.totalScore,
        errors: r.errors,
        mean_cluster_size: Number(Number(r.meanClusterSize).toFixed(1)),
        number_of_switches: r.switches,
        // In true production order (matches the results table on screen).
        sequence_task_congruent: toSequence(r.rows),
        task_discrepant: r.taskDiscrepant
          ? {
              count: r.taskDiscrepant.count,
              mean_cluster_size: r.taskDiscrepant.meanClusterSize,
              sequence: toSequence(r.taskDiscrepant.rows),
            }
          : null,
      },
      null,
      2
    );
  }

  const btnDownloadCsv = document.getElementById("btn-download-csv");
  const btnDownloadJson = document.getElementById("btn-download-json");

  if (btnDownloadCsv) {
    btnDownloadCsv.addEventListener("click", () => {
      downloadFile("vft_results.csv", buildResultsCSV(), "text/csv");
    });
  }

  if (btnDownloadJson) {
    btnDownloadJson.addEventListener("click", () => {
      downloadFile("vft_results.json", buildResultsJSON(), "application/json");
    });
  }

  function updateStepValidity(stepEl) {
    if (!stepEl) return;
    const nextBtn = stepEl.querySelector(".btn-primary[data-next]");
    if (!nextBtn) return;
    const requires = (stepEl.dataset.requires || "").split(",").filter(Boolean);
    const valid = requires.every((field) => !!state[field]);
    nextBtn.disabled = !valid;
  }

  // --- Wizard step navigation ----------------------------------------------
  document.querySelectorAll(".wizard .btn-primary[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      goToStep(Number(btn.dataset.next));
    });
  });

  document.querySelectorAll(".wizard [data-back]").forEach((btn) => {
    btn.addEventListener("click", () => {
      goToStep(Number(btn.dataset.back));
    });
  });

  function goToStep(n) {
    document.querySelectorAll(".wizard .step").forEach((s) => {
      s.classList.toggle("is-active", Number(s.dataset.step) === n);
    });
    document.querySelectorAll(".wizard-progress li").forEach((li) => {
      const step = Number(li.dataset.step);
      li.classList.toggle("is-current", step === n);
      li.classList.toggle("is-done", step < n);
    });
    if (n === 2) updateTaskTypeAvailability();
    if (n === 3) updatePromptExampleUI();
    if (n === 5) renderValueChecklist();
    if (n === 6) updateTrialModeAvailability();
    if (n === 7) updateStep7InputCopy();
  }

  // --- Step 6: batch is only offered where a demo batch exists -------------
  // The synthetic batch covers semantic trials only, so a phonemic batch
  // would just repeat one worked example and report SD = 0 on every metric.
  function setCardAvailable(card, allowed, noteClass) {
    if (!card) return;
    const note = card.querySelector("." + noteClass);
    card.disabled = !allowed;
    card.classList.toggle("is-disabled", !allowed);
    if (note) note.hidden = allowed;
    if (!allowed) card.classList.remove("is-selected");
  }

  function updateTrialModeAvailability() {
    const grid = document.querySelector('.choice-grid[data-field="trialMode"]');
    if (!grid) return;

    // A batch needs demo trials behind it; the single-trial path is the
    // manual's published worked example, which exists in Finnish only.
    const batchAllowed = !!(VFT_DATA.illustrativeBatch[state.dataLanguage || "fi"] || {})[state.taskType];
    const singleAllowed = (state.dataLanguage || "fi") === "fi";

    const batchCard = grid.querySelector('.choice-card[data-value="multiple"]');
    const singleCard = grid.querySelector('.choice-card[data-value="single"]');
    setCardAvailable(batchCard, batchAllowed, "trial-mode-note");
    setCardAvailable(singleCard, singleAllowed, "trial-mode-note");

    if ((!batchAllowed && state.trialMode === "multiple") || (!singleAllowed && state.trialMode === "single")) {
      state.trialMode = null;
      document.getElementById("trial-count-row").hidden = true;
    }
    recomputeTrialsReady();
  }

  // Phonemic trials have no demo batch, and the published worked example is
  // Finnish — so under English there is nothing behind a phonemic trial.
  function updateTaskTypeAvailability() {
    const grid = document.querySelector('.choice-grid[data-field="taskType"]');
    if (!grid) return;
    const allowed = (state.dataLanguage || "fi") === "fi";
    const card = grid.querySelector('.choice-card[data-value="pvf"]');
    setCardAvailable(card, allowed, "task-type-note");
    if (!allowed && state.taskType === "pvf") state.taskType = null;
    updateStepValidity(grid.closest(".step"));
  }

  // --- Step 7: adjust copy for single trial vs. batch ----------------------
  function updateStep7InputCopy() {
    const title = document.getElementById("step7-title");
    const help = document.getElementById("step7-help");
    if (!title || !help) return;

    renderProvenance(document.getElementById("provenance-input"), currentProvenance());

    const loadLabel = document.getElementById("load-example-label");
    if (loadLabel) {
      loadLabel.textContent = usingSyntheticBatch()
        ? "For demonstration purposes, load the " + syntheticTrialCount() + " synthetic demo transcripts here."
        : "For demonstration purposes, load the manual's example transcript here.";
    }
    if (state.trialMode === "multiple") {
      title.textContent = "Add this batch's transcripts";
      help.textContent =
        "This batch has " +
        state.trialCount +
        " trials, all responses to the prompt you shared, from one participant group. Import them all here — you will then score the semantic clustering one trial at a time.";
    } else {
      title.textContent = "Add your transcript";
      help.textContent = "Import a transcript file below.";
    }
  }

  // --- Step 5: render the scored-values checklist based on PVF/SVF choice --
  function renderValueChecklist() {
    const list = document.getElementById("value-checklist");
    if (!list) return;
    const type = state.taskType || "pvf";
    const values = (VFT_DATA.scoredValues && VFT_DATA.scoredValues[type]) || [];
    const hasAudio = state.mediaType === "voice";

    list.innerHTML = values
      .map((v) => {
        const unavailable = v.requiresAudio && !hasAudio;
        return `
          <li class="value-item${unavailable ? " is-unavailable" : ""}">
            <span class="value-item-icon">${unavailable ? "–" : "✓"}</span>
            <span class="value-item-body">
              <span class="value-item-label">${v.label}</span>
              <span class="value-item-desc">${v.desc}</span>
              ${unavailable ? '<span class="value-item-note">Needs audio — not available for transcript input</span>' : ""}
            </span>
          </li>
        `;
      })
      .join("");
  }

  // --- Data provenance ------------------------------------------------------
  // Every screen that shows numbers states where those numbers came from, so
  // the published worked example and the synthetic demo batch can never be
  // mistaken for one another.
  const PROVENANCE = {
    manual:
      '<strong>Published data.</strong> This trial is the worked example transcribed directly from ' +
      'Appendix A of Lehtinen et al. (2023) — the instruction manual this tool implements.',
    synthetic:
      '<strong>Synthetic data — not participant data.</strong> These trials were generated for this ' +
      'prototype so the group view has a realistic spread to aggregate. They are not real responses, ' +
      'not from the dissertation dataset, and not study results.',
  };

  function renderProvenance(el, kind) {
    if (!el) return;
    el.className = "provenance " + (kind === "synthetic" ? "is-synthetic" : "is-manual");
    el.innerHTML = PROVENANCE[kind];
  }

  function currentProvenance() {
    return usingSyntheticBatch() ? "synthetic" : "manual";
  }

  // --- Group results --------------------------------------------------------
  // The scalar metrics aggregate across trials; the cluster breakdown does
  // not, since it is one participant's words in their own production order.
  // So the group view summarises the scalars and keeps each trial's full
  // breakdown available underneath, for auditing.
  const groupEmptyEl = document.getElementById("group-empty");
  const groupContentEl = document.getElementById("group-content");
  const groupStatGridEl = document.getElementById("group-stat-grid");
  const groupTrialBodyEl = document.getElementById("group-trial-body");
  const groupBadgeEl = document.getElementById("group-trial-badge");
  const groupProgressEl = document.getElementById("group-progress-note");

  function mean(values) {
    return values.reduce((a, v) => a + v, 0) / values.length;
  }

  // Sample SD (n-1), which is what gets reported for a participant group.
  function stdDev(values) {
    if (values.length < 2) return null;
    const m = mean(values);
    return Math.sqrt(values.reduce((a, v) => a + (v - m) * (v - m), 0) / (values.length - 1));
  }

  function fmt(n, dp) {
    return Number(n).toFixed(dp === undefined ? 1 : dp);
  }

  function scoredTrials() {
    const type = state.taskType || "pvf";
    const out = [];
    batch.scored.forEach((ranges, i) => {
      if (!ranges) return;
      const trial = usingSyntheticBatch() ? syntheticTrial(i) : VFT_DATA.results[type];
      out.push({ index: i, result: getResolvedResult(trial, type, reviewResolutions, ranges) });
    });
    return out;
  }

  function renderGroupResults() {
    if (!groupContentEl) return;
    const trials = scoredTrials();

    if (!trials.length) {
      groupEmptyEl.hidden = false;
      groupContentEl.hidden = true;
      return;
    }
    groupEmptyEl.hidden = true;
    groupContentEl.hidden = false;

    const type = state.taskType || "pvf";
    renderProvenance(document.getElementById("provenance-group"), trials[0].result.synthetic ? "synthetic" : "manual");
    groupBadgeEl.textContent = trials[0].result.trialLabel;
    groupProgressEl.textContent =
      trials.length === batch.count
        ? "All " + batch.count + " trial" + (batch.count === 1 ? "" : "s") + " scored."
        : trials.length + " of " + batch.count + " trials scored — these statistics are incomplete.";

    const metrics = [
      { label: "Total score", dp: 1, get: (r) => r.totalScore },
      { label: "Errors", dp: 1, get: (r) => r.errors.length },
      { label: type === "pvf" ? "Mean phonemic cluster size" : "Mean semantic cluster size", dp: 2, get: (r) => r.meanClusterSize },
      { label: "Number of switches", dp: 1, get: (r) => r.switches },
      { label: "Task discrepant clusters", dp: 1, get: (r) => (r.taskDiscrepant ? r.taskDiscrepant.count : 0) },
    ];

    groupStatGridEl.innerHTML = metrics
      .map((metric) => {
        const values = trials.map((t) => Number(metric.get(t.result)));
        const sd = stdDev(values);
        const lo = Math.min.apply(null, values);
        const hi = Math.max.apply(null, values);
        return `
          <div class="group-stat">
            <span class="group-stat-label">${metric.label}</span>
            <span class="group-stat-value">${fmt(mean(values), metric.dp)}</span>
            <span class="group-stat-meta">SD ${sd === null ? "—" : fmt(sd, 2)} · range ${fmt(lo, metric.dp)}–${fmt(hi, metric.dp)} · n = ${values.length}</span>
          </div>
        `;
      })
      .join("");

    groupTrialBodyEl.innerHTML = trials
      .map((t) => {
        const r = t.result;
        return `
          <tr class="group-trial-row" data-trial="${t.index}" title="Show this trial's cluster breakdown">
            <td><span class="group-trial-name">Trial ${t.index + 1}</span></td>
            <td>${r.totalScore}</td>
            <td>${r.errors.length}</td>
            <td>${fmt(r.meanClusterSize)}</td>
            <td>${r.switches}</td>
            <td>${r.taskDiscrepant ? r.taskDiscrepant.count : "—"}</td>
          </tr>
          <tr class="group-detail-row" data-detail="${t.index}" hidden>
            <td colspan="6">
              <h4 class="group-detail-heading">Task-congruent clusters</h4>
              ${r.semanticIsCongruent ? '<p class="manual-scored-note">' + MANUAL_SCORED_NOTE + "</p>" : ""}
              <div class="cluster-table-wrap">
                <table class="cluster-table">
                  <thead><tr><th>Words</th><th>Size</th><th>Rule applied</th></tr></thead>
                  <tbody>${renderClusterRows(r.rows)}</tbody>
                </table>
              </div>
              <h4 class="group-detail-heading">Task-discrepant clusters</h4>
              ${r.semanticIsCongruent ? "" : '<p class="manual-scored-note">' + MANUAL_SCORED_NOTE + "</p>"}
              <div class="cluster-table-wrap">
                <table class="cluster-table">
                  <thead><tr><th>Words</th><th>Size</th><th>Rule applied</th></tr></thead>
                  <tbody>${r.taskDiscrepant ? renderClusterRows(r.taskDiscrepant.rows) : ""}</tbody>
                </table>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    groupTrialBodyEl.querySelectorAll(".group-trial-row").forEach((row) => {
      row.addEventListener("click", () => {
        const detail = groupTrialBodyEl.querySelector('.group-detail-row[data-detail="' + row.dataset.trial + '"]');
        if (!detail) return;
        detail.hidden = !detail.hidden;
        row.classList.toggle("is-open", !detail.hidden);
      });
    });
  }

  const btnGroupBack = document.getElementById("btn-group-back");
  if (btnGroupBack) {
    btnGroupBack.addEventListener("click", () => goToTab("start"));
  }

  // Recompute whenever the tab is opened, so it reflects the latest scoring.
  const resultsTab = document.querySelector('.tab[data-tab="results"]');
  if (resultsTab) {
    resultsTab.addEventListener("click", renderGroupResults);
  }

  renderGroupResults();

  // --- Inline links that jump to another top-level tab --------------------
  document.querySelectorAll("[data-goto-tab]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      goToTab(link.dataset.gotoTab);
    });
  });
})();
