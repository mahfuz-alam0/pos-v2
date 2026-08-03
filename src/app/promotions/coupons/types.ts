export interface CouponRow {
  id: string;
  name: string;
  couponCode: string;
  description: string | null;
  imageUrl: string | null;
  onGoingTotalUsage: number;
  applicableShopIds: string[];
  createdAt: string;
  updatedAt: string;
}
