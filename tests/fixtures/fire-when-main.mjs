/**
 * Exported app + fire(...) with callerUrl guard.
 * When this file is the entry script, fire runs.
 * When this file is only imported, fire no-ops.
 */
import { fire } from "../../dist/index.js";

export const app = {
  answer() {
    return 42;
  },
};

fire(app, import.meta.url, {
  argv: ["answer"],
});
