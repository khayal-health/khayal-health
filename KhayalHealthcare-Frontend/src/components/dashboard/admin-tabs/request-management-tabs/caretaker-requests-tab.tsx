import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Phone,
  User,
  UserCheck,
  RotateCcw,
  HeartHandshake,
  AlertCircle,
  CalendarCheck,
  UserPlus,
  FileText,
  Mail,
  MapPin,
  Award,
  ClockIcon,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { User as BaseUser } from "@/types/schema";

// Interfaces
interface AdminUser extends BaseUser {
  id: number;
  approvalStatus: string;
  name: string;
  phone: string;
  experience?: number;
  subscriptionStatus?: string;
}

interface Caretaker extends AdminUser {
  experience: number;
}

interface RawCareRequest {
  _id: string;
  subscriber_id: string;
  caretaker_id?: string | null;
  request_type: string;
  description?: string;
  preferred_date: string;
  appointment_date_time?: string | null;
  status: string;
  created_at: string;
  subscriber?: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  caretaker?: {
    _id: string;
    name: string;
    phone: string;
    experience: number;
  } | null;
}

interface CareRequest {
  id: string;
  subscriberId: string;
  requestedDate: string;
  status: string;
  caretakerId?: string;
  notes?: string;
  appointmentDateTime?: string;
  subscriber?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  caretaker?: {
    name: string;
    phone: string;
    experience: number;
  };
}

type FilterStatus =
  | "all"
  | "pending"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

interface CaretakerRequestsTabProps {
  isActive: boolean;
}

// Transform function
const transformCareRequest = (raw: RawCareRequest): CareRequest => ({
  id: raw._id,
  subscriberId: raw.subscriber_id,
  requestedDate: raw.preferred_date,
  status: raw.status,
  caretakerId: raw.caretaker_id || undefined,
  notes: raw.description,
  appointmentDateTime: raw.appointment_date_time || undefined,
  subscriber: raw.subscriber
    ? {
        name: raw.subscriber.name,
        phone: raw.subscriber.phone,
        email: raw.subscriber.email,
        address: raw.subscriber.address,
      }
    : undefined,
  caretaker: raw.caretaker
    ? {
        name: raw.caretaker.name,
        phone: raw.caretaker.phone,
        experience: raw.caretaker.experience,
      }
    : undefined,
});

export default function CaretakerRequestsTab({
  isActive,
}: CaretakerRequestsTabProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );
  const [selectedCaretaker, setSelectedCaretaker] = useState<string>("");
  const [appointmentDateTime, setAppointmentDateTime] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Queries
  const { data: rawCareRequests = [], isLoading: isLoadingRequests } = useQuery<
    RawCareRequest[]
  >({
    queryKey: [API_ENDPOINTS.VISIT_REQUESTS_CARE],
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    enabled: isActive,
  });

  const { data: availableCaretakers = [], isLoading: isLoadingCaretakers } =
    useQuery<Caretaker[]>({
      queryKey: [API_ENDPOINTS.VISIT_REQUESTS_CARETAKERS],
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      enabled: isActive,
    });

  // Transform the raw API data
  const careRequests = useMemo(
    () => rawCareRequests.map(transformCareRequest),
    [rawCareRequests]
  );

  // Assignment mutation
  const assignCaretakerMutation = useMutation({
    mutationFn: async ({
      requestId,
      caretakerId,
      appointmentDateTime,
    }: {
      requestId: string;
      caretakerId: string;
      appointmentDateTime: string;
    }) => {
      return apiRequest(
        "PATCH",
        API_ENDPOINTS.VISIT_REQUESTS_CARE_ASSIGN(requestId),
        {
          caretaker_id: caretakerId,
          appointment_date_time: new Date(appointmentDateTime).toISOString(),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.VISIT_REQUESTS_CARE],
      });
      toast({
        title: "Success",
        description: "Caretaker assigned successfully",
        duration: 3000,
      });
      resetAssignmentState();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign caretaker",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  // Helper functions
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "Date not available";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return format(date, "PPP");
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending:
        "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
      assigned:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
      accepted:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      in_progress:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
      completed:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
      cancelled:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    };
    return (
      colors[status as keyof typeof colors] ||
      "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800"
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "assigned":
        return <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "accepted":
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "in_progress":
        return <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "completed":
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "cancelled":
        return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Pending",
      assigned: "Assigned",
      accepted: "Accepted",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const resetAssignmentState = useCallback(() => {
    setSelectedRequestId(null);
    setSelectedCaretaker("");
    setAppointmentDateTime("");
  }, []);

  const handleAssignCaretaker = useCallback(() => {
    if (selectedRequestId && selectedCaretaker && appointmentDateTime) {
      assignCaretakerMutation.mutate({
        requestId: selectedRequestId,
        caretakerId: selectedCaretaker,
        appointmentDateTime,
      });
    }
  }, [
    selectedRequestId,
    selectedCaretaker,
    appointmentDateTime,
    assignCaretakerMutation,
  ]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterStatus("all");
  }, []);

  const canAssignCaretaker = (status: string) => {
    return ["pending", "cancelled", "assigned"].includes(status);
  };

  // Get appropriate button text based on status [[1]]
  const getAssignButtonText = (status: string) => {
    if (status === "pending") {
      return "Assign Caretaker & Schedule";
    } else if (status === "cancelled") {
      return "Reassign Caretaker & Reschedule";
    } else {
      return "Reassign Caretaker";
    }
  };

  // Get appropriate dialog title based on status [[1]]
  const getDialogTitle = (status: string) => {
    if (status === "pending") {
      return "Assign Caretaker & Schedule Appointment";
    } else if (status === "cancelled") {
      return "Reassign Caretaker & Reschedule Appointment";
    } else {
      return "Reassign Caretaker";
    }
  };

  // Calculate stats
  const requestStats = useMemo(() => {
    return {
      total: careRequests.length,
      pending: careRequests.filter((r) => r.status === "pending").length,
      accepted: careRequests.filter((r) => r.status === "accepted").length,
      assigned: careRequests.filter((r) => r.status === "assigned").length,
      in_progress: careRequests.filter((r) => r.status === "in_progress")
        .length,
      completed: careRequests.filter((r) => r.status === "completed").length,
      cancelled: careRequests.filter((r) => r.status === "cancelled").length,
    };
  }, [careRequests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    let filtered = careRequests;

    if (filterStatus !== "all") {
      filtered = filtered.filter((request) => request.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((request) => {
        const hasSubscriberMatch =
          request.subscriber?.name?.toLowerCase().includes(query) ||
          request.subscriber?.phone?.toLowerCase().includes(query);
        const hasCaretakerMatch = request.caretaker?.name
          ?.toLowerCase()
          .includes(query);
        return (
          hasSubscriberMatch ||
          hasCaretakerMatch ||
          request.notes?.toLowerCase().includes(query) ||
          request.id.toString().includes(query)
        );
      });
    }

    return filtered.sort((a, b) => {
      const statusPriority = {
        pending: 1,
        assigned: 2,
        accepted: 3,
        in_progress: 4,
        completed: 5,
        cancelled: 6,
      };
      const priorityA =
        statusPriority[a.status as keyof typeof statusPriority] || 99;
      const priorityB =
        statusPriority[b.status as keyof typeof statusPriority] || 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return (
        new Date(b.requestedDate).getTime() -
        new Date(a.requestedDate).getTime()
      );
    });
  }, [careRequests, filterStatus, searchQuery]);

  // Statistics cards data
  const statisticsCards = [
    {
      key: "total-requests",
      title: "Total Requests",
      value: requestStats.total,
      icon: HeartHandshake,
      gradient:
        "from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20",
      border: "border-purple-200 dark:border-purple-700",
      textColor: "text-purple-700 dark:text-purple-300",
      valueColor: "text-purple-900 dark:text-purple-100",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      key: "pending-requests",
      title: "Pending",
      value: requestStats.pending,
      icon: ClockIcon,
      gradient:
        "from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20",
      border: "border-orange-200 dark:border-orange-700",
      textColor: "text-orange-700 dark:text-orange-300",
      valueColor: "text-orange-900 dark:text-orange-100",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      key: "assigned-requests",
      title: "Assigned",
      value: requestStats.assigned,
      icon: UserPlus,
      gradient:
        "from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20",
      border: "border-purple-200 dark:border-purple-700",
      textColor: "text-purple-700 dark:text-purple-300",
      valueColor: "text-purple-900 dark:text-purple-100",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      key: "accepted-requests",
      title: "Accepted",
      value: requestStats.accepted,
      icon: Clock,
      gradient:
        "from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20",
      border: "border-amber-200 dark:border-amber-700",
      textColor: "text-amber-700 dark:text-amber-300",
      valueColor: "text-amber-900 dark:text-amber-100",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "in-progress-requests",
      title: "In Progress",
      value: requestStats.in_progress,
      icon: UserCheck,
      gradient:
        "from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20",
      border: "border-blue-200 dark:border-blue-700",
      textColor: "text-blue-700 dark:text-blue-300",
      valueColor: "text-blue-900 dark:text-blue-100",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "completed-requests",
      title: "Completed",
      value: requestStats.completed,
      icon: CheckCircle,
      gradient:
        "from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20",
      border: "border-emerald-200 dark:border-emerald-700",
      textColor: "text-emerald-700 dark:text-emerald-300",
      valueColor: "text-emerald-900 dark:text-emerald-100",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "cancelled-requests",
      title: "Cancelled",
      value: requestStats.cancelled,
      icon: XCircle,
      gradient:
        "from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20",
      border: "border-red-200 dark:border-red-700",
      textColor: "text-red-700 dark:text-red-300",
      valueColor: "text-red-900 dark:text-red-100",
      iconColor: "text-red-600 dark:text-red-400",
    },
  ];

  const renderRequestCard = (request: CareRequest, index: number) => {
    const isPending = request.status === "pending";
    const isAccepted = request.status === "accepted";
    const requestKey = request.id
      ? `request-${request.id}`
      : `request-${index}`;

    return (
      <Card
        key={requestKey}
        className={cn(
          "relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg",
          isPending && "ring-2 ring-orange-200 dark:ring-orange-800",
          isAccepted && "ring-2 ring-amber-200 dark:ring-amber-800",
          request.status === "cancelled" && "opacity-75"
        )}
      >
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
          <div
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(
              request.status
            )}`}
          >
            {getStatusIcon(request.status)}
            <span>{getStatusLabel(request.status)}</span>
          </div>
        </div>
        {isPending && (
          <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-orange-400 to-red-500" />
        )}
        {isAccepted && (
          <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
        )}
        <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-start gap-2 sm:gap-3 pr-20 sm:pr-32">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 flex-shrink-0">
                <HeartHandshake className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  Request
                </CardTitle>
                <div className="mt-0.5">
                  <code className="inline-block text-[9px] sm:text-[10px] md:text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 sm:px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 break-words">
                    #{request.id}
                  </code>
                </div>
                <CardDescription className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {formatDate(request.requestedDate)}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium text-xs sm:text-sm mb-1.5 text-gray-900 dark:text-white">
                Subscriber Details
              </p>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                    {request.subscriber?.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                    {request.subscriber?.phone}
                  </span>
                </div>
                {request.subscriber?.email && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                      {request.subscriber.email}
                    </span>
                  </div>
                )}
                {request.subscriber?.address && (
                  <div className="flex items-start gap-1.5 sm:gap-2">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2">
                      {request.subscriber.address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {request.caretaker && (
              <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="font-medium text-xs sm:text-sm mb-1.5 text-gray-900 dark:text-white">
                  Assigned Caretaker
                </p>
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                      {request.caretaker.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                      {request.caretaker.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                      {request.caretaker.experience} years experience
                    </span>
                  </div>
                </div>
              </div>
            )}

            {request.appointmentDateTime && (
              <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="font-medium text-xs sm:text-sm mb-1.5 text-gray-900 dark:text-white">
                  Appointment Scheduled
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CalendarCheck className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                    {formatDate(request.appointmentDateTime)}
                  </span>
                </div>
              </div>
            )}

            {request.notes && (
              <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="font-medium text-xs sm:text-sm mb-1.5 text-gray-900 dark:text-white">
                  Request Notes
                </p>
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "text-xs sm:text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words block",
                        !expandedNotes.has(request.id) && "line-clamp-2"
                      )}
                    >
                      {request.notes}
                    </span>
                    {request.notes.length > 100 && (
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedNotes);
                          if (expandedNotes.has(request.id)) {
                            newExpanded.delete(request.id);
                          } else {
                            newExpanded.add(request.id);
                          }
                          setExpandedNotes(newExpanded);
                        }}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1"
                      >
                        {expandedNotes.has(request.id)
                          ? "Show less"
                          : "Show more"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {canAssignCaretaker(request.status) && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    className={cn(
                      "w-full h-8 sm:h-9 text-xs sm:text-sm",
                      request.status === "pending" &&
                        "bg-orange-600 hover:bg-orange-700",
                      request.status === "cancelled" &&
                        "bg-red-600 hover:bg-red-700",
                      (request.status === "accepted" ||
                        request.status === "in_progress" ||
                        request.status === "assigned") &&
                        "bg-blue-600 hover:bg-blue-700"
                    )}
                    onClick={() => setSelectedRequestId(request.id)}
                  >
                    {request.status === "pending" && (
                      <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    )}
                    {request.status !== "pending" && (
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    )}
                    {getAssignButtonText(request.status)}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">
                      {getDialogTitle(request.status)}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                      {request.status === "pending"
                        ? "Select a caretaker and schedule appointment time for request"
                        : request.status === "cancelled"
                        ? "Reassign a caretaker and reschedule the cancelled request"
                        : "Change the assigned caretaker for this request"}
                      <div className="mt-2">
                        <code className="inline-block text-[9px] sm:text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400 break-words max-w-full">
                          #{request.id}
                        </code>
                      </div>
                      {request.caretaker && (
                        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs">
                          <span className="text-amber-700 dark:text-amber-300">
                            Currently assigned to: {request.caretaker.name}
                          </span>
                        </div>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium">
                        Select Caretaker
                      </label>
                      {isLoadingCaretakers ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : availableCaretakers.length === 0 ? (
                        <div className="text-center py-8 space-y-2">
                          <UserCheck className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground">
                            No approved caretakers available
                          </p>
                        </div>
                      ) : (
                        <Select
                          value={selectedCaretaker}
                          onValueChange={setSelectedCaretaker}
                        >
                          <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                            <SelectValue placeholder="Choose a caretaker" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCaretakers.map((caretaker) => (
                              <SelectItem
                                key={caretaker.id}
                                value={caretaker.id.toString()}
                                className="py-2 sm:py-3"
                              >
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-sm">
                                    {caretaker.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {caretaker.experience} years experience •{" "}
                                    {caretaker.phone}
                                    {caretaker.subscriptionStatus ===
                                      "active" && (
                                      <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                                        • Active
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium">
                        Schedule Appointment Date & Time
                      </label>
                      <div className="relative">
                        <CalendarCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="datetime-local"
                          value={appointmentDateTime}
                          onChange={(e) =>
                            setAppointmentDateTime(e.target.value)
                          }
                          min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                          className="pl-10 h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select the date and time for the caretaker appointment
                      </p>
                    </div>
                    <Button
                      className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                      onClick={handleAssignCaretaker}
                      disabled={
                        assignCaretakerMutation.isPending ||
                        !selectedCaretaker ||
                        !appointmentDateTime
                      }
                    >
                      {assignCaretakerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {request.status === "pending"
                            ? "Assigning & Scheduling..."
                            : "Reassigning..."}
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          {request.status === "pending"
                            ? "Assign & Schedule Appointment"
                            : "Reassign Caretaker"}
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoadingRequests) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
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
                placeholder="Search by subscriber name, phone, caretaker, notes, or ID..."
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
                  label: "All Requests",
                  count: requestStats.total,
                  color: "bg-gray-500",
                },
                {
                  key: "pending",
                  label: "Pending",
                  count: requestStats.pending,
                  color: "bg-orange-500",
                },
                {
                  key: "assigned",
                  label: "Assigned",
                  count: requestStats.assigned,
                  color: "bg-purple-500",
                },
                {
                  key: "accepted",
                  label: "Accepted",
                  count: requestStats.accepted,
                  color: "bg-amber-500",
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
                  color: "bg-red-500",
                },
              ].map((filter) => (
                <Button
                  key={`filter-${filter.key}`}
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
            ? "All Caretaker Visit Requests"
            : `${getStatusLabel(filterStatus)} Requests`}
        </h3>
        <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          {filteredRequests.length}{" "}
          {filteredRequests.length === 1 ? "request" : "requests"} found
        </span>
      </div>

      {/* Requests Grid */}
      {filteredRequests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredRequests.map((request, index) =>
            renderRequestCard(request, index)
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <HeartHandshake className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || filterStatus !== "all"
                    ? "No matching requests"
                    : "No caretaker visit requests"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "No caretaker visit requests have been submitted yet."}
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
    </div>
  );
}
