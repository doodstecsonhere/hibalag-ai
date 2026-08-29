/**
 * Client-side offline answer engine.
 *
 * Runs entirely in the browser: it reads the locally cached schedule markdown
 * (IndexedDB with a localStorage fallback), matches the user query against the
 * parsed events, and composes a grounded, persona-consistent reply in the
 * active UI language. No network calls, no secrets.
 */
import { translate, type Language } from "@/lib/i18n";
import {
  CATEGORIES,
  formatEventDate,
  formatTime,
  parseSchedule,
  readCachedSchedule,
  type Category,
  type ScheduleEvent,
} from "@/lib/schedule";

export type OfflineFilters = {
  date: string | null;
  categories: Category[];
  query: string;
};

export type OfflineAnswer = {
  text: string;
  events: ScheduleEvent[];
  filters: OfflineFilters;
};

const MAX_RESULTS = 6;

const STOP_WORDS = new Set([
  // english
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "of",
  "for",
  "to",
  "in",
  "on",
  "at",
  "and",
  "or",
  "me",
  "my",
  "you",
  "i",
  "it",
  "what",
  "when",
  "where",
  "who",
  "which",
  "how",
  "about",
  "tell",
  "show",
  "give",
  "please",
  "there",
  "any",
  "do",
  "does",
  "did",
  "can",
  "will",
  "this",
  "that",
  "with",
  "from",
  "have",
  "has",
  "us",
  "we",
  // bisaya / tagalog
  "ang",
  "sa",
  "ug",
  "og",
  "ni",
  "si",
  "nga",
  "unsa",
  "asa",
  "kanus-a",
  "kinsa",
  "naa",
  "wala",
  "ba",
  "ko",
  "ka",
  "nimo",
  "nako",
  "imong",
  "akong",
  "kini",
  "kana",
  "mga",
  "ay",
  "na",
  "at",
  "kay",
  "po",
  "ako",
  "ikaw",
  "ito",
  "iyan",
  "kailan",
  "saan",
  "sino",
  "anong",
  "ano",
  "may",
  "meron",
  "tungkol",
  "kabahin",
  "bahin",
  "bay",
  "kumusta",
  "hello",
  "hi",
  "pwede",
  "puwede",
  "gusto",
  "nako",
  "unsay",
  "unsa'y",
  "naa'y",
]);

const CATEGORY_HINTS: Record<Category, RegExp> = {
  Featured: /\b(featured|highlight|main|major|dagko|sikat|tampok)\b/i,
  Religious:
    /\b(worship|church|religio|relihiyo|prayer|pray|vesper|mass|misa|devotion|chapel|thanksgiving|sunday)\b/i,
  Alumni: /\b(alumni|alumnae|homecoming|reunion|balik|jubilee|batch|class of)\b/i,
  Cultural:
    /\b(cultural|kultura|pageant|miss silliman|mr silliman|concert|dance|sayaw|parada|parade|exhibit|choral|band|theater|theatre|film|music|art)\b/i,
  Parties: /\b(party|parties|night|disco|bash|rave|social|jam|booth|inom|sayawan|gimik)\b/i,
};

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  ago: 8,
  agosto: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return normalize(value)
    .split(" ")
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function isoToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/** Detects an explicit date reference in the query, returning an ISO date. */
export function detectDate(query: string): string | null {
  const text = normalize(query);

  if (/\b(today|karon|karong adlawa|ngayon|ngayong araw)\b/.test(text)) return isoToday();
  if (/\b(tomorrow|ugma|bukas)\b/.test(text)) {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(
      next.getDate(),
    ).padStart(2, "0")}`;
  }

  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const named = text.match(/\b([a-z]{3,8})\s+(\d{1,2})\b/);
  if (named) {
    const month = MONTHS[named[1].slice(0, 3)] ?? MONTHS[named[1]];
    const day = Number(named[2]);
    if (month && day >= 1 && day <= 31) {
      return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const dayOnly = text.match(/\b(?:day|adlaw|araw)\s+(\d{1,2})\b/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    if (day >= 1 && day <= 29) return `2026-08-${String(day).padStart(2, "0")}`;
  }

  return null;
}

export function detectCategories(query: string): Category[] {
  return CATEGORIES.filter((category) => CATEGORY_HINTS[category].test(query));
}

function scoreEvent(
  event: ScheduleEvent,
  words: string[],
  categories: Category[],
): { keyword: number; total: number } {
  const title = normalize(event.title);
  const venue = normalize(event.venue ?? "");
  const lead = normalize(event.leadUnit ?? "");
  const body = normalize(`${event.description ?? ""} ${event.note ?? ""}`);

  let score = 0;
  for (const word of words) {
    if (title.includes(word)) score += 6;
    else if (venue.includes(word)) score += 3;
    else if (lead.includes(word)) score += 2;
    else if (body.includes(word)) score += 1;
  }
  const keyword = score;
  if (categories.length > 0 && categories.some((c) => event.categories.includes(c))) score += 3;
  return { keyword, total: score };
}

/** Pure matcher — exported for reuse/testing. */
export function matchEvents(
  events: ScheduleEvent[],
  query: string,
): { events: ScheduleEvent[]; filters: OfflineFilters } {
  const date = detectDate(query);
  const categories = detectCategories(query);
  const words = tokens(query);

  const pool = date ? events.filter((event) => event.date === date) : events;
  const base = pool.length > 0 ? pool : events;

  const scored = base
    .map((event) => ({ event, ...scoreEvent(event, words, categories) }))
    // With real keywords in the query, only keyword hits count — a category
    // hint alone must not drag in every event of that category.
    .filter((entry) => (words.length > 0 ? entry.keyword > 0 : entry.total > 0))
    .sort((a, b) => b.total - a.total);

  let matches = scored.slice(0, MAX_RESULTS).map((entry) => entry.event);

  // A pure date or category question needs no keyword hits.
  if (matches.length === 0 && (date || categories.length > 0)) {
    matches = base
      .filter(
        (event) =>
          (!date || event.date === date) &&
          (categories.length === 0 || categories.some((c) => event.categories.includes(c))),
      )
      .slice(0, MAX_RESULTS);
  }

  const keyword = words.find((word) =>
    matches.some((event) => normalize(event.title).includes(word)),
  );

  return {
    events: matches,
    filters: {
      date,
      categories,
      query: matches.length > 0 && keyword ? keyword : "",
    },
  };
}

function eventLine(event: ScheduleEvent) {
  const time = event.startTime
    ? `${formatTime(event.startTime)}${event.endTime ? `–${formatTime(event.endTime)}` : ""}`
    : null;
  const meta = [formatEventDate(event.date), time, event.venue].filter(Boolean).join(" · ");
  return `- **${event.title}**${meta ? `\n  ${meta}` : ""}`;
}

/** Reads the cached schedule and builds a localized, grounded offline reply. */
export async function answerOffline(
  query: string,
  language: Language,
  reason: "offline" | "unavailable" = "offline",
): Promise<OfflineAnswer> {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
    translate(language, key, vars);

  let events: ScheduleEvent[] = [];
  try {
    const cached = await readCachedSchedule();
    events = cached ? parseSchedule(cached.markdown) : [];
  } catch {
    events = [];
  }

  if (events.length === 0) {
    return {
      text: t(reason === "unavailable" ? "fallback.noCache" : "offline.noCache"),
      events: [],
      filters: { date: null, categories: [], query: "" },
    };
  }

  const { events: matches, filters } = matchEvents(events, query);

  if (matches.length === 0) {
    return {
      text: t(reason === "unavailable" ? "fallback.noMatch" : "offline.noMatch"),
      events: [],
      filters: { date: null, categories: [], query: "" },
    };
  }

  const text = [
    t(reason === "unavailable" ? "fallback.intro" : "offline.intro", { count: matches.length }),
    "",
    matches.map(eventLine).join("\n"),
    "",
    t(reason === "unavailable" ? "fallback.outro" : "offline.outro"),
  ].join("\n");

  return { text, events: matches, filters };
}
