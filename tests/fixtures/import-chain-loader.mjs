/** Re-exports dependency that calls fire; deepest module must not act as CLI when this is entry. */
import "./import-fire-wrapper.mjs";
console.log("__chain_loader__");
