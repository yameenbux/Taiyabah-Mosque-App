/* OneSignal Web SDK service worker.
   Kept on its own scope (/push/onesignal/) so it does not collide with the
   app's own service worker (sw.js) at the site root. */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

