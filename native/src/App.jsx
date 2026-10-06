import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, View } from "react-native";
import * as Font from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F } from "./theme";
import { AppProvider, useApp } from "./store";
import { SheetTop } from "./ui";
import { sheetScreen } from "./Blocks";
import SHEETS from "./data/sheets.json";
import Opening from "./Opening";
import FirstRun from "./FirstRun";
import { startPush } from "./push";

import Home from "./screens/Home";
import PrayerTimes from "./screens/PrayerTimes";
import Timetable from "./screens/Timetable";
import Notices from "./screens/Notices";
import More from "./screens/More";
import Qibla from "./screens/Qibla";
import Live from "./screens/Live";
import Videos from "./screens/Videos";
import Zakat from "./screens/Zakat";
import Holidays from "./screens/Holidays";
import Marriage from "./screens/Marriage";
import HallHire from "./screens/HallHire";
import Advice from "./screens/Advice";
import Collect from "./screens/Collect";
import Alerts from "./screens/Alerts";
import Prefs from "./screens/Prefs";
import Help from "./screens/Help";
import Quran, { Surahs, Surah, Mushaf } from "./screens/Quran";
import Bukhari, { BukhariBook } from "./screens/Bukhari";
import { NewBuild, Giving } from "./screens/Donate";
import { Portal, Privacy } from "./screens/Simple";
import { Athkar, AthkarSet, Duas, Rabbanas } from "./screens/Reader";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/* Eighteen screens are the masjid's own prose and nothing else, rendered from
 * the block tree the extractor lifts out of the website. Writing them out by
 * hand would have meant retyping every fee, phone number and funeral step — and
 * the first time the committee changed one, two versions of it. */
const SHEET = {
  About: "about", Membership: "membership", Contact: "contact",
  MarriageDeath: "marriagedeath", Funeral: "funeral", Will: "will", Birth: "birth",
  Education: "education", EduArabic: "eduarabic", EduGhusl: "edughusl",
  Curriculum: "curriculum", Madrasah: "madrasah", Admissions: "madmissions",
  /* Holidays is NOT here any more: the website fills its calendar, its closure
   * list and its Islamic dates with JavaScript, so lifting the markup gave a
   * legend with no colours and three empty cards. It has a real screen now. */
};

/* The tab bar is the one piece of chrome a person touches all day, so it is the
 * first thing that had to stop feeling like a web page. It is drawn by the
 * platform, keeps clear of the gesture area by itself with no env() guesswork,
 * and answers the finger with a haptic tick before the screen changes. */
const tick = () => { if (Platform.OS !== "web") Haptics.selectionAsync(); };
const icon = name => ({ color, focused }) =>
  <Ionicons name={focused ? name : `${name}-outline`} size={23} color={color} />;

function Tabs() {
  const { t, fs, rtl } = useApp();
  return (
    <Tab.Navigator
      screenListeners={{ tabPress: tick }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brand600,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line, paddingTop: 6,
                       /* Urdu and Arabic glyphs hang well below the baseline; at
                          the Latin height their descenders are sliced off. */
                       height: rtl ? 74 : 64 },
        tabBarLabelStyle: { fontFamily: rtl ? F.arabic : F.sans, fontSize: fs(rtl ? 12.5 : 10.5),
                            lineHeight: fs(rtl ? 22 : 14), marginBottom: rtl ? 10 : 7,
                            includeFontPadding: false },
        sceneContainerStyle: { backgroundColor: C.paper },
      }}>
      <Tab.Screen name="HomeTab"    component={Home}        options={{ title: t("nav.home", "Home"), tabBarIcon: icon("home") }} />
      <Tab.Screen name="TimesTab"   component={PrayerTimes} options={{ title: t("nav.prayer_times", "Prayer Times"), tabBarIcon: icon("time") }} />
      <Tab.Screen name="NoticesTab" component={Notices}     options={{ title: t("nav.notices", "Notices"), tabBarIcon: icon("document-text") }} />
      <Tab.Screen name="MoreTab"    component={More}        options={{ title: t("nav.more", "More"), tabBarIcon: icon("ellipsis-horizontal") }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { t, tx, fs, lang } = useApp();

  /* EVERY PUSHED SCREEN WEARS THE WEBSITE'S SHEET HEADER.
   *
   * There used to be two presets: `pushed`, a platform header in paper with an
   * ink title, and `bare`, no header at all. Neither is anything the website
   * does. Its sheets — all 28 of them — open under one plum bar carrying the
   * title and a Done pill, and `bare` screens were left drawing a chevron on
   * top of their own hero with no title line at all.
   *
   * The ← appears only when there is a sheet behind this one, which is what
   * navRenderUpBack() decides on the website and what canGoBack() decides
   * here. Done leaves the same way the arrow does, because on the website it
   * closes the sheet and there is nowhere else for it to go. */
  const sheet = {
    header: ({ navigation, options }) => (
      <SheetTop title={options.title || ""}
                canBack={navigation.canGoBack()}
                onBack={() => navigation.goBack()}
                onDone={navigation.canGoBack() ? () => navigation.goBack() : null}
                {...(options.sheetNav || {})} />
    ),
    contentStyle: { backgroundColor: C.paper },
  };
  /* Qibla, Alerts, Donate and Live are not sheets on the website: they are
   * four of its seven PAGES, and a page wears the app bar — the logo, the
   * society's name and the bell — not a sheet header. They draw their own. */
  const page = { headerShown: false, contentStyle: { backgroundColor: C.paper } };
  const pushed = sheet, bare = sheet;

  return (
    /* Keyed on the language so a switch rebuilds every title, in every stack,
     * rather than leaving yesterday's words in the headers. */
    <NavigationContainer key={lang}>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />

        {/* reading */}
        <Stack.Screen name="Quran"     component={Quran}    options={{ ...bare, title: t("quran.qur_an", "Qur'an") }} />
        <Stack.Screen name="Surahs"    component={Surahs}   options={{ ...pushed, title: t("quran.all_114_surahs", "All 114 sūrahs") }} />
        <Stack.Screen name="Surah"     component={Surah}    options={{ ...pushed, title: "" }} />
        <Stack.Screen name="Mushaf"    component={Mushaf}   options={{ ...pushed, title: t("quran.13_line_qur_an", "13-Line Qur'an"),
                                                                       headerStyle: { backgroundColor: "#15060F" },
                                                                       headerTintColor: C.goldBright,
                                                                       headerTitleStyle: { fontFamily: F.display, fontSize: fs(16), color: C.cream } }} />
        <Stack.Screen name="Bukhari"     component={Bukhari}     options={{ ...pushed, title: t("bukhari.title", "Ṣaḥīḥ al-Bukhārī") }} />
        <Stack.Screen name="BukhariBook" component={BukhariBook} options={({ route }) => ({ ...pushed, title: route.params?.name || "" })} />
        {/* Daily Adhkār draws its own hero over the menu of five, so no header. */}
        <Stack.Screen name="Athkar"    component={Athkar}    options={{ ...sheet, title: t("athkar.daily_athkar", "Daily Athkār") }} />
        <Stack.Screen name="AthkarSet" component={AthkarSet}
          options={({ route }) => ({ ...pushed,
            title: [t("athkar.morning_evening", "Morning & Evening"),
                    t("athkar.after_every_salah", "After Every Ṣalāh"),
                    t("athkar.before_sleep", "Before Sleep")][route.params?.n] || "" })} />
        <Stack.Screen name="Duas"     component={Duas}     options={{ ...pushed, title: t("duas.everyday_du_as", "Everyday Duʿās") }} />
        <Stack.Screen name="Rabbanas" component={Rabbanas} options={{ ...pushed, title: t("rabbanas.40_rabbana", "40 Rabbanā") }} />

        {/* the masjid */}
        <Stack.Screen name="Qibla"     component={Qibla}     options={page} />
        <Stack.Screen name="Live"      component={Live}      options={page} />
        <Stack.Screen name="Videos"    component={Videos}    options={{ ...sheet, title: t("vids.videos_bayaans", "Videos & bayaans") }} />
        <Stack.Screen name="Timetable" component={Timetable} options={{ ...sheet, title: t("times.monthly_timetable", "Monthly timetable") }} />
        <Stack.Screen name="Zakat"     component={Zakat}     options={{ ...bare, title: t("zakat.zakat_calculator", "Zakat calculator") }} />
        <Stack.Screen name="Holidays"  component={Holidays}  options={{ ...sheet, title: t("hol.holiday_planner", "Holiday Planner") }} />
        {/* The donate page: one of the website's seven, so it wears the app
            bar rather than a sheet header. */}
        <Stack.Screen name="NewBuild"  component={NewBuild}  options={page} />
        <Stack.Screen name="Giving"    component={Giving}    options={{ ...sheet, title: t("giving.sadaqah_lillah", "Sadaqah & Lillah") }} />

        {/* services with a form behind them */}
        <Stack.Screen name="Marriage"  component={Marriage}  options={{ ...sheet, title: t("marriage.marriage", "Marriage") }} />
        <Stack.Screen name="HallHire"  component={HallHire}  options={{ ...sheet, title: t("hallhire.hall_room_hire", "Hall / Room Hire") }} />
        <Stack.Screen name="Advice"    component={Advice}    options={{ ...sheet, title: t("advice.imams_advice", "Imams’ Advice") }} />
        <Stack.Screen name="Collect"   component={Collect}   options={{ ...sheet, title: t("collect.charity_collections", "Charity Collections") }} />

        {/* settings */}
        <Stack.Screen name="Alerts"  component={Alerts}  options={page} />
        <Stack.Screen name="Prefs"   component={Prefs}   options={{ ...sheet, title: t("sysprefs.system_preferences", "System Preferences") }} />
        <Stack.Screen name="Portal"  component={Portal}  options={{ ...sheet, title: t("portals.madrasah_portal", "Madrasah Portal") }} />
        <Stack.Screen name="Privacy" component={Privacy} options={{ ...sheet, title: t("privacy.privacy_notice", "Privacy notice") }} />
        <Stack.Screen name="Help"    component={Help}    options={{ ...sheet, title: t("help.title", "Help") }} />

        {/* the masjid's own prose, straight from the website */}
        {Object.entries(SHEET).map(([name, id]) => (
          <Stack.Screen key={name} name={name} component={sheetScreen(id)}
            options={{ ...sheet, title: tx(SHEETS[id]?.title) }} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  /* THE FONTS ARE BUILT IN, not fetched.
   *
   * They used to be loaded at runtime with useFonts(), which asks expo-asset
   * for each file. In a release build with no expo-updates there is no local
   * asset map, and expo-asset's shortcut for already-present files only covers
   * images — a font has no width or height, so it fell through and tried to
   * DOWNLOAD a bare Android resource name as if it were a URL. Every font in
   * the app failed that way, with one line in the log:
   *
   *     fonts did not load: Call to function 'ExpoAsset.downloadAsync' has
   *     been rejected.
   *
   * The app then drew in whatever the system had — and because every icon in
   * this app is a glyph in a font, that is why no icon existed, the back
   * chevrons included. A timeout was put over the top of this earlier, which
   * stopped the app hanging and let the real fault ship.
   *
   * They are now listed in app.json and copied into the build by the expo-font
   * plugin, so Android registers them before a line of JavaScript runs. A file
   * named ionicons.ttf registers the family @expo/vector-icons asks for, so
   * the icons are simply there — no loading, nothing to fail, and nothing to
   * wait for before the first frame. */
  React.useEffect(() => {
    /* Said out loud so the Android test can assert it rather than take a
     * screenshot's word for it. */
    try { console.log("fonts available: " + Font.getLoadedFonts().join(", ")); } catch {}
    /* Started here and nowhere else. Initialising does NOT ask for permission
     * and does not subscribe anybody — it only makes the SDK ready, so that
     * when somebody does say yes there is something to say yes to. */
    startPush();
  }, []);

  /* Shown only while the settings store answers, which has its own ceiling in
     store.jsx. Expo hides its splash on the first frame, so without this there
     would be a flash of white before the plum. */
  const veil = <View style={{ flex: 1, backgroundColor: C.brand900 }} />;

  return (
    <SafeAreaProvider>
      {/* the hero is dark, so the clock and battery must be light */}
      <StatusBar style="light" />
      <AppProvider fallback={veil}>
        <Root />
        <FirstRun />
      </AppProvider>
      {/* Last, so it sits over the app — and only over it. The app is mounted
          and live underneath from the first frame; this never gates it, never
          takes a touch, and takes itself away on a timer whatever happens. */}
      <Opening />
      {/* Inside the provider, because it needs the saved preferences to know
          whether this phone has already been offered reminders. */}
    </SafeAreaProvider>
  );
}
