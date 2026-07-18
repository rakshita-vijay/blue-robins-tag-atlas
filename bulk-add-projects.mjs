// bulk-add-projects.mjs
// Adds all 12 Blue Robins project ideas to your Tag Atlas board in one run,
// matching the real `sections` JSONB structure used by ProjectForm.tsx.
//
// SETUP:
// 1. npm install @supabase/supabase-js   (inside your tag-atlas project folder)
// 2. Get your service_role key: Supabase dashboard -> Project Settings -> API -> service_role (secret)
// 3. Set USER_ID below to your own user id (see get-user-id.mjs).
// 4. Run:
//      SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_real_service_role_key node bulk-add-projects.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = '928656d1-cade-4864-b689-37cadbf35a14';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Mirrors composeContent() in ProjectForm.tsx exactly, so `content` matches
// what the app itself would generate from these sections.
function composeContent(sections) {
  const parts = [];
  if (sections.intro.trim()) parts.push(`Intro / why this project:\n${sections.intro.trim()}`);
  if (sections.whatItIs.trim()) parts.push(`What it is:\n${sections.whatItIs.trim()}`);
  if (sections.deliverables.trim()) parts.push(`Exact end deliverables:\n${sections.deliverables.trim()}`);
  if (sections.futureScope.trim()) parts.push(`Future scope:\n${sections.futureScope.trim()}`);
  if (sections.stability.trim()) parts.push(`Stability:\n${sections.stability.trim()}`);

  const nonEmptyWeeks = sections.weeks
    .map((goals, i) => ({ week: i + 1, goals: goals.trim() }))
    .filter((w) => w.goals.length > 0);

  if (nonEmptyWeeks.length > 0) {
    const weekText = nonEmptyWeeks.map((w) => `Week ${w.week}: ${w.goals}`).join('\n\n');
    parts.push(`Week-wise goals:\n${weekText}`);
  }

  return parts.join('\n\n');
}

const projects = [
  {
    title: 'Kindness Ledger',
    tags: ['data logging', 'basic graphs', 'visualization', 'social good', 'classroom tool'],
    sections: {
      intro: 'Kids this age already do dozens of small acts of kindness a day and get zero feedback loop on it. This project turns something invisible (helping behavior) into something visible and trackable, the way a fitness tracker does for steps.',
      whatItIs: 'A simple logging app where a class or family enters small acts of help — who helped whom, and what happened. Stores entries and visualizes them as a growing network: streaks per person, "ripple chains" (A helped B, B helped C), and a weekly summary.',
      deliverables: 'Deployed, working web app with name-based entry (no heavy auth needed). A visualization page showing the kindness network for the current month. A one-page "how it works" explainer for teacher/parent.',
      futureScope: 'School-wide leaderboard across multiple classes. Auto-generated weekly "kindness report" emailed to parents/teachers. Anonymized version for larger deployment.',
      stability: 'High. All tools used are mature and free, don\'t require ongoing maintenance once deployed. Firebase/Supabase free tiers are stable for classroom-scale data (dozens of entries/week). Tech stack: HTML/CSS/JS or React, Firebase/Supabase free tier, Chart.js/D3. Cost: Free.',
      weeks: [
        'Concept + wireframing. Sketch the entry form and the network view. No code yet.',
        'Continue wireframing; finalize what the network view should show.',
        'Build the basic entry form (name, who helped, what happened), connect to Firebase/Supabase.',
        'Finish entry form + DB connection, start basic error handling.',
        'Build the feed view — a scrollable list of all logged entries.',
        'Polish feed view, add filtering by week/person.',
        'Build the first visualization — bar chart of who\'s helped the most this week.',
        'Refine the bar chart visualization, add weekly toggle.',
        'Build the "ripple chain" visualization — tracing A→B→C chains graphically. Technical centerpiece.',
        'Continue ripple chain viz, handle edge cases (loops, isolated entries).',
        'Polish UI, add basic styling, make it usable by non-technical adults.',
        'Deploy to Vercel/Netlify, test with real classroom data if possible.',
        'Write the one-page explainer doc; get feedback from a real teacher/parent if possible.',
        'Final polish, bug fixes, presentation prep.',
      ],
    },
  },
  {
    title: 'Talk To Me Boards',
    tags: ['accessibility', 'assistive tech', 'UI/UX', 'text-to-speech', 'social impact'],
    sections: {
      intro: 'AAC (augmentative and alternative communication) tools are one of the most impactful pieces of assistive software that exist, but almost all commercial ones are locked behind expensive licenses. A student building even a basic version and getting it in front of one real non-verbal child is a genuinely meaningful outcome.',
      whatItIs: 'A drag-and-drop board builder where symbols/pictures are arranged into a sentence, read aloud via text-to-speech. The student builds both the "builder" (drag-and-drop editor) and the "player" (the simplified interface a child would actually use).',
      deliverables: 'Working board editor (add/arrange/remove symbols). Working "play mode" — simplified, large-button interface for the actual user. A starter symbol library (15-20 common words/needs: want, help, more, stop, bathroom, etc.).',
      futureScope: 'Custom photo uploads instead of generic symbols. Multi-language speech output. Board-sharing between families facing similar needs. Eye-tracking or switch-based input for kids with motor impairments too, tying into the Universal Access Engine project.',
      stability: 'High. Web Speech API is supported in all major browsers and free with no rate limits for typical use. No backend strictly needed for a single-user version. Tech stack: React or plain HTML/JS, Web Speech API. Cost: Free.',
      weeks: [
        'Research real AAC boards for inspiration on symbol sets and layout conventions.',
        'Wireframe both editor and play mode.',
        'Build the static symbol grid — tappable icons that speak their word aloud via Web Speech API.',
        'Test and refine the symbol grid across a few different words.',
        'Build sentence construction — tapping multiple symbols builds a sentence read aloud as a whole.',
        'Refine sentence construction, handle edge cases (empty sentence, single word).',
        'Build the drag-and-drop editor so boards can be customized.',
        'Continue drag-and-drop editor — add/remove/rearrange symbols.',
        'Build board saving/loading (multiple boards for multiple contexts).',
        'Test save/load across sessions, fix bugs.',
        'Add a starter symbol library covering common needs/words.',
        'Simplify and enlarge the "play mode" UI (large tap targets, high contrast).',
        'If possible, get feedback from a real parent/therapist or special-education teacher; refine.',
        'Final polish, deploy, presentation prep.',
      ],
    },
  },
  {
    title: 'My Neighborhood, Mapped by Kids',
    tags: ['mapping', 'crowdsourcing', 'geolocation', 'community', 'storytelling'],
    sections: {
      intro: 'Every mapping tool is built by adults, for adult concerns. Kids notice a completely different layer of the world. This project takes that instinct seriously and turns it into real, if small, community documentation.',
      whatItIs: 'A crowdsourced map where kids drop pins on places that matter to them, each with a photo and/or a short recorded audio note explaining why the spot matters.',
      deliverables: 'Working interactive map with custom pins. Each pin supports a photo upload and/or short audio note. A simple public/shareable view link.',
      futureScope: 'Expand to a whole school or neighborhood as an ongoing "living map". Add a "map through the years" feature to show how kids\' favorite spots change over time.',
      stability: 'High for Leaflet.js (fully open-source, no API key or usage limits). Google Maps API free tier is generous but has a usage cap worth watching if scaled beyond a classroom. Tech stack: Leaflet.js or Google Maps API, Firebase/Supabase for pins/photos/audio. Cost: Free.',
      weeks: [
        'Decide on Leaflet vs Google Maps, get a basic map rendering centered on the student\'s own area.',
        'Continue map setup, style base map.',
        'Add basic pin-dropping functionality (click map, pin appears).',
        'Test and refine pin-dropping across devices.',
        'Add a pin detail panel — name, description text field.',
        'Refine pin detail panel UI.',
        'Add photo upload per pin.',
        'Test photo upload, handle file size/type errors.',
        'Add audio recording/playback per pin — the technically hardest part.',
        'Continue audio recording feature, test playback across browsers.',
        'Style the map and pins to feel kid-friendly (custom pin icons, colors).',
        'Deploy and generate a shareable public link.',
        'Run a real pin-collecting session with actual kids if possible.',
        'Final polish, presentation prep.',
      ],
    },
  },
  {
    title: 'The Unfair Vote',
    tags: ['game theory', 'social choice theory', 'multiplayer', 'civics', 'algorithms'],
    sections: {
      intro: 'Every kid has experienced a group unable to agree on what to watch or play, and every kid has experienced an "unfair" vote outcome without being able to say why. This project gives them real mathematical vocabulary to explain something they\'ve felt intuitively their whole life.',
      whatItIs: 'A multiplayer app for real group decisions where the same set of votes can be tallied under different voting methods — plurality, ranked-choice, Borda count, approval voting — and the winner can literally change depending on which method is used.',
      deliverables: 'Working multiplayer voting app (create a poll, invite friends via link/code, vote, see results). All 4 voting methods implemented and toggleable. A results comparison screen showing how the winner changes by method. A short 1-2 page written piece on why the US still uses plurality voting.',
      futureScope: 'Real classroom/student-council election-method demo day. Expand to more exotic voting systems (STAR voting, quadratic voting) as an advanced extension.',
      stability: 'Medium-high. WebSockets add real complexity for a first-time student compared to simple REST — budget extra time for connection debugging, the most common failure point in real-time apps. Tech stack: Socket.io, React/HTML, Node.js backend. Cost: Free (Render/Vercel free tiers).',
      weeks: [
        'Learn the core voting methods conceptually through worked-by-hand examples before any code.',
        'Continue voting theory basics; discuss real-world plurality vs ranked-choice examples.',
        'Build the basic poll creation flow (create a poll with options, no real-time yet).',
        'Finish poll creation flow, add basic vote submission.',
        'Add Socket.io for real-time — multiple users join a poll session and vote live.',
        'Debug and stabilize real-time connections.',
        'Implement plurality and ranked-choice tallying logic.',
        'Test plurality/ranked-choice against hand-worked examples.',
        'Implement Borda count and approval voting tallying logic.',
        'Test Borda/approval against hand-worked examples.',
        'Build the "compare all methods" results screen.',
        'Real-world test — run an actual group decision using the app with friends/classmates.',
        'Write the short piece on plurality voting\'s flaws, informed by testing.',
        'Final polish, deploy, presentation prep.',
      ],
    },
  },
  {
    title: 'CaseFile: Cyber Mystery ARG',
    tags: ['HCI', 'storytelling', 'log analysis', 'pattern recognition', 'cybersecurity literacy'],
    sections: {
      intro: 'Cybersecurity education for kids usually means either "don\'t click suspicious links" (too shallow) or actual malware handling (too risky). This project teaches the real skill underlying cybersecurity work — pattern recognition across logs, timelines, and evidence — entirely through fiction the student writes themselves.',
      whatItIs: 'An interactive-fiction investigation game. The student authors a fictional company data breach — fake server logs, fake emails, fake network diagrams — and hides a solvable trail of clues for a player (a "junior analyst") to piece together.',
      deliverables: 'A complete, playable investigation game with a defined start, clue trail, and solvable ending. A "case file" of fictional evidence documents authored by the student. A short reflection on what real log analysis / pattern recognition looks like in actual cybersecurity work.',
      futureScope: 'Branching endings, difficulty tiers. A "build your own case" toolkit so other students can author new cases on the same engine.',
      stability: 'High if using Twine (mature, made exactly for this). Slightly more effort if custom-built in React, but low-risk since no backend/persistence is needed for single-player. Tech stack: Twine or React, static hosting. Cost: Free.',
      weeks: [
        'Study real (public, legal) breach case studies/write-ups for inspiration on realistic evidence types.',
        'Continue research; note realistic timestamp/log formats.',
        'Write the fictional breach story outline — who did it, how, what evidence would exist.',
        'Finalize story outline and clue-solvability plan.',
        'Author the fake evidence documents (logs, emails, diagrams) with the actual solvable clues.',
        'Continue authoring evidence documents.',
        'Build the game shell (Twine or React) — navigation between evidence pieces.',
        'Continue building the game shell, add basic UI.',
        'Wire up the clue-dependency logic (evidence only "makes sense" once combined).',
        'Test clue-dependency logic for consistency.',
        'Playtest with a friend/sibling who hasn\'t seen the story.',
        'Refine based on playtest feedback (clue difficulty, pacing).',
        'Write the reflection piece connecting the exercise to real log-analysis skills.',
        'Final polish, deploy, presentation prep.',
      ],
    },
  },
  {
    title: 'Card Engine (not just a card game)',
    tags: ['game engine design', 'rules systems', 'AI opponents', 'software architecture'],
    sections: {
      intro: 'Most "build a card game" tutorials end with a clone of an existing game. This project flips the framing: build the engine first (the reusable rules system), then design an original game on top of it — a structural choice that makes the result genuinely the student\'s own IP.',
      whatItIs: 'A from-scratch card game rules engine — deck definitions, turn order, card effects, win conditions — driven by a config file, so changing the config produces a different game entirely. The student then designs their own original card game using the engine, plus a simple AI opponent.',
      deliverables: 'A working, generalized card engine (not hardcoded to one game). One original, fully playable card game built on the engine. A basic AI opponent (minimax or Monte Carlo Tree Search). Documentation showing how the config file works.',
      futureScope: 'Open-source the engine so other students can build their own games on it. Add a simple multiplayer mode.',
      stability: 'Medium. The engine architecture (genuinely swappable rules via config, not hardcoded) is the hardest part and will take real iteration. The AI opponent is well-documented and lower-risk once the engine is solid. Tech stack: JavaScript/TypeScript, Canvas or React. Cost: Free.',
      weeks: [
        'Study 2-3 existing card games\' rule structures to understand what a rules engine needs to support.',
        'Continue rules-structure research; list common patterns (turns, effects, win conditions).',
        'Design the config file format (what a "game definition" looks like as data).',
        'Refine config file format with test cases.',
        'Build the core engine loop — turns, card plays, state updates — driven entirely by config.',
        'Continue core engine loop; test with a simple placeholder game.',
        'Design the student\'s own original card game concept (rules, cards, win condition) as a config.',
        'Finalize original game design as a config file.',
        'Build the visual layer — rendering cards, hands, turns on screen.',
        'Continue visual layer, polish card animations/interactions.',
        'Build the AI opponent using minimax or Monte Carlo Tree Search.',
        'Tune the AI opponent to the student\'s specific original game.',
        'Playtest with friends/classmates, balance the game rules based on feedback.',
        'Final polish, write engine documentation, presentation prep.',
      ],
    },
  },
  {
    title: "The Devil's Advocate Investing Coach",
    tags: ['behavioral finance', 'LLM prompting', 'data visualization', 'personal analytics', 'fintech'],
    sections: {
      intro: 'Every "teach a kid to invest" project builds either a stock predictor or an auto-trader — tools that make the decision for the student. The real skill worth building is recognizing one\'s own bad reasoning in the moment, which is exactly what real behavioral finance research studies.',
      whatItIs: 'A tiered investing simulator (Beginner/Intermediate/Advanced), using real market data but entirely fake money throughout. Before every trade, an AI "critic" challenges the student\'s stated reasoning against known behavioral finance biases, and every trade + reasoning + critique is logged into a personal decision journal.',
      deliverables: 'Working 3-tier simulator with real market data (free API) and paper-money trading. Working AI critic that challenges trade reasoning against real behavioral finance concepts before each trade. A personal decision journal / dashboard showing trade history and reasoning over time. A short self-research writeup on which biases showed up most and whether they reduced over the engagement.',
      futureScope: 'Real (small) brokerage integration once the student turns 18. Positioning as a genuine fintech-literacy product pitchable beyond this one student.',
      stability: 'Medium-high. Market data APIs (yfinance especially) can have occasional rate-limit or schema changes — build with a fallback/cache layer. LLM API costs are very low at this scale but should be monitored. Tech stack: yfinance or Alpaca, Python or React, OpenAI/Claude API for the critic. Cost: Free (paper trading free; LLM calls low volume).',
      weeks: [
        'Learn core behavioral finance concepts (loss aversion, herding, overconfidence, recency bias) through case studies, before any code.',
        'Continue behavioral finance research; identify which biases the critic will focus on.',
        'Set up market data pipeline (yfinance/Alpaca) and build the Beginner tier — fake-money buy/sell against real prices.',
        'Finish Beginner tier, test against live/delayed market data.',
        'Build the trade reasoning input — student writes why they\'re making a trade before confirming.',
        'Refine reasoning input UI.',
        'Build the AI critic — prompts the LLM to evaluate reasoning against known biases.',
        'Test and refine AI critic prompts for quality and consistency.',
        'Build the decision journal/dashboard — running log of trades, reasoning, and critiques over time.',
        'Polish dashboard visualizations.',
        'Build the Intermediate tier (position sizing, diversification rules).',
        'Build the Advanced tier (trend/technical indicators, more sophisticated critique).',
        'Use the app for real over multiple days/weeks to generate genuine personal data.',
        'Write the self-research piece, final polish, presentation prep.',
      ],
    },
  },
  {
    title: 'Migration Copilot',
    tags: ['data engineering', 'database migration', 'schema diffing', 'automation', 'SQL'],
    sections: {
      intro: 'Database migration is unglamorous but consistently in-demand in real data engineering jobs. Building a genuine (if scoped-down) schema migration assistant is a much stronger resume line than "I learned SQL" — it\'s the kind of tool a working engineer would actually want.',
      whatItIs: 'An AI-assisted schema-diffing and migration-generation tool. Given two database schemas (e.g., Oracle and Postgres), it detects type mismatches, generates the migration script, flags risky conversions, and runs a data-integrity validation pass after the migration completes.',
      deliverables: 'Working CLI tool that takes two schema definitions and outputs a diff report. Auto-generated migration script based on the diff. A validation pass checking data integrity after migration. A written report summarizing what the tool catches and its known limitations.',
      futureScope: 'Extend to more database pairs (MySQL, SQL Server, MongoDB). Package and publish as an open-source CLI tool.',
      stability: 'Medium. Oracle\'s free/express edition Docker images can be finicky to set up — budget real time in week 1-2 just for environment setup. Postgres side is very stable. This is the most infrastructure-heavy project on the list. Tech stack: Python, SQLAlchemy, Docker, optional LLM for fix suggestions. Cost: Free.',
      weeks: [
        'Set up local Docker environments for both Oracle Express and Postgres.',
        'Get basic connectivity working from Python via SQLAlchemy to both databases.',
        'Build the schema introspection layer — reading table/column/type definitions from both databases.',
        'Test introspection against sample schemas of increasing complexity.',
        'Build the diffing logic — comparing schemas and flagging mismatches.',
        'Refine diffing logic, handle edge cases (nullable changes, constraint differences).',
        'Build migration script generation — turning the diff into actual runnable SQL/DDL.',
        'Test generated migration scripts against sample databases.',
        'Build the risky-conversion flagging system with clear human-readable warnings.',
        'Refine risky-conversion detection (precision loss, encoding mismatches).',
        'Build the post-migration validation pass — row counts, spot-checking data integrity.',
        'Continue validation pass, add more integrity checks.',
        'Test the whole pipeline end-to-end on a few sample schemas of increasing complexity.',
        'Write the final report, final polish, presentation prep.',
      ],
    },
  },
  {
    title: 'Consensus Engine',
    tags: ['game theory', 'social choice theory', 'real-time systems', 'algorithm design'],
    sections: {
      intro: 'Group decisions with real stakes are usually resolved by whoever\'s loudest or most stubborn — not because there\'s no better method, but because nobody\'s built an easy tool for the better methods. This project takes real social choice theory and makes it usable for actual high-stakes group decisions.',
      whatItIs: 'A general-purpose group-decision app built on real social choice algorithms — Condorcet methods, quadratic voting — with an explainer layer showing exactly how each method can be gamed or manipulated.',
      deliverables: 'Working real-time multiplayer app for creating and running group decisions. Condorcet method and quadratic voting both implemented and selectable. A "how this can be gamed" explainer built into the results screen. Deployed, shareable app usable for real decisions.',
      futureScope: 'Positioned as an actual small real-world product students could use in daily life. Potential real startup pitch material.',
      stability: 'Medium-high — same WebSocket complexity as The Unfair Vote. Condorcet method logic has known edge cases (cycles / no clear winner) needing explicit handling — a real and interesting CS problem, not just a bug to avoid. Tech stack: Socket.io, React, Node.js. Cost: Free.',
      weeks: [
        'Learn Condorcet methods and quadratic voting conceptually through worked examples, including cycles/paradoxes.',
        'Continue theory; study real-world examples of strategic voting.',
        'Build the basic decision-creation flow (create a decision with options, no real-time yet).',
        'Finish decision-creation flow, add basic vote submission.',
        'Add real-time multiplayer via Socket.io — participants join and vote live.',
        'Debug and stabilize real-time connections.',
        'Implement Condorcet method tallying, including explicit handling of cycles/no-winner cases.',
        'Test Condorcet logic against known paradox examples.',
        'Implement quadratic voting tallying logic.',
        'Test quadratic voting logic against worked examples.',
        'Build the "how this can be gamed" explainer screen — strategic voting scenarios.',
        'Real-world test with an actual group decision that has real stakes.',
        'Refine based on real testing feedback (UI clarity, edge case handling).',
        'Final polish, deploy, presentation prep.',
      ],
    },
  },
  {
    title: 'Ghostwriter Detector (honest version)',
    tags: ['NLP', 'text classification', 'statistics', 'critical writing', 'AI ethics'],
    sections: {
      intro: 'AI-text detectors are being deployed in real schools right now, sometimes wrongly accusing real students of cheating, and almost none are transparent about their own error rates. Building a detector honest about its limitations is a genuinely useful intervention in an active debate affecting students the same age as the one building it.',
      whatItIs: 'An AI-generated text detector that shows its work — which specific signals it used (burstiness, perplexity, stylistic fingerprinting) and its real, measured false-positive rate — rather than a black-box yes/no verdict. Paired with a critical essay on why AI-text detectors are fundamentally unreliable.',
      deliverables: 'Working detector tool that outputs a probability + the specific signals behind it. A measured false-positive rate report, tested against a real sample of human-written text. A critical essay on the unreliability of AI-text detection and its policy implications.',
      futureScope: 'Expand into a fuller research piece. Potential submission to a student research journal or competition (science fair, JSHS).',
      stability: 'High. All tools/models here are open-source, mature, and don\'t require paid API calls. The honest limitation-reporting framing means the project doesn\'t need a "perfect" detector to succeed. Tech stack: Python, scikit-learn or HuggingFace, simple web frontend. Cost: Free.',
      weeks: [
        'Research existing AI-text detection approaches and their documented failure rates.',
        'Continue research; identify which signals to implement first.',
        'Collect a labeled dataset — real human-written text + real AI-generated text from multiple models.',
        'Clean and organize the dataset for testing.',
        'Build the perplexity/burstiness scoring pipeline using an open-source language model.',
        'Test and refine the scoring pipeline.',
        'Build the stylistic fingerprinting layer (sentence length variance, vocabulary diversity, etc.).',
        'Test stylistic fingerprinting against the dataset.',
        'Combine signals into a final probability score, build the "why" explainer.',
        'Refine the combined scoring and explainer output.',
        'Run the detector against the held-out test set and measure the real false-positive rate.',
        'Build the simple web frontend demo.',
        'Write the critical essay, grounded in the student\'s own measured results.',
        'Final polish, presentation prep.',
      ],
    },
  },
  {
    title: 'Universal Access Engine',
    tags: ['HCI', 'accessibility', 'adaptive UI', 'WCAG/ARIA', 'assistive technology', 'universal design', 'human-centered design'],
    sections: {
      intro: 'Almost every accessibility project is scoped to one disability at a time. Real people often have overlapping needs — this project\'s core intellectual contribution is composability: building an engine where accessibility profiles can be combined, not just switched between one at a time. That\'s a genuine, underexplored idea in real HCI research.',
      whatItIs: 'An adaptive interface engine that sits underneath any host app and reconfigures it live based on a chosen combination of accessibility profiles. Demonstrated using one simple host app (a to-do list or article reader). Covers 7 categories: blind/low vision, deaf/hard of hearing, motor impairments, speech/non-verbal, cognitive/learning differences, color vision deficiency, and situational/temporary impairments.',
      deliverables: 'Working adaptive engine with all 7 accessibility profiles implemented. A demo host app that visibly reconfigures live as profiles are toggled, individually and in combination. Documentation showing how the engine could be dropped into a different app.',
      futureScope: 'Package as a standalone plug-in library other developers/students can integrate into their own apps. Potential real assistive-tech tool if refined further.',
      stability: 'Medium. Each individual profile module is independently well-documented and stable. The real risk is in the composability layer — making sure two profiles active at once don\'t conflict — budget real debugging time for this. Tech stack: React (CSS custom properties), Web Speech API, ARIA attributes, SVG filter matrices (Machado et al.) for CVD. Optional: WebGazer.js for webcam eye-tracking. Cost: Free.',
      weeks: [
        'Research real accessibility standards (WCAG guidelines) and existing assistive tech patterns for each of the 7 categories.',
        'Continue standards research; identify the highest-impact pattern per category.',
        'Build the host demo app (simple to-do list or article reader) with no accessibility features yet — the "before" baseline.',
        'Finish host demo app baseline.',
        'Build the blind/low-vision profile (screen-reader optimization, high-contrast themes) and deaf/hard-of-hearing profile (live captioning, visual alerts).',
        'Test and refine those two profiles.',
        'Build the motor impairment profile (dwell-click, switch-scanning) and speech/non-verbal profile (simplified Talk-to-Me-Boards module).',
        'Test and refine those two profiles.',
        'Build the cognitive/learning profile (simplified reading mode, focus mode, reduced motion) and color vision deficiency profile (Machado et al. simulation/correction).',
        'Test and refine those two profiles.',
        'Build the situational/temporary profile framing, and test combinations of multiple profiles active at once, fixing conflicts.',
        'Build the profile-toggle control panel tying everything together.',
        'If possible, get feedback from someone with lived experience of a covered condition, or an accessibility professional; refine.',
        'Write the plug-in documentation, final polish, presentation prep.',
      ],
    },
  },
  {
    title: 'Consensus Engine x The Unfair Vote (cross-grade flagship)',
    tags: ['game theory', 'social choice theory', 'cross-grade curriculum design', 'multiplayer systems'],
    sections: {
      intro: 'Most projects are scoped to one grade band and then forgotten. This one is designed on purpose to run across the entire roster at once — younger students explore the concept, older students build the production version — so one shared codebase produces two genuinely different, appropriately-scoped deliverables.',
      whatItIs: 'One shared codebase, two depth tracks. The 6-8 track builds the "voting-method sandbox" (The Unfair Vote) exploring why different methods disagree. The 9-12 track builds the production-grade "Consensus Engine" with real social choice math and a written analysis piece.',
      deliverables: '6-8 track: working voting-method sandbox app. 9-12 track: production-grade Consensus Engine app. A short cross-track writeup on how the same core concept was scaffolded differently across grade levels.',
      futureScope: 'Maintained as an ongoing flagship template reused every cohort, with each new student building on or refining what the last one left behind.',
      stability: 'Medium-high, inheriting the same considerations as The Unfair Vote and Consensus Engine individually (WebSocket complexity, Condorcet edge cases). Tech stack: WebSockets, React, Node.js. Cost: Free.',
      weeks: [
        'Both tracks learn core voting-method concepts together, at their respective depth.',
        'Continue theory; 9-12 track additionally studies cycles/paradoxes.',
        'Both tracks build their respective basic poll/decision creation flow.',
        'Finish basic creation flows for both tracks.',
        'Both tracks add real-time multiplayer via Socket.io.',
        'Debug and stabilize real-time connections for both tracks.',
        '6-8 track implements plurality/ranked-choice tallying; 9-12 track implements Condorcet methods with cycle handling.',
        '6-8 track implements Borda/approval tallying; 9-12 track tests Condorcet logic.',
        '6-8 track builds the "compare all methods" results screen; 9-12 track implements quadratic voting.',
        '9-12 track builds the "how this can be gamed" explainer.',
        'Both tracks run a real-world test — an actual group decision using their respective app.',
        'Both tracks refine based on real testing feedback.',
        '6-8 track writes their short piece on plurality voting; 9-12 track finalizes their app.',
        'Both tracks do final polish and presentation prep; write the shared cross-track curriculum writeup.',
      ],
    },
  },
];

console.log(`Inserting ${projects.length} projects for user ${USER_ID}...\n`);

for (const project of projects) {
  // Fill in any keys not written out above (this file predates
  // `additionalInfo` being added to the sections shape) so every inserted
  // row always has the full, current shape — same as emptySections() in
  // lib/sections.ts.
  const sections = { intro: '', whatItIs: '', deliverables: '', futureScope: '', stability: '', additionalInfo: '', weeks: [''], ...project.sections };
  const content = composeContent(sections);

  const { error } = await supabase
    .from('projects')
    .insert({
      user_id: USER_ID,
      title: project.title,
      content,
      sections,
      tags: project.tags,
    })
    .select();

  if (error) {
    console.error(`FAILED: "${project.title}" ->`, error.message);
  } else {
    console.log(`OK: "${project.title}" added.`);
  }
}

console.log('\nDone. Refresh your Tag Atlas board to see all projects.');
