"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type RawViewProps = {
  rawFormatted: string;
  embedding: number[];
};

export function RawView({ rawFormatted, embedding }: RawViewProps) {
  const [copied, setCopied] = useState(false);

  const copyVector = async () => {
    const text = JSON.stringify(embedding);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex justify-end">
        <Button type="button" variant="terminal" onClick={copyVector} className="text-[10px]">
          {copied ? "Copied" : "Copy Vector"}
        </Button>
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-ide-border bg-[#1e1e1e] p-2 font-mono text-[9px] leading-snug text-ide-text">
        {rawFormatted}
      </pre>
    </div>
  );
}
