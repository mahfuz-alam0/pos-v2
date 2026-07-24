"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Ports old components/alertPopup.js (QuestionPopover). The antd Popover +
// Badge dot + blinking question icon become a shadcn Tooltip with a blinking
// lucide HelpCircle. `data` is trusted help HTML (same as old
// dangerouslySetInnerHTML usage — callers pass static strings).
//
// NOTE: this is largely redundant with the shadcn Tooltip primitive itself;
// the only thing it adds is the blinking red icon + HTML content. Prefer using
// <Tooltip> directly for plain-text help.
export default function AlertPopup({ data }) {
  return (
    <div className="text-right">
      <Tooltip>
        <TooltipTrigger
          render={
            <button type="button" className="relative inline-flex" aria-label="Help">
              <HelpCircle className="size-4 animate-pulse text-red-500" />
              <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-red-500" />
            </button>
          }
        />
        <TooltipContent className="max-w-xs">
          <div dangerouslySetInnerHTML={{ __html: data }} />
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
