import { format } from "date-fns";
import { Clock, AlertCircle, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SentMessageCell({ conversation }) {
  const content = String(conversation?.content || conversation?.message || "");
  const timestamp = conversation?.createdAt || conversation?.timestamp;
  const isOptimistic = conversation?.isOptimistic || false;
  const isFailed = conversation?.isFailed || false;

  const imageSources = Array.isArray(conversation?.image)
    ? conversation.image.map((img) => (img.startsWith("data:") ? img : `data:${img}`))
    : [];

  return (
    <div className="flex justify-end">
      <div
        className={cn(
          "max-w-[70%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground shadow-sm",
          isFailed && "bg-destructive/70"
        )}
      >
        {imageSources.length > 0 && (
          <div className="mb-2 flex flex-col gap-2">
            {imageSources.map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={src}
                alt={`Sent image ${index + 1}`}
                className="h-auto max-h-[300px] max-w-full rounded-lg object-contain"
              />
            ))}
          </div>
        )}

        {content && <p className="m-0 mb-1 text-sm leading-relaxed break-words">{content}</p>}

        <div className="flex items-center justify-end gap-1">
          <span className="text-xs text-primary-foreground/85">{timestamp ? format(new Date(timestamp), "h:mm a") : ""}</span>
          {isFailed && <AlertCircle className="size-3 text-primary-foreground/85" aria-label="Failed to send" />}
          {isOptimistic && !isFailed && (
            <Clock className="size-3 animate-pulse text-primary-foreground/85" aria-label="Sending..." />
          )}
          {!isOptimistic && !isFailed && (
            <CheckCheck
              className={cn("size-3", conversation?.status === "read" ? "text-blue-200" : "text-primary-foreground/85")}
              aria-label={conversation?.status === "read" ? "Read" : "Sent"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
