import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, View } from "react-native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, fs } from "./theme";
import Home from "./screens/Home";
import Placeholder from "./screens/Placeholder";

const Tab = createBottomTabNavigator();

/* The tab bar is the one piece of chrome a person touches all day, so it is
 * the first thing that has to stop feeling like a web page. Three differences
 * from the old one, each of them something a browser could not do:
 *   - a real native tab bar drawn by the platform, not a fixed div
 *   - it keeps clear of the gesture area by itself, with no env() guesswork
 *   - it answers the finger with a haptic tick before the screen even changes
 */
const tick = () => { if (Platform.OS !== "web") Haptics.selectionAsync(); };

const icon = name => ({ color, focused }) =>
  <Ionicons name={focused ? name : `${name}-outline`} size={23} color={color} />;

export default function App() {
  /* Nothing renders until the brand faces are loaded. A flash of a system
   * font on the masjid's own name is exactly the cheapness we are moving
   * away from, and it is the first thing anyone would notice. */
  const [ready] = useFonts({
    HankenGrotesk:       require("../assets/fonts/HankenGrotesk-Regular.ttf"),
    HankenGroteskMedium: require("../assets/fonts/HankenGrotesk-Medium.ttf"),
    HankenGroteskBold:   require("../assets/fonts/HankenGrotesk-Bold.ttf"),
    Fraunces:            require("../assets/fonts/Fraunces-Regular.ttf"),
    Amiri:               require("../assets/fonts/Amiri-Regular.ttf"),
  });
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.brand900 }} />;

  return (
    <SafeAreaProvider>
      {/* the hero is dark, so the clock and battery must be light */}
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenListeners={{ tabPress: tick }}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: C.brand600,
            tabBarInactiveTintColor: C.muted,
            tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line, paddingTop: 6, height: 64 },
            tabBarLabelStyle: { fontFamily: F.sans, fontSize: fs(11), marginBottom: 7 },
            sceneContainerStyle: { backgroundColor: C.paper },
          }}
        >
          <Tab.Screen name="Home"         component={Home}        options={{ tabBarIcon: icon("home") }} />
          <Tab.Screen name="Prayer Times" component={Placeholder} options={{ tabBarIcon: icon("time") }} />
          <Tab.Screen name="Notices"      component={Placeholder} options={{ tabBarIcon: icon("document-text") }} />
          <Tab.Screen name="More"         component={Placeholder} options={{ tabBarIcon: icon("ellipsis-horizontal") }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
