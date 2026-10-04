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
import { C, F, fs } from "./theme";
import Home from "./screens/Home";
import Notices from "./screens/Notices";
import More from "./screens/More";
import Placeholder from "./screens/Placeholder";
import { Athkar, Duas, Rabbanas } from "./screens/Reader";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/* The tab bar is the one piece of chrome a person touches all day, so it is
 * the first thing that had to stop feeling like a web page. It is drawn by the
 * platform, keeps clear of the gesture area by itself with no env() guesswork,
 * and answers the finger with a haptic tick before the screen changes. */
const tick = () => { if (Platform.OS !== "web") Haptics.selectionAsync(); };
const icon = name => ({ color, focused }) =>
  <Ionicons name={focused ? name : `${name}-outline`} size={23} color={color} />;

function Tabs() {
  return (
    <Tab.Navigator
      screenListeners={{ tabPress: tick }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brand600,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line, paddingTop: 6, height: 64 },
        tabBarLabelStyle: { fontFamily: F.sans, fontSize: fs(11), marginBottom: 7 },
        sceneContainerStyle: { backgroundColor: C.paper },
      }}>
      <Tab.Screen name="Home"         component={Home}        options={{ tabBarIcon: icon("home") }} />
      <Tab.Screen name="Prayer Times" component={Placeholder} options={{ tabBarIcon: icon("time") }} />
      <Tab.Screen name="Notices"      component={Notices}     options={{ tabBarIcon: icon("document-text") }} />
      <Tab.Screen name="More"         component={More}        options={{ tabBarIcon: icon("ellipsis-horizontal") }} />
    </Tab.Navigator>
  );
}

/* Everything the More menu opens PUSHES over the tabs, so the platform gives
 * it the slide in, the slide out, and the swipe-back-from-the-edge. That
 * gesture is the single thing people notice most when an app is not native,
 * and it is free here. */
export default function App() {
  const [ready] = useFonts({
    HankenGrotesk:       require("../assets/fonts/HankenGrotesk-Regular.ttf"),
    HankenGroteskMedium: require("../assets/fonts/HankenGrotesk-Medium.ttf"),
    HankenGroteskBold:   require("../assets/fonts/HankenGrotesk-Bold.ttf"),
    Fraunces:            require("../assets/fonts/Fraunces-Regular.ttf"),
    Amiri:               require("../assets/fonts/Amiri-Regular.ttf"),
  });
  /* Nothing renders until the brand faces are in. A flash of a system font on
   * the masjid's own name is the exact cheapness we are moving away from. */
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.brand900 }} />;

  const pushed = {
    headerStyle: { backgroundColor: C.paper },
    headerTintColor: C.brand600,
    headerTitleStyle: { fontFamily: F.display, fontSize: fs(17), color: C.ink },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: C.paper },
  };

  return (
    <SafeAreaProvider>
      {/* the hero is dark, so the clock and battery must be light */}
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="Athkar"   component={Athkar}   options={{ ...pushed, title: "Daily Adhkār" }} />
          <Stack.Screen name="Duas"     component={Duas}     options={{ ...pushed, title: "Everyday duʿās" }} />
          <Stack.Screen name="Rabbanas" component={Rabbanas} options={{ ...pushed, title: "40 Rabbanā duʿās" }} />
          {["Quran","Bukhari","About","Contact","Timetable","Prefs","Alerts"].map(n => (
            <Stack.Screen key={n} name={n} component={Placeholder} options={{ ...pushed, title: n }} />
          ))}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
