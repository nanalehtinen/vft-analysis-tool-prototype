// Sample-protocol content sourced directly from Appendix A (Lehtinen et al., 2023,
// Applied Neuropsychology: Adult — Instruction Manual for Administration and
// Scoring Verbal Fluency Tasks). Used to drive the scripted demo walkthrough.

const VFT_DATA = {
  prompts: {
    fi: {
      pvf: {
        base: "Tässä tehtävässä pyydän sinua luettelemaan yhden minuutin aikana mahdollisimman monta yksittäistä tietyllä kirjaimella alkavaa sanaa. Nämä voivat olla mitä tahansa sanoja paitsi erisnimiä. Ainoastaan sanan ensimmäisellä kirjaimella on merkitystä. Esimerkkinä: jos pyytäisin tuottamaan sanoja T-kirjaimella, niin voisit sanoa, tuuli, taulu jne. Yritä sanoa mahdollisimman monta yksittäistä sanaa.",
        letterLine: (letter) => "Tämä kirjain on " + letter + ". Voit aloittaa.",
      },
      svf: "Tässä tehtävässä pyydän sinua luettelemaan yhden minuutin aikana mahdollisimman monta yksittäistä tiettyyn kategoriaan kuuluvaa sanaa. Esimerkkinä: jos pyytäisin sinua luettelemaan hedelmiä voisit sanoa appelsiini, omena, luumu jne. Yritä sanoa mahdollisimman monta yksittäistä sanaa.\n\nTämä kategoria on ELÄIMET. Voit aloittaa.",
    },
    en: {
      pvf: {
        base: "In this next category, I ask you to name as many words beginning with the same letter as possible within one minute. These words can be any kind of words, except proper names. The only thing that matters is the first letter of the word. For example, if I asked you to name words beginning with the letter T, you could say time, task, tunnel, and so on. Try to name as many individual words as you can.",
        letterLine: (letter) => "This letter is " + letter + ". You may begin.",
      },
      svf: "In this task I ask you to name as many individual words belonging to the same category as possible within one minute. For example, if I asked you to name different fruits, you could say orange, apple, plum, and so on. Try to name as many individual words as you can.\n\nThis category is ANIMALS. You may begin.",
    },
  },

  // Standard phonemic letter sets per language: K/A/P (Finnish, per the
  // manual's Appendix A) and F/A/S (English, the standard COWAT set).
  letters: {
    fi: ["K", "A", "P"],
    en: ["F", "A", "S"],
  },

  // The measures, as listed on the automated-analysis screen after import.
  // `key` decides whether each one is automated or manual for a task type.
  scoredValues: {
    pvf: [
      { key: "total", label: "Total score", desc: "Number of words produced, excluding errors." },
      { key: "errors", label: "Errors", desc: "Repetitions, categorical errors, paraphasias and nonwords, and language intrusions for multilingual populations." },
      { key: "temporal", label: "Temporal parameters", desc: "Words produced in each of four 15-second segments.", requiresAudio: true },
      { key: "count", label: "Number of phonemic clusters", desc: "Number of naturally occurring phonemic clusters." },
      { key: "clusterSize", label: "Mean phonemic cluster size", desc: "Mean size of naturally occurring phonemic clusters." },
      { key: "switches", label: "Number of switches", desc: "Transitions between clusters, including transitions between single words." },
      { key: "discrepant", label: "Number of task-discrepant clusters", desc: "Clusters in a different domain than the task — semantic clusters for the phonemic trial and phonemic clusters for the semantic trial." },
      { key: "discrepantSize", label: "Mean task-discrepant cluster size", desc: "Mean size of task-discrepant clusters." },
    ],
    svf: [
      { key: "total", label: "Total score", desc: "Number of words produced, excluding errors." },
      { key: "errors", label: "Errors", desc: "Repetitions, categorical errors, paraphasias and nonwords, and language intrusions for multilingual populations." },
      { key: "temporal", label: "Temporal parameters", desc: "Words produced in each of four 15-second segments.", requiresAudio: true },
      { key: "count", label: "Number of semantic clusters", desc: "Number of naturally occurring semantic clusters." },
      { key: "clusterSize", label: "Mean semantic cluster size", desc: "Mean size of naturally occurring semantic clusters." },
      { key: "switches", label: "Number of switches", desc: "Transitions between clusters, including transitions between single words." },
      { key: "discrepant", label: "Number of task-discrepant clusters", desc: "Clusters in a different domain than the task — semantic clusters for the phonemic trial and phonemic clusters for the semantic trial." },
      { key: "discrepantSize", label: "Mean task-discrepant cluster size", desc: "Mean size of task-discrepant clusters." },
    ],
  },

  // Quick guide shown while scoring by hand. The full rules live in the
  // Scoring Rules tab. Each entry renders as a bold lead followed by the rest.
  semanticRules: [
    { b: "Smallest possible cluster.", d: " Score the smallest possible clusters so that all clusters the participant generates are tracked." },
    { b: "Three or more words", d: " from the same semantic subcategory always form a cluster." },
    { b: "Two words.", d: " Two words form a cluster when the neighboring words do not belong to a broader category." },
    { b: "Associations.", d: " Associations, including antonyms, are not clusters. If further words could be added to the category, the words form a cluster." },
    { b: "Overlaps.", d: " A word linking two clusters belongs to the first cluster only." },
  ],



  // ---------------------------------------------------------------------
  // TRANSLATED SAMPLE PROTOCOL — English single-trial walkthrough.
  //
  // The manual's sample protocol word for word in English, so the English
  // path has a single trial to walk through. The semantic structure carries
  // over intact, so the same clustering decisions arise for the rater.
  //
  // This is a translation, not published English data, and is labelled as
  // such wherever it appears. Note that phonemic clustering does NOT survive
  // translation — which is one reason the phonemic task-discrepant reading
  // is not calculated for English semantic trials.
  // ---------------------------------------------------------------------
  translatedExample: {
    en: {
      svf: {
        trialLabel: "Semantic (SVF) — category Animals",
        // Index 7 is the repetition of "horse", matching the Finnish original.
        words: ["dog", "cat", "horse", "spider", "fly", "snake", "eel", "horse", "cow", "calf", "pig", "hen", "pied flycatcher", "loon", "pelican", "swan", "sparrow", "hamster", "rat", "mouse", "squirrel"],
        errorIndices: [7],
        totalScore: 20,
      },
    },
  },

  // ---------------------------------------------------------------------
  // SYNTHETIC DATA — for the batch / group-view demonstration only.
  //
  // These trials (five per language and task, and per letter for phonemic
  // trials) were created for this prototype. They are NOT
  // participant data, NOT drawn from the dissertation dataset, and NOT
  // study results. They exist so the group-level view has a realistic
  // spread to aggregate, since the single-trial path reuses one sample
  // protocol and would otherwise show SD = 0 on every metric.
  //
  // No semantic scoring is stored for these trials. Semantic clustering is
  // the rater's job, so there is deliberately no stored answer anywhere in
  // this file. The phonemic (task-discrepant) reading is not stored either:
  // it follows deterministic rules and is computed at runtime for Finnish,
  // exactly as the real tool would. For English it is not calculated.
  //
  // Phonemic trials (Finnish, letters K/A/P) store their phonemic
  // (task-congruent) reading as `phonemicRanges`, scored under rule 1.1.
  // The prototype does not implement the phonemic trial rules 1.1-1.5, so
  // this reading is stored like the published sample protocol's rather than
  // calculated. Their semantic (task-discrepant) reading is the rater's.
  //
  // The single-trial path uses `results` below, which is transcribed from
  // the published manual. The two are never mixed.
  // ---------------------------------------------------------------------
  illustrativeBatch: {
    fi: {
      pvf: {
        K: [
          { words: ["kissa", "koira", "kani", "karhu", "kaappi", "katu", "katto", "kangas", "kello", "kenkä", "kirja", "kivi", "koulu", "kori"], errorIndices: [], totalScore: 14, phonemicRanges: [[2,7],[8,9],[10,11],[12,13]] },
          { words: ["kala", "kana", "karhu", "kahvi", "kakku", "karkki", "kartta", "katto", "katu", "kauppa", "kello", "keitto", "kirja", "kivi", "kone", "kori", "koulu"], errorIndices: [], totalScore: 17, phonemicRanges: [[0,9],[10,11],[12,13],[14,16]] },
          { words: ["kukka", "kuppi", "kuva", "kumi", "koira", "kissa", "kana", "kaappi", "kangas", "katto", "katu", "kauppa", "kello", "kenkä", "kerma", "kirja", "kivi", "kori", "korkki", "koulu"], errorIndices: [], totalScore: 20, phonemicRanges: [[0,3],[6,11],[12,14],[15,16],[17,19]] },
          { words: ["kello", "kenkä", "kerma", "kevät", "kirja", "kirkko", "kirves", "kivi", "koira", "kissa", "kani", "karhu", "kone", "kori", "korkki", "koulu", "kukka", "kuppi", "kuva", "kumi", "kaappi", "katu"], errorIndices: [], totalScore: 22, phonemicRanges: [[0,3],[4,7],[10,11],[12,15],[16,19],[20,21]] },
          { words: ["kaappi", "kahvi", "kala", "kangas", "kartta", "katto", "katu", "kauppa", "kello", "kenkä", "kerma", "kirja", "kirkko", "kivi", "kone", "kori", "korkki", "koulu", "kukka", "kuppi", "kuva", "kissa", "koira", "kani"], errorIndices: [], totalScore: 24, phonemicRanges: [[0,7],[8,10],[11,13],[14,17],[18,20]] },
        ],
        A: [
          { words: ["apina", "appelsiini", "apteekki", "auto", "avain", "avaruus", "aamu", "aalto", "aita", "aika", "ankka", "ankkuri"], errorIndices: [], totalScore: 12, phonemicRanges: [[0,2],[4,5],[6,7],[8,9],[10,11]] },
          { words: ["aamu", "aamiainen", "aalto", "aarre", "aika", "aita", "apina", "appelsiini", "apteekki", "apu", "auto", "avain", "avaruus", "ankka", "ahven"], errorIndices: [], totalScore: 15, phonemicRanges: [[0,3],[4,5],[6,9],[11,12]] },
          { words: ["asia", "asema", "askel", "astia", "apina", "appelsiini", "apteekki", "apu", "auto", "avain", "avaruus", "aamu", "aalto", "aarre", "arki", "arvo", "ankka", "ahven"], errorIndices: [], totalScore: 18, phonemicRanges: [[0,3],[4,7],[9,10],[11,13],[14,15]] },
          { words: ["asia", "asema", "askel", "astia", "apina", "appelsiini", "apteekki", "apu", "auto", "avain", "avaruus", "aamu", "aalto", "aarre", "aita", "aika", "aine", "arki", "arvo", "ankka", "ahven"], errorIndices: [], totalScore: 21, phonemicRanges: [[0,3],[4,7],[9,10],[11,13],[14,16],[17,18]] },
          { words: ["asia", "asema", "askel", "astia", "apina", "appelsiini", "apteekki", "apu", "avain", "avaruus", "avanto", "avokado", "aamu", "aave", "aalto", "aarre", "aika", "aita", "aine", "aivot", "arki", "arvo", "arpa", "ankka"], errorIndices: [], totalScore: 24, phonemicRanges: [[0,3],[4,7],[8,11],[12,15],[16,19],[20,22]] },
        ],
        P: [
          { words: ["paita", "pipo", "puku", "pallo", "pankki", "paperi", "peili", "perhe", "piano", "pilvi", "posti", "porkkana", "puu"], errorIndices: [], totalScore: 13, phonemicRanges: [[3,5],[6,7],[8,9],[10,11]] },
          { words: ["pallo", "pankki", "paperi", "parta", "peili", "perhe", "pelto", "piano", "piha", "pilvi", "poika", "posti", "porkkana", "puu", "pullo", "puisto"], errorIndices: [], totalScore: 16, phonemicRanges: [[0,3],[4,6],[7,9],[10,12],[13,15]] },
          { words: ["paita", "pipo", "puku", "pallo", "pankki", "paperi", "parta", "peili", "pelto", "perhe", "piano", "piha", "pilvi", "poika", "posti", "polku", "puu", "pullo", "puisto"], errorIndices: [], totalScore: 19, phonemicRanges: [[3,6],[7,9],[10,12],[13,15],[16,18]] },
          { words: ["pallo", "pankki", "paperi", "parta", "peili", "pelto", "perhe", "peitto", "piano", "piha", "pilvi", "pippuri", "poika", "polku", "posti", "porkkana", "puu", "pullo", "puisto", "pussi", "paita", "pipo"], errorIndices: [], totalScore: 22, phonemicRanges: [[0,3],[4,7],[8,11],[12,15],[16,19]] },
          { words: ["paita", "pipo", "puku", "pallo", "pankki", "paperi", "parta", "paikka", "peili", "pelto", "perhe", "peitto", "peruna", "piano", "piha", "pilvi", "pippuri", "pisara", "poika", "polku", "posti", "porkkana", "poski", "puu", "pullo"], errorIndices: [], totalScore: 25, phonemicRanges: [[3,7],[8,12],[13,17],[18,22],[23,24]] },
        ],
      },
      svf: [
        { words: ["virtahepo", "norsu", "seepra", "kani", "leijona", "koira", "delfiini", "hylje", "mursu", "valas", "ilves", "peura", "mäyrä", "hirvi", "kettu"], errorIndices: [], totalScore: 15 },
        { words: ["lehmä", "käärme", "sammakko", "sisilisko", "perhonen", "ilves", "ahma", "kuha", "lohi", "silakka", "ahven", "krokotiili", "kotka", "haukka", "merikotka", "kanahaukka", "tiikeri", "apina", "krokotiili", "hamsteri", "marsu", "kissa", "koira", "perhonen", "mehiläinen", "kärpänen", "ampiainen", "kettu"], errorIndices: [18, 23], totalScore: 26 },
        { words: ["hanhi", "kuikka", "joutsen", "krokotiili", "seepra", "pöllö", "peippo", "kotka", "sorsa", "kotka", "kanahaukka", "haukka", "varis", "käki", "muurahainen", "kärpänen", "koira", "kani", "kissa"], errorIndices: [9], totalScore: 18 },
        { words: ["seepra", "ampiainen", "perhonen", "hyttynen", "ahven", "silakka", "marsu", "merikotka", "kotka", "kanahaukka", "haukka", "krokotiili", "susi", "jänis", "peura", "kirahvi", "apina", "seepra", "ilves", "ahma", "susi", "sammakko", "kilpikonna"], errorIndices: [17, 20], totalScore: 21 },
        { words: ["ampiainen", "hyttynen", "mehiläinen", "hevonen", "kukko", "sika", "kotka", "merikotka", "kanahaukka", "kani", "marsu", "undulaatti", "delfiini", "haukka"], errorIndices: [], totalScore: 14 },
      ],
    },
    en: {
      svf: [
        { words: ["owl", "blackbird", "seal", "turtle", "ant", "bee", "mosquito", "mouse", "vole", "duck", "swan", "goose", "seagull", "pelican"], errorIndices: [], totalScore: 14 },
        { words: ["heron", "frog", "owl", "eel", "seagull", "otter", "bear", "lizard", "turtle", "pig", "dolphin", "wasp", "fox", "herring", "salmon", "eel"], errorIndices: [15], totalScore: 15 },
        { words: ["heron", "swan", "monkey", "hawk", "eagle", "buzzard", "elephant", "snake", "frog", "mouse", "rat", "crocodile", "tiger", "monkey", "falcon", "pelican", "goose", "bee", "mosquito", "cat", "hippo", "elephant", "giraffe"], errorIndices: [13, 21], totalScore: 21 },
        { words: ["mouse", "squirrel", "parrot", "horse", "crocodile", "blackbird", "pigeon", "robin", "dog", "cat", "hamster", "sparrow", "magpie", "crow", "owl", "woodpecker", "duck", "seagull", "ant", "butterfly", "wasp", "pike", "eel", "salmon", "trout"], errorIndices: [], totalScore: 25 },
        { words: ["tiger", "rabbit", "mouse", "vole", "squirrel", "rat", "snake", "frog", "pig", "donkey", "horse", "sheep", "dolphin", "whale", "wasp", "butterfly", "ant", "walrus", "seal", "tiger", "monkey", "giraffe", "elephant", "mosquito", "bee", "fly", "crocodile", "goat"], errorIndices: [19], totalScore: 27 },
      ],
    },
  },

  // Step 7: canned results for the "Load example data" path, reproducing the
  // manual's own sample protocols (Appendix A).
  // Cluster breakdowns transcribed directly from the manual's tables; total
  // score, errors, and switches independently derived from the same word
  // sequence and cross-checked against the manual's stated mean cluster size.
  results: {
    pvf: {
      trialLabel: "Phonemic (PVF) — letter K",
      words: ["kissa", "komea", "koiras", "kaamea", "kurkkia", "kynä", "kumi", "kaunis", "komea", "korea", "kauhea", "kamala", "karu", "karkki", "karhea", "kauha", "kippo", "kuppi", "kurki", "kirjosieppo"],
      totalScore: 19,
      errors: [{ word: "komea", type: "Non-sequential repetition", note: "Excluded from the total score; can be counted in a cluster." }],
      // Index in `words` of each error, so a manually scored cluster can tag
      // the right occurrence (here the 2nd "komea", not the 1st).
      errorIndices: [8],
      meanClusterSize: 3,
      switches: 11,
      // pos = index of the cluster's first word in `words` above — used to
      // lay the results table out in true production order.
      clusters: [
        { pos: 1, words: ["komea", "koiras"], rule: "1.1 Word-initial phonemes (shared kV-)" },
        { pos: 8, words: ["komea", "korea"], rule: "1.1 + 1.3 Word-initial & first/last phonemes (non-sequential repetition)", errorWords: ["komea"] },
        { pos: 10, words: ["kauhea", "kamala", "karu", "karkki", "karhea", "kauha"], rule: "1.1 Word-initial phonemes (shared ka-)" },
        { pos: 16, words: ["kippo", "kuppi"], rule: "1.4 Consonant structure" },
      ],
      // Words the participant produced that don't belong to any cluster.
      nonClusteringWords: [
        { pos: 0, word: "kissa" },
        { pos: 3, word: "kaamea" },
        { pos: 4, word: "kurkkia" },
        { pos: 5, word: "kynä" },
        { pos: 6, word: "kumi" },
        { pos: 7, word: "kaunis" },
        { pos: 18, word: "kurki" },
        { pos: 19, word: "kirjosieppo" },
      ],
      // No genuinely ambiguous clustering call is documented for this trial
      // in the manual — the review step still runs, but finds nothing to flag.
      ambiguousCases: [],

      // Task-discrepant clustering: semantic clusters found within this
      // phonemic trial (a separate reading of the same word list, scored
      // independently per the manual). Straight from Appendix A's "Task
      // Discrepant Clustering in Phonemic Category /k/" sample protocol.
      taskDiscrepant: {
        count: 5,
        meanClusterSize: 2.6,
        clusters: [
          { pos: 5, words: ["kynä", "kumi"], rule: "2.2 Weak cluster — relates to writing" },
          { pos: 7, words: ["kaunis", "komea", "korea"], rule: "2.4 Adjectives sharing semantic properties — relates to looks", errorWords: ["komea"] },
          { pos: 15, words: ["kauha", "kippo", "kuppi"], rule: "2.1 Strong cluster — items in the kitchen" },
          { pos: 18, words: ["kurki", "kirjosieppo"], rule: "2.2 Weak cluster — birds" },
        ],
        nonClusteringWords: [
          { pos: 0, word: "kissa" },
          { pos: 1, word: "komea" },
          { pos: 2, word: "koiras" },
          { pos: 3, word: "kaamea" },
          { pos: 4, word: "kurkkia" },
          { pos: 13, word: "karkki" },
          { pos: 14, word: "karhea" },
        ],
        // Also from the manual: this cluster has two explicitly acceptable readings.
        ambiguousCases: [
          {
            id: "kauhea-kamala-karu",
            words: ["kauhea", "kamala", "karu"],
            pos: 10,
            analysisLabel: "Task-discrepant (semantic) clustering",
            options: [
              {
                id: "a",
                label: "3-word cluster — \"similar connotations\"",
                description: "kauhea, kamala, karu all cluster together as words carrying similar negative connotations.",
                clusterEntry: { pos: 10, words: ["kauhea", "kamala", "karu"], rule: "2.1 Strong cluster — carry similar connotations" },
                meanClusterSize: 2.6,
                count: 5,
              },
              {
                id: "b",
                label: "2-word cluster (+1 non-clustering)",
                description: "kauhea, kamala cluster together; karu (bare) doesn't fit that pairing and stays non-clustering.",
                clusterEntry: { pos: 10, words: ["kauhea", "kamala"], rule: "2.2 Weak cluster — carry similar connotations" },
                extraNonClustering: [{ pos: 12, word: "karu" }],
                meanClusterSize: 2.4,
                count: 5,
              },
            ],
          },
        ],
      },
    },
    svf: {
      trialLabel: "Semantic (SVF) — category Animals",
      words: ["koira", "kissa", "hevonen", "hämähäkki", "kärpänen", "käärme", "ankerias", "hevonen", "lehmä", "vasikka", "sika", "kana", "kirjosieppo", "kuikka", "pelikaani", "joutsen", "varpunen", "hamsteri", "rotta", "hiiri", "orava"],
      totalScore: 20,
      errors: [{ word: "hevonen", type: "Non-sequential repetition", note: "Excluded from the total score; can be counted in a cluster." }],
      // Index in `words` of each error — here the 2nd "hevonen", not the 1st.
      errorIndices: [7],
      // Defaults (option "a" below) — used until a human resolves the flagged case.
      meanClusterSize: 3.0,
      switches: 8,
      // The 5 unambiguous clusters. The 6th (hamsteri/rotta/hiiri/orava) is
      // withheld pending human review — see ambiguousCases below.
      clusters: [
        { pos: 0, words: ["koira", "kissa"], rule: "2.2 Weak cluster — pets" },
        { pos: 3, words: ["hämähäkki", "kärpänen"], rule: "2.2 Weak cluster — insects" },
        { pos: 5, words: ["käärme", "ankerias"], rule: "2.2 Weak cluster — visual: long, slithering animal" },
        { pos: 7, words: ["hevonen", "lehmä", "vasikka", "sika", "kana"], rule: "2.1 Strong cluster — farm animals", errorWords: ["hevonen"] },
        { pos: 13, words: ["kuikka", "pelikaani", "joutsen"], rule: "2.1 Strong cluster — aquatic birds" },
      ],
      // Words the participant produced that don't belong to any cluster.
      // (This is the 1st "hevonen" — the 2nd is the repetition tagged
      // "(error)" inside the farm-animals cluster above.)
      nonClusteringWords: [
        { pos: 2, word: "hevonen" },
        { pos: 12, word: "kirjosieppo" },
        { pos: 16, word: "varpunen" },
      ],
      // Straight from the manual's own sample protocol (Appendix A): both
      // readings of this cluster are explicitly listed as acceptable.
      ambiguousCases: [
        {
          id: "rodent-pet",
          words: ["hamsteri", "rotta", "hiiri", "orava"],
          // Index of this case's first word in the trial's `words` array —
          // used to pull real neighbouring words for on-screen context.
          pos: 17,
          options: [
            {
              id: "a",
              label: "4-word cluster — \"rodent\"",
              description: "hamsteri, rotta, hiiri, orava all cluster together under the broader taxonomic category ‘rodent’.",
              clusterEntry: { pos: 17, words: ["hamsteri", "rotta", "hiiri", "orava"], rule: "2.1 Strong cluster — rodents" },
              meanClusterSize: 3.0,
              switches: 8,
            },
            {
              id: "b",
              label: "3-word cluster — \"pet\" (+1 non-clustering)",
              description: "hamsteri, rotta, hiiri cluster as ‘pets’; orava (squirrel) doesn't fit that subgroup and stays non-clustering.",
              clusterEntry: { pos: 17, words: ["hamsteri", "rotta", "hiiri"], rule: "2.2 Weak cluster — pets" },
              extraNonClustering: [{ pos: 20, word: "orava" }],
              meanClusterSize: 2.8,
              switches: 9,
            },
          ],
        },
      ],

      // Task-discrepant clustering: phonemic clusters found within this
      // semantic trial. Straight from Appendix A's "Task Discrepant
      // Clustering in Semantic Category 'Animals'" sample protocol — no
      // ambiguous case is documented for this particular reading.
      taskDiscrepant: {
        count: 2,
        meanClusterSize: 2.5,
        clusters: [
          { pos: 4, words: ["kärpänen", "käärme"], rule: "1.1 Word-initial phonemes (shared kä-)" },
          { pos: 11, words: ["kana", "kirjosieppo", "kuikka"], rule: "1.1 Word-initial phonemes — three consecutive words sharing an initial phoneme (special rule for semantic fluency)" },
        ],
        nonClusteringWords: [
          { pos: 0, word: "koira" },
          { pos: 1, word: "kissa" },
          { pos: 2, word: "hevonen" },
          { pos: 3, word: "hämähäkki" },
          { pos: 6, word: "ankerias" },
          { pos: 7, word: "hevonen" },
          { pos: 8, word: "lehmä" },
          { pos: 9, word: "vasikka" },
          { pos: 10, word: "sika" },
          { pos: 14, word: "pelikaani" },
          { pos: 15, word: "joutsen" },
          { pos: 16, word: "varpunen" },
          { pos: 17, word: "hamsteri" },
          { pos: 18, word: "rotta" },
          { pos: 19, word: "hiiri" },
          { pos: 20, word: "orava" },
        ],
        ambiguousCases: [],
      },
    },
  },
};
