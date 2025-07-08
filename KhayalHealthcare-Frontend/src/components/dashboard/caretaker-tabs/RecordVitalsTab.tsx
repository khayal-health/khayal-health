import { useState, useEffect, Component, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Users,
  ClipboardEdit,
  History,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Droplet,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Plus,
  Sparkles,
  Search,
  UserCheck,
  AlertCircle,
  UserCog,
  User,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO, isValid } from "date-fns";

// Schema definition
const vitalsFormSchema = z.object({
  subscriber_id: z.string().min(1, "Subscriber is required"),
  blood_pressure_systolic: z.number().optional(),
  blood_pressure_diastolic: z.number().optional(),
  heart_rate: z.number().optional(),
  oxygen_saturation: z.number().optional(),
  blood_sugar: z.number().optional(),
  temperature: z.number().optional(),
});

type VitalsFormData = z.infer<typeof vitalsFormSchema>;

// Type definitions
interface Subscriber {
  id: string;
  name: string;
  age?: number;
  lastVital?: string;
}

interface Vital {
  _id: string;
  timestamp: string;
  blood_sugar?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  oxygen_saturation?: number;
  heart_rate?: number;
  temperature?: number;
  report_type: "self" | "caretaker";
  caretaker_name?: string | null;
}

// Helper functions for vital ranges and warnings
const getVitalStatus = (type: string, value: number | undefined) => {
  if (!value) return { status: "normal", message: "" };

  const ranges = {
    heart_rate: { low: 60, high: 100, unit: "bpm" },
    temperature: { low: 97.0, high: 99.0, unit: "°F" },
    oxygen_saturation: { low: 95, high: 100, unit: "%" },
    blood_sugar: { low: 70, high: 140, unit: "mg/dL" },
    systolic: { low: 90, high: 140, unit: "mmHg" },
    diastolic: { low: 60, high: 90, unit: "mmHg" },
  };

  const range = ranges[type as keyof typeof ranges];
  if (!range) return { status: "normal", message: "" };

  if (value < range.low) {
    return {
      status: "low",
      message: `Low (Normal: ${range.low}-${range.high} ${range.unit})`,
    };
  } else if (value > range.high) {
    return {
      status: "high",
      message: `High (Normal: ${range.low}-${range.high} ${range.unit})`,
    };
  }
  return {
    status: "normal",
    message: `Normal (${range.low}-${range.high} ${range.unit})`,
  };
};

const getVitalWarnings = (vital: Vital) => {
  const warnings = [];

  if (vital.heart_rate) {
    if (vital.heart_rate < 60) warnings.push("Low heart rate");
    if (vital.heart_rate > 100) warnings.push("High heart rate");
  }

  if (vital.blood_pressure_systolic && vital.blood_pressure_diastolic) {
    if (
      vital.blood_pressure_systolic > 140 ||
      vital.blood_pressure_diastolic > 90
    ) {
      warnings.push("High blood pressure");
    }
    if (
      vital.blood_pressure_systolic < 90 ||
      vital.blood_pressure_diastolic < 60
    ) {
      warnings.push("Low blood pressure");
    }
  }

  if (vital.oxygen_saturation && vital.oxygen_saturation < 95) {
    warnings.push("Low oxygen");
  }

  if (vital.blood_sugar) {
    if (vital.blood_sugar > 140) warnings.push("High blood sugar");
    if (vital.blood_sugar < 70) warnings.push("Low blood sugar");
  }

  if (vital.temperature) {
    if (vital.temperature > 99.0) warnings.push("High temperature");
    if (vital.temperature < 97.0) warnings.push("Low temperature");
  }

  return warnings;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "low":
      return "text-blue-600 dark:text-blue-400";
    case "high":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-green-600 dark:text-green-400";
  }
};

// Helper class for date formatting
class DateFormatter {
  static formatDate(
    dateString: string | null | undefined,
    formatString: string
  ): string {
    if (!dateString) {
      return "Not specified";
    }

    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, formatString);
      }

      const dateFromConstructor = new Date(dateString);
      if (
        isValid(dateFromConstructor) &&
        !isNaN(dateFromConstructor.getTime())
      ) {
        return format(dateFromConstructor, formatString);
      }

      return "Invalid date";
    } catch (error) {
      console.error("Date formatting error:", error, "for date:", dateString);
      return "Invalid date";
    }
  }
}

const VitalInput = ({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "number",
  step = "1",
  description,
  status,
  colorClass = "blue",
}: any) => {
  const bgColors = {
    red: "bg-red-50 dark:bg-red-900/20",
    blue: "bg-blue-50 dark:bg-blue-900/20",
    green: "bg-green-50 dark:bg-green-900/20",
    orange: "bg-orange-50 dark:bg-orange-900/20",
    purple: "bg-purple-50 dark:bg-purple-900/20",
  };

  const iconColors = {
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    orange: "text-orange-600 dark:text-orange-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  return (
    <div
      className={`p-3 sm:p-4 rounded-lg ${
        bgColors[colorClass as keyof typeof bgColors]
      } transition-all duration-200`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div
          className={`p-1.5 sm:p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex-shrink-0`}
        >
          <Icon
            className={`h-4 w-4 sm:h-5 sm:w-5 ${
              iconColors[colorClass as keyof typeof iconColors]
            }`}
          />
        </div>
        <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
          <label className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </label>
          <Input
            type={type}
            step={step}
            placeholder={placeholder}
            value={value || ""}
            onChange={onChange}
            className="bg-white dark:bg-gray-800 h-8 sm:h-10 text-sm"
          />
          {description && (
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
          {status && (
            <p
              className={`text-[10px] sm:text-xs font-medium ${getStatusColor(
                status.status
              )}`}
            >
              {status.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Main RecordVitalsTab class component
export class RecordVitalsTab extends Component {
  render() {
    return <RecordVitalsTabContent />;
  }
}

// Functional component that handles the actual logic
function RecordVitalsTabContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSubscriber, setSelectedSubscriber] =
    useState<Subscriber | null>(null);
  const [activeTab, setActiveTab] = useState("subscribers");
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");

  // Query subscribers data
  const { data: subscribers = [], isLoading: subscribersLoading } = useQuery<
    Subscriber[]
  >({
    queryKey: [API_ENDPOINTS.CHEF_SUBSCRIBERS_ASSIGN],
  });

  // Query vitals data for selected subscriber
  const { data: subscriberVitals = [], isLoading: vitalsLoading } = useQuery<
    Vital[]
  >({
    queryKey: selectedSubscriber
      ? [API_ENDPOINTS.VITALS(selectedSubscriber.id)]
      : [],
    enabled: !!selectedSubscriber,
  });

  // Filter subscribers based on search
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((subscriber) =>
      subscriber.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subscribers, searchQuery]);

  // Calculate statistics for selected subscriber
  const stats = useMemo(() => {
    if (!subscriberVitals.length || !selectedSubscriber) return null;

    const recentVitals = subscriberVitals.slice(0, 10);
    const avgHeartRate =
      recentVitals
        .filter((v) => v.heart_rate)
        .reduce((sum, v) => sum + v.heart_rate!, 0) /
      recentVitals.filter((v) => v.heart_rate).length;

    const avgOxygen =
      recentVitals
        .filter((v) => v.oxygen_saturation)
        .reduce((sum, v) => sum + v.oxygen_saturation!, 0) /
      recentVitals.filter((v) => v.oxygen_saturation).length;

    const withWarnings = subscriberVitals.filter(
      (v) => getVitalWarnings(v).length > 0
    ).length;

    return {
      totalRecords: subscriberVitals.length,
      avgHeartRate: Math.round(avgHeartRate) || 0,
      avgOxygen: Math.round(avgOxygen) || 0,
      lastRecorded: subscriberVitals[0]?.timestamp,
      withWarnings,
    };
  }, [subscriberVitals, selectedSubscriber]);

  // Initialize form with validation schema
  const form = useForm<VitalsFormData>({
    resolver: zodResolver(vitalsFormSchema),
    defaultValues: {
      subscriber_id: "",
      blood_pressure_systolic: undefined,
      blood_pressure_diastolic: undefined,
      heart_rate: undefined,
      oxygen_saturation: undefined,
      blood_sugar: undefined,
      temperature: undefined,
    },
  });

  // Update form when subscriber is selected
  useEffect(() => {
    if (selectedSubscriber) {
      form.setValue("subscriber_id", selectedSubscriber.id);
    }
  }, [selectedSubscriber, form]);

  // Mutation for creating vitals
  const createVitalsMutation = useMutation({
    mutationFn: async (formData: VitalsFormData) => {
      const apiData = {
        subscriber_id: formData.subscriber_id,
        caretaker_id: user!._id,
        heart_rate: formData.heart_rate,
        blood_pressure_systolic: formData.blood_pressure_systolic,
        blood_pressure_diastolic: formData.blood_pressure_diastolic,
        temperature: formData.temperature,
        oxygen_saturation: formData.oxygen_saturation,
        blood_sugar: formData.blood_sugar,
        report_type: "caretaker",
      };

      const res = await apiRequest(
        "POST",
        API_ENDPOINTS.VITALS_CREATE,
        apiData
      );
      return res.json();
    },
    onSuccess: () => {
      const subscriberId = form.getValues("subscriber_id");
      if (subscriberId) {
        queryClient.invalidateQueries({
          queryKey: [API_ENDPOINTS.VITALS(subscriberId)],
        });
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      toast({
        title: "Success",
        description: "Vitals recorded successfully",
      });

      // Reset form
      form.reset({
        subscriber_id: subscriberId,
        blood_pressure_systolic: undefined,
        blood_pressure_diastolic: undefined,
        heart_rate: undefined,
        oxygen_saturation: undefined,
        blood_sugar: undefined,
        temperature: undefined,
      });
      setBloodPressure("");
    },
    onError: (error: Error) => {
      console.error("Vitals recording error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record vitals",
        variant: "destructive",
      });
    },
  });

  const onSubmit = useCallback(
    (data: VitalsFormData) => {
      createVitalsMutation.mutate(data);
    },
    [createVitalsMutation]
  );

  const handleBloodPressureChange = useCallback(
    (value: string) => {
      setBloodPressure(value);
      const match = value.match(/^(\d+)\/(\d+)$/);
      if (match) {
        form.setValue("blood_pressure_systolic", parseInt(match[1]));
        form.setValue("blood_pressure_diastolic", parseInt(match[2]));
      } else {
        form.setValue("blood_pressure_systolic", undefined);
        form.setValue("blood_pressure_diastolic", undefined);
      }
    },
    [form]
  );

  const handleSubscriberSelect = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setActiveTab("record");
  };

  // Calculate form completion
  const formValues = form.watch();
  const filledFields =
    Object.values(formValues).filter((v) => v !== undefined && v !== "")
      .length - 1; // Subtract subscriber_id
  const totalFields = 6;
  const completionPercentage = (filledFields / totalFields) * 100;

  if (subscribersLoading) {
    return (
      <div className="flex justify-center py-8 sm:py-12">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Stats - Only show when subscriber is selected */}
      {selectedSubscriber && stats && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Selected: {selectedSubscriber.name}
            </h3>
            {/* Remove the Change Subscriber button from here - it's already in each tab */}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <CardContent className="p-2.5 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                      Total Records
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {stats.totalRecords}
                    </p>
                  </div>
                  <History className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-red-200 dark:border-red-700">
              <CardContent className="p-2.5 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs md:text-sm font-medium text-red-700 dark:text-red-300 truncate">
                      Avg Heart Rate
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-900 dark:text-red-100">
                      {stats.avgHeartRate}{" "}
                      <span className="text-xs sm:text-sm">bpm</span>
                    </p>
                  </div>
                  <Heart className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-red-600 dark:text-red-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-700">
              <CardContent className="p-2.5 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs md:text-sm font-medium text-green-700 dark:text-green-300 truncate">
                      Avg Oxygen
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-900 dark:text-green-100">
                      {stats.avgOxygen}
                      <span className="text-xs sm:text-sm">%</span>
                    </p>
                  </div>
                  <Wind className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-green-600 dark:text-green-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
              <CardContent className="p-2.5 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs md:text-sm font-medium text-amber-700 dark:text-amber-300 truncate">
                      With Warnings
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-amber-900 dark:text-amber-100">
                      {stats.withWarnings}
                    </p>
                  </div>
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4 sm:space-y-6"
      >
        <TabsList className="w-full grid grid-cols-3 gap-1 sm:gap-2 p-0.5 sm:p-1 h-auto bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <TabsTrigger
            value="subscribers"
            className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 rounded-md sm:rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm font-medium">Subscribers</span>
          </TabsTrigger>
          <TabsTrigger
            value="record"
            disabled={!selectedSubscriber}
            className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 rounded-md sm:rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClipboardEdit className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm font-medium">Record</span>
          </TabsTrigger>
          <TabsTrigger
            value="history"
            disabled={!selectedSubscriber}
            className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 rounded-md sm:rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <History className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm font-medium">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="mt-0">
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">
                    Select Subscriber
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Choose a subscriber to record vitals
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search subscribers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 sm:h-10"
                />
              </div>

              {/* Subscribers List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredSubscribers.map((subscriber) => {
                  const isSelected = selectedSubscriber?.id === subscriber.id;

                  return (
                    <Card
                      key={subscriber.id}
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-primary ring-2 ring-primary ring-offset-2 shadow-lg bg-primary/5 dark:bg-primary/10"
                          : "border-gray-200 dark:border-gray-700 hover:shadow-md"
                      }`}
                      onClick={() => handleSubscriberSelect(subscriber)}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div
                              className={`p-2 rounded-full ${
                                isSelected
                                  ? "bg-primary text-white"
                                  : "bg-primary/10"
                              }`}
                            >
                              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <div>
                              <p
                                className={`text-sm sm:text-base font-medium ${
                                  isSelected
                                    ? "text-primary dark:text-primary"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {subscriber.name}
                              </p>
                              {subscriber.age && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Age: {subscriber.age}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant={isSelected ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            {isSelected ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredSubscribers.length === 0 && (
                <div className="text-center py-8 sm:py-12 space-y-3 sm:space-y-4">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      No subscribers found
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Try adjusting your search criteria
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="record" className="mt-0">
          {selectedSubscriber && (
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="space-y-3">
                  {/* Selected Subscriber Banner */}
                  <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-2.5 sm:p-3 md:p-4 border border-primary/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-primary rounded-full">
                          <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-primary/70 dark:text-primary/60 font-medium">
                            Recording vitals for
                          </p>
                          <p className="text-base sm:text-lg md:text-xl font-bold text-primary">
                            {selectedSubscriber.name}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSubscriber(null);
                          setActiveTab("subscribers");
                          form.reset();
                        }}
                        className="h-7 sm:h-8 text-[11px] sm:text-xs md:text-sm border-primary/30 hover:bg-primary/10 self-end sm:self-auto"
                      >
                        Change Subscriber
                      </Button>
                    </div>
                  </div>

                  {/* Title Section */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                        <ClipboardEdit className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base sm:text-lg">
                          Record Vitals
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Enter the health measurements below
                        </CardDescription>
                      </div>
                    </div>
                    {showSuccess && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm font-medium">
                          Saved!
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
                {/* Progress Indicator */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      Form Completion
                    </span>
                    <span className="font-medium">
                      {Math.round(completionPercentage)}%
                    </span>
                  </div>
                  <Progress
                    value={completionPercentage}
                    className="h-1.5 sm:h-2"
                  />
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-3 sm:space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <VitalInput
                              icon={Thermometer}
                              label="Temperature (°F)"
                              value={field.value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => {
                                const value = e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined;
                                field.onChange(value);
                              }}
                              placeholder="98.6"
                              step="0.1"
                              colorClass="orange"
                              status={getVitalStatus(
                                "temperature",
                                field.value
                              )}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="heart_rate"
                        render={({ field }) => (
                          <FormItem>
                            <VitalInput
                              icon={Heart}
                              label="Heart Rate (bpm)"
                              value={field.value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => {
                                const value = e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined;
                                field.onChange(value);
                              }}
                              placeholder="72"
                              colorClass="red"
                              status={getVitalStatus("heart_rate", field.value)}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="oxygen_saturation"
                        render={({ field }) => (
                          <FormItem>
                            <VitalInput
                              icon={Wind}
                              label="Oxygen Saturation (%)"
                              value={field.value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => {
                                const value = e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined;
                                field.onChange(value);
                              }}
                              placeholder="98"
                              colorClass="green"
                              status={getVitalStatus(
                                "oxygen_saturation",
                                field.value
                              )}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="blood_sugar"
                        render={({ field }) => (
                          <FormItem>
                            <VitalInput
                              icon={Droplet}
                              label="Blood Sugar (mg/dL)"
                              value={field.value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => {
                                const value = e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined;
                                field.onChange(value);
                              }}
                              placeholder="95"
                              step="0.1"
                              colorClass="purple"
                              description="Fasting: 70-100 mg/dL"
                              status={getVitalStatus(
                                "blood_sugar",
                                field.value
                              )}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Blood Pressure - Full Width */}
                    <div>
                      <VitalInput
                        icon={Activity}
                        label="Blood Pressure (mmHg)"
                        value={bloodPressure}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleBloodPressureChange(e.target.value)
                        }
                        placeholder="120/80"
                        type="text"
                        colorClass="blue"
                        description="Enter as systolic/diastolic (e.g., 120/80)"
                        status={
                          form.watch("blood_pressure_systolic") &&
                          form.watch("blood_pressure_diastolic")
                            ? {
                                status:
                                  getVitalStatus(
                                    "systolic",
                                    form.watch("blood_pressure_systolic")
                                  ).status === "normal" &&
                                  getVitalStatus(
                                    "diastolic",
                                    form.watch("blood_pressure_diastolic")
                                  ).status === "normal"
                                    ? "normal"
                                    : "high",
                                message: `Systolic: ${
                                  getVitalStatus(
                                    "systolic",
                                    form.watch("blood_pressure_systolic")
                                  ).message
                                }, Diastolic: ${
                                  getVitalStatus(
                                    "diastolic",
                                    form.watch("blood_pressure_diastolic")
                                  ).message
                                }`,
                              }
                            : null
                        }
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium"
                      disabled={createVitalsMutation.isPending}
                    >
                      {createVitalsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Record Vitals
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          {selectedSubscriber && (
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                {/* Selected Subscriber Banner - same as Record Vitals */}
                <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-2.5 sm:p-3 md:p-4 border border-primary/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-primary rounded-full">
                        <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-primary/70 dark:text-primary/60 font-medium">
                          Recording vitals for
                        </p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-primary">
                          {selectedSubscriber.name}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSubscriber(null);
                        setActiveTab("subscribers");
                        form.reset();
                      }}
                      className="h-7 sm:h-8 text-[11px] sm:text-xs md:text-sm border-primary/30 hover:bg-primary/10 self-end sm:self-auto"
                    >
                      Change Subscriber
                    </Button>
                  </div>
                </div>

                {/* Existing Vitals History title */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <History className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">
                      Vitals History
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      View past health measurements
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-3 sm:px-6">
                {vitalsLoading ? (
                  <div className="flex justify-center py-8 sm:py-12">
                    <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
                  </div>
                ) : subscriberVitals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    {subscriberVitals.map((vital: Vital) => {
                      const warnings = getVitalWarnings(vital);
                      const hasWarnings = warnings.length > 0;

                      // Helper functions from HealthRecordsService
                      const getReportTypeBadgeColor = (reportType: string) => {
                        switch (reportType) {
                          case "self":
                            return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
                          case "caretaker":
                            return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800";
                          default:
                            return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800";
                        }
                      };

                      const getReportTypeIcon = (reportType: string) => {
                        switch (reportType) {
                          case "self":
                            return <User className="h-3 w-3 sm:h-4 sm:w-4" />;
                          case "caretaker":
                            return (
                              <UserCog className="h-3 w-3 sm:h-4 sm:w-4" />
                            );
                          default:
                            return (
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                            );
                        }
                      };

                      const getReportTypeLabel = (reportType: string) => {
                        switch (reportType) {
                          case "self":
                            return "Self Reported";
                          case "caretaker":
                            return "Caretaker";
                          default:
                            return reportType;
                        }
                      };

                      return (
                        <Card
                          key={vital._id}
                          className={`relative overflow-hidden border ${
                            hasWarnings
                              ? "border-amber-200 dark:border-amber-800"
                              : "border-gray-200 dark:border-gray-800"
                          } bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg`}
                        >
                          {/* Report Type Badge - positioned absolute top-right */}
                          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
                            <div
                              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border ${getReportTypeBadgeColor(
                                vital.report_type
                              )}`}
                            >
                              {getReportTypeIcon(vital.report_type)}
                              <span className="capitalize">
                                {getReportTypeLabel(vital.report_type)}
                              </span>
                            </div>
                          </div>

                          <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4">
                            <div className="space-y-1 sm:space-y-2 pr-16 sm:pr-24">
                              <CardTitle className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                                Health Record
                              </CardTitle>
                              <CardDescription className="text-[10px] sm:text-xs flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {DateFormatter.formatDate(
                                  vital.timestamp,
                                  "PPpp"
                                )}
                              </CardDescription>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                            {/* Caretaker Info - only show for caretaker reports */}
                            {vital.report_type === "caretaker" &&
                              vital.caretaker_name && (
                                <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                  <p className="font-medium text-xs sm:text-sm mb-1 text-gray-900 dark:text-white">
                                    Recorded By
                                  </p>
                                  <div className="space-y-1 text-[10px] sm:text-xs">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <UserCog className="h-3 w-3 flex-shrink-0" />
                                      <span className="text-purple-700 dark:text-purple-300">
                                        {vital.caretaker_name}
                                      </span>
                                    </div>
                                    {user && (
                                      <div className="text-purple-600 dark:text-purple-400 text-[9px] sm:text-[10px]">
                                        ID: {user._id}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Vital Signs */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              {vital.heart_rate !== null &&
                                vital.heart_rate !== undefined && (
                                  <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <Heart className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                                      <div>
                                        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                                          Heart Rate
                                        </p>
                                        <p className="text-sm sm:text-base font-semibold text-red-700 dark:text-red-300">
                                          {vital.heart_rate} bpm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {vital.blood_pressure_systolic !== null &&
                                vital.blood_pressure_systolic !== undefined &&
                                vital.blood_pressure_diastolic !== null &&
                                vital.blood_pressure_diastolic !==
                                  undefined && (
                                  <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <Activity className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                      <div>
                                        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                                          Blood Pressure
                                        </p>
                                        <p className="text-sm sm:text-base font-semibold text-blue-700 dark:text-blue-300">
                                          {vital.blood_pressure_systolic}/
                                          {vital.blood_pressure_diastolic}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {vital.oxygen_saturation !== null &&
                                vital.oxygen_saturation !== undefined && (
                                  <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <Wind className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                                      <div>
                                        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                                          Oxygen Level
                                        </p>
                                        <p className="text-sm sm:text-base font-semibold text-green-700 dark:text-green-300">
                                          {vital.oxygen_saturation}%
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {vital.temperature !== null &&
                                vital.temperature !== undefined && (
                                  <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <Thermometer className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                      <div>
                                        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                                          Temperature
                                        </p>
                                        <p className="text-sm sm:text-base font-semibold text-orange-700 dark:text-orange-300">
                                          {vital.temperature}°F
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {vital.blood_sugar !== null &&
                                vital.blood_sugar !== undefined && (
                                  <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg col-span-2">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <Droplet className="h-3 w-3 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                      <div>
                                        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                                          Blood Sugar
                                        </p>
                                        <p className="text-sm sm:text-base font-semibold text-purple-700 dark:text-purple-300">
                                          {vital.blood_sugar} mg/dL
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                            </div>

                            {/* Warnings */}
                            {hasWarnings && (
                              <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <p className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
                                  Warnings:
                                </p>
                                <div className="space-y-0.5">
                                  {warnings.map((warning, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-1 text-[9px] sm:text-[10px] text-amber-600 dark:text-amber-400"
                                    >
                                      <TrendingUp className="h-2.5 w-2.5" />
                                      {warning}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12 space-y-3 sm:space-y-4">
                    <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        No vitals recorded yet
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Start tracking health by recording the first measurement
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
