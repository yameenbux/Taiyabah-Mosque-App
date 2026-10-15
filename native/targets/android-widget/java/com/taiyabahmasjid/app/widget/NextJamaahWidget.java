/*
 * Taiyabah Masjid — the next jamāʿah on an Android home screen.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE iOS WIDGET'S COUNTERPART, and it has to exist. Of the congregation on
 * the native app the split is roughly even, and a home-screen widget shipped
 * to one half and not the other is not a feature, it is a complaint waiting.
 *
 * WHERE THE TIMES COME FROM. res/raw/timetable.json, the same file the iOS
 * widget carries, copied in at prebuild by plugins/with-android-widget.js. A
 * widget that depends on the app having been opened recently is blank for the
 * person who installed it and then did not open the app — which is exactly the
 * person a widget is for.
 *
 * HOW IT STAYS RIGHT. Two things, neither of which is a polling loop:
 *
 *   - the countdown is a Chronometer counting down to the jamāʿah, which
 *     Android ticks itself. No updates, no battery, and it cannot drift.
 *   - which prayer is NEXT only changes at a jamāʿah, so one alarm is set for
 *     that moment and the widget redraws then.
 *
 * The alarm is inexact (setAndAllowWhileIdle). An exact one needs
 * SCHEDULE_EXACT_ALARM on Android 12+, which is a permission Play asks
 * questions about and which this does not warrant: if Doze delays the redraw
 * by a few minutes the Chronometer has already hit zero and is counting up,
 * which reads correctly as "it has started".
 *
 * WHY JAVA. There is no Android SDK in the environment this was written in, so
 * it was type-checked against a full framework jar with javac instead. Kotlin
 * could not have been checked at all, and a widget nobody can compile is worth
 * less than one written in a plainer language.
 */
package com.taiyabahmasjid.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;

/* The R class aapt generates belongs to the application's namespace
 * (com.taiyabahmasjid.app), not to this sub-package. Without this import a
 * bare R resolves to com.taiyabahmasjid.app.widget.R, which nothing ever
 * generates, and the build fails on every single resource reference. */
import com.taiyabahmasjid.app.R;

import org.json.JSONObject;

import java.io.InputStream;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public class NextJamaahWidget extends AppWidgetProvider {

  /* The masjid's clock is London's, not the phone's. A device that has
     travelled must still be told the Bolton jamāʿah. */
  private static final TimeZone LONDON = TimeZone.getTimeZone("Europe/London");

  /* Sunrise is deliberately absent: it is not a jamāʿah, and offering it as
     "next" sends somebody to the masjid for a prayer that is not held. */
  private static final String[] KEYS  = { "fajr", "zuhr", "asr", "maghrib", "isha" };
  private static final String[] NAMES = { "Fajr", "Zuhr", "Asr", "Maghrib", "Isha" };

  /* Below either of these the list of the day's times has nowhere to go, so
     the narrow layout is used. Measured in dp, as Android reports it.

     Height matters as much as width and it is easy to forget: a launcher lets
     someone drag the widget down to two cells while leaving it four wide, and
     the wide layout's six rows would then be clipped at the bottom — losing
     Isha, the one people check latest. TALL_DP is the wide layout's measured
     need; scripts/check-android-widget.mjs measures the XML and fails the
     build if either layout outgrows the size it is used at. */
  private static final int WIDE_DP = 280;
  private static final int TALL_DP = 150;

  private static final String ACTION_TICK = "com.taiyabahmasjid.app.widget.TICK";

  /** One congregation on the day being shown. */
  private static final class Slot {
    final String name;
    final long at;
    Slot(String name, long at) { this.name = name; this.at = at; }
  }

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    for (int id : ids) draw(context, manager, id);
    scheduleNextRedraw(context);
  }

  @Override
  public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager,
                                        int id, Bundle newOptions) {
    draw(context, manager, id);
  }

  @Override
  public void onReceive(Context context, Intent intent) {
    super.onReceive(context, intent);
    String action = intent.getAction();
    if (ACTION_TICK.equals(action)
        || Intent.ACTION_BOOT_COMPLETED.equals(action)
        || Intent.ACTION_TIME_CHANGED.equals(action)
        || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
        || Intent.ACTION_DATE_CHANGED.equals(action)) {
      AppWidgetManager manager = AppWidgetManager.getInstance(context);
      int[] ids = manager.getAppWidgetIds(new ComponentName(context, NextJamaahWidget.class));
      onUpdate(context, manager, ids);
    }
  }

  // ---------------------------------------------------------------- drawing

  private void draw(Context context, AppWidgetManager manager, int id) {
    JSONObject days = timetable(context);
    List<Slot> today = daySlots(days, 0);
    Slot next = nextFrom(days, System.currentTimeMillis());

    Bundle options = manager.getAppWidgetOptions(id);
    int minWidth = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
    int minHeight = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
    boolean wide = minWidth >= WIDE_DP && minHeight >= TALL_DP;

    int layout = wide ? R.layout.taiyabah_widget_wide : R.layout.taiyabah_widget_small;
    RemoteViews views = new RemoteViews(context.getPackageName(), layout);

    if (next == null) {
      /* The timetable has run out — the masjid publishes a year at a time.
         Say so rather than showing a stale time. */
      views.setTextViewText(R.id.tw_name, "Timetable");
      views.setTextViewText(R.id.tw_time, "not published");
      views.setViewVisibility(R.id.tw_until, android.view.View.GONE);
    } else {
      views.setTextViewText(R.id.tw_name, next.name);
      views.setTextViewText(R.id.tw_time, pretty(next.at));
      views.setViewVisibility(R.id.tw_until, android.view.View.VISIBLE);
      /* Chronometer counts down from the device's elapsed-realtime base, so
         the base is the jamāʿah expressed in that clock, not in wall time. */
      long base = android.os.SystemClock.elapsedRealtime() + (next.at - System.currentTimeMillis());
      views.setChronometer(R.id.tw_until, base, null, true);
      views.setChronometerCountDown(R.id.tw_until, true);
    }

    if (wide) {
      views.setTextViewText(R.id.tw_hijri, hijri(days, 0));
      int[] rowName = { R.id.tw_r0_name, R.id.tw_r1_name, R.id.tw_r2_name,
                        R.id.tw_r3_name, R.id.tw_r4_name, R.id.tw_r5_name };
      int[] rowTime = { R.id.tw_r0_time, R.id.tw_r1_time, R.id.tw_r2_time,
                        R.id.tw_r3_time, R.id.tw_r4_time, R.id.tw_r5_time };
      for (int i = 0; i < rowName.length; i++) {
        if (i < today.size()) {
          Slot s = today.get(i);
          boolean isNext = next != null && s.at == next.at;
          boolean past = next != null && s.at < next.at;
          views.setViewVisibility(rowName[i], android.view.View.VISIBLE);
          views.setViewVisibility(rowTime[i], android.view.View.VISIBLE);
          views.setTextViewText(rowName[i], s.name);
          views.setTextViewText(rowTime[i], pretty(s.at));
          int colour = isNext ? 0xFFDCBB63 : (past ? 0x57F6F1E6 : 0xE0F6F1E6);
          views.setTextColor(rowName[i], colour);
          views.setTextColor(rowTime[i], colour);
        } else {
          views.setViewVisibility(rowName[i], android.view.View.GONE);
          views.setViewVisibility(rowTime[i], android.view.View.GONE);
        }
      }
    }

    /* Tapping it opens the Times tab, the same deep link the iOS widget uses
       and the one native/scripts/test/links.test.mjs holds to a real route. */
    Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("taiyabah://times"));
    open.setPackage(context.getPackageName());
    PendingIntent tap = PendingIntent.getActivity(
        context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    views.setOnClickPendingIntent(R.id.tw_root, tap);

    manager.updateAppWidget(id, views);
  }

  // ------------------------------------------------------------- the times

  private JSONObject timetable(Context context) {
    InputStream in = null;
    try {
      in = context.getResources().openRawResource(R.raw.taiyabah_timetable);
      byte[] buf = new byte[in.available()];
      int read = in.read(buf);
      if (read <= 0) return null;
      JSONObject root = new JSONObject(new String(buf, Charset.forName("UTF-8")));
      return root.optJSONObject("days");
    } catch (Exception e) {
      return null;
    } finally {
      try { if (in != null) in.close(); } catch (Exception ignored) { }
    }
  }

  private Calendar londonNow() {
    return Calendar.getInstance(LONDON, Locale.UK);
  }

  private String isoKey(Calendar day) {
    return String.format(Locale.UK, "%04d-%02d-%02d",
        day.get(Calendar.YEAR), day.get(Calendar.MONTH) + 1, day.get(Calendar.DAY_OF_MONTH));
  }

  /** Midnight-anchored day, plus an "HH:mm" on it, as a wall-clock instant. */
  private long instant(Calendar day, String hhmm) {
    if (hhmm == null || hhmm.length() < 4) return -1;
    String[] bits = hhmm.split(":");
    if (bits.length != 2) return -1;
    try {
      Calendar c = (Calendar) day.clone();
      c.set(Calendar.HOUR_OF_DAY, Integer.parseInt(bits[0].trim()));
      c.set(Calendar.MINUTE, Integer.parseInt(bits[1].trim()));
      c.set(Calendar.SECOND, 0);
      c.set(Calendar.MILLISECOND, 0);
      return c.getTimeInMillis();
    } catch (NumberFormatException e) {
      return -1;
    }
  }

  private String hijri(JSONObject days, int dayOffset) {
    if (days == null) return "";
    Calendar day = londonNow();
    day.add(Calendar.DAY_OF_MONTH, dayOffset);
    JSONObject rec = days.optJSONObject(isoKey(day));
    if (rec == null) return "";
    /* "AH" and the year are both dropped: anybody reading a hijri date on a
       masjid's widget knows which calendar it is and which year they are in,
       and the column is 116dp. With the year "10 Jumada al-Awwal 1448 AH"
       measures 131dp in caps at 8sp and is silently ellipsized to
       "10 JUMADA AL-AWWAL 14…", which is worse than not showing it. */
    return rec.optString("hijri", "").replace(" AH", "").replaceAll("\\s+\\d{3,4}$", "");
  }

  /**
   * Every congregation on one day, in order, with Friday handled properly: the
   * Zuhr slot IS Jumuʿah, and where the masjid holds two sittings both are
   * shown. Naming only the first sends half the congregation at the wrong time
   * on the day most of them come.
   */
  private List<Slot> daySlots(JSONObject days, int dayOffset) {
    List<Slot> out = new ArrayList<Slot>();
    if (days == null) return out;
    Calendar day = londonNow();
    day.add(Calendar.DAY_OF_MONTH, dayOffset);
    JSONObject rec = days.optJSONObject(isoKey(day));
    if (rec == null) return out;

    JSONObject jamaat = rec.optJSONObject("jamaat");
    JSONObject jummah = rec.optJSONObject("jummah");
    if (jamaat == null) return out;

    for (int i = 0; i < KEYS.length; i++) {
      if ("zuhr".equals(KEYS[i]) && jummah != null) {
        String first = emptyToNull(jummah.optString("first", ""));
        String second = emptyToNull(jummah.optString("second", ""));
        if (first != null) {
          long at = instant(day, first);
          if (at > 0) out.add(new Slot(second == null ? "Jumuʿah" : "1st Jumuʿah", at));
          if (second != null) {
            long at2 = instant(day, second);
            if (at2 > 0) out.add(new Slot("2nd Jumuʿah", at2));
          }
          continue;
        }
      }
      String hhmm = emptyToNull(jamaat.optString(KEYS[i], ""));
      if (hhmm == null) continue;
      long at = instant(day, hhmm);
      if (at > 0) out.add(new Slot(NAMES[i], at));
    }

    /* Sorted, because a second Jumuʿah can fall after Asr begins on a short
       winter Friday and a list out of order is worse than no list. */
    java.util.Collections.sort(out, new java.util.Comparator<Slot>() {
      public int compare(Slot a, Slot b) { return Long.compare(a.at, b.at); }
    });
    return out;
  }

  /** The first jamāʿah after `from`, looking a few days ahead if it must. */
  private Slot nextFrom(JSONObject days, long from) {
    for (int d = 0; d < 7; d++) {
      for (Slot s : daySlots(days, d)) if (s.at > from) return s;
    }
    return null;
  }

  private static String emptyToNull(String s) {
    return (s == null || s.trim().length() == 0) ? null : s.trim();
  }

  private String pretty(long at) {
    Calendar c = Calendar.getInstance(LONDON, Locale.UK);
    c.setTimeInMillis(at);
    int h = c.get(Calendar.HOUR);
    if (h == 0) h = 12;
    return String.format(Locale.UK, "%d:%02d%s", h, c.get(Calendar.MINUTE),
        c.get(Calendar.AM_PM) == Calendar.AM ? "am" : "pm");
  }

  // ------------------------------------------------------------ the redraw

  /**
   * One alarm, at the next jamāʿah. Not a repeating timer: the only moment the
   * answer changes is when a congregation starts.
   */
  private void scheduleNextRedraw(Context context) {
    Slot next = nextFrom(timetable(context), System.currentTimeMillis());
    if (next == null) return;
    AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarms == null) return;

    Intent tick = new Intent(context, NextJamaahWidget.class);
    tick.setAction(ACTION_TICK);
    PendingIntent pending = PendingIntent.getBroadcast(
        context, 1, tick, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    /* A second past the jamāʿah, so the widget has moved on by the time
       somebody looks at it rather than sitting on a time that has passed. */
    alarms.setAndAllowWhileIdle(AlarmManager.RTC, next.at + 1000L, pending);
  }
}
