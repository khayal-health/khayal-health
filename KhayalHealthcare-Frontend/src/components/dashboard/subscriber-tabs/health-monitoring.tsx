import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Camera, FileText } from "lucide-react";
import { DailyVitals } from "./health-monitoring-tabs/daily-vitals";
import { FacialAnalysis } from "./health-monitoring-tabs/facial-analysis";
import { HealthRecordsComponent } from "./health-monitoring-tabs/health-records";

export class HealthMonitoring {
  private dailyVitals: DailyVitals;
  private facialAnalysis: FacialAnalysis;
  private user: any;

  constructor(user: any) {
    this.dailyVitals = new DailyVitals(user);
    this.facialAnalysis = new FacialAnalysis(user);
    this.user = user;
  }

  Component = () => {
    return (
      <div className="space-y-6">
        {/* Updated Tabs to match main navigation style */}
        <Tabs defaultValue="dailyVitals" className="space-y-6">
          <TabsList className="w-full grid grid-cols-3 gap-2 p-1 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <TabsTrigger
              value="dailyVitals"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 sm:py-4 px-3 sm:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Activity className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium text-center">
                <span className="hidden sm:inline">Daily </span>Vitals
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="facialAnalysis"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 sm:py-4 px-3 sm:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Camera className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium text-center">
                <span className="hidden sm:inline">Facial </span>Analysis
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="healthRecords"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 sm:py-4 px-3 sm:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium text-center">
                <span className="hidden sm:inline">Health </span>Records
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Daily Vitals Tab */}
          <TabsContent value="dailyVitals" className="mt-0">
            <this.dailyVitals.Component />
          </TabsContent>

          {/* Facial Analysis Tab */}
          <TabsContent value="facialAnalysis" className="mt-0">
            <this.facialAnalysis.Component />
          </TabsContent>

          {/* Health Records Tab */}
          <TabsContent value="healthRecords" className="mt-0">
            <HealthRecordsComponent user={this.user} />
          </TabsContent>
        </Tabs>
      </div>
    );
  };
}
