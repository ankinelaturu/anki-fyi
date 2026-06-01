"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UsePanelResizeOptions = {
  initial: number;
  min: number;
  max: number | (() => number);
  axis: "x" | "y";
  invertDelta?: boolean;
};

export function usePanelResize({ initial, min, max, axis, invertDelta = false }: UsePanelResizeOptions) {
  const [size, setSize] = useState(initial);
  const [active, setActive] = useState(false);
  const dragRef = useRef({ pointer: 0, size: initial });

  const getMax = useCallback(() => (typeof max === "function" ? max() : max), [max]);

  const onResizeStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      dragRef.current = {
        pointer: axis === "x" ? event.clientX : event.clientY,
        size,
      };
      setActive(true);
    },
    [axis, size]
  );

  useEffect(() => {
    if (!active) return;

    const cursor = axis === "x" ? "ew-resize" : "ns-resize";

    const onMove = (event: MouseEvent) => {
      const pointer = axis === "x" ? event.clientX : event.clientY;
      const delta = pointer - dragRef.current.pointer;
      const next = dragRef.current.size + (invertDelta ? -delta : delta);
      setSize(Math.min(getMax(), Math.max(min, next)));
    };

    const onEnd = () => setActive(false);

    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
  }, [active, axis, invertDelta, min, getMax]);

  const reset = useCallback(() => setSize(initial), [initial]);

  const clamp = useCallback(
    (value: number) => Math.min(getMax(), Math.max(min, value)),
    [getMax, min]
  );

  return { size, setSize, active, onResizeStart, reset, clamp };
}
