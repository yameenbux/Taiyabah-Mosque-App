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
import AsyncStorage from "@react-native-async-storage/async-storage";
import EN from "./i18n/en.json";

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
 * else and taken away by putting it where it already is. muFavs is the list you
 * build up on purpose. The web app keeps exactly these two, separately and for
 * the same reason, so a reader who uses both on the website finds both here. */
/* What the phone itself asks for. 1 on anything that cannot say — the web
 * export among them, where React Native applies no scale of its own. */
const osFontScale = () => {
  const n = PixelRatio.getFontScale?.();
  return Number.isFinite(n) && n > 0 ? n : 1;
};

const DEFAULTS = { lang: "en", scale: 1.12, reminders: {}, favourites: [], lastRead: null,
                   muMark: 0, muFavs: [],
                   /* The website's own five switches and its ten-minute default,
                    * so somebody who set this up on the website finds the same
                    * choices here rather than a different set. */
                   alerts: { jamaah: true, mins: 10, janazah: true,
                             announcements: true, events: false, kahf: true },
                   /* Whether this phone has been offered reminders. The system
                    * dialog can only be raised once — after that it is the
                    * settings app or nothing — so the offer is made once, on
                    * purpose, and never nags. */
                   askedPush: false };

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children, fallback = null }) {
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    let alive = true;
    /* The real answer always wins, even if it arrives late — losing somebody's
     * chosen language would be its own bug. */
    AsyncStorage.getItem(KEY)
      .then(raw => alive && setPrefs({ ...DEFAULTS, ...(raw ? JSON.parse(raw) : null) }))
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
     * showing a blank: the packs are not yet reviewed by a native speaker, and
     * a gap must degrade, not break. */
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
      setReminder: (key, on) => save({ ...prefs, reminders: { ...prefs.reminders, [key]: on } }),
      /* Where the reader got to, so the Qur'an screen can offer it back rather
       * than making somebody scroll to page 300 again. */
      setLastRead: lastRead => save({ ...prefs, lastRead }),
      /* One bookmark, so putting it here is also how you move it: there is
       * nothing to choose between and nothing to tidy up afterwards. */
      setAskedPush: () => save({ ...prefs, askedPush: true }),
      setAlerts: patch => save({ ...prefs, alerts: { ...prefs.alerts, ...patch } }),
      toggleMushafMark: page => save({ ...prefs, muMark: prefs.muMark === page ? 0 : page }),
      toggleMushafFav: page => save({
        ...prefs,
        muFavs: prefs.muFavs.includes(page)
          ? prefs.muFavs.filter(n => n !== page)
          : [...prefs.muFavs, page].sort((a, b) => a - b),
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
