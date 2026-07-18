import type { ProjectSections } from "@/lib/types";

export const MIN_WEEKS = 1;
export const MAX_WEEKS = 52;

type SectionKey = Exclude<keyof ProjectSections, "weeks">;

export function emptySections(): ProjectSections {
  return {
    intro: "",
    whatItIs: "",
    deliverables: "",
    futureScope: "",
    stability: "",
    additionalInfo: "",
    weeks: [""],
  };
}

// Turns the structured sections into one plain-text blob. This is what gets
// saved in `content` (kept around for the DB's not-null column, downloads,
// etc.), and it's also the exact format parseSections() below reads back —
// so re-uploading a previously downloaded write-up round-trips cleanly.
export function composeContent(sections: ProjectSections): string {
  const parts: string[] = [];

  if (sections.intro.trim()) {
    parts.push(`Intro / why this project:\n${sections.intro.trim()}`);
  }
  if (sections.whatItIs.trim()) {
    parts.push(`What it is:\n${sections.whatItIs.trim()}`);
  }
  if (sections.deliverables.trim()) {
    parts.push(`Exact end deliverables:\n${sections.deliverables.trim()}`);
  }
  if (sections.futureScope.trim()) {
    parts.push(`Future scope:\n${sections.futureScope.trim()}`);
  }
  if (sections.stability.trim()) {
    parts.push(`Stability:\n${sections.stability.trim()}`);
  }

  const nonEmptyWeeks = sections.weeks
    .map((goals, i) => ({ week: i + 1, goals: goals.trim() }))
    .filter((w) => w.goals.length > 0);

  if (nonEmptyWeeks.length > 0) {
    const weekText = nonEmptyWeeks
      .map((w) => `Week ${w.week}: ${w.goals}`)
      .join("\n\n");
    parts.push(`Week-wise goals:\n${weekText}`);
  }

  if (sections.additionalInfo.trim()) {
    parts.push(`Any additional info:\n${sections.additionalInfo.trim()}`);
  }

  return parts.join("\n\n");
}

export function sectionsAreEmpty(sections: ProjectSections): boolean {
  return composeContent(sections).trim().length === 0;
}

// Recognized headers for each section, matched case-insensitively after
// stripping markdown "#"/"**" decoration and a trailing colon. Keep these
// in sync with the labels composeContent() writes above, plus a few
// reasonable variants people might type or paste from elsewhere.
const SECTION_ALIASES: Record<SectionKey, string[]> = {
  intro: [
    "intro / why this project",
    "intro/why this project",
    "intro - why this project",
    "intro",
    "introduction",
    "why this project",
  ],
  whatItIs: ["what it is", "what this is"],
  deliverables: [
    "exact end deliverables",
    "end deliverables",
    "deliverables",
    "final deliverables",
  ],
  futureScope: ["future scope", "future work", "next steps"],
  stability: ["stability", "current stability"],
  additionalInfo: [
    "any additional info",
    "additional info",
    "additional information",
    "other notes",
    "notes",
    "misc",
    "miscellaneous",
  ],
};

const WEEKS_HEADER_ALIASES = [
  "week-wise goals",
  "week wise goals",
  "weekly goals",
  "week by week goals",
  "weeks",
];

// Matches "Week N: ..." optionally prefixed by a list bullet ("- Week 1:"
// is extremely common when someone writes their plan as a bullet list), an
// abbreviation ("Wk 1:" / "Wk.1:" / "Week #1:"), and optionally a range
// ("Week 1-2:" / "Week 3–4:"), since combined-week entries like that show
// up often in practice. Typos in the word itself ("Weeek 1:") are caught
// separately by fuzzyWeekLabel() below when this fails to match.
const WEEK_LINE =
  /^(?:[-*•]\s*)?\*{0,2}(?:week|wk)\.?\s*#?\s*(\d+)(?:\s*(?:-|–|—|to)\s*(\d+))?\*{0,2}\s*[:.\-–—]?\s*(.*)$/i;

function stripHeaderDecoration(line: string): string {
  return line.replace(/\*\*/g, "").replace(/^#{1,6}\s*/, "");
}

function normalizeHeader(text: string): string {
  return text
    .trim()
    .replace(/:\s*$/, "")
    .replace(/[()[\]{}?!.,;]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// --- fuzzy header matching (no external dependency) ---
//
// The alias lists above only catch phrasings someone thought to add ahead
// of time. Real uploads reword headers ("Why does this project exist?"
// instead of "why this project"), typo them, or punctuate them
// differently — an exact-match lookup misses all of that. Fuzzy matching
// scores a candidate header against every known alias and accepts the
// best match above a threshold, so close variants land in the right
// section instead of falling through into whichever section came before.

// Classic edit-distance between two strings (iterative, O(n*m), no deps).
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// 0..1, 1 = identical. Good at catching typos/punctuation drift where the
// two strings are close letter-for-letter.
function charSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// 0..1 Dice coefficient over shared words, order-independent. Good at
// catching reworded headers ("why does this project exist" vs "why this
// project") that character edit-distance alone would score as far apart.
function tokenSimilarity(a: string, b: string): number {
  const wordsA = a.split(" ").filter(Boolean);
  const wordsB = b.split(" ").filter(Boolean);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const setB = new Set(wordsB);
  let shared = 0;
  for (const w of wordsA) if (setB.has(w)) shared++;
  return (2 * shared) / (wordsA.length + wordsB.length);
}

function headerSimilarity(a: string, b: string): number {
  return Math.max(charSimilarity(a, b), tokenSimilarity(a, b));
}

// How close a candidate header has to be to a known alias to count as a
// match. High enough that unrelated short headers don't coincidentally
// match each other; low enough to absorb typos, punctuation, and
// reworded phrasing.
const HEADER_MATCH_THRESHOLD = 0.68;

// Real headers are short (1-6 words). Capping the candidate length before
// attempting a fuzzy match keeps a stray colon in the middle of an
// ordinary paragraph ("Note: keep this scoped small" as body text, say)
// from being scored against the alias list at all.
const MAX_HEADER_WORDS = 6;

type HeaderMatch = { section: SectionKey } | { section: "weeks" };

// Tries an exact alias match first (unchanged, zero behavior change for
// every upload that already worked), then falls back to fuzzy scoring
// against every section + "weeks" alias and returns the best match if it
// clears HEADER_MATCH_THRESHOLD. `allowFuzzy` should only be true when the
// source line ends in a colon — a deliberate, structural header signal —
// otherwise ordinary body prose that happens to echo a header's wording
// (e.g. "Why does this project exist." right under an "Intro" header)
// would get mistaken for a second header and swallow its own content.
function matchHeader(headerCandidate: string, allowFuzzy = true): HeaderMatch | null {
  if (!headerCandidate) return null;

  if (WEEKS_HEADER_ALIASES.includes(headerCandidate)) return { section: "weeks" };
  const exactKey = (Object.keys(SECTION_ALIASES) as SectionKey[]).find((key) =>
    SECTION_ALIASES[key].includes(headerCandidate)
  );
  if (exactKey) return { section: exactKey };

  if (!allowFuzzy) return null;

  if (headerCandidate.split(" ").filter(Boolean).length > MAX_HEADER_WORDS) {
    return null;
  }

  // Single short words are the riskiest case for fuzzy matching: an inline
  // aside like "Note: keep this scoped small" is one edit away from the
  // "notes" alias, but it isn't a header at all. Require an exact match
  // for single-word candidates under 5 characters; fuzzy leeway only
  // kicks in for longer or multi-word candidates, where a coincidental
  // collision with unrelated body text is far less likely.
  const candidateWords = headerCandidate.split(" ").filter(Boolean);
  if (candidateWords.length === 1 && headerCandidate.length < 5) {
    return null;
  }

  let best: { match: HeaderMatch; score: number } | null = null;

  for (const alias of WEEKS_HEADER_ALIASES) {
    const score = headerSimilarity(headerCandidate, alias);
    if (!best || score > best.score) best = { match: { section: "weeks" }, score };
  }
  for (const key of Object.keys(SECTION_ALIASES) as SectionKey[]) {
    for (const alias of SECTION_ALIASES[key]) {
      const score = headerSimilarity(headerCandidate, alias);
      if (!best || score > best.score) best = { match: { section: key }, score };
    }
  }

  if (!best || best.score < HEADER_MATCH_THRESHOLD) return null;
  return best.match;
}

// Typo tolerance for the week label itself ("Weeek 3:", "Wek 1:") for the
// cases WEEK_LINE's literal "week|wk" doesn't already cover. Requires the
// first word to be close to "week" *and* immediately followed by a digit,
// so ordinary short words (like "wee") don't get mistaken for it.
function fuzzyWeekLabel(strippedLine: string): boolean {
  const match = strippedLine.match(/^(?:[-*•]\s*)?\*{0,2}([a-z]{2,6})\.?\s*#?\s*\d/i);
  if (!match) return false;
  const word = match[1].toLowerCase();
  if (word === "week" || word === "wk") return false; // already handled by WEEK_LINE
  return levenshtein(word, "week") <= 1;
}

function joinAndTrim(lines: string[]): string {
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Cursor =
  | { type: "none" }
  | { type: "section"; key: SectionKey }
  | { type: "week"; index: number };

// Best-effort parser for an uploaded .md/.txt file: looks for lines that
// match the section headers above (optionally with inline content right
// after the colon), and separately recognizes "Week N" lines anywhere as
// the start of that week's goals. Anything before the first recognized
// header is treated as the intro. If nothing at all is recognized, the
// whole file becomes the intro, same as importing an older free-text
// project. Returns `matchedAnything` so the caller can tell the user
// whether headers were actually found.
export function parseSections(raw: string): {
  sections: ProjectSections;
  matchedAnything: boolean;
} {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  const buckets: Record<SectionKey, string[]> = {
    intro: [],
    whatItIs: [],
    deliverables: [],
    futureScope: [],
    stability: [],
    additionalInfo: [],
  };
  const weekBuckets: string[][] = [];
  // "Week 1-2: ..." style ranges get written into the start week's bucket
  // as they're parsed; recorded here so the end week can be backfilled
  // with the same text once parsing finishes (see below).
  const weekRangeLinks: Array<{ start: number; end: number }> = [];
  const preamble: string[] = [];

  let cursor: Cursor = { type: "none" };
  let matchedAnything = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const stripped = stripHeaderDecoration(trimmed);

    const weekMatch = stripped.match(WEEK_LINE);
    if (weekMatch) {
      matchedAnything = true;
      const startNum = parseInt(weekMatch[1], 10);
      const endNum = weekMatch[2] ? parseInt(weekMatch[2], 10) : startNum;
      const rest = weekMatch[3].trim();
      while (weekBuckets.length < Math.max(startNum, endNum)) weekBuckets.push([]);
      cursor = { type: "week", index: startNum - 1 };
      if (endNum > startNum) weekRangeLinks.push({ start: startNum, end: endNum });
      if (rest) weekBuckets[startNum - 1].push(rest);
      continue;
    }

    // WEEK_LINE missed it (e.g. "Weeek 3:" or "Wk3 -"), but the label is one
    // typo away from "week" and is immediately followed by a number —
    // extract it the same way rather than treating the whole line as body
    // text under whatever section came before it.
    if (fuzzyWeekLabel(stripped)) {
      const numMatch = stripped.match(/(\d+)(?:\s*(?:-|–|—|to)\s*(\d+))?\s*[:.\-–—]?\s*(.*)$/i);
      if (numMatch) {
        matchedAnything = true;
        const startNum = parseInt(numMatch[1], 10);
        const endNum = numMatch[2] ? parseInt(numMatch[2], 10) : startNum;
        const rest = numMatch[3].trim();
        while (weekBuckets.length < Math.max(startNum, endNum)) weekBuckets.push([]);
        cursor = { type: "week", index: startNum - 1 };
        if (endNum > startNum) weekRangeLinks.push({ start: startNum, end: endNum });
        if (rest) weekBuckets[startNum - 1].push(rest);
        continue;
      }
    }

    const colonIdx = stripped.indexOf(":");
    const headerCandidate = normalizeHeader(
      colonIdx >= 0 ? stripped.slice(0, colonIdx) : stripped
    );
    const afterColon = colonIdx >= 0 ? stripped.slice(colonIdx + 1).trim() : "";

    const headerMatch = matchHeader(headerCandidate, colonIdx >= 0);
    if (headerMatch) {
      matchedAnything = true;
      if (headerMatch.section === "weeks") {
        cursor = { type: "none" };
      } else {
        cursor = { type: "section", key: headerMatch.section };
        if (afterColon) buckets[headerMatch.section].push(afterColon);
      }
      continue;
    }

    if (cursor.type === "section") {
      buckets[cursor.key].push(line);
    } else if (cursor.type === "week") {
      weekBuckets[cursor.index].push(line);
    } else {
      preamble.push(line);
    }
  }

  for (const { start, end } of weekRangeLinks) {
    if (weekBuckets[end - 1].length === 0 && weekBuckets[start - 1].length > 0) {
      weekBuckets[end - 1] = [...weekBuckets[start - 1]];
    }
  }

  const sections: ProjectSections = {
    intro: joinAndTrim(buckets.intro),
    whatItIs: joinAndTrim(buckets.whatItIs),
    deliverables: joinAndTrim(buckets.deliverables),
    futureScope: joinAndTrim(buckets.futureScope),
    stability: joinAndTrim(buckets.stability),
    additionalInfo: joinAndTrim(buckets.additionalInfo),
    weeks: weekBuckets.length > 0 ? weekBuckets.map(joinAndTrim) : [""],
  };

  if (!matchedAnything) {
    // Nothing recognized at all — the whole file becomes the intro, same
    // as importing an older free-text project.
    sections.intro = joinAndTrim(lines);
  } else {
    const preambleText = joinAndTrim(preamble);
    if (preambleText) {
      sections.intro = sections.intro
        ? `${preambleText}\n\n${sections.intro}`
        : preambleText;
    }
  }

  if (sections.weeks.length === 0) sections.weeks = [""];

  return { sections, matchedAnything };
}

export type ParsedProjectDraft = {
  title: string;
  sections: ProjectSections;
};

// A boundary line marking the start of a new project write-up: a
// markdown H1/H2 ("# My Project"), or an explicit "Project: Title" /
// "Project 2: Title" line.
const PROJECT_TITLE_LINE = /^(?:#{1,2}\s+(.+)|project\s*\d*\s*[:\-\u2013\u2014]\s*(.+))$/i;

// A bare horizontal rule on its own line ("---", "***", "___"), commonly
// used to visually separate stacked documents. It never starts a project
// block by itself — only the heading that follows it does — so it's just
// skipped rather than matched as a boundary.
const HR_LINE = /^([-*_])\1{2,}\s*$/;

const MIN_PROJECT_BOUNDARIES = 2;

function looksLikeProjectTitle(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(PROJECT_TITLE_LINE);
  if (!match) return null;
  const title = (match[1] ?? match[2] ?? "").trim();
  if (!title) return null;

  // Don't let a genuine section header written as "# Deliverables" get
  // mistaken for a project title just because it's an H1/H2.
  const normalized = normalizeHeader(stripHeaderDecoration(title));
  if (matchHeader(normalized)) return null;

  return title;
}

// Looks for multiple project write-ups stacked back-to-back in one
// uploaded file (e.g. a doc someone pasted several project ideas into)
// and splits them apart, running parseSections() on each chunk. Returns
// null — meaning "just one project, use the normal flow" — unless it
// finds at least two confident project-title boundaries with nothing but
// blank space ahead of the first one. That keeps every existing
// single-project upload parsing exactly as it did before.
export function splitMultipleProjects(raw: string): ParsedProjectDraft[] | null {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  type Block = { title: string; lines: string[] };
  const blocks: Block[] = [];
  let current: Block | null = null;
  let sawContentBeforeFirstTitle = false;

  for (const line of lines) {
    if (HR_LINE.test(line)) continue;

    const title = looksLikeProjectTitle(line);
    if (title) {
      current = { title, lines: [] };
      blocks.push(current);
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else if (line.trim()) {
      sawContentBeforeFirstTitle = true;
    }
  }

  if (blocks.length < MIN_PROJECT_BOUNDARIES) return null;
  // Real content before the first recognized title means this probably
  // isn't a multi-project bundle after all — bail out rather than
  // silently drop that text on the floor.
  if (sawContentBeforeFirstTitle) return null;

  // A heading with nothing but blank lines before the next heading isn't a
  // project write-up — it's almost always a grouping/category header (e.g.
  // "## GRADE 3-5" used to cluster the real projects underneath it, or a
  // "# Blue Robins — Full Project List" title sitting over the whole doc).
  // Real project write-ups always have at least one non-empty line of
  // content, so drop the empty ones instead of turning every organizational
  // heading into its own blank draft.
  const contentfulBlocks = blocks.filter((block) =>
    block.lines.some((line) => line.trim().length > 0)
  );

  if (contentfulBlocks.length < MIN_PROJECT_BOUNDARIES) return null;

  return contentfulBlocks.map((block) => {
    const { sections } = parseSections(block.lines.join("\n"));
    return { title: block.title, sections };
  });
}
