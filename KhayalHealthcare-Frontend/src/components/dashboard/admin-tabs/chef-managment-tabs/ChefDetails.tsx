import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Loader2,
  ChefHat,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Phone,
  GraduationCap,
  Award,
  Calendar,
  MapPin,
  Users,
  UserCheck,
  UserX,
  RotateCcw,
  Mail,
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Chef, FilterStatus } from "./types";

interface ChefDetailsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function ChefDetails({
  searchQuery,
  setSearchQuery,
}: ChefDetailsProps) {
  const [chefFilter, setChefFilter] = useState<FilterStatus>("all");

  const { data: chefs = [], isLoading: isLoadingChefs } = useQuery<Chef[]>({
    queryKey: [API_ENDPOINTS.ADMIN_CHEFS],
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const chefStats = useMemo(() => {
    return {
      total: chefs.length,
      active: chefs.filter((c) => c.subscriptionStatus === "active").length,
      pending: chefs.filter((c) => c.subscriptionStatus === "pending").length,
      inactive: chefs.filter((c) => c.subscriptionStatus === "inactive").length,
    };
  }, [chefs]);

  const filteredChefs = useMemo(() => {
    let filtered = chefs;
    if (chefFilter !== "all") {
      filtered = filtered.filter(
        (chef) => chef.subscriptionStatus === chefFilter
      );
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chef) =>
          chef.name?.toLowerCase().includes(query) ||
          chef.phone?.toLowerCase().includes(query) ||
          chef.email?.toLowerCase().includes(query) ||
          chef.degree?.toLowerCase().includes(query) ||
          chef.id.toString().toLowerCase().includes(query)
      );
    }
    return filtered.sort((a, b) => {
      const statusPriority = { pending: 1, active: 2, inactive: 3 };
      const priorityA =
        statusPriority[a.subscriptionStatus as keyof typeof statusPriority] ||
        99;
      const priorityB =
        statusPriority[b.subscriptionStatus as keyof typeof statusPriority] ||
        99;
      return priorityA - priorityB;
    });
  }, [chefs, chefFilter, searchQuery]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setChefFilter("all");
  }, [setSearchQuery]);

  const getStatusColor = (status: string) => {
    const colors = {
      active:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
      pending:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      inactive:
        "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800",
    };
    return (
      colors[status as keyof typeof colors] ||
      "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800"
    );
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
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  if (isLoadingChefs) {
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
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300 truncate">
                  Total Chefs
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {chefStats.total}
                </p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-orange-600 dark:text-orange-400 flex-shrink-0" />
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
                  {chefStats.active}
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
                  {chefStats.pending}
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
                  {chefStats.inactive}
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
                placeholder="Search by name, phone, email, degree, or ID..."
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
                  label: "All Chefs",
                  count: chefStats.total,
                  color: "bg-gray-500",
                },
                {
                  key: "active",
                  label: "Active",
                  count: chefStats.active,
                  color: "bg-emerald-500",
                },
                {
                  key: "pending",
                  label: "Pending",
                  count: chefStats.pending,
                  color: "bg-amber-500",
                },
                {
                  key: "inactive",
                  label: "Inactive",
                  count: chefStats.inactive,
                  color: "bg-gray-500",
                },
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={chefFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChefFilter(filter.key as FilterStatus)}
                  className="flex items-center gap-1 sm:gap-2 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs"
                >
                  <div
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${filter.color}`}
                  />
                  <span className="truncate">{filter.label}</span>
                  {filter.count > 0 && (
                    <span
                      className={`px-1 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${
                        chefFilter === filter.key
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
          Chef Details
        </h3>
        <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          {filteredChefs.length} {filteredChefs.length === 1 ? "chef" : "chefs"}{" "}
          found
        </span>
      </div>

      {/* Chef Cards */}
      {filteredChefs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredChefs.map((chef) => {
            const isPending = chef.subscriptionStatus === "pending";
            return (
              <Card
                key={chef.id}
                className={cn(
                  "relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg",
                  isPending && "ring-2 ring-amber-200 dark:ring-amber-800",
                  chef.subscriptionStatus === "inactive" && "opacity-75"
                )}
              >
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
                  <div
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(
                      chef.subscriptionStatus || "pending"
                    )}`}
                  >
                    {getStatusIcon(chef.subscriptionStatus || "pending")}
                    <span className="capitalize">
                      {chef.subscriptionStatus || "pending"}
                    </span>
                  </div>
                </div>
                {isPending && (
                  <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                )}
                <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-2 sm:gap-3 pr-16 sm:pr-24">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 flex-shrink-0">
                        <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {chef.name}
                        </CardTitle>
                        <CardDescription className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          ID: {chef._id}
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
                            {chef.phone}
                          </span>
                        </div>
                        {chef.email && (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                              {chef.email}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Award className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                            {chef.experience} years experience
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                            {chef.degree}
                          </span>
                        </div>
                        {(chef.address || chef.city) && (
                          <div className="flex items-start gap-1.5 sm:gap-2">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2">
                              {[chef.address, chef.city]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                        {typeof chef.available === "boolean" && (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {chef.available ? (
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                            )}
                            <span
                              className={`text-xs sm:text-sm ${
                                chef.available
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-red-700 dark:text-red-300"
                              }`}
                            >
                              {chef.available ? "Available" : "Not Available"}
                            </span>
                          </div>
                        )}
                        {chef.subscriptionPlan && (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                              {chef.subscriptionPlan} Plan
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">
                          Menu Items
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] sm:text-xs"
                        >
                          {chef.meals?.length || 0} items
                        </Badge>
                      </div>
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
                <ChefHat className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || chefFilter !== "all"
                    ? "No matching chefs"
                    : "No chefs found"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery || chefFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "No chefs have been registered yet."}
                </p>
              </div>
              {(searchQuery || chefFilter !== "all") && (
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
    </div>
  );
}
