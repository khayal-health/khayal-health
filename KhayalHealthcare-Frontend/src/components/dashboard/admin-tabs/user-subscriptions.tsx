import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Search,
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  Heart,
  ChefHat,
  Brain,
  User,
  Edit3,
  Calendar,
  CreditCard,
  Shield,
  Info,
  Lock,
  Unlock,
  Mail,
  Phone,
  MapPin,
  RotateCcw,
  CalendarDays,
  CalendarClock,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { API_ENDPOINTS } from "@/lib/config";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  PlanSelectionModal,
  calculateTotalPrice,
  getPlansByIds,
} from "./PlanSelectionModal";

// Types - Updated to match API response
interface SubscriptionUser {
  id: string;
  name: string;
  username: string;
  phone: string;
  email?: string;
  approval_status: string;
  subscription_status: "active" | "pending" | "inactive";
  subscription_plan: string;
  subscription_plans?: string[]; // Added to handle API response
  subscription_expiry: string | null;
  subscription_renewal_date: string | null;
  created_at: string;
  experience?: number;
  degree?: string;
  address?: string;
  city?: string;
}

// Updated interface to match API expectations
interface UpdateSubscriptionData {
  subscription_status: string;
  subscription_plans: string[]; // Changed from subscription_plan to subscription_plans array
  subscription_expiry: string | null;
  subscription_renewal_date: string | null;
}

type Role = "caretakers" | "chefs" | "subscribers" | "psychologists";
type FilterStatus = "all" | "active" | "pending" | "inactive";

// Validation errors interface
interface ValidationErrors {
  subscription_plans?: string; // Changed from subscription_plan
  subscription_expiry?: string;
  subscription_renewal_date?: string;
  general?: string;
}

// Role configuration with gradient colors
const ROLE_CONFIG = {
  subscribers: {
    label: "Subscribers",
    icon: User,
    color: "bg-blue-500",
    bgColor:
      "from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20",
    borderColor: "border-blue-200 dark:border-blue-700",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  caretakers: {
    label: "Caretakers",
    icon: Heart,
    color: "bg-pink-500",
    bgColor:
      "from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/20",
    borderColor: "border-pink-200 dark:border-pink-700",
    textColor: "text-pink-600 dark:text-pink-400",
  },
  chefs: {
    label: "Chefs",
    icon: ChefHat,
    color: "bg-orange-500",
    bgColor:
      "from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20",
    borderColor: "border-orange-200 dark:border-orange-700",
    textColor: "text-orange-600 dark:text-orange-400",
  },
  psychologists: {
    label: "Psychologists",
    icon: Brain,
    color: "bg-purple-500",
    bgColor:
      "from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20",
    borderColor: "border-purple-200 dark:border-purple-700",
    textColor: "text-purple-600 dark:text-purple-400",
  },
};

// Map roles to API endpoints
const ROLE_API_KEYS = {
  caretakers: API_ENDPOINTS.ADMIN_CARETAKERS_SUBSCRIPTIONS,
  chefs: API_ENDPOINTS.ADMIN_CHEFS_SUBSCRIPTIONS,
  subscribers: API_ENDPOINTS.ADMIN_SUBSCRIBERS_SUBSCRIPTIONS,
  psychologists: API_ENDPOINTS.ADMIN_PSYCHOLOGISTS_SUBSCRIPTIONS,
};

// Helper function to parse subscription plans from user data
function parseUserPlans(user: SubscriptionUser): string[] {
  // If user has subscription_plans array, use it
  if (user.subscription_plans && Array.isArray(user.subscription_plans)) {
    return user.subscription_plans;
  }

  // Otherwise, try to parse from subscription_plan string
  if (user.subscription_plan && user.subscription_plan !== "none") {
    // If it's a comma-separated string, split it
    if (user.subscription_plan.includes(",")) {
      return user.subscription_plan.split(",").map((p) => p.trim());
    }
    // If it's a single plan, return as array
    return [user.subscription_plan];
  }

  return [];
}

// Individual role subscription component
function RoleSubscriptions({ role }: { role: Role }) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [unlockedCards, setUnlockedCards] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<SubscriptionUser | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    user: SubscriptionUser | null;
    data: UpdateSubscriptionData | null;
  }>({
    isOpen: false,
    user: null,
    data: null,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentRoleConfig = ROLE_CONFIG[role];

  // Fetch users by role
  const { data: users = [], isLoading } = useQuery<SubscriptionUser[]>({
    queryKey: [ROLE_API_KEYS[role]],
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.subscription_status === "active").length,
      pending: users.filter((u) => u.subscription_status === "pending").length,
      inactive: users.filter((u) => u.subscription_status === "inactive")
        .length,
    };
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (filterStatus !== "all") {
      filtered = filtered.filter(
        (user) => user.subscription_status === filterStatus
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(query) ||
          user.username?.toLowerCase().includes(query) ||
          user.phone?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.id.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const statusPriority = { active: 1, pending: 2, inactive: 3 };
      const priorityA = statusPriority[a.subscription_status] || 99;
      const priorityB = statusPriority[b.subscription_status] || 99;
      return priorityA - priorityB;
    });
  }, [users, filterStatus, searchQuery]);

  // Update subscription mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: UpdateSubscriptionData;
    }) => {
      return apiRequest(
        "PATCH",
        API_ENDPOINTS.ADMIN_USER_SUBSCRIPTION(userId),
        data
      );
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: "Subscription updated successfully",
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: [ROLE_API_KEYS[role]] });
      setEditingUser(null);
      setUnlockedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(variables.userId);
        return newSet;
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  const handleUnlock = useCallback(
    (userId: string) => {
      setUnlockedCards((prev) => new Set(prev).add(userId));
      // Auto-lock after 30 seconds
      setTimeout(() => {
        setUnlockedCards((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        if (editingUser?.id === userId) {
          setEditingUser(null);
        }
      }, 30000);
    },
    [editingUser]
  );

  const handleConfirmUpdate = useCallback(() => {
    if (confirmDialog.user && confirmDialog.data && confirmDialog.user.id) {
      updateMutation.mutate({
        userId: confirmDialog.user.id,
        data: confirmDialog.data,
      });
      setConfirmDialog({ isOpen: false, user: null, data: null });
    }
  }, [confirmDialog, updateMutation]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterStatus("all");
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      active:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
      pending:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      inactive:
        "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800",
    };
    return colors[status as keyof typeof colors] || colors.inactive;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "pending":
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "inactive":
        return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const filterButtons = [
    { key: "all", label: "All", count: stats.total, color: "bg-gray-500" },
    {
      key: "active",
      label: "Active",
      count: stats.active,
      color: "bg-emerald-500",
    },
    {
      key: "pending",
      label: "Pending",
      count: stats.pending,
      color: "bg-amber-500",
    },
    {
      key: "inactive",
      label: "Inactive",
      count: stats.inactive,
      color: "bg-gray-500",
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
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card
          className={cn(
            "bg-gradient-to-br",
            currentRoleConfig.bgColor,
            currentRoleConfig.borderColor
          )}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-xs sm:text-sm font-medium truncate",
                    currentRoleConfig.textColor
                  )}
                >
                  Total {currentRoleConfig.label}
                </p>
                <p
                  className={cn(
                    "text-xl sm:text-2xl md:text-3xl font-bold",
                    currentRoleConfig.textColor
                      .replace("text-", "text-")
                      .replace("-400", "-900")
                      .replace("dark:text-", "dark:text-")
                      .replace("-400", "-100")
                  )}
                >
                  {stats.total}
                </p>
              </div>
              <Users
                className={cn(
                  "h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 flex-shrink-0",
                  currentRoleConfig.textColor
                )}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                  Active
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  {stats.active}
                </p>
              </div>
              <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300 truncate">
                  Pending
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/20 border-gray-200 dark:border-gray-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  Inactive
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.inactive}
                </p>
              </div>
              <UserX className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-gray-600 dark:text-gray-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, phone, email, or ID..."
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
              {filterButtons.map((filter) => (
                <Button
                  key={filter.key}
                  variant={filterStatus === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(filter.key as FilterStatus)}
                  className="flex items-center gap-1 sm:gap-2 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs"
                >
                  <div
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${filter.color}`}
                  />
                  <span className="truncate">{filter.label}</span>
                  {filter.count > 0 && (
                    <span
                      className={`px-1 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${
                        filterStatus === filter.key
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {filter.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
          {filterStatus === "all"
            ? `All ${currentRoleConfig.label} Subscriptions`
            : `${
                filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)
              } ${currentRoleConfig.label}`}
        </h3>
        <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}{" "}
          found
        </span>
      </div>

      {/* User Cards Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredUsers.map((user) => {
            const isUnlocked = unlockedCards.has(user.id);
            const Icon = currentRoleConfig.icon;
            const userPlans = parseUserPlans(user);

            return (
              <Card
                key={user.id}
                className={cn(
                  "relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg",
                  user.subscription_status === "pending" &&
                    "ring-2 ring-amber-200 dark:ring-amber-800",
                  user.subscription_status === "inactive" &&
                    !isUnlocked &&
                    "opacity-90",
                  isUnlocked && "ring-2 ring-orange-400 dark:ring-orange-600"
                )}
              >
                {/* Status Badge */}
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
                  <div
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(
                      user.subscription_status
                    )}`}
                  >
                    {getStatusIcon(user.subscription_status)}
                    <span className="capitalize">
                      {user.subscription_status}
                    </span>
                  </div>
                </div>

                {/* Top indicator for pending */}
                {user.subscription_status === "pending" && (
                  <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                )}

                {/* Top indicator for unlocked */}
                {isUnlocked && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500 animate-pulse" />
                )}

                <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-2 sm:gap-3 pr-16 sm:pr-24">
                      <div
                        className={cn(
                          "p-1.5 sm:p-2 rounded-lg flex-shrink-0",
                          currentRoleConfig.bgColor.split(" ")[0] +
                            " " +
                            currentRoleConfig.bgColor.split(" ")[1]
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6",
                            currentRoleConfig.textColor
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {user.name}
                        </CardTitle>
                        <CardDescription className="text-[10px] sm:text-xs text-muted-foreground leading-snug">
                          <span className="block truncate">
                            @{user.username}
                          </span>
                          <span className="block break-words">
                            ID: {user.id}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="space-y-2 sm:space-y-3">
                    {/* Contact Information */}
                    <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                            {user.phone}
                          </span>
                        </div>
                        {user.email && (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                              {user.email}
                            </span>
                          </div>
                        )}
                        {(user.address || user.city) && (
                          <div className="flex items-start gap-1.5 sm:gap-2">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2">
                              {[user.address, user.city]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subscription Details */}
                    <div className="p-2 sm:p-3 bg-primary/5 dark:bg-primary/10 rounded-lg space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {userPlans.length > 0
                            ? `${userPlans.length} Plan${
                                userPlans.length > 1 ? "s" : ""
                              }`
                            : "No Plan"}
                        </span>
                      </div>
                      {userPlans.length > 0 && (
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                          {userPlans.map((plan, idx) => (
                            <div key={idx} className="truncate">
                              • {plan}
                            </div>
                          ))}
                        </div>
                      )}
                      {user.subscription_expiry && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                            Expires:{" "}
                            {format(new Date(user.subscription_expiry), "PP")}
                          </span>
                        </div>
                      )}
                      {user.subscription_renewal_date && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                            Renews:{" "}
                            {format(
                              new Date(user.subscription_renewal_date),
                              "PP"
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Section */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      {!isUnlocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlock(user.id)}
                          className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                        >
                          <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                          Modify Subscription
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0.5 border-orange-400 text-orange-600 dark:text-orange-400"
                            >
                              <Unlock className="h-3 w-3 mr-1" />
                              Unlocked
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                              className="h-7 px-2 text-xs"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit Details
                            </Button>
                          </div>
                          <p className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Auto-locks in 30 seconds
                          </p>
                        </div>
                      )}
                    </div>
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
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || filterStatus !== "all"
                    ? "No matching users"
                    : "No subscriptions yet"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : `No ${currentRoleConfig.label.toLowerCase()} with subscriptions found.`}
                </p>
              </div>
              {(searchQuery || filterStatus !== "all") && (
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

      {/* Edit Subscription Dialog - Fixed with scrollable content */}
      <AlertDialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <AlertDialogContent className="max-w-md sm:max-w-lg max-h-[90vh] flex flex-col">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Update Subscription Details
            </AlertDialogTitle>
          </AlertDialogHeader>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
            <AlertDialogDescription asChild>
              <div className="space-y-3 sm:space-y-4">
                {editingUser && (
                  <EditSubscriptionForm
                    user={editingUser}
                    onSubmit={(data) => {
                      setConfirmDialog({
                        isOpen: true,
                        user: editingUser,
                        data,
                      });
                    }}
                    isLoading={updateMutation.isPending}
                    onCancel={() => setEditingUser(null)}
                  />
                )}
              </div>
            </AlertDialogDescription>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog - Fixed with scrollable content */}
      <AlertDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ isOpen: false, user: null, data: null })
        }
      >
        <AlertDialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-orange-500" />
              Confirm Subscription Update
            </AlertDialogTitle>
          </AlertDialogHeader>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {confirmDialog.user && confirmDialog.data && (
                  <>
                    <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                        Updating subscription for:{" "}
                        <span className="font-bold">
                          {confirmDialog.user.name}
                        </span>
                      </p>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Changes:
                          </p>
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className="w-full justify-center"
                            >
                              {confirmDialog.data.subscription_status}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="w-full justify-center text-[10px]"
                            >
                              {confirmDialog.data.subscription_plans.length}{" "}
                              Plan
                              {confirmDialog.data.subscription_plans.length !==
                              1
                                ? "s"
                                : ""}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Dates:
                          </p>
                          <div className="space-y-1 text-[10px]">
                            {confirmDialog.data.subscription_expiry && (
                              <p className="truncate">
                                Exp:{" "}
                                {format(
                                  new Date(
                                    confirmDialog.data.subscription_expiry
                                  ),
                                  "PP"
                                )}
                              </p>
                            )}
                            {confirmDialog.data.subscription_renewal_date && (
                              <p className="truncate">
                                Ren:{" "}
                                {format(
                                  new Date(
                                    confirmDialog.data.subscription_renewal_date
                                  ),
                                  "PP"
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Show selected plans */}
                      {confirmDialog.data.subscription_plans.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Selected Plans:
                          </p>
                          <div className="space-y-0.5">
                            {confirmDialog.data.subscription_plans.map(
                              (plan, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs text-orange-700 dark:text-orange-300"
                                >
                                  • {plan}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold text-blue-700 dark:text-blue-300">
                            This action will:
                          </p>
                          <ul className="text-blue-600 dark:text-blue-400 space-y-0.5 list-disc list-inside">
                            <li>Update the user's subscription immediately</li>
                            <li>Send a notification to the user</li>
                            <li>Log this change in the audit trail</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="flex-shrink-0">
            <AlertDialogCancel className="text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUpdate}
              disabled={updateMutation.isPending}
              className="text-sm font-medium bg-primary hover:bg-primary/90"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Confirm Update
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Edit Subscription Form Component - UPDATED TO USE ARRAY
function EditSubscriptionForm({
  user,
  onSubmit,
  isLoading,
  onCancel,
}: {
  user: SubscriptionUser;
  onSubmit: (data: UpdateSubscriptionData) => void;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>(() => {
    return [];
  });

  const [formData, setFormData] = useState<UpdateSubscriptionData>({
    subscription_status: user.subscription_status || "inactive",
    subscription_plans: parseUserPlans(user), // Initialize with parsed plans
    subscription_expiry: user.subscription_expiry
      ? new Date(user.subscription_expiry).toISOString().split("T")[0]
      : "",
    subscription_renewal_date: user.subscription_renewal_date
      ? new Date(user.subscription_renewal_date).toISOString().split("T")[0]
      : "",
  });

  const handlePlanSelection = (planIds: string[]) => {
    setSelectedPlanIds(planIds);
    // Get plan names from IDs
    const plans = getPlansByIds(planIds, []);
    const planNames = plans.map((p) => p.name);
    setFormData({ ...formData, subscription_plans: planNames });
    setTouched({ ...touched, subscription_plans: true });
  };

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{
    [key in keyof UpdateSubscriptionData]: boolean;
  }>({
    subscription_status: false,
    subscription_plans: false,
    subscription_expiry: false,
    subscription_renewal_date: false,
  });

  const { toast } = useToast();

  // Validate form data
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If status is active, validation is strict
    if (formData.subscription_status === "active") {
      // Plan validation
      if (
        !formData.subscription_plans ||
        formData.subscription_plans.length === 0
      ) {
        newErrors.subscription_plans =
          "Active subscriptions must have at least one plan";
      }

      // Expiry date validation
      if (!formData.subscription_expiry) {
        newErrors.subscription_expiry =
          "Active subscriptions must have an expiry date";
      } else {
        const expiryDate = new Date(formData.subscription_expiry);
        if (expiryDate <= today) {
          newErrors.subscription_expiry = "Expiry date must be in the future";
        }
      }

      // Renewal date validation
      if (!formData.subscription_renewal_date) {
        newErrors.subscription_renewal_date =
          "Active subscriptions must have a renewal date";
      } else if (formData.subscription_expiry) {
        const expiryDate = new Date(formData.subscription_expiry);
        const renewalDate = new Date(formData.subscription_renewal_date);

        if (renewalDate > expiryDate) {
          newErrors.subscription_renewal_date =
            "Renewal date cannot be after expiry date";
        }

        if (renewalDate < today) {
          newErrors.subscription_renewal_date =
            "Renewal date cannot be in the past";
        }
      }
    }

    // For pending status, require plan but dates are optional
    if (formData.subscription_status === "pending") {
      if (
        !formData.subscription_plans ||
        formData.subscription_plans.length === 0
      ) {
        newErrors.subscription_plans =
          "Pending subscriptions should have at least one plan";
      }

      // If dates are provided, validate them
      if (formData.subscription_expiry && formData.subscription_renewal_date) {
        const expiryDate = new Date(formData.subscription_expiry);
        const renewalDate = new Date(formData.subscription_renewal_date);

        if (renewalDate > expiryDate) {
          newErrors.subscription_renewal_date =
            "Renewal date cannot be after expiry date";
        }
      }
    }

    // For inactive status, allow clearing dates
    if (formData.subscription_status === "inactive") {
      // No strict validation, but if dates exist, they should be valid
      if (formData.subscription_expiry && formData.subscription_renewal_date) {
        const expiryDate = new Date(formData.subscription_expiry);
        const renewalDate = new Date(formData.subscription_renewal_date);

        if (renewalDate > expiryDate) {
          newErrors.subscription_renewal_date =
            "Renewal date cannot be after expiry date";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Validate on form data change
  useEffect(() => {
    if (Object.values(touched).some((t) => t)) {
      validateForm();
    }
  }, [formData, validateForm, touched]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      subscription_status: true,
      subscription_plans: true,
      subscription_expiry: true,
      subscription_renewal_date: true,
    });

    // Validate
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    // Prepare data with proper null values
    const submitData: UpdateSubscriptionData = {
      subscription_status: formData.subscription_status,
      subscription_plans: formData.subscription_plans,
      subscription_expiry: formData.subscription_expiry
        ? `${formData.subscription_expiry}T23:59:59`
        : null,
      subscription_renewal_date: formData.subscription_renewal_date
        ? `${formData.subscription_renewal_date}T00:00:00`
        : null,
    };

    onSubmit(submitData);
  };

  const handleFieldChange = (
    field: keyof UpdateSubscriptionData,
    value: string
  ) => {
    if (field === "subscription_plans") {
      // This shouldn't be called for plans - using handlePlanSelection instead
      return;
    }

    setFormData({ ...formData, [field]: value });
    setTouched({ ...touched, [field]: true });

    // Clear dates when switching to inactive
    if (field === "subscription_status" && value === "inactive") {
      setFormData({
        ...formData,
        subscription_status: value,
        subscription_plans: [],
        subscription_expiry: "",
        subscription_renewal_date: "",
      });
      setSelectedPlanIds([]);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;
  const isFormValid = formData.subscription_status !== "" && !hasErrors;

  // Get minimum date for inputs (today)
  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
          Editing:{" "}
          <span className="text-gray-900 dark:text-white">{user.name}</span>
        </p>
        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
          ID: {user.id}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status" className="text-xs sm:text-sm">
          Subscription Status <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.subscription_status}
          onValueChange={(value) =>
            handleFieldChange("subscription_status", value)
          }
        >
          <SelectTrigger
            id="status"
            className={cn(
              "h-8 sm:h-10 text-xs sm:text-sm",
              touched.subscription_status &&
                errors.general &&
                "border-red-500 focus:ring-red-500"
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                Active
              </div>
            </SelectItem>
            <SelectItem value="pending">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
                Pending
              </div>
            </SelectItem>
            <SelectItem value="inactive">
              <div className="flex items-center gap-2">
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                Inactive
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan" className="text-xs sm:text-sm">
          Subscription Plans{" "}
          {formData.subscription_status === "active" && (
            <span className="text-red-500">*</span>
          )}
        </Label>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPlanModal(true)}
            className={cn(
              "w-full justify-between h-10 text-sm",
              touched.subscription_plans &&
                errors.subscription_plans &&
                "border-red-500 focus:ring-red-500"
            )}
          >
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {selectedPlanIds.length > 0
                ? `${selectedPlanIds.length} plan${
                    selectedPlanIds.length > 1 ? "s" : ""
                  } selected`
                : formData.subscription_plans.length > 0
                ? `${formData.subscription_plans.length} plan${
                    formData.subscription_plans.length > 1 ? "s" : ""
                  } selected`
                : "Select Plans..."}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {(selectedPlanIds.length > 0 ||
            formData.subscription_plans.length > 0) && (
            <div className="p-3 bg-primary/5 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Selected Plans:</span>
                {selectedPlanIds.length > 0 && (
                  <Badge variant="secondary">
                    Total: ${calculateTotalPrice(selectedPlanIds, [])}/month
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {selectedPlanIds.length > 0
                  ? getPlansByIds(selectedPlanIds, []).map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <plan.icon className="h-3 w-3" />
                        <span>{plan.name}</span>
                        <Badge variant="outline" className="ml-auto">
                          ${plan.price}/mo
                        </Badge>
                      </div>
                    ))
                  : formData.subscription_plans.map((planName, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span>• {planName}</span>
                      </div>
                    ))}
              </div>
            </div>
          )}
        </div>

        {touched.subscription_plans && errors.subscription_plans && (
          <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.subscription_plans}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiry" className="text-xs sm:text-sm">
          Subscription Expiry{" "}
          {formData.subscription_status === "active" && (
            <span className="text-red-500">*</span>
          )}
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            id="expiry"
            type="date"
            value={formData.subscription_expiry || ""}
            onChange={(e) =>
              handleFieldChange("subscription_expiry", e.target.value)
            }
            min={today}
            className={cn(
              "pl-8 sm:pl-10 h-8 sm:h-10 text-xs sm:text-sm",
              touched.subscription_expiry &&
                errors.subscription_expiry &&
                "border-red-500 focus:ring-red-500"
            )}
          />
        </div>
        {touched.subscription_expiry && errors.subscription_expiry && (
          <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.subscription_expiry}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="renewal" className="text-xs sm:text-sm">
          Renewal Date{" "}
          {formData.subscription_status === "active" && (
            <span className="text-red-500">*</span>
          )}
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            id="renewal"
            type="date"
            value={formData.subscription_renewal_date || ""}
            onChange={(e) =>
              handleFieldChange("subscription_renewal_date", e.target.value)
            }
            min={today}
            max={formData.subscription_expiry || undefined}
            className={cn(
              "pl-8 sm:pl-10 h-8 sm:h-10 text-xs sm:text-sm",
              touched.subscription_renewal_date &&
                errors.subscription_renewal_date &&
                "border-red-500 focus:ring-red-500"
            )}
          />
        </div>
        {touched.subscription_renewal_date &&
          errors.subscription_renewal_date && (
            <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.subscription_renewal_date}
            </p>
          )}
      </div>

      {/* Status-specific help text */}
      {formData.subscription_status === "active" && (
        <div className="flex items-start gap-2 p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <Info className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
            <p className="font-medium">Active subscription requirements:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Must have at least one plan selected</li>
              <li>Must have an expiry date in the future</li>
              <li>Must have a renewal date</li>
              <li>Renewal date must be before or on expiry date</li>
            </ul>
          </div>
        </div>
      )}

      {formData.subscription_status === "pending" && (
        <div className="flex items-start gap-2 p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <Info className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300">
            Pending subscriptions should have plans selected. Dates are optional
            until activation.
          </p>
        </div>
      )}

      {formData.subscription_status === "inactive" && (
        <div className="flex items-start gap-2 p-2 sm:p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
          <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
            Inactive subscriptions don't require dates or plan information.
          </p>
        </div>
      )}

      {/* Error summary */}
      {hasErrors && Object.values(touched).some((t) => t) && (
        <div className="flex items-start gap-2 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-[10px] sm:text-xs text-red-600 dark:text-red-400">
            <p className="font-medium mb-1">Please fix the following errors:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {Object.values(errors).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !isFormValid}
          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Subscription"
          )}
        </Button>
      </div>

      <PlanSelectionModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onConfirm={handlePlanSelection}
        currentPlans={selectedPlanIds}
        allowMultiple={true}
      />
    </form>
  );
}

// Main component
export default function UserSubscriptions() {
  const [selectedRole, setSelectedRole] = useState<Role>("subscribers");

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs
        value={selectedRole}
        onValueChange={(v) => setSelectedRole(v as Role)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 gap-0 p-0 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          {Object.entries(ROLE_CONFIG).map(([role, config], index) => {
            const Icon = config.icon;
            const isFirst = index === 0;
            const isLast = index === Object.keys(ROLE_CONFIG).length - 1;
            return (
              <TabsTrigger
                key={role}
                value={role}
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-4",
                  "data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200",
                  isFirst && "rounded-l-xl",
                  isLast && "rounded-r-xl"
                )}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                <span className="text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
                  {config.label}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(ROLE_CONFIG).map((role) => (
          <TabsContent
            key={role}
            value={role}
            className="mt-4 sm:mt-6 focus:outline-none"
          >
            <RoleSubscriptions role={role as Role} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
