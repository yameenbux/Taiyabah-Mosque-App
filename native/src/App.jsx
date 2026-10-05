import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, View } from "react-native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F } from "./theme";
import { AppProvider, useApp } from "./store";
import { sheetScreen } from "./Blocks";

import Home from "./screens/Home";
import PrayerTimes from "./screens/PrayerTimes";
import Timetable from "./screens/Timetable";
import Notices from "./screens/Notices";
import More from "./screens/More";
import Qibla from "./screens/Qibla";
import Live from "./screens/Live";
import Videos from "./screens/Videos";
import Zakat from "./screens/Zakat";
import Marriage from "./screens/Marriage";
import HallHire from "./screens/HallHire";
import Advice from "./screens/Advice";
import Collect from "./screens/Collect";
import Alerts from "./screens/Alerts";
import Prefs from "./screens/Prefs";
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
  Holidays: "holidays",
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
  const { t, fs, lang } = useApp();

  const pushed = {
    headerStyle: { backgroundColor: C.paper },
    headerTintColor: C.brand600,
    headerTitleStyle: { fontFamily: F.display, fontSize: fs(17), color: C.ink },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
    contentStyle: { backgroundColor: C.paper },
  };
  /* Screens that draw their own hero behind the status bar have no header at
   * all; the platform's swipe-back still works, which is the part that matters. */
  const bare = { headerShown: false, contentStyle: { backgroundColor: C.paper } };

  return (
    /* Keyed on the language so a switch rebuilds every title, in every stack,
     * rather than leaving yesterday's words in the headers. */
    <NavigationContainer key={lang}>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />

        {/* reading */}
        <Stack.Screen name="Quran"     component={Quran}    options={{ ...bare }} />
        <Stack.Screen name="Surahs"    component={Surahs}   options={{ ...pushed, title: t("quran.english_translation", "Translation") }} />
        <Stack.Screen name="Surah"     component={Surah}    options={{ ...pushed, title: "" }} />
        <Stack.Screen name="Mushaf"    component={Mushaf}   options={{ ...pushed, title: t("quran.mushaf", "Muṣḥaf"),
                                                                       headerStyle: { backgroundColor: "#15060F" },
                                                                       headerTintColor: C.goldBright,
                                                                       headerTitleStyle: { fontFamily: F.display, fontSize: fs(16), color: C.cream } }} />
        <Stack.Screen name="Bukhari"     component={Bukhari}     options={{ ...pushed, title: t("tiles.hadith", "Ṣaḥīḥ al-Bukhārī") }} />
        <Stack.Screen name="BukhariBook" component={BukhariBook} options={({ route }) => ({ ...pushed, title: route.params?.name || "" })} />
        {/* Daily Adhkār draws its own hero over the menu of five, so no header. */}
        <Stack.Screen name="Athkar"    component={Athkar}    options={bare} />
        <Stack.Screen name="AthkarSet" component={AthkarSet}
          options={({ route }) => ({ ...pushed,
            title: [t("athkar.morning_evening", "Morning & Evening"),
                    t("athkar.after_every_salah", "After Every Ṣalāh"),
                    t("athkar.before_sleep", "Before Sleep")][route.params?.n] || "" })} />
        <Stack.Screen name="Duas"     component={Duas}     options={{ ...pushed, title: t("duas.everyday_du_as", "Everyday Duʿās") }} />
        <Stack.Screen name="Rabbanas" component={Rabbanas} options={{ ...pushed, title: t("rabbanas.40_rabbana", "40 Rabbanā") }} />

        {/* the masjid */}
        <Stack.Screen name="Qibla"     component={Qibla}     options={bare} />
        <Stack.Screen name="Live"      component={Live}      options={bare} />
        <Stack.Screen name="Videos"    component={Videos}    options={bare} />
        <Stack.Screen name="Timetable" component={Timetable} options={bare} />
        <Stack.Screen name="Zakat"     component={Zakat}     options={bare} />
        <Stack.Screen name="NewBuild"  component={NewBuild}  options={bare} />
        <Stack.Screen name="Giving"    component={Giving}    options={bare} />

        {/* services with a form behind them */}
        <Stack.Screen name="Marriage"  component={Marriage}  options={bare} />
        <Stack.Screen name="HallHire"  component={HallHire}  options={bare} />
        <Stack.Screen name="Advice"    component={Advice}    options={bare} />
        <Stack.Screen name="Collect"   component={Collect}   options={bare} />

        {/* settings */}
        <Stack.Screen name="Alerts"  component={Alerts}  options={bare} />
        <Stack.Screen name="Prefs"   component={Prefs}   options={bare} />
        <Stack.Screen name="Portal"  component={Portal}  options={bare} />
        <Stack.Screen name="Privacy" component={Privacy} options={bare} />

        {/* the masjid's own prose, straight from the website */}
        {Object.entries(SHEET).map(([name, id]) => (
          <Stack.Screen key={name} name={name} component={sheetScreen(id)} options={bare} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, fontError] = useFonts({
    HankenGrotesk:       require("../assets/fonts/HankenGrotesk-Regular.ttf"),
    HankenGroteskMedium: require("../assets/fonts/HankenGrotesk-Medium.ttf"),
    HankenGroteskBold:   require("../assets/fonts/HankenGrotesk-Bold.ttf"),
    Fraunces:            require("../assets/fonts/Fraunces-Regular.ttf"),
    Amiri:               require("../assets/fonts/Amiri-Regular.ttf"),
  });

  /* THE APP MUST NEVER WAIT FOR EVER ON ANYTHING.
   *
   * Holding the first frame back until the brand faces are in is worth doing:
   * a flash of a system font on the masjid's own name is the exact cheapness
   * we are moving away from. Holding it back INDEFINITELY is not — and that is
   * what this did. If a face failed to load, `ready` stayed false and the app
   * showed a plum rectangle, silently, for ever. We have already shipped one
   * version of that bug.
   *
   * So the wait has a ceiling. After it, the app opens in whatever faces the
   * system has, which is a hundred times better than not opening. */
  const [waited, setWaited] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(id);
  }, []);
  React.useEffect(() => {
    if (fontError) console.warn("fonts did not load: " + String(fontError));
  }, [fontError]);
  /* Expo hides its own splash on the first frame, so the veil is only ever
   * seen for the moment between that and the fonts arriving. */
  const veil = <View style={{ flex: 1, backgroundColor: C.brand900 }} />;
  if (!ready && !fontError && !waited) return veil;

  return (
    <SafeAreaProvider>
      {/* the hero is dark, so the clock and battery must be light */}
      <StatusBar style="light" />
      <AppProvider fallback={veil}>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
