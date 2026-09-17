(function () {
  "use strict";

  const state = {
    dataLanguage: null,
    mediaType: null,
    trialMode: null,
    trialCount: 5,
    trialsReady: false,
    letter: "K",
    // "yes" / "no", chosen in step 5.
    includeDiscrepant: null,
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

  // --- Step 3: fill in the manual's sample-protocol prompt -------------------
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
    state.letter = letter;
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
  const btnReviewBack = document.getElementById("btn-review-back");
  const btnContinueToResults = document.getElementById("btn-continue-to-results");
  const step7Input = document.getElementById("step7-input");
  const step7Review = document.getElementById("step7-review");
  const step7Ready = document.getElementById("step7-ready");
  let hasData = false;
  // The setup the loaded data was chosen for. Changing the setup afterwards
  // clears it, so the box never names a source the run will not use.
  let loadedFor = null;
  const dropzoneDefaultText = dropzoneText ? dropzoneText.textContent : "";

  function setupKey() {
    return [state.dataLanguage, state.taskType, state.letter, state.trialMode].join("|");
  }

  function setDropzoneLoaded(label) {
    hasData = true;
    loadedFor = setupKey();
    dropzone.classList.add("has-file");
    dropzoneText.textContent = label;
    btnCalculate.disabled = false;
  }

  function resetDropzoneIfStale() {
    if (!hasData || loadedFor === setupKey()) return;
    hasData = false;
    loadedFor = null;
    dropzone.classList.remove("has-file");
    dropzoneText.textContent = dropzoneDefaultText;
    if (fileInput) fileInput.value = "";
    btnCalculate.disabled = true;
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
      if (usingSyntheticBatch()) {
        setDropzoneLoaded("Loaded: " + syntheticTrialCount() + " synthetic transcripts");
      } else {
        setDropzoneLoaded(translatedExample() ? "Loaded: translated sample protocol" : "Loaded: published sample protocol");
      }
    });
  }

  // --- The scoring loop -----------------------------------------------------
  // Steps 1-6 configure the study. Step 7 imports the data, shows what was
  // scored automatically, then runs the manual pass one trial at a time.
  // A batch ends at the group results; a single trial at its own results.
  const batch = {
    count: 1,
    current: 0,
    scored: [], // scored[i] = that trial's cluster ranges, once scored
    drafts: [], // drafts[i] = unfinished marks, kept when the rater goes back
  };

  function copyRanges(ranges) {
    return ranges.map((c) => ({ s: c.s, e: c.e }));
  }

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

  function showStep7Screen(screen) {
    step7Input.hidden = screen !== step7Input;
    step7Ready.hidden = screen !== step7Ready;
    step7Review.hidden = screen !== step7Review;
    scrollToWizardTop();
  }

  function showReadyScreen() {
    renderReadyScreen();
    showStep7Screen(step7Ready);
  }

  function showScoringScreen() {
    renderReviewStep();
    showStep7Screen(step7Review);
  }

  // Leaves the manual pass behind: every run ends in the Results tab.
  function finishScoring() {
    renderGroupResults();
    goToTab("results");
  }

  if (btnCalculate) {
    btnCalculate.addEventListener("click", () => {
      if (!hasData) return;
      batch.count = state.trialMode === "multiple" ? Math.min(state.trialCount, syntheticTrialCount()) : 1;
      batch.current = 0;
      batch.scored = [];
      batch.drafts = [];
      showReadyScreen();
    });
  }

  const btnReadyBack = document.getElementById("btn-ready-back");
  if (btnReadyBack) {
    btnReadyBack.addEventListener("click", () => showStep7Screen(step7Input));
  }

  const btnReadyContinue = document.getElementById("btn-ready-continue");
  if (btnReadyContinue) {
    btnReadyContinue.addEventListener("click", () => {
      batch.current = 0;
      if (needsManualPass(state.taskType || "pvf")) {
        showScoringScreen();
      } else {
        // Nothing to mark by hand: every trial is complete as it stands.
        for (let i = 0; i < batch.count; i++) batch.scored[i] = [];
        batch.current = batch.count - 1;
        finishScoring();
      }
    });
  }

  if (btnReviewBack) {
    btnReviewBack.addEventListener("click", () => {
      // From the first trial, back means the automated analysis; otherwise it
      // means the previous trial, so a rater can revise what they scored.
      // Marks on the trial being left are kept as a draft, not as scored.
      batch.drafts[batch.current] = copyRanges(manualClusters);
      if (batch.current === 0) {
        showReadyScreen();
      } else {
        batch.current -= 1;
        showScoringScreen();
      }
    });
  }

  if (btnContinueToResults) {
    btnContinueToResults.addEventListener("click", () => {
      if (btnContinueToResults.disabled) return;
      batch.scored[batch.current] = copyRanges(manualClusters);
      batch.drafts[batch.current] = null;
      advanceTrial();
    });
  }

  function advanceTrial() {
    if (batch.current < batch.count - 1) {
      batch.current += 1;
      showScoringScreen();
    } else {
      finishScoring();
    }
  }


  // --- Automated analysis ready ----------------------------------------------
  function readyTrials() {
    const out = [];
    for (let i = 0; i < batch.count; i++) {
      out.push(trialAt(i));
    }
    return out;
  }

  function renderReadyScreen() {
    const type = state.taskType || "pvf";
    const trials = readyTrials();
    const phonemic = !semanticIsCongruent(type);
    const disc = discrepantState(type);
    const languageName = (state.dataLanguage || "fi") === "fi" ? "Finnish" : "English";

    document.getElementById("ready-summary").textContent =
      trials.length + (trials.length === 1 ? " trial" : " trials") + " · " + trials[0].trialLabel + " · " + languageName;

    // List the automated measures, with unavailable and omitted ones marked.
    const values = (VFT_DATA.scoredValues && VFT_DATA.scoredValues[type]) || [];
    const hasAudio = state.mediaType === "voice";
    const auto = [];
    values.forEach((v) => {
      if (v.key === "temporal" && !hasAudio) {
        auto.push({ v: v, note: "Requires audio. Excluded from this prototype." });
      } else if (v.key === "discrepant" || v.key === "discrepantSize") {
        if (disc === "english") auto.push({ v: v, note: "Excluded from this prototype for English" });
        else if (disc === "omitted") auto.push({ v: v, note: "Left out in step 5" });
        else if (!phonemic) auto.push({ v: v });
      } else if ((v.key === "count" || v.key === "clusterSize" || v.key === "switches") && !phonemic) {
        // Scored by hand in the next step.
      } else {
        auto.push({ v: v });
      }
    });

    const item = (entry) => `
      <li class="value-item${entry.note ? " is-unavailable" : ""}">
        <span class="value-item-icon">${entry.note ? "–" : "✓"}</span>
        <span class="value-item-body">
          <span class="value-item-label">${entry.v.label}</span>
          <span class="value-item-desc">${entry.v.desc}</span>
          ${entry.note ? '<span class="value-item-note">' + entry.note + "</span>" : ""}
        </span>
      </li>`;
    document.getElementById("ready-auto-list").innerHTML = auto.map(item).join("");
    // Only announce a manual step when there is one.
    document.getElementById("ready-next").hidden = !needsManualPass(type);
    document.getElementById("ready-continue-label").textContent = needsManualPass(type)
      ? "Start manual scoring"
      : trials.length > 1
        ? "View group results"
        : "View results";
  }

  // --- Manual pass: semantic clustering --------------------------------------
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
    const covered = new Set();

    const clusters = ranges
      .slice()
      .sort((a, b) => a.s - b.s)
      .map((rg) => {
        const words = [];
        for (let i = rg.s; i <= rg.e; i++) {
          covered.add(i);
          words.push(trial.words[i]);
        }
        return {
          pos: rg.s,
          words,
          rule: "Semantic cluster (manual)",
        };
      });

    const nonClustering = [];
    trial.words.forEach((w, i) => {
      if (!covered.has(i)) nonClustering.push({ pos: i, word: w });
    });

    const rows = buildRows(clusters, nonClustering);

    const inClusters = clusters.reduce((a, c) => a + c.words.length, 0);
    const meanClusterSize = clusters.length ? inClusters / clusters.length : 0;
    // A switch is any transition between words not in the same cluster,
    // single-word transitions included — i.e. one less than the number of runs.
    const switches = Math.max(clusters.length + nonClustering.length - 1, 0);

    return { clusters, nonClustering, rows, meanClusterSize, switches, count: clusters.length };
  }

  // The word list is built once per trial and then only repainted. Rebuilding
  // it mid-drag would destroy the element under the pointer, and browsers
  // handle a pressed element disappearing inconsistently — releases get lost.
  let builtWords = null;

  function buildSemanticTranscript(trial) {
    const errorIdx = trial.errorIndices || [];
    semanticTxEl.innerHTML = "";
    trial.words.forEach((w, i) => {
      const chip = document.createElement("span");
      chip.className = "semantic-word";
      chip.dataset.i = i;
      chip.innerHTML = w + (errorIdx.indexOf(i) !== -1 ? ' <span class="err">(error)</span>' : "");
      semanticTxEl.appendChild(chip);

      if (i < trial.words.length - 1) {
        const sep = document.createElement("span");
        sep.className = "semantic-sep";
        sep.dataset.after = i;
        semanticTxEl.appendChild(sep);
      }
    });
    builtWords = trial.words;
  }

  function paintSemanticTranscript() {
    const dragLo = manualDrag ? Math.min(manualDrag.anchor, manualDrag.cur) : -1;
    const dragHi = manualDrag ? Math.max(manualDrag.anchor, manualDrag.cur) : -2;

    semanticTxEl.querySelectorAll(".semantic-word").forEach((chip) => {
      const i = Number(chip.dataset.i);
      const dragging = i >= dragLo && i <= dragHi;
      const ci = dragging ? -1 : clusterIndexAt(i);
      const c = ci !== -1 ? manualClusters[ci] : null;
      chip.classList.toggle("in-drag", dragging);
      chip.classList.toggle("in-cluster", !!c);
      chip.classList.toggle("at-start", !!c && i === c.s);
      chip.classList.toggle("at-end", !!c && i === c.e);
      chip.classList.toggle("at-mid", !!c && i !== c.s && i !== c.e);
    });

    // Members of one cluster sit flush, so the run reads as one block.
    semanticTxEl.querySelectorAll(".semantic-sep").forEach((sep) => {
      const i = Number(sep.dataset.after);
      const ci = clusterIndexAt(i);
      sep.classList.toggle("inside", ci !== -1 && ci === clusterIndexAt(i + 1));
    });
  }

  function renderSemanticTranscript() {
    const trial = activeTrial();
    if (!trial || !semanticTxEl) return;
    if (builtWords !== trial.words) buildSemanticTranscript(trial);
    paintSemanticTranscript();
  }

  // --- Dragging a cluster ---------------------------------------------------
  // Pointer events with pointer capture: once a word is pressed, the word list
  // receives every move and the release, even if the pointer leaves it or the
  // pane. That also makes touch and stylus work.
  function wordIndexAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const chip = el && el.closest ? el.closest(".semantic-word") : null;
    return chip && semanticTxEl.contains(chip) ? Number(chip.dataset.i) : null;
  }

  // Ends the drag. `commit` false discards it (Escape, a cancelled pointer,
  // switching away from the window).
  function finishDrag(commit) {
    if (!manualDrag) return;
    const drag = manualDrag;
    manualDrag = null;

    try {
      if (semanticTxEl.hasPointerCapture(drag.pointerId)) {
        semanticTxEl.releasePointerCapture(drag.pointerId);
      }
    } catch (err) {
      // Capture was already released by the browser.
    }

    if (commit) {
      const lo = Math.min(drag.anchor, drag.cur);
      const hi = Math.max(drag.anchor, drag.cur);
      if (hi > lo) {
        addManualCluster(lo, hi);
      } else {
        // A plain click or tap dissolves the cluster under it.
        const ci = clusterIndexAt(lo);
        if (ci !== -1) manualClusters.splice(ci, 1);
      }
    }
    refreshSemanticStep();
  }

  function onDragMove(e) {
    if (!manualDrag || e.pointerId !== manualDrag.pointerId) return;

    // No button held means the release happened but never reached the page
    // (seen with a Mac touchpad). End the drag with what was selected while
    // the button was still down, instead of letting hovers extend it.
    if (e.pointerType === "mouse" && e.buttons === 0) {
      finishDrag(true);
      return;
    }

    const i = wordIndexAt(e.clientX, e.clientY);
    if (i === null || i === manualDrag.cur) return;
    manualDrag.cur = i;
    paintSemanticTranscript();
  }

  function renderSemanticLive() {
    const trial = activeTrial();
    if (!trial || !semanticLiveEl) return;
    const reading = buildManualReading(trial, manualClusters);
    semanticLiveEl.innerHTML = reading.clusters.length
      ? `<strong>${reading.clusters.length}</strong> clusters · mean size <strong>${reading.meanClusterSize.toFixed(1)}</strong> · <strong>${reading.switches}</strong> switches · <strong>${reading.nonClustering.length}</strong> non-clustering words`
      : "No clusters marked.";
  }

  function refreshSemanticStep() {
    renderSemanticTranscript();
    renderSemanticLive();
  }

  function renderReviewStep() {
    const type = state.taskType || "pvf";
    // Reload the rater's own work on this trial, so going back to it never
    // shows a blank slate.
    const saved = batch.drafts[batch.current] || batch.scored[batch.current];
    if (manualDrag) finishDrag(false);
    manualClusters = saved ? copyRanges(saved) : [];

    const isBatch = batch.count > 1;
    const continueLabel = document.getElementById("continue-to-results-label");
    if (continueLabel) {
      continueLabel.textContent = !isBatch
        ? "View results"
        : batch.current < batch.count - 1
          ? "Next trial"
          : "View group results";
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
        ? "Task-congruent reading"
        : "Task-discrepant reading";
    }

    if (cheatsheetListEl && !cheatsheetListEl.childElementCount) {
      cheatsheetListEl.innerHTML = (VFT_DATA.semanticRules || [])
        .map((r) => `<li><strong>${r.b}</strong>${r.d}</li>`)
        .join("");
    }

    // The rater may legitimately find no clusters at all, so continuing is
    // never blocked.
    btnContinueToResults.disabled = false;
    refreshSemanticStep();
  }

  if (semanticTxEl) {
    semanticTxEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const chip = e.target.closest(".semantic-word");
      if (!chip) return;
      e.preventDefault();
      // A drag that never ended properly is dropped, not merged into this one.
      if (manualDrag) finishDrag(false);

      manualDrag = { anchor: Number(chip.dataset.i), cur: Number(chip.dataset.i), pointerId: e.pointerId };
      try {
        semanticTxEl.setPointerCapture(e.pointerId);
      } catch (err) {
        // Without capture, the document-level listeners below still end it.
      }
      paintSemanticTranscript();
    });

    // Captured events bubble to the document, so these also act as the
    // backstop when capture is unavailable.
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", (e) => {
      if (manualDrag && e.pointerId === manualDrag.pointerId) finishDrag(true);
    });
    document.addEventListener("pointercancel", (e) => {
      if (manualDrag && e.pointerId === manualDrag.pointerId) finishDrag(false);
    });
    semanticTxEl.addEventListener("lostpointercapture", (e) => {
      if (manualDrag && e.pointerId === manualDrag.pointerId) finishDrag(true);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") finishDrag(false);
    });
    window.addEventListener("blur", () => finishDrag(false));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) finishDrag(false);
    });
  }

  if (btnSemanticClear) {
    btnSemanticClear.addEventListener("click", () => {
      manualClusters = [];
      refreshSemanticStep();
    });
  }

  // --- Which trial is being scored, and where its data comes from ----------
  // Separate sources, never mixed:
  //   single trial -> VFT_DATA.results, the manual's published sample
  //                   protocol, or VFT_DATA.translatedExample for English
  //   batch        -> VFT_DATA.illustrativeBatch, synthetic demo data
  function syntheticSet() {
    const lang = state.dataLanguage || "fi";
    const byLang = VFT_DATA.illustrativeBatch && VFT_DATA.illustrativeBatch[lang];
    const set = byLang && byLang[state.taskType];
    if (!set) return null;
    return Array.isArray(set) ? set : set[state.letter] || null;
  }

  function usingSyntheticBatch() {
    return state.trialMode === "multiple" && !!syntheticSet();
  }

  function syntheticTrialCount() {
    const set = syntheticSet();
    return set ? set.length : 0;
  }

  // In a semantic trial the task-discrepant reading is phonemic. Phonemic
  // clustering is rule-based, and the rule below reproduces the published
  // task-discrepant reading in Appendix A's Finnish sample protocol exactly.
  // It has only been checked against Finnish, so for English the reading is
  // shown as not calculated — English rules are built in the English phase.
  function discrepantIsPhonemic(type) {
    return (type || state.taskType || "pvf") === "svf";
  }

  function phonemicDiscrepantUnavailable(type) {
    return discrepantIsPhonemic(type) && (state.dataLanguage || "fi") !== "fi";
  }

  // Whether the task-discrepant reading is scored in this run. Left out by
  // choice is not the same as zero clusters: an omitted reading has no value.
  function discrepantIncluded(type) {
    return state.includeDiscrepant === "yes" && !phonemicDiscrepantUnavailable(type);
  }

  function discrepantState(type) {
    if (phonemicDiscrepantUnavailable(type)) return "english";
    return discrepantIncluded(type) ? "shown" : "omitted";
  }

  // The semantic reading of a semantic trial is always scored by hand; a
  // phonemic trial needs a manual pass only for its task-discrepant reading.
  function needsManualPass(type) {
    return semanticIsCongruent(type) || discrepantIncluded(type);
  }

  // Three or more consecutive words sharing an initial phoneme form a cluster
  // (the manual's special rule for semantic fluency); exactly two consecutive
  // words cluster when they share the same opening.
  function buildPhonemicReading(words) {
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
          rule:
            len >= 3
              ? "1.1 Word-initial phoneme (three or more words, semantic task)"
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
      count: clusters.length,
      meanClusterSize: clusters.length ? inClusters / clusters.length : 0,
    };
  }

  // All errors in the stored word lists are non-sequential repetitions.
  function repetitionErrors(src) {
    return src.errorIndices.map((idx) => ({
      word: src.words[idx],
      type: "Non-sequential repetition",
      note: "Excluded from the total score; can be counted in a cluster.",
    }));
  }

  // The English sample protocol is a semantic trial: its task-congruent
  // reading comes from the rater, and its task-discrepant reading is
  // excluded for English.
  function trialFromWords(src, label, flags) {
    const base = {
      trialLabel: label,
      words: src.words,
      errorIndices: src.errorIndices,
      errors: repetitionErrors(src),
      totalScore: src.totalScore,
      clusters: [],
      nonClusteringWords: [],
      taskDiscrepant: null,
    };
    return Object.assign(base, flags || {});
  }

  function translatedExample() {
    const byLang = VFT_DATA.translatedExample && VFT_DATA.translatedExample[state.dataLanguage];
    return (byLang && byLang[state.taskType]) || null;
  }

  // A stored phonemic reading, as index ranges, in the shape the results
  // renderer expects from a rule-based reading.
  function phonemicReadingFromRanges(words, ranges) {
    const covered = new Set();
    const clusters = ranges.map(([a, b]) => {
      for (let i = a; i <= b; i++) covered.add(i);
      return {
        pos: a,
        words: words.slice(a, b + 1),
        rule: "1.1 Word-initial phonemes (shared " + words[a].slice(0, 2) + "-)",
      };
    });
    const nonClusteringWords = [];
    words.forEach((w, i) => {
      if (!covered.has(i)) nonClusteringWords.push({ pos: i, word: w });
    });
    const inClusters = clusters.reduce((n, c) => n + c.words.length, 0);
    return {
      clusters: clusters,
      nonClusteringWords: nonClusteringWords,
      meanClusterSize: clusters.length ? inClusters / clusters.length : 0,
      switches: Math.max(clusters.length + nonClusteringWords.length - 1, 0),
      count: clusters.length,
    };
  }

  function syntheticTrial(index) {
    const src = syntheticSet()[index];
    const phonemic = state.taskType === "pvf";
    const base = {
      trialLabel: phonemic ? "Phonemic (PVF) — letter " + state.letter : "Semantic (SVF) — category Animals",
      synthetic: true,
      words: src.words,
      errorIndices: src.errorIndices,
      errors: repetitionErrors(src),
      totalScore: src.totalScore,
      // In a semantic trial the task-congruent reading comes from the rater,
      // so there is no rule-based reading to seed.
      clusters: [],
      nonClusteringWords: [],
      // In a phonemic trial the task-discrepant reading is semantic and comes
      // from the rater.
      taskDiscrepant:
        phonemic || phonemicDiscrepantUnavailable() ? null : buildPhonemicReading(src.words),
    };
    return phonemic ? Object.assign(base, phonemicReadingFromRanges(src.words, src.phonemicRanges)) : base;
  }

  function trialAt(index) {
    if (usingSyntheticBatch()) return syntheticTrial(index);
    const translated = translatedExample();
    if (translated) {
      return trialFromWords(translated, translated.trialLabel, { translated: true });
    }
    return VFT_DATA.results[state.taskType || "pvf"];
  }

  function activeTrial() {
    return trialAt(batch.current);
  }

  // Clusters and non-clustering words as one list, in production order.
  function buildRows(clusters, nonClustering) {
    return [
      ...clusters.map((c) => ({ kind: "cluster", ...c })),
      ...nonClustering.map((n) => ({ kind: "single", pos: n.pos, word: n.word })),
    ].sort((a, b) => a.pos - b.pos);
  }

  // A stored or rule-based reading, with its rows added.
  function storedReading(base) {
    return { ...base, nonClustering: base.nonClusteringWords, rows: buildRows(base.clusters, base.nonClusteringWords) };
  }

  // `manualRanges` is the rater's scoring of whichever reading is semantic
  // for this task type. The phonemic reading is stored or rule-based.
  function getResolvedResult(trial, type, manualRanges) {
    const r = trial;
    if (!r) return null;

    const manual = buildManualReading(r, manualRanges || []);
    let congruent, discrepant;
    if (semanticIsCongruent(type)) {
      congruent = manual;
      discrepant = discrepantIncluded(type) && r.taskDiscrepant ? storedReading(r.taskDiscrepant) : null;
    } else {
      congruent = storedReading(r);
      discrepant = discrepantIncluded(type) ? manual : null;
    }

    return {
      ...r,
      ...congruent,
      taskDiscrepant: discrepant,
      discrepantState: discrepantState(type),
      semanticIsCongruent: semanticIsCongruent(type),
    };
  }

  // Cluster-row rendering, shared by the per-trial results block and the
  // per-trial detail rows in the group view.

  // Errors are marked by their position in the word list, so a repeated word
  // is marked only where it was the error.
  function renderClusterRows(rows, errorIndices) {
    const errorIdx = errorIndices || [];
    const mark = (word, pos) => (errorIdx.indexOf(pos) !== -1 ? word + " (error)" : word);
    return rows
      .map((row) => {
        if (row.kind === "single") {
          return `
            <tr class="cluster-row-single">
              <td class="cluster-words">${mark(row.word, row.pos)}</td>
              <td><span class="cluster-size-badge is-single">—</span></td>
              <td>Non-clustering single word</td>
            </tr>
          `;
        }
        const wordList = row.words.map((w, wi) => mark(w, row.pos + wi)).join(", ");
        return `
          <tr>
            <td class="cluster-words">${wordList}</td>
            <td><span class="cluster-size-badge">${row.words.length}</span></td>
            <td>${row.rule}</td>
          </tr>
        `;
      })
      .join("");
  }

  const MANUAL_SCORED_NOTE = "Scored manually.";

  // Number of clusters in a reading, counted from its rows.
  function clusterCount(reading) {
    return reading.rows.filter((row) => row.kind !== "single").length;
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
    if (n === 5) renderDiscrepantChoice();
    if (n === 6) updateTrialModeAvailability();
    if (n === 7) updateStep7InputCopy();
  }

  // --- Step 6: offer only the trial modes that have data behind them -------
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
    // manual's published sample protocol, which exists in Finnish only.
    const batchAllowed = !!(VFT_DATA.illustrativeBatch[state.dataLanguage || "fi"] || {})[state.taskType];
    const singleTag = grid.querySelector('.choice-card[data-value="single"] .source-tag');
    if (singleTag) {
      singleTag.textContent = (state.dataLanguage || "fi") === "fi" ? "Published sample protocol" : "Translated sample protocol";
    }
    const lang = state.dataLanguage || "fi";
    // The published phonemic sample protocol uses the letter K only.
    const singleAllowed =
      lang === "fi"
        ? state.taskType !== "pvf" || state.letter === "K"
        : !!((VFT_DATA.translatedExample[lang] || {})[state.taskType]);

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

  // English phonemic trials are excluded: there are no English phonemic
  // rules, sample protocol or demo batch yet.
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

    resetDropzoneIfStale();
    renderProvenance(document.getElementById("provenance-input"), currentProvenance());

    const loadLabel = document.getElementById("load-example-label");
    if (loadLabel) {
      loadLabel.textContent = usingSyntheticBatch()
        ? "Load the synthetic transcripts"
        : translatedExample()
          ? "Load the translated sample protocol"
          : "Load the published sample protocol";
    }
    if (state.trialMode === "multiple") {
      title.textContent = "Import transcripts";
      help.textContent =
        "Import all " + state.trialCount + " transcripts in the batch. Semantic clustering is then scored one trial at a time.";
    } else {
      title.textContent = "Import transcript";
      help.textContent = "Import one transcript file.";
    }
  }

  // --- Step 5: whether to score task-discrepant clustering. What that costs
  // depends on the task: in a semantic trial the reading is phonemic and
  // automated; in a phonemic trial it is semantic and scored by hand.
  function renderDiscrepantChoice() {
    const grid = document.querySelector('.choice-grid[data-field="includeDiscrepant"]');
    if (!grid) return;
    const type = state.taskType || "pvf";
    const include = grid.querySelector('.choice-card[data-value="yes"]');
    const leaveOut = grid.querySelector('.choice-card[data-value="no"]');
    const sub = document.getElementById("discrepant-include-sub");
    const english = phonemicDiscrepantUnavailable(type);

    if (sub) sub.hidden = english;
    setCardAvailable(include, !english, "discrepant-note");

    if (english) {
      state.includeDiscrepant = "no";
      leaveOut.classList.add("is-selected");
    } else if (state.includeDiscrepant) {
      grid.querySelectorAll(".choice-card").forEach((c) => {
        c.classList.toggle("is-selected", c.dataset.value === state.includeDiscrepant);
      });
    }
    updateStepValidity(grid.closest(".step"));
  }

  // --- Data provenance ------------------------------------------------------
  // Every screen that shows numbers states where those numbers came from, so
  // the published sample protocol and the synthetic demo batch can never be
  // mistaken for one another.
  const PROVENANCE = {
    manual:
      '<strong>Published data.</strong> Sample protocol from Appendix A of Lehtinen et al. (2023).',
    translated:
      '<strong>Translated sample protocol.</strong> The manual\'s published sample protocol ' +
      '(Appendix A, Lehtinen et al. 2023) translated word for word into English.',
    synthetic:
      '<strong>Synthetic data.</strong> These trials were generated for this prototype. ' +
      'They are not participant data or study results.',
  };

  // Passing no kind clears the banner.
  function renderProvenance(el, kind) {
    if (!el) return;
    if (!kind) {
      el.className = "provenance";
      el.innerHTML = "";
      return;
    }
    const variant = kind === "synthetic" ? "is-synthetic" : kind === "translated" ? "is-translated" : "is-manual";
    el.className = "provenance " + variant;
    el.innerHTML = PROVENANCE[kind];
  }

  function currentProvenance() {
    if (usingSyntheticBatch()) return "synthetic";
    return translatedExample() ? "translated" : "manual";
  }

  // --- Results tab ------------------------------------------------------------
  // The scalar metrics aggregate across trials; the cluster breakdown does
  // not, since it is one participant's words in their own production order.
  // So the view summarises the scalars and keeps each trial's full breakdown
  // available underneath, for auditing. A single trial uses the same view:
  // its values stand alone and its breakdown is open from the start.
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
      out.push({ index: i, result: getResolvedResult(trialAt(i), type, ranges) });
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
    const single = batch.count === 1;
    renderProvenance(document.getElementById("provenance-group"), trials[0].result.synthetic ? "synthetic" : null);
    document.getElementById("results-title").textContent = single ? "Results" : "Group results";
    document.getElementById("trial-table-heading").textContent = single ? "Trial results" : "Per-trial results";
    groupBadgeEl.textContent = trials[0].result.trialLabel;
    groupProgressEl.hidden = single;
    groupProgressEl.textContent =
      trials.length === batch.count
        ? "All " + batch.count + " trials scored."
        : trials.length + " of " + batch.count + " trials scored. Results are incomplete.";

    const showDiscrepant = discrepantIncluded(type);
    const metrics = [
      { label: "Total score", dp: 1, get: (r) => r.totalScore },
      { label: "Errors", dp: 1, get: (r) => r.errors.length },
      { label: type === "pvf" ? "Number of phonemic clusters" : "Number of semantic clusters", dp: 1, get: (r) => clusterCount(r) },
      { label: type === "pvf" ? "Mean phonemic cluster size" : "Mean semantic cluster size", dp: 2, size: true, get: (r) => r.meanClusterSize },
      { label: "Number of switches", dp: 1, get: (r) => r.switches },
    ];
    if (showDiscrepant) {
      metrics.push({ label: "Task-discrepant clusters", dp: 1, get: (r) => (r.taskDiscrepant ? r.taskDiscrepant.count : 0) });
      metrics.push({ label: "Mean task-discrepant cluster size", dp: 2, size: true, get: (r) => (r.taskDiscrepant ? r.taskDiscrepant.meanClusterSize : 0) });
    }

    groupStatGridEl.innerHTML = metrics
      .map((metric) => {
        const values = trials.map((t) => Number(metric.get(t.result)));
        const sd = stdDev(values);
        const lo = Math.min.apply(null, values);
        const hi = Math.max.apply(null, values);
        return `
          <div class="group-stat">
            <span class="group-stat-label">${metric.label}</span>
            <span class="group-stat-value">${single ? fmt(values[0], metric.size ? 1 : 0) : fmt(mean(values), metric.dp)}</span>
            ${
              single
                ? ""
                : `<span class="group-stat-meta">SD ${sd === null ? "—" : fmt(sd, 2)} · range ${fmt(lo, metric.dp)}–${fmt(hi, metric.dp)} · n = ${values.length}</span>`
            }
          </div>
        `;
      })
      .join("");

    document.querySelectorAll(".group-discrepant-header").forEach((th) => {
      th.hidden = !showDiscrepant;
    });

    groupTrialBodyEl.innerHTML = trials
      .map((t) => {
        const r = t.result;
        return `
          <tr class="group-trial-row${single ? " is-open" : ""}" data-trial="${t.index}" title="Show this trial's cluster breakdown">
            <td><span class="group-trial-name">Trial ${t.index + 1}</span></td>
            <td>${r.totalScore}</td>
            <td>${r.errors.length}</td>
            <td>${clusterCount(r)}</td>
            <td>${fmt(r.meanClusterSize)}</td>
            <td>${r.switches}</td>
            ${
              showDiscrepant
                ? "<td>" + (r.taskDiscrepant ? r.taskDiscrepant.count : "—") + "</td>" +
                  "<td>" + (r.taskDiscrepant ? fmt(r.taskDiscrepant.meanClusterSize) : "—") + "</td>"
                : ""
            }
          </tr>
          <tr class="group-detail-row" data-detail="${t.index}"${single ? "" : " hidden"}>
            <td colspan="${showDiscrepant ? 8 : 6}">
              <h4 class="group-detail-heading">Errors</h4>
              ${
                r.errors.length
                  ? '<ul class="error-list">' +
                    r.errors.map((e) => "<li><strong>" + e.word + "</strong> — " + e.type + ". " + e.note + "</li>").join("") +
                    "</ul>"
                  : '<p class="error-none">No errors.</p>'
              }
              <h4 class="group-detail-heading">Task-congruent clusters</h4>
              ${r.semanticIsCongruent ? '<p class="manual-scored-note">' + MANUAL_SCORED_NOTE + "</p>" : ""}
              <div class="cluster-table-wrap">
                <table class="cluster-table">
                  <thead><tr><th>Words</th><th>Size</th><th>Rule applied</th></tr></thead>
                  <tbody>${renderClusterRows(r.rows, r.errorIndices)}</tbody>
                </table>
              </div>
              ${
                showDiscrepant
                  ? '<h4 class="group-detail-heading">Task-discrepant clusters</h4>' +
                    (r.semanticIsCongruent ? "" : '<p class="manual-scored-note">' + MANUAL_SCORED_NOTE + "</p>") +
                    '<div class="cluster-table-wrap"><table class="cluster-table">' +
                    "<thead><tr><th>Words</th><th>Size</th><th>Rule applied</th></tr></thead>" +
                    "<tbody>" + (r.taskDiscrepant ? renderClusterRows(r.taskDiscrepant.rows, r.errorIndices) : "") + "</tbody>" +
                    "</table></div>"
                  : ""
              }
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
