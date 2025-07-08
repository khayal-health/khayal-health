import { UserRole } from "./schema";

export enum AdvertisementStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  EXPIRED = "expired",
}

export interface Advertisement {
  _id: string;
  title: string;
  description: string;
  message: string;
  target_role: UserRole;
  status: AdvertisementStatus;
  display_order: number;
  start_date: string;
  end_date: string;
  image_url: string;
  view_count: number;
  click_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdvertisementFormData {
  title: string;
  description: string;
  message: string;
  target_role: UserRole;
  display_order: number;
  start_date: Date;
  end_date: Date;
  image?: File;
}
