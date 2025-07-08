import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Clock,
  MapPin,
  User,
  Package,
  Calendar,
  CheckCircle,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  Truck,
  Ban,
  RotateCcw,
  Hash,
  DollarSign,
} from "lucide-react";
import { useState, useMemo } from "react";

interface OrdersTabProps {
  orders: any[];
  meals: any[];
  user: any;
  isLoading?: boolean;
}

type FilterStatus =
  | "all"
  | "active"
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export default function OrdersTab({
  orders,
  meals,
  user,
  isLoading,
}: OrdersTabProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Mutation: update order status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => {
      setUpdatingOrderId(orderId);
      const res = await apiRequest(
        "PATCH",
        API_ENDPOINTS.ORDER_STATUS(orderId),
        { status }
      );
      return res.json();
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chef-orders", user._id],
      });

      // Enhanced toast messages based on status
      const statusMessages = {
        confirmed: "Order confirmed successfully! Customer will be notified.",
        cancelled: "Order cancelled. Customer has been informed.",
        preparing: "Order marked as preparing. Kitchen workflow updated.",
        ready: "Order is ready for pickup/delivery!",
        delivered: "Order completed successfully! Great job! 🎉",
      };

      toast({
        title: "Success",
        description:
          statusMessages[variables.status as keyof typeof statusMessages] ||
          "Order status updated successfully",
        duration: 3000,
      });

      setUpdatingOrderId(null);
    },
    onError: (error: Error) => {
      console.error("Update order status error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
        duration: 4000,
      });
      setUpdatingOrderId(null);
    },
  });

  // Calculate order statistics
  const orderStats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        delivered: 0,
        cancelled: 0,
        activeOrders: 0,
        completionRate: 0,
      };
    }

    const stats = orders.reduce(
      (acc, order) => {
        acc.total++;
        acc[order.status as keyof typeof acc]++;
        return acc;
      },
      {
        total: 0,
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        delivered: 0,
        cancelled: 0,
      }
    );

    const activeOrders =
      stats.pending + stats.confirmed + stats.preparing + stats.ready;
    const completionRate =
      stats.total > 0
        ? Math.round(
            (stats.delivered / (stats.delivered + stats.cancelled || 1)) * 100
          )
        : 0;

    return { ...stats, activeOrders, completionRate };
  }, [orders]);

  // Filter and search orders with stable sorting
  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    let filtered = orders;

    // Apply status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((order) =>
        ["pending", "confirmed", "preparing", "ready"].includes(order.status)
      );
    } else if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => {
        const meal = meals?.find(
          (m) => m._id === order.meal_id || m.id === order.meal_id
        );
        const customerName = order.subscriber?.name?.toLowerCase() || "";
        const mealName = meal?.name?.toLowerCase() || "";
        const orderId = (order._id || order.id).slice(-6).toLowerCase();

        return (
          customerName.includes(query) ||
          mealName.includes(query) ||
          orderId.includes(query)
        );
      });
    }

    // Stable sorting: Sort by timestamp first, then by status priority
    // This prevents cards from jumping around when status changes
    return filtered.sort((a, b) => {
      // Primary sort: by timestamp (newest first)
      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();

      if (dateA !== dateB) {
        return dateB - dateA;
      }

      // Secondary sort: by status priority (only for same timestamp)
      const statusPriority = {
        pending: 1,
        confirmed: 2,
        preparing: 3,
        ready: 4,
        delivered: 5,
        cancelled: 6,
      };

      const priorityA =
        statusPriority[a.status as keyof typeof statusPriority] || 99;
      const priorityB =
        statusPriority[b.status as keyof typeof statusPriority] || 99;

      return priorityA - priorityB;
    });
  }, [orders, statusFilter, searchQuery, meals]);

  const getStatusColor = (status: string) => {
    const colors = {
      pending:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      confirmed:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
      preparing:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
      ready:
        "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
      delivered:
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
        return <Clock className="h-4 w-4" />;
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />;
      case "preparing":
        return <Package className="h-4 w-4" />;
      case "ready":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle2 className="h-4 w-4" />;
      case "cancelled":
        return <Ban className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filterButtons = [
    {
      key: "all",
      label: "All Orders",
      count: orderStats.total,
      color: "bg-gray-500",
    },
    {
      key: "active",
      label: "Active",
      count: orderStats.activeOrders,
      color: "bg-blue-500",
    },
    {
      key: "pending",
      label: "Pending",
      count: orderStats.pending,
      color: "bg-amber-500",
    },
    {
      key: "preparing",
      label: "Preparing",
      count: orderStats.preparing,
      color: "bg-purple-500",
    },
    {
      key: "ready",
      label: "Ready",
      count: orderStats.ready,
      color: "bg-orange-500",
    },
    {
      key: "delivered",
      label: "Delivered",
      count: orderStats.delivered,
      color: "bg-emerald-500",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: orderStats.cancelled,
      color: "bg-rose-500",
    },
  ];

  const renderActionButtons = (order: any) => {
    const orderId = order._id || order.id;
    const isThisOrderUpdating = updatingOrderId === orderId;

    switch (order.status) {
      case "pending":
        return (
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() =>
                updateOrderStatusMutation.mutate({
                  orderId,
                  status: "confirmed",
                })
              }
              disabled={isThisOrderUpdating}
            >
              {isThisOrderUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Order
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() =>
                updateOrderStatusMutation.mutate({
                  orderId,
                  status: "cancelled",
                })
              }
              disabled={isThisOrderUpdating}
            >
              {isThisOrderUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Cancel Order
            </Button>
          </div>
        );
      case "confirmed":
        return (
          <div className="space-y-2">
            <Button
              variant="default"
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() =>
                updateOrderStatusMutation.mutate({
                  orderId,
                  status: "preparing",
                })
              }
              disabled={isThisOrderUpdating}
            >
              {isThisOrderUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Start Preparing
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-rose-600 border-rose-300 hover:bg-rose-50"
              onClick={() =>
                updateOrderStatusMutation.mutate({
                  orderId,
                  status: "cancelled",
                })
              }
              disabled={isThisOrderUpdating}
            >
              {isThisOrderUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Cancel
            </Button>
          </div>
        );
      case "preparing":
        return (
          <div className="space-y-2">
            <Button
              variant="default"
              size="sm"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() =>
                updateOrderStatusMutation.mutate({
                  orderId,
                  status: "ready",
                })
              }
              disabled={isThisOrderUpdating}
            >
              {isThisOrderUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Truck className="h-4 w-4 mr-2" />
              )}
              Mark as Ready
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-rose-600 border-rose-300 hover:bg-rose-50"
              onClick={() =>
                updateOrderStatusMutation.mutate({
                  orderId,
                  status: "cancelled",
                })
              }
              disabled={isThisOrderUpdating}
            >
              {isThisOrderUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Cancel
            </Button>
          </div>
        );
      case "ready":
        return (
          <Button
            variant="default"
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() =>
              updateOrderStatusMutation.mutate({
                orderId,
                status: "delivered",
              })
            }
            disabled={isThisOrderUpdating}
          >
            {isThisOrderUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Mark as Delivered
          </Button>
        );
      case "cancelled":
        return (
          <div className="w-full p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
            <div className="flex items-center justify-center gap-2 text-rose-700 dark:text-rose-300">
              <Ban className="h-4 w-4" />
              <span className="text-sm font-medium">Order Cancelled</span>
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 text-center">
              This order has been cancelled and cannot be modified
            </p>
          </div>
        );
      case "delivered":
        return (
          <div className="w-full p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Order Completed</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 text-center">
              Successfully delivered to customer
            </p>
          </div>
        );
      default:
        return (
          <div className="w-full p-2 text-center">
            <span className="text-sm text-muted-foreground">
              No actions available
            </span>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Loading skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-24 bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
        <Card className="h-32 bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-64 bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Total Orders
                </p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {orderStats.total}
                </p>
              </div>
              <Package className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Active Orders
                </p>
                <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {orderStats.activeOrders}
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Delivered
                </p>
                <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  {orderStats.delivered}
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20 border-rose-200 dark:border-rose-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                  Cancelled
                </p>
                <p className="text-3xl font-bold text-rose-900 dark:text-rose-100">
                  {orderStats.cancelled}
                </p>
              </div>
              <Ban className="h-10 w-10 text-rose-600 dark:text-rose-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name, meal, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {filterButtons.map((filter) => (
                <Button
                  key={filter.key}
                  variant={statusFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.key as FilterStatus)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-2 h-2 rounded-full ${filter.color}`} />
                  <span>{filter.label}</span>
                  {filter.count > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {statusFilter === "all"
            ? "All Orders"
            : statusFilter === "active"
            ? "Active Orders"
            : `${
                statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
              } Orders`}
        </h3>
        <span className="text-sm text-muted-foreground">
          {filteredOrders.length}{" "}
          {filteredOrders.length === 1 ? "order" : "orders"} found
        </span>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredOrders.map((order: any) => {
            const meal = meals?.find(
              (m: any) => m._id === order.meal_id || m.id === order.meal_id
            );

            return (
              <Card
                key={order._id || order.id}
                className={`relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${
                  order.status === "pending"
                    ? "ring-2 ring-amber-200 dark:ring-amber-800"
                    : ""
                } ${order.status === "cancelled" ? "opacity-75" : ""}`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusIcon(order.status)}
                    <span className="capitalize">{order.status}</span>
                  </div>
                </div>

                {/* Priority Indicator for Pending Orders */}
                {order.status === "pending" && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                )}

                <CardHeader className="pb-3">
                  <div className="space-y-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white pr-24">
                      Order #{(order._id || order.id).slice(-6)}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {order.timestamp
                          ? format(
                              new Date(order.timestamp),
                              "MMM dd, yyyy 'at' h:mm a"
                            )
                          : "Date not available"}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Meal Information */}
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Package className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {meal?.name || "Unknown Meal"}
                          </p>
                          {meal?.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {meal.description}
                            </p>
                          )}

                          {/* Quantity and Pricing Information */}
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                Quantity: {order.quantity || 1}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-primary" />
                                <span className="text-sm text-muted-foreground">
                                  Unit Price: ${meal?.price || 0}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  Total Amount:
                                </span>
                                <span className="text-lg font-bold text-primary">
                                  ${order.total_price || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <User className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {order.subscriber?.name || "Unknown Customer"}
                        </p>
                        {order.subscriber?.email && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.subscriber.email}
                          </p>
                        )}
                        {order.subscriber?.phone && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.subscriber.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {order.delivery_address && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {order.delivery_address}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    {renderActionButtons(order)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || statusFilter !== "all"
                    ? "No matching orders"
                    : "No orders yet"}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Your incoming orders will appear here once customers start placing them."}
                </p>
              </div>
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
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
