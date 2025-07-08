import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  ChefHat,
  DollarSign,
  MapPin,
  ShoppingBag,
  Utensils,
  RotateCcw,
} from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { API_ENDPOINTS } from "@/lib/config";
import type { FoodServiceOrder as Order } from "@/types/food-service.types";

interface OrdersProps {
  user: any;
}

type OrderStatus =
  | "all"
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export class OrdersService {
  formatPrice = (price: number): string => {
    return `PKR ${price.toLocaleString()}`;
  };

  formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), "PPP");
    } catch {
      return "N/A";
    }
  };

  calculateTotalOrderAmount = (orders: Order[]): number => {
    return orders.reduce((total: number, order: Order) => {
      return total + (order.total_price || 0);
    }, 0);
  };

  getStatusBadgeProps = (status: string) => {
    switch (status) {
      case "delivered":
        return {
          variant: "default" as const,
          className:
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        };
      case "pending":
        return {
          variant: "secondary" as const,
          className:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        };
      default:
        return {
          variant: "secondary" as const,
          className:
            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        };
    }
  };

  formatStatusText = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
}

export const OrdersComponent: React.FC<OrdersProps> = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState<OrderStatus>("all");
  const ordersService = new OrdersService();

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: [API_ENDPOINTS.ORDERS_SUBSCRIBER],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const orderStats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      ready: orders.filter((o) => o.status === "ready").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    };
  }, [orders]);

  const deliveredOrdersTotal = useMemo(() => {
    const deliveredOrders = orders.filter(
      (order) => order.status === "delivered"
    );
    return ordersService.calculateTotalOrderAmount(deliveredOrders);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (orderFilter !== "all") {
      filtered = filtered.filter((order) => order.status === orderFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.chef?.name.toLowerCase().includes(query) ||
          order.meal?.name.toLowerCase().includes(query) ||
          order._id.toString().toLowerCase().includes(query) ||
          order.delivery_address?.toLowerCase().includes(query)
      );
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [orders, orderFilter, searchQuery]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setOrderFilter("all");
  }, []);

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
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "cancelled":
        return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const totalOrderAmount =
    ordersService.calculateTotalOrderAmount(filteredOrders);

  if (ordersLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Order Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                  Total Orders
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {orderStats.total}
                </p>
              </div>
              <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-blue-600 dark:text-blue-400 flex-shrink-0" />
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
                  {orderStats.pending}
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300 truncate">
                  Preparing
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {orderStats.preparing}
                </p>
              </div>
              <ChefHat className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                  Delivered
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  {orderStats.delivered}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Filters */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders by chef, meal, ID, or delivery address..."
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
                  label: "All Orders",
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
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={orderFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrderFilter(filter.key as OrderStatus)}
                  className="flex items-center gap-1 sm:gap-2 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs"
                >
                  <div
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${filter.color}`}
                  />
                  <span className="truncate">{filter.label}</span>
                  {filter.count > 0 && (
                    <span
                      className={`px-1 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
          {orderFilter === "all"
            ? "All Orders"
            : `${
                orderFilter.replace(/_/g, " ").charAt(0).toUpperCase() +
                orderFilter.replace(/_/g, " ").slice(1)
              } Orders`}
        </h3>
        <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          <span>
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "order" : "orders"} found
          </span>
          {orderFilter === "delivered" && filteredOrders.length > 0 && (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Total: {ordersService.formatPrice(totalOrderAmount)}
            </span>
          )}
          {orderFilter !== "delivered" && orderStats.delivered > 0 && (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Delivered: {ordersService.formatPrice(deliveredOrdersTotal)}
            </span>
          )}
        </div>
      </div>

      {/* Order Cards */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredOrders.map((order: Order) => (
            <Card
              key={order._id}
              className="relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg"
            >
              <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        <div className="font-mono text-xs break-all">
                          Order #{order._id}
                        </div>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        {order.timestamp
                          ? format(new Date(order.timestamp), "PPp")
                          : "N/A"}
                      </CardDescription>
                    </div>
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium border ${getStatusColor(
                        order.status
                      )} flex-shrink-0 ml-2`}
                    >
                      {getStatusIcon(order.status)}
                      <span className="capitalize whitespace-nowrap">
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="space-y-2 sm:space-y-3">
                  <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="font-medium text-xs sm:text-sm mb-2 text-gray-900 dark:text-white">
                      Chef & Meal
                    </p>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="text-orange-700 dark:text-orange-300">
                          Chef: {order.chef?.name || "Unknown chef"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Utensils className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="text-orange-700 dark:text-orange-300">
                          Meal: {order.meal?.name || "Unknown meal"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="text-orange-700 dark:text-orange-300">
                            Quantity: {order.quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="font-medium text-orange-900 dark:text-orange-100">
                            {ordersService.formatPrice(order.total_price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {order.delivery_address && (
                    <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium text-xs sm:text-sm mb-2 text-gray-900 dark:text-white">
                        Delivery Address
                      </p>
                      <div className="flex items-start gap-2 text-xs sm:text-sm">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {order.delivery_address}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || orderFilter !== "all"
                    ? "No matching orders"
                    : "No orders found"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery || orderFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "You haven't placed any orders yet."}
                </p>
              </div>
              {(searchQuery || orderFilter !== "all") && (
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
};
