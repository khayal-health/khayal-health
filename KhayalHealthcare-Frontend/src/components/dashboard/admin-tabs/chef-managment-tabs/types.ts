import type { User as BaseUser } from "@/types/schema";

export interface AdminUser extends BaseUser {
  id: number;
  approvalStatus: string;
  name: string;
  phone: string;
  experience?: number;
  degree?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  subscriptionExpiry?: string;
  email?: string;
  address?: string;
  city?: string;
  available?: boolean;
}

export interface Chef extends AdminUser {
  experience: number;
  degree: string;
  meals?: Meal[];
}

export interface Meal {
  _id?: string;
  id?: number;
  name: string;
  description: string;
  price: number;
  chefId?: number;
  chef_id?: string;
  ingredients?: string[];
  dietary_info?: string;
  meal_visibility?: boolean;
  created_at?: string;
}

export interface Order {
  _id: string;
  subscriber_id: string;
  chef_id: string;
  meal_id: string;
  quantity: number;
  total_price: number;
  delivery_address: string;
  status: string;
  timestamp: string;
  subscriber?: {
    id: string;
    name: string;
    phone: string;
  };
  chef?: {
    id: string;
    name: string;
    experience: number;
    degree?: string;
  };
  meal?: {
    _id: string;
    name: string;
    description: string;
    price: number;
    ingredients?: string[];
    dietary_info?: string;
    meal_visibility?: boolean;
    created_at?: string;
  } | null;
}

export type FilterStatus = "all" | "active" | "pending" | "inactive";
export type OrderStatus =
  | "all"
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";
