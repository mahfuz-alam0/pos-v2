"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider({
  className = "",
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root data-slot="slider" className={cn("relative flex w-full items-center", className)} {...props}>
      <SliderPrimitive.Control className="relative flex h-4 w-full items-center">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-muted">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
          <SliderPrimitive.Thumb className="block size-4 rounded-full border border-primary bg-background shadow transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50" />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
