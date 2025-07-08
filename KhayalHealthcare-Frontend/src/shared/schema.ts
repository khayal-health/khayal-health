import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  json,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the roles as a TypeScript enum for better type safety
export const UserRole = {
  ADMIN: "admin",
  SUBSCRIBER: "subscriber",
  CARETAKER: "caretaker",
  CHEF: "chef",
  PSYCHOLOGIST: "psychologist",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Create a Zod enum for validation
export const userRoleEnum = z.enum([
  "admin",
  "subscriber",
  "caretaker",
  "chef",
  "psychologist",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", {
    enum: ["admin", "subscriber", "caretaker", "chef", "psychologist"],
  }).notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  experience: integer("experience"),
  degree: text("degree"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  previousIllness: text("previous_illness"),
  subscriptionStatus: text("subscription_status", {
    enum: ["active", "expired", "pending", "cancelled"],
  })
    .notNull()
    .default("pending"),
  subscriptionExpiry: timestamp("subscription_expiry"),
  approvalStatus: text("approval_status", {
    enum: ["approved", "pending", "rejected"],
  })
    .notNull()
    .default("pending"),
  subscriptionPlan: text("subscription_plan"),
  subscriptionRenewalDate: timestamp("subscription_renewal_date"),
});

export const vitals = pgTable("vitals", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  caretakerId: integer("caretaker_id"), // Made optional
  bloodSugar: real("blood_sugar").notNull(),
  bloodPressure: text("blood_pressure").notNull(),
  oxygenLevel: real("oxygen_level").notNull(),
  pulse: integer("pulse").notNull(),
  medications: text("medications").array(),
  timestamp: timestamp("timestamp").notNull(),
  reportType: text("report_type", {
    enum: ["self", "caretaker", "remote-ppg"],
  })
    .notNull()
    .default("caretaker"), // Added default value
  deviceInfo: json("device_info"), // JSON column is nullable by default
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  chefId: integer("chef_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  ingredients: text("ingredients").array().notNull().default([]),
  dietaryInfo: text("dietary_info"),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  chefId: integer("chef_id").notNull(),
  mealId: integer("meal_id").notNull(),
  status: text("status", { enum: ["pending", "accepted", "delivered"] })
    .notNull()
    .default("pending"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  psychologistId: integer("psychologist_id").notNull(),
  subscriberId: integer("subscriber_id"),
  dateTime: timestamp("date_time").notNull(),
  notes: text("notes"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromId: integer("from_id").notNull(),
  toId: integer("to_id").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const careVisitRequests = pgTable("care_visit_requests", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  requestedDate: timestamp("requested_date").notNull(),
  status: text("status", {
    enum: ["pending", "assigned", "completed", "cancelled"],
  })
    .notNull()
    .default("pending"),
  caretakerId: integer("caretaker_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  notes: text("notes"),
});

export const psychologistVisitRequests = pgTable(
  "psychologist_visit_requests",
  {
    id: serial("id").primaryKey(),
    subscriberId: integer("subscriber_id").notNull(),
    requestedDate: timestamp("requested_date").notNull(),
    status: text("status", {
      enum: ["pending", "assigned", "completed", "cancelled"],
    })
      .notNull()
      .default("pending"),
    psychologistId: integer("psychologist_id"),
    appointmentDateTime: timestamp("appointment_date_time"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    notes: text("notes"),
  }
);

export const insertUserSchema = createInsertSchema(users).extend({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number too long")
    .regex(/^\+?[\d\s-()]+$/, "Invalid phone number format"),
  role: userRoleEnum,
});

export const insertVitalsSchema = createInsertSchema(vitals).extend({
  timestamp: z.coerce.date(),
  bloodSugar: z
    .number()
    .min(0, "Blood sugar must be positive")
    .max(1000, "Blood sugar seems too high"),
  bloodPressure: z
    .string()
    .regex(/^\d{2,3}\/\d{2,3}$/, "Blood pressure must be in format '120/80'"),
  oxygenLevel: z
    .number()
    .min(0, "Oxygen level must be positive")
    .max(100, "Oxygen level cannot exceed 100%"),
  pulse: z
    .number()
    .min(0, "Pulse must be positive")
    .max(300, "Pulse seems too high"),
  reportType: z.enum(["self", "caretaker", "remote-ppg"]),
  deviceInfo: z
    .object({
      userAgent: z.string(),
      platform: z.string(),
      timestamp: z.string(),
    })
    .optional(),
});
export const insertMealSchema = createInsertSchema(meals).extend({
  ingredients: z.array(z.string()).optional(),
  dietaryInfo: z.string().optional(),
});
export const insertOrderSchema = createInsertSchema(orders);
export const insertAppointmentSchema = createInsertSchema(appointments).extend({
  dateTime: z.coerce.date(),
});
export const insertMessageSchema = createInsertSchema(messages);
export const insertCareVisitRequestSchema = createInsertSchema(
  careVisitRequests
).extend({
  requestedDate: z.coerce.date(),
});

export const insertPsychologistVisitRequestSchema = createInsertSchema(
  psychologistVisitRequests
).extend({
  requestedDate: z.coerce.date(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Vitals = typeof vitals.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type CareVisitRequest = typeof careVisitRequests.$inferSelect;
export type InsertCareVisitRequest = z.infer<
  typeof insertCareVisitRequestSchema
>;
export type PsychologistVisitRequest =
  typeof psychologistVisitRequests.$inferSelect;
export type InsertPsychologistVisitRequest = z.infer<
  typeof insertPsychologistVisitRequestSchema
>;
