import React from "react";
import { View, Text } from "react-native";
import { C, F, fs } from "../theme";
export default function Placeholder({ route }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.paper, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: F.display, fontSize: fs(20), color: C.ink }}>{route?.name}</Text>
      <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.muted, marginTop: 6 }}>a later step</Text>
    </View>
  );
}
