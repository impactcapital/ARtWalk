import type { ARRenderer, ARRendererOptions, ARScene, ARBackend } from "./types.js";

declare global {
  interface Window {
    XR8: {
      addCameraPipelineModules: (modules: unknown[]) => void;
      run: (config: { canvas: HTMLCanvasElement }) => void;
    };
    XRExtras: {
      AlmostThere: { pipelineModule: () => unknown };
      Loading: { pipelineModule: () => unknown };
      RuntimeError: { pipelineModule: () => unknown };
    };
    AFRAME: {
      scenes: Array<{ emit: (event: string) => void };
    };
  }
}

export class EightWallRenderer implements ARRenderer {
  readonly backend: ARBackend = "8thwall";
  isReady = false;

  private scene: ARScene | null = null;
  private opts: ARRendererOptions;

  constructor(opts: ARRendererOptions) {
    this.opts = opts;
  }

  async init(): Promise<void> {
    if (!this.opts.apiKey) throw new Error("8th Wall requires an API key");

    await this.#injectSDK(this.opts.apiKey);
    await this.#injectAFrame();
    this.#mountScene();

    this.isReady = true;
    this.opts.onReady?.();
  }

  showScene(scene: ARScene): void {
    this.scene = scene;
    const entity = document.getElementById("artwalk-model");
    if (!entity) return;

    entity.setAttribute("gltf-model", scene.assetUrl);
    if (scene.scale)    entity.setAttribute("scale", scene.scale.join(" "));
    if (scene.rotation) entity.setAttribute("rotation", scene.rotation.join(" "));
    if (scene.position) entity.setAttribute("position", scene.position.join(" "));
  }

  clearScene(): void {
    this.scene = null;
    const entity = document.getElementById("artwalk-model");
    entity?.removeAttribute("gltf-model");
  }

  destroy(): void {
    this.clearScene();
    this.isReady = false;
    const canvas = this.opts.container.querySelector("canvas");
    canvas?.remove();
  }

  #mountScene(): void {
    this.opts.container.innerHTML = `
      <a-scene
        xrweb="disableWorldTracking: false"
        xr-extras-loading
        xr-extras-almost-there
        xr-extras-runtime-error
        vr-mode-ui="enabled: false"
      >
        <a-assets></a-assets>
        <a-camera position="0 0 0"></a-camera>
        <a-entity id="artwalk-model" position="0 0 -2"></a-entity>
      </a-scene>
    `;
  }

  async #injectSDK(apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.XR8) { resolve(); return; }
      const s = document.createElement("script");
      s.src = `https://apps.8thwall.com/xrweb?appKey=${apiKey}`;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load 8th Wall SDK"));
      document.head.appendChild(s);
    });
  }

  async #injectAFrame(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.AFRAME) { resolve(); return; }
      const s = document.createElement("script");
      s.src = "https://aframe.io/releases/1.5.0/aframe.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load A-Frame"));
      document.head.appendChild(s);
    });
  }
}
