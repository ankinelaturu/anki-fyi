type NavigatorWithGPU = Navigator & {
  gpu?: { requestAdapter(): Promise<unknown> };
};

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
