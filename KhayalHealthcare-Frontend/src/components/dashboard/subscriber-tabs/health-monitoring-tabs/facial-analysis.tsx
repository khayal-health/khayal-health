import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, History } from "lucide-react";
import { RemoteMonitoring } from "./facial-analysis-tabs/remote-monitoring";
import { PPGHistory } from "./facial-analysis-tabs/ppg-history";
import { useState } from "react";

export class FacialAnalysis {
  private remoteMonitoring: RemoteMonitoring;
  private ppgHistory: PPGHistory;

  constructor(user: any) {
    this.remoteMonitoring = new RemoteMonitoring(user);
    this.ppgHistory = new PPGHistory(user);
  }

  Component = () => {
    const [activeTab, setActiveTab] = useState("monitoring");

    return (
      <div className="space-y-4 sm:space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 sm:space-y-6"
        >
          <TabsList className="w-full grid grid-cols-2 gap-1 sm:gap-2 p-0.5 sm:p-1 h-auto bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <TabsTrigger
              value="monitoring"
              className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 rounded-md sm:rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm font-medium">
                Remote Monitoring
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 rounded-md sm:rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <History className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm font-medium">
                PPG History
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring" className="mt-0">
            <this.remoteMonitoring.Component />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <this.ppgHistory.Component />
          </TabsContent>
        </Tabs>
      </div>
    );
  };
}
