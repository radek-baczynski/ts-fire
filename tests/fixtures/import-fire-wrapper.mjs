/** Loads fire-when-main as a dependency; CLI must not fire the nested module. */
import "./fire-when-main.mjs";

// Proves this file ran; fire() in the dependency must not print 42.
console.log("__import_side_effect_ok__");
