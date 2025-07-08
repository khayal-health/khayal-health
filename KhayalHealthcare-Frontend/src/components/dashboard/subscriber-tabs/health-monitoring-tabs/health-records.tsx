import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  FileText,
  Search,
  XCircle,
  RotateCcw,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Droplet,
  User,
  UserCog,
  Smartphone,
  TrendingUp,
  Calendar,
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

type Vital = {
  _id: string;
  subscriber_id: string;
  caretaker_id: string | null;
  timestamp: string;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  temperature: number | null;
  oxygen_saturation: number | null;
  blood_sugar: number | null;
  report_type: string;
  caretaker_name: string | null;
};

type ReportType = "all" | "self" | "caretaker" | "remotePPG";

interface HealthRecordsProps {
  user: any;
}

export class HealthRecordsService {
  formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), "PPP");
    } catch {
      return "N/A";
    }
  };

  formatDateTime = (dateString: string): string => {
    try {
      return format(new Date(dateString), "PPp");
    } catch {
      return "N/A";
    }
  };

  getReportTypeBadgeColor = (reportType: string) => {
    switch (reportType) {
      case "self":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
      case "caretaker":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800";
      case "remotePPG":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800";
    }
  };

  getReportTypeIcon = (reportType: string) => {
    switch (reportType) {
      case "self":
        return <User className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "caretaker":
        return <UserCog className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "remotePPG":
        return <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <FileText className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  getReportTypeLabel = (reportType: string) => {
    switch (reportType) {
      case "self":
        return "Self Reported";
      case "caretaker":
        return "Caretaker";
      case "remotePPG":
        return "Facial Analysis";
      default:
        return reportType;
    }
  };

  getVitalStatus = (vital: Vital) => {
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

    return warnings;
  };

  calculateAverages = (vitals: Vital[]) => {
    const validVitals = vitals.filter(
      (v) =>
        v.heart_rate ||
        v.blood_pressure_systolic ||
        v.oxygen_saturation ||
        v.blood_sugar
    );

    if (validVitals.length === 0) {
      return {
        avgHeartRate: 0,
        avgSystolic: 0,
        avgDiastolic: 0,
        avgOxygen: 0,
        avgBloodSugar: 0,
      };
    }

    const heartRates = validVitals
      .filter((v) => v.heart_rate)
      .map((v) => v.heart_rate!);
    const systolics = validVitals
      .filter((v) => v.blood_pressure_systolic)
      .map((v) => v.blood_pressure_systolic!);
    const diastolics = validVitals
      .filter((v) => v.blood_pressure_diastolic)
      .map((v) => v.blood_pressure_diastolic!);
    const oxygens = validVitals
      .filter((v) => v.oxygen_saturation)
      .map((v) => v.oxygen_saturation!);
    const bloodSugars = validVitals
      .filter((v) => v.blood_sugar)
      .map((v) => v.blood_sugar!);

    return {
      avgHeartRate:
        heartRates.length > 0
          ? Math.round(
              heartRates.reduce((a, b) => a + b, 0) / heartRates.length
            )
          : 0,
      avgSystolic:
        systolics.length > 0
          ? Math.round(systolics.reduce((a, b) => a + b, 0) / systolics.length)
          : 0,
      avgDiastolic:
        diastolics.length > 0
          ? Math.round(
              diastolics.reduce((a, b) => a + b, 0) / diastolics.length
            )
          : 0,
      avgOxygen:
        oxygens.length > 0
          ? Math.round(oxygens.reduce((a, b) => a + b, 0) / oxygens.length)
          : 0,
      avgBloodSugar:
        bloodSugars.length > 0
          ? Math.round(
              bloodSugars.reduce((a, b) => a + b, 0) / bloodSugars.length
            )
          : 0,
    };
  };
}

export const HealthRecordsComponent: React.FC<HealthRecordsProps> = ({
  user,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [reportFilter, setReportFilter] = useState<ReportType>("all");
  const healthService = new HealthRecordsService();

  // Fetch vitals
  const { data: vitals = [], isLoading } = useQuery<Vital[]>({
    queryKey: [API_ENDPOINTS.VITALS(user._id)],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const recordStats = useMemo(() => {
    return {
      total: vitals.length,
      self: vitals.filter((v) => v.report_type === "self").length,
      caretaker: vitals.filter((v) => v.report_type === "caretaker").length,
      remotePPG: vitals.filter((v) => v.report_type === "remotePPG").length,
      withWarnings: vitals.filter(
        (v) => healthService.getVitalStatus(v).length > 0
      ).length,
    };
  }, [vitals]);

  const averages = useMemo(() => {
    return healthService.calculateAverages(vitals);
  }, [vitals]);

  const filteredVitals = useMemo(() => {
    let filtered = vitals;

    if (reportFilter !== "all") {
      filtered = filtered.filter((vital) => vital.report_type === reportFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (vital) =>
          vital._id.toLowerCase().includes(query) ||
          vital.caretaker_name?.toLowerCase().includes(query) ||
          vital.report_type.toLowerCase().includes(query)
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [vitals, reportFilter, searchQuery]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setReportFilter("all");
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                  Total Records
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {recordStats.total}
                </p>
              </div>
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-red-200 dark:border-red-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 truncate">
                  Avg Heart Rate
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-900 dark:text-red-100">
                  {averages.avgHeartRate} <span className="text-sm">bpm</span>
                </p>
              </div>
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-red-600 dark:text-red-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 truncate">
                  Avg Oxygen
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100">
                  {averages.avgOxygen}
                  <span className="text-sm">%</span>
                </p>
              </div>
              <Wind className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-green-600 dark:text-green-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300 truncate">
                  With Warnings
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {recordStats.withWarnings}
                </p>
              </div>
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, caretaker name, or report type..."
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
                  label: "All Records",
                  count: recordStats.total,
                  color: "bg-gray-500",
                },
                {
                  key: "self",
                  label: "Self Reported",
                  count: recordStats.self,
                  color: "bg-blue-500",
                },
                {
                  key: "caretaker",
                  label: "Caretaker",
                  count: recordStats.caretaker,
                  color: "bg-purple-500",
                },
                {
                  key: "remotePPG",
                  label: "Facial Analysis",
                  count: recordStats.remotePPG,
                  color: "bg-emerald-500",
                },
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={reportFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReportFilter(filter.key as ReportType)}
                  className="flex items-center gap-1 sm:gap-2 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs"
                >
                  <div
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${filter.color}`}
                  />
                  <span className="truncate">{filter.label}</span>
                  {filter.count > 0 && (
                    <span
                      className={`px-1 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${
                        reportFilter === filter.key
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
          {reportFilter === "all"
            ? "All Health Records"
            : `${healthService.getReportTypeLabel(reportFilter)} Records`}
        </h3>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
          <span>
            {filteredVitals.length}{" "}
            {filteredVitals.length === 1 ? "record" : "records"} found
          </span>
        </div>
      </div>

      {/* Health Record Cards */}
      {filteredVitals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredVitals.map((vital: Vital) => {
            const warnings = healthService.getVitalStatus(vital);
            const hasWarnings = warnings.length > 0;

            return (
              <Card
                key={vital._id}
                className={`relative overflow-hidden border ${
                  hasWarnings
                    ? "border-amber-200 dark:border-amber-800"
                    : "border-gray-200 dark:border-gray-800"
                } bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg`}
              >
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
                  <div
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border ${healthService.getReportTypeBadgeColor(
                      vital.report_type
                    )}`}
                  >
                    {healthService.getReportTypeIcon(vital.report_type)}
                    <span className="capitalize">
                      {healthService.getReportTypeLabel(vital.report_type)}
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
                      {healthService.formatDateTime(vital.timestamp)}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                  {/* Caretaker Info */}
                  {vital.caretaker_id && (
                    <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="font-medium text-xs sm:text-sm mb-1 text-gray-900 dark:text-white">
                        Recorded By
                      </p>
                      <div className="space-y-1 text-[10px] sm:text-xs">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <UserCog className="h-3 w-3 flex-shrink-0" />
                          <span className="text-purple-700 dark:text-purple-300">
                            {vital.caretaker_name || "Unknown Caretaker"}
                          </span>
                        </div>
                        <div className="text-purple-600 dark:text-purple-400 text-[9px] sm:text-[10px]">
                          ID: {vital.caretaker_id}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vital Signs */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {vital.heart_rate !== null && (
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
                      vital.blood_pressure_diastolic !== null && (
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

                    {vital.oxygen_saturation !== null && (
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

                    {vital.temperature !== null && (
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

                    {vital.blood_sugar !== null && (
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
        <Card>
          <CardContent className="py-8 sm:py-12">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || reportFilter !== "all"
                    ? "No matching records"
                    : "No health records found"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery || reportFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Start recording your vitals to see them here."}
                </p>
              </div>
              {(searchQuery || reportFilter !== "all") && (
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
