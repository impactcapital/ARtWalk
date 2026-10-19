export type ARBackend = "8thwall" | "arjs" | "webxr";

export interface ARScene {
  anchorId: string;
  /** Absolute URL to a GLTF/GLB asset */
  assetUrl: string;
  scale?: [number, number, number];
  rotation?: [number, number, number];
  position?: [number, number, number];
  animationName?: string;
}

export interface ARRendererOptions {
  backend: ARBackend;
  /** 8th Wall API key — required when backend is '8thwall' */
  apiKey?: string;
  /** DOM element the renderer mounts into */
  container: HTMLElement;
  onReady?: () => void;
  onError?: (err: Error) => void;
}

/**
 * The single interface every AR backend must satisfy.
 * Swap implementations without touching application code.
 */
export interface ARRenderer {
  /** Initialize the camera pipeline and tracking */
  init(): Promise<void>;
  /** Place or replace a scene anchored to the current camera position */
  showScene(scene: ARScene): void;
  /** Remove the current scene */
  clearScene(): void;
  /** Release camera and tracking resources */
  destroy(): void;
  readonly backend: ARBackend;
  readonly isReady: boolean;
}
