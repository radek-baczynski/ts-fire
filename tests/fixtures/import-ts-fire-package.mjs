/** Import package entry only — must not run any CLI or exit. */
await import("../../dist/index.js");
console.log("__pkg_import_only__");
