// src/lib/config.ts

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:7860");

export const API_ENDPOINTS = {
  // Auth endpoints
  REGISTER: "/api/auth/register",
  LOGIN: "/api/auth/login",
  USER_ME: "/api/users/me",

  // User endpoints
  SUBSCRIBERS: "/api/users/subscribers",
  CHEF_SUBSCRIBERS_ASSIGN: "/api/users/caretaker/assigned-subscribers",
  USER_AVAILABILITY: "/api/users/user/availability",

  // Admin endpoints
  ADMIN_USERS: (role: string) => `/api/admin/users/${role}`,
  ADMIN_USER_APPROVAL: (userId: number | string) =>
    `/api/admin/users/${userId}/approval`,
  ADMIN_USER_SUBSCRIPTION: (userId: number | string) =>
    `/api/admin/users/${userId}/subscription`,
  ADMIN_CHEFS: "/api/admin/chefs",
  ADMIN_CHEF_ORDERS: "/api/admin/chef-orders",
  ADMIN_ORDER_STATUS: (orderId: string) =>
    `/api/admin/orders/${orderId}/status`,
  ADMIN_SUBSCRIPTIONS: (role: string) => `/api/admin/${role}/subscriptions`,
  ADMIN_CHEFS_SUBSCRIPTIONS: "/api/admin/chef/subscriptions",
  ADMIN_SUBSCRIBERS_SUBSCRIPTIONS: "/api/admin/subscriber/subscriptions",
  ADMIN_PSYCHOLOGISTS_SUBSCRIPTIONS: "/api/admin/psychologist/subscriptions",
  ADMIN_CARETAKERS_SUBSCRIPTIONS: "/api/admin/caretaker/subscriptions",

  // Vitals endpoints
  VITALS: (subscriberId: number | string) => `/api/vitals/${subscriberId}`,
  VITALS_PPG: (subscriberId: number | string) =>
    `/api/vitals/remotePPG/${subscriberId}`,
  VITALS_SELF: (subscriberId: number | string) =>
    `/api/vitals/self/${subscriberId}`,
  VITALS_CREATE: "/api/vitals",

  // Meals endpoints
  // ‣ When creating a meal: POST to /api/meals
  MEALS_CREATE: "/api/meals",
  // ‣ When fetching *your* (authenticated) meals, we must use /api/meals/my-meals
  MY_MEALS: "/api/meals/my-meals",
  // ‣ When deleting a meal: DELETE to /api/meals/{mealId}
  MEAL_DELETE: (mealId: string) => `/api/meals/${mealId}`,
  // ‣ When updating a meal: PUT to /api/meals/{mealId}
  MEAL_UPDATE: (mealId: string) => `/api/meals/${mealId}`,
  CHEFS_WITH_MEALS: "/api/meals/chefs-with-meals",
  MEALS: "/api/meals",

  // Orders endpoints
  ORDERS_CHEF: `/api/orders/chef/my-orders`,
  ORDERS_SUBSCRIBER: `/api/orders/my-orders`,
  ORDERS_CREATE: "/api/orders",
  ORDER_STATUS: (orderId: number | string) => `/api/orders/${orderId}/status`,

  // Appointments endpoints
  APPOINTMENTS_PSYCHOLOGIST: (psychologistId: number | string) =>
    `/api/appointments/psychologist/${psychologistId}`,
  APPOINTMENTS_SUBSCRIBER: (subscriberId: number | string) =>
    `/api/appointments/subscriber/${subscriberId}`,
  APPOINTMENTS_CREATE: "/api/appointments",
  APPOINTMENT_NOTES: (appointmentId: number | string) =>
    `/api/appointments/${appointmentId}/notes`,

  // Messages endpoints
  MESSAGES: (userId: number | string) => `/api/messages/${userId}`,
  MESSAGES_CREATE: "/api/messages",

  // Visit requests endpoints
  VISIT_REQUESTS_CARE: "/api/visit-requests/care",
  VISIT_REQUESTS_CARE_SUBSCRIBER: (subscriberId: number | string) =>
    `/api/visit-requests/care/subscriber/${subscriberId}`,
  VISIT_REQUESTS_CARE_ASSIGN: (requestId: number | string) =>
    `/api/visit-requests/care/${requestId}/assign`,
  VISIT_REQUESTS_PSYCHOLOGIST: "/api/visit-requests/psychologist",
  VISIT_REQUESTS_PSYCHOLOGIST_SUBSCRIBER: (subscriberId: number | string) =>
    `/api/visit-requests/psychologist/subscriber/${subscriberId}`,
  VISIT_REQUESTS_PSYCHOLOGIST_ASSIGN: (requestId: number | string) =>
    `/api/visit-requests/psychologist/${requestId}/assign`,
  VISIT_REQUESTS_CARETAKERS: "/api/visit-requests/caretakers",
  VISIT_REQUESTS_PSYCHOLOGISTS: "/api/visit-requests/psychologists",
  VISIT_REQUESTS_CARE_CARETAKER_STATUS: (requestId: number | string) =>
    `/api/visit-requests/care/${requestId}/caretaker-status`,
  VISIT_REQUESTS_CARE_CARETAKER_ASSIGNMENTS:
    "/api/visit-requests/care/caretaker/assignments",
  VISIT_REQUESTS_PSYCHOLOGIST_ASSIGNMENTS:
    "/api/visit-requests/psychologist/psychologist/assignments",
  VISIT_REQUESTS_PSYCHOLOGIST_STATUS: (requestId: number | string) =>
    `/api/visit-requests/psychologist/${requestId}/psychologist-status`,
  ADVERTISEMENTS_MY_ADS: "/api/advertisements/my-ads",
  ADVERTISEMENTS_CREATE: "/api/advertisements",
  ADVERTISEMENTS_ALL: "/api/advertisements/all",
  ADVERTISEMENT_BY_ID: (adId: string) => `/api/advertisements/${adId}`,
  ADVERTISEMENT_UPDATE: (adId: string) => `/api/advertisements/${adId}`,
  ADVERTISEMENT_DELETE: (adId: string) => `/api/advertisements/${adId}`,
  COUPONS_ADMIN_CREATE: "/api/coupons/admin/create",
  COUPONS_ADMIN_BULK_CREATE: "/api/coupons/admin/bulk-create",
  COUPONS_ADMIN_ALL: "/api/coupons/admin/all",
  COUPONS_ADMIN_BY_ID: (id: string) => `/api/coupons/admin/${id}`,
  COUPONS_ADMIN_UPDATE: (id: string) => `/api/coupons/admin/${id}`,
  COUPONS_ADMIN_DELETE: (id: string) => `/api/coupons/admin/${id}`,
  COUPONS_ADMIN_STATISTICS: (id: string) =>
    `/api/coupons/admin/${id}/statistics`,
  COUPONS_VALIDATE: "/api/coupons/validate",
  COUPONS_APPLY: "/api/coupons/apply",
};
