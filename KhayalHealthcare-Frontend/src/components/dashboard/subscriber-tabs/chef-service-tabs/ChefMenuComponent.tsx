import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  Loader2,
  ChefHat,
  Minus,
  Plus,
  ShoppingCart,
  Search,
  XCircle,
  RotateCcw,
  Hash,
  Package,
  Award,
  Calendar,
  Utensils,
  CheckCircle,
  Info,
  MapPin,
  User,
  Tag,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";

import type {
  FoodServiceChef as Chef,
  FoodServiceMeal as Meal,
  OrderMutationParams,
  CreateOrderData,
} from "@/types/food-service.types";

interface ChefMenuProps {
  user: any;
}

interface CouponValidateResponse {
  valid: boolean;
  message: string;
  discount_amount?: number;
  final_amount?: number;
  user_usage_count?: number;
  user_remaining_uses?: number;
}

interface CouponApplyResponse {
  success: boolean;
  message: string;
  discount_applied: number;
  final_amount: number;
}

export class ChefMenuService {
  private user: any;
  private mealQuantities: { [key: string]: number } = {};

  constructor(user: any) {
    this.user = user;
  }

  // Quantity management methods
  getMealQuantity = (mealId: string): number => {
    return this.mealQuantities[mealId] || 1;
  };

  setMealQuantity = (mealId: string, quantity: number): void => {
    this.mealQuantities[mealId] = Math.max(1, quantity);
  };

  clearQuantities = (): void => {
    this.mealQuantities = {};
  };

  // Business logic methods
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

  // Order creation logic - Create order with original price, discount will be applied separately
  createOrderData = (params: OrderMutationParams): CreateOrderData => {
    const baseTotal = params.price * params.quantity;

    const orderData: CreateOrderData = {
      meal_id: params.mealId,
      chef_id: params.chefId,
      subscriber_id: this.user!._id,
      quantity: params.quantity,
      total_price: baseTotal, // Use base price, discount will be applied via coupon API
      delivery_address: this.user!.address || "Address not provided",
    };

    return orderData;
  };
}

// Order Confirmation Dialog Component with Coupon Support
interface OrderConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (couponCode?: string, discountAmount?: number) => void;
  meal: Meal;
  chef: Chef;
  quantity: number;
  totalPrice: number;
  formatPrice: (price: number) => string;
  isLoading: boolean;
  user: any;
}

const OrderConfirmationDialog: React.FC<OrderConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  meal,
  chef,
  quantity,
  totalPrice,
  formatPrice,
  isLoading,
  user,
}) => {
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string>("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponValidated, setCouponValidated] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState("");

  const finalPrice = totalPrice - couponDiscount;

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponMessage("Please enter a coupon code");
      return;
    }

    setIsValidatingCoupon(true);
    setCouponMessage("");

    try {
      const response = await apiRequest(
        "POST",
        API_ENDPOINTS.COUPONS_VALIDATE,
        {
          code: couponCode.trim().toUpperCase(),
          order_total: totalPrice,
        }
      );

      const data: CouponValidateResponse = await response.json();

      if (data.valid && data.discount_amount !== undefined) {
        setCouponDiscount(data.discount_amount);
        setCouponMessage(data.message);
        setCouponValidated(true);
        setAppliedCouponCode(couponCode.trim().toUpperCase());
        toast({
          title: "Coupon applied!",
          description: `You saved ${formatPrice(data.discount_amount)}`,
        });
      } else {
        setCouponMessage(data.message);
        setCouponDiscount(0);
        setCouponValidated(false);
        setAppliedCouponCode("");
      }
    } catch (error) {
      setCouponMessage("Failed to validate coupon");
      setCouponDiscount(0);
      setCouponValidated(false);
      setAppliedCouponCode("");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponMessage("");
    setCouponValidated(false);
    setAppliedCouponCode("");
  };

  const handleConfirm = () => {
    onConfirm(
      couponValidated ? appliedCouponCode : undefined,
      couponValidated ? couponDiscount : undefined
    );
  };

  const handleClose = () => {
    removeCoupon();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Confirm Your Order
          </DialogTitle>
          <DialogDescription className="text-sm">
            Please review your order details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
          {/* Meal Details */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground">
              Meal Details
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs sm:text-sm font-medium flex-1 break-words">
                  {meal.name}
                </span>
                <span className="text-xs sm:text-sm flex-shrink-0">
                  {formatPrice(meal.price)} each
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                <span>Quantity</span>
                <span>{quantity}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs sm:text-sm">
                  Subtotal
                </span>
                <span className="font-semibold text-xs sm:text-sm">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Coupon Section */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground">
              Have a Coupon?
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4 space-y-3">
              {!couponValidated ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      className="pl-8 sm:pl-10 text-xs sm:text-sm h-8 sm:h-10"
                      disabled={isValidatingCoupon}
                    />
                  </div>
                  <Button
                    onClick={validateCoupon}
                    disabled={isValidatingCoupon || !couponCode.trim()}
                    size="sm"
                    className="h-8 sm:h-10"
                  >
                    {isValidatingCoupon ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">
                      {appliedCouponCode}
                    </span>
                  </div>
                  <Button
                    onClick={removeCoupon}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {couponMessage && (
                <p
                  className={`text-xs sm:text-sm ${
                    couponValidated
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {couponMessage}
                </p>
              )}

              {couponDiscount > 0 && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Discount Applied
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                    - {formatPrice(couponDiscount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Final Total */}
          <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-3 sm:p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm sm:text-base">
                Total Amount
              </span>
              <div className="text-right">
                {couponDiscount > 0 && (
                  <span className="text-xs sm:text-sm text-muted-foreground line-through block">
                    {formatPrice(totalPrice)}
                  </span>
                )}
                <span className="font-bold text-primary text-sm sm:text-base">
                  {formatPrice(finalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Chef Details */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground">
              Chef Information
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs sm:text-sm break-words">
                  {chef.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground break-all">
                  Chef ID: {chef.id}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground">
              Delivery Information
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs sm:text-sm break-words">
                  {user?.name || "N/A"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm break-words">
                  {user?.address || "Address not provided"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Confirm Order ({formatPrice(finalPrice)})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Meal Details Popover Component (unchanged)
interface MealDetailsPopoverProps {
  meal: Meal;
  children: React.ReactNode;
}

const MealDetailsPopover: React.FC<MealDetailsPopoverProps> = ({
  meal,
  children,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[280px] sm:w-80 max-w-[95vw] max-h-[70vh] overflow-y-auto"
        align="start"
        side="top"
        sideOffset={5}
      >
        <div className="space-y-2 sm:space-y-3">
          <div>
            <h4 className="font-semibold text-xs sm:text-sm mb-1">
              About this meal
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground break-words">
              {meal.description}
            </p>
          </div>

          {meal.ingredients && meal.ingredients.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Package className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  Ingredients
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {meal.ingredients.map((ingredient, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 break-words"
                  >
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {meal.dietary_info && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Award className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  Dietary Information
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {meal.dietary_info.split(",").map((info, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 break-words"
                  >
                    {info.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const ChefMenuComponent: React.FC<ChefMenuProps> = ({ user }) => {
  const chefMenuService = new ChefMenuService(user);
  const [searchQuery, setSearchQuery] = useState("");
  const [mealQuantities, setMealQuantities] = useState<{
    [key: string]: number;
  }>({});
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    meal?: Meal;
    chef?: Chef;
  }>({ isOpen: false });

  // Sync local state with service
  const getMealQuantity = (mealId: string) => mealQuantities[mealId] || 1;
  const setMealQuantity = (mealId: string, quantity: number) => {
    setMealQuantities((prev) => ({
      ...prev,
      [mealId]: Math.max(1, quantity),
    }));
  };

  // Fetch chefs and their meals
  const { data: chefs = [], isLoading: chefsLoading } = useQuery<Chef[]>({
    queryKey: [API_ENDPOINTS.CHEFS_WITH_MEALS],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Filter chefs based on search query
  const filteredChefs = useMemo(() => {
    if (!searchQuery.trim()) return chefs;

    const query = searchQuery.toLowerCase();
    return chefs.filter(
      (chef) =>
        chef.name?.toLowerCase().includes(query) ||
        chef.id?.toString().toLowerCase().includes(query) ||
        chef.specialties?.some((specialty) =>
          specialty.toLowerCase().includes(query)
        ) ||
        chef.meals?.some(
          (meal) =>
            meal.name.toLowerCase().includes(query) ||
            meal.description.toLowerCase().includes(query) ||
            meal._id?.toString().toLowerCase().includes(query) ||
            meal.ingredients?.some((ingredient) =>
              ingredient.toLowerCase().includes(query)
            ) ||
            meal.dietary_info?.toLowerCase().includes(query)
        )
    );
  }, [chefs, searchQuery]);

  // Filter out chefs with no meals and get statistics
  const chefsWithMeals =
    filteredChefs?.filter(
      (chef: Chef) => chef.meals && chef.meals.length > 0
    ) || [];

  const totalMeals = useMemo(() => {
    return chefsWithMeals.reduce(
      (total, chef) => total + (chef.meals?.length || 0),
      0
    );
  }, [chefsWithMeals]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const orderMutation = useMutation({
    mutationFn: async (
      params: OrderMutationParams & {
        couponCode?: string;
        discountAmount?: number;
      }
    ) => {
      const orderData = chefMenuService.createOrderData(params);
      const res = await apiRequest(
        "POST",
        API_ENDPOINTS.ORDERS_CREATE,
        orderData
      );
      const orderResponse = await res.json();

      if (params.couponCode && orderResponse.order?._id) {
        try {
          const couponParams = new URLSearchParams({
            code: params.couponCode,
            order_id: orderResponse.order._id,
            order_total: orderData.total_price.toString(),
          });

          const couponRes = await apiRequest(
            "POST",
            `${API_ENDPOINTS.COUPONS_APPLY}?${couponParams.toString()}`,
            {}
          );

          const couponData: CouponApplyResponse = await couponRes.json();

          if (couponData.success) {
            orderResponse.discount_applied = couponData.discount_applied;
            orderResponse.final_amount = couponData.final_amount;
          }
        } catch (couponError) {
          console.error("🔥 Coupon application failed:", couponError);
        }
      }

      return orderResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ORDERS_SUBSCRIBER],
      });

      const message = data.discount_applied
        ? `Your order has been sent to the chef and admin. Discount of PKR ${data.discount_applied.toLocaleString()} has been applied!`
        : "Your order has been sent to the chef and admin";

      toast({
        title: "Order Placed Successfully!",
        description: message,
      });
      setMealQuantities({});
      setConfirmationDialog({ isOpen: false });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOrderClick = (meal: Meal, chef: Chef) => {
    setConfirmationDialog({ isOpen: true, meal, chef });
  };

  const handleConfirmOrder = (couponCode?: string, discountAmount?: number) => {
    if (confirmationDialog.meal && confirmationDialog.chef) {
      orderMutation.mutate({
        mealId: confirmationDialog.meal._id,
        chefId: confirmationDialog.chef.id,
        price: confirmationDialog.meal.price,
        quantity: getMealQuantity(confirmationDialog.meal._id),
        couponCode,
        discountAmount,
      });
    }
  };

  if (chefsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search Bar */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                id="chef-menu-search"
                name="chef-menu-search"
                type="search"
                autoComplete="off"
                placeholder="Search by chef name, chef ID, meal name, meal ID, ingredients, dietary info..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-10 text-xs sm:text-sm h-8 sm:h-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
          Available Menus
        </h3>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          <span>
            {chefsWithMeals.length}{" "}
            {chefsWithMeals.length === 1 ? "chef" : "chefs"}
          </span>
          <span>•</span>
          <span>
            {totalMeals} {totalMeals === 1 ? "meal" : "meals"}
          </span>
        </div>
      </div>

      {/* Chef Menus */}
      {chefsWithMeals.length > 0 ? (
        chefsWithMeals.map((chef: Chef) => (
          <Card
            key={chef.id}
            className="border border-gray-200 dark:border-gray-800"
          >
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-lg flex-shrink-0">
                  <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white break-words">
                    {chef.name}'s Kitchen
                  </CardTitle>
                  <div className="text-[10px] sm:text-xs space-y-0.5 sm:space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Hash className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span className="break-all">ID: {chef.id}</span>
                    </div>
                    <div>{chef.meals?.length || 0} items available</div>
                    {chef.experience && (
                      <div>{chef.experience} years of experience</div>
                    )}
                    {chef.degree && <div>Degree: {chef.degree}</div>}
                  </div>
                  {chef.specialties && chef.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {chef.specialties.map((specialty, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[10px] sm:text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 break-words"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {chef.meals?.map((meal: Meal) => (
                  <MealCard
                    key={meal._id}
                    meal={meal}
                    chef={chef}
                    quantity={getMealQuantity(meal._id)}
                    setQuantity={(quantity) =>
                      setMealQuantity(meal._id, quantity)
                    }
                    onOrderClick={() => handleOrderClick(meal, chef)}
                    formatPrice={chefMenuService.formatPrice}
                    formatDate={chefMenuService.formatDate}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Utensils className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery
                    ? "No matching menus found"
                    : "No meals available"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery
                    ? "Try adjusting your search criteria."
                    : "No chefs found with menu items at the moment."}
                </p>
              </div>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSearch}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                >
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Clear Search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Confirmation Dialog */}
      {confirmationDialog.meal && confirmationDialog.chef && (
        <OrderConfirmationDialog
          isOpen={confirmationDialog.isOpen}
          onClose={() => setConfirmationDialog({ isOpen: false })}
          onConfirm={handleConfirmOrder}
          meal={confirmationDialog.meal}
          chef={confirmationDialog.chef}
          quantity={getMealQuantity(confirmationDialog.meal._id)}
          totalPrice={
            confirmationDialog.meal.price *
            getMealQuantity(confirmationDialog.meal._id)
          }
          formatPrice={chefMenuService.formatPrice}
          isLoading={orderMutation.isPending}
          user={user}
        />
      )}
    </div>
  );
};

// Meal Card Component remains unchanged
interface MealCardProps {
  meal: Meal;
  chef: Chef;
  quantity: number;
  setQuantity: (quantity: number) => void;
  onOrderClick: () => void;
  formatPrice: (price: number) => string;
  formatDate: (dateString: string) => string;
}

const MealCard: React.FC<MealCardProps> = ({
  meal,
  quantity,
  setQuantity,
  onOrderClick,
  formatPrice,
}) => {
  const totalPrice = meal.price * quantity;

  return (
    <Card className="hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <CardContent className="p-3 sm:p-4 lg:p-5 flex flex-col h-full">
        <div className="space-y-2 sm:space-y-3 flex-1">
          {/* Meal Header */}
          <div className="space-y-1 sm:space-y-2">
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-900 dark:text-white line-clamp-2 flex-1 break-words">
                {meal.name}
              </h4>
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs font-medium flex-shrink-0"
              >
                {formatPrice(meal.price)}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground">
              <Hash className="h-2 w-2 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3 flex-shrink-0" />
              <span className="break-all">ID: {meal._id}</span>
            </div>
          </div>

          {/* Description with Details Button */}
          <div className="space-y-1 sm:space-y-2">
            <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground line-clamp-2 break-words">
              {meal.description}
            </p>
            <MealDetailsPopover meal={meal}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 sm:h-7 text-[10px] sm:text-xs px-1.5 sm:px-2 hover:bg-primary/10 w-fit"
              >
                <Info className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                View Details
              </Button>
            </MealDetailsPopover>
          </div>

          {/* Availability Status */}
          {typeof meal.meal_visibility === "boolean" && (
            <div className="flex items-center gap-1.5">
              {meal.meal_visibility ? (
                <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <span
                className={`text-[9px] sm:text-[10px] lg:text-xs ${
                  meal.meal_visibility
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-red-700 dark:text-red-300"
                }`}
              >
                {meal.meal_visibility
                  ? "Available for order"
                  : "Currently unavailable"}
              </span>
            </div>
          )}

          {/* Created Date */}
          {meal.created_at && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground">
                Added {format(new Date(meal.created_at), "PP")}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Section with Quantity and Order */}
        <div className="space-y-2 sm:space-y-3 mt-auto pt-2 sm:pt-3">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white">
              Quantity
            </span>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 border-gray-300 dark:border-gray-600 p-0 min-w-[20px] sm:min-w-[24px] md:min-w-[28px]"
                onClick={() => setQuantity(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
              </Button>
              <span className="w-5 sm:w-6 md:w-8 text-center font-semibold text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-white min-w-[20px] sm:min-w-[24px] md:min-w-[32px]">
                {quantity}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 border-gray-300 dark:border-gray-600 p-0 min-w-[20px] sm:min-w-[24px] md:min-w-[28px]"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
              </Button>
            </div>
          </div>

          {/* Total Price Display */}
          <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 rounded-lg p-2">
            <span className="text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white">
              Total Price
            </span>
            <span className="font-bold text-xs sm:text-sm text-primary">
              {formatPrice(totalPrice)}
            </span>
          </div>

          {/* Order Button */}
          <Button
            className="w-full bg-primary hover:bg-primary/90 h-8 sm:h-9 text-xs sm:text-sm"
            onClick={onOrderClick}
            disabled={!meal.meal_visibility}
            size="sm"
          >
            {!meal.meal_visibility ? (
              <span className="text-xs sm:text-sm">Currently Unavailable</span>
            ) : (
              <>
                <ShoppingCart className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Order Now</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
