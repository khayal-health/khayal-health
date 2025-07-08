import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  Search,
  XCircle,
  RotateCcw,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Droplet,
  Smartphone,
  TrendingUp,
  Calendar,
  History,
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
  heart_rate: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  temperature: number | null;
  oxygen_saturation: number;
  blood_sugar: number;
  report_type: string;
  caretaker_name: string | null;
};

export class PPGHistory {
  private user: any;

  constructor(user: any) {
    this.user = user;
  }

  private formatDateTime = (dateString: string): string => {
    try {
      return format(new Date(dateString), "PPp");
    } catch {
      return "N/A";
    }
  };

  private getVitalStatus = (vital: Vital) => {
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

  private calculateAverages = (vitals: Vital[]) => {
    if (vitals.length === 0) {
      return {
        avgHeartRate: 0,
        avgSystolic: 0,
        avgDiastolic: 0,
        avgOxygen: 0,
        avgBloodSugar: 0,
      };
    }

    const heartRates = vitals.map((v) => v.heart_rate).filter(Boolean);
    const systolics = vitals
      .map((v) => v.blood_pressure_systolic)
      .filter(Boolean);
    const diastolics = vitals
      .map((v) => v.blood_pressure_diastolic)
      .filter(Boolean);
    const oxygens = vitals.map((v) => v.oxygen_saturation).filter(Boolean);
    const bloodSugars = vitals.map((v) => v.blood_sugar).filter(Boolean);

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

  Component = () => {
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch PPG vitals
    const { data: remotePPGVitals = [], isLoading } = useQuery<Vital[]>({
      queryKey: [API_ENDPOINTS.VITALS_PPG(this.user._id)],
      queryFn: getQueryFn({ on401: "returnNull" }),
      select: (data) =>
        data.filter((vital: Vital) => vital.report_type === "remotePPG"),
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
    });

    const recordStats = useMemo(() => {
      return {
        total: remotePPGVitals.length,
        withWarnings: remotePPGVitals.filter(
          (v) => this.getVitalStatus(v).length > 0
        ).length,
        lastWeek: remotePPGVitals.filter(
          (v) =>
            new Date(v.timestamp) >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        lastMonth: remotePPGVitals.filter(
          (v) =>
            new Date(v.timestamp) >
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
      };
    }, [remotePPGVitals]);

    const averages = useMemo(() => {
      return this.calculateAverages(remotePPGVitals);
    }, [remotePPGVitals]);

    const filteredVitals = useMemo(() => {
      let filtered = remotePPGVitals;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (vital) =>
            vital._id.toLowerCase().includes(query) ||
            this.formatDateTime(vital.timestamp).toLowerCase().includes(query)
        );
      }

      return filtered.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }, [remotePPGVitals, searchQuery]);

    const clearFilters = useCallback(() => {
      setSearchQuery("");
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
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                    Total Scans
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                    {recordStats.total}
                  </p>
                </div>
                <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
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

        {/* Search Filter */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or date..."
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
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
            <History className="h-4 w-4 sm:h-5 sm:w-5" />
            PPG Analysis History
          </h3>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
            <span>
              {filteredVitals.length}{" "}
              {filteredVitals.length === 1 ? "scan" : "scans"} found
            </span>
          </div>
        </div>

        {/* PPG Record Cards */}
        {filteredVitals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {filteredVitals.map((vital: Vital) => {
              const warnings = this.getVitalStatus(vital);
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
                      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800`}
                    >
                      <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="capitalize">Facial Analysis</span>
                    </div>
                  </div>

                  <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4">
                    <div className="space-y-1 sm:space-y-2 pr-16 sm:pr-24">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        PPG Result
                      </CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {this.formatDateTime(vital.timestamp)}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                    {/* Vital Signs */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                  <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {searchQuery ? "No matching PPG scans" : "No PPG scans yet"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {searchQuery
                      ? "Try adjusting your search criteria."
                      : "Start a facial analysis scan to see your vitals here."}
                  </p>
                </div>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
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
  };
}
