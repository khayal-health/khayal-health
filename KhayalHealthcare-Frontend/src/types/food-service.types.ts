export interface FoodServiceChef {
  id: string;
  name: string;
  experience: number;
  degree?: string;
  specialties?: string[];
  meals: FoodServiceMeal[];
}

export interface FoodServiceMeal {
  _id: string;
  chef_id: string;
  name: string;
  description: string;
  price: number;
  ingredients: string[];
  dietary_info: string;
  meal_visibility: boolean;
  created_at: string;
}

export interface FoodServiceOrder {
  _id: string;
  meal_id: string;
  chef_id: string;
  subscriber_id: string;
  quantity: number;
  total_price: number;
  delivery_address: string;
  timestamp: string;
  status: string;
  chef: {
    id: string;
    name: string;
    experience: number;
  };
  meal: {
    _id: string;
    name: string;
    price: number;
    description: string;
  };
  coupon_code?: string;
  discount_amount?: number;
  original_price?: number;
}

export interface OrderMutationParams {
  mealId: string;
  chefId: string;
  price: number;
  quantity: number;
}

export interface CreateOrderData {
  meal_id: string;
  chef_id: string;
  subscriber_id: string;
  quantity: number;
  total_price: number;
  delivery_address: string;
  coupon_code?: string;
}

export interface CouponValidateRequest {
  code: string;
  order_total: number;
}

export interface CouponValidateResponse {
  valid: boolean;
  message: string;
  discount_amount?: number;
  final_amount?: number;
  user_usage_count?: number;
  user_remaining_uses?: number;
}
