/* OneSignal Web SDK updater service worker.
   The dashboard requires an updater filename; v16 uses the same import.
   Kept on the same scope as OneSignalSDKWorker.js (/push/onesignal/) so
   neither collides with the app's own service worker at the site root. */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

