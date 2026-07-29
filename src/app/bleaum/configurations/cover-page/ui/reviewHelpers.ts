export interface Review {
  image: string;
  name: string;
  time: string;
  review: string;
  rating: string;
}

export const EMPTY_REVIEW: Review = { image: "", name: "", time: "", review: "", rating: "" };

export const normalizeReview = (item: any): Review => {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    return {
      image: item.image ?? item.imageUrl ?? item.avatar ?? "",
      name: item.name ?? "",
      time: item.time ?? item.date ?? "",
      review: item.review ?? item.text ?? "",
      rating: item.rating != null ? String(item.rating) : "",
    };
  }
  return { ...EMPTY_REVIEW, review: item ? String(item) : "" };
};

export const sanitizeReviewsForApi = (reviews: any) =>
  (Array.isArray(reviews) ? reviews : [])
    .map(normalizeReview)
    .map((review) => {
      const clean = {
        name: review.name?.trim() || null,
        image: review.image?.trim() || null,
        time: review.time?.trim() || null,
        rating: review.rating?.trim() || null,
        review: review.review?.trim() || null,
      };
      return Object.values(clean).some(Boolean) ? clean : null;
    })
    .filter(Boolean);

export const nowTimestamp = () =>
  new Date().toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
