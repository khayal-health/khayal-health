import { useMemo } from "react";
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
  ChefHat,
  CheckCircle,
  XCircle,
  Package,
  Award,
  Calendar,
  Utensils,
  Search,
  RotateCcw,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import { API_ENDPOINTS } from "@/lib/config";
import type { Chef } from "./types";

interface ChefMenusProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function ChefMenus({
  searchQuery,
  setSearchQuery,
}: ChefMenusProps) {
  const { data: chefs = [] } = useQuery<Chef[]>({
    queryKey: [API_ENDPOINTS.ADMIN_CHEFS],
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const filteredChefs = useMemo(() => {
    if (!searchQuery.trim()) return chefs;

    const query = searchQuery.toLowerCase();
    return chefs.filter(
      (chef) =>
        chef.name?.toLowerCase().includes(query) ||
        chef.phone?.toLowerCase().includes(query) ||
        chef.email?.toLowerCase().includes(query) ||
        chef.degree?.toLowerCase().includes(query) ||
        chef.id?.toString().toLowerCase().includes(query) ||
        chef._id?.toString().toLowerCase().includes(query) ||
        chef.meals?.some(
          (meal) =>
            meal.name.toLowerCase().includes(query) ||
            meal.description.toLowerCase().includes(query) ||
            meal._id?.toString().toLowerCase().includes(query) ||
            meal.id?.toString().toLowerCase().includes(query) ||
            meal.ingredients?.some((ingredient) =>
              ingredient.toLowerCase().includes(query)
            )
        )
    );
  }, [chefs, searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const totalMeals = useMemo(() => {
    return filteredChefs.reduce(
      (total, chef) => total + (chef.meals?.length || 0),
      0
    );
  }, [filteredChefs]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search Bar */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by chef name, chef ID, meal name, meal ID, ingredients..."
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
          Chef Menus
        </h3>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          <span>
            {filteredChefs.length}{" "}
            {filteredChefs.length === 1 ? "chef" : "chefs"}
          </span>
          <span>•</span>
          <span>
            {totalMeals} {totalMeals === 1 ? "meal" : "meals"}
          </span>
        </div>
      </div>

      {filteredChefs.length > 0 ? (
        filteredChefs.map((chef) => (
          <Card
            key={chef._id || chef.id}
            className="border border-gray-200 dark:border-gray-800"
          >
            <CardHeader>
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-lg flex-shrink-0">
                  <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                    {chef.name}'s Menu
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs space-y-0.5 sm:space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Hash className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span className="truncate">
                        ID: {chef._id || chef.id}
                      </span>
                    </div>
                    <div>{chef.meals?.length || 0} items available</div>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {chef.meals && chef.meals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {chef.meals.map((meal) => (
                    <Card
                      key={meal._id || meal.id}
                      className="hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div className="space-y-3">
                          {/* Meal Header */}
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2">
                                {meal.name}
                              </h4>
                              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-1">
                                <Hash className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                                <span className="truncate">
                                  ID: {meal._id || meal.id}
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium self-start sm:self-auto"
                            >
                              PKR {meal.price}
                            </Badge>
                          </div>

                          {/* Description */}
                          {meal.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">
                              {meal.description}
                            </p>
                          )}

                          {/* Ingredients */}
                          {meal.ingredients && meal.ingredients.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <Package className="h-3 w-3 text-primary flex-shrink-0" />
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                  Ingredients
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {meal.ingredients.map((ingredient, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-[10px] sm:text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                  >
                                    {ingredient}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dietary Information */}
                          {meal.dietary_info && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <Award className="h-3 w-3 text-primary flex-shrink-0" />
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                  Dietary Info
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {meal.dietary_info
                                  .split(",")
                                  .map((info, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-[10px] sm:text-xs px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                                    >
                                      {info.trim()}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Meal Visibility Status */}
                          {typeof meal.meal_visibility === "boolean" && (
                            <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                              {meal.meal_visibility ? (
                                <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                              )}
                              <span
                                className={`text-xs ${
                                  meal.meal_visibility
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : "text-red-700 dark:text-red-300"
                                }`}
                              >
                                {meal.meal_visibility
                                  ? "Visible to customers"
                                  : "Hidden from customers"}
                              </span>
                            </div>
                          )}

                          {/* Created Date */}
                          {meal.created_at && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                Added {format(new Date(meal.created_at), "PPp")}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Utensils className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      No menu items available
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {chef.name} hasn't added any meals to their menu yet.
                    </p>
                  </div>
                </div>
              )}
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
                    : "No menus to display"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery
                    ? "Try adjusting your search criteria."
                    : "No chefs found with menu items."}
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
    </div>
  );
}
