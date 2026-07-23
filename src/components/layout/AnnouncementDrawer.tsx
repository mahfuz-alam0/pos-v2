"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";
import Drawer from "@/components/ui/Drawer";
import { useTheme } from "@/context/theme-context";
import { fetchAnnouncementsList } from "@/services/announcements/list";

// body is Quill-authored HTML — sanitized with DOMPurify before render
// API item shape differs from card shape: id/title/section/body/thumbnail/media/video/mediaFirst match,
// `type` is uppercase (ARTICLE/IMAGE/VIDEO), date comes from scheduledAt
const normalize = (item) => ({
  ...item,
  type: item.type?.toLowerCase(),
  date: item.scheduledAt,
});

// FB/IG-style dynamic grid — 1 full, 2 even split, 3 big+stack, 4+ 2x2 with "+N" overlay
const MediaGrid = ({ images, height = 320 }) => {
  if (!images?.length) return null;

  const count = images.length;
  const extraCount = count - 4;

  return (
    <div
      className={`grid w-full gap-1 ${count === 1 ? "grid-cols-1" : "grid-cols-2"}`}
      style={{ height }}
    >
      {count === 1 && (
        <img src={images[0]} alt="" className="h-full w-full object-cover" />
      )}

      {count === 2 &&
        images.map((src) => (
          <img key={src} src={src} alt="" className="h-full w-full object-cover" />
        ))}

      {count === 3 && (
        <>
          <img
            src={images[0]}
            alt=""
            className="row-span-2 h-full w-full object-cover"
          />
          <div className="grid h-full grid-rows-2 gap-1">
            {images.slice(1, 3).map((src) => (
              <img key={src} src={src} alt="" className="h-full w-full object-cover" />
            ))}
          </div>
        </>
      )}

      {count >= 4 &&
        images.slice(0, 4).map((src, i) => {
          const isLastTile = i === 3;
          return (
            <div key={src} className="relative h-full w-full">
              <img src={src} alt="" className="h-full w-full object-cover" />
              {isLastTile && extraCount > 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-2xl font-semibold text-white">
                    +{extraCount}
                  </span>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

const goFullscreen = (e) => {
  e.currentTarget.requestFullscreen?.();
};

const toImageArray = (media) => {
  if (!media) return [];
  return Array.isArray(media) ? media : [media];
};

// backend toggle: item.mediaFirst === false renders video above media, default (true/unset) media above video
const renderAttachments = (item, { media, video }) => {
  const blocks =
    item.mediaFirst === false
      ? [item.video && video, item.media && media]
      : [item.media && media, item.video && video];
  return blocks.filter(Boolean);
};

const EXCERPT_LENGTH = 140;

const excerpt = (html) => {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  const text = clean.replace(/\s+/g, " ").trim();
  return text.length > EXCERPT_LENGTH
    ? `${text.slice(0, EXCERPT_LENGTH)}…`
    : text;
};

const PostCard = ({ item, index, onOpen, isDark }) => {
  return (
    <div
      onClick={() => onOpen(item)}
      style={{ animationDelay: `${index * 40}ms` }}
      className={`group flex animate-in cursor-pointer gap-4 rounded-xl p-4 transition-all duration-200 fade-in slide-in-from-bottom-4 hover:-translate-y-0.5 ${
        isDark
          ? "bg-[#0d1a17] hover:bg-[#132420]"
          : "border border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow-md"
      }`}
    >
      {item.thumbnail && (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
          <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
          {item.isLive && (
            <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live
            </span>
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {item.section && (
          <span
            className={`mb-1 text-[11px] font-bold tracking-widest uppercase ${
              isDark ? "text-emerald-400" : "text-blue-500"
            }`}
          >
            {item.section}
          </span>
        )}
        <span
          className={`mb-1 line-clamp-1 text-lg leading-snug font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {item.title}
        </span>
        <span
          className={`line-clamp-2 text-sm leading-relaxed ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {excerpt(item.body)}
        </span>
        <span
          className={`mt-2 flex items-center gap-1 text-xs ${
            isDark ? "text-gray-500" : "text-gray-400"
          }`}
        >
          <Clock className="size-3" />
          {item.date ? formatDistanceToNow(new Date(item.date), { addSuffix: true }) : ""}
        </span>
      </div>
    </div>
  );
};

const FeedList = ({ items, loading, onOpen, isDark }) => (
  <div
    className={`flex w-full flex-col gap-4 p-6 ${
      isDark ? "bg-[#050f0d]" : "bg-[#fafafa]"
    }`}
  >
    {loading ? (
      <Loader2 className="mt-12 size-6 animate-spin self-center text-emerald-400" />
    ) : items.length === 0 ? (
      <div
        className={`mt-12 self-center text-sm ${
          isDark ? "text-gray-500" : "text-gray-400"
        }`}
      >
        No announcements yet
      </div>
    ) : (
      items.map((item, index) => (
        <PostCard
          key={item.id}
          item={item}
          index={index}
          onOpen={onOpen}
          isDark={isDark}
        />
      ))
    )}
  </div>
);

const PostDetail = ({ item, onBack, isDark }) => {
  if (!item) return null;

  return (
    <div className={`h-full w-full p-6 ${isDark ? "bg-[#050f0d]" : "bg-[#fafafa]"}`}>
      <button
        type="button"
        onClick={onBack}
        className={`mb-4 flex cursor-pointer items-center gap-2 text-sm ${
          isDark
            ? "text-gray-400 hover:text-white"
            : "text-gray-500 hover:text-gray-800"
        }`}
      >
        <ArrowLeft className="size-4" /> Back to announcements
      </button>

      {item.thumbnail && (
        <div className="relative mb-4 w-full overflow-hidden rounded-xl">
          <img src={item.thumbnail} alt="" className="h-48 w-full object-cover" />
          {item.isLive && (
            <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white uppercase shadow">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live
            </span>
          )}
        </div>
      )}

      <span
        className={`mb-2 flex items-center gap-1 text-xs ${
          isDark ? "text-gray-500" : "text-gray-400"
        }`}
      >
        <Clock className="size-3" />
        {item.date ? format(new Date(item.date), "MMMM d, yyyy 'at' h:mm a") : ""}
      </span>

      {item.section && (
        <span
          className={`mb-2 block text-[11px] font-bold tracking-widest uppercase ${
            isDark ? "text-emerald-400" : "text-blue-500"
          }`}
        >
          {item.section}
        </span>
      )}
      <div
        className={`mb-2 text-2xl leading-snug font-bold ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        {item.title}
      </div>

      <div className="mt-2 mb-4 flex flex-col gap-3">
        {renderAttachments(item, {
          media: (
            <div className="overflow-hidden rounded-lg">
              <MediaGrid images={toImageArray(item.media)} height={420} />
            </div>
          ),
          video: (
            <video
              src={item.video}
              controls
              onDoubleClick={goFullscreen}
              className="w-full cursor-pointer rounded-lg bg-black"
            />
          ),
        })}
      </div>

      <div
        className={`announcement-body mt-2 text-sm leading-relaxed ${
          isDark ? "text-gray-300" : "text-gray-700"
        }`}
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(item.body),
        }}
      />
    </div>
  );
};

export default function AnnouncementDrawer({ open, onClose }) {
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(800);
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === "dark";

  useEffect(() => {
    const update = () => setDrawerWidth(Math.round(window.innerWidth * 0.6));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      return;
    }
    setLoading(true);
    fetchAnnouncementsList()
      .then((res) => {
        const raw = res?.data ?? [];
        setItems((Array.isArray(raw) ? raw : []).map(normalize));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Drawer open={open} onClose={onClose} side="right" size={drawerWidth} zIndex={60}>
      <div className={`flex h-full flex-col ${isDark ? "bg-[#050f0d]" : "bg-[#fafafa]"}`}>
        <div
          className="shrink-0 px-6 py-4"
          style={{ borderBottom: `1px solid ${isDark ? "#132420" : "#f1f5f9"}` }}
        >
          <span className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Announcements
          </span>
        </div>

        <div className="relative min-h-0 w-full flex-1 overflow-hidden">
          <div
            className="flex h-full w-[200%] transition-transform duration-300 ease-in-out"
            style={{ transform: selected ? "translateX(-50%)" : "translateX(0)" }}
          >
            <div className="h-full w-1/2 overflow-y-auto">
              <FeedList
                items={items}
                loading={loading}
                onOpen={setSelected}
                isDark={isDark}
              />
            </div>
            <div className="h-full w-1/2 overflow-x-hidden overflow-y-auto">
              <PostDetail
                item={selected}
                onBack={() => setSelected(null)}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
