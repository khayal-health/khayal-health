import { useAuth } from "@/hooks/use-auth";
import { Loader2, Activity } from "lucide-react";
import AssignmentsTab from "./psychologist-tabs/AssignmentsTab";

export default function PsychologistView() {
  const { user, isLoading: authLoading } = useAuth();
  // Handle auth loading state
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
        {/* Enhanced Welcome Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                Welcome back, {user?.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                Manage your appointments and patient assignments
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs sm:text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  ID: {user._id}
                </span>
                <span
                  className={`font-semibold ${
                    user.approval_status === "approved"
                      ? "text-green-600 dark:text-green-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  Status: {user.approval_status || "pending"}
                </span>
              </div>
            </div>

            {/* Status Indicator - You can replace this with psychologist-specific status */}
            <div className="flex flex-col items-start sm:items-end gap-2">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Service Status
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Active & Available
                  </p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* <Tabs defaultValue="appointments" className="w-full">
          <TabsList className="w-full grid grid-cols-2 gap-0 p-0 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
            <TabsTrigger
              value="appointments"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-4 px-3 sm:px-6 rounded-l-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium">
                Appointments
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-4 px-3 sm:px-6 rounded-r-xl border-l border-gray-200 dark:border-gray-800 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              <ClipboardList className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium">
                Assignments
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="appointments" className="mt-0 focus:outline-none">
            <AppointmentsTab />
          </TabsContent>

          <TabsContent value="assignments" className="mt-0 focus:outline-none">
            <AssignmentsTab />
          </TabsContent>
        </Tabs> */}

        <AssignmentsTab />
      </div>
    </div>
  );
}
