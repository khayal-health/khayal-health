import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Loader2,
  User,
  Heart,
  ChefHat,
  Brain,
  Calendar,
  Phone,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  GraduationCap,
  Search,
  Users,
  UserCheck,
  UserX,
  RotateCcw,
  Mail,
  MapPin,
  AlertTriangle,
  Edit3,
  Shield,
  Info,
  RefreshCw,
  Lock,
  Unlock,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import type { User as UserType } from "@/types/schema";
import { cn } from "@/lib/utils";

interface AdminUser extends UserType {
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
}

type FilterStatus = "all" | "pending" | "accepted" | "rejected";

// Registration tab configurations
const registrationTabs = [
  {
    value: "subscriber",
    label: "Subscribers",
    icon: User,
    color: "bg-blue-500",
    bgColor:
      "from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20",
    borderColor: "border-blue-200 dark:border-blue-700",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    value: "caretaker",
    label: "Caretakers",
    icon: Heart,
    color: "bg-pink-500",
    bgColor:
      "from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/20",
    borderColor: "border-pink-200 dark:border-pink-700",
    textColor: "text-pink-600 dark:text-pink-400",
  },
  {
    value: "chef",
    label: "Chefs",
    icon: ChefHat,
    color: "bg-orange-500",
    bgColor:
      "from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20",
    borderColor: "border-orange-200 dark:border-orange-700",
    textColor: "text-orange-600 dark:text-orange-400",
  },
  {
    value: "psychologist",
    label: "Psychologists",
    icon: Brain,
    color: "bg-purple-500",
    bgColor:
      "from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20",
    borderColor: "border-purple-200 dark:border-purple-700",
    textColor: "text-purple-600 dark:text-purple-400",
  },
];

// Individual role component
function RoleRegistrations({ role }: { role: string }) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [unlockedCards, setUnlockedCards] = useState<Set<number>>(new Set());
  const [showChangeFor, setShowChangeFor] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    userId: number | null;
    newStatus: string;
    currentStatus: string;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    newStatus: "",
    currentStatus: "",
    userName: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: [API_ENDPOINTS.ADMIN_USERS(role)],
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const registrationStats = useMemo(() => {
    if (!users || users.length === 0) {
      return { total: 0, pending: 0, accepted: 0, rejected: 0 };
    }
    return users.reduce(
      (acc, user) => {
        acc.total++;
        if (user.approval_status === "pending") acc.pending++;
        else if (user.approval_status === "approved") acc.accepted++;
        else if (user.approval_status === "rejected") acc.rejected++;
        return acc;
      },
      { total: 0, pending: 0, accepted: 0, rejected: 0 }
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let filtered = users;
    if (statusFilter === "accepted") {
      filtered = filtered.filter((user) => user.approval_status === "approved");
    } else if (statusFilter !== "all") {
      filtered = filtered.filter(
        (user) => user.approval_status === statusFilter
      );
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user) => {
        const name = user.name?.toLowerCase() || "";
        const phone = user.phone?.toLowerCase() || "";
        const email = user.email?.toLowerCase() || "";
        const degree = user.degree?.toLowerCase() || "";
        const userId = user._id.toString().toLowerCase();
        return (
          name.includes(query) ||
          phone.includes(query) ||
          email.includes(query) ||
          degree.includes(query) ||
          userId.includes(query)
        );
      });
    }
    return filtered.sort((a, b) => {
      const statusPriority = { pending: 1, approved: 2, rejected: 3 };
      const priorityA =
        statusPriority[a.approval_status as keyof typeof statusPriority] || 99;
      const priorityB =
        statusPriority[b.approval_status as keyof typeof statusPriority] || 99;
      return priorityA - priorityB;
    });
  }, [users, statusFilter, searchQuery]);

  const approvalMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: number;
      status: string;
    }) => {
      return apiRequest("PATCH", API_ENDPOINTS.ADMIN_USER_APPROVAL(userId), {
        approval_status: status,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ADMIN_USERS(role)],
      });
      toast({
        title: "Success",
        description: "Registration status updated successfully",
        duration: 3000,
      });
      // Reset UI states after successful update
      setUnlockedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(variables.userId);
        return newSet;
      });
      setShowChangeFor(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update registration status",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  const handleApproval = useCallback(
    (userId: number, status: string) => {
      approvalMutation.mutate({ userId, status });
    },
    [approvalMutation]
  );

  const handleStatusChangeConfirmation = useCallback(
    (
      userId: number,
      newStatus: string,
      currentStatus: string,
      userName: string
    ) => {
      setConfirmDialog({
        isOpen: true,
        userId,
        newStatus,
        currentStatus,
        userName,
      });
    },
    []
  );

  const confirmStatusChange = useCallback(() => {
    if (confirmDialog.userId) {
      approvalMutation.mutate({
        userId: confirmDialog.userId,
        status: confirmDialog.newStatus,
      });
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    }
  }, [confirmDialog, approvalMutation]);

  const handleUnlock = useCallback((userId: number) => {
    setUnlockedCards((prev) => new Set(prev).add(userId));
    // Auto-lock after 30 seconds to prevent forgetting
    setTimeout(() => {
      setUnlockedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setShowChangeFor(null);
    }, 30000);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      pending:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      approved:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
      rejected:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800",
    };
    return (
      colors[status as keyof typeof colors] ||
      "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800"
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "approved":
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "rejected":
        return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const filterButtons = [
    {
      key: "all",
      label: "All Registrations",
      count: registrationStats.total,
      color: "bg-gray-500",
    },
    {
      key: "pending",
      label: "Pending",
      count: registrationStats.pending,
      color: "bg-amber-500",
    },
    {
      key: "accepted",
      label: "Accepted",
      count: registrationStats.accepted,
      color: "bg-emerald-500",
    },
    {
      key: "rejected",
      label: "Rejected",
      count: registrationStats.rejected,
      color: "bg-rose-500",
    },
  ];

  const currentRoleConfig = registrationTabs.find((tab) => tab.value === role);

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
            currentRoleConfig?.bgColor,
            currentRoleConfig?.borderColor
          )}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-xs sm:text-sm font-medium truncate",
                    currentRoleConfig?.textColor
                  )}
                >
                  Total Registrations
                </p>
                <p
                  className={cn(
                    "text-xl sm:text-2xl md:text-3xl font-bold",
                    currentRoleConfig?.textColor
                      .replace("text-", "text-")
                      .replace("-400", "-900")
                      .replace("dark:text-", "dark:text-")
                      .replace("-400", "-100")
                  )}
                >
                  {registrationStats.total}
                </p>
              </div>
              <Users
                className={cn(
                  "h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 flex-shrink-0",
                  currentRoleConfig?.textColor
                )}
              />
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
                  {registrationStats.pending}
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                  Accepted
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  {registrationStats.accepted}
                </p>
              </div>
              <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20 border-rose-200 dark:border-rose-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-rose-700 dark:text-rose-300 truncate">
                  Rejected
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-rose-900 dark:text-rose-100">
                  {registrationStats.rejected}
                </p>
              </div>
              <UserX className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-rose-600 dark:text-rose-400 flex-shrink-0" />
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
                placeholder="Search by name, phone, email, or ID..."
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
                  variant={statusFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.key as FilterStatus)}
                  className="flex items-center gap-1 sm:gap-2 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs"
                >
                  <div
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${filter.color}`}
                  />
                  <span className="truncate">{filter.label}</span>
                  {filter.count > 0 && (
                    <span
                      className={`px-1 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${
                        statusFilter === filter.key
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
          {statusFilter === "all"
            ? `All ${currentRoleConfig?.label} Registrations`
            : `${
                statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
              } ${currentRoleConfig?.label}`}
        </h3>
        <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          {filteredUsers.length}{" "}
          {filteredUsers.length === 1 ? "registration" : "registrations"} found
        </span>
      </div>

      {/* User Cards Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredUsers.map((user: any) => {
            const isPending = user.approval_status === "pending";
            const isUnlocked = unlockedCards.has(user._id);
            const showingChangeOptions = showChangeFor === user._id;
            const currentRole = registrationTabs.find(
              (tab) => tab.value === role
            );
            const Icon = currentRole?.icon || User;
            return (
              <Card
                key={user._id}
                className={cn(
                  "relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg",
                  isPending && "ring-2 ring-amber-200 dark:ring-amber-800",
                  user.approval_status === "rejected" &&
                    !isUnlocked &&
                    "opacity-90",
                  isUnlocked && "ring-2 ring-orange-400 dark:ring-orange-600"
                )}
              >
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
                  <div
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(
                      user.approval_status
                    )}`}
                  >
                    {getStatusIcon(user.approval_status)}
                    <span className="capitalize">
                      {user.approval_status === "approved"
                        ? "Accepted"
                        : user.approval_status}
                    </span>
                  </div>
                </div>
                {isPending && (
                  <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                )}
                {isUnlocked && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500 animate-pulse" />
                )}
                <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-2 sm:gap-3 pr-16 sm:pr-24">
                      <div
                        className={cn(
                          "p-1.5 sm:p-2 rounded-lg flex-shrink-0",
                          currentRole?.bgColor.split(" ")[0] +
                            " " +
                            currentRole?.bgColor.split(" ")[1]
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6",
                            currentRole?.textColor
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {user.name}
                        </CardTitle>
                        <CardDescription className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          ID: {user._id.toString()}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="space-y-2 sm:space-y-3">
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
                        {user.experience && (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Award className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                              {user.experience} years experience
                            </span>
                          </div>
                        )}
                        {user.degree && (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                              {user.degree}
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
                        {user.subscriptionPlan && (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                              {user.subscriptionPlan} Plan
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      {isPending ? (
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 sm:h-9 text-xs sm:text-sm"
                            onClick={() => handleApproval(user._id, "approved")}
                            disabled={approvalMutation.isPending}
                          >
                            {approvalMutation.isPending ? (
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                            ) : (
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            )}
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                            onClick={() => handleApproval(user._id, "rejected")}
                            disabled={approvalMutation.isPending}
                          >
                            {approvalMutation.isPending ? (
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                            ) : (
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            )}
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Current Status Display with Unlock Button */}
                          <div
                            className={cn(
                              "w-full p-2 sm:p-3 rounded-lg border transition-all duration-300",
                              user.approval_status === "approved"
                                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
                              isUnlocked &&
                                "border-2 border-orange-400 dark:border-orange-600"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className={cn(
                                  "flex items-center gap-1.5 sm:gap-2",
                                  user.approval_status === "approved"
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : "text-rose-700 dark:text-rose-300"
                                )}
                              >
                                {user.approval_status === "approved" ? (
                                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                ) : (
                                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                                <span className="text-xs sm:text-sm font-medium">
                                  Registration{" "}
                                  {user.approval_status === "approved"
                                    ? "Accepted"
                                    : "Rejected"}
                                </span>
                              </div>

                              {/* Lock/Unlock Button */}
                              {!isUnlocked ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnlock(user._id)}
                                  className="h-7 px-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                                  title="Unlock to modify status"
                                >
                                  <Lock className="h-3 w-3 mr-1 text-gray-500" />
                                  <span className="hidden sm:inline">
                                    Modify
                                  </span>
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0.5 border-orange-400 text-orange-600 dark:text-orange-400"
                                  >
                                    <Unlock className="h-3 w-3 mr-1" />
                                    Unlocked
                                  </Badge>
                                  {!showingChangeOptions && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowChangeFor(user._id)}
                                      className="h-7 px-2 text-xs"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Auto-lock timer indicator */}
                            {isUnlocked && !showingChangeOptions && (
                              <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Auto-locks in 30 seconds
                              </p>
                            )}
                          </div>

                          {/* Change Status Options - Only shows when unlocked and edit clicked */}
                          {isUnlocked && showingChangeOptions && (
                            <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 rounded-lg border-2 border-orange-300 dark:border-orange-700 space-y-3 animate-in slide-in-from-top-2">
                              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                                <Shield className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase tracking-wide">
                                  Admin Override
                                </span>
                              </div>

                              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-md border border-orange-200 dark:border-orange-800">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-medium text-orange-800 dark:text-orange-200">
                                      Critical Action Warning
                                    </p>
                                    <ul className="text-[10px] text-orange-700 dark:text-orange-300 space-y-0.5 list-disc list-inside">
                                      <li>
                                        This will override the current
                                        registration status
                                      </li>
                                      <li>
                                        The change will be permanently logged
                                      </li>
                                      <li>User will be notified immediately</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  Current:
                                </span>
                                <Badge
                                  variant={
                                    user.approval_status === "approved"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="text-[10px]"
                                >
                                  {user.approval_status === "approved"
                                    ? "Accepted"
                                    : "Rejected"}
                                </Badge>
                              </div>

                              <div className="flex gap-2">
                                {user.approval_status === "approved" ? (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      handleStatusChangeConfirmation(
                                        user._id,
                                        "rejected",
                                        user.approval_status,
                                        user.name
                                      )
                                    }
                                    disabled={approvalMutation.isPending}
                                    className="flex-1 h-9 text-xs font-medium shadow-sm"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1.5" />
                                    Override to Rejected
                                  </Button>
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() =>
                                      handleStatusChangeConfirmation(
                                        user._id,
                                        "approved",
                                        user.approval_status,
                                        user.name
                                      )
                                    }
                                    disabled={approvalMutation.isPending}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9 text-xs font-medium shadow-sm"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1.5" />
                                    Override to Accepted
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowChangeFor(null);
                                    setUnlockedCards((prev) => {
                                      const newSet = new Set(prev);
                                      newSet.delete(user._id);
                                      return newSet;
                                    });
                                  }}
                                  className="h-9 px-4 text-xs border-gray-300"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
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
                  {searchQuery || statusFilter !== "all"
                    ? "No matching registrations"
                    : "No registrations yet"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : `No ${currentRoleConfig?.label.toLowerCase()} registrations found.`}
                </p>
              </div>
              {(searchQuery || statusFilter !== "all") && (
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

      {/* Enhanced Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ ...confirmDialog, isOpen: false })
        }
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-orange-500" />
              Admin Status Override
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                    Confirming Override for:{" "}
                    <span className="font-bold">{confirmDialog.userName}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Current Status
                      </p>
                      <Badge
                        variant={
                          confirmDialog.currentStatus === "approved"
                            ? "default"
                            : "destructive"
                        }
                        className="w-full justify-center"
                      >
                        {confirmDialog.currentStatus === "approved"
                          ? "Accepted"
                          : "Rejected"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        New Status
                      </p>
                      <Badge
                        variant={
                          confirmDialog.newStatus === "approved"
                            ? "default"
                            : "destructive"
                        }
                        className="w-full justify-center animate-pulse"
                      >
                        {confirmDialog.newStatus === "approved"
                          ? "Accepted"
                          : "Rejected"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-red-700 dark:text-red-300">
                        Final Warning - Irreversible Action
                      </p>
                      <ul className="text-red-600 dark:text-red-400 space-y-0.5 list-disc list-inside">
                        <li>This action cannot be undone</li>
                        <li>All related permissions will be updated</li>
                        <li>Audit trail will record this override</li>
                        <li>User access will change immediately</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <Info className="h-4 w-4 text-gray-500" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Timestamp: {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowChangeFor(null);
                setUnlockedCards((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(confirmDialog.userId!);
                  return newSet;
                });
              }}
              className="text-sm"
            >
              Cancel Override
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={approvalMutation.isPending}
              className={cn(
                "text-sm font-medium",
                confirmDialog.newStatus === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {approvalMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Confirm Override
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Main component
export default function RegistrationApproval() {
  const [selectedRole, setSelectedRole] = useState<string>("subscriber");

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs
        value={selectedRole}
        onValueChange={setSelectedRole}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 gap-0 p-0 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          {registrationTabs.map((tab, index) => {
            const Icon = tab.icon;
            const isFirst = index === 0;
            const isLast = index === registrationTabs.length - 1;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-4",
                  "data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200",
                  isFirst && "rounded-l-xl",
                  isLast && "rounded-r-xl"
                )}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                <span className="text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
                  {tab.label}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {registrationTabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="mt-4 sm:mt-6 focus:outline-none"
          >
            <RoleRegistrations role={tab.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
