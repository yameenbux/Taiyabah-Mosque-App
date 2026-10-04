/* Charity collections at the masjid.
 *
 * The rules and the contacts are here in full. The application itself stays on
 * the website for now, because it has to carry the BMCC certificate as a file
 * upload and this app does not yet ask for one — sending a request that claims a
 * certificate exists when none was attached is the worse of the two failures, so
 * the form opens in the browser rather than being half-built here.
 */
import React from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { Screen, Hero, Heading, Notice, CTA, RowGroup, NavRow, Foot } from "../ui";
import { SHEETS, Blocks } from "../Blocks";

const FORM = "https://taiyabahapp.ysbdesigns.uk/#collect";

export default function Collect({ navigation }) {
  const { t } = useApp();
  const sheet = SHEETS.collect;
  const hero = sheet?.blocks.find(b => b.type === "hero");
  return (
    <Screen pad={false}>
      {!!hero && <Hero lines={hero.lines} />}
      <View style={{ paddingHorizontal: 16 }}>
        <Blocks blocks={sheet?.blocks.filter(b => b.type !== "hero") || []} nav={navigation} />

        <Heading>{t("collect.apply", "Apply")}</Heading>
        <Notice>{t("collect.certificate_needed",
          "The application needs your BMCC certificate attached, so it opens on the masjid's website. Everything you have read here applies to it.")}</Notice>
        <CTA label={t("collect.open_the_application", "Open the application")} href={FORM} />
        <RowGroup>
          <NavRow icon="call-outline" label={t("collect.ring_rafik", "Ring Rafik Patel")}
                  sub="07951 795 465" href="tel:07951795465" />
        </RowGroup>
        <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569"]} />
      </View>
    </Screen>
  );
}
