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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ChefHat,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Phone,
  Package,
  DollarSign,
  MapPin,
  User,
  ShoppingBag,
  Utensils,
  RotateCcw,
  Hash,
  Calendar,
  AlertCircle,
  TrendingUp,
  Truck,
  Ban,
  ShoppingCart,
  Info,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import type { Order, OrderStatus } from "./types";

interface ChefOrdersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function ChefOrders({
  searchQuery,
  setSearchQuery,
}: ChefOrdersProps) {
  const [orderFilter, setOrderFilter] = useState<OrderStatus>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: chefOrders = [], isLoading: isLoadingChefOrders } = useQuery<
    Order[]
  >({
    queryKey: [API_ENDPOINTS.ADMIN_CHEF_ORDERS],
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const orderStats = useMemo(() => {
    const stats = {
      total: chefOrders.length,
      pending: chefOrders.filter((o) => o.status === "pending").length,
      confirmed: chefOrders.filter((o) => o.status === "confirmed").length,
      preparing: chefOrders.filter((o) => o.status === "preparing").length,
      ready: chefOrders.filter((o) => o.status === "ready").length,
      delivered: chefOrders.filter((o) => o.status === "delivered").length,
      cancelled: chefOrders.filter((o) => o.status === "cancelled").length,
      totalRevenue: chefOrders.reduce(
        (sum, order) => sum + (order.total_price || 0),
        0
      ),
      avgOrderValue:
        chefOrders.length > 0
          ? chefOrders.reduce(
              (sum, order) => sum + (order.total_price || 0),
              0
            ) / chefOrders.length
          : 0,
    };
    return stats;
  }, [chefOrders]);

  const filteredOrders = useMemo(() => {
    let filtered = chefOrders;
    if (orderFilter !== "all") {
      filtered = filtered.filter((order) => order.status === orderFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.subscriber?.name.toLowerCase().includes(query) ||
          order.chef?.name.toLowerCase().includes(query) ||
          order.meal?.name.toLowerCase().includes(query) ||
          order._id.toString().toLowerCase().includes(query) ||
          order.delivery_address.toLowerCase().includes(query)
      );
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [chefOrders, orderFilter, searchQuery]);

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => {
      const endpoint = API_ENDPOINTS.ADMIN_ORDER_STATUS(orderId);
      return apiRequest("PATCH", endpoint, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ADMIN_CHEF_ORDERS],
      });
      toast({
        title: "Success",
        description: "Order status updated successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  const handleOrderStatusUpdate = useCallback(
    (orderId: string, status: string) => {
      updateOrderStatusMutation.mutate({ orderId, status });
    },
    [updateOrderStatusMutation]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setOrderFilter("all");
  }, [setSearchQuery]);

  const getStatusColor = (status: string) => {
    const colors = {
      pending:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      confirmed:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
      preparing:
        "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
      ready:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
      delivered:
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
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "confirmed":
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "preparing":
        return <ChefHat className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "ready":
        return <Package className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "delivered":
        return <Truck className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "cancelled":
        return <Ban className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Enhanced Order Statistics */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Total Orders
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {orderStats.total}
                </p>
              </div>
              <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                  Total Revenue
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  Rs.
                  {orderStats.totalRevenue >= 1000
                    ? `${(orderStats.totalRevenue / 1000).toFixed(1)}K`
                    : orderStats.totalRevenue}
                </p>
              </div>
              <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
                  Avg. Order
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
                  Rs.{Math.round(orderStats.avgOrderValue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                  Pending
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {orderStats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown cards - separate row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-blue-700 dark:text-blue-300">
                  Confirmed
                </p>
                <p className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">
                  {orderStats.confirmed}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-orange-700 dark:text-orange-300">
                  Preparing
                </p>
                <p className="text-lg sm:text-xl font-bold text-orange-900 dark:text-orange-100">
                  {orderStats.preparing}
                </p>
              </div>
              <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/20 border-violet-200 dark:border-violet-700">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-violet-700 dark:text-violet-300">
                  Ready
                </p>
                <p className="text-lg sm:text-xl font-bold text-violet-900 dark:text-violet-100">
                  {orderStats.ready}
                </p>
              </div>
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-green-700 dark:text-green-300">
                  Delivered
                </p>
                <p className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100">
                  {orderStats.delivered}
                </p>
              </div>
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-red-200 dark:border-red-700">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-red-700 dark:text-red-300">
                  Cancelled
                </p>
                <p className="text-lg sm:text-xl font-bold text-red-900 dark:text-red-100">
                  {orderStats.cancelled}
                </p>
              </div>
              <Ban className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Filters */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, chef, meal, ID, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 sm:pl-8 md:pl-10 text-[11px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 p-0"
                >
                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2">
              {[
                {
                  key: "all",
                  label: "All",
                  count: orderStats.total,
                  color: "bg-gray-500",
                },
                {
                  key: "pending",
                  label: "Pending",
                  count: orderStats.pending,
                  color: "bg-amber-500",
                },
                {
                  key: "confirmed",
                  label: "Confirmed",
                  count: orderStats.confirmed,
                  color: "bg-blue-500",
                },
                {
                  key: "preparing",
                  label: "Preparing",
                  count: orderStats.preparing,
                  color: "bg-orange-500",
                },
                {
                  key: "ready",
                  label: "Ready",
                  count: orderStats.ready,
                  color: "bg-purple-500",
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
                  color: "bg-red-500",
                },
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={orderFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrderFilter(filter.key as OrderStatus)}
                  className="flex items-center gap-1 sm:gap-1.5 h-6 sm:h-7 md:h-8 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs"
                >
                  <div
                    className={`w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 rounded-full ${filter.color}`}
                  />
                  <span className="truncate">{filter.label}</span>
                  {filter.count > 0 && (
                    <span
                      className={`px-1 sm:px-1.5 py-0 rounded-full text-[8px] sm:text-[9px] md:text-xs font-medium ${
                        orderFilter === filter.key
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {filter.count}
                    </span>
                  )}
                </Button>
              ))}
              {(searchQuery || orderFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 sm:h-7 md:h-8 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs ml-auto"
                >
                  <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 mr-0.5 sm:mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate">
          {orderFilter === "all"
            ? "All Orders"
            : `${
                orderFilter.charAt(0).toUpperCase() + orderFilter.slice(1)
              } Orders`}
        </h3>
        <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground flex-shrink-0 ml-2">
          {filteredOrders.length}{" "}
          {filteredOrders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      {/* Order Cards */}
      {isLoadingChefOrders ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          {filteredOrders.map((order) => (
            <Card
              key={order._id}
              className="relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700"
            >
              {/* Status Badge */}
              <div className="absolute top-2 right-2 z-10">
                <div
                  className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] md:text-xs font-medium border ${getStatusColor(
                    order.status
                  )}`}
                >
                  {getStatusIcon(order.status)}
                  <span className="capitalize hidden xs:inline">
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <CardHeader className="p-2 sm:p-3 md:p-4 pb-2 sm:pb-2 md:pb-3">
                <div className="space-y-0.5 sm:space-y-1 pr-12 sm:pr-16 md:pr-24">
                  <div className="flex items-start gap-1 sm:gap-2">
                    <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-[11px] sm:text-xs md:text-sm lg:text-base font-semibold text-gray-900 dark:text-white break-all">
                        {order._id}
                      </CardTitle>
                      <CardDescription className="text-[9px] sm:text-[10px] md:text-xs flex items-center gap-1 mt-0.5">
                        <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {format(
                          new Date(order.timestamp),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2 sm:space-y-2.5 md:space-y-3 p-2 sm:p-3 md:p-4 pt-0 sm:pt-0 md:pt-0">
                {/* Order Summary */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg p-2 sm:p-2.5 md:p-3">
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                    <p className="font-medium text-[10px] sm:text-xs md:text-sm text-indigo-900 dark:text-indigo-100">
                      Order Summary
                    </p>
                    <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] md:text-xs">
                    <div className="flex items-center gap-1">
                      <ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-indigo-600" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Qty:
                      </span>
                      <span className="font-semibold text-indigo-900 dark:text-indigo-100">
                        {order.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-indigo-600" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Total:
                      </span>
                      <span className="font-semibold text-indigo-900 dark:text-indigo-100">
                        Rs.{order.total_price}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 sm:p-2.5 md:p-3">
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                    <p className="font-medium text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">
                      Customer Details
                    </p>
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="space-y-0.5 sm:space-y-1 text-[9px] sm:text-[10px] md:text-xs">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Badge
                        variant="outline"
                        className="h-4 sm:h-5 px-1 sm:px-1.5 text-[8px] sm:text-[9px]"
                      >
                        ID
                      </Badge>
                      <span className="text-gray-700 dark:text-gray-300 truncate text-[8px] sm:text-[9px]">
                        {order.subscriber_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 truncate font-medium">
                        {order.subscriber?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {order.subscriber?.phone || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-start gap-1 sm:gap-1.5">
                      <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300 line-clamp-2 break-words">
                        {order.delivery_address}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chef Info */}
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 sm:p-2.5 md:p-3">
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                    <p className="font-medium text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">
                      Chef Details
                    </p>
                    <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="space-y-0.5 sm:space-y-1 text-[9px] sm:text-[10px] md:text-xs">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Badge
                        variant="outline"
                        className="h-4 sm:h-5 px-1 sm:px-1.5 text-[8px] sm:text-[9px]"
                      >
                        ID
                      </Badge>
                      <span className="text-orange-700 dark:text-orange-300 truncate text-[8px] sm:text-[9px]">
                        {order.chef_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <ChefHat className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span className="text-orange-700 dark:text-orange-300 truncate font-medium">
                        {order.chef?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span className="text-orange-700 dark:text-orange-300">
                        {order.chef?.experience || 0} years exp.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Meal Info */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 sm:p-2.5 md:p-3">
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                    <p className="font-medium text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white">
                      Meal Details
                    </p>
                    <Utensils className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                  </div>
                  {order.meal ? (
                    <div className="space-y-0.5 sm:space-y-1 text-[9px] sm:text-[10px] md:text-xs">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <Badge
                          variant="outline"
                          className="h-4 sm:h-5 px-1 sm:px-1.5 text-[8px] sm:text-[9px]"
                        >
                          ID
                        </Badge>
                        <span className="text-green-700 dark:text-green-300 truncate text-[8px] sm:text-[9px]">
                          {order.meal_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <Utensils className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                        <span className="text-green-700 dark:text-green-300 font-medium truncate">
                          {order.meal.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                        <span className="text-green-700 dark:text-green-300">
                          Rs.{order.meal.price} per item
                        </span>
                      </div>
                      {order.meal.description && (
                        <div className="flex items-start gap-1 sm:gap-1.5">
                          <Info className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 mt-0.5" />
                          <span className="text-green-700 dark:text-green-300 line-clamp-2">
                            {order.meal.description}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] md:text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Meal not found</span>
                    </div>
                  )}
                </div>

                <Separator className="my-2" />

                {/* Status Update */}
                <div className="pt-1">
                  <Select
                    defaultValue={order.status}
                    onValueChange={(value) => {
                      handleOrderStatusUpdate(order._id, value);
                    }}
                    disabled={updateOrderStatusMutation.isPending}
                  >
                    <SelectTrigger className="w-full h-7 sm:h-8 md:h-9 lg:h-10 text-[10px] sm:text-xs md:text-sm font-medium bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-2 hover:border-primary transition-all duration-200">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent className="border-2 shadow-xl">
                      <SelectItem
                        value="pending"
                        className="text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
                          <span>Pending</span>
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="confirmed"
                        className="text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                          <span>Confirmed</span>
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="preparing"
                        className="text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                          <span>Preparing</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ready" className="text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Package className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                          <span>Ready</span>
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="delivered"
                        className="text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                          <span>Delivered</span>
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="cancelled"
                        className="text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Ban className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                          <span>Cancelled</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <CardContent className="py-6 sm:py-8 md:py-12">
            <div className="text-center space-y-2 sm:space-y-3 md:space-y-4">
              <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || orderFilter !== "all"
                    ? "No matching orders"
                    : "No orders found"}
                </h3>
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  {searchQuery || orderFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "No chef orders have been placed yet."}
                </p>
              </div>
              {(searchQuery || orderFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 sm:h-8 md:h-9 text-[10px] sm:text-xs md:text-sm"
                >
                  <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2" />
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
