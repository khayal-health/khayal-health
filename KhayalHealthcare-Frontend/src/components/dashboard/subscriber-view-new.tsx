import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Heart,
  Utensils,
  Stethoscope,
  ArrowLeft,
  Activity,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { HealthMonitoring } from "./subscriber-tabs/health-monitoring";
import { FoodService } from "./subscriber-tabs/food-service";
import { CareService } from "./subscriber-tabs/care-service";

type ViewType = "home" | "health" | "food" | "care";

interface ServiceCard {
  id: ViewType;
  title: string;
  description: string;
  image: string;
  icon: React.ReactNode;
  gradient: string;
  stats: string;
}

export default function SubscriberView() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const healthMonitoring = new HealthMonitoring(user);
  const foodService = new FoodService(user);
  const careService = new CareService(user);

  // Check if user is approved
  const isApproved = user?.approval_status === "approved";
  const approvalStatus = user?.approval_status || "pending";

  // Service cards configuration
  const serviceCards: ServiceCard[] = [
    {
      id: "health",
      title: "Health Monitoring",
      description: "Real-time health tracking & insights",
      image: "/health.png",
      icon: <Heart className="h-4 w-4 sm:h-5 sm:w-5" />,
      gradient: "from-emerald-400 via-teal-500 to-cyan-600",
      stats: "24/7 Monitoring",
    },
    {
      id: "food",
      title: "Nutrition Care",
      description: "Personalized meal plans & delivery",
      image: "/food.png",
      icon: <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />,
      gradient: "from-pink-400 via-rose-500 to-red-500",
      stats: "Fresh Daily",
    },
    {
      id: "care",
      title: "Medical Support",
      description: "Expert healthcare professionals",
      image: "/care.png",
      icon: <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />,
      gradient: "from-blue-400 via-indigo-500 to-purple-600",
      stats: "On-Demand",
    },
  ];

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView("home");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentView]);

  const handleCardClick = (view: ViewType) => {
    if (!isApproved) return; // Prevent navigation if not approved
    setCurrentView(view);
    window.history.pushState({ view }, "", `#${view}`);
  };

  const handleBack = () => {
    setCurrentView("home");
    window.history.pushState({ view: "home" }, "", "#");
  };

  const getCurrentGradient = () => {
    switch (currentView) {
      case "health":
        return "from-emerald-400 via-teal-500 to-cyan-600";
      case "food":
        return "from-pink-400 via-rose-500 to-red-500";
      case "care":
        return "from-blue-400 via-indigo-500 to-purple-600";
      default:
        return "from-gray-400 to-gray-600";
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  };

  const getApprovalStatusInfo = () => {
    switch (approvalStatus) {
      case "approved":
        return {
          icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
          text: "Account Approved",
          bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
          borderColor: "border-emerald-200 dark:border-emerald-800",
          textColor: "text-emerald-700 dark:text-emerald-300",
        };
      case "rejected":
        return {
          icon: <XCircle className="h-4 w-4 text-red-600" />,
          text: "Account Rejected",
          bgColor: "bg-red-50 dark:bg-red-900/20",
          borderColor: "border-red-200 dark:border-red-800",
          textColor: "text-red-700 dark:text-red-300",
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
          text: "Pending Approval",
          bgColor: "bg-amber-50 dark:bg-amber-900/20",
          borderColor: "border-amber-200 dark:border-amber-800",
          textColor: "text-amber-700 dark:text-amber-300",
        };
    }
  };

  const statusInfo = getApprovalStatusInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-gray-900 dark:to-slate-950">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {currentView === "home" ? (
          <div className="w-full">
            {/* Modern Healthcare Header */}
            <div className="text-center mb-8 sm:mb-12">
              {/* Approval Status Indicator */}
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 ${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-full mb-6`}
              >
                {statusInfo.icon}
                <span className={`text-sm font-medium ${statusInfo.textColor}`}>
                  {statusInfo.text}
                </span>
              </div>

              {/* Personalized Greeting */}
              <div className="mb-6">
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-2">
                  Good {getTimeOfDay()}
                </p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-3">
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    {user?.name}
                  </span>
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  {isApproved
                    ? "Your personalized healthcare dashboard is ready"
                    : approvalStatus === "rejected"
                    ? "Please contact support for account reactivation"
                    : "Your account is under review. Services will be available once approved"}
                </p>
              </div>

              {/* Quick Stats - Only show if approved */}
              {isApproved && (
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-8">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                      3 Services Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                      Secure & Private
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                      24/7 Support
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Non-Approved Status Message */}
            {!isApproved && (
              <div className="mb-8">
                <div
                  className={`p-6 ${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-2xl text-center`}
                >
                  <div className="flex justify-center mb-4">
                    <div
                      className={`w-16 h-16 ${statusInfo.bgColor} rounded-full flex items-center justify-center border-2 ${statusInfo.borderColor}`}
                    >
                      {React.cloneElement(statusInfo.icon, {
                        className: "h-8 w-8",
                      })}
                    </div>
                  </div>
                  <h3
                    className={`text-lg font-semibold ${statusInfo.textColor} mb-2`}
                  >
                    {approvalStatus === "rejected"
                      ? "Account Access Restricted"
                      : "Account Under Review"}
                  </h3>
                  <p className={`text-sm ${statusInfo.textColor} opacity-80`}>
                    {approvalStatus === "rejected"
                      ? "Your account access has been restricted. Please contact our support team for assistance."
                      : "We're reviewing your account details. You'll receive an email notification once approved."}
                  </p>
                </div>
              </div>
            )}

            {/* Service Cards - Mobile Optimized with 9:16 ratio */}
            <div className="space-y-4 sm:hidden">
              {serviceCards.map((card, index) => (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className={`group transform transition-all duration-300 ${
                    isApproved
                      ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      : "cursor-not-allowed opacity-60"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 transition-all duration-300">
                    {/* Disabled Overlay */}
                    {!isApproved && (
                      <div className="absolute inset-0 bg-gray-500/20 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-lg">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {approvalStatus === "rejected"
                              ? "Access Restricted"
                              : "Pending Approval"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      {/* Gradient Side Panel */}
                      <div
                        className={`w-2 h-32 bg-gradient-to-b ${card.gradient} flex-shrink-0`}
                      ></div>

                      {/* Image Section */}
                      <div className="relative w-24 h-24 flex-shrink-0 ml-4">
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-20 rounded-xl`}
                        ></div>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r ${card.gradient} mb-2 shadow-md`}
                            >
                              {card.icon}
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                              {card.title}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                              {card.description}
                            </p>
                            <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-md">
                              {card.stats}
                            </span>
                          </div>
                          <div
                            className={`${
                              isApproved
                                ? "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                : "text-slate-300"
                            } transition-colors`}
                          >
                            <ArrowLeft className="h-4 w-4 rotate-180" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Grid with 9:16 aspect ratio - Smaller Cards */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {serviceCards.map((card, index) => (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className={`group transform transition-all duration-500 ${
                    isApproved
                      ? "cursor-pointer hover:-translate-y-1 hover:scale-[1.02]"
                      : "cursor-not-allowed opacity-60"
                  }`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 transition-all duration-500">
                    {/* Disabled Overlay */}
                    {!isApproved && (
                      <div className="absolute inset-0 bg-gray-500/20 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-lg">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {approvalStatus === "rejected"
                              ? "Access Restricted"
                              : "Pending Approval"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Card Header with Gradient */}
                    <div
                      className={`h-1.5 bg-gradient-to-r ${card.gradient}`}
                    ></div>

                    {/* Image Section with 9:16 aspect ratio */}
                    <div className="relative aspect-[9/16] overflow-hidden">
                      <img
                        src={card.image}
                        alt={card.title}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          isApproved ? "group-hover:scale-110" : ""
                        }`}
                      />
                      <div
                        className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent`}
                      ></div>

                      {/* Floating Icon */}
                      <div
                        className={`absolute top-3 right-3 w-10 h-10 bg-gradient-to-r ${
                          card.gradient
                        } rounded-lg shadow-lg flex items-center justify-center transform transition-transform duration-300 ${
                          isApproved ? "group-hover:rotate-12" : ""
                        }`}
                      >
                        {card.icon}
                      </div>
                    </div>

                    {/* Card Content - Reduced Padding */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {card.title}
                        </h3>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 rounded">
                          {card.stats}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                        {card.description}
                      </p>

                      {/* Action Button */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {isApproved ? "Tap to access" : "Access restricted"}
                        </span>
                        <div
                          className={`w-7 h-7 bg-gradient-to-r ${
                            card.gradient
                          } rounded-md flex items-center justify-center transform transition-transform duration-300 ${
                            isApproved ? "group-hover:translate-x-1" : ""
                          }`}
                        >
                          <ArrowLeft className="h-3.5 w-3.5 text-white rotate-180" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full">
            {/* Enhanced Back Button - Made Responsive */}
            <div className="mb-6 sm:mb-8">
              <button
                onClick={handleBack}
                className={`group inline-flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 bg-gradient-to-r ${getCurrentGradient()} text-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 active:scale-95`}
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm sm:text-base font-medium sm:font-semibold">
                  <span className="hidden sm:inline">Back</span>
                  <span className="sm:hidden">Back</span>
                </span>
              </button>
            </div>

            {/* Enhanced Section Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r ${getCurrentGradient()} rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-center`}
                >
                  {currentView === "health" ? (
                    <Heart className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
                  ) : currentView === "food" ? (
                    <Utensils className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
                  ) : (
                    <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
                  )}
                  <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                    {currentView === "health"
                      ? "Health Monitoring"
                      : currentView === "food"
                      ? "Nutrition Care"
                      : "Medical Support"}
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">
                    {currentView === "health"
                      ? "Monitor your health metrics in real-time"
                      : currentView === "food"
                      ? "Meal ordering service for healthy life"
                      : "Professional healthcare support services"}
                  </p>
                </div>
              </div>
            </div>

            {/* Service Content Container */}
            <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-6 md:p-8">
              {currentView === "health" && <healthMonitoring.Component />}
              {currentView === "food" && <foodService.Component />}
              {currentView === "care" && <careService.Component />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
