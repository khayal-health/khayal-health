import React, { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Edit,
  Plus,
  BarChart,
  Copy,
  X,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  Loader2,
  Calendar,
  Tag,
  Timer,
  Activity,
  Package,
  Hash,
  Clock,
  UserCheck,
  Ban,
  RotateCcw,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { API_ENDPOINTS } from "@/lib/config";

interface Coupon {
  _id: string;
  code: string;
  type: "percentage" | "fixed_amount";
  discount_percentage?: number;
  discount_amount?: number;
  usage_limit?: number;
  per_user_limit?: number;
  current_usage: number;
  valid_from: string;
  valid_until?: string;
  status: "active" | "inactive" | "expired";
  created_by: string;
  created_at: string;
  updated_at: string;
  user_usage_count: Record<string, number>;
}

interface CouponFormData {
  code: string;
  type: "percentage" | "fixed_amount";
  discount_percentage?: number;
  discount_amount?: number;
  usage_limit?: number;
  per_user_limit?: number;
  valid_from?: string;
  valid_until?: string;
}

interface BulkCouponFormData {
  prefix: string;
  quantity: number;
  type: "percentage" | "fixed_amount";
  discount_percentage?: number;
  discount_amount?: number;
  usage_limit?: number;
  per_user_limit?: number;
  valid_from?: string;
  valid_until?: string;
}

export default function CouponManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<{
    id: string;
    code: string;
  } | null>(null);

  const [formData, setFormData] = useState<CouponFormData>({
    code: "",
    type: "percentage",
    discount_percentage: 10,
    discount_amount: undefined,
    usage_limit: undefined,
    per_user_limit: 1,
    valid_from: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    valid_until: undefined,
  });

  const [bulkFormData, setBulkFormData] = useState<BulkCouponFormData>({
    prefix: "",
    quantity: 10,
    type: "percentage",
    discount_percentage: 10,
    discount_amount: undefined,
    usage_limit: 1,
    per_user_limit: 1,
    valid_from: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    valid_until: undefined,
  });

  // Fetch all coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons", "admin", "all"],
    queryFn: async () => {
      const response = await apiRequest("GET", API_ENDPOINTS.COUPONS_ADMIN_ALL);
      return response.json();
    },
  });

  // Fetch statistics for selected coupon
  const { data: statistics, isLoading: isLoadingStatistics } = useQuery({
    queryKey: ["coupon", "statistics", selectedCoupon?._id],
    queryFn: async () => {
      if (!selectedCoupon) return null;
      const response = await apiRequest(
        "GET",
        API_ENDPOINTS.COUPONS_ADMIN_STATISTICS(selectedCoupon._id)
      );
      return response.json();
    },
    enabled: !!selectedCoupon && showStatisticsModal,
  });

  // Create coupon mutation
  const createMutation = useMutation({
    mutationFn: async (data: CouponFormData) => {
      const response = await apiRequest(
        "POST",
        API_ENDPOINTS.COUPONS_ADMIN_CREATE,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons", "admin", "all"] });
      setShowCreateModal(false);
      resetForm();
      toast({
        title: "Success",
        description: "Coupon created successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  // Bulk create mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (data: BulkCouponFormData) => {
      const response = await apiRequest(
        "POST",
        API_ENDPOINTS.COUPONS_ADMIN_BULK_CREATE,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons", "admin", "all"] });
      setShowBulkCreateModal(false);
      resetBulkForm();
      toast({
        title: "Success",
        description: "Coupons created successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupons",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  // Update coupon mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CouponFormData> & { status?: string };
    }) => {
      const response = await apiRequest(
        "PATCH",
        API_ENDPOINTS.COUPONS_ADMIN_UPDATE(id),
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons", "admin", "all"] });
      setEditingCoupon(null);
      resetForm();
      toast({
        title: "Success",
        description: "Coupon updated successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  // Delete coupon mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", API_ENDPOINTS.COUPONS_ADMIN_DELETE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons", "admin", "all"] });
      toast({
        title: "Success",
        description: "Coupon deleted successfully",
        duration: 3000,
      });
      setShowDeleteConfirm(false);
      setCouponToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete coupon",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  const resetForm = useCallback(() => {
    setFormData({
      code: "",
      type: "percentage",
      discount_percentage: 10,
      discount_amount: undefined,
      usage_limit: undefined,
      per_user_limit: 1,
      valid_from: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      valid_until: undefined,
    });
  }, []);

  const resetBulkForm = useCallback(() => {
    setBulkFormData({
      prefix: "",
      quantity: 10,
      type: "percentage",
      discount_percentage: 10,
      discount_amount: undefined,
      usage_limit: 1,
      per_user_limit: 1,
      valid_from: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      valid_until: undefined,
    });
  }, []);

  const handleCreateSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const dataToSubmit = {
        ...formData,
        discount_percentage:
          formData.type === "percentage"
            ? formData.discount_percentage
            : undefined,
        discount_amount:
          formData.type === "fixed_amount"
            ? formData.discount_amount
            : undefined,
      };
      createMutation.mutate(dataToSubmit);
    },
    [formData, createMutation]
  );

  const handleBulkCreateSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const dataToSubmit = {
        ...bulkFormData,
        discount_percentage:
          bulkFormData.type === "percentage"
            ? bulkFormData.discount_percentage
            : undefined,
        discount_amount:
          bulkFormData.type === "fixed_amount"
            ? bulkFormData.discount_amount
            : undefined,
      };
      bulkCreateMutation.mutate(dataToSubmit);
    },
    [bulkFormData, bulkCreateMutation]
  );

  const handleUpdateSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (editingCoupon) {
        const dataToSubmit = {
          ...formData,
          discount_percentage:
            formData.type === "percentage"
              ? formData.discount_percentage
              : undefined,
          discount_amount:
            formData.type === "fixed_amount"
              ? formData.discount_amount
              : undefined,
        };
        updateMutation.mutate({ id: editingCoupon._id, data: dataToSubmit });
      }
    },
    [formData, editingCoupon, updateMutation]
  );

  const startEdit = useCallback((coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      discount_percentage: coupon.discount_percentage,
      discount_amount: coupon.discount_amount,
      usage_limit: coupon.usage_limit,
      per_user_limit: coupon.per_user_limit,
      valid_from: coupon.valid_from
        ? format(new Date(coupon.valid_from), "yyyy-MM-dd'T'HH:mm")
        : undefined,
      valid_until: coupon.valid_until
        ? format(new Date(coupon.valid_until), "yyyy-MM-dd'T'HH:mm")
        : undefined,
    });
    setShowCreateModal(true);
  }, []);

  // Updated delete handler to show confirmation dialog
  const handleDelete = useCallback((id: string, code: string) => {
    setCouponToDelete({ id, code });
    setShowDeleteConfirm(true);
  }, []);

  // Confirm delete handler
  const confirmDelete = useCallback(() => {
    if (couponToDelete) {
      deleteMutation.mutate(couponToDelete.id);
    }
  }, [couponToDelete, deleteMutation]);

  const toggleStatus = useCallback(
    (coupon: Coupon) => {
      const newStatus = coupon.status === "active" ? "inactive" : "active";
      updateMutation.mutate({
        id: coupon._id,
        data: { status: newStatus },
      });
    },
    [updateMutation]
  );

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterStatus("all");
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800";
      case "inactive":
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800";
      case "expired":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "inactive":
        return <Ban className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "expired":
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  // Calculate stats
  const couponStats = useMemo(() => {
    return {
      total: coupons.length,
      active: coupons.filter((c: Coupon) => c.status === "active").length,
      inactive: coupons.filter((c: Coupon) => c.status === "inactive").length,
      expired: coupons.filter((c: Coupon) => c.status === "expired").length,
      totalUsage: coupons.reduce(
        (sum: number, c: Coupon) => sum + c.current_usage,
        0
      ),
      percentageType: coupons.filter((c: Coupon) => c.type === "percentage")
        .length,
      fixedType: coupons.filter((c: Coupon) => c.type === "fixed_amount")
        .length,
    };
  }, [coupons]);

  // Filter coupons
  const filteredCoupons = useMemo(() => {
    let filtered = coupons;

    if (filterStatus !== "all") {
      filtered = filtered.filter(
        (coupon: Coupon) => coupon.status === filterStatus
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((coupon: Coupon) => {
        return (
          coupon.code.toLowerCase().includes(query) ||
          coupon._id.toLowerCase().includes(query)
        );
      });
    }

    return filtered.sort((a: Coupon, b: Coupon) => {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [coupons, filterStatus, searchQuery]);

  // Statistics cards data
  const statisticsCards = [
    {
      key: "total-coupons",
      title: "Total Coupons",
      value: couponStats.total,
      icon: Tag,
      gradient:
        "from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20",
      border: "border-purple-200 dark:border-purple-700",
      textColor: "text-purple-700 dark:text-purple-300",
      valueColor: "text-purple-900 dark:text-purple-100",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      key: "active-coupons",
      title: "Active",
      value: couponStats.active,
      icon: CheckCircle,
      gradient:
        "from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20",
      border: "border-emerald-200 dark:border-emerald-700",
      textColor: "text-emerald-700 dark:text-emerald-300",
      valueColor: "text-emerald-900 dark:text-emerald-100",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "total-usage",
      title: "Total Usage",
      value: couponStats.totalUsage,
      icon: TrendingUp,
      gradient:
        "from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20",
      border: "border-blue-200 dark:border-blue-700",
      textColor: "text-blue-700 dark:text-blue-300",
      valueColor: "text-blue-900 dark:text-blue-100",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "inactive-coupons",
      title: "Inactive",
      value: couponStats.inactive,
      icon: Ban,
      gradient:
        "from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/20",
      border: "border-gray-200 dark:border-gray-700",
      textColor: "text-gray-700 dark:text-gray-300",
      valueColor: "text-gray-900 dark:text-gray-100",
      iconColor: "text-gray-600 dark:text-gray-400",
    },
    {
      key: "expired-coupons",
      title: "Expired",
      value: couponStats.expired,
      icon: Clock,
      gradient:
        "from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20",
      border: "border-red-200 dark:border-red-700",
      textColor: "text-red-700 dark:text-red-300",
      valueColor: "text-red-900 dark:text-red-100",
      iconColor: "text-red-600 dark:text-red-400",
    },
    {
      key: "percentage-type",
      title: "Percentage",
      value: couponStats.percentageType,
      icon: Percent,
      gradient:
        "from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20",
      border: "border-amber-200 dark:border-amber-700",
      textColor: "text-amber-700 dark:text-amber-300",
      valueColor: "text-amber-900 dark:text-amber-100",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "fixed-type",
      title: "Fixed Amount",
      value: couponStats.fixedType,
      icon: DollarSign,
      gradient:
        "from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20",
      border: "border-green-200 dark:border-green-700",
      textColor: "text-green-700 dark:text-green-300",
      valueColor: "text-green-900 dark:text-green-100",
      iconColor: "text-green-600 dark:text-green-400",
    },
  ];

  const renderCouponCard = (coupon: Coupon, index: number) => {
    const isActive = coupon.status === "active";
    const isExpired = coupon.status === "expired";
    const couponKey = coupon._id ? `coupon-${coupon._id}` : `coupon-${index}`;

    return (
      <Card
        key={couponKey}
        className={cn(
          "relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg",
          isActive && "ring-2 ring-emerald-200 dark:ring-emerald-800",
          isExpired && "opacity-75"
        )}
      >
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
          <div
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(
              coupon.status
            )}`}
          >
            {getStatusIcon(coupon.status)}
            <span className="capitalize">{coupon.status}</span>
          </div>
        </div>
        {isActive && (
          <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
        )}
        {isExpired && (
          <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-red-400 to-pink-500" />
        )}
        <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-start gap-2 sm:gap-3 pr-20 sm:pr-32">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 flex-shrink-0">
                <Tag className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {coupon.code}
                  <button
                    onClick={() => copyCode(coupon.code)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {copiedCode === coupon.code ? (
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </button>
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  Created {format(new Date(coupon.created_at), "PPP")}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            {/* Discount Info */}
            <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="font-medium text-xs sm:text-sm mb-1.5 text-gray-900 dark:text-white">
                Discount Details
              </p>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {coupon.type === "percentage" ? (
                    <>
                      <Percent className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                        {coupon.discount_percentage}% off
                      </span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                        ${coupon.discount_amount} off
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Usage Info */}
            <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="font-medium text-xs sm:text-sm mb-1.5 text-gray-900 dark:text-white">
                Usage Information
              </p>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                    Used {coupon.current_usage} /{" "}
                    {coupon.usage_limit || "Unlimited"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                    Per user limit: {coupon.per_user_limit || "Unlimited"}
                  </span>
                </div>
              </div>
            </div>

            {/* Validity Period */}
            <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="font-medium text-xs sm:text-sm mb-1.5 text-gray-900 dark:text-white">
                Validity Period
              </p>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                    From: {format(new Date(coupon.valid_from), "PPP")}
                  </span>
                </div>
                {coupon.valid_until && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Timer className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                      Until: {format(new Date(coupon.valid_until), "PPP")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
              onClick={() => {
                setSelectedCoupon(coupon);
                setShowStatisticsModal(true);
              }}
            >
              <BarChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Statistics
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
              onClick={() => toggleStatus(coupon)}
            >
              {coupon.status === "active" ? (
                <>
                  <Ban className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Activate
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => startEdit(coupon)}
            >
              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 text-red-600 hover:text-red-700"
              onClick={() => handleDelete(coupon._id, coupon.code)}
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

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
        <div className="flex gap-2">
          <Dialog
            open={showBulkCreateModal}
            onOpenChange={setShowBulkCreateModal}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-9 sm:h-10 text-xs sm:text-sm"
                onClick={() => resetBulkForm()}
              >
                <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Bulk Create
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
                  Bulk Create Coupons
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create multiple coupons with a common prefix
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                <form onSubmit={handleBulkCreateSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="bulk-prefix"
                        className="text-xs sm:text-sm"
                      >
                        Prefix
                      </Label>
                      <Input
                        id="bulk-prefix"
                        type="text"
                        value={bulkFormData.prefix}
                        onChange={(e) =>
                          setBulkFormData({
                            ...bulkFormData,
                            prefix: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="BULK2024"
                        required
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="bulk-quantity"
                        className="text-xs sm:text-sm"
                      >
                        Quantity
                      </Label>
                      <Input
                        id="bulk-quantity"
                        type="number"
                        value={bulkFormData.quantity}
                        onChange={(e) =>
                          setBulkFormData({
                            ...bulkFormData,
                            quantity: Number(e.target.value),
                          })
                        }
                        min="1"
                        max="1000"
                        required
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-type" className="text-xs sm:text-sm">
                        Discount Type
                      </Label>
                      <Select
                        value={bulkFormData.type}
                        onValueChange={(value) =>
                          setBulkFormData({
                            ...bulkFormData,
                            type: value as "percentage" | "fixed_amount",
                          })
                        }
                      >
                        <SelectTrigger
                          id="bulk-type"
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed_amount">
                            Fixed Amount
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {bulkFormData.type === "percentage" ? (
                      <div className="space-y-2">
                        <Label
                          htmlFor="bulk-percentage"
                          className="text-xs sm:text-sm"
                        >
                          Discount Percentage
                        </Label>
                        <Input
                          id="bulk-percentage"
                          type="number"
                          value={bulkFormData.discount_percentage}
                          onChange={(e) =>
                            setBulkFormData({
                              ...bulkFormData,
                              discount_percentage: Number(e.target.value),
                            })
                          }
                          min="1"
                          max="100"
                          required
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label
                          htmlFor="bulk-amount"
                          className="text-xs sm:text-sm"
                        >
                          Discount Amount ($)
                        </Label>
                        <Input
                          id="bulk-amount"
                          type="number"
                          value={bulkFormData.discount_amount}
                          onChange={(e) =>
                            setBulkFormData({
                              ...bulkFormData,
                              discount_amount: Number(e.target.value),
                            })
                          }
                          min="1"
                          step="0.01"
                          required
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="bulk-usage-limit"
                        className="text-xs sm:text-sm"
                      >
                        Usage Limit (per coupon)
                      </Label>
                      <Input
                        id="bulk-usage-limit"
                        type="number"
                        value={bulkFormData.usage_limit || ""}
                        onChange={(e) =>
                          setBulkFormData({
                            ...bulkFormData,
                            usage_limit: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Unlimited"
                        min="1"
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="bulk-user-limit"
                        className="text-xs sm:text-sm"
                      >
                        Per User Limit
                      </Label>
                      <Input
                        id="bulk-user-limit"
                        type="number"
                        value={bulkFormData.per_user_limit || ""}
                        onChange={(e) =>
                          setBulkFormData({
                            ...bulkFormData,
                            per_user_limit: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="1"
                        min="1"
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="bulk-valid-from"
                        className="text-xs sm:text-sm"
                      >
                        Valid From
                      </Label>
                      <Input
                        id="bulk-valid-from"
                        type="datetime-local"
                        value={bulkFormData.valid_from}
                        onChange={(e) =>
                          setBulkFormData({
                            ...bulkFormData,
                            valid_from: e.target.value,
                          })
                        }
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="bulk-valid-until"
                        className="text-xs sm:text-sm"
                      >
                        Valid Until (Optional)
                      </Label>
                      <Input
                        id="bulk-valid-until"
                        type="datetime-local"
                        value={bulkFormData.valid_until || ""}
                        onChange={(e) =>
                          setBulkFormData({
                            ...bulkFormData,
                            valid_until: e.target.value || undefined,
                          })
                        }
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      This will create {bulkFormData.quantity} unique coupons
                      with codes like:
                    </p>
                    <p className="text-xs sm:text-sm font-mono mt-1 text-gray-900 dark:text-white">
                      {bulkFormData.prefix}-XXXXX, {bulkFormData.prefix}-XXXXX,
                      ...
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowBulkCreateModal(false);
                        resetBulkForm();
                      }}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={bulkCreateMutation.isPending}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      {bulkCreateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Package className="mr-2 h-4 w-4" />
                          Create {bulkFormData.quantity} Coupons
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showCreateModal && !editingCoupon}
            onOpenChange={(open) => {
              if (!open) {
                setShowCreateModal(false);
                setEditingCoupon(null);
                resetForm();
              } else {
                setShowCreateModal(true);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="h-9 sm:h-10 text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
                  Create New Coupon
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a new promotional coupon
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-xs sm:text-sm">
                      Coupon Code
                    </Label>
                    <Input
                      id="code"
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="SUMMER2024"
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-xs sm:text-sm">
                        Discount Type
                      </Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            type: value as "percentage" | "fixed_amount",
                          })
                        }
                      >
                        <SelectTrigger
                          id="type"
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed_amount">
                            Fixed Amount
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.type === "percentage" ? (
                      <div className="space-y-2">
                        <Label
                          htmlFor="percentage"
                          className="text-xs sm:text-sm"
                        >
                          Discount Percentage
                        </Label>
                        <Input
                          id="percentage"
                          type="number"
                          value={formData.discount_percentage}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              discount_percentage: Number(e.target.value),
                            })
                          }
                          min="1"
                          max="100"
                          required
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-xs sm:text-sm">
                          Discount Amount ($)
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          value={formData.discount_amount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              discount_amount: Number(e.target.value),
                            })
                          }
                          min="1"
                          step="0.01"
                          required
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="usage-limit"
                        className="text-xs sm:text-sm"
                      >
                        Total Usage Limit
                      </Label>
                      <Input
                        id="usage-limit"
                        type="number"
                        value={formData.usage_limit || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            usage_limit: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Unlimited"
                        min="1"
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="user-limit"
                        className="text-xs sm:text-sm"
                      >
                        Per User Limit
                      </Label>
                      <Input
                        id="user-limit"
                        type="number"
                        value={formData.per_user_limit || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            per_user_limit: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Unlimited"
                        min="1"
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="valid-from"
                        className="text-xs sm:text-sm"
                      >
                        Valid From
                      </Label>
                      <Input
                        id="valid-from"
                        type="datetime-local"
                        value={formData.valid_from}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            valid_from: e.target.value,
                          })
                        }
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="valid-until"
                        className="text-xs sm:text-sm"
                      >
                        Valid Until (Optional)
                      </Label>
                      <Input
                        id="valid-until"
                        type="datetime-local"
                        value={formData.valid_until || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            valid_until: e.target.value || undefined,
                          })
                        }
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                      }}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Coupon
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={showCreateModal && !!editingCoupon}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingCoupon(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Edit Coupon
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update coupon details for {editingCoupon?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type" className="text-xs sm:text-sm">
                    Discount Type
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        type: value as "percentage" | "fixed_amount",
                      })
                    }
                  >
                    <SelectTrigger
                      id="edit-type"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.type === "percentage" ? (
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-percentage"
                      className="text-xs sm:text-sm"
                    >
                      Discount Percentage
                    </Label>
                    <Input
                      id="edit-percentage"
                      type="number"
                      value={formData.discount_percentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_percentage: Number(e.target.value),
                        })
                      }
                      min="1"
                      max="100"
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount" className="text-xs sm:text-sm">
                      Discount Amount ($)
                    </Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      value={formData.discount_amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_amount: Number(e.target.value),
                        })
                      }
                      min="1"
                      step="0.01"
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-usage-limit"
                    className="text-xs sm:text-sm"
                  >
                    Total Usage Limit
                  </Label>
                  <Input
                    id="edit-usage-limit"
                    type="number"
                    value={formData.usage_limit || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage_limit: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Unlimited"
                    min="1"
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-user-limit"
                    className="text-xs sm:text-sm"
                  >
                    Per User Limit
                  </Label>
                  <Input
                    id="edit-user-limit"
                    type="number"
                    value={formData.per_user_limit || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        per_user_limit: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Unlimited"
                    min="1"
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-valid-from"
                    className="text-xs sm:text-sm"
                  >
                    Valid From
                  </Label>
                  <Input
                    id="edit-valid-from"
                    type="datetime-local"
                    value={formData.valid_from}
                    onChange={(e) =>
                      setFormData({ ...formData, valid_from: e.target.value })
                    }
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-valid-until"
                    className="text-xs sm:text-sm"
                  >
                    Valid Until (Optional)
                  </Label>
                  <Input
                    id="edit-valid-until"
                    type="datetime-local"
                    value={formData.valid_until || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        valid_until: e.target.value || undefined,
                      })
                    }
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCoupon(null);
                    resetForm();
                  }}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Update Coupon
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteConfirm(false);
            setCouponToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Coupon
            </DialogTitle>
            <DialogDescription className="pt-3 space-y-2">
              <p>Are you sure you want to delete this coupon?</p>
              <p className="font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-md inline-block">
                {couponToDelete?.code}
              </p>
              <p className="text-sm text-red-600">
                This action cannot be undone. All usage history for this coupon
                will be permanently deleted.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setCouponToDelete(null);
              }}
              className="h-9 sm:h-10 text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="h-9 sm:h-10 text-xs sm:text-sm"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Coupon
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by coupon code or ID..."
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
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {[
                {
                  key: "all",
                  label: "All Coupons",
                  count: couponStats.total,
                  color: "bg-gray-500",
                },
                {
                  key: "active",
                  label: "Active",
                  count: couponStats.active,
                  color: "bg-emerald-500",
                },
                {
                  key: "inactive",
                  label: "Inactive",
                  count: couponStats.inactive,
                  color: "bg-gray-500",
                },
                {
                  key: "expired",
                  label: "Expired",
                  count: couponStats.expired,
                  color: "bg-red-500",
                },
              ].map((filter) => (
                <Button
                  key={`filter-${filter.key}`}
                  variant={filterStatus === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(filter.key)}
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
            ? "All Coupons"
            : `${
                filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)
              } Coupons`}
        </h3>
        <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          {filteredCoupons.length}{" "}
          {filteredCoupons.length === 1 ? "coupon" : "coupons"} found
        </span>
      </div>

      {/* Coupons Grid */}
      {filteredCoupons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredCoupons.map((coupon: Coupon, index: number) =>
            renderCouponCard(coupon, index)
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Tag className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || filterStatus !== "all"
                    ? "No matching coupons"
                    : "No coupons created"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Create your first coupon to get started."}
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

      {/* Statistics Modal */}
      <Dialog
        open={showStatisticsModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowStatisticsModal(false);
            setSelectedCoupon(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Statistics for {selectedCoupon?.code}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Detailed usage statistics and analytics
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
            {isLoadingStatistics ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : statistics ? (
              <div className="space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Total Usage
                          </p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {statistics.total_usage}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Unique Users
                          </p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {statistics.unique_users}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            Total Discount
                          </p>
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            ${statistics.total_discount_given.toFixed(2)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Usage Chart */}
                {statistics.usage_by_date &&
                  statistics.usage_by_date.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Usage Over Time
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {statistics.usage_by_date.map((item: any) => (
                            <div
                              key={item.date}
                              className="flex items-center gap-4"
                            >
                              <span className="text-sm text-muted-foreground w-24">
                                {format(new Date(item.date), "MMM dd")}
                              </span>
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                                <div
                                  className="absolute top-0 left-0 h-full bg-primary rounded-full"
                                  style={{
                                    width: `${
                                      (item.count / statistics.total_usage) *
                                      100
                                    }%`,
                                  }}
                                />
                                <span className="absolute right-2 top-0 h-full flex items-center text-xs">
                                  {item.count}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Top Users */}
                {statistics.top_users && statistics.top_users.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                User ID
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Usage Count
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Total Discount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {statistics.top_users.map((user: any) => (
                              <tr key={user.user_id}>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {user.user_id}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {user.usage_count}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  ${user.total_discount.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No statistics available for this coupon
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
