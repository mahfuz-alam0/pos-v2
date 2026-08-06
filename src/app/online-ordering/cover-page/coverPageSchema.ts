import {
  Home, Tag, LayoutGrid, Star,
  Image as ImageIcon, Store, Info,
  Camera, Download, MessageCircle,
  LayoutTemplate, Link2,
} from "lucide-react";

import { sanitizeReviewsForApi } from "./ui/reviewHelpers";

export const SECTION_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  hero: { label: "Hero Banner", icon: Home },
  dealsBanner: { label: "Deals Banner", icon: Tag },
  shopByCategory: { label: "Shop By Category", icon: LayoutGrid },
  browseByCategoriesSection: { label: "Browse By Categories", icon: LayoutTemplate },
  browseByBrandsSection: { label: "Browse By Brands", icon: Store },
  featuredProducts: { label: "Featured Products", icon: Star },
  dealTypeSection: { label: "Deal Type Section", icon: ImageIcon },
  bannerSection: { label: "Banner Section", icon: Link2 },
  aboutSection: { label: "About Section", icon: Info },
  instagramFeed: { label: "Instagram Feed", icon: Camera },
  downloadAppBanner: { label: "Download App Banner", icon: Download },
  reviewsSection: { label: "Reviews Section", icon: MessageCircle },
};

export const SECTION_SCHEMA: Record<string, any> = {
  hero: {
    apiKey: "heroBanner",
    fields: ["label", "title", "boldTitle", "accentTitle", "subtitle", "primaryColor", "accentColor", "secondaryColor"],
    ctas: [["ctaPrimary", "primaryCta"], ["ctaSecondary", "secondaryCta"]],
    ctaHasColors: true,
    arrayImageFields: ["bgImageUrls", "mobileBanner"],
    arrayTextFields: ["videoUrls", "mobileVideoUrls"],
    booleanFields: ["gradientEnable"],
  },
  dealsBanner: {
    apiKey: "dealsBanner",
    fields: ["title", "ctaLabel", "ctaHref", "primaryColor", "accentColor", "bgColor"],
    singleImageFields: ["bgPattern"],
  },
  shopByCategory: {
    apiKey: "shopByCategory",
    fields: ["title", "accentTitle", "primaryColor", "accentColor", "bgColor"],
    categoryIdsWithIcon: true,
  },
  browseByCategoriesSection: {
    apiKey: "browseByCategoriesSection",
    fields: ["label", "title", "accentTitle", "subtitle", "primaryColor", "accentColor", "secondaryColor"],
    singleImageFields: ["bgPattern"],
    arrayIdFields: ["categoryIds"],
  },
  browseByBrandsSection: {
    apiKey: "browseByBrandsSection",
    fields: ["label", "title", "accentTitle", "subtitle", "primaryColor", "accentColor", "secondaryColor"],
    singleImageFields: ["bgPattern"],
    arrayIdFields: ["brandIds"],
  },
  featuredProducts: {
    apiKey: "featuredProducts",
    fields: ["label", "title", "accentTitle", "subtitle", "primaryColor", "accentColor", "secondaryColor"],
    arrayIdFields: ["productIds"],
  },
  dealTypeSection: {
    apiKey: "dealTypeSection",
    fields: ["label", "title", "accentTitle", "subtitle", "primaryColor", "accentColor", "bgColor", "secondaryColor"],
  },
  bannerSection: {
    apiKey: "bannerSection",
    arrayImageFields: ["imageUrls"],
  },
  aboutSection: {
    apiKey: "aboutSection",
    fields: ["title", "accentTitle", "accentColor", "bgColor"],
    ctas: [["ctaPrimary", "primaryCta"], ["ctaSecondary", "secondaryCta"]],
    bodyText: true,
    locationLatLng: true,
  },
  instagramFeed: {
    apiKey: "instagramFeed",
    fields: [
      "handle", "handleColor", "profileUrl", "postsCount", "followersCount",
      "followingCount", "followLabel", "followHref", "viewMoreLabel",
      "accentColor", "bgColor",
    ],
    singleImageFields: ["profileImageUrl"],
    arrayImageFields: ["imageUrls"],
  },
  downloadAppBanner: {
    apiKey: "downloadAppBanner",
    fields: ["title", "accentTitle", "boldTitle", "iosLink", "androidLink", "accentColor", "bgColor", "goldColor"],
    singleImageFields: ["imageUrl", "bgPattern"],
  },
  reviewsSection: {
    apiKey: "reviewsSection",
    fields: ["googleRating", "ratingLabel", "badgeLabel", "accentColor", "bgColor", "reviewAvatarColor"],
    arrayFields: ["reviews"],
  },
};

export const API_KEY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_SCHEMA).map(([localKey, schema]) => [localKey, schema.apiKey])
);

const SECTION_DEFAULTS: Record<string, any> = {
  heroBanner: {
    isVisible: true,
    bgImageUrls: [],
    mobileBanner: [],
    videoUrls: [],
    mobileVideoUrls: [],
    gradientEnable: null,
    label: null, title: null, boldTitle: null, accentTitle: null, subtitle: null,
    primaryCta: { label: null, href: null, textColor: null, bgColor: null },
    secondaryCta: { label: null, href: null, textColor: null, bgColor: null },
    primaryColor: null, accentColor: null, secondaryColor: null,
  },
  dealsBanner: {
    isVisible: true,
    title: null, ctaLabel: null, ctaHref: null,
    primaryColor: null, accentColor: null, bgColor: null, bgPattern: null,
  },
  shopByCategory: {
    isVisible: true,
    title: null, accentTitle: null,
    categoryIds: [],
    primaryColor: null, accentColor: null, bgColor: null,
  },
  browseByCategoriesSection: {
    isVisible: true,
    label: null, title: null, accentTitle: null, subtitle: null,
    categoryIds: [],
    primaryColor: null, accentColor: null, bgPattern: null, secondaryColor: null,
  },
  browseByBrandsSection: {
    isVisible: true,
    label: null, title: null, accentTitle: null, subtitle: null,
    brandIds: [],
    primaryColor: null, accentColor: null, bgPattern: null, secondaryColor: null,
  },
  featuredProducts: {
    isVisible: true,
    label: null, title: null, accentTitle: null, subtitle: null,
    productIds: [],
    primaryColor: null, accentColor: null, secondaryColor: null,
  },
  dealTypeSection: {
    isVisible: true,
    label: null, title: null, accentTitle: null, subtitle: null,
    primaryColor: null, accentColor: null, bgColor: null, secondaryColor: null,
  },
  bannerSection: {
    isVisible: true,
    imageUrls: [],
  },
  aboutSection: {
    isVisible: true,
    title: null, accentTitle: null, paragraph1: null, paragraph2: null,
    primaryCta: { label: null, href: null },
    secondaryCta: { label: null, href: null },
    location: { latitude: null, longitude: null },
    accentColor: null, bgColor: null,
  },
  instagramFeed: {
    isVisible: true,
    handle: null, handleColor: null, profileImageUrl: null, profileUrl: null,
    postsCount: null, followersCount: null, followingCount: null,
    followLabel: null, followHref: null, viewMoreLabel: null,
    imageUrls: [],
    accentColor: null, bgColor: null,
  },
  downloadAppBanner: {
    isVisible: true,
    title: null, accentTitle: null, boldTitle: null,
    iosLink: null, androidLink: null,
    imageUrl: null, bgPattern: null,
    accentColor: null, bgColor: null, goldColor: null,
  },
  reviewsSection: {
    isVisible: true,
    googleRating: null, ratingLabel: null, badgeLabel: null,
    accentColor: null, bgColor: null, reviewAvatarColor: null,
    reviews: [],
  },
};

const cloneDefaultSection = (apiKey: string) =>
  SECTION_DEFAULTS[apiKey]
    ? JSON.parse(JSON.stringify(SECTION_DEFAULTS[apiKey]))
    : { isVisible: true };

const normalizeArray = (arr: any) => (Array.isArray(arr) ? arr.filter(Boolean) : []);

const extractNestedId = (item: any, depth = 0): any => {
  if (depth > 5 || item === null || item === undefined) return "";
  if (typeof item !== "object") return item;
  if (Array.isArray(item)) return extractNestedId(item[0], depth + 1);

  const candidates = [
    item.id, item._id, item.categoryId, item.brandId,
    item.productId, item.value, item.key,
  ];

  for (const candidate of candidates) {
    const resolved = extractNestedId(candidate, depth + 1);
    if (resolved !== "" && resolved !== null && resolved !== undefined) return resolved;
  }

  return "";
};

const normalizeIdArrayForLocal = (arr: any): string[] =>
  (Array.isArray(arr) ? arr : [])
    .map(extractNestedId)
    .filter(Boolean)
    .map((id: any) => String(id));

const normalizeIdArrayForApi = (arr: any) =>
  (Array.isArray(arr) ? arr : [])
    .map((item: any) => {
      const id = String(extractNestedId(item) || "").trim();
      return id ? { id } : null;
    })
    .filter(Boolean);

export const apiSectionToLocal = (apiKey: string, apiData: any): any => {
  if (!apiData) return null;

  const schema: any = Object.values(SECTION_SCHEMA).find((s: any) => s.apiKey === apiKey);
  if (!schema) return { visible: apiData.isVisible ?? true };

  const s = (v: any) => v ?? "";
  const local: any = { visible: apiData.isVisible ?? true };

  if (schema.fields) schema.fields.forEach((f: string) => { local[f] = s(apiData[f]); });
  if (schema.booleanFields) schema.booleanFields.forEach((f: string) => { local[f] = apiData[f] ?? null; });
  if (schema.singleImageFields) schema.singleImageFields.forEach((f: string) => { local[f] = apiData[f] || null; });
  if (schema.arrayFields) schema.arrayFields.forEach((f: string) => { local[f] = normalizeArray(apiData[f]); });
  if (schema.arrayImageFields) schema.arrayImageFields.forEach((f: string) => { local[f] = normalizeArray(apiData[f]); });
  if (schema.arrayTextFields) schema.arrayTextFields.forEach((f: string) => { local[f] = normalizeArray(apiData[f]); });

  if (schema.arrayIdFields) {
    schema.arrayIdFields.forEach((f: string) => {
      let source = apiData[f];
      if (!Array.isArray(source)) {
        if (f === "categoryIds") source = apiData.categories;
        if (f === "brandIds") source = apiData.brands;
        if (f === "productIds") source = apiData.products;
      }
      local[f] = normalizeIdArrayForLocal(source);
    });
  }

  if (schema.categoryIdsWithIcon) {
    const categorySource = Array.isArray(apiData.categoryIds)
      ? apiData.categoryIds
      : Array.isArray(apiData.categories) ? apiData.categories : [];
    local.categoryIds = categorySource
      .map((item: any) => ({
        id: String(extractNestedId(item) || ""),
        iconImage: typeof item === "object" ? (item.iconImage || null) : null,
      }))
      .filter((item: any) => item.id);
  }

  if (schema.bodyText) {
    local.bodyText = [s(apiData.paragraph1), s(apiData.paragraph2)];
  }

  if (schema.ctas) {
    schema.ctas.forEach(([localCtaKey, apiCtaKey]: [string, string]) => {
      local[localCtaKey] = {
        label: s(apiData[apiCtaKey]?.label),
        href: s(apiData[apiCtaKey]?.href),
        ...(schema.ctaHasColors ? {
          textColor: s(apiData[apiCtaKey]?.textColor),
          bgColor: s(apiData[apiCtaKey]?.bgColor),
        } : {}),
      };
    });
  }

  if (apiKey === "aboutSection") {
    const loc = apiData?.location;
    local.location = {
      latitude: loc?.latitude ?? "",
      longitude: loc?.longitude ?? "",
    };
  }

  if (apiKey === "reviewsSection") {
    local.reviews = sanitizeReviewsForApi(apiData?.reviews).map((review: any) => ({
      image: review.image || "",
      name: review.name || "",
      time: review.time || "",
      rating: review.rating || "",
      review: review.review || "",
    }));
  }

  return local;
};

export const localSectionToApi = (localKey: string, localData: any) => {
  const schema = SECTION_SCHEMA[localKey];
  const apiKey = schema?.apiKey;
  const n = (v: any) => v || null;

  const api = cloneDefaultSection(apiKey);
  api.isVisible = localData?.visible ?? api.isVisible ?? true;

  if (!schema) return api;

  if (schema.fields) schema.fields.forEach((f: string) => { api[f] = n(localData?.[f]); });
  if (schema.booleanFields) schema.booleanFields.forEach((f: string) => { api[f] = localData?.[f] ?? null; });
  if (schema.singleImageFields) schema.singleImageFields.forEach((f: string) => { api[f] = localData?.[f] || null; });
  if (schema.arrayFields) schema.arrayFields.forEach((f: string) => { api[f] = normalizeArray(localData?.[f]); });
  if (schema.arrayImageFields) schema.arrayImageFields.forEach((f: string) => { api[f] = normalizeArray(localData?.[f]); });
  if (schema.arrayTextFields) schema.arrayTextFields.forEach((f: string) => { api[f] = normalizeArray(localData?.[f]); });
  if (schema.arrayIdFields) schema.arrayIdFields.forEach((f: string) => { api[f] = normalizeIdArrayForApi(localData?.[f]); });

  if (schema.categoryIdsWithIcon) {
    api.categoryIds = (Array.isArray(localData?.categoryIds) ? localData.categoryIds : [])
      .map((item: any) => {
        const id = String(extractNestedId(item) || "").trim();
        const iconImage = typeof item === "object" ? (item.iconImage || null) : null;
        return id ? { id, iconImage } : null;
      })
      .filter(Boolean);
  }

  if (schema.bodyText) {
    api.paragraph1 = n(localData?.bodyText?.[0]);
    api.paragraph2 = n(localData?.bodyText?.[1]);
  }

  if (schema.ctas) {
    schema.ctas.forEach(([localCtaKey, apiCtaKey]: [string, string]) => {
      api[apiCtaKey] = {
        label: n(localData?.[localCtaKey]?.label),
        href: n(localData?.[localCtaKey]?.href),
        ...(schema.ctaHasColors
          ? {
            textColor: n(localData?.[localCtaKey]?.textColor),
            bgColor: n(localData?.[localCtaKey]?.bgColor),
          }
          : {}),
      };
    });
  }

  if (localKey === "aboutSection") {
    const lat = localData?.location?.latitude;
    const lng = localData?.location?.longitude;
    api.location = { latitude: lat || null, longitude: lng || null };
  }

  if (localKey === "reviewsSection") {
    api.reviews = sanitizeReviewsForApi(localData?.reviews);
  }

  return api;
};

export const hydrate = (apiSections: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(API_KEY_MAP)
      .map(([localKey, apiKey]) => [localKey, apiSectionToLocal(apiKey, apiSections[apiKey])])
      .filter(([, value]) => value)
  );
