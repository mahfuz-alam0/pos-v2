import { format } from "date-fns";

export default function ReceivedMessageCell({ conversation }) {
  const content = String(conversation?.content || conversation?.message || "");
  const timestamp = conversation?.createdAt || conversation?.timestamp;

  const imageSources = Array.isArray(conversation?.image)
    ? conversation.image.map((img) => (img.startsWith("data:") ? img : `data:${img}`))
    : [];

  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-component-bg px-4 py-3 shadow-sm ring-1 ring-foreground/10">
        {imageSources.length > 0 && (
          <div className="mb-2 flex flex-col gap-2">
            {imageSources.map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={src}
                alt={`Received image ${index + 1}`}
                className="h-auto max-h-[300px] max-w-full rounded-lg object-contain"
              />
            ))}
          </div>
        )}

        {content && <p className="m-0 mb-1 text-sm leading-relaxed break-words text-foreground">{content}</p>}

        <span className="text-xs text-muted-foreground">{timestamp ? format(new Date(timestamp), "h:mm a") : ""}</span>
      </div>
    </div>
  );
}
