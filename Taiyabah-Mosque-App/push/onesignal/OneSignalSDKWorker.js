/* Compatibility copy — see push/onesignal/OneSignalSDKWorker.js for the canonical one.

   OneSignal stores the service worker path in its dashboard, and it still
   names the GitHub Pages project subfolder: it requests

     /Taiyabah-Mosque-App/push/onesignal/OneSignalSDKWorker.js

   On the custom domain the app is served at the root, so that URL 404s, the
   worker never loads, and OneSignal.init() fails outright with "load failed" —
   no subscription, no id, no tags, no notifications.

   Serving the file here as well makes that stored path resolve, so push works
   whatever the dashboard says. Once the dashboard path is corrected to
   push/onesignal/ this directory can go. Keep both in step until then. */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
