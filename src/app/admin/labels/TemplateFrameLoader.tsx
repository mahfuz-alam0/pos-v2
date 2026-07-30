"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import type { PrintTemplate } from "./types";

const EDITOR_URL = "https://print-template-builder-pos.vercel.app/";

interface Margins {
  top: number | string;
  right: number | string;
  bottom: number | string;
  left: number | string;
}

interface TemplateFrameLoaderProps {
  width: string;
  height: string;
  dimensionUnit: string;
  type: string;
  margins: Margins;
  isEditing: boolean;
  templateData: PrintTemplate | null;
}

export default function TemplateFrameLoader({
  width,
  height,
  dimensionUnit,
  type,
  margins,
  isEditing,
  templateData,
}: TemplateFrameLoaderProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "PONG") {
        if (isEditing && templateData?.templateHtml && iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            { type: "TEMPLATE_DATA", data: templateData.templateHtml },
            "*"
          );
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isEditing, templateData]);

  const handleLoad = () => {
    setIframeLoaded(true);
    iframeRef.current?.contentWindow?.postMessage({ type: "PING" }, "*");
  };

  const marginsParam = encodeURIComponent(
    JSON.stringify({
      top: `${margins.top}${dimensionUnit}`,
      bottom: `${margins.bottom}${dimensionUnit}`,
      right: `${margins.right}${dimensionUnit}`,
      left: `${margins.left}${dimensionUnit}`,
    })
  );

  return (
    <div className="relative h-full w-full">
      {!iframeLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading Editor...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        src={`${EDITOR_URL}?width=${width}${dimensionUnit}&height=${height}${dimensionUnit}&type=${type}&margins=${marginsParam}`}
        onLoad={handleLoad}
        style={{ visibility: iframeLoaded ? "visible" : "hidden" }}
        sandbox="allow-same-origin allow-scripts allow-modals allow-forms allow-popups allow-pointer-lock"
        title="Template Editor Frame"
      />
    </div>
  );
}
