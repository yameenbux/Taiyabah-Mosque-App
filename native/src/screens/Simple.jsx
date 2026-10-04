/* The two screens whose whole job is to send somebody somewhere else, written
 * once rather than twice: the madrasah portal and the privacy notice. Both live
 * on the masjid's website, both open in the in-app browser so the app's chrome
 * stays around them.
 */
import React from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { Screen, Hero, Card, P, Note, CTA, RowGroup, NavRow, Foot } from "../ui";

export function Portal() {
  const { t } = useApp();
  return (
    <Screen pad={false}>
      <Hero lines={[
        { k: "menu.madrasah_portal", t: "Madrasah Portal", w: "title" },
        { k: "portal.sub", t: "Registers, pupil records and fees", w: "sub" },
      ]} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card>
          <P>{t("portal.body",
            "The portal is where staff take the register and where parents will be able to see attendance and fees. It signs in against the masjid's own records, so it opens on the website rather than inside the app.")}</P>
          <Note>{t("portal.still_building",
            "Registers and pupil records are still being built. If you are a parent, the office can answer anything the portal does not yet show.")}</Note>
        </Card>
        <CTA label={t("portal.open", "Open the portal")} href="https://taiyabahwebsite.ysbdesigns.uk/portal/" />
        <RowGroup>
          <NavRow icon="call-outline" label={t("adm.ring_the_office", "Ring the office")}
                  sub="01204 535 997 · 5pm to 7pm" href="tel:01204535997" />
        </RowGroup>
        <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569"]} />
      </View>
    </Screen>
  );
}

export function Privacy() {
  const { t } = useApp();
  return (
    <Screen pad={false}>
      <Hero lines={[{ k: "menu.privacy_notice", t: "Privacy notice", w: "title" }]} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card>
          <P>{t("privacy.body",
            "The app holds your settings — language, text size and which reminders you want — on your phone and nowhere else. Nothing about how you use it is sent anywhere.")}</P>
          <P>{t("privacy.body2",
            "When you send a request to the masjid — a nikāḥ date, a hall booking, a question for the imams — what you type goes to the masjid's own records so the office can answer you. Donations are taken by Stripe; the masjid never sees your card details.")}</P>
          <Note>{t("privacy.full",
            "The full notice, including how long each kind of record is kept and how to ask for yours to be deleted, is on the masjid's website.")}</Note>
        </Card>
        <CTA label={t("privacy.read_full", "Read the full notice")} href="https://taiyabahapp.ysbdesigns.uk/privacy.html" />
        <RowGroup>
          <NavRow icon="trash-outline" label={t("privacy.delete_my_data", "Ask for my data to be deleted")}
                  href="https://taiyabahapp.ysbdesigns.uk/delete-data.html" />
        </RowGroup>
        <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569"]} />
      </View>
    </Screen>
  );
}
