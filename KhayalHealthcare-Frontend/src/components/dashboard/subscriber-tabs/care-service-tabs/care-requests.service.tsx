import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List } from "lucide-react";
import { RequestCareVisitService } from "./care-request-service-tabs/RequestCareVisit";
import { CareVisitRequestsService } from "./care-request-service-tabs/CareVisitRequests";

export class CareRequestsService {
  private requestCareVisitService: RequestCareVisitService;
  private careVisitRequestsService: CareVisitRequestsService;

  constructor(user: any) {
    this.requestCareVisitService = new RequestCareVisitService(user);
    this.careVisitRequestsService = new CareVisitRequestsService(user);
  }

  Component = () => {
    const [activeTab, setActiveTab] = useState<string>("request");

    const RequestCareVisitComponent = this.requestCareVisitService.Component;
    const CareVisitRequestsComponent = this.careVisitRequestsService.Component;

    const handleRequestSuccess = () => {
      // Switch to requests tab after successful submission
      setActiveTab("requests");
    };

    return (
      <div className="space-y-6">
        {/* Updated Tabs to match main navigation style */}
        <Tabs
          defaultValue="request"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="w-full grid grid-cols-2 gap-2 p-1 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <TabsTrigger
              value="request"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 px-2 sm:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Plus className="h-4 sm:h-5 w-4 sm:w-5 flex-shrink-0" />
              <span className="text-[10px] xs:text-xs sm:text-sm font-medium text-center leading-tight">
                Request Care Visit
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 px-2 sm:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <List className="h-4 sm:h-5 w-4 sm:w-5 flex-shrink-0" />
              <span className="text-[10px] xs:text-xs sm:text-sm font-medium text-center leading-tight">
                Care Visit Requests
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Request Care Visit Tab */}
          <TabsContent value="request" className="mt-0">
            <RequestCareVisitComponent onSuccess={handleRequestSuccess} />
          </TabsContent>

          {/* Care Visit Requests Tab */}
          <TabsContent value="requests" className="mt-0">
            <CareVisitRequestsComponent />
          </TabsContent>
        </Tabs>
      </div>
    );
  };
}
