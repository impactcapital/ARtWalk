export type { ARRenderer, ARScene, ARRendererOptions, ARBackend } from "./types.js";
export { EightWallRenderer } from "./8thwall.js";

import type { ARRendererOptions, ARRenderer } from "./types.js";
import { EightWallRenderer } from "./8thwall.js";

export function createARRenderer(opts: ARRendererOptions): ARRenderer {
  switch (opts.backend) {
    case "8thwall":
      return new EightWallRenderer(opts);
    case "arjs":
    case "webxr":
      throw new Error(`Backend '${opts.backend}' not yet implemented`);
  }
}
