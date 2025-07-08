import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2,
  ClipboardList,
  Plus,
  Menu,
  Power,
  PowerOff,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

// Import the modular components
import OrdersTab from "./chef-tabs/OrdersTab";
import AddMealTab from "./chef-tabs/AddMealTab";
import YourMenuTab from "./chef-tabs/YourMenuTab";

export default function ChefView() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localAvailability, setLocalAvailability] = useState(
    user?.available ?? false
  );

  // Update local availability when user data changes
  useEffect(() => {
    if (user?.available !== undefined) {
      setLocalAvailability(user.available);
    }
  }, [user?.available]);

  // Availability toggle mutation
  const availabilityMutation = useMutation({
    mutationFn: async (available: boolean) => {
      const response = await apiRequest(
        "PATCH",
        API_ENDPOINTS.USER_AVAILABILITY,
        {
          available,
        }
      );
      return response.json();
    },
    onMutate: async (newAvailability) => {
      // Optimistic update
      setLocalAvailability(newAvailability);
    },
    onSuccess: (newAvailability) => {
      toast({
        title: "Availability Updated",
        description: `You are now ${
          newAvailability ? "available" : "unavailable"
        } for orders`,
        variant: "default",
      });

      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error, variables) => {
      // Revert optimistic update on error
      setLocalAvailability(!variables);
      console.error("Failed to update availability:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update availability status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAvailabilityToggle = () => {
    const newAvailability = !localAvailability;
    availabilityMutation.mutate(newAvailability);
  };

  // Handle auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no user, prompt to log in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">
          Please log in to continue
        </p>
      </div>
    );
  }

  // Fetch chef's existing meals
  const { data: meals, isLoading: mealsLoading } = useQuery({
    queryKey: ["chef-meals"],
    queryFn: async () => {
      const res = await apiRequest("GET", API_ENDPOINTS.MY_MEALS);
      return res.json();
    },
    enabled: !!user,
    staleTime: Infinity,
    retry: false,
  });

  // Fetch chef's incoming orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["chef-orders", user._id],
    queryFn: async () => {
      const res = await apiRequest("GET", API_ENDPOINTS.ORDERS_CHEF);
      return res.json();
    },
    enabled: !!user._id,
    staleTime: Infinity,
    retry: false,
  });

  // Show loading spinner if data is still loading
  if (mealsLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Enhanced Welcome Header with Availability Toggle */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                Welcome back, {user?.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                Manage your culinary services and orders
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs sm:text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  ID: {user._id}
                </span>
                <span
                  className={`font-semibold ${
                    user.approval_status === "approved"
                      ? "text-green-600 dark:text-green-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  Status: {user.approval_status || "pending"}
                </span>
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="flex flex-col items-start sm:items-end gap-2">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Availability Status
                  </p>
                  <p
                    className={`text-xs ${
                      localAvailability
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {localAvailability
                      ? "Available for orders"
                      : "Currently unavailable"}
                  </p>
                </div>
                <Button
                  onClick={handleAvailabilityToggle}
                  disabled={availabilityMutation.isPending}
                  variant={localAvailability ? "default" : "secondary"}
                  size="sm"
                  className={`
                    flex items-center gap-2 min-w-[120px] transition-all duration-200
                    ${
                      localAvailability
                        ? "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                        : "bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700"
                    }
                  `}
                >
                  {availabilityMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : localAvailability ? (
                    <Power className="h-4 w-4" />
                  ) : (
                    <PowerOff className="h-4 w-4" />
                  )}
                  <span className="text-xs font-medium">
                    {localAvailability ? "Available" : "Unavailable"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Services Tabs - Cleaner Design */}
        <Tabs defaultValue="orders" className="w-full">
          {/* Simplified Tab Navigation */}
          <TabsList className="w-full grid grid-cols-3 gap-0 p-0 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
            <TabsTrigger
              value="orders"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-4 px-3 sm:px-6 rounded-l-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              <ClipboardList className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium">Orders</span>
            </TabsTrigger>
            <TabsTrigger
              value="add-meal"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-4 px-3 sm:px-6 border-x border-gray-200 dark:border-gray-800 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium">Add Meal</span>
            </TabsTrigger>
            <TabsTrigger
              value="menu"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-4 px-3 sm:px-6 rounded-r-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              <Menu className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium">Your Menu</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents - Removed extra spacing */}
          <TabsContent value="orders" className="mt-0 focus:outline-none">
            <OrdersTab
              orders={orders || []}
              meals={meals || []}
              user={user}
              isLoading={ordersLoading}
            />
          </TabsContent>

          <TabsContent value="add-meal" className="mt-0 focus:outline-none">
            <AddMealTab />
          </TabsContent>

          <TabsContent value="menu" className="mt-0 focus:outline-none">
            <YourMenuTab meals={meals || []} isLoading={mealsLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
