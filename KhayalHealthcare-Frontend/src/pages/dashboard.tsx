import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types/schema";
import { KhayalLogo } from "@/components/ui/logo";
import { useIsMobile } from "@/hooks/use-mobile";
import SubscriberView from "@/components/dashboard/subscriber-view-new";
import CaretakerView from "@/components/dashboard/caretaker-view";
import ChefView from "@/components/dashboard/chef-view";
import PsychologistView from "@/components/dashboard/psychologist-view";
import AdminView from "@/components/dashboard/admin-view";
import { LogOut, Share2, Menu, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const DashboardView = {
    [UserRole.ADMIN]: AdminView,
    [UserRole.SUBSCRIBER]: SubscriberView,
    [UserRole.CARETAKER]: CaretakerView,
    [UserRole.CHEF]: ChefView,
    [UserRole.PSYCHOLOGIST]: PsychologistView,
  }[user!.role];

  const handleShare = async () => {
    const shareData = {
      title: "Khayal Health",
      text: "Join Khayal Health - Your comprehensive healthcare management platform",
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: "Success",
          description: "Thanks for sharing Khayal Health!",
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        toast({
          title: "Link Copied!",
          description:
            "Share the link with your friends to invite them to Khayal Health",
        });
      }
    } catch (err) {
      console.error("Error sharing:", err);
      toast({
        title: "Error",
        description: "Could not share at this time. Please try again.",
        variant: "destructive",
      });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white sticky top-0 z-50 shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile and Tablet Layout */}
          {isMobile ? (
            <div ref={menuRef}>
              <div className="h-16 flex items-center justify-between">
                {/* Left: Logo and Brand - UNTOUCHED */}
                <div className="flex items-center gap-3">
                  <KhayalLogo size="sm" animated={false} />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      Khayal Health
                    </h1>
                    <p className="text-xs text-gray-500 -mt-0.5">
                      Healthcare Platform
                    </p>
                  </div>
                </div>

                {/* Right: Menu Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5 text-gray-700" />
                  ) : (
                    <Menu className="h-5 w-5 text-gray-700" />
                  )}
                </Button>
              </div>

              {/* Mobile Menu Dropdown */}
              {mobileMenuOpen && (
                <div className="absolute top-16 left-0 right-0 bg-white border-b shadow-xl z-50 rounded-b-lg overflow-hidden">
                  <div className="px-4 py-5 space-y-4">
                    {/* User Info */}
                    <div className="py-4 border-b border-gray-100">
                      <p className="text-sm text-gray-600">Welcome back,</p>
                      <p className="font-semibold text-gray-900 text-lg">
                        {user!.name}
                      </p>
                      <div className="mt-2">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
                          {user!.role.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 pt-2">
                      <Button
                        variant="outline"
                        size="default"
                        onClick={handleShare}
                        className="w-full justify-start h-11 rounded-md border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <Share2 className="h-4 w-4 mr-3" />
                        Share Khayal Health
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          logoutMutation.mutate();
                          setMobileMenuOpen(false);
                        }}
                        disabled={logoutMutation.isPending}
                        className="w-full justify-start h-11 rounded-md border-gray-300 hover:border-red-400 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        {logoutMutation.isPending ? "Logging out..." : "Logout"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Desktop Layout */
            <div className="h-20 flex items-center justify-between">
              {/* Left: Logo and Brand - UNTOUCHED */}
              <div className="flex items-center gap-4">
                <KhayalLogo size="md" animated={false} />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Khayal Health
                  </h1>
                  <p className="text-sm text-gray-500">Healthcare Platform</p>
                </div>
              </div>

              {/* Right: User info and actions */}
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Welcome,{" "}
                    <span className="font-semibold text-gray-900">
                      {user!.name}
                    </span>
                  </p>
                  <div className="mt-1">
                    <span className="inline-block px-3 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize shadow-sm">
                      {user!.role.toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="h-10 px-5 rounded-md shadow-sm border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="h-10 px-5 rounded-md shadow-sm border-gray-300 hover:border-red-400 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {logoutMutation.isPending ? "..." : "Logout"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <DashboardView />
      </main>
    </div>
  );
}
