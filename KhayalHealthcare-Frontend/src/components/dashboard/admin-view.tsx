import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2,
  UserCheck,
  CreditCard,
  Calendar,
  ChefHat,
  Gift,
} from "lucide-react";
import RegistrationApproval from "./admin-tabs/registration-approval";
import UserSubscriptions from "./admin-tabs/user-subscriptions";
import CareVisitRequests from "./admin-tabs/care-visit-requests";
import ChefManagement from "./admin-tabs/chef-management";
import ContentManagementTabs from "./admin-tabs/promotions";

export default function AdminView() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>("registrations");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">
          Please log in to continue
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Simplified Welcome Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Manage users and system operations
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Admin: {user?.name}
            </span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              Status: Active
            </span>
          </div>
        </div>

        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-5 gap-0 p-0 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
            <TabsTrigger
              value="registrations"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 px-1 sm:px-3 md:px-6 rounded-l-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              <UserCheck className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium">
                Approvals
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="subscriptions"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 px-1 sm:px-3 md:px-6 border-x border-gray-200 dark:border-gray-800 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              <CreditCard className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium hidden sm:inline">
                Subscriptions
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm font-medium sm:hidden">
                Subs
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="careRequests"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 px-1 sm:px-3 md:px-6 border-r border-gray-200 dark:border-gray-800 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              <Calendar className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium">
                Requests
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="promotion"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 px-1 sm:px-3 md:px-6 border-x border-gray-200 dark:border-gray-800 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              <Gift className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium">
                Promotion
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="chefs"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 sm:py-4 px-1 sm:px-3 md:px-6 rounded-r-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              <ChefHat className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium">
                Chefs
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents - Removed extra spacing */}
          <TabsContent
            value="registrations"
            className="mt-0 focus:outline-none"
          >
            <RegistrationApproval />
          </TabsContent>

          <TabsContent
            value="subscriptions"
            className="mt-0 focus:outline-none"
          >
            <UserSubscriptions />
          </TabsContent>

          <TabsContent value="careRequests" className="mt-0 focus:outline-none">
            <CareVisitRequests />
          </TabsContent>

          <TabsContent value="promotion" className="mt-0 focus:outline-none">
            <ContentManagementTabs />
          </TabsContent>

          <TabsContent value="chefs" className="mt-0 focus:outline-none">
            <ChefManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
