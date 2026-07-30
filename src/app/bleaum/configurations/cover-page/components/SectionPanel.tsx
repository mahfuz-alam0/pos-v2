"use client";

import type { PendingUpload } from "../ui/ImageUpload";

import HeroBannerSection from "./HeroBannerSection";
import DealsBannerSection from "./DealsBannerSection";
import ShopByCategorySection from "./ShopByCategorySection";
import BrowseByCategoriesSection from "./BrowseByCategoriesSection";
import BrowseByBrandsSection from "./BrowseByBrandsSection";
import FeaturedProductsSection from "./FeaturedProductsSection";
import DealTypeSection from "./DealTypeSection";
import BannerSection from "./BannerSection";
import AboutSection from "./AboutSection";
import InstagramFeedSection from "./InstagramFeedSection";
import DownloadAppBannerSection from "./DownloadAppBannerSection";
import ReviewsSection from "./ReviewsSection";

export interface SectionComponentProps {
  data: any;
  sectionKey: string;
  onChange: (section: string, field: string, value: any) => void;
  onQueue: (key: string, file: File, single: boolean) => void;
  onRemovePending: (key: string, id: string) => void;
  pendingUploads: Record<string, PendingUpload[]>;
  saving: boolean;
}

interface ApiSelectFetchPage {
  (page: number, search: string): Promise<{ items: { id: string; name: string }[]; totalPages: number }>;
}

interface SectionPanelProps extends SectionComponentProps {
  shopId?: string | number | null;
  onReindexReviewUploads: (sectionKey: string, removedIndex: number) => void;
  categoryFetchPage: ApiSelectFetchPage;
  resolveCategoryName: (id: string) => string;
  brandFetchPage: ApiSelectFetchPage;
  resolveBrandName: (id: string) => string;
  productFetchPage: ApiSelectFetchPage;
  resolveProductName: (id: string) => string;
}

const SectionPanel = ({
  sectionKey, data, onChange, onQueue, onRemovePending, onReindexReviewUploads,
  pendingUploads, saving, shopId,
  categoryFetchPage, resolveCategoryName,
  brandFetchPage, resolveBrandName,
  productFetchPage, resolveProductName,
}: SectionPanelProps) => {
  if (!data) return null;

  const common: SectionComponentProps = { data, sectionKey, onChange, onQueue, onRemovePending, pendingUploads, saving };

  switch (sectionKey) {
    case "hero":
      return <HeroBannerSection {...common} />;

    case "dealsBanner":
      return <DealsBannerSection {...common} />;

    case "shopByCategory":
      return (
        <ShopByCategorySection
          {...common}
          shopId={shopId}
          categoryFetchPage={categoryFetchPage}
          resolveCategoryName={resolveCategoryName}
        />
      );

    case "browseByCategoriesSection":
      return (
        <BrowseByCategoriesSection
          {...common}
          shopId={shopId}
          categoryFetchPage={categoryFetchPage}
          resolveCategoryName={resolveCategoryName}
        />
      );

    case "browseByBrandsSection":
      return (
        <BrowseByBrandsSection
          {...common}
          shopId={shopId}
          brandFetchPage={brandFetchPage}
          resolveBrandName={resolveBrandName}
        />
      );

    case "featuredProducts":
      return (
        <FeaturedProductsSection
          {...common}
          shopId={shopId}
          productFetchPage={productFetchPage}
          resolveProductName={resolveProductName}
        />
      );

    case "dealTypeSection":
      return <DealTypeSection {...common} />;

    case "bannerSection":
      return <BannerSection {...common} />;

    case "aboutSection":
      return <AboutSection {...common} />;

    case "instagramFeed":
      return <InstagramFeedSection {...common} />;

    case "downloadAppBanner":
      return <DownloadAppBannerSection {...common} />;

    case "reviewsSection":
      return <ReviewsSection {...common} onReindexReviewUploads={onReindexReviewUploads} />;

    default:
      return null;
  }
};

export default SectionPanel;
