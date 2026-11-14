/* Everything the app remembers between launches, in one place.
 *
 * The web app kept these in localStorage and read them synchronously, which is
 * a luxury AsyncStorage does not give us. So the provider renders nothing until
 * the first read comes back — a few milliseconds behind the font gate, and far
 * better than the app visibly changing size or language a beat after it opens.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { PixelRatio } from "react-native";
import { fontSize } from "./scale";
import { setThemeMode } from "./theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import EN from "./i18n/en.json";
import { surahsFromPages } from "./mushaf";

const PACKS = { ur: () => require("./i18n/ur.json"), gu: () => require("./i18n/gu.json"), ar: () => require("./i18n/ar.json") };
export const LANGS = [
  { code: "en", name: "English",  native: "English" },
  { code: "ur", name: "Urdu",     native: "اردو" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "ar", name: "Arabic",   native: "العربية" },
];
/* Only Arabic and Urdu are written right to left; Gujarati is not, and getting
 * that wrong is the kind of mistake a community notices immediately. */
const RTL = new Set(["ar", "ur"]);

const KEY = "taiyabah.prefs.v1";
/* muMark is the one bookmark — the everyday one, moved by putting it somewhere
 * else and taken away by putting it where it already is. muFavSurahs is the
 * list you build up on purpose. The web app keeps exactly these two,
 * separately and for the same reason, so a reader who uses both on the
 * website finds both here.
 *
 * THE FAVOURITES USED TO BE PAGES and are now SŪRAHS. A list reading "Page
 * 247, Page 408" told nobody anything — a page number belongs to one printing
 * and to no sūrah anyone can name — and the committee reported the whole
 * feature as missing because of it. Anything already saved under the old
 * `muFavs` is carried across by migrate() below; nothing is dropped. */
/* What the phone itself asks for. 1 on anything that cannot say — the web
 * export among them, where React Native applies no scale of its own. */
const osFontScale = () => {
  const n = PixelRatio.getFontScale?.();
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/* Saying yes to the notifications dialog turns all of these on.
 *
 * It used to turn on nothing: permission was granted and the switches were
 * left exactly as they were, unwritten, behind a Save button nobody had
 * pressed — so somebody who had just agreed to be notified was subscribed to
 * nothing at all. Agreeing to be told is the decision. Choosing what not to be
 * told is a second and smaller one, and it is theirs to make afterwards.
 *
 * `mins` is deliberately absent: it is a number, not a switch, and whatever it
 * was set to is kept. */
/* MUṢḤAF FAVOURITES MOVED FROM PAGES TO SŪRAHS, and somebody who had already
 * kept a few pages must not open the app to an empty list. Each saved page
 * becomes the sūrah it sat in, three pages of al-Baqara collapse to one
 * al-Baqara, and the old field is cleared so this runs once and never again.
 *
 * It reads what is on disk rather than asking the reader to redo anything,
 * and it cannot lose a favourite it could have kept — surahsFromPages() drops
 * only a page that belongs to no sūrah at all, which in this printing is the
 * frontispiece and nothing else. Tested in scripts/test/mushaf.test.mjs. */
function migrate(p) {
  if (!Array.isArray(p.muFavs) || !p.muFavs.length) {
    if ("muFavs" in p) { const { muFavs, ...rest } = p; return rest; }
    return p;
  }
  const { muFavs, ...rest } = p;
  const already = Array.isArray(rest.muFavSurahs) ? rest.muFavSurahs : [];
  const moved = surahsFromPages(muFavs);
  return { ...rest, muFavSurahs: [...new Set([...already, ...moved])].sort((a, b) => a - b) };
}

export const EVERYTHING_ON = { jamaah: true, janazah: true, announcements: true,
                               events: true, kahf: true };

const DEFAULTS = { lang: "en", scale: 1.12, theme: "light", reminders: {}, favourites: [], lastRead: null,
                   muMark: 0, muFavSurahs: [],
                   /* The website's own five switches and its ten-minute default,
                    * so somebody who set this up on the website finds the same
                    * choices here rather than a different set. */
                   /* `ramadan` is OFF where the rest are on: it is two
                    * notifications a night, and only for one month of the
                    * year, so it is opted INTO rather than out of. */
                   alerts: { jamaah: true, mins: 10, janazah: true,
                             announcements: true, events: false, kahf: true,
                             ramadan: false },
                   /* Whether this phone has been offered reminders. The system
                    * dialog can only be raised once — after that it is the
                    * settings app or nothing — so the offer is made once, on
                    * purpose, and never nags. */
                   askedPush: false,
                   /* Notices this phone has been shown, and notices it has
                    * cleared off its own list. Ids only, never leaving the
                    * device — see notices-state.js.
                    *
                    * ntSeen is NULL rather than [] until the first successful
                    * load. The difference matters: [] means "has seen none of
                    * them", which would light the dot for every notice ever
                    * published the first time somebody opens the app. */
                   ntSeen: null, ntCleared: [],
                   /* Written only by the store-screenshot harness; see App.jsx. */
                   shotRoute: null };

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children, fallback = null }) {
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    let alive = true;
    /* The real answer always wins, even if it arrives late — losing somebody's
     * chosen language would be its own bug. */
    AsyncStorage.getItem(KEY)
      .then(raw => alive && setPrefs(migrate({ ...DEFAULTS, ...(raw ? JSON.parse(raw) : null) })))
      .catch(() => alive && setPrefs(p => p || DEFAULTS));  // a corrupt store must not brick the app
    /* Nor must a silent one. If the native module is missing, or simply never
     * answers, this provider would render its fallback for ever and the app
     * would show a blank screen with nothing to explain it. Reading settings is
     * not worth that: after a moment, open on the defaults and let the saved
     * ones apply when they turn up. */
    const id = setTimeout(() => alive && setPrefs(p => p || DEFAULTS), 2000);
    return () => { alive = false; clearTimeout(id); };
  }, []);

  const save = useCallback(next => {
    setPrefs(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo(() => {
    if (!prefs) return null;

    /* Applied HERE rather than in an effect, because an effect runs after the
       children have already drawn — which would be one frame of the old
       palette every time the app opens or the choice changes. Setting a
       module variable during a memo is a side effect, but an idempotent one,
       and it has to happen before anything reads C. */
    setThemeMode(prefs.theme);
    const pack = prefs.lang !== "en" && PACKS[prefs.lang] ? PACKS[prefs.lang]() : null;

    /* One lookup, used everywhere.
     *
     * The caller's own English beats the English pack, and that order matters:
     * a screen here may deliberately word something better than the website
     * did — "Display & language" rather than "System Preferences" — while
     * still borrowing the website's Urdu, Gujarati and Arabic for it. The
     * English pack is the fallback for a key with no wording at the call site.
     *
     * A key missing from a pack falls through to the English rather than
     * showing a blank. The packs have been read by native speakers now, but a
     * key added after a reading has nothing to show, and a gap must degrade
     * rather than break. */
    const t = (key, english) => (key && pack && pack[key]) || english || (key && EN[key]) || "";
    /* Blocks carry {k, t}: the key to translate by and the English to fall back
     * on. This is the form almost every call in the app actually uses. */
    /* A block from the website is {k, t} and goes through the lookup. A plain
     * string has already been through it — t("zakat.you_are_muslim_and_have",
     * "…") — and is simply the answer.
     *
     * This used to take only the first shape, and returned NOTHING for the
     * second: t(undefined, undefined). Three ticks on the zakat screen drew as
     * three ticks with no words beside them, and the Help hero drew as an
     * empty plum band, and neither failed any check because nothing threw.
     * A component should not care which of the two it was handed. */
    const tx = o => (typeof o === "string" ? o : o ? t(o.k, o.t) : "");

    return {
      ...prefs,
      t, tx,
      rtl: RTL.has(prefs.lang),
      /* Text size multiplies every size in the app, exactly as --ts did on the
       * web. Arabic and Urdu need a touch more height to stay legible.
       *
       * THE TWO SCALES USED TO MULTIPLY. React Native applies the phone's own
       * font setting on top of whatever fontSize it is given, and this app
       * has a text-size control of its own because the website does. Somebody
       * with Android set to its largest text and "Extra large" chosen here got
       * 1.3 x 1.42 — nearly twice the designed size, on every screen, and the
       * layouts do not survive it.
       *
       * So the bigger of the two wins rather than the product, capped at 1.5.
       * Dividing by the phone's scale here cancels the one React Native is
       * about to apply, leaving exactly `want`.
       *
       * It never renders SMALLER than the phone asked for. Somebody who has
       * told Android they need large text has said something about their
       * eyesight, and no in-app setting should quietly undo it; the control
       * here can still take them above it. */
      fs: n => fontSize(n, prefs.scale, osFontScale()),
      setLang: lang => save({ ...prefs, lang }),
      setScale: scale => save({ ...prefs, scale }),
      /* Light or dark, chosen in System Preferences. Not the phone's setting:
         the masjid's own screens are light, and somebody who wants the app
         dark says so. */
      setTheme: theme => save({ ...prefs, theme: theme === "dark" ? "dark" : "light" }),
      setReminder: (key, on) => save({ ...prefs, reminders: { ...prefs.reminders, [key]: on } }),
      /* Where the reader got to, so the Qur'an screen can offer it back rather
       * than making somebody scroll to page 300 again. */
      setLastRead: lastRead => save({ ...prefs, lastRead }),
      /* One bookmark, so putting it here is also how you move it: there is
       * nothing to choose between and nothing to tidy up afterwards. */
      setAskedPush: () => save({ ...prefs, askedPush: true }),
      /* Bounded at 200 the way the website bounds its own list. Ids drop out
         as notices retire, so this is a ceiling and not a growth rate. */
      markNoticesSeen: ids => save({ ...prefs, ntSeen: (ids || []).slice(0, 200) }),
      /* Clearing is reading: a notice the reader has dealt with must not go
         on lighting the dot. */
      clearNotice: (id, liveIds) => save({ ...prefs,
        ntSeen: (liveIds || []).slice(0, 200),
        ntCleared: (prefs.ntCleared || []).includes(id)
          ? prefs.ntCleared : (prefs.ntCleared || []).concat(id).slice(0, 200) }),
      clearAllNotices: liveIds => save({ ...prefs,
        ntSeen: (liveIds || []).slice(0, 200), ntCleared: (liveIds || []).slice(0, 200) }),
      restoreNotices: () => save({ ...prefs, ntCleared: [] }),
      /* Written back only when pruning actually removed something, so this is
         not a storage write on every render of the Notices screen. */
      pruneClearedNotices: kept => save({ ...prefs, ntCleared: kept }),
      setAlerts: patch => save({ ...prefs, alerts: { ...prefs.alerts, ...patch } }),
      toggleMushafMark: page => save({ ...prefs, muMark: prefs.muMark === page ? 0 : page }),
      /* By sūrah now, not by page. The caller passes a sūrah number; the
         screen is what works out which sūrah a page belongs to, and it names
         that sūrah on the control before anybody presses it. */
      toggleMushafFavSurah: n => save({
        ...prefs,
        muFavSurahs: (prefs.muFavSurahs || []).includes(n)
          ? prefs.muFavSurahs.filter(x => x !== n)
          : [...(prefs.muFavSurahs || []), n].sort((a, b) => a - b),
      }),
      toggleFavourite: id => save({
        ...prefs,
        favourites: prefs.favourites.includes(id)
          ? prefs.favourites.filter(x => x !== id)
          : [...prefs.favourites, id],
      }),
    };
  }, [prefs, save]);

  if (!value) return fallback;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
