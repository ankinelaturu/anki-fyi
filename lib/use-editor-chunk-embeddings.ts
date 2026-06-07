"use client";

import { useEffect, useState } from "react";
import {
  getFileChunkEmbeddings,
  type FileChunkEmbeddings,
} from "@/lib/assistant/editorEmbeddings";

export function useEditorChunkEmbeddings(
  path: string,
  enabled: boolean
): FileChunkEmbeddings | null {
  const [embeddings, setEmbeddings] = useState<FileChunkEmbeddings | null>(null);

  useEffect(() => {
    if (!enabled) {
      setEmbeddings(null);
      return;
    }

    let cancelled = false;

    getFileChunkEmbeddings(path)
      .then((result) => {
        if (!cancelled) setEmbeddings(result);
      })
      .catch((error) => {
        console.error("[Editor embeddings]", error);
        if (!cancelled) setEmbeddings(null);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, path]);

  return embeddings;
}
