export enum UserRole {
  ADMIN = "admin",
  SUBSCRIBER = "subscriber",
  CARETAKER = "caretaker",
  CHEF = "chef",
  PSYCHOLOGIST = "psychologist",
}

export interface User {
  _id: number;
  username: string;
  email: string;
  role: UserRole;
  name: string;
  phone: string;
  experience?: number;
  degree?: string;
  address?: string;
  city?: string;
  previousIllness?: string;
  approval_status: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  subscriptionExpiry?: string;
  available?: boolean;
}

export interface InsertUser {
  username: string;
  password: string;
  email: string;
  role: UserRole;
  name: string;
  phone: string;
  experience?: number;
  degree?: string;
  address?: string;
  city?: string;
  previousIllness?: string;
  available?: boolean;
}

export interface Vitals {
  id: number;
  bloodSugar: number;
  bloodPressure: string;
  oxygenLevel: number;
  pulse: number;
  medications?: string[];
  caretakerId?: number;
  subscriberId: number;
  reportType: string;
  timestamp: string;
}

export interface InsertVitals {
  bloodSugar: number;
  bloodPressure: string;
  oxygenLevel: number;
  pulse: number;
  medications?: string[];
  caretakerId?: number;
  subscriberId: number;
  reportType: string;
  timestamp: string;
}

export interface Meal {
  id: number;
  name: string;
  description: string;
  price: number;
  chefId: number;
}

export interface InsertMeal {
  name: string;
  description: string;
  price: number;
  chefId: number;
}

export interface Appointment {
  id: number;
  dateTime: string;
  subscriberId?: number;
  psychologistId: number;
  notes?: string;
}

export interface InsertAppointment {
  dateTime: string;
  subscriberId?: number;
  psychologistId: number;
  notes?: string;
}

export interface UpdateUserAvailability {
  available: boolean;
}

import { z } from "zod";

export const insertUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  name: z.string().min(1),
  phone: z.string().min(10),
  experience: z.number().optional(),
  degree: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  previousIllness: z.string().optional(),
  available: z.boolean().optional(),
});

export const insertVitalsSchema = z.object({
  bloodSugar: z.number().min(0),
  bloodPressure: z.string().min(1),
  oxygenLevel: z.number().min(0).max(100),
  pulse: z.number().min(0),
  medications: z.array(z.string()).optional(),
  caretakerId: z.number().optional(),
  subscriberId: z.number(),
  reportType: z.string(),
  timestamp: z.string(),
});

export const insertMealSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  chefId: z.number(),
});

export const insertAppointmentSchema = z.object({
  dateTime: z.string(),
  subscriberId: z.number().optional(),
  psychologistId: z.number(),
  notes: z.string().optional(),
});

export const updateUserAvailabilitySchema = z.object({
  available: z.boolean(),
});
