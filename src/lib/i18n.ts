export const LANGUAGES = ["bisaya", "english", "tagalog"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, { short: string; full: string }> = {
  bisaya: { short: "Bis", full: "Bisaya" },
  english: { short: "Eng", full: "English" },
  tagalog: { short: "Tag", full: "Tagalog" },
};

/** Short localized month names (index 0 = January) used for date-range labels. */
export const SHORT_MONTHS: Record<Language, string[]> = {
  bisaya: ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Sep", "Okt", "Nob", "Dis"],
  english: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  tagalog: ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Sep", "Okt", "Nob", "Dis"],
};

/**
 * Formats a date range like "Aug 1–29, 2026" (same month) or
 * "Aug 1 – Sep 5, 2026" (across months) in the given language.
 * Returns "Dates TBA" when there is nothing to show.
 */
export function formatEventRange(
  language: Language,
  min: string | null,
  max: string | null,
): string {
  if (!min || !max) return language === "english" ? "Dates TBA" : "Petsa TBA";
  const [minY, minM, minD] = min.split("-").map(Number);
  const [maxY, maxM, maxD] = max.split("-").map(Number);
  if ([minY, minM, minD, maxY, maxM, maxD].some(Number.isNaN)) {
    return language === "english" ? "Dates TBA" : "Petsa TBA";
  }
  const months = SHORT_MONTHS[language];
  const sameYear = minY === maxY;
  const sameMonth = sameYear && minM === maxM;
  if (sameMonth) {
    return `${months[minM - 1]} ${minD}–${maxD}, ${maxY}`;
  }
  if (sameYear) {
    return `${months[minM - 1]} ${minD} – ${months[maxM - 1]} ${maxD}, ${maxY}`;
  }
  return `${months[minM - 1]} ${minD}, ${minY} – ${months[maxM - 1]} ${maxD}, ${maxY}`;
}

const bisaya = {
  // Header
  "header.menu": "Ablihi ang menu ug chat history",
  "header.schedule": "Ablihi ang schedule canvas",
  "header.scheduleToday": "{count} ka event karong adlawa",
  "header.status.active": "Active",
  "header.status.offline": "Offline mode",
  "header.status.synced": "Synced",
  "header.language": "Pilia ang pinulongan",

  // Canvas trigger / sheet
  "canvas.fab": "Tan-awa ang Schedule Canvas",
  "canvas.sheetTitle": "Schedule Canvas",
  "canvas.sheetDescription": "Browse ug filter sa mga Founders Week events.",

  // Chat panel
  "chat.offlineBanner":
    "Offline ka karon — mabasa gihapon ang schedule sa Canvas, pero ang chat mo-balik inig signal.",
  "chat.welcomeTitle": "Kumusta, Sillimanian!",
  "chat.welcomeBody":
    "Ako si Hibalag AI...\nimong guide sa Founders Week ug Hibalag Festival karong August.\nPangutana kabahin sa schedule, venues, o itinerary.",
  "chat.thinking": "Naghuna-huna si Hibalag AI…",
  "chat.error": "Naay problema sa pagtubag. Sulayi pag-usab sa makadiyot.",
  "chat.placeholder": "Pangutana bahin sa Hibalag…",
  "chat.send": "Ipadala",
  "chat.aria": "Pakigsulti kang Hibalag AI",
  "chat.suggestion1": "Unsa'y events karong adlawa?",
  "chat.suggestion2": "Naa'y open house?",
  "chat.suggestion3": "When ang parade?",
  "chat.suggestion4": "Alumni homecoming activities?",
  "chat.suggestion5": "Ang Miss Silliman?",

  // Canvas panel
  "canvas.aria": "Canvas sa schedule sa festival",
  "canvas.title": "Schedule Canvas",
  "canvas.count": "{count} events · {range}",
  "canvas.offlineCopy": "Offline copy",
  "canvas.close": "Isira ang canvas",
  "canvas.search": "Pangitaa ang event, venue, o org…",
  "canvas.allDays": "Tanang adlaw",
  "canvas.today": "Karong Adlawa",
  "canvas.emptyToday": "Walay nakahanda nga event karong adlawa.",
  "canvas.showAllDays": "Tan-awa ang tanang adlaw",
  "canvas.dayChip": "Ago {day}",
  "canvas.retry": "Sulayi pag-usab",
  "canvas.empty":
    "Walay event nga mo-match ani nga filter, bay. Sulayi ug lain nga adlaw o category.",
  "canvas.dateTba": "Wala pa'y petsa",
  "canvas.footer": "Silliman University · Founders Day Celebration",
  "category.Featured": "Featured",
  "category.Religious": "Relihiyoso",
  "category.Alumni": "Alumni",
  "category.Cultural": "Kultural",
  "category.Parties": "Parties",

  // Thread drawer
  "threads.title": "Mga chat",
  "threads.close": "Isira ang history",
  "threads.new": "Bag-ong chat",
  "threads.empty": "Wala pa'y chat. Sugdi ug pangutana!",
  "threads.migrateBody": "Naa ka'y {count} guest chat dinhi sa device. I-save sa imong account?",
  "threads.migrateAction": "I-sync sa account",
  "threads.save": "I-save ang titulo",
  "threads.rename": "Usba ang ngalan sa {title}",
  "threads.delete": "Papasa ang {title}",
  "threads.logout": "Log out",
  "threads.login": "Log in (optional)",

  // Auth dialog
  "auth.signinTitle": "Log in sa Hibalag AI",
  "auth.signupTitle": "Paghimo ug account",
  "auth.description":
    "Optional ni — ang chat mo-gana bisan guest. Mag-login lang kung gusto nimo ma-sync ang imong mga chat sa tanan nimong device.",
  "auth.google": "Padayon gamit ang Google",
  "auth.or": "o gamita ang email",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signin": "Log in",
  "auth.signup": "Sign up",
  "auth.toSignup": "Wala pa'y account? Sign up",
  "auth.toSignin": "Naa na'y account? Log in",
  "auth.confirm": "Check your email para ma-confirm ang account.",
  "auth.failed": "Naay problema sa pag-login.",

  // Install prompt
  "install.title": "I-install ang Hibalag AI",
  "install.body":
    "I-add sa imong home screen para paspas ug ma-browse ang schedule bisan walay signal.",
  "install.iosBody":
    "Sa Safari, i-tap ang Share icon (↑), unya pilia ang 'Add to Home Screen' para ma-install ang Hibalag AI.",
  "install.action": "Install",
  "install.later": "Sa lain na lang",
  "install.gotIt": "Sige",
  "install.dismiss": "Isalikway ang install prompt",

  // Offline mode
  "offline.banner": "⚡ Offline Mode — Mga tubag gikan sa cached nga schedule.",
  "offline.intro":
    "Offline ka karon bay, apan gipangita nako sa imong cached schedule! Mao kini ang {count} nga akong nakit-an:",
  "offline.outro": "Tan-awa usab ang Schedule Canvas alang sa kumpletong listahan!",
  "offline.noMatch":
    "Offline ka karon bay, ug wala ko'y nakit-an nga mo-match ana sa cached nga schedule. Ablihi ang Schedule Canvas para makita ang tanan, o pangutan-a ko pag-usab inig signal.",
  "offline.noCache":
    "Offline ka karon ug wala pa'y na-save nga schedule ani nga device. Ablihi ang app kausa nga naa'y signal para ma-download ni.",
  "offline.reconnected": "Back online! Live AI reconnected.",
  "fallback.banner": "Live AI unavailable — cached schedule answers are still available.",
  "fallback.quota": "Free live AI limit reached — cached schedule answers are still available.",
  "fallback.intro":
    "Online ka, pero unavailable ang live AI karon. Gipangita nako ang cached schedule ug nakakita ko og {count}:",
  "fallback.outro": "Tan-awa usab ang Schedule Canvas alang sa kumpletong listahan!",
  "fallback.noMatch":
    "Online ka, pero unavailable ang live AI ug walay tugma sa cached schedule. Ablihi ang Schedule Canvas o sulayi pag-usab unya.",
  "fallback.noCache":
    "Online ka, pero unavailable ang live AI ug wala pay cached schedule. Ablihi ang Schedule Canvas o sulayi pag-usab unya.",
} as const;

export type TranslationKey = keyof typeof bisaya;

const english: Record<TranslationKey, string> = {
  "header.menu": "Open menu and chat history",
  "header.schedule": "Open schedule canvas",
  "header.scheduleToday": "{count} events today",
  "header.status.active": "Active",
  "header.status.offline": "Offline mode",
  "header.status.synced": "Synced",
  "header.language": "Select language",

  "canvas.fab": "View Schedule Canvas",
  "canvas.sheetTitle": "Schedule Canvas",
  "canvas.sheetDescription": "Browse and filter Founders Week events.",

  "chat.offlineBanner":
    "You're offline — the Canvas schedule still works, and chat returns once you have signal.",
  "chat.welcomeTitle": "Hello, Sillimanian!",
  "chat.welcomeBody":
    "I'm Hibalag AI...\nyour guide to Founders Week and the Hibalag Festival this August.\nAsk me about the schedule, venues, or itineraries.",
  "chat.thinking": "Hibalag AI is thinking…",
  "chat.error": "Something went wrong. Please try again in a moment.",
  "chat.placeholder": "Ask about Founders Day…",
  "chat.send": "Send",
  "chat.aria": "Chat with Hibalag AI",
  "chat.suggestion1": "What events are on today?",
  "chat.suggestion2": "Is there an open house?",
  "chat.suggestion3": "When is the parade?",
  "chat.suggestion4": "Alumni homecoming activities?",
  "chat.suggestion5": "Tell me about Miss Silliman",

  "canvas.aria": "Festival schedule canvas",
  "canvas.title": "Schedule Canvas",
  "canvas.count": "{count} events · {range}",
  "canvas.offlineCopy": "Offline copy",
  "canvas.close": "Close canvas",
  "canvas.search": "Search event, venue, or org…",
  "canvas.allDays": "All days",
  "canvas.today": "Today",
  "canvas.emptyToday": "No scheduled events today.",
  "canvas.showAllDays": "View all days",
  "canvas.dayChip": "Aug {day}",
  "canvas.retry": "Try again",
  "canvas.empty": "No events match these filters. Try another day or category.",
  "canvas.dateTba": "Date TBA",
  "canvas.footer": "Silliman University · Founders Day Celebration",
  "category.Featured": "Featured",
  "category.Religious": "Religious",
  "category.Alumni": "Alumni",
  "category.Cultural": "Cultural",
  "category.Parties": "Parties",

  "threads.title": "Chats",
  "threads.close": "Close history",
  "threads.new": "New chat",
  "threads.empty": "No chats yet. Start by asking something!",
  "threads.migrateBody": "You have {count} guest chats on this device. Save them to your account?",
  "threads.migrateAction": "Sync to account",
  "threads.save": "Save title",
  "threads.rename": "Rename {title}",
  "threads.delete": "Delete {title}",
  "threads.logout": "Log out",
  "threads.login": "Log in (optional)",

  "auth.signinTitle": "Log in to Hibalag AI",
  "auth.signupTitle": "Create an account",
  "auth.description":
    "This is optional — chat works fine as a guest. Log in only if you want your chats synced across devices.",
  "auth.google": "Continue with Google",
  "auth.or": "or use email",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signin": "Log in",
  "auth.signup": "Sign up",
  "auth.toSignup": "No account yet? Sign up",
  "auth.toSignin": "Already have an account? Log in",
  "auth.confirm": "Check your email to confirm your account.",
  "auth.failed": "Something went wrong while logging in.",

  "install.title": "Install Hibalag AI",
  "install.body": "Add it to your home screen for faster access and offline schedule browsing.",
  "install.iosBody":
    "In Safari, tap the Share icon (↑), then choose 'Add to Home Screen' to install Hibalag AI.",
  "install.action": "Install",
  "install.later": "Not now",
  "install.gotIt": "Got it",
  "install.dismiss": "Dismiss install prompt",

  "offline.banner": "⚡ Offline Mode — Answers generated from cached schedule data.",
  "offline.intro":
    "You're offline right now, but I searched your cached schedule! Here's what I found ({count}):",
  "offline.outro": "Check the Schedule Canvas too for the complete list!",
  "offline.noMatch":
    "You're offline, and I couldn't find that in the cached schedule. Open the Schedule Canvas to browse everything, or ask again once you're back online.",
  "offline.noCache":
    "You're offline and there's no saved schedule on this device yet. Open the app once with signal so it can download.",
  "offline.reconnected": "Back online! Live AI reconnected.",
  "fallback.banner": "Live AI unavailable — cached schedule answers are still available.",
  "fallback.quota": "Free live AI limit reached — cached schedule answers are still available.",
  "fallback.intro":
    "You're online, but live AI is unavailable right now. I searched the cached schedule and found {count}:",
  "fallback.outro": "Check the Schedule Canvas too for the complete list!",
  "fallback.noMatch":
    "You're online, but live AI is unavailable and I couldn't find a match in the cached schedule. Browse the Schedule Canvas or try again later.",
  "fallback.noCache":
    "You're online, but live AI is unavailable and this device has no cached schedule yet. Browse the Schedule Canvas or try again later.",
};

const tagalog: Record<TranslationKey, string> = {
  "header.menu": "Buksan ang menu at chat history",
  "header.schedule": "Buksan ang schedule canvas",
  "header.scheduleToday": "{count} event ngayong araw",
  "header.status.active": "Aktibo",
  "header.status.offline": "Offline mode",
  "header.status.synced": "Naka-sync",
  "header.language": "Pumili ng wika",

  "canvas.fab": "Tingnan ang Schedule Canvas",
  "canvas.sheetTitle": "Schedule Canvas",
  "canvas.sheetDescription": "I-browse at i-filter ang mga Founders Week na event.",

  "chat.offlineBanner":
    "Offline ka ngayon — mababasa mo pa rin ang schedule sa Canvas, babalik ang chat pagkakaroon ng signal.",
  "chat.welcomeTitle": "Kumusta, Sillimanian!",
  "chat.welcomeBody":
    "Ako si Hibalag AI...\nang gabay mo sa Founders Week at Hibalag Festival ngayong Agosto.\nMagtanong tungkol sa schedule, venues, o itinerary.",
  "chat.thinking": "Nag-iisip si Hibalag AI…",
  "chat.error": "May problema sa pagsagot. Subukan ulit maya-maya.",
  "chat.placeholder": "Magtanong tungkol sa Hibalag…",
  "chat.send": "Ipadala",
  "chat.aria": "Makipag-chat kay Hibalag AI",
  "chat.suggestion1": "Anong events ngayong araw?",
  "chat.suggestion2": "May open house ba?",
  "chat.suggestion3": "Kailan ang parada?",
  "chat.suggestion4": "Mga alumni homecoming activities?",
  "chat.suggestion5": "Kwentuhan mo ako tungkol sa Miss Silliman",

  "canvas.aria": "Canvas ng schedule ng festival",
  "canvas.title": "Schedule Canvas",
  "canvas.count": "{count} events · {range}",
  "canvas.offlineCopy": "Offline na kopya",
  "canvas.close": "Isara ang canvas",
  "canvas.search": "Maghanap ng event, venue, o org…",
  "canvas.allDays": "Lahat ng araw",
  "canvas.today": "Ngayong Araw",
  "canvas.emptyToday": "Walang naka-iskedyul na event ngayong araw.",
  "canvas.showAllDays": "Tingnan lahat ng araw",
  "canvas.dayChip": "Ago {day}",
  "canvas.retry": "Subukan ulit",
  "canvas.empty": "Walang event na tugma sa filter na ito. Subukan ang ibang araw o category.",
  "canvas.dateTba": "Petsa TBA",
  "canvas.footer": "Silliman University · Founders Day Celebration",
  "category.Featured": "Featured",
  "category.Religious": "Panrelihiyon",
  "category.Alumni": "Alumni",
  "category.Cultural": "Kultural",
  "category.Parties": "Parties",

  "threads.title": "Mga chat",
  "threads.close": "Isara ang history",
  "threads.new": "Bagong chat",
  "threads.empty": "Wala pang chat. Magsimula sa isang tanong!",
  "threads.migrateBody": "May {count} guest chat ka sa device na ito. I-save sa iyong account?",
  "threads.migrateAction": "I-sync sa account",
  "threads.save": "I-save ang pamagat",
  "threads.rename": "Palitan ang pangalan ng {title}",
  "threads.delete": "Burahin ang {title}",
  "threads.logout": "Mag-log out",
  "threads.login": "Mag-log in (opsyonal)",

  "auth.signinTitle": "Mag-log in sa Hibalag AI",
  "auth.signupTitle": "Gumawa ng account",
  "auth.description":
    "Opsyonal ito — gumagana ang chat kahit guest. Mag-log in lang kung gusto mong ma-sync ang chats mo sa lahat ng device.",
  "auth.google": "Magpatuloy gamit ang Google",
  "auth.or": "o gamitin ang email",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signin": "Mag-log in",
  "auth.signup": "Mag-sign up",
  "auth.toSignup": "Wala pang account? Mag-sign up",
  "auth.toSignin": "May account na? Mag-log in",
  "auth.confirm": "Tingnan ang email mo para kumpirmahin ang account.",
  "auth.failed": "May problema sa pag-log in.",

  "install.title": "I-install ang Hibalag AI",
  "install.body":
    "Idagdag sa home screen mo para mas mabilis at mabasa ang schedule kahit walang signal.",
  "install.iosBody":
    "Sa Safari, i-tap ang Share icon (↑), tapos piliin ang 'Add to Home Screen' para ma-install ang Hibalag AI.",
  "install.action": "I-install",
  "install.later": "Sa susunod na lang",
  "install.gotIt": "Sige",
  "install.dismiss": "Isara ang install prompt",

  "offline.banner": "⚡ Offline Mode — Mga sagot mula sa naka-cache na schedule.",
  "offline.intro":
    "Offline ka ngayon, pero hinanap ko sa naka-cache mong schedule! Ito ang {count} na nakita ko:",
  "offline.outro": "Tingnan din ang Schedule Canvas para sa kumpletong listahan!",
  "offline.noMatch":
    "Offline ka ngayon, at wala akong nakitang tugma sa naka-cache na schedule. Buksan ang Schedule Canvas para i-browse lahat ng event, o subukan ulit kapag may signal.",
  "offline.noCache":
    "Offline ka ngayon at wala pang naka-save na schedule sa device na ito. Buksan ulit ang app kapag may signal para ma-download ito.",
  "offline.reconnected": "Back online! Live AI reconnected.",
  "fallback.banner": "Hindi available ang live AI — magagamit pa rin ang cached schedule answers.",
  "fallback.quota": "Naabot ang free live AI limit — magagamit pa rin ang cached schedule answers.",
  "fallback.intro":
    "Online ka, pero hindi available ang live AI ngayon. Hinanap ko sa cached schedule at may {count} akong nakita:",
  "fallback.outro": "Tingnan din ang Schedule Canvas para sa kumpletong listahan!",
  "fallback.noMatch":
    "Online ka, pero hindi available ang live AI at walang tugma sa cached schedule. Tingnan ang Schedule Canvas o subukan ulit mamaya.",
  "fallback.noCache":
    "Online ka, pero hindi available ang live AI at wala pang cached schedule sa device. Tingnan ang Schedule Canvas o subukan ulit mamaya.",
};

export const translations: Record<Language, Record<TranslationKey, string>> = {
  bisaya,
  english,
  tagalog,
};

export function translate(
  language: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
) {
  const template = translations[language][key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function normalizeLanguage(value: string | null | undefined): Language {
  return (LANGUAGES as readonly string[]).includes(value ?? "") ? (value as Language) : "bisaya";
}
