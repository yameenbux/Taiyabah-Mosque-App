/* What the app shows when something in it throws.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Without this, a render exception anywhere unmounts the whole tree and leaves
 * a white screen with no way out but force-stopping the app. With it, the
 * person gets a page in the masjid's own design that says plainly what has
 * happened, offers the one thing that usually works — try again — and gives
 * them the office number for the thing they were trying to do, because
 * whatever that was, it still needs doing.
 *
 * It is a class component because that is the only thing React will hand an
 * error to. There is no hook for this.
 *
 * Two of them are mounted: one around each screen, so a fault in the Qur'an
 * reader does not take the prayer times with it and the tab bar stays usable;
 * and one around the whole app, for the rarer fault that happens outside any
 * screen. The inner one is why "Try again" usually works at all.
 */
import React from "react";
import { View, Text, Linking } from "react-native";
import { C, F } from "./theme";
import { reportCrash } from "./crash";

const OFFICE = "01204 535 997";

export default class Boundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error) {
    /* Reported, not swallowed. The whole point is that somebody finds out. */
    reportCrash(error, { screen: this.props.screen });
  }

  render() {
    if (!this.state.failed) return this.props.children;

    /* Deliberately NOT using the app's own components. Something in the app
     * has just thrown; a fallback that depends on the theme provider, the
     * language store or the shared card could throw in exactly the same way
     * and leave the white screen this exists to prevent. Plain views, plain
     * text, English, hard-coded colours. */
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F1E8", alignItems: "center",
                     justifyContent: "center", padding: 28 }}>
        <View style={{ width: "100%", maxWidth: 380, backgroundColor: "#FCFAF3",
                       borderRadius: 16, borderWidth: 1, borderColor: "#E4DECF",
                       padding: 22 }}>
          <Text style={{ fontFamily: F.display, fontSize: 19, color: "#261B22",
                         marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: 14.5, lineHeight: 23,
                         color: "#261B22" }}>
            This screen stopped working. Nothing you had entered has been sent.
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: 14.5, lineHeight: 23,
                         color: "#7C6E77", marginTop: 10 }}>
            The masjid has been told automatically. If you were in the middle
            of something, the office can help.
          </Text>

          <Text onPress={() => this.setState({ failed: false })}
                suppressHighlighting
                style={{ marginTop: 20, textAlign: "center", overflow: "hidden",
                         fontFamily: F.sansBold, fontSize: 15, color: "#F3EFE3",
                         backgroundColor: "#772157", borderRadius: 13,
                         paddingVertical: 14 }}>
            Try again
          </Text>

          <Text onPress={() => Linking.openURL(`tel:${OFFICE.replace(/\s/g, "")}`)}
                suppressHighlighting
                style={{ marginTop: 10, textAlign: "center",
                         fontFamily: F.sansSemi, fontSize: 14, color: "#772157",
                         paddingVertical: 12 }}>
            Ring the masjid · {OFFICE}
          </Text>
        </View>
      </View>
    );
  }
}
