/** Static import of a module that calls fire() at top level; fire must not run. */
import "./fire-when-main.mjs";
console.log("__static_import_loader__");
