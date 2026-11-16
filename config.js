// The only file to edit when you put the website online.
// Everything here is safe to be public (the Stripe secret key is NOT here; it
// lives in Supabase function secrets).
window.FLEET_CONFIG = {
  appName: 'Fleet Marshal', // placeholder name; change here and in app.json
  supabaseUrl: 'https://sfxygdsbphfcyyoxjqks.supabase.co',
  supabaseKey: 'sb_publishable_vQyRgVxFQgZxHhtLadRYNw_dne6-YD1',
  appStoreUrl: '', // fill in once the iPhone app is live; the button is hidden while empty
  playStoreUrl: '', // same for Android
  // Optional. A Mapbox PUBLIC token (starts with pk.), locked to this site's address in
  // your Mapbox account. With it, the "on my way" page shows a map. Without it, the
  // page still works: it says how far away the truck is and how fresh that is.
  mapboxToken: '',
  // How to reach support is NOT set here. It is one value in the database, read by
  // the app and every page (see README, Setup, step 1.4).
};
