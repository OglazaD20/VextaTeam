const DAY_INDEX: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };

interface TimeRange {
  startMin: number;
  /** May exceed 1440 for ranges that cross midnight. */
  endMin: number;
}

interface Rule {
  days: Set<number>;
  ranges: TimeRange[];
  closed: boolean;
}

export interface OpeningHoursStatus {
  isOpenNow: boolean | null;
  /** "HH:MM" today's closing time, only set when currently open. */
  closesAt: string | null;
}

const UNKNOWN: OpeningHoursStatus = { isOpenNow: null, closesAt: null };

function parseTime(token: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(token.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 48 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function parseDaySelector(token: string): Set<number> | null {
  const days = new Set<number>();
  for (const part of token.split(",")) {
    const rangeMatch = /^([A-Za-z]{2})-([A-Za-z]{2})$/.exec(part.trim());
    if (rangeMatch) {
      const start = DAY_INDEX[rangeMatch[1]];
      const end = DAY_INDEX[rangeMatch[2]];
      if (start === undefined || end === undefined) return null;
      let i = start;
      for (;;) {
        days.add(i);
        if (i === end) break;
        i = (i + 1) % 7;
      }
    } else {
      const idx = DAY_INDEX[part.trim()];
      if (idx === undefined) return null;
      days.add(idx);
    }
  }
  return days;
}

const ALL_DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);

/**
 * Parses a practical subset of OSM opening_hours syntax (day ranges + comma
 * time ranges, "24/7", "off") to determine whether a place is open right
 * now. Anything it doesn't confidently recognize (seasonal rules, "PH",
 * "sunset", etc.) returns isOpenNow: null rather than guessing — the AI and
 * UI treat null as "unknown", never as open or closed.
 */
export function getOpeningStatus(
  openingHours: string | null | undefined,
  now: Date = new Date(),
): OpeningHoursStatus {
  if (!openingHours) return UNKNOWN;
  const raw = openingHours.trim();
  if (!raw) return UNKNOWN;
  if (/^24\/7$/i.test(raw)) return { isOpenNow: true, closesAt: null };

  const rules: Rule[] = [];
  for (const segment of raw.split(";")) {
    const seg = segment.trim();
    if (!seg) continue;

    const closed = /\b(off|closed)\b/i.test(seg);
    const dayToken = /^[A-Za-z]{2}(?:-[A-Za-z]{2})?(?:\s*,\s*[A-Za-z]{2}(?:-[A-Za-z]{2})?)*/.exec(seg);
    let days = ALL_DAYS;
    let rest = seg;
    if (dayToken) {
      // A leading alpha token that isn't a recognized day code (e.g. "PH" for
      // public holidays) means this rule needs syntax we don't support —
      // bail to unknown rather than silently treating it as "every day".
      const parsedDays = parseDaySelector(dayToken[0]);
      if (!parsedDays) return UNKNOWN;
      days = parsedDays;
      rest = seg.slice(dayToken[0].length).trim();
    }

    if (closed) {
      rules.push({ days, ranges: [], closed: true });
      continue;
    }

    const timeTokens = rest
      .replace(/\boff\b/gi, "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (timeTokens.length === 0) return UNKNOWN;

    const ranges: TimeRange[] = [];
    for (const token of timeTokens) {
      const rangeMatch = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(token);
      if (!rangeMatch) return UNKNOWN;
      const start = parseTime(rangeMatch[1]);
      let end = parseTime(rangeMatch[2]);
      if (start === null || end === null) return UNKNOWN;
      if (end <= start) end += 24 * 60;
      ranges.push({ startMin: start, endMin: end });
    }
    rules.push({ days, ranges, closed: false });
  }

  if (rules.length === 0) return UNKNOWN;

  const nowDay = now.getDay();
  const yesterday = (nowDay + 6) % 7;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let isOpenNow = false;
  let closesAtMin: number | null = null;

  for (const rule of rules) {
    if (rule.closed) continue;

    if (rule.days.has(nowDay)) {
      for (const range of rule.ranges) {
        if (nowMinutes >= range.startMin && nowMinutes < range.endMin) {
          isOpenNow = true;
          if (closesAtMin === null || range.endMin < closesAtMin) closesAtMin = range.endMin;
        }
      }
    }

    if (rule.days.has(yesterday)) {
      for (const range of rule.ranges) {
        if (range.endMin > 24 * 60) {
          const spillEnd = range.endMin - 24 * 60;
          if (nowMinutes < spillEnd) {
            isOpenNow = true;
            if (closesAtMin === null || spillEnd < closesAtMin) closesAtMin = spillEnd;
          }
        }
      }
    }
  }

  if (!isOpenNow || closesAtMin === null) return { isOpenNow: false, closesAt: null };

  const closeMinutesToday = closesAtMin % (24 * 60);
  const hh = String(Math.floor(closeMinutesToday / 60)).padStart(2, "0");
  const mm = String(closeMinutesToday % 60).padStart(2, "0");
  return { isOpenNow: true, closesAt: `${hh}:${mm}` };
}
