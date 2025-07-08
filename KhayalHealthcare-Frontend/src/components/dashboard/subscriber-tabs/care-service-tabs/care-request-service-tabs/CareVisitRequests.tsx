import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Search,
  ClipboardList,
  Activity,
  CheckSquare,
  Timer,
  RefreshCw,
  Heart,
  CalendarDays,
  UserCheck,
  Briefcase,
  User,
  XSquare,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

// Type definitions
type VisitRequest = {
  _id: string;
  subscriber_id: string;
  caretaker_id: string | null;
  request_type: "self" | "caretaker";
  description: string;
  preferred_date: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  caretaker?: { name: string };
};

type FilterStatus =
  | "all"
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

// Helper class for date formatting
class RequestDateFormatter {
  static formatDate(
    dateString: string | null | undefined,
    formatString: string
  ): string {
    if (!dateString) {
      return "Not specified";
    }

    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, formatString);
      }

      const dateFromConstructor = new Date(dateString);
      if (
        isValid(dateFromConstructor) &&
        !isNaN(dateFromConstructor.getTime())
      ) {
        return format(dateFromConstructor, formatString);
      }

      return "Invalid date";
    } catch (error) {
      console.error("Date formatting error:", error, "for date:", dateString);
      return "Invalid date";
    }
  }

  static formatTime(dateString: string | null | undefined): string {
    if (!dateString) {
      return "Not specified";
    }

    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, "h:mm a");
      }

      const dateFromConstructor = new Date(dateString);
      if (
        isValid(dateFromConstructor) &&
        !isNaN(dateFromConstructor.getTime())
      ) {
        return format(dateFromConstructor, "h:mm a");
      }

      return "Invalid time";
    } catch (error) {
      console.error("Time formatting error:", error, "for date:", dateString);
      return "Invalid time";
    }
  }
}

export class CareVisitRequestsService {
  private user: any;

  constructor(user: any) {
    this.user = user;
  }

  Component = () => {
    const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Query care visit requests
    const { data: careVisitRequests = [], isLoading: requestsLoading } =
      useQuery<VisitRequest[]>({
        queryKey: [
          API_ENDPOINTS.VISIT_REQUESTS_CARE_SUBSCRIBER(this.user!._id),
        ],
        queryFn: getQueryFn({ on401: "returnNull" }),
        select: (data) => {
          if (!data || !Array.isArray(data)) return [];
          return data.filter(
            (request) => request && typeof request === "object"
          );
        },
        staleTime: 30000,
        gcTime: 300000,
        refetchOnWindowFocus: false,
      });

    // Calculate statistics
    const requestStats = useMemo(() => {
      if (!careVisitRequests || careVisitRequests.length === 0) {
        return {
          total: 0,
          pending: 0,
          assigned: 0,
          in_progress: 0,
          completed: 0,
          cancelled: 0,
        };
      }
      return careVisitRequests.reduce(
        (acc, request) => {
          acc.total++;
          if (request.status === "pending") acc.pending++;
          else if (request.status === "assigned") acc.assigned++;
          else if (request.status === "in_progress") acc.in_progress++;
          else if (request.status === "completed") acc.completed++;
          else if (request.status === "cancelled") acc.cancelled++;
          return acc;
        },
        {
          total: 0,
          pending: 0,
          assigned: 0,
          in_progress: 0,
          completed: 0,
          cancelled: 0,
        }
      );
    }, [careVisitRequests]);

    // Filter requests based on status and search
    const filteredRequests = useMemo(() => {
      if (!careVisitRequests) return [];

      let filtered = careVisitRequests;

      // Filter by status
      if (statusFilter !== "all") {
        filtered = filtered.filter(
          (request) => request.status === statusFilter
        );
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((request) => {
          const caretakerName = request.caretaker?.name?.toLowerCase() || "";
          const description = request.description?.toLowerCase() || "";
          const requestId = request._id.toLowerCase();
          const requestType = request.request_type?.toLowerCase() || "";

          return (
            caretakerName.includes(query) ||
            description.includes(query) ||
            requestId.includes(query) ||
            requestType.includes(query)
          );
        });
      }

      // Sort by status priority and date
      return filtered.sort((a, b) => {
        const statusPriority = {
          pending: 1,
          assigned: 2,
          in_progress: 3,
          completed: 4,
          cancelled: 5,
        };
        const priorityA = statusPriority[a.status] || 99;
        const priorityB = statusPriority[b.status] || 99;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Sort by date if same priority
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    }, [careVisitRequests, statusFilter, searchQuery]);

    const clearFilters = useCallback(() => {
      setSearchQuery("");
      setStatusFilter("all");
    }, []);

    const getStatusColor = (status: string) => {
      const colors = {
        pending:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
        assigned:
          "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
        in_progress:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
        completed:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
        cancelled:
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
        case "assigned":
          return <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />;
        case "in_progress":
          return <Activity className="h-3 w-3 sm:h-4 sm:w-4" />;
        case "completed":
          return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
        case "cancelled":
          return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
        default:
          return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      }
    };

    const filterButtons = [
      {
        key: "all",
        label: "All Requests",
        count: requestStats.total,
        color: "bg-gray-500",
      },
      {
        key: "pending",
        label: "Pending",
        count: requestStats.pending,
        color: "bg-amber-500",
      },
      {
        key: "assigned",
        label: "Assigned",
        count: requestStats.assigned,
        color: "bg-purple-500",
      },
      {
        key: "in_progress",
        label: "In Progress",
        count: requestStats.in_progress,
        color: "bg-blue-500",
      },
      {
        key: "completed",
        label: "Completed",
        count: requestStats.completed,
        color: "bg-emerald-500",
      },
      {
        key: "cancelled",
        label: "Cancelled",
        count: requestStats.cancelled,
        color: "bg-rose-500",
      },
    ];

    if (requestsLoading) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/20 border-pink-200 dark:border-pink-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-pink-700 dark:text-pink-300 truncate">
                    Total
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-pink-900 dark:text-pink-100">
                    {requestStats.total}
                  </p>
                </div>
                <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-pink-600 dark:text-pink-400 flex-shrink-0" />
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
                    {requestStats.pending}
                  </p>
                </div>
                <Timer className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 truncate">
                    Assigned
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {requestStats.assigned}
                  </p>
                </div>
                <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                    In Progress
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {requestStats.in_progress}
                  </p>
                </div>
                <Activity className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                    Completed
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                    {requestStats.completed}
                  </p>
                </div>
                <CheckSquare className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20 border-rose-200 dark:border-rose-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-rose-700 dark:text-rose-300 truncate">
                    Cancelled
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-rose-900 dark:text-rose-100">
                    {requestStats.cancelled}
                  </p>
                </div>
                <XSquare className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-rose-600 dark:text-rose-400 flex-shrink-0" />
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
                  placeholder="Search by caretaker name, description, or request ID..."
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
                    variant={
                      statusFilter === filter.key ? "default" : "outline"
                    }
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
              ? "All Care Visit Requests"
              : `${
                  statusFilter.charAt(0).toUpperCase() +
                  statusFilter.slice(1).replace("_", " ")
                } Requests`}
          </h3>
          <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
            {filteredRequests.length}{" "}
            {filteredRequests.length === 1 ? "request" : "requests"} found
          </span>
        </div>

        {/* Request Cards Grid */}
        {filteredRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {filteredRequests.map((request) => {
              const isPending = request.status === "pending";
              const isAssigned = request.status === "assigned";
              const isInProgress = request.status === "in_progress";

              return (
                <Card
                  key={request._id}
                  className={cn(
                    "relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg",
                    isPending && "ring-2 ring-amber-200 dark:ring-amber-800",
                    isAssigned && "ring-2 ring-purple-200 dark:ring-purple-800",
                    isInProgress && "ring-2 ring-blue-200 dark:ring-blue-800"
                  )}
                >
                  <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
                    <div
                      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {getStatusIcon(request.status)}
                      <span className="capitalize">
                        {request.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {isPending && (
                    <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                  )}
                  {isAssigned && (
                    <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-purple-400 to-pink-500" />
                  )}
                  {isInProgress && (
                    <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                  )}

                  <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4">
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3 pr-16 sm:pr-24">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/20 flex-shrink-0">
                          <Heart className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                            Care Visit Request
                          </CardTitle>
                          <CardDescription className="text-[10px] sm:text-xs text-muted-foreground">
                            Request ID: {request._id}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="space-y-1.5 sm:space-y-2">
                          {request.caretaker?.name && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                              <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                                Caretaker: {request.caretaker.name}
                              </span>
                            </div>
                          )}

                          <div className="flex items-start gap-1.5 sm:gap-2">
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                              {request.description || "No description provided"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                              <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                                {RequestDateFormatter.formatDate(
                                  request.preferred_date,
                                  "MMM dd, yyyy"
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                              <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                                {RequestDateFormatter.formatTime(
                                  request.preferred_date
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        {request.status === "pending" && (
                          <div className="w-full p-2 sm:p-3 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-amber-700 dark:text-amber-300">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs sm:text-sm font-medium">
                                Awaiting Caretaker Assignment
                              </span>
                            </div>
                          </div>
                        )}

                        {request.status === "assigned" && (
                          <div className="w-full p-2 sm:p-3 rounded-lg border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-purple-700 dark:text-purple-300">
                              <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs sm:text-sm font-medium">
                                Caretaker Assigned
                              </span>
                            </div>
                          </div>
                        )}

                        {request.status === "in_progress" && (
                          <div className="w-full p-2 sm:p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-blue-700 dark:text-blue-300">
                              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs sm:text-sm font-medium">
                                Visit In Progress
                              </span>
                            </div>
                          </div>
                        )}

                        {request.status === "completed" && (
                          <div className="w-full p-2 sm:p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs sm:text-sm font-medium">
                                Visit Completed
                              </span>
                            </div>
                          </div>
                        )}

                        {request.status === "cancelled" && (
                          <div className="w-full p-2 sm:p-3 rounded-lg border bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-rose-700 dark:text-rose-300">
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs sm:text-sm font-medium">
                                Request Cancelled
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <span>
                          Requested:{" "}
                          {RequestDateFormatter.formatDate(
                            request.created_at,
                            "PPp"
                          )}
                        </span>
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
                  <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {searchQuery || statusFilter !== "all"
                      ? "No matching requests"
                      : "No care visit requests yet"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "You haven't submitted any care visit requests yet."}
                  </p>
                </div>
                {(searchQuery || statusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  >
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };
}
