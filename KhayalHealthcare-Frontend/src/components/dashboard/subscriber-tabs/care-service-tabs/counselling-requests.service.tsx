import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List } from "lucide-react";
import { RequestCounselingSessionService } from "./counselling-service-tabs/request-counseling-session.service";
import { CounselingRequestsListService } from "./counselling-service-tabs/counseling-requests-list.service";

export class CounsellingRequestsService {
  private user: any;

  constructor(user: any) {
    this.user = user;
  }

  Component = () => {
    const [activeTab, setActiveTab] = useState<string>("request");

    // Initialize services
    const requestSessionService = new RequestCounselingSessionService(
      this.user,
      () => setActiveTab("requests") // Callback to switch tabs on success
    );

    const requestsListService = new CounselingRequestsListService(this.user);

    const RequestSessionComponent = requestSessionService.Component;
    const RequestsListComponent = requestsListService.Component;

    return (
      <div className="space-y-6">
        {/* Updated Tabs to match main navigation style */}
        <Tabs
          defaultValue="request"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="w-full grid grid-cols-2 gap-1 sm:gap-2 p-0.5 sm:p-1 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <TabsTrigger
              value="request"
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 md:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-3 md:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span className="text-[8px] xs:text-[9px] sm:text-xs md:text-sm font-medium text-center leading-tight whitespace-nowrap">
                Request Counseling Session
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 md:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-3 md:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <List className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span className="text-[8px] xs:text-[9px] sm:text-xs md:text-sm font-medium text-center leading-tight whitespace-nowrap">
                Counseling Requests
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Request Counseling Session Tab */}
          <TabsContent value="request" className="mt-0">
            <RequestSessionComponent />
          </TabsContent>

          {/* Counseling Requests Tab */}
          <TabsContent value="requests" className="mt-0">
            <RequestsListComponent />
          </TabsContent>
        </Tabs>
      </div>
    );
  };
}
