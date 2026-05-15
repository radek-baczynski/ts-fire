/** Dynamic import of a module that calls fire() at top level; fire must not run. */
await import("./fire-when-main.mjs");
console.log("__dynamic_import_loader__");
