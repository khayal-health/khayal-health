import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  X,
  ChefHat,
  Brain,
  Heart,
  DollarSign,
  Calendar,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Package,
  Utensils,
  Sparkles,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types based on your backend models
type PlanType = "chef" | "psychologist" | "caretaker" | "food";
type PlanTier = "basic" | "standard" | "premium";
type BillingCycle = "monthly" | "weekly" | "daily";

interface NumericValues {
  days_per_week?: number;
  hours_per_day?: number;
  hours_per_visit?: number;
  sessions_per_month?: number;
  minutes_per_session?: number;
  visits_per_week?: number;
  total_monthly_hours?: number;
  consultations_per_month?: number;
  services_per_month?: number;
  coverage_days?: number;
  on_demand_available?: boolean;
  weekend_included?: boolean;
  daysPerWeek?: number;
  mealsPerDay?: number;
  snacksPerDay?: number;
  servicesPerMonth?: number;
  consultationsPerMonth?: number;
  weekendIncluded?: boolean;
  onDemandAvailable?: boolean;
  hoursPerVisit?: number;
  visitsPerWeek?: number;
  totalMonthlyHours?: number;
  sessionsPerMonth?: number;
  minutesPerSession?: number;
  hoursPerDay?: number;
  coverageDays?: number;
}

interface BillingInfo {
  cycle: BillingCycle;
  amount: number;
}

interface SubscriptionPlan {
  _id: string;
  plan_id: string;
  type: PlanType;
  tier: PlanTier;
  name: string;
  icon: string;
  color: string;
  price: number;
  features: string[];
  frequency: string;
  duration: string;
  description: string;
  highlights: string[];
  limitations: string[];
  popular: boolean;
  visibility: boolean;
  numeric: NumericValues;
  billing: BillingInfo;
  created_at: string;
  updated_at: string;
}

interface PlanFormData {
  plan_id: string;
  type: PlanType;
  tier: PlanTier;
  name: string;
  icon: string;
  color: string;
  price: number;
  features: string[];
  frequency: string;
  duration: string;
  description: string;
  highlights: string[];
  limitations: string[];
  popular: boolean;
  visibility: boolean;
  numeric: NumericValues;
  billing: BillingInfo;
}

const PLAN_CONFIGS = [
  // Food Plans
  {
    id: "food-basic",
    type: "food" as PlanType,
    tier: "basic" as PlanTier,
    name: "Essential Nutrition",
    icon: "🍽️",
    color: "#10b981",
    price: 299,
    features: [
      "3 balanced meals daily",
      "Nutritionist-approved menus",
      "Fresh, quality ingredients",
      "Basic dietary accommodations",
      "Weekly meal planning",
      "Contactless delivery",
    ],
    frequency: "5 days/week",
    duration: "Monthly",
    description: "Foundation nutrition plan for healthy daily meals",
    highlights: ["FDA-compliant kitchen", "Allergen management"],
    limitations: ["Weekdays only", "Standard menu rotation"],
    numeric: {
      days_per_week: 5,
      meals_per_day: 3,
      snacks_per_day: 0,
      services_per_month: 20,
      consultations_per_month: 0,
      weekend_included: false,
      on_demand_available: false,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 299,
    },
  },
  {
    id: "food-standard",
    type: "food" as PlanType,
    tier: "standard" as PlanTier,
    name: "Complete Nutrition",
    icon: "🍽️",
    color: "#10b981",
    price: 449,
    features: [
      "3 meals + 2 healthy snacks daily",
      "Customizable menu options",
      "Bi-weekly nutrition consultations",
      "Full dietary accommodations",
      "Weekend delivery included",
      "Special diet support",
      "Monthly health reports",
    ],
    frequency: "6 days/week",
    duration: "Monthly",
    description: "Comprehensive nutrition with personalized meal planning",
    highlights: ["Registered dietitian support", "Organic options available"],
    popular: false,
    numeric: {
      days_per_week: 6,
      meals_per_day: 3,
      snacks_per_day: 2,
      services_per_month: 24,
      consultations_per_month: 2,
      weekend_included: true,
      on_demand_available: false,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 449,
    },
  },
  {
    id: "food-premium",
    type: "food" as PlanType,
    tier: "premium" as PlanTier,
    name: "Elite Nutrition",
    icon: "🍽️",
    color: "#10b981",
    price: 699,
    features: [
      "Unlimited meals & snacks",
      "Gourmet health-focused selections",
      "Weekly nutrition consultations",
      "Complete menu customization",
      "24/7 on-demand ordering",
      "Special occasion meals",
      "Personal nutrition dashboard",
      "Family meal options",
    ],
    frequency: "7 days/week",
    duration: "Monthly",
    description: "Premium nutrition service with concierge support",
    highlights: ["Celebrity nutritionist access", "Farm-to-table options"],
    numeric: {
      days_per_week: 7,
      meals_per_day: -1,
      snacks_per_day: -1,
      services_per_month: 30,
      consultations_per_month: 4,
      weekend_included: true,
      on_demand_available: true,
      coverage_days: 7,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 699,
    },
  },
  // Chef Plans
  {
    id: "chef-basic",
    type: "chef" as PlanType,
    tier: "basic" as PlanTier,
    name: "Home Chef Essential",
    icon: "👨‍🍳",
    color: "#f59e0b",
    price: 599,
    features: [
      "2 chef visits weekly",
      "Health-focused cuisines",
      "Meal planning included",
      "Grocery shopping service",
      "Kitchen sanitization",
      "Basic meal prep",
    ],
    frequency: "2 days/week",
    duration: "4 hrs/visit",
    description: "Professional chef for healthy home cooking",
    highlights: ["Background-checked chefs", "Food safety certified"],
    limitations: ["Fixed schedule", "Standard healthy recipes"],
    numeric: {
      days_per_week: 2,
      hours_per_visit: 4,
      visits_per_week: 2,
      total_monthly_hours: 32,
      services_per_month: 8,
      weekend_included: false,
      on_demand_available: false,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 599,
    },
  },
  {
    id: "chef-standard",
    type: "chef" as PlanType,
    tier: "standard" as PlanTier,
    name: "Home Chef Plus",
    icon: "👨‍🍳",
    color: "#f59e0b",
    price: 999,
    features: [
      "3 chef visits weekly",
      "International healthy cuisines",
      "Custom therapeutic menus",
      "Advanced meal prep & storage",
      "Dietary expertise",
      "Cooking lessons included",
      "Small event catering",
    ],
    frequency: "3 days/week",
    duration: "5 hrs/visit",
    description: "Enhanced chef service with therapeutic meal expertise",
    highlights: ["Specialized diet experience", "Nutrition education"],
    popular: false,
    numeric: {
      days_per_week: 3,
      hours_per_visit: 5,
      visits_per_week: 3,
      total_monthly_hours: 60,
      services_per_month: 12,
      weekend_included: true,
      on_demand_available: false,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 999,
    },
  },
  {
    id: "chef-premium",
    type: "chef" as PlanType,
    tier: "premium" as PlanTier,
    name: "Executive Health Chef",
    icon: "👨‍🍳",
    color: "#f59e0b",
    price: 1799,
    features: [
      "Daily chef service",
      "Master chef with health focus",
      "Complete kitchen management",
      "Therapeutic meal programs",
      "Event & guest catering",
      "24/7 on-demand availability",
      "Wine pairing for special diets",
      "Cooking therapy sessions",
    ],
    frequency: "Daily",
    duration: "Flexible",
    description: "Elite personal chef with medical nutrition expertise",
    highlights: ["Hospital-trained chefs", "Holistic nutrition approach"],
    numeric: {
      days_per_week: 7,
      hours_per_day: -1,
      visits_per_week: 7,
      total_monthly_hours: -1,
      services_per_month: 30,
      weekend_included: true,
      on_demand_available: true,
      coverage_days: 7,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 1799,
    },
  },
  // Psychologist Plans
  {
    id: "psychologist-basic",
    type: "psychologist" as PlanType,
    tier: "basic" as PlanTier,
    name: "Mental Wellness Foundation",
    icon: "🧠",
    color: "#8b5cf6",
    price: 399,
    features: [
      "4 therapy sessions monthly",
      "Licensed clinical therapists",
      "Secure video consultations",
      "24/7 crisis support hotline",
      "Self-help resources",
      "Progress tracking",
    ],
    frequency: "Weekly",
    duration: "50 min/session",
    description: "Essential mental health support and counseling",
    highlights: ["HIPAA compliant", "Evidence-based therapy"],
    limitations: ["Business hours only", "Virtual sessions only"],
    numeric: {
      days_per_week: 1,
      sessions_per_month: 4,
      minutes_per_session: 50,
      total_monthly_hours: 3.33,
      services_per_month: 4,
      weekend_included: false,
      on_demand_available: false,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 399,
    },
  },
  {
    id: "psychologist-standard",
    type: "psychologist" as PlanType,
    tier: "standard" as PlanTier,
    name: "Comprehensive Mental Care",
    icon: "🧠",
    color: "#8b5cf6",
    price: 699,
    features: [
      "8 therapy sessions monthly",
      "Senior specialized therapists",
      "In-person or video options",
      "24/7 crisis intervention",
      "Group therapy access",
      "Family counseling included",
      "Wellness workshops",
      "Mental health app premium",
    ],
    frequency: "Bi-weekly",
    duration: "60 min/session",
    description: "Complete mental wellness with multi-modal support",
    highlights: ["Specialized therapy options", "Integrated care approach"],
    popular: false,
    numeric: {
      days_per_week: 2,
      sessions_per_month: 8,
      minutes_per_session: 60,
      total_monthly_hours: 8,
      services_per_month: 8,
      weekend_included: true,
      on_demand_available: false,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 699,
    },
  },
  {
    id: "psychologist-premium",
    type: "psychologist" as PlanType,
    tier: "premium" as PlanTier,
    name: "Elite Mental Wellness",
    icon: "🧠",
    color: "#8b5cf6",
    price: 1299,
    features: [
      "Unlimited therapy sessions",
      "Top specialist access",
      "Home visit options",
      "Dedicated wellness team",
      "Executive life coaching",
      "Holistic integration",
      "Wellness retreats",
      "Family therapy unlimited",
    ],
    frequency: "On-demand",
    duration: "Flexible",
    description: "Premium mental wellness with concierge psychiatry",
    highlights: ["Board-certified psychiatrists", "24/7 availability"],
    numeric: {
      days_per_week: 7,
      sessions_per_month: -1,
      minutes_per_session: -1,
      total_monthly_hours: -1,
      services_per_month: -1,
      weekend_included: true,
      on_demand_available: true,
      coverage_days: 7,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 1299,
    },
  },
  // Caretaker Plans
  {
    id: "caretaker-basic",
    type: "caretaker" as PlanType,
    tier: "basic" as PlanTier,
    name: "Essential Care Support",
    icon: "💙",
    color: "#3b82f6",
    price: 799,
    features: [
      "3 days weekly assistance",
      "Certified care professionals",
      "Daily living support",
      "Medication reminders",
      "Basic health monitoring",
      "Family updates",
    ],
    frequency: "3 days/week",
    duration: "6 hrs/day",
    description: "Fundamental caregiving for daily support needs",
    highlights: ["Background verified", "First aid certified"],
    limitations: ["Daytime hours only", "Non-medical care"],
    numeric: {
      days_per_week: 3,
      hours_per_day: 6,
      total_monthly_hours: 72,
      services_per_month: 12,
      weekend_included: false,
      on_demand_available: false,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 799,
    },
  },
  {
    id: "caretaker-standard",
    type: "caretaker" as PlanType,
    tier: "standard" as PlanTier,
    name: "Enhanced Care Services",
    icon: "💙",
    color: "#3b82f6",
    price: 1399,
    features: [
      "5 days weekly service",
      "Senior care specialists",
      "Extended hour coverage",
      "Basic medical assistance",
      "Overnight care available",
      "Emergency response system",
      "Physical therapy support",
      "Detailed health reporting",
    ],
    frequency: "5 days/week",
    duration: "8 hrs/day",
    description: "Comprehensive care with medical support capabilities",
    highlights: ["RN supervision", "Specialized training"],
    popular: false,
    numeric: {
      days_per_week: 5,
      hours_per_day: 8,
      total_monthly_hours: 160,
      services_per_month: 20,
      weekend_included: false,
      on_demand_available: true,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 1399,
    },
  },
  {
    id: "caretaker-premium",
    type: "caretaker" as PlanType,
    tier: "premium" as PlanTier,
    name: "24/7 Premium Care",
    icon: "💙",
    color: "#3b82f6",
    price: 2499,
    features: [
      "Round-the-clock coverage",
      "Elite care team",
      "Full medical support",
      "Live-in care option",
      "Specialized expertise",
      "Care coordination",
      "Concierge services",
      "Family support included",
    ],
    frequency: "24/7",
    duration: "Continuous",
    description: "Ultimate care solution with complete medical integration",
    highlights: ["Hospital-grade care", "Care management team"],
    numeric: {
      days_per_week: 7,
      hours_per_day: 24,
      total_monthly_hours: 720,
      services_per_month: 30,
      weekend_included: true,
      on_demand_available: true,
      coverage_days: 7,
    },
    billing: {
      cycle: "monthly" as BillingCycle,
      amount: 2499,
    },
  },
];

const defaultNumericValues: NumericValues = {
  days_per_week: 5,
  hours_per_day: 8,
  sessions_per_month: 4,
  minutes_per_session: 60,
  visits_per_week: 2,
  total_monthly_hours: 160,
  consultations_per_month: 4,
  services_per_month: 20,
  coverage_days: 20,
  on_demand_available: false,
  weekend_included: false,
};

const defaultFormData: PlanFormData = {
  plan_id: "",
  type: "chef",
  tier: "basic",
  name: "",
  icon: "🍳",
  color: "#3B82F6",
  price: 0,
  features: [],
  frequency: "monthly",
  duration: "30 days",
  description: "",
  highlights: [],
  limitations: [],
  popular: false,
  visibility: true,
  numeric: defaultNumericValues,
  billing: {
    cycle: "monthly",
    amount: 0,
  },
};

export default function SubscriptionPlansManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<PlanType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [featureInput, setFeatureInput] = useState("");
  const [highlightInput, setHighlightInput] = useState("");
  const [limitationInput, setLimitationInput] = useState("");
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch all plans
  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans", { include_hidden: true }],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/subscription-plans?include_hidden=true`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch plans");
      return response.json();
    },
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const response = await apiRequest(
        "POST",
        "/api/subscription-plans",
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Success",
        description: "Subscription plan created successfully",
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription plan",
        variant: "destructive",
      });
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<PlanFormData>;
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/subscription-plans/${id}`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Success",
        description: "Subscription plan updated successfully",
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription plan",
        variant: "destructive",
      });
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/subscription-plans/${id}`
      );
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete plan");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Success",
        description: "Subscription plan deleted successfully",
      });
      setDeletingPlan(null);
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subscription plan",
        variant: "destructive",
      });
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({
      id,
      visibility,
    }: {
      id: string;
      visibility: boolean;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/subscription-plans/${id}/visibility`,
        { visibility }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Success",
        description: "Plan visibility updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update visibility",
        variant: "destructive",
      });
    },
  });

  const resetForm = useCallback(() => {
    setFormData(defaultFormData);
    setEditingPlan(null);
    setShowForm(false);
    setFeatureInput("");
    setHighlightInput("");
    setLimitationInput("");
  }, []);

  const handleEdit = useCallback((plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      plan_id: plan.plan_id,
      type: plan.type,
      tier: plan.tier,
      name: plan.name,
      icon: plan.icon,
      color: plan.color,
      price: plan.price,
      features: [...plan.features],
      frequency: plan.frequency,
      duration: plan.duration,
      description: plan.description,
      highlights: [...plan.highlights],
      limitations: [...plan.limitations],
      popular: plan.popular,
      visibility: plan.visibility,
      numeric: { ...plan.numeric },
      billing: { ...plan.billing },
    });
    setShowForm(true);
  }, []);

  const handleDeleteClick = useCallback((plan: SubscriptionPlan) => {
    setDeletingPlan(plan);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deletingPlan) {
      deletePlanMutation.mutate(deletingPlan._id);
    }
  }, [deletingPlan, deletePlanMutation]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteDialog(false);
    setDeletingPlan(null);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Ensure billing amount matches price
      const submitData = {
        ...formData,
        billing: {
          ...formData.billing,
          amount: formData.price,
        },
      };

      if (editingPlan) {
        updatePlanMutation.mutate({ id: editingPlan._id, data: submitData });
      } else {
        createPlanMutation.mutate(submitData);
      }
    },
    [formData, editingPlan, updatePlanMutation, createPlanMutation]
  );

  const addArrayItem = useCallback(
    (field: "features" | "highlights" | "limitations", value: string) => {
      if (value.trim()) {
        setFormData((prev) => ({
          ...prev,
          [field]: [...prev[field], value.trim()],
        }));
        if (field === "features") setFeatureInput("");
        if (field === "highlights") setHighlightInput("");
        if (field === "limitations") setLimitationInput("");
      }
    },
    []
  );

  const removeArrayItem = useCallback(
    (field: "features" | "highlights" | "limitations", index: number) => {
      setFormData((prev) => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index),
      }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedType("all");
  }, []);

  const fillFromTemplate = useCallback(
    (configId: string) => {
      const config = PLAN_CONFIGS.find((c) => c.id === configId);
      if (!config) return;

      // Map the config's numeric values to match backend expectations
      const numericValues: NumericValues = {};

      if (config.numeric.days_per_week !== undefined) {
        numericValues.days_per_week = config.numeric.days_per_week;
      }
      if (config.numeric.hours_per_day !== undefined) {
        numericValues.hours_per_day = config.numeric.hours_per_day;
      }
      if (config.numeric.hours_per_visit !== undefined) {
        numericValues.hours_per_visit = config.numeric.hours_per_visit;
      }
      if (config.numeric.sessions_per_month !== undefined) {
        numericValues.sessions_per_month = config.numeric.sessions_per_month;
      }
      if (config.numeric.minutes_per_session !== undefined) {
        numericValues.minutes_per_session = config.numeric.minutes_per_session;
      }
      if (config.numeric.visits_per_week !== undefined) {
        numericValues.visits_per_week = config.numeric.visits_per_week;
      }
      if (config.numeric.total_monthly_hours !== undefined) {
        numericValues.total_monthly_hours = config.numeric.total_monthly_hours;
      }
      if (config.numeric.consultations_per_month !== undefined) {
        numericValues.consultations_per_month =
          config.numeric.consultations_per_month;
      }
      if (config.numeric.services_per_month !== undefined) {
        numericValues.services_per_month = config.numeric.services_per_month;
      }
      if (config.numeric.coverage_days !== undefined) {
        numericValues.coverage_days = config.numeric.coverage_days;
      }
      if (config.numeric.weekend_included !== undefined) {
        numericValues.weekend_included = config.numeric.weekend_included;
      }
      if (config.numeric.on_demand_available !== undefined) {
        numericValues.on_demand_available = config.numeric.on_demand_available;
      }
      if (config.numeric.meals_per_day !== undefined) {
        numericValues.services_per_month =
          config.numeric.meals_per_day === -1
            ? -1
            : config.numeric.meals_per_day;
      }
      if (config.numeric.snacks_per_day !== undefined) {
        numericValues.consultations_per_month =
          config.numeric.snacks_per_day === -1
            ? -1
            : config.numeric.snacks_per_day;
      }

      setFormData({
        plan_id: config.id,
        type: config.type,
        tier: config.tier,
        name: config.name,
        icon: config.icon,
        color: config.color,
        price: config.price,
        features: [...config.features],
        frequency: config.frequency,
        duration: config.duration,
        description: config.description,
        highlights: config.highlights ? [...config.highlights] : [],
        limitations: config.limitations ? [...config.limitations] : [],
        popular: config.popular || false,
        visibility: true,
        numeric: numericValues,
        billing: { ...config.billing },
      });

      toast({
        title: "Form filled",
        description: `Loaded template: ${config.name}`,
      });
    },
    [toast]
  );

  // Get plan type info
  const getPlanTypeInfo = (type: PlanType) => {
    switch (type) {
      case "food":
        return {
          icon: Utensils,
          color: "emerald",
          bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
          borderColor: "border-emerald-200 dark:border-emerald-700",
          textColor: "text-emerald-700 dark:text-emerald-300",
          iconColor: "text-emerald-600 dark:text-emerald-400",
        };
      case "chef":
        return {
          icon: ChefHat,
          color: "amber",
          bgColor: "bg-amber-50 dark:bg-amber-900/20",
          borderColor: "border-amber-200 dark:border-amber-700",
          textColor: "text-amber-700 dark:text-amber-300",
          iconColor: "text-amber-600 dark:text-amber-400",
        };
      case "psychologist":
        return {
          icon: Brain,
          color: "violet",
          bgColor: "bg-violet-50 dark:bg-violet-900/20",
          borderColor: "border-violet-200 dark:border-violet-700",
          textColor: "text-violet-700 dark:text-violet-300",
          iconColor: "text-violet-600 dark:text-violet-400",
        };
      case "caretaker":
        return {
          icon: Heart,
          color: "rose",
          bgColor: "bg-rose-50 dark:bg-rose-900/20",
          borderColor: "border-rose-200 dark:border-rose-700",
          textColor: "text-rose-700 dark:text-rose-300",
          iconColor: "text-rose-600 dark:text-rose-400",
        };
      default:
        return {
          icon: Package,
          color: "gray",
          bgColor: "bg-gray-50 dark:bg-gray-900/20",
          borderColor: "border-gray-200 dark:border-gray-700",
          textColor: "text-gray-700 dark:text-gray-300",
          iconColor: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  const getTierBadgeClass = (tier: PlanTier) => {
    switch (tier) {
      case "basic":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      case "standard":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "premium":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // Calculate stats
  const planStats = useMemo(() => {
    return {
      total: plans.length,
      food: plans.filter((p) => p.type === "food").length,
      chef: plans.filter((p) => p.type === "chef").length,
      psychologist: plans.filter((p) => p.type === "psychologist").length,
      caretaker: plans.filter((p) => p.type === "caretaker").length,
      visible: plans.filter((p) => p.visibility).length,
      hidden: plans.filter((p) => !p.visibility).length,
      popular: plans.filter((p) => p.popular).length,
    };
  }, [plans]);

  // Filter plans
  const filteredPlans = useMemo(() => {
    let filtered = plans;

    if (selectedType !== "all") {
      filtered = filtered.filter((plan) => plan.type === selectedType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((plan) => {
        return (
          plan.name.toLowerCase().includes(query) ||
          plan.description.toLowerCase().includes(query) ||
          plan.plan_id.toLowerCase().includes(query) ||
          plan.features.some((f) => f.toLowerCase().includes(query))
        );
      });
    }

    return filtered.sort((a, b) => {
      // Sort by type, then tier, then name
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      const tierOrder = { basic: 0, standard: 1, premium: 2 };
      const tierA = tierOrder[a.tier as keyof typeof tierOrder] ?? 3;
      const tierB = tierOrder[b.tier as keyof typeof tierOrder] ?? 3;
      if (tierA !== tierB) return tierA - tierB;
      return a.name.localeCompare(b.name);
    });
  }, [plans, selectedType, searchQuery]);

  const statisticsCards = [
    {
      key: "total-plans",
      title: "Total Plans",
      value: planStats.total,
      icon: Package,
      gradient:
        "from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20",
      border: "border-purple-200 dark:border-purple-700",
      textColor: "text-purple-700 dark:text-purple-300",
      valueColor: "text-purple-900 dark:text-purple-100",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      key: "food-plans",
      title: "Food Plans",
      value: planStats.food,
      icon: Utensils,
      gradient:
        "from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20",
      border: "border-emerald-200 dark:border-emerald-700",
      textColor: "text-emerald-700 dark:text-emerald-300",
      valueColor: "text-emerald-900 dark:text-emerald-100",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "chef-plans",
      title: "Chef Plans",
      value: planStats.chef,
      icon: ChefHat,
      gradient:
        "from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20",
      border: "border-amber-200 dark:border-amber-700",
      textColor: "text-amber-700 dark:text-amber-300",
      valueColor: "text-amber-900 dark:text-amber-100",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "psychologist-plans",
      title: "Psychologist",
      value: planStats.psychologist,
      icon: Brain,
      gradient:
        "from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/20",
      border: "border-violet-200 dark:border-violet-700",
      textColor: "text-violet-700 dark:text-violet-300",
      valueColor: "text-violet-900 dark:text-violet-100",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      key: "caretaker-plans",
      title: "Caretaker Plans",
      value: planStats.caretaker,
      icon: Heart,
      gradient:
        "from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20",
      border: "border-rose-200 dark:border-rose-700",
      textColor: "text-rose-700 dark:text-rose-300",
      valueColor: "text-rose-900 dark:text-rose-100",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
    {
      key: "visible-plans",
      title: "Visible",
      value: planStats.visible,
      icon: Eye,
      gradient:
        "from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20",
      border: "border-green-200 dark:border-green-700",
      textColor: "text-green-700 dark:text-green-300",
      valueColor: "text-green-900 dark:text-green-100",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      key: "hidden-plans",
      title: "Hidden",
      value: planStats.hidden,
      icon: EyeOff,
      gradient:
        "from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/20",
      border: "border-gray-200 dark:border-gray-700",
      textColor: "text-gray-700 dark:text-gray-300",
      valueColor: "text-gray-900 dark:text-gray-100",
      iconColor: "text-gray-600 dark:text-gray-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div></div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add New Plan
            </Button>
          </DialogTrigger>
          <DialogContent
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>
                {editingPlan
                  ? "Edit Subscription Plan"
                  : "Create New Subscription Plan"}
              </DialogTitle>
              <DialogDescription>
                {editingPlan
                  ? "Update the details of the subscription plan"
                  : "Fill in the details to create a new subscription plan"}
              </DialogDescription>
            </DialogHeader>

            {/* Template Selector */}
            {!editingPlan && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                    Quick Fill Templates
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PLAN_CONFIGS.map((config) => {
                    const typeInfo = getPlanTypeInfo(config.type);
                    const TypeIcon = typeInfo.icon;
                    return (
                      <Button
                        key={config.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillFromTemplate(config.id)}
                        className="justify-start text-xs h-auto py-2 px-3"
                      >
                        <TypeIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                        <span className="truncate">{config.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan_id">Plan ID</Label>
                    <Input
                      id="plan_id"
                      value={formData.plan_id}
                      onChange={(e) =>
                        setFormData({ ...formData, plan_id: e.target.value })
                      }
                      placeholder="e.g., chef_basic_monthly"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Basic Chef Plan"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: PlanType) => {
                        setFormData({
                          ...formData,
                          type: value,
                          icon:
                            value === "food"
                              ? "🍽️"
                              : value === "chef"
                              ? "👨‍🍳"
                              : value === "psychologist"
                              ? "🧠"
                              : "💙",
                          color:
                            value === "food"
                              ? "#10b981"
                              : value === "chef"
                              ? "#f59e0b"
                              : value === "psychologist"
                              ? "#8b5cf6"
                              : "#3b82f6",
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">
                          <div className="flex items-center">
                            <Utensils className="h-4 w-4 mr-2" />
                            Food
                          </div>
                        </SelectItem>
                        <SelectItem value="chef">
                          <div className="flex items-center">
                            <ChefHat className="h-4 w-4 mr-2" />
                            Chef
                          </div>
                        </SelectItem>
                        <SelectItem value="psychologist">
                          <div className="flex items-center">
                            <Brain className="h-4 w-4 mr-2" />
                            Psychologist
                          </div>
                        </SelectItem>
                        <SelectItem value="caretaker">
                          <div className="flex items-center">
                            <Heart className="h-4 w-4 mr-2" />
                            Caretaker
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tier">Tier</Label>
                    <Select
                      value={formData.tier}
                      onValueChange={(value: PlanTier) =>
                        setFormData({ ...formData, tier: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            price: parseFloat(e.target.value) || 0,
                            billing: {
                              ...formData.billing,
                              amount: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="pl-10"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billing_cycle">Billing Cycle</Label>
                    <Select
                      value={formData.billing.cycle}
                      onValueChange={(value: BillingCycle) =>
                        setFormData({
                          ...formData,
                          billing: {
                            ...formData.billing,
                            cycle: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) =>
                        setFormData({ ...formData, icon: e.target.value })
                      }
                      placeholder="e.g., 🍳"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Color (Hex)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        value={formData.color}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                      <div
                        className="w-10 h-10 rounded-md border"
                        style={{ backgroundColor: formData.color }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Input
                      id="frequency"
                      value={formData.frequency}
                      onChange={(e) =>
                        setFormData({ ...formData, frequency: e.target.value })
                      }
                      placeholder="e.g., Monthly"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({ ...formData, duration: e.target.value })
                      }
                      placeholder="e.g., 30 days"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of the plan"
                    rows={3}
                    required
                  />
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Features</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addArrayItem("features", featureInput);
                        }
                      }}
                      placeholder="Add a feature"
                    />
                    <Button
                      type="button"
                      onClick={() => addArrayItem("features", featureInput)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <span className="text-sm flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          {feature}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayItem("features", idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Highlights</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={highlightInput}
                      onChange={(e) => setHighlightInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addArrayItem("highlights", highlightInput);
                        }
                      }}
                      placeholder="Add a highlight"
                    />
                    <Button
                      type="button"
                      onClick={() => addArrayItem("highlights", highlightInput)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.highlights.map((highlight, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                      >
                        <span className="text-sm flex items-center">
                          <Star className="h-4 w-4 text-yellow-600 mr-2" />
                          {highlight}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayItem("highlights", idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Limitations */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Limitations</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={limitationInput}
                      onChange={(e) => setLimitationInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addArrayItem("limitations", limitationInput);
                        }
                      }}
                      placeholder="Add a limitation"
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        addArrayItem("limitations", limitationInput)
                      }
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.limitations.map((limitation, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"
                      >
                        <span className="text-sm flex items-center">
                          <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                          {limitation}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayItem("limitations", idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Numeric Values */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Numeric Values</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(formData.type === "chef" || formData.type === "food") && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="days_per_week">Days per Week</Label>
                        <Input
                          id="days_per_week"
                          type="number"
                          value={formData.numeric.days_per_week || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              numeric: {
                                ...formData.numeric,
                                days_per_week: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          min="1"
                          max="7"
                        />
                      </div>
                      {formData.type === "chef" && (
                        <div className="space-y-2">
                          <Label htmlFor="hours_per_visit">
                            Hours per Visit
                          </Label>
                          <Input
                            id="hours_per_visit"
                            type="number"
                            value={formData.numeric.hours_per_visit || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                numeric: {
                                  ...formData.numeric,
                                  hours_per_visit:
                                    parseInt(e.target.value) || undefined,
                                },
                              })
                            }
                            min="1"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {formData.type === "psychologist" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="sessions_per_month">
                          Sessions per Month
                        </Label>
                        <Input
                          id="sessions_per_month"
                          type="number"
                          value={formData.numeric.sessions_per_month || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              numeric: {
                                ...formData.numeric,
                                sessions_per_month:
                                  parseInt(e.target.value) || undefined,
                              },
                            })
                          }
                          min="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minutes_per_session">
                          Minutes per Session
                        </Label>
                        <Input
                          id="minutes_per_session"
                          type="number"
                          value={formData.numeric.minutes_per_session || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              numeric: {
                                ...formData.numeric,
                                minutes_per_session:
                                  parseInt(e.target.value) || undefined,
                              },
                            })
                          }
                          min="15"
                          step="15"
                        />
                      </div>
                    </>
                  )}

                  {formData.type === "caretaker" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="days_per_week">Days per Week</Label>
                        <Input
                          id="days_per_week"
                          type="number"
                          value={formData.numeric.days_per_week || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              numeric: {
                                ...formData.numeric,
                                days_per_week: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          min="1"
                          max="7"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hours_per_day">Hours per Day</Label>
                        <Input
                          id="hours_per_day"
                          type="number"
                          value={formData.numeric.hours_per_day || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              numeric: {
                                ...formData.numeric,
                                hours_per_day:
                                  parseInt(e.target.value) || undefined,
                              },
                            })
                          }
                          min="1"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="total_monthly_hours">
                      Total Monthly Hours
                    </Label>
                    <Input
                      id="total_monthly_hours"
                      type="number"
                      value={formData.numeric.total_monthly_hours || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numeric: {
                            ...formData.numeric,
                            total_monthly_hours:
                              parseFloat(e.target.value) || undefined,
                          },
                        })
                      }
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="services_per_month">
                      Services per Month
                    </Label>
                    <Input
                      id="services_per_month"
                      type="number"
                      value={formData.numeric.services_per_month || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numeric: {
                            ...formData.numeric,
                            services_per_month:
                              parseInt(e.target.value) || undefined,
                          },
                        })
                      }
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Options</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="popular"
                      checked={formData.popular}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          popular: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="popular" className="cursor-pointer">
                      Popular Plan
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visibility"
                      checked={formData.visibility}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          visibility: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="visibility" className="cursor-pointer">
                      Visible
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="on_demand"
                      checked={formData.numeric.on_demand_available || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          numeric: {
                            ...formData.numeric,
                            on_demand_available: checked as boolean,
                          },
                        })
                      }
                    />
                    <Label htmlFor="on_demand" className="cursor-pointer">
                      On-Demand Available
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="weekend"
                      checked={formData.numeric.weekend_included || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          numeric: {
                            ...formData.numeric,
                            weekend_included: checked as boolean,
                          },
                        })
                      }
                    />
                    <Label htmlFor="weekend" className="cursor-pointer">
                      Weekend Included
                    </Label>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createPlanMutation.isPending || updatePlanMutation.isPending
                  }
                >
                  {createPlanMutation.isPending ||
                  updatePlanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingPlan ? (
                    "Update Plan"
                  ) : (
                    "Create Plan"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4">
        {statisticsCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Card
              key={card.key}
              className={`bg-gradient-to-br ${card.gradient} ${card.border}`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs sm:text-sm font-medium ${card.textColor} truncate`}
                    >
                      {card.title}
                    </p>
                    <p
                      className={`text-xl sm:text-2xl md:text-3xl font-bold ${card.valueColor}`}
                    >
                      {card.value}
                    </p>
                  </div>
                  <IconComponent
                    className={`h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 ${card.iconColor} flex-shrink-0`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filter Controls */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, description, plan ID, or features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-10 text-xs sm:text-sm h-8 sm:h-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {[
                {
                  key: "all",
                  label: "All Plans",
                  count: planStats.total,
                  icon: Package,
                },
                {
                  key: "food",
                  label: "Food",
                  count: planStats.food,
                  icon: Utensils,
                },
                {
                  key: "chef",
                  label: "Chef",
                  count: planStats.chef,
                  icon: ChefHat,
                },
                {
                  key: "psychologist",
                  label: "Psychologist",
                  count: planStats.psychologist,
                  icon: Brain,
                },
                {
                  key: "caretaker",
                  label: "Caretaker",
                  count: planStats.caretaker,
                  icon: Heart,
                },
              ].map((filter) => {
                const FilterIcon = filter.icon;
                return (
                  <Button
                    key={`filter-${filter.key}`}
                    variant={
                      selectedType === filter.key ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setSelectedType(filter.key as PlanType | "all")
                    }
                    className="flex items-center gap-1 sm:gap-2 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs"
                  >
                    <FilterIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">{filter.label}</span>
                    {filter.count > 0 && (
                      <span
                        className={`px-1 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${
                          selectedType === filter.key
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {filter.count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
          {selectedType === "all"
            ? "All Subscription Plans"
            : `${
                selectedType.charAt(0).toUpperCase() + selectedType.slice(1)
              } Plans`}
        </h3>
        <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          {filteredPlans.length} {filteredPlans.length === 1 ? "plan" : "plans"}{" "}
          found
        </span>
      </div>

      {/* Plans Grid */}
      {filteredPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredPlans.map((plan) => {
            const typeInfo = getPlanTypeInfo(plan.type);
            const TypeIcon = typeInfo.icon;
            return (
              <Card
                key={plan._id}
                className={cn(
                  "relative overflow-hidden border transition-all duration-200 hover:shadow-lg",
                  !plan.visibility && "opacity-60",
                  plan.popular && "ring-2 ring-yellow-400 dark:ring-yellow-600"
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-yellow-400 to-orange-500" />
                )}
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div
                        className={cn(
                          "p-1.5 sm:p-2 rounded-lg flex-shrink-0",
                          typeInfo.bgColor
                        )}
                      >
                        <TypeIcon
                          className={cn(
                            "h-7 w-7 sm:h-8 sm:w-8",
                            typeInfo.iconColor
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                          {plan.name}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] sm:text-xs",
                              typeInfo.textColor,
                              typeInfo.borderColor
                            )}
                          >
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {plan.type}
                          </Badge>
                          <Badge
                            className={cn(
                              "text-[10px] sm:text-xs",
                              getTierBadgeClass(plan.tier)
                            )}
                          >
                            {plan.tier}
                          </Badge>
                          {plan.popular && (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-[10px] sm:text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleVisibilityMutation.mutate({
                          id: plan._id,
                          visibility: !plan.visibility,
                        })
                      }
                      className="h-8 w-8 p-0"
                    >
                      {plan.visibility ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      ${plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.billing.cycle}
                      </span>
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      {plan.frequency}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      {plan.duration}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium">
                      Key Features:
                    </p>
                    <ul className="space-y-1 text-xs sm:text-sm">
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {feature}
                          </span>
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-muted-foreground text-xs">
                          +{plan.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  {plan.highlights.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs">
                        <Star className="h-3 w-3 text-yellow-600" />
                        <span className="text-muted-foreground">
                          {plan.highlights.join(" • ")}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(plan)}
                      className="flex-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || selectedType !== "all"
                    ? "No matching plans"
                    : "No subscription plans"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery || selectedType !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Create your first subscription plan to get started."}
                </p>
              </div>
              {(searchQuery || selectedType !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                >
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Delete Subscription Plan
            </DialogTitle>
            <DialogDescription className="pt-3">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deletingPlan?.name}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingPlan && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Plan ID:</span>
                <span className="text-muted-foreground">
                  {deletingPlan.plan_id}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Type:</span>
                <Badge variant="outline" className="text-xs">
                  {deletingPlan.type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Price:</span>
                <span className="text-muted-foreground">
                  ${deletingPlan.price}/{deletingPlan.billing.cycle}
                </span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deletePlanMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletePlanMutation.isPending}
            >
              {deletePlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Plan
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
