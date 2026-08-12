(function () {
  "use strict";

  const state = {
    dataLanguage: null,
    mediaType: null,
    trialMode: null,
    trialCount: 30,
    trialsReady: false,
  };

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
      state.trialCount = n;
      state.trialsReady = Number.isInteger(n) && n >= 2 && n <= 200;
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
  const reviewCasesContainer = document.getElementById("review-cases-container");

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
      const filename = type === "pvf" ? "phonemic_letter-K_example.txt" : "semantic_animals_example.txt";
      setDropzoneLoaded("Loaded example: " + filename);
    });
  }

  if (btnCalculate) {
    btnCalculate.addEventListener("click", () => {
      if (!hasData) return;
      renderReviewStep();
      step7Input.hidden = true;
      step7Review.hidden = false;
      step7Results.hidden = true;
    });
  }

  if (btnReviewBack) {
    btnReviewBack.addEventListener("click", () => {
      step7Review.hidden = true;
      step7Input.hidden = false;
    });
  }

  if (btnContinueToResults) {
    btnContinueToResults.addEventListener("click", () => {
      if (btnContinueToResults.disabled) return;
      renderResults();
      step7Review.hidden = true;
      step7Results.hidden = false;
    });
  }

  if (btnEditInputs) {
    btnEditInputs.addEventListener("click", () => {
      step7Results.hidden = true;
      step7Input.hidden = false;
    });
  }

  // --- Step 7: ambiguous-case review screen ---------------------------------
  // Builds the continuous, trial-order word row for a flagged case, with the
  // ambiguous words highlighted inline (rather than pulled into a separate
  // card) so it reads like a transcript, not a fragmented UI.
  function buildContextSequence(trial, c) {
    const WINDOW = 6;
    const startIdx = c.pos;
    const endIdx = c.pos + c.words.length;

    const beforeAll = trial.words.slice(0, startIdx);
    const before = beforeAll.slice(-WINDOW);
    const beforeSegment = before.length ? (beforeAll.length > WINDOW ? "… " : "") + before.join(", ") + ", " : "";

    const afterAll = trial.words.slice(endIdx);
    const after = afterAll.slice(0, WINDOW);
    const afterSegment = after.length ? ", " + after.join(", ") + (afterAll.length > WINDOW ? " …" : "") : "";

    return beforeSegment + '<mark class="review-highlight">' + c.words.join(", ") + "</mark>" + afterSegment;
  }

  function renderReviewStep() {
    reviewResolutions = {};
    const type = state.taskType || "pvf";
    const trial = VFT_DATA.results[type];
    const congruentLabel = type === "pvf" ? "Phonemic clustering" : "Semantic clustering";
    const discrepantLabel = type === "pvf" ? "Task-discrepant (semantic) clustering" : "Task-discrepant (phonemic) clustering";

    const cases = [
      ...((trial && trial.ambiguousCases) || []).map((c) => ({ ...c, analysisLabel: c.analysisLabel || congruentLabel })),
      ...((trial && trial.taskDiscrepant && trial.taskDiscrepant.ambiguousCases) || []).map((c) => ({ ...c, analysisLabel: c.analysisLabel || discrepantLabel })),
    ];

    if (cases.length === 0) {
      reviewCasesContainer.innerHTML = `
        <div class="review-empty-state">
          <span class="review-empty-icon">✓</span>
          <p class="review-empty-title">All clusters resolved within scoring parameters</p>
          <p class="review-empty-desc">No cases were flagged for review in this trial.</p>
        </div>
      `;
      btnContinueToResults.disabled = false;
      return;
    }

    btnContinueToResults.disabled = true;

    reviewCasesContainer.innerHTML = cases
      .map(
        (c) => `
          <div class="review-case-card" data-case-id="${c.id}">
            <span class="review-analysis-label">${c.analysisLabel}</span>
            <p class="review-sequence">${buildContextSequence(trial, c)}</p>
            <div class="review-options">
              ${c.options
                .map(
                  (opt) => `
                    <button type="button" class="review-option-card" data-case-id="${c.id}" data-option-id="${opt.id}">
                      <span class="review-option-title">${opt.label}</span>
                      <span class="review-option-desc">${opt.description}</span>
                    </button>
                  `
                )
                .join("")}
            </div>
          </div>
        `
      )
      .join("");

    reviewCasesContainer.querySelectorAll(".review-option-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const caseId = btn.dataset.caseId;
        reviewCasesContainer.querySelectorAll('.review-option-card[data-case-id="' + caseId + '"]').forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        reviewResolutions[caseId] = btn.dataset.optionId;
        btnContinueToResults.disabled = cases.some((c) => !reviewResolutions[c.id]);
      });
    });
  }

  // Merges a reading's base (unambiguous) clusters with the human's resolved
  // choice for each flagged case in that same reading. If a case has no
  // resolution yet (e.g. the standalone Preview tab, which never runs the
  // review step), its first listed option is used as a stand-in, tagged
  // "flagged" rather than "reviewed". Shared by both the task-congruent
  // reading (main clustering) and the task-discrepant reading (cross-domain
  // clusters), which are scored and reviewed independently per the manual.
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

  function getResolvedResult(type, resolutions) {
    const r = VFT_DATA.results[type];
    if (!r) return null;
    const congruent = resolveClusterReading(r, resolutions);
    const discrepant = r.taskDiscrepant ? resolveClusterReading(r.taskDiscrepant, resolutions) : null;
    return { ...r, ...congruent, taskDiscrepant: discrepant };
  }

  // Generic results renderer — takes a set of target elements and options,
  // shared by the Start Here wizard's results step and the standalone
  // Preview tab (which has no wizard state of its own).
  function renderResultsInto(els, opts) {
    const type = opts.type || "pvf";
    const r = getResolvedResult(type, opts.resolutions || {});
    if (!r) return;

    const isBatch = !!opts.isBatch;
    const trialCount = opts.trialCount || 30;

    els.badge.textContent = isBatch ? "Group result — N=" + trialCount + " · " + r.trialLabel : r.trialLabel;

    // The Preview tab carries this note in its own intro, above the toggles,
    // so it has no note element here.
    if (els.note) {
      els.note.textContent = isBatch
        ? "Based on the manual's published worked example (Finnish source data, shown regardless of your selected data language, to demonstrate the scoring mechanism). In a real run, these values would be averaged across all " +
          trialCount +
          " trials in this batch — all responses to this one prompt, from one participant group."
        : "Based on the manual's published worked example (Finnish source data, shown regardless of your selected data language, to demonstrate the scoring mechanism).";
    }

    const hasAudio = !!opts.hasAudio;
    const statPrefix = isBatch ? "Mean " : "";
    const stats = [
      { value: r.totalScore, label: statPrefix + "Total score" },
      { value: r.errors.length, label: statPrefix + "Errors" },
      { value: hasAudio ? "—" : "N/A", label: "Temporal parameters", unavailable: !hasAudio },
      { value: r.meanClusterSize, label: type === "pvf" ? "Mean phonemic cluster size" : "Mean semantic cluster size" },
      { value: r.switches, label: statPrefix + "Number of switches" },
      { value: r.taskDiscrepant ? r.taskDiscrepant.count : "N/A", label: statPrefix + "Task discrepant clusters" },
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

    if (els.clusterHeading) {
      els.clusterHeading.textContent = isBatch ? "Example task-congruent clusters (one representative trial from the batch)" : "Task-congruent clusters";
    }
    if (els.errorsHeading) {
      els.errorsHeading.textContent = isBatch ? "Errors excluded from total score (same representative trial)" : "Errors excluded from total score";
    }

    function reviewBadge(status) {
      if (status === "reviewed") {
        return '<span class="cluster-review-badge is-reviewed" title="Resolved by a human reviewer in the review step">Manually reviewed</span>';
      }
      if (status === "flagged") {
        return '<span class="cluster-review-badge is-flagged" title="The manual lists more than one valid reading for this cluster — resolved via the full workflow\'s review step">Flagged for review</span>';
      }
      return "";
    }

    function renderRows(rows) {
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
          const wordList = row.words.map((w) => (row.errorWords && row.errorWords.includes(w) ? w + " (error)" : w)).join(", ");
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

    els.clusterBody.innerHTML = renderRows(r.rows);

    if (els.discrepantBody && r.taskDiscrepant) {
      els.discrepantBody.innerHTML = renderRows(r.taskDiscrepant.rows);
    }
    if (els.discrepantHeading) {
      els.discrepantHeading.textContent = isBatch
        ? "Task-discrepant clusters (same representative trial)"
        : "Task-discrepant clusters";
    }

    els.errorList.innerHTML = r.errors.map((e) => `<li><strong>${e.word}</strong> — ${e.type}. ${e.note}</li>`).join("");
  }

  // --- Step 7 results (wizard-driven) ---------------------------------------
  const step7Els = {
    badge: document.getElementById("results-trial-badge"),
    note: document.getElementById("results-source-note"),
    statGrid: document.getElementById("stat-grid"),
    clusterHeading: document.querySelector('[data-i18n="step7.clusterBreakdown"]'),
    errorsHeading: document.querySelector('[data-i18n="step7.errorsHeading"]'),
    clusterBody: document.getElementById("cluster-table-body"),
    discrepantHeading: document.getElementById("discrepant-heading"),
    discrepantBody: document.getElementById("discrepant-table-body"),
    errorList: document.getElementById("error-list"),
  };

  function renderResults() {
    renderResultsInto(step7Els, {
      type: state.taskType || "pvf",
      isBatch: state.trialMode === "multiple",
      trialCount: state.trialCount,
      hasAudio: state.mediaType === "voice",
      resolutions: reviewResolutions,
    });
  }

  // --- Step 7: download results as CSV or JSON ------------------------------
  // TODO(open question, flagged 2026): the exact downloadable-report shape
  // (CSV vs JSON structure, what a "report" even means for this tool — raw
  // per-trial data vs. a formatted summary) is still undefined. Revisit
  // whether this is needed at all before building further on it.
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
    const r = getResolvedResult(type, reviewResolutions);
    const header = [
      "trial_id",
      "task_type",
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
          : row.words.map((w) => (row.errorWords && row.errorWords.includes(w) ? w + " (error)" : w)).join("; ");
        lines.push(
          [
            1,
            type.toUpperCase(),
            csvEscape(r.trialLabel),
            r.totalScore,
            r.errors.length,
            r.meanClusterSize,
            r.switches,
            r.taskDiscrepant ? r.taskDiscrepant.count : "",
            reading,
            i + 1,
            csvEscape(wordsText),
            isSingle ? "" : row.words.length,
            isSingle ? "Non-clustering single word" : csvEscape(row.rule),
            row.reviewStatus === "reviewed" ? "TRUE" : "FALSE",
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
    const r = getResolvedResult(type, reviewResolutions);

    function toSequence(rows) {
      return rows.map((row) =>
        row.kind === "single"
          ? { type: "non_clustering_single_word", word: row.word, human_reviewed: row.reviewStatus === "reviewed" }
          : {
              type: "cluster",
              words: row.words,
              error_word: row.errorWords && row.errorWords.length ? row.errorWords[0] : null,
              rule: row.rule,
              human_reviewed: row.reviewStatus === "reviewed",
            }
      );
    }

    return JSON.stringify(
      {
        trial_id: 1,
        task_type: type,
        prompt: r.trialLabel,
        total_score: r.totalScore,
        errors: r.errors,
        mean_cluster_size: r.meanClusterSize,
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

  // --- Preview tab results (self-contained, own toggle state) ---------------
  const previewEls = {
    badge: document.getElementById("preview-trial-badge"),
    statGrid: document.getElementById("preview-stat-grid"),
    clusterHeading: document.getElementById("preview-cluster-heading"),
    errorsHeading: document.getElementById("preview-errors-heading"),
    clusterBody: document.getElementById("preview-cluster-body"),
    discrepantHeading: document.getElementById("preview-discrepant-heading"),
    discrepantBody: document.getElementById("preview-discrepant-table-body"),
    errorList: document.getElementById("preview-error-list"),
  };

  const previewState = { type: "pvf", view: "single" };

  // The Preview tab has no wizard/review step of its own — it demonstrates a
  // completed run, so every ambiguous case is shown resolved to its first
  // option ("Manually reviewed") rather than "Flagged for review".
  function buildAllReviewedResolutions(type) {
    const r = VFT_DATA.results[type];
    if (!r) return {};
    const cases = [...(r.ambiguousCases || []), ...((r.taskDiscrepant && r.taskDiscrepant.ambiguousCases) || [])];
    const resolutions = {};
    cases.forEach((c) => {
      resolutions[c.id] = c.options[0].id;
    });
    return resolutions;
  }

  function renderPreview() {
    if (!previewEls.badge) return;
    renderResultsInto(previewEls, {
      type: previewState.type,
      isBatch: previewState.view === "batch",
      trialCount: 30,
      hasAudio: false,
      resolutions: buildAllReviewedResolutions(previewState.type),
    });
  }

  document.querySelectorAll("#preview-type-toggle .segmented-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#preview-type-toggle .segmented-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      previewState.type = btn.dataset.previewType;
      renderPreview();
    });
  });

  document.querySelectorAll("#preview-view-toggle .segmented-btn").forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => {
      document.querySelectorAll("#preview-view-toggle .segmented-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      previewState.view = btn.dataset.previewView;
      renderPreview();
    });
  });

  renderPreview();

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
    if (n === 3) updatePromptExampleUI();
    if (n === 5) renderValueChecklist();
    if (n === 7) updateStep7InputCopy();
  }

  // --- Step 7: adjust copy for single trial vs. batch ----------------------
  function updateStep7InputCopy() {
    const title = document.getElementById("step7-title");
    const help = document.getElementById("step7-help");
    if (!title || !help) return;
    if (state.trialMode === "multiple") {
      title.textContent = "Add this batch's transcripts";
      help.textContent =
        "This batch has " +
        state.trialCount +
        " trials, all responses to the prompt you shared, from one participant group. Drop the batch file below, or load the manual's worked example to preview how the group result will look.";
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

  // --- Inline links that jump to another top-level tab --------------------
  document.querySelectorAll("[data-goto-tab]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector('.tab[data-tab="' + link.dataset.gotoTab + '"]');
      if (target) target.click();
    });
  });
})();
