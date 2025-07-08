import { useState, useMemo, useCallback, Component } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  MapPin,
  FileText,
  Search,
  Shield,
  AlertTriangle,
  Info,
  ClipboardList,
  Activity,
  CheckSquare,
  XSquare,
  Timer,
  RefreshCw,
  Heart,
  CalendarDays,
  UserCheck,
  Briefcase,
  PlayCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

// Type definitions - Updated to match API response
interface CareAssignment {
  _id: string;
  subscriber_id: string;
  caretaker_id: string;
  request_type: string;
  description: string;
  preferred_date: string | null;
  preferred_time?: string;
  status: "assigned" | "accepted" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  subscriber: {
    id: string;
    name: string;
    phone: string;
    address: string;
    city?: string;
    age?: number | null;
    previous_illness?: string | null;
  };
}

type ActionType = "accept" | "start" | "cancel" | "complete";
type FilterStatus =
  | "all"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

interface DialogState {
  isOpen: boolean;
  action: ActionType | null;
  assignmentId: string | null;
  subscriberName?: string;
}

// Helper class for date formatting
class AssignmentDateFormatter {
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

// Main MyAssignmentsTab class component
export class MyAssignmentsTab extends Component {
  render() {
    return <MyAssignmentsTabContent />;
  }
}

// Functional component that handles the actual logic
function MyAssignmentsTabContent() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    action: null,
    assignmentId: null,
  });

  // Query caretaker assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<
    CareAssignment[]
  >({
    queryKey: [API_ENDPOINTS.VISIT_REQUESTS_CARE_CARETAKER_ASSIGNMENTS],
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Calculate statistics
  const assignmentStats = useMemo(() => {
    if (!assignments || assignments.length === 0) {
      return {
        total: 0,
        assigned: 0,
        accepted: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };
    }
    return assignments.reduce(
      (acc, assignment) => {
        acc.total++;
        if (assignment.status === "assigned") acc.assigned++;
        else if (assignment.status === "accepted") acc.accepted++;
        else if (assignment.status === "in_progress") acc.in_progress++;
        else if (assignment.status === "completed") acc.completed++;
        else if (assignment.status === "cancelled") acc.cancelled++;
        return acc;
      },
      {
        total: 0,
        assigned: 0,
        accepted: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      }
    );
  }, [assignments]);

  // Filter assignments based on status and search
  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];

    let filtered = assignments;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (assignment) => assignment.status === statusFilter
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((assignment) => {
        const name = assignment.subscriber.name?.toLowerCase() || "";
        const phone = assignment.subscriber.phone?.toLowerCase() || "";
        const address = assignment.subscriber.address?.toLowerCase() || "";
        const city = assignment.subscriber.city?.toLowerCase() || "";
        const description = assignment.description?.toLowerCase() || "";
        const assignmentId = assignment._id.toLowerCase();

        return (
          name.includes(query) ||
          phone.includes(query) ||
          address.includes(query) ||
          city.includes(query) ||
          description.includes(query) ||
          assignmentId.includes(query)
        );
      });
    }

    // Sort by status priority
    return filtered.sort((a, b) => {
      const statusPriority = {
        assigned: 1,
        accepted: 2,
        in_progress: 3,
        completed: 4,
        cancelled: 5,
      };
      const priorityA = statusPriority[a.status] || 99;
      const priorityB = statusPriority[b.status] || 99;
      return priorityA - priorityB;
    });
  }, [assignments, statusFilter, searchQuery]);

  // Mutation for updating assignment status
  const updateAssignmentStatusMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      status,
    }: {
      assignmentId: string;
      status: "accepted" | "in_progress" | "completed" | "cancelled";
    }) => {
      const res = await apiRequest(
        "PATCH",
        API_ENDPOINTS.VISIT_REQUESTS_CARE_CARETAKER_STATUS(assignmentId),
        { status }
      );
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.VISIT_REQUESTS_CARE_CARETAKER_ASSIGNMENTS],
      });

      const actionText =
        variables.status === "accepted"
          ? "accepted"
          : variables.status === "in_progress"
          ? "started"
          : variables.status === "cancelled"
          ? "cancelled"
          : "completed";
      toast({
        title: "Success",
        description: `Assignment ${actionText} successfully`,
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      console.error("Assignment status update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment status",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  const handleAction = useCallback(
    (action: ActionType, assignmentId: string, subscriberName: string) => {
      setDialogState({
        isOpen: true,
        action,
        assignmentId,
        subscriberName,
      });
    },
    []
  );

  const confirmAction = useCallback(() => {
    if (!dialogState.action || !dialogState.assignmentId) return;

    const statusMap: Record<
      ActionType,
      "accepted" | "in_progress" | "completed" | "cancelled"
    > = {
      accept: "accepted",
      start: "in_progress",
      cancel: "cancelled",
      complete: "completed",
    };

    updateAssignmentStatusMutation.mutate({
      assignmentId: dialogState.assignmentId,
      status: statusMap[dialogState.action],
    });

    setDialogState({ isOpen: false, action: null, assignmentId: null });
  }, [dialogState, updateAssignmentStatusMutation]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      assigned:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      accepted:
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
      case "assigned":
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "accepted":
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
      label: "All Assignments",
      count: assignmentStats.total,
      color: "bg-gray-500",
    },
    {
      key: "assigned",
      label: "Assigned",
      count: assignmentStats.assigned,
      color: "bg-amber-500",
    },
    {
      key: "accepted",
      label: "Accepted",
      count: assignmentStats.accepted,
      color: "bg-purple-500",
    },
    {
      key: "in_progress",
      label: "In Progress",
      count: assignmentStats.in_progress,
      color: "bg-blue-500",
    },
    {
      key: "completed",
      label: "Completed",
      count: assignmentStats.completed,
      color: "bg-emerald-500",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: assignmentStats.cancelled,
      color: "bg-rose-500",
    },
  ];

  if (assignmentsLoading) {
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
                  {assignmentStats.total}
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
                  Assigned
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {assignmentStats.assigned}
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
                  Accepted
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {assignmentStats.accepted}
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
                  {assignmentStats.in_progress}
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
                  {assignmentStats.completed}
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
                  {assignmentStats.cancelled}
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
                placeholder="Search by name, phone, address, or description..."
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
            ? "All Care Visit Assignments"
            : `${
                statusFilter.charAt(0).toUpperCase() +
                statusFilter.slice(1).replace("_", " ")
              } Assignments`}
        </h3>
        <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          {filteredAssignments.length}{" "}
          {filteredAssignments.length === 1 ? "assignment" : "assignments"}{" "}
          found
        </span>
      </div>

      {/* Assignment Cards Grid */}
      {filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredAssignments.map((assignment) => {
            const isAssigned = assignment.status === "assigned";
            const isAccepted = assignment.status === "accepted";
            const isInProgress = assignment.status === "in_progress";

            return (
              <Card
                key={assignment._id}
                className={cn(
                  "relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg",
                  isAssigned && "ring-2 ring-amber-200 dark:ring-amber-800",
                  isAccepted && "ring-2 ring-purple-200 dark:ring-purple-800",
                  isInProgress && "ring-2 ring-blue-200 dark:ring-blue-800"
                )}
              >
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
                  <div
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(
                      assignment.status
                    )}`}
                  >
                    {getStatusIcon(assignment.status)}
                    <span className="capitalize">
                      {assignment.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {isAssigned && (
                  <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                )}
                {isAccepted && (
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
                        <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {assignment.subscriber.name}
                        </CardTitle>
                        <CardDescription className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          Assignment ID: {assignment._id}
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
                            {assignment.subscriber.phone}
                          </span>
                        </div>

                        <div className="flex items-start gap-1.5 sm:gap-2">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2">
                            {[
                              assignment.subscriber.address,
                              assignment.subscriber.city,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>

                        <div className="flex items-start gap-1.5 sm:gap-2">
                          <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-3">
                            {assignment.description}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                              {AssignmentDateFormatter.formatDate(
                                assignment.preferred_date,
                                "MMM dd, yyyy"
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                              {assignment.preferred_time ||
                                AssignmentDateFormatter.formatTime(
                                  assignment.preferred_date
                                )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      {assignment.status === "assigned" && (
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 sm:h-9 text-xs sm:text-sm"
                            onClick={() =>
                              handleAction(
                                "accept",
                                assignment._id,
                                assignment.subscriber.name
                              )
                            }
                            disabled={updateAssignmentStatusMutation.isPending}
                          >
                            {updateAssignmentStatusMutation.isPending ? (
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
                            onClick={() =>
                              handleAction(
                                "cancel",
                                assignment._id,
                                assignment.subscriber.name
                              )
                            }
                            disabled={updateAssignmentStatusMutation.isPending}
                          >
                            {updateAssignmentStatusMutation.isPending ? (
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                            ) : (
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            )}
                            Cancel
                          </Button>
                        </div>
                      )}

                      {assignment.status === "accepted" && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white h-8 sm:h-9 text-xs sm:text-sm"
                          onClick={() =>
                            handleAction(
                              "start",
                              assignment._id,
                              assignment.subscriber.name
                            )
                          }
                          disabled={updateAssignmentStatusMutation.isPending}
                        >
                          {updateAssignmentStatusMutation.isPending ? (
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                          ) : (
                            <PlayCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          )}
                          Start Visit
                        </Button>
                      )}

                      {assignment.status === "in_progress" && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-8 sm:h-9 text-xs sm:text-sm"
                          onClick={() =>
                            handleAction(
                              "complete",
                              assignment._id,
                              assignment.subscriber.name
                            )
                          }
                          disabled={updateAssignmentStatusMutation.isPending}
                        >
                          {updateAssignmentStatusMutation.isPending ? (
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                          ) : (
                            <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          )}
                          Mark as Complete
                        </Button>
                      )}

                      {assignment.status === "completed" && (
                        <div className="w-full p-2 sm:p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm font-medium">
                              Visit Completed
                            </span>
                          </div>
                        </div>
                      )}

                      {assignment.status === "cancelled" && (
                        <div className="w-full p-2 sm:p-3 rounded-lg border bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-rose-700 dark:text-rose-300">
                            <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm font-medium">
                              Assignment Cancelled
                            </span>
                          </div>
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
                <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || statusFilter !== "all"
                    ? "No matching assignments"
                    : "No assignments yet"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "You haven't received any care visit assignments yet."}
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

      {/* Enhanced Confirmation Dialog */}
      <AlertDialog
        open={dialogState.isOpen}
        onOpenChange={(open) =>
          !open && setDialogState({ ...dialogState, isOpen: false })
        }
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Confirm Assignment Action
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Care Visit Assignment for:{" "}
                    <span className="font-bold">
                      {dialogState.subscriberName}
                    </span>
                  </p>

                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-blue-700 dark:text-blue-300">
                      You are about to{" "}
                      <span className="font-semibold">
                        {dialogState.action === "accept" &&
                          "accept this assignment"}
                        {dialogState.action === "start" &&
                          "start this care visit"}
                        {dialogState.action === "cancel" &&
                          "cancel this assignment"}
                        {dialogState.action === "complete" &&
                          "mark this visit as completed"}
                      </span>
                    </span>
                  </div>
                </div>

                {dialogState.action === "accept" && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                          By accepting this assignment:
                        </p>
                        <ul className="text-emerald-600 dark:text-emerald-400 space-y-0.5 list-disc list-inside">
                          <li>You confirm your availability</li>
                          <li>The subscriber will be notified</li>
                          <li>You can start the visit when ready</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {dialogState.action === "start" && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex gap-2">
                      <PlayCircle className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-purple-700 dark:text-purple-300">
                          Starting the care visit:
                        </p>
                        <ul className="text-purple-600 dark:text-purple-400 space-y-0.5 list-disc list-inside">
                          <li>You are beginning the visit now</li>
                          <li>Status will change to "In Progress"</li>
                          <li>Remember to mark complete when done</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {dialogState.action === "cancel" && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-red-700 dark:text-red-300">
                          Warning - Assignment Cancellation
                        </p>
                        <ul className="text-red-600 dark:text-red-400 space-y-0.5 list-disc list-inside">
                          <li>This assignment will be reassigned</li>
                          <li>The action cannot be undone</li>
                          <li>Your cancellation will be recorded</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {dialogState.action === "complete" && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex gap-2">
                      <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-blue-700 dark:text-blue-300">
                          Marking Visit as Complete:
                        </p>
                        <ul className="text-blue-600 dark:text-blue-400 space-y-0.5 list-disc list-inside">
                          <li>Confirms the care visit was conducted</li>
                          <li>Updates your completed visits count</li>
                          <li>Notifies the subscriber</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <Info className="h-4 w-4 text-gray-500" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Action timestamp: {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={updateAssignmentStatusMutation.isPending}
              className={cn(
                "text-sm font-medium",
                dialogState.action === "accept" &&
                  "bg-emerald-600 hover:bg-emerald-700",
                dialogState.action === "start" &&
                  "bg-purple-600 hover:bg-purple-700",
                dialogState.action === "cancel" &&
                  "bg-red-600 hover:bg-red-700",
                dialogState.action === "complete" &&
                  "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {updateAssignmentStatusMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {dialogState.action === "accept" && (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {dialogState.action === "start" && (
                    <PlayCircle className="h-4 w-4 mr-2" />
                  )}
                  {dialogState.action === "cancel" && (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  {dialogState.action === "complete" && (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  )}
                  Confirm{" "}
                  {dialogState.action === "accept"
                    ? "Accept"
                    : dialogState.action === "start"
                    ? "Start"
                    : dialogState.action === "complete"
                    ? "Completion"
                    : "Cancellation"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
