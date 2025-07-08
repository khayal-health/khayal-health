import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"; // Add this import
import {
  Loader2,
  Trash2,
  Edit,
  X,
  Check,
  DollarSign,
  Clock,
  Utensils,
  Leaf,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";

// Zod schema for meal form
const mealFormSchema = z.object({
  name: z.string().min(1, "Meal name is required"),
  description: z.string().min(1, "Description is required"),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price must be zero or positive"),
  ingredients: z.array(z.string()).default([]),
  dietaryInfo: z.string().optional(),
});

type MealFormData = z.infer<typeof mealFormSchema>;

interface YourMenuTabProps {
  meals: any[];
  isLoading?: boolean;
}

export default function YourMenuTab({ meals, isLoading }: YourMenuTabProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<any>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [mealToUpdate, setMealToUpdate] = useState<any>(null);

  // Initialize React Hook Form for Update
  const updateForm = useForm<MealFormData>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      ingredients: [],
      dietaryInfo: "",
    },
  });

  // Mutation: update meal visibility
  const updateVisibilityMutation = useMutation({
    mutationFn: async ({
      mealId,
      visibility,
    }: {
      mealId: string;
      visibility: boolean;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `${API_ENDPOINTS.MEALS}/${mealId}/visibility`,
        { meal_visibility: visibility }
      );
      return res.json();
    },
    onSuccess: (updatedMeal) => {
      queryClient.invalidateQueries({
        queryKey: ["chef-meals"],
      });
      toast({
        title: "Success",
        description: `Meal is now ${
          updatedMeal.meal_visibility ? "visible" : "hidden"
        } to customers`,
      });
    },
    onError: (error: Error) => {
      console.error("Update visibility error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update meal visibility",
        variant: "destructive",
      });
    },
  });

  // Mutation: update a meal
  const updateMealMutation = useMutation({
    mutationFn: async ({
      mealId,
      data,
    }: {
      mealId: string;
      data: MealFormData;
    }) => {
      const payload = {
        name: data.name,
        description: data.description,
        price: Number(data.price),
        ingredients: data.ingredients || [],
        dietary_info: data.dietaryInfo || null,
      };

      const res = await apiRequest(
        "PUT",
        API_ENDPOINTS.MEAL_UPDATE(mealId),
        payload
      );
      return res.json();
    },
    onSuccess: (updatedMeal) => {
      queryClient.invalidateQueries({
        queryKey: ["chef-meals"],
      });
      toast({
        title: "Success",
        description: "Meal updated successfully",
      });
      setUpdateDialogOpen(false);
      setMealToUpdate(null);
      updateForm.reset();
    },
    onError: (error: Error) => {
      console.error("Update meal error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update meal",
        variant: "destructive",
      });
    },
  });

  // Mutation: delete a meal
  const deleteMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const res = await apiRequest("DELETE", API_ENDPOINTS.MEAL_DELETE(mealId));
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chef-meals"],
      });
      toast({
        title: "Success",
        description: "Meal deleted successfully",
      });
      setDeleteDialogOpen(false);
      setMealToDelete(null);
    },
    onError: (error: Error) => {
      console.error("Delete meal error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete meal",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setMealToDelete(null);
    },
  });

  // Event handlers
  const handleDeleteClick = (meal: any) => {
    setMealToDelete(meal);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (mealToDelete) {
      deleteMealMutation.mutate(mealToDelete._id || mealToDelete.id);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setMealToDelete(null);
  };

  const handleUpdateClick = (meal: any) => {
    setMealToUpdate(meal);
    updateForm.reset({
      name: meal.name || "",
      description: meal.description || "",
      price: meal.price || 0,
      ingredients: meal.ingredients || [],
      dietaryInfo: meal.dietary_info || "",
    });
    setUpdateDialogOpen(true);
  };

  const handleUpdateCancel = () => {
    setUpdateDialogOpen(false);
    setMealToUpdate(null);
    updateForm.reset();
  };

  const onUpdateSubmit = (data: MealFormData) => {
    if (mealToUpdate) {
      updateMealMutation.mutate({
        mealId: mealToUpdate._id || mealToUpdate.id,
        data,
      });
    }
  };

  const handleVisibilityToggle = (meal: any, newVisibility: boolean) => {
    updateVisibilityMutation.mutate({
      mealId: meal._id || meal.id,
      visibility: newVisibility,
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your Menu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Your Menu
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Manage your delicious meal offerings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {meals?.length || 0} {meals?.length === 1 ? "Meal" : "Meals"}
              </Badge>
              <Badge variant="outline" className="text-xs sm:text-sm">
                {meals?.filter((meal) => meal.meal_visibility).length || 0}{" "}
                Visible
              </Badge>
            </div>
          </div>
        </div>

        {/* Meals Grid */}
        {meals && meals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {meals.map((meal: any) => (
              <Card
                key={meal._id || meal.id}
                className={`group hover:shadow-lg transition-all duration-300 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${
                  !meal.meal_visibility ? "opacity-75 border-dashed" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg sm:text-xl line-clamp-2 group-hover:text-primary transition-colors">
                        {meal.name}
                      </CardTitle>
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-lg shrink-0">
                        <DollarSign className="h-4 w-4" />
                        {meal.price?.toFixed(2) || "0.00"}
                      </div>
                    </div>

                    {/* Visibility Status Badge */}
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={meal.meal_visibility ? "default" : "secondary"}
                        className={`text-xs px-2 py-1 ${
                          meal.meal_visibility
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {meal.meal_visibility ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hidden
                          </>
                        )}
                      </Badge>
                    </div>

                    <CardDescription className="text-sm leading-relaxed line-clamp-3">
                      {meal.description || "No description available"}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Visibility Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Customer Visibility
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {meal.meal_visibility ? "On" : "Off"}
                      </span>
                      <Switch
                        checked={meal.meal_visibility}
                        onCheckedChange={(checked) =>
                          handleVisibilityToggle(meal, checked)
                        }
                        disabled={updateVisibilityMutation.isPending}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>
                  </div>

                  {/* Ingredients */}
                  {meal.ingredients && meal.ingredients.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Utensils className="h-4 w-4" />
                        <span>Ingredients</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {meal.ingredients
                          .slice(0, 3)
                          .map((ingredient: string, index: number) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs px-2 py-1"
                            >
                              {ingredient}
                            </Badge>
                          ))}
                        {meal.ingredients.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-1"
                          >
                            +{meal.ingredients.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dietary Info */}
                  {meal.dietary_info && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Leaf className="h-4 w-4" />
                        <span>Dietary Info</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {meal.dietary_info}
                      </Badge>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>
                      Added{" "}
                      {meal.created_at
                        ? format(new Date(meal.created_at), "MMM dd, yyyy")
                        : "Unknown"}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateClick(meal)}
                      disabled={updateMealMutation.isPending}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(meal)}
                      disabled={deleteMealMutation.isPending}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Utensils className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white">
                    No meals yet
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md">
                    Start building your menu by adding your first delicious meal
                    in the "Add Meal" tab!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Delete Meal
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Are you sure you want to delete "{mealToDelete?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMealMutation.isPending}
              className="w-full sm:w-auto"
            >
              {deleteMealMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Meal Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Update Meal
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Edit the details of "{mealToUpdate?.name}"
            </DialogDescription>
          </DialogHeader>

          <Form {...updateForm}>
            <form
              onSubmit={updateForm.handleSubmit(onUpdateSubmit)}
              className="space-y-4 sm:space-y-6"
            >
              <FormField
                control={updateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Meal Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter meal name"
                        {...field}
                        className="text-sm sm:text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the meal..."
                        {...field}
                        className="text-sm sm:text-base min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="ingredients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Ingredients (comma-separated)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Rice, Chicken, Vegetables"
                        value={field.value?.join(", ") || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const arr = value
                            .split(",")
                            .map((i) => i.trim())
                            .filter(Boolean);
                          field.onChange(arr);
                        }}
                        className="text-sm sm:text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="dietaryInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Dietary Information (optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Gluten-free, Vegan"
                        {...field}
                        value={field.value || ""}
                        className="text-sm sm:text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Price (PKR)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? 0 : parseFloat(val));
                        }}
                        className="text-sm sm:text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUpdateCancel}
                  disabled={updateMealMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMealMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateMealMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Update Meal
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
