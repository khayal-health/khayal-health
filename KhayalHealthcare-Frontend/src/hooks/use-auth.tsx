import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { User as SelectUser, InsertUser } from "../types/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/config";
import { AdModal } from "@/components/advertisements/ad-modal";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<LoginResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  showAds: boolean;
  setShowAds: (show: boolean) => void;
};

type LoginData = Pick<InsertUser, "username" | "password">;
type LoginResponse = {
  access_token: string;
  token_type: string;
  user: SelectUser;
};

export const AuthContext = createContext<AuthContextType | null>(null);

// Helper function to check if ads have been shown this session
const hasAdsBeenShownThisSession = () => {
  return sessionStorage.getItem("ads_shown_this_session") === "true";
};

// Helper function to mark ads as shown this session
const markAdsAsShown = () => {
  sessionStorage.setItem("ads_shown_this_session", "true");
};

// Helper function to clear ads shown flag
const clearAdsShownFlag = () => {
  sessionStorage.removeItem("ads_shown_this_session");
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [showAds, setShowAds] = useState(false);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: [API_ENDPOINTS.USER_ME],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!localStorage.getItem("access_token"),
  });

  // Show ads when user data is loaded and hasn't been shown this session
  useEffect(() => {
    if (user && !hasAdsBeenShownThisSession() && !isLoading) {
      setShowAds(true);
      markAdsAsShown();
    }
  }, [user, isLoading]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const res = await apiRequest("POST", API_ENDPOINTS.LOGIN, credentials);
        const data: LoginResponse = await res.json();
        return data;
      } catch (error: any) {
        console.error("Login API error:", error);
        if (error.message && error.message.includes("401")) {
          throw new Error("Invalid username or password. Please try again.");
        }
        throw error;
      }
    },
    onSuccess: (data: LoginResponse) => {
      localStorage.setItem("access_token", data.access_token);
      queryClient.setQueryData([API_ENDPOINTS.USER_ME], data.user);
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.USER_ME] });

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Clear the ads shown flag so ads will show for this new login session
      clearAdsShownFlag();
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Could not log in. Please try again.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      try {
        const res = await apiRequest(
          "POST",
          API_ENDPOINTS.REGISTER,
          credentials
        );
        const data = await res.json();
        return data;
      } catch (error: any) {
        console.error("Registration API error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Your account has been created. Please login.",
      });
    },
    onError: (error: Error) => {
      console.error("Registration mutation error:", error);
      toast({
        title: "Registration failed",
        description:
          error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem("access_token");
      // Clear the ads shown flag on logout
      clearAdsShownFlag();
    },
    onSuccess: () => {
      queryClient.setQueryData([API_ENDPOINTS.USER_ME], null);
      queryClient.clear();
      setShowAds(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        showAds,
        setShowAds,
      }}
    >
      {children}
      <AdModal open={showAds} onClose={() => setShowAds(false)} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
