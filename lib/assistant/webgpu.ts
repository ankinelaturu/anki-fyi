/**
 * Runtime detection for WebGPU availability in the browser.
 *
 * Ask Anki's local Gemma path requires a working GPU adapter; this module
 * performs a lightweight `requestAdapter()` probe without loading models.
 */

type NavigatorWithGPU = Navigator & {
  gpu?: { requestAdapter(): Promise<unknown> };
};

/**
 * Returns whether WebGPU is present and can obtain a non-null adapter.
 *
 * Safe to call during SSR (`navigator` undefined) — returns `false`.
 */
export async function isWebGPUAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const gpu = (navigator as NavigatorWithGPU).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}
