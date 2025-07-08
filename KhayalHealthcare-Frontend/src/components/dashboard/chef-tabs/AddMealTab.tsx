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
import { Loader2, ChefHat, DollarSign, FileText, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Zod schema for meal form
const mealFormSchema = z.object({
  name: z.string().min(1, "Meal name is required"),
  description: z.string().min(1, "Description is required"),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price must be zero or positive"),
  ingredients: z.string().default(""), // Changed to string for easier handling
  dietaryInfo: z.string().optional(),
});

type MealFormData = z.infer<typeof mealFormSchema>;

export default function AddMealTab() {
  const { toast } = useToast();

  // Initialize React Hook Form
  const form = useForm<MealFormData>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      ingredients: "", // Changed to empty string
      dietaryInfo: "",
    },
  });

  // Helper function to convert string to array
  const stringToArray = (str: string): string[] => {
    if (!str || str.trim() === "") return [];
    return str
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  // Mutation: create a new meal
  const createMealMutation = useMutation({
    mutationFn: async (data: MealFormData) => {
      // Convert ingredients string to array
      const ingredientsArray = stringToArray(data.ingredients);

      // Transform to snake_case for backend
      const payload = {
        name: data.name,
        description: data.description,
        price: Number(data.price),
        ingredients: ingredientsArray,
        dietary_info: data.dietaryInfo || null,
      };

      const res = await apiRequest("POST", API_ENDPOINTS.MEALS_CREATE, payload);
      return res.json();
    },
    onSuccess: (newMeal) => {
      queryClient.invalidateQueries({
        queryKey: ["chef-meals"],
      });
      toast({
        title: "Success",
        description: "Meal added successfully",
      });
      // Reset form with proper default values
      form.reset({
        name: "",
        description: "",
        price: 0,
        ingredients: "",
        dietaryInfo: "",
      });
    },
    onError: (error: Error) => {
      console.error("Create meal error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add meal",
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = (data: MealFormData) => {
    createMealMutation.mutate(data);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-xl">
              <ChefHat className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Create New Meal
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Add a delicious meal option for your subscribers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader className="pb-4 sm:pb-6">
          <div className="flex items-center gap-3">
            <Utensils className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">
                Meal Details
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Fill in the information about your new meal offering
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 sm:space-y-8"
            >
              {/* Two-column layout for larger screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Meal Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Meal Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter meal name"
                            {...field}
                            className="h-11 sm:h-12 text-base border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Price */}
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
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
                            className="h-11 sm:h-12 text-base border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dietary Info */}
                  <FormField
                    control={form.control}
                    name="dietaryInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                          Dietary Information (optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Gluten-free, Vegan, Keto"
                            {...field}
                            value={field.value || ""}
                            className="h-11 sm:h-12 text-base border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your delicious meal in detail..."
                            {...field}
                            rows={4}
                            className="text-base border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20 resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Ingredients - FIXED VERSION */}
                  <FormField
                    control={form.control}
                    name="ingredients"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                          Ingredients
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="List ingredients separated by commas (e.g., Rice, Chicken, Vegetables, Spices)"
                            {...field}
                            rows={3}
                            className="text-base border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20 resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Separate each ingredient with a comma (e.g., "Rice,
                          Chicken, Onions")
                        </p>
                        {/* Debug info - remove in production */}
                        {field.value && (
                          <p className="text-xs text-green-600 mt-1">
                            Preview: {stringToArray(field.value).join(" • ")}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4 sm:pt-6">
                <Button
                  type="submit"
                  size="lg"
                  disabled={createMealMutation.isPending}
                  className="w-full sm:w-auto min-w-[200px] h-12 sm:h-14 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
                >
                  {createMealMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Adding Meal...
                    </>
                  ) : (
                    <>
                      <ChefHat className="mr-2 h-5 w-5" />
                      Add Meal to Menu
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <ChefHat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Tips for Creating Great Meals
            </h3>
            <ul className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>
                • Use descriptive names that make the meal sound appetizing
              </li>
              <li>
                • Include cooking methods and flavor profiles in the description
              </li>
              <li>• List all major ingredients for transparency</li>
              <li>• Specify dietary restrictions to help customers choose</li>
              <li>
                • <strong>Ingredients:</strong> Type ingredients separated by
                commas (e.g., "Rice, Chicken, Onions")
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
