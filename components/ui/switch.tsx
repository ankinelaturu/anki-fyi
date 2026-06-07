"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-ide-border bg-[#2a2a2a] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ide-blue disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[#569cd6]/60 data-[state=checked]:bg-[#569cd6]/25",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-3 w-3 rounded-full bg-ide-muted shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-3 data-[state=checked]:bg-[#7ec8ff]"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
