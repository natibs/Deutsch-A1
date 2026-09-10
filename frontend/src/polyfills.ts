// Fills in newer ECMAScript built-ins (Object.hasOwn, Array.prototype.at,
// structuredClone-adjacent, etc.) that Angular's own compiled runtime relies
// on but that predate the WebView on some older Android devices — e.g. an
// Android 11 tablet's Chrome 92 WebView is missing Object.hasOwn (Chrome 93+).
// Loaded as its own bundle, guaranteed to finish running before the main
// application bundle starts.
import 'core-js/stable';
