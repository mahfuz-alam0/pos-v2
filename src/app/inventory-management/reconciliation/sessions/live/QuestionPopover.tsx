"use client";

import DOMPurify from "dompurify";
import { HelpCircle } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function QuestionPopover({ data }: { data: string }) {
  return (
    <Popover>
      <PopoverTrigger className="relative">
        <HelpCircle className="size-4 animate-pulse text-destructive" />
      </PopoverTrigger>
      <PopoverContent>
        <div className="mb-1 text-xs font-semibold">Help</div>
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data) }} />
      </PopoverContent>
    </Popover>
  );
}
