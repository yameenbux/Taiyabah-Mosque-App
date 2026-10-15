package com.taiyabahmasjid.app.widget;

import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;
import org.json.JSONObject;

/* Runs the widget provider's own decision logic — the same methods the home
   screen calls — against the real timetable the plugin ships. Compiling only
   proved the Java was well formed; this proves it names the right prayer. */
public class Harness {
  static int fail = 0;
  /* Fails stop the run here rather than setting a flag. They used to print
     and let main() `return`, which skipped the System.exit at the bottom and
     handed the shell a 0 — so a reversed sort comparator and an off-by-one in
     nextFrom both printed FAIL and passed. A check that reports its own
     failure as success is worse than no check. */
  static void ok(boolean c, String what) {
    System.out.println((c ? "  ok   " : "  FAIL ") + what);
    if (!c) { fail++; System.out.flush(); System.exit(1); }
  }
  static Method m(String name, Class<?>... args) throws Exception {
    Method x = NextJamaahWidget.class.getDeclaredMethod(name, args);
    x.setAccessible(true);
    return x;
  }
  static long at(Object slot) throws Exception {
    Field f = slot.getClass().getDeclaredField("at"); f.setAccessible(true);
    return f.getLong(slot);
  }
  static String nm(Object slot) throws Exception {
    Field f = slot.getClass().getDeclaredField("name"); f.setAccessible(true);
    return (String) f.get(slot);
  }

  public static void main(String[] a) throws Exception {
    /* Unwrapped exactly as timetable() unwraps it, so the harness sees what
       the provider sees and not one level up. */
    JSONObject days = new JSONObject(new String(Files.readAllBytes(Paths.get(a[0])), "UTF-8"))
                          .getJSONObject("days");
    NextJamaahWidget w = new NextJamaahWidget();
    Method daySlots = m("daySlots", JSONObject.class, int.class);
    Method nextFrom = m("nextFrom", JSONObject.class, long.class);
    Method hijri    = m("hijri", JSONObject.class, int.class);
    TimeZone london = TimeZone.getTimeZone("Europe/London");

    /* Walk every date the file actually carries, by the offset from today
       the widget would use to reach it. The file holds one calendar year, so
       the offsets run negative for the months already past. */
    List<String> keys = new ArrayList<String>();
    for (Iterator<String> it = days.keys(); it.hasNext(); ) keys.add(it.next());
    Collections.sort(keys);
    Calendar midnight = Calendar.getInstance(london, Locale.UK);
    midnight.set(Calendar.HOUR_OF_DAY, 0); midnight.set(Calendar.MINUTE, 0);
    midnight.set(Calendar.SECOND, 0); midnight.set(Calendar.MILLISECOND, 0);
    int daysWithSlots = 0, fridays = 0, jumuahDays = 0;
    long prevDayLast = 0;
    for (String key : keys) {
      Calendar target = Calendar.getInstance(london, Locale.UK);
      target.clear();
      target.set(Integer.parseInt(key.substring(0, 4)),
                 Integer.parseInt(key.substring(5, 7)) - 1,
                 Integer.parseInt(key.substring(8, 10)));
      int d = (int) Math.round((target.getTimeInMillis() - midnight.getTimeInMillis()) / 86400000.0);
      List<?> slots = (List<?>) daySlots.invoke(w, days, d);
      if (slots.isEmpty()) continue;
      daysWithSlots++;
      /* every day's congregations must come out in time order */
      for (int i = 1; i < slots.size(); i++) {
        if (at(slots.get(i)) <= at(slots.get(i - 1))) {
          ok(false, "day +" + d + " is out of order at " + nm(slots.get(i)));
          return;
        }
      }
      Calendar c = Calendar.getInstance(london);
      c.setTimeInMillis(at(slots.get(0)));
      boolean isFriday = c.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY;
      boolean hasJumuah = false;
      for (Object s : slots) if (nm(s).contains("Jumu")) hasJumuah = true;
      if (isFriday) { fridays++; if (hasJumuah) jumuahDays++; }
      if (!isFriday && hasJumuah) { ok(false, "day +" + d + " is not a Friday but lists Jumuʿah"); return; }
      /* and no day may start before the previous one ended */
      if (at(slots.get(0)) <= prevDayLast) { ok(false, "day +" + d + " overlaps the day before"); return; }
      prevDayLast = at(slots.get(slots.size() - 1));
    }
    ok(daysWithSlots == keys.size(), daysWithSlots + " days of congregations, each in time order, none overlapping the day before");
    ok(fridays >= 52 && jumuahDays == fridays, "all " + fridays + " Fridays in range list Jumuʿah, and no other day does");

    /* nextFrom must return the first congregation strictly after the instant
       it is given — including across midnight, which is where an off-by-one
       shows up as "next: Fajr" at 4am when Fajr has already been. */
    List<?> today = (List<?>) daySlots.invoke(w, days, 0);
    int probes = 0;
    for (Object s : today) {
      long t = at(s);
      Object just = nextFrom.invoke(w, days, t - 1000);     /* a second before */
      Object after = nextFrom.invoke(w, days, t);           /* exactly on it */
      if (just == null || at(just) != t) { ok(false, "a second before " + nm(s) + ", nextFrom did not return it"); return; }
      if (after == null || at(after) <= t) { ok(false, "on " + nm(s) + ", nextFrom returned it again instead of moving on"); return; }
      probes += 2;
    }
    ok(true, probes + " probes either side of every congregation today, each returning the right one");

    Object mid = nextFrom.invoke(w, days, at(today.get(today.size() - 1)) + 60000);
    ok(mid != null && nm(mid).equals("Fajr"), "after the last jamāʿah of the day, the next one is tomorrow's Fajr (" + (mid == null ? "null" : nm(mid)) + ")");

    /* The provider returns it in its natural case and the layout sets
       textAllCaps, so what is checked here is that it is present and that the
       " AH" suffix is gone — the column has no room for it. */
    String h = (String) hijri.invoke(w, days, 0);
    ok(h != null && h.length() > 4 && !h.contains(" AH"), "the hijri line reads \"" + h + "\"");
    /* The widget's times column is 116dp and scripts/check-android-widget.mjs
       sizes it for a date with no year. If this method stops trimming the
       year, that check keeps passing — it mirrors the trim rather than
       calling it — and the date silently ellipsizes on the phone. So the
       shape of what hijri() returns is pinned here, next to the method. */
    ok(!h.matches(".*\\d{3,4}\\s*$"),
       "and carries no year, which is what the 116dp column is sized for");
    String missing = (String) hijri.invoke(w, days, 4000);
    ok("".equals(missing), "a date past the end of the timetable gives an empty hijri line, not a crash");

    System.out.println(fail == 0 ? "\nthe Android widget picks the right prayer" : "\n" + fail + " failure(s)");
    System.exit(fail == 0 ? 0 : 1);
  }
}
