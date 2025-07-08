import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Utensils,
  ChefHat,
  Brain,
  Heart,
  Calendar,
  Clock,
  Check,
  Sparkles,
  Star,
  Crown,
  X,
  ShoppingCart,
  Shield,
  Award,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/config";

// Plan types and tiers
export type PlanType = "food" | "chef" | "psychologist" | "caretaker";
export type PlanTier = "basic" | "standard" | "premium";

// API Response interface (snake_case)
interface SubscriptionPlanAPI {
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
  numeric: {
    days_per_week?: number | null;
    hours_per_day?: number | null;
    hours_per_visit?: number | null;
    meals_per_day?: number | null;
    snacks_per_day?: number | null;
    sessions_per_month?: number | null;
    minutes_per_session?: number | null;
    visits_per_week?: number | null;
    total_monthly_hours?: number | null;
    consultations_per_month?: number | null;
    services_per_month?: number | null;
    coverage_days?: number | null;
    on_demand_available?: boolean;
    weekend_included?: boolean;
  };
  billing: {
    cycle: "monthly" | "weekly" | "daily";
    amount: number;
  };
  created_at: string;
  updated_at: string;
}

// Frontend interface (camelCase)
interface PlanConfig {
  id: string;
  type: PlanType;
  tier: PlanTier;
  name: string;
  icon: any;
  color: string;
  price: number;
  features: string[];
  frequency: string;
  duration: string;
  description: string;
  highlights: string[];
  limitations?: string[];
  popular?: boolean;

  numeric: {
    daysPerWeek: number;
    hoursPerDay?: number;
    hoursPerVisit?: number;
    mealsPerDay?: number;
    snacksPerDay?: number;
    sessionsPerMonth?: number;
    minutesPerSession?: number;
    visitsPerWeek?: number;
    totalMonthlyHours?: number;
    consultationsPerMonth?: number;
    servicesPerMonth?: number;
    coverageDays?: number;
    onDemandAvailable?: boolean;
    weekendIncluded?: boolean;
  };

  billing: {
    cycle: "monthly" | "weekly" | "daily";
    amount: number;
  };
}

// Transform API response to frontend format
const transformPlanData = (apiPlan: SubscriptionPlanAPI): PlanConfig => {
  // Get icon component based on type
  const getIconComponent = () => {
    switch (apiPlan.type) {
      case "food":
        return Utensils;
      case "chef":
        return ChefHat;
      case "psychologist":
        return Brain;
      case "caretaker":
        return Heart;
      default:
        return Utensils;
    }
  };

  return {
    id: apiPlan.plan_id,
    type: apiPlan.type,
    tier: apiPlan.tier,
    name: apiPlan.name,
    icon: getIconComponent(),
    color: apiPlan.color.startsWith("#")
      ? apiPlan.color.slice(1)
      : apiPlan.color,
    price: apiPlan.price,
    features: apiPlan.features,
    frequency: apiPlan.frequency,
    duration: apiPlan.duration,
    description: apiPlan.description,
    highlights: apiPlan.highlights,
    limitations: apiPlan.limitations,
    popular: apiPlan.popular,
    numeric: {
      daysPerWeek: apiPlan.numeric.days_per_week || 0,
      hoursPerDay: apiPlan.numeric.hours_per_day || undefined,
      hoursPerVisit: apiPlan.numeric.hours_per_visit || undefined,
      mealsPerDay: apiPlan.numeric.meals_per_day || undefined,
      snacksPerDay: apiPlan.numeric.snacks_per_day || undefined,
      sessionsPerMonth: apiPlan.numeric.sessions_per_month || undefined,
      minutesPerSession: apiPlan.numeric.minutes_per_session || undefined,
      visitsPerWeek: apiPlan.numeric.visits_per_week || undefined,
      totalMonthlyHours: apiPlan.numeric.total_monthly_hours || undefined,
      consultationsPerMonth:
        apiPlan.numeric.consultations_per_month || undefined,
      servicesPerMonth: apiPlan.numeric.services_per_month || undefined,
      coverageDays: apiPlan.numeric.coverage_days || undefined,
      onDemandAvailable: apiPlan.numeric.on_demand_available || false,
      weekendIncluded: apiPlan.numeric.weekend_included || false,
    },
    billing: {
      cycle: apiPlan.billing.cycle,
      amount: apiPlan.billing.amount,
    },
  };
};

// Plan type metadata
const PLAN_TYPES = {
  food: {
    title: "Nutrition",
    description: "Medical-grade nutrition delivery",
    icon: Utensils,
    gradient: "from-emerald-500 to-emerald-600",
  },
  chef: {
    title: "Chef Services",
    description: "Health-focused personal chefs",
    icon: ChefHat,
    gradient: "from-amber-500 to-amber-600",
  },
  psychologist: {
    title: "Mental Health",
    description: "Comprehensive mental wellness",
    icon: Brain,
    gradient: "from-violet-500 to-violet-600",
  },
  caretaker: {
    title: "Care Services",
    description: "Professional health support",
    icon: Heart,
    gradient: "from-rose-500 to-rose-600",
  },
};

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedPlans: string[]) => void;
  currentPlans?: string[];
  allowMultiple?: boolean;
}

// Compact Plan Card Component
const PlanCard = ({
  plan,
  isSelected,
  onToggle,
}: {
  plan: PlanConfig;
  isSelected: boolean;
  onToggle: (planId: string) => void;
}) => {
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const getTierIcon = (tier: PlanTier) => {
    switch (tier) {
      case "basic":
        return Star;
      case "standard":
        return Sparkles;
      case "premium":
        return Crown;
    }
  };

  const getTierColor = (tier: PlanTier) => {
    switch (tier) {
      case "basic":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
      case "standard":
        return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
      case "premium":
        return "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400";
    }
  };

  const getColorClasses = (color: string, selected: boolean) => {
    const colors: Record<string, { border: string; bg: string; icon: string }> =
      {
        emerald: {
          border: selected
            ? "border-emerald-400 shadow-sm shadow-emerald-100 dark:shadow-emerald-900/20"
            : "border-gray-200 dark:border-gray-700",
          bg: selected ? "bg-emerald-25 dark:bg-emerald-950/10" : "",
          icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
        },
        amber: {
          border: selected
            ? "border-amber-400 shadow-sm shadow-amber-100 dark:shadow-amber-900/20"
            : "border-gray-200 dark:border-gray-700",
          bg: selected ? "bg-amber-25 dark:bg-amber-950/10" : "",
          icon: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
        },
        violet: {
          border: selected
            ? "border-violet-400 shadow-sm shadow-violet-100 dark:shadow-violet-900/20"
            : "border-gray-200 dark:border-gray-700",
          bg: selected ? "bg-violet-25 dark:bg-violet-950/10" : "",
          icon: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
        },
        rose: {
          border: selected
            ? "border-rose-400 shadow-sm shadow-rose-100 dark:shadow-rose-900/20"
            : "border-gray-200 dark:border-gray-700",
          bg: selected ? "bg-rose-25 dark:bg-rose-950/10" : "",
          icon: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
        },
      };
    return colors[color] || colors.emerald;
  };

  const colorClasses = getColorClasses(plan.color, isSelected);
  const TierIcon = getTierIcon(plan.tier);
  const visibleFeatures = showAllFeatures
    ? plan.features
    : plan.features.slice(0, 3);

  // Format numeric values for display
  const getNumericDisplay = () => {
    const items = [];

    if (plan.numeric.mealsPerDay && plan.numeric.mealsPerDay > 0) {
      items.push(
        `${
          plan.numeric.mealsPerDay === -1
            ? "Unlimited"
            : plan.numeric.mealsPerDay
        } meals/day`
      );
    }
    if (plan.numeric.sessionsPerMonth && plan.numeric.sessionsPerMonth > 0) {
      items.push(
        `${
          plan.numeric.sessionsPerMonth === -1
            ? "Unlimited"
            : plan.numeric.sessionsPerMonth
        } sessions/mo`
      );
    }
    if (plan.numeric.hoursPerDay && plan.numeric.hoursPerDay > 0) {
      items.push(
        `${
          plan.numeric.hoursPerDay === -1
            ? "Flexible"
            : plan.numeric.hoursPerDay
        } hrs/day`
      );
    }

    return items;
  };

  const numericDisplayItems = getNumericDisplay();

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md relative overflow-hidden h-full",
        colorClasses.border,
        colorClasses.bg,
        isSelected && "ring-1 ring-offset-1 shadow-md",
        plan.popular && "ring-1 ring-blue-200 dark:ring-blue-800"
      )}
      onClick={() => onToggle(plan.id)}
    >
      {/* Popular Badge - Smaller and more subtle */}
      {plan.popular && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-blue-500 text-white text-[10px] font-medium px-2 py-0.5 rounded-bl-md rounded-tr-md">
            POPULAR
          </div>
        </div>
      )}

      {/* Selected Indicator - Smaller */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
            <Check className="h-3 w-3 text-white" />
          </div>
        </div>
      )}

      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-start gap-2">
          <div
            className={cn("p-1.5 rounded-md flex-shrink-0", colorClasses.icon)}
          >
            <plan.icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
              {plan.name}
            </CardTitle>
            <Badge
              className={cn(
                "mt-1 text-[10px] px-1.5 py-0.5",
                getTierColor(plan.tier)
              )}
            >
              <TierIcon className="h-2.5 w-2.5 mr-1" />
              {plan.tier.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 px-3 pb-3">
        {/* Price - More compact */}
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold">${plan.price}</span>
          <span className="text-xs text-muted-foreground">/mo</span>
        </div>

        {/* Schedule Info - Single line */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {plan.frequency}
          </span>
          {plan.duration !== "Monthly" && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {plan.duration}
            </span>
          )}
        </div>

        {/* Numeric values display */}
        {numericDisplayItems.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {numericDisplayItems.map((item, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px]">
                {item}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="my-2" />

        {/* Features - More compact */}
        <div className="space-y-1.5">
          {visibleFeatures.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-xs">
              <Check className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="leading-relaxed">{feature}</span>
            </div>
          ))}

          {plan.features.length > 3 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAllFeatures(!showAllFeatures);
              }}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
            >
              {showAllFeatures ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />+{plan.features.length - 3}{" "}
                  more
                </>
              )}
            </button>
          )}
        </div>

        {/* Highlights - More compact */}
        {plan.highlights.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="flex gap-1 flex-wrap">
              {plan.highlights.slice(0, 2).map((highlight, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5"
                >
                  <Award className="h-2.5 w-2.5 mr-1" />
                  {highlight}
                </Badge>
              ))}
              {plan.highlights.length > 2 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                  +{plan.highlights.length - 2}
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Mobile Tab Selector Component
const MobileTabSelector = ({
  activeTab,
  onTabChange,
  selectedPlans,
  plans,
}: {
  activeTab: PlanType;
  onTabChange: (tab: PlanType) => void;
  selectedPlans: string[];
  plans: PlanConfig[];
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeConfig = PLAN_TYPES[activeTab];
  const Icon = activeConfig.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-lg shadow-sm"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <span className="font-medium">{activeConfig.title}</span>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50">
          {Object.entries(PLAN_TYPES).map(([type, config]) => {
            const planCount = selectedPlans.filter(
              (id) => plans.find((p) => p.id === id)?.type === type
            ).length;
            const TabIcon = config.icon;

            return (
              <button
                key={type}
                onClick={() => {
                  onTabChange(type as PlanType);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                  activeTab === type && "bg-gray-50 dark:bg-gray-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <TabIcon className="h-5 w-5" />
                  <span className="font-medium">{config.title}</span>
                </div>
                {planCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {planCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Error State Component
const ErrorState = ({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center space-y-4">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
      <div>
        <h3 className="font-semibold text-lg">Failed to load plans</h3>
        <p className="text-muted-foreground text-sm mt-1">
          {error.message || "Something went wrong"}
        </p>
      </div>
      <Button onClick={onRetry} variant="outline" size="sm">
        Try Again
      </Button>
    </div>
  </div>
);

// Loading State Component
const LoadingState = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="text-muted-foreground">Loading plans...</p>
    </div>
  </div>
);

export function PlanSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlans = [],
  allowMultiple = true,
}: PlanSelectionModalProps) {
  const [selectedPlans, setSelectedPlans] = useState<string[]>(currentPlans);
  const [activeTab, setActiveTab] = useState<PlanType>("food");

  // Fetch plans from API
  const {
    data: apiPlans = [],
    isLoading,
    error,
    refetch,
  } = useQuery<SubscriptionPlanAPI[]>({
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
      if (!response.ok) {
        throw new Error("Failed to fetch plans");
      }
      return response.json();
    },
    enabled: isOpen, // Only fetch when modal is open
  });

  // Transform API data to frontend format
  const plans = React.useMemo(() => {
    return apiPlans
      .filter((plan) => plan.visibility) // Only show visible plans
      .map(transformPlanData);
  }, [apiPlans]);

  // Group plans by type
  const groupedPlans = React.useMemo(() => {
    return plans.reduce((acc, plan) => {
      if (!acc[plan.type]) {
        acc[plan.type] = [];
      }
      acc[plan.type].push(plan);
      return acc;
    }, {} as Record<PlanType, PlanConfig[]>);
  }, [plans]);

  useEffect(() => {
    setSelectedPlans(currentPlans);
  }, [currentPlans]);

  const handlePlanToggle = (planId: string) => {
    if (allowMultiple) {
      setSelectedPlans((prev) =>
        prev.includes(planId)
          ? prev.filter((id) => id !== planId)
          : [...prev, planId]
      );
    } else {
      setSelectedPlans([planId]);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedPlans);
    onClose();
  };

  const totalPrice = React.useMemo(() => {
    return selectedPlans.reduce((total, planId) => {
      const plan = plans.find((p) => p.id === planId);
      return total + (plan?.price || 0);
    }, 0);
  }, [selectedPlans, plans]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-7xl h-[95vh] sm:h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 border-b bg-slate-50 dark:bg-slate-900 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-600 flex-shrink-0" />
                <span className="truncate">Healthcare Plans</span>
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                {allowMultiple
                  ? "Select your healthcare services"
                  : "Choose your healthcare plan"}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-shrink-0 sm:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Navigation */}
        <div className="px-4 sm:px-6 py-3 bg-slate-25 dark:bg-slate-900/50 border-b flex-shrink-0">
          {/* Desktop Tabs */}
          <div className="hidden sm:block">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as PlanType)}
            >
              <TabsList className="w-full h-auto p-1 bg-white dark:bg-gray-800">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 w-full">
                  {Object.entries(PLAN_TYPES).map(([type, config]) => {
                    const Icon = config.icon;
                    const planCount = selectedPlans.filter(
                      (id) => plans.find((p) => p.id === id)?.type === type
                    ).length;
                    return (
                      <TabsTrigger
                        key={type}
                        value={type}
                        className="relative flex flex-col items-center justify-center gap-2 py-3 px-4 data-[state=active]:bg-slate-600 data-[state=active]:text-white"
                        data-state={activeTab === type ? "active" : "inactive"}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium text-xs">
                          {config.title}
                        </span>
                        {planCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-blue-600 text-white text-[10px]"
                          >
                            {planCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </div>
              </TabsList>
            </Tabs>
          </div>

          {/* Mobile Selector */}
          <div className="sm:hidden">
            <MobileTabSelector
              activeTab={activeTab}
              onTabChange={setActiveTab}
              selectedPlans={selectedPlans}
              plans={plans}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6">
              {isLoading && <LoadingState />}
              {error && <ErrorState error={error as Error} onRetry={refetch} />}

              {!isLoading && !error && (
                <>
                  {/* Section Header - More subtle */}
                  <div className="mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      {React.createElement(PLAN_TYPES[activeTab].icon, {
                        className: "h-4 w-4 text-slate-600 dark:text-slate-400",
                      })}
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
                        {PLAN_TYPES[activeTab].description}
                      </span>
                    </div>
                  </div>

                  {/* Plans Grid - More cards per row */}
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {groupedPlans[activeTab]?.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        isSelected={selectedPlans.includes(plan.id)}
                        onToggle={handlePlanToggle}
                      />
                    ))}
                  </div>

                  {/* Empty state for tab */}
                  {(!groupedPlans[activeTab] ||
                    groupedPlans[activeTab].length === 0) && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        No {PLAN_TYPES[activeTab].title.toLowerCase()} plans
                        available
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 sm:px-6 py-4 border-t bg-slate-50 dark:bg-slate-900 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-4">
            <div className="flex-1 min-w-0">
              {selectedPlans.length > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0">
                    <ShoppingCart className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">
                      {selectedPlans.length} plan
                      {selectedPlans.length !== 1 ? "s" : ""} selected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total:{" "}
                      <span className="font-medium text-foreground">
                        ${totalPrice}/month
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Select {allowMultiple ? "plans" : "a plan"} to continue
                </p>
              )}
            </div>

            <div className="flex gap-3 flex-shrink-0">
              <Button
                variant="outline"
                size="default"
                onClick={onClose}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                size="default"
                onClick={handleConfirm}
                disabled={selectedPlans.length === 0}
                className="bg-slate-700 hover:bg-slate-800 flex-1 sm:flex-none"
              >
                Confirm Selection
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export utility functions
export function getPlanById(
  planId: string,
  plans: PlanConfig[]
): PlanConfig | undefined {
  return plans.find((plan) => plan.id === planId);
}

export function getPlansByIds(
  planIds: string[],
  plans: PlanConfig[]
): PlanConfig[] {
  return planIds
    .map((id) => getPlanById(id, plans))
    .filter((plan): plan is PlanConfig => plan !== undefined);
}

export function formatPlanNames(
  planIds: string[],
  plans: PlanConfig[]
): string {
  const selectedPlans = getPlansByIds(planIds, plans);
  if (selectedPlans.length === 0) return "No plans selected";
  if (selectedPlans.length === 1) return selectedPlans[0].name;
  if (selectedPlans.length === 2)
    return selectedPlans.map((p) => p.name).join(" & ");
  return `${selectedPlans.length} healthcare plans`;
}

export function calculateTotalPrice(
  planIds: string[],
  plans: PlanConfig[]
): number {
  const selectedPlans = getPlansByIds(planIds, plans);
  return selectedPlans.reduce((total, plan) => total + plan.price, 0);
}

// Additional helper for plan summaries
export function getPlanSummary(
  planIds: string[],
  plans: PlanConfig[]
): {
  count: number;
  types: string[];
  totalPrice: number;
} {
  const selectedPlans = getPlansByIds(planIds, plans);
  const types = [
    ...new Set(selectedPlans.map((p) => PLAN_TYPES[p.type].title)),
  ];

  return {
    count: selectedPlans.length,
    types,
    totalPrice: calculateTotalPrice(planIds, plans),
  };
}

// API Helper Functions for numeric calculations
export function calculateMonthlyCost(plan: PlanConfig): number {
  return plan.billing.amount;
}

export function calculateDailyServices(plan: PlanConfig): number {
  if (!plan.numeric.servicesPerMonth) return 0;
  return plan.numeric.servicesPerMonth / 30;
}

export function calculateWeeklyHours(plan: PlanConfig): number {
  if (plan.numeric.totalMonthlyHours === -1) return -1; // Unlimited
  if (!plan.numeric.totalMonthlyHours) return 0;
  return plan.numeric.totalMonthlyHours / 4;
}

export function getServiceFrequency(plan: PlanConfig): {
  daily: boolean;
  weekly: number;
  monthly: number;
} {
  return {
    daily: plan.numeric.daysPerWeek === 7,
    weekly: plan.numeric.daysPerWeek || 0,
    monthly: plan.numeric.servicesPerMonth || 0,
  };
}

// Export the plan type metadata
export { PLAN_TYPES };
export type { PlanConfig };
