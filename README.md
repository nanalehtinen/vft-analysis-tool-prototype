# VFT Scoring Tool — prototype

A prototype of a research tool for partially automated scoring of verbal fluency task (VFT) performance, based on the administration and scoring manual published in:

> Lehtinen, N., Luotonen, I., & Kautto, A. (2023). Systematic administration and analysis of verbal fluency tasks: Preliminary evidence for reliable exploration of processes underlying task performance. *Applied Neuropsychology: Adult, 30*(6), 727–739. https://doi.org/10.1080/23279095.2021.1973471

**Try it:** https://nanalehtinen.github.io/vft-analysis-tool-prototype/

## The idea

Parts of the scoring protocol are fully defined by deterministic rules; those are scored automatically. Decisions that need semantic or linguistic judgement are shown to the researcher in a structured manual-scoring step (human in the loop). All data is processed locally in the browser, which supports GDPR-compliant use.

## Status

This is a **workflow and interface prototype**, not a working analysis tool.

Works in the prototype:
- The full step-by-step workflow: data language (Finnish / English), task type, task prompt, data format, choice of measures, manual scoring and results.
- Choosing the full protocol or a custom set of measures; results show only the selected measures.
- Guidance and Scoring Rules tabs with the scoring manual.

Not included yet:
- The validated analysis engine. Single trials use the manual's published sample protocol; batches use synthetic demo data.
- Voice recordings as input, and temporal parameters from audio.
- Phonemic scoring rules for English.
- Downloading results (the Download section is shown but disabled).

## Running it

Plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser, or use the live demo above.

## How it was built

Designed by Nana Lehtinen; code written with AI assistance (Claude Code), marked with `Co-Authored-By` lines in the commits.
