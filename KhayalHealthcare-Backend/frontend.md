KhayalHealthcare-Frontend>
│ .env
│ .gitignore
│ eslint.config.js
│ index.html
│ package-lock.json
│ package.json
│ postcss.config.js
│ README.md
│ tailwind.config.ts
│ tsconfig.app.json
│ tsconfig.json
│ tsconfig.node.json
│ vite.config.ts
│
├───public
│ │ heartbeat.js
│ │ manifest.json
│ │ sw.js
│ │ vite.svg
│ │
│ └───models
│ face_landmark_68_model-shard1
│ face_landmark_68_model-weights_manifest.json
│ tiny_face_detector_model-shard1
│ tiny_face_detector_model-weights_manifest.json
│
└───src
│ App.css
│ App.tsx
│ index.css
│ main.tsx
│ vite-env.d.ts
│
├───assets
│ react.svg
│
├───components
│ ├───dashboard
│ │ admin-view.tsx
│ │ caretaker-view.tsx
│ │ chef-view.tsx
│ │ psychologist-view.tsx
│ │ remote-ppg.tsx
│ │ subscriber-view-new.tsx
│ │ subscriber-view.tsx
│ │
│ └───ui
│ accordion.tsx
│ alert-dialog.tsx
│ alert.tsx
│ aspect-ratio.tsx
│ avatar.tsx
│ badge.tsx
│ breadcrumb.tsx
│ button.tsx
│ calendar.tsx
│ card.tsx
│ carousel.tsx
│ chart.tsx
│ checkbox.tsx
│ collapsible.tsx
│ command.tsx
│ context-menu.tsx
│ dialog.tsx
│ drawer.tsx
│ dropdown-menu.tsx
│ form.tsx
│ hover-card.tsx
│ input-otp.tsx
│ input.tsx
│ label.tsx
│ menubar.tsx
│ navigation-menu.tsx
│ pagination.tsx
│ popover.tsx
│ progress.tsx
│ radio-group.tsx
│ resizable.tsx
│ scroll-area.tsx
│ select.tsx
│ separator.tsx
│ sheet.tsx
│ sidebar.tsx
│ skeleton.tsx
│ slider.tsx
│ switch.tsx
│ table.tsx
│ tabs.tsx
│ textarea.tsx
│ toast.tsx
│ toaster.tsx
│ toggle-group.tsx
│ toggle.tsx
│ tooltip.tsx
│ use-toast.tsx
│
├───hooks
│ use-auth.tsx
│ use-mobile.tsx
│ use-toast.ts
│
├───lib
│ config.ts
│ protected-route.tsx
│ queryClient.ts
│ utils.ts
│
├───pages
│ auth-page.tsx
│ dashboard.tsx
│ login-test.tsx
│ not-found.tsx
│
├───shared
│ schema.ts
│
└───types
schema.ts

src\App.tsx

import { AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import LoginTest from "@/pages/login-test";
import { queryClient } from "./lib/queryClient";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
return (
<Switch>
<Route path="/auth" component={AuthPage} />
<Route path="/login-test" component={LoginTest} />
<Route path="/">
<ProtectedRoute path="/" component={Dashboard} />
</Route>
<Route component={NotFound} />
</Switch>
);
}

export default function App() {
return (
<QueryClientProvider client={queryClient}>
<AuthProvider>
<Router />
<Toaster />
</AuthProvider>
</QueryClientProvider>
);
}

vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
plugins: [react()],
resolve: {
alias: {
"@": path.resolve(**dirname, "./src"),
"@shared": path.resolve(**dirname, "./src/types"),
},
},
server: {
port: 3000,
proxy: {
"/api": {
target: "http://localhost:8000",
changeOrigin: true,
},
},
},
});

src\pages\auth-page.tsx

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, UserRole } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
Form,
FormControl,
FormField,
FormItem,
FormLabel,
FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart } from "lucide-react";

export default function AuthPage() {
const [, setLocation] = useLocation();
const { user, loginMutation, registerMutation } = useAuth();

useEffect(() => {
if (user) {
setLocation("/");
}
}, [user, setLocation]);

const loginForm = useForm({
defaultValues: {
username: "",
password: "",
},
});

const registerForm = useForm({
resolver: zodResolver(insertUserSchema),
defaultValues: {
username: "",
password: "",
role: UserRole.SUBSCRIBER,
name: "",
phone: "",
experience: undefined,
degree: "",
address: "",
city: "",
previousIllness: "",
},
});

const selectedRole = registerForm.watch("role");

return (

<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
<Card className="w-full max-w-md p-6">
<div className="flex items-center gap-2 mb-6">
<Heart className="h-8 w-8 text-primary" />
<h1 className="text-3xl font-bold text-primary">Khayal Healthcare</h1>
</div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit((data) =>
                  loginMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="register">
            <Form {...registerForm}>
              <form
                onSubmit={registerForm.handleSubmit((data) =>
                  registerMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <FormField
                  control={registerForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UserRole.ADMIN}>
                            Administrator
                          </SelectItem>
                          <SelectItem value={UserRole.SUBSCRIBER}>
                            Subscriber
                          </SelectItem>
                          <SelectItem value={UserRole.CHEF}>Chef</SelectItem>
                          <SelectItem value={UserRole.PSYCHOLOGIST}>
                            Psychologist
                          </SelectItem>
                          <SelectItem value={UserRole.CARETAKER}>
                            Primary Caretaker
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(selectedRole === UserRole.CHEF ||
                  selectedRole === UserRole.PSYCHOLOGIST ||
                  selectedRole === UserRole.CARETAKER) && (
                  <FormField
                    control={registerForm.control}
                    name="experience"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Years of Experience</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={value || ""}
                            onChange={(e) => onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(selectedRole === UserRole.CHEF ||
                  selectedRole === UserRole.PSYCHOLOGIST) && (
                  <FormField
                    control={registerForm.control}
                    name="degree"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Degree/Certification</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedRole === UserRole.SUBSCRIBER && (
                  <>
                    <FormField
                      control={registerForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="previousIllness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Illnesses (if any)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending
                    ? "Creating Account..."
                    : "Create Account"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>

);
}

src\pages\dashboard.tsx

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types/schema";
import SubscriberView from "@/components/dashboard/subscriber-view-new";
import CaretakerView from "@/components/dashboard/caretaker-view";
import ChefView from "@/components/dashboard/chef-view";
import PsychologistView from "@/components/dashboard/psychologist-view";
import AdminView from "@/components/dashboard/admin-view";
import { LogOut, Heart, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
const { user, logoutMutation } = useAuth();
const { toast } = useToast();

const DashboardView = {
[UserRole.ADMIN]: AdminView,
[UserRole.SUBSCRIBER]: SubscriberView,
[UserRole.CARETAKER]: CaretakerView,
[UserRole.CHEF]: ChefView,
[UserRole.PSYCHOLOGIST]: PsychologistView,
}[user!.role];

const handleShare = async () => {
const shareData = {
title: "Khayal Healthcare",
text: "Join Khayal Healthcare - Your comprehensive healthcare management platform",
url: window.location.origin,
};

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: "Success",
          description: "Thanks for sharing Khayal Healthcare!",
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        toast({
          title: "Link Copied!",
          description:
            "Share the link with your friends to invite them to Khayal Healthcare",
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

};

return (

<div className="min-h-screen bg-gray-50">
<header className="bg-white border-b">
<div className="container mx-auto px-4 h-16 flex items-center justify-between">
<div className="flex items-center gap-2">
<Heart className="h-6 w-6 text-primary" />
<h1 className="text-xl font-semibold text-primary">
Khayal Healthcare
</h1>
</div>
<div className="flex items-center gap-4">
<span className="text-sm text-muted-foreground">
Welcome, {user!.name}
</span>
<Button variant="outline" size="sm" onClick={handleShare}>
<Share2 className="h-4 w-4 mr-2" />
Share
</Button>
<Button
variant="outline"
size="sm"
onClick={() => logoutMutation.mutate()}
disabled={logoutMutation.isPending} >
<LogOut className="h-4 w-4 mr-2" />
Logout
</Button>
</div>
</div>
</header>

      <main className="container mx-auto px-4 py-8">
        <DashboardView />
      </main>
    </div>

);
}

src\pages\login-test.tsx

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function LoginTest() {
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const { user, isLoading, loginMutation, logoutMutation } = useAuth();
const [, setLocation] = useLocation();

// Redirect to dashboard if already logged in
useEffect(() => {
if (user) {
setTimeout(() => {
setLocation("/");
}, 3000); // Redirect after 3 seconds
}
}, [user, setLocation]);

const handleLogin = async (e: React.FormEvent) => {
e.preventDefault();
try {
await loginMutation.mutateAsync({ username, password });
} catch (error) {
console.error("Login failed:", error);
}
};

const handleLogout = async () => {
try {
await logoutMutation.mutateAsync();
setLocation("/login-test");
} catch (error) {
console.error("Logout failed:", error);
}
};

return (

<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
<Card className="w-full max-w-md">
<CardHeader>
<CardTitle className="text-2xl">Authentication Test</CardTitle>
</CardHeader>
<CardContent className="space-y-6">
{isLoading ? (
<div className="flex justify-center">
<Loader2 className="h-8 w-8 animate-spin text-primary" />
</div>
) : user ? (
<div className="space-y-4">
<div className="p-4 bg-green-50 rounded-lg border border-green-200">
<h2 className="font-medium text-green-800">
Logged in successfully!
</h2>
<p className="mt-2 text-sm text-green-700">
You are logged in as{" "}
<span className="font-bold">{user.username}</span>
</p>
<p className="mt-1 text-sm text-green-700">
Role: <span className="font-bold">{user.role}</span>
</p>
<p className="mt-4 text-sm text-green-600">
Redirecting to dashboard in 3 seconds...
</p>
</div>
<Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
{logoutMutation.isPending ? (
<>
<Loader2 className="mr-2 h-4 w-4 animate-spin" />
Logging out...
</>
) : (
"Logout"
)}
</Button>
</div>
) : (
<form onSubmit={handleLogin} className="space-y-4">
<div className="space-y-2">
<label className="text-sm font-medium">Username</label>
<Input
type="text"
placeholder="Enter your username"
value={username}
onChange={(e) => setUsername(e.target.value)}
required
/>
</div>
<div className="space-y-2">
<label className="text-sm font-medium">Password</label>
<Input
type="password"
placeholder="Enter your password"
value={password}
onChange={(e) => setPassword(e.target.value)}
required
/>
</div>
<Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
{loginMutation.isPending ? (
<>
<Loader2 className="mr-2 h-4 w-4 animate-spin" />
Logging in...
</>
) : (
"Login"
)}
</Button>
</form>
)}
</CardContent>
</Card>
</div>
);
}

src\pages\not-found.tsx

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
return (

<div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
<Card className="w-full max-w-md mx-4">
<CardContent className="pt-6">
<div className="flex mb-4 gap-2">
<AlertCircle className="h-8 w-8 text-red-500" />
<h1 className="text-2xl font-bold text-gray-900">
404 Page Not Found
</h1>
</div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>

);
}

src\lib\config.ts

export const API_BASE_URL =
import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
// Auth endpoints
REGISTER: "/api/auth/register",
LOGIN: "/api/auth/login",
USER_ME: "/api/users/me",

// User endpoints
SUBSCRIBERS: "/api/users/subscribers",

// Admin endpoints
ADMIN_USERS: (role: string) => `/api/admin/users/${role}`,
ADMIN_USER_APPROVAL: (userId: number) =>
`/api/admin/users/${userId}/approval`,
ADMIN_USER_SUBSCRIPTION: (userId: number) =>
`/api/admin/users/${userId}/subscription`,
ADMIN_CARETAKERS_SUBSCRIPTIONS: "/api/admin/caretakers/subscriptions",
ADMIN_CHEFS: "/api/admin/chefs",
ADMIN_CHEF_ORDERS: "/api/admin/chef-orders",
ADMIN_ORDER_STATUS: (orderId: number) =>
`/api/admin/orders/${orderId}/status`,

// Vitals endpoints
VITALS: (subscriberId: number) => `/api/vitals/${subscriberId}`,
VITALS_SELF: (subscriberId: number) => `/api/vitals/self/${subscriberId}`,
VITALS_CREATE: "/api/vitals",

// Meals endpoints
MEALS: (chefId: number) => `/api/meals/${chefId}`,
MEALS_CREATE: "/api/meals",

// Orders endpoints
ORDERS_CHEF: (chefId: number) => `/api/orders/chef/${chefId}`,
ORDERS_SUBSCRIBER: (subscriberId: number) =>
`/api/orders/subscriber/${subscriberId}`,
ORDERS_CREATE: "/api/orders",
ORDER_STATUS: (orderId: number) => `/api/orders/${orderId}/status`,

// Appointments endpoints
APPOINTMENTS_PSYCHOLOGIST: (psychologistId: number) =>
`/api/appointments/psychologist/${psychologistId}`,
APPOINTMENTS_SUBSCRIBER: (subscriberId: number) =>
`/api/appointments/subscriber/${subscriberId}`,
APPOINTMENTS_CREATE: "/api/appointments",
APPOINTMENT_NOTES: (appointmentId: number) =>
`/api/appointments/${appointmentId}/notes`,

// Messages endpoints
MESSAGES: (userId: number) => `/api/messages/${userId}`,
MESSAGES_CREATE: "/api/messages",

// Visit requests endpoints
VISIT_REQUESTS_CARE: "/api/visit-requests/care",
VISIT_REQUESTS_CARE_SUBSCRIBER: (subscriberId: number) =>
`/api/visit-requests/care/subscriber/${subscriberId}`,
VISIT_REQUESTS_CARE_ASSIGN: (requestId: number) =>
`/api/visit-requests/care/${requestId}/assign`,
VISIT_REQUESTS_PSYCHOLOGIST: "/api/visit-requests/psychologist",
VISIT_REQUESTS_PSYCHOLOGIST_SUBSCRIBER: (subscriberId: number) =>
`/api/visit-requests/psychologist/subscriber/${subscriberId}`,
VISIT_REQUESTS_PSYCHOLOGIST_ASSIGN: (requestId: number) =>
`/api/visit-requests/psychologist/${requestId}/assign`,
VISIT_REQUESTS_CARETAKERS: "/api/visit-requests/caretakers",
};

src\lib\protected-route.tsx

import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
path,
component: Component,
}: {
path: string;
component: () => React.JSX.Element;
}) {
const { user, isLoading } = useAuth();

if (isLoading) {
return (
<Route path={path}>

<div className="flex items-center justify-center min-h-screen">
<Loader2 className="h-8 w-8 animate-spin text-border" />
</div>
</Route>
);
}

if (!user) {
return (
<Route path={path}>
<Redirect to="/auth" />
</Route>
);
}

return <Component />;
}

src\lib\queryClient.ts

import { QueryClient } from "@tanstack/react-query";
import type { QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

async function throwIfResNotOk(res: Response) {
if (!res.ok) {
let errorMessage = res.statusText;
try {
const errorData = await res.json();
errorMessage = errorData.detail || errorData.message || errorMessage;
} catch {
// If response is not JSON, use default message
}
throw new Error(`${res.status}: ${errorMessage}`);
}
}

export async function apiRequest(
method: string,
url: string,
data?: unknown | undefined
): Promise<Response> {
const token = localStorage.getItem("access_token");

const headers: HeadersInit = {
...(data ? { "Content-Type": "application/json" } : {}),
...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const res = await fetch(`${API_BASE_URL}${url}`, {
method,
headers,
body: data ? JSON.stringify(data) : undefined,
});

await throwIfResNotOk(res);
return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
({ on401: unauthorizedBehavior }) =>
async ({ queryKey }) => {
const token = localStorage.getItem("access_token");
const res = await fetch(`${API_BASE_URL}${queryKey[0]}`, {
headers: token ? { Authorization: `Bearer ${token}` } : {},
});

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();

};

export const queryClient = new QueryClient({
defaultOptions: {
queries: {
queryFn: getQueryFn({ on401: "throw" }),
refetchInterval: false,
refetchOnWindowFocus: false,
staleTime: Infinity,
retry: false,
},
mutations: {
retry: false,
},
},
});

src\lib\utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
return twMerge(clsx(inputs));
}

src\hooks\use-toast.ts

import \* as React from "react";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
id: string;
title?: React.ReactNode;
description?: React.ReactNode;
action?: ToastActionElement;
};

const actionTypes = {
ADD_TOAST: "ADD_TOAST",
UPDATE_TOAST: "UPDATE_TOAST",
DISMISS_TOAST: "DISMISS_TOAST",
REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
count = (count + 1) % Number.MAX_SAFE_INTEGER;
return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
| {
type: ActionType["ADD_TOAST"];
toast: ToasterToast;
}
| {
type: ActionType["UPDATE_TOAST"];
toast: Partial<ToasterToast>;
}
| {
type: ActionType["DISMISS_TOAST"];
toastId?: ToasterToast["id"];
}
| {
type: ActionType["REMOVE_TOAST"];
toastId?: ToasterToast["id"];
};

interface State {
toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
if (toastTimeouts.has(toastId)) {
return;
}

const timeout = setTimeout(() => {
toastTimeouts.delete(toastId);
dispatch({
type: "REMOVE_TOAST",
toastId: toastId,
});
}, TOAST_REMOVE_DELAY);

toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
switch (action.type) {
case "ADD_TOAST":
return {
...state,
toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
};

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

}
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
memoryState = reducer(memoryState, action);
listeners.forEach((listener) => {
listener(memoryState);
});
}

type Toast = Omit<ToasterToast, "id">;

function toast({ ...props }: Toast) {
const id = genId();

const update = (props: ToasterToast) =>
dispatch({
type: "UPDATE_TOAST",
toast: { ...props, id },
});
const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

dispatch({
type: "ADD_TOAST",
toast: {
...props,
id,
open: true,
onOpenChange: (open) => {
if (!open) dismiss();
},
},
});

return {
id: id,
dismiss,
update,
};
}

function useToast() {
const [state, setState] = React.useState<State>(memoryState);

React.useEffect(() => {
listeners.push(setState);
return () => {
const index = listeners.indexOf(setState);
if (index > -1) {
listeners.splice(index, 1);
}
};
}, [state]);

return {
...state,
toast,
dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
};
}

export { useToast, toast };

src\hooks\use-mobile.tsx

import \* as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
undefined
);

React.useEffect(() => {
const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
const onChange = () => {
setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
};
mql.addEventListener("change", onChange);
setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
return () => mql.removeEventListener("change", onChange);
}, []);

return !!isMobile;
}

src\hooks\use-auth.tsx

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { User as SelectUser, InsertUser } from "../types/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/config";

type AuthContextType = {
user: SelectUser | null;
isLoading: boolean;
error: Error | null;
loginMutation: UseMutationResult<LoginResponse, Error, LoginData>;
logoutMutation: UseMutationResult<void, Error, void>;
registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;
type LoginResponse = {
access_token: string;
token_type: string;
user: SelectUser;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
const { toast } = useToast();

const {
data: user,
error,
isLoading,
} = useQuery<SelectUser | undefined, Error>({
queryKey: [API_ENDPOINTS.USER_ME],
queryFn: getQueryFn({ on401: "returnNull" }),
enabled: !!localStorage.getItem("access_token"),
});

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
console.log("Login successful, storing token");
localStorage.setItem("access_token", data.access_token);
queryClient.setQueryData([API_ENDPOINTS.USER_ME], data.user);
queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.USER_ME] });

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
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
onSuccess: (user: SelectUser) => {
console.log("Registration successful");
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
},
onSuccess: () => {
queryClient.setQueryData([API_ENDPOINTS.USER_ME], null);
queryClient.clear();
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
      }} >
{children}
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

src\components\dashboard\subscriber-view-new.tsx

import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
Card,
CardContent,
CardDescription,
CardHeader,
CardTitle,
CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
Loader2,
ShoppingBag,
Calendar,
Activity,
Heart,
Clock,
Contact,
Utensils,
FileText,
MessageSquare,
Stethoscope,
Camera,
ScrollText,
Package,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
insertVitalsSchema,
insertCareVisitRequestSchema,
insertPsychologistVisitRequestSchema,
} from "../../shared/schema";
import {
Form,
FormControl,
FormField,
FormItem,
FormLabel,
FormMessage,
FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RemotePPG from "./remote-ppg";

export default function SubscriberView() {
const { user } = useAuth();

// Vitals management
const selfVitalsForm = useForm({
resolver: zodResolver(insertVitalsSchema),
defaultValues: {
subscriberId: user!.id,
bloodSugar: 0,
bloodPressure: "",
oxygenLevel: 0,
pulse: 0,
reportType: "self",
timestamp: new Date().toISOString(),
},
});

// Mutation for submitting self vitals
const submitSelfVitalsMutation = useMutation({
mutationFn: async (data: any) => {
const deviceInfo = {
userAgent: navigator.userAgent,
platform: navigator.platform,
timestamp: new Date().toISOString(),
};

      return apiRequest("POST", "/api/vitals", {
        ...data,
        deviceInfo,
        timestamp: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vitals", user!.id] });
      queryClient.invalidateQueries({
        queryKey: ["/api/vitals/self", user!.id],
      });
      toast({
        title: "Success",
        description: "Vitals recorded successfully",
      });
      selfVitalsForm.reset({
        subscriberId: user!.id,
        bloodSugar: 0,
        bloodPressure: "",
        oxygenLevel: 0,
        pulse: 0,
        reportType: "self",
        timestamp: new Date().toISOString(),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },

});

// Query for self vitals history
const { data: selfVitals = [], isLoading: selfVitalsLoading } = useQuery({
queryKey: ["/api/vitals/self", user!.id],
queryFn: () =>
fetch(`/api/vitals/self/${user!.id}`).then((res) => res.json()),
});

// Query for all vitals
const { data: vitals, isLoading: vitalsLoading } = useQuery({
queryKey: ["/api/vitals", user!.id],
queryFn: () => fetch(`/api/vitals/${user!.id}`).then((res) => res.json()),
});

// Form for care visit request
const careForm = useForm({
resolver: zodResolver(insertCareVisitRequestSchema),
defaultValues: {
subscriberId: user!.id,
requestedDate: new Date().toISOString().split("T")[0],
notes: "",
status: "pending",
},
});

// Form for psychologist visit request
const psychForm = useForm({
resolver: zodResolver(insertPsychologistVisitRequestSchema),
defaultValues: {
subscriberId: user!.id,
requestedDate: new Date().toISOString().split("T")[0],
notes: "",
status: "pending",
},
});

// Care visit requests
const { data: careVisitRequests = [], isLoading: requestsLoading } = useQuery(
{
queryKey: ["/api/care-visit-requests", user!.id],
queryFn: () =>
fetch(`/api/care-visit-requests/${user!.id}`).then((res) => res.json()),
}
);

// Psychologist visit requests
const {
data: psychologistVisitRequests = [],
isLoading: psychRequestsLoading,
} = useQuery({
queryKey: ["/api/psychologist-visit-requests", user!.id],
queryFn: () =>
fetch(`/api/psychologist-visit-requests/${user!.id}`).then((res) =>
res.json()
),
});

// Mutation for creating care visit request
const createCareRequestMutation = useMutation({
mutationFn: async (data: any) => {
const res = await apiRequest("POST", "/api/care-visit-requests", {
...data,
requestedDate: new Date(data.requestedDate).toISOString(),
});
return res.json();
},
onSuccess: () => {
queryClient.invalidateQueries({
queryKey: ["/api/care-visit-requests", user!.id],
});
toast({
title: "Success",
description: "Care visit request submitted successfully",
});
careForm.reset({
subscriberId: user!.id,
requestedDate: new Date().toISOString().split("T")[0],
notes: "",
status: "pending",
});
},
onError: (error: Error) => {
toast({
title: "Error",
description: error.message,
variant: "destructive",
});
},
});

// Mutation for creating psychologist visit request
const createPsychRequestMutation = useMutation({
mutationFn: async (data: any) => {
const res = await apiRequest("POST", "/api/psychologist-visit-requests", {
...data,
requestedDate: new Date(data.requestedDate).toISOString(),
});
return res.json();
},
onSuccess: () => {
queryClient.invalidateQueries({
queryKey: ["/api/psychologist-visit-requests", user!.id],
});
toast({
title: "Success",
description: "Psychologist visit request submitted successfully",
});
psychForm.reset({
subscriberId: user!.id,
requestedDate: new Date().toISOString().split("T")[0],
notes: "",
status: "pending",
});
},
onError: (error: Error) => {
toast({
title: "Error",
description: error.message,
variant: "destructive",
});
},
});

// Appointments
const { data: appointments, isLoading: appointmentsLoading } = useQuery({
queryKey: ["/api/appointments/subscriber", user!.id],
queryFn: () =>
fetch(`/api/appointments/subscriber/${user!.id}`).then((res) =>
res.json()
),
});

// Chefs and their meals
const { data: chefs, isLoading: chefsLoading } = useQuery({
queryKey: ["/api/chefs"],
queryFn: () => fetch("/api/chefs").then((res) => res.json()),
});

// Orders
const { data: orders = [], isLoading: ordersLoading } = useQuery({
queryKey: ["/api/orders/subscriber", user!.id],
queryFn: () =>
fetch(`/api/orders/subscriber/${user!.id}`).then((res) => res.json()),
});

// Order mutation
const orderMutation = useMutation({
mutationFn: async ({
mealId,
chefId,
}: {
mealId: number;
chefId: number;
}) => {
const orderData = {
mealId,
chefId,
subscriberId: user!.id,
status: "pending",
timestamp: new Date().toISOString(),
subscriberDetails: {
name: user!.name,
phone: user!.phone,
address: user!.address,
},
};

      const res = await apiRequest("POST", "/api/orders", orderData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to place order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/orders/subscriber", user!.id],
      });
      toast({
        title: "Success",
        description: "Your order has been sent to the chef and admin",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },

});

if (
vitalsLoading ||
appointmentsLoading ||
chefsLoading ||
ordersLoading ||
requestsLoading ||
psychRequestsLoading ||
selfVitalsLoading
) {
return (

<div className="flex justify-center">
<Loader2 className="h-8 w-8 animate-spin text-primary" />
</div>
);
}

const totalOrderAmount = orders.reduce((total: number, order: any) => {
const chef = chefs?.find((c: any) => c.id === order.chefId);
const meal = chef?.meals?.find((m: any) => m.id === order.mealId);
return total + (meal?.price || 0);
}, 0);

// Format price in PKR
const formatPrice = (price: number) => {
return `PKR ${price.toLocaleString()}`;
};

return (

<div className="space-y-6">
{/_ Welcome Header _/}
<div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border p-6">
<h1 className="text-2xl font-bold tracking-tight mb-2">
Welcome back, {user?.name}
</h1>
<p className="text-muted-foreground">
Manage your health, food, and care services all in one place.
</p>
</div>

      {/* Main Services Tabs */}
      <Tabs defaultValue="health" className="w-full">
        <div className="sticky top-0 bg-background z-10 pb-2">
          <TabsList className="w-full grid grid-cols-3 gap-4 p-1">
            <TabsTrigger
              value="health"
              className="flex flex-col items-center py-3 space-y-1"
            >
              <Heart className="h-5 w-5" />
              <span>Health Monitoring</span>
            </TabsTrigger>
            <TabsTrigger
              value="food"
              className="flex flex-col items-center py-3 space-y-1"
            >
              <Utensils className="h-5 w-5" />
              <span>Food Services</span>
            </TabsTrigger>
            <TabsTrigger
              value="care"
              className="flex flex-col items-center py-3 space-y-1"
            >
              <Stethoscope className="h-5 w-5" />
              <span>Care Services</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ==================== HEALTH MONITORING TAB ==================== */}
        <TabsContent value="health" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Heart className="h-6 w-6 text-primary" />
                <CardTitle>Health Monitoring</CardTitle>
              </div>
              <CardDescription>
                Track your vital signs and health metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="selfVitals" className="space-y-4">
                <TabsList className="grid grid-cols-3 gap-2">
                  <TabsTrigger
                    value="selfVitals"
                    className="flex items-center space-x-2"
                  >
                    <Activity className="h-4 w-4" />
                    <span>Daily Vitals</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="remotePPG"
                    className="flex items-center space-x-2"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Facial Analysis</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="vitals"
                    className="flex items-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Health Records</span>
                  </TabsTrigger>
                </TabsList>

                {/* Daily Vitals Tab */}
                <TabsContent value="selfVitals">
                  <div className="grid gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Record Daily Vitals
                        </CardTitle>
                        <CardDescription>
                          Enter your blood sugar, blood pressure, pulse, and
                          oxygen level measurements
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Form {...selfVitalsForm}>
                          <form
                            onSubmit={selfVitalsForm.handleSubmit((data) =>
                              submitSelfVitalsMutation.mutate(data)
                            )}
                            className="space-y-4"
                          >
                            <FormField
                              control={selfVitalsForm.control}
                              name="bloodSugar"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Blood Sugar (mg/dL)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Enter blood sugar level"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(Number(e.target.value))
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={selfVitalsForm.control}
                              name="bloodPressure"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Blood Pressure (systolic/diastolic)
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="e.g., 120/80"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Enter in format "systolic/diastolic" (e.g.,
                                    120/80)
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={selfVitalsForm.control}
                              name="pulse"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pulse (bpm)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Enter pulse rate"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(Number(e.target.value))
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={selfVitalsForm.control}
                              name="oxygenLevel"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Oxygen Level (%)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Enter oxygen level"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(Number(e.target.value))
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button
                              type="submit"
                              className="w-full"
                              disabled={submitSelfVitalsMutation.isPending}
                            >
                              {submitSelfVitalsMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Recording...
                                </>
                              ) : (
                                "Record Vitals"
                              )}
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Self Vitals History</CardTitle>
                        <CardDescription>
                          Your recorded daily measurements
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>Blood Sugar</TableHead>
                              <TableHead>Blood Pressure</TableHead>
                              <TableHead>Pulse</TableHead>
                              <TableHead>Oxygen Level</TableHead>
                              <TableHead>Device</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selfVitals?.map((vital: any) => (
                              <TableRow key={`${vital.id}-${vital.timestamp}`}>
                                <TableCell>
                                  {vital.timestamp
                                    ? format(new Date(vital.timestamp), "PPpp")
                                    : "N/A"}
                                </TableCell>
                                <TableCell>{vital.bloodSugar} mg/dL</TableCell>
                                <TableCell>{vital.bloodPressure}</TableCell>
                                <TableCell>{vital.pulse} bpm</TableCell>
                                <TableCell>{vital.oxygenLevel}%</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {vital.deviceInfo?.platform || "Unknown"}
                                </TableCell>
                              </TableRow>
                            ))}
                            {!selfVitalsLoading &&
                              (!selfVitals || selfVitals.length === 0) && (
                                <TableRow>
                                  <TableCell
                                    colSpan={6}
                                    className="text-center"
                                  >
                                    No self vitals recorded yet
                                  </TableCell>
                                </TableRow>
                              )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Remote PPG Tab */}
                <TabsContent value="remotePPG">
                  <RemotePPG
                    userId={user!.id}
                    onVitalsRecorded={(vitals) => {
                      queryClient.invalidateQueries({
                        queryKey: ["/api/vitals", user!.id],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["/api/vitals/self", user!.id],
                      });
                      toast({
                        title: "Success",
                        description:
                          "Vitals recorded successfully using facial analysis",
                      });
                    }}
                  />
                </TabsContent>

                {/* Health Records Tab */}
                <TabsContent value="vitals">
                  <Card>
                    <CardHeader>
                      <CardTitle>Complete Health History</CardTitle>
                      <CardDescription>
                        All of your health measurements, including those taken
                        by caretakers and via facial analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Blood Sugar</TableHead>
                            <TableHead>Blood Pressure</TableHead>
                            <TableHead>Pulse</TableHead>
                            <TableHead>Oxygen Level</TableHead>
                            <TableHead>Report Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vitals?.map((vital: any) => (
                            <TableRow key={`${vital.id}-${vital.timestamp}`}>
                              <TableCell>
                                {vital.timestamp
                                  ? format(new Date(vital.timestamp), "PPpp")
                                  : "N/A"}
                              </TableCell>
                              <TableCell>{vital.bloodSugar} mg/dL</TableCell>
                              <TableCell>{vital.bloodPressure}</TableCell>
                              <TableCell>{vital.pulse} bpm</TableCell>
                              <TableCell>{vital.oxygenLevel}%</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    vital.reportType === "self"
                                      ? "outline"
                                      : vital.reportType === "caretaker"
                                      ? "secondary"
                                      : "default"
                                  }
                                >
                                  {vital.reportType}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!vitalsLoading &&
                            (!vitals || vitals.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center">
                                  No vitals recorded yet
                                </TableCell>
                              </TableRow>
                            )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== FOOD SERVICES TAB ==================== */}
        <TabsContent value="food" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Utensils className="h-6 w-6 text-primary" />
                <CardTitle>Food Services</CardTitle>
              </div>
              <CardDescription>
                Order healthy meals from certified chefs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="menu" className="space-y-4">
                <TabsList className="grid grid-cols-2 gap-2">
                  <TabsTrigger
                    value="menu"
                    className="flex items-center space-x-2"
                  >
                    <ScrollText className="h-4 w-4" />
                    <span>Available Meals</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="orders"
                    className="flex items-center space-x-2"
                  >
                    <Package className="h-4 w-4" />
                    <span>Your Orders</span>
                  </TabsTrigger>
                </TabsList>

                {/* Available Meals Tab */}
                <TabsContent value="menu">
                  <div className="grid gap-6">
                    {chefs?.map((chef: any) => (
                      <Card key={chef.id}>
                        <CardHeader>
                          <CardTitle>{chef.name}'s Kitchen</CardTitle>
                          <CardDescription>
                            {chef.experience} years of experience |{" "}
                            {chef.specialties?.join(", ")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {chef.meals?.map((meal: any) => (
                              <Card key={meal.id} className="overflow-hidden">
                                <CardHeader className="p-4">
                                  <CardTitle className="text-base">
                                    {meal.name}
                                  </CardTitle>
                                  <CardDescription className="text-sm">
                                    {meal.description}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Calories: {meal.calories}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Category: {meal.category}
                                      </p>
                                    </div>
                                    <p className="font-medium">
                                      {formatPrice(meal.price)}
                                    </p>
                                  </div>
                                </CardContent>
                                <CardFooter className="p-4 pt-0 flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      orderMutation.mutate({
                                        mealId: meal.id,
                                        chefId: chef.id,
                                      })
                                    }
                                    disabled={orderMutation.isPending}
                                  >
                                    {orderMutation.isPending ? (
                                      <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Ordering...
                                      </>
                                    ) : (
                                      <>Order Meal</>
                                    )}
                                  </Button>
                                </CardFooter>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {(!chefs || chefs.length === 0) && (
                      <div className="text-center p-6">
                        <p className="text-muted-foreground">
                          No chefs available at the moment
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Your Orders Tab */}
                <TabsContent value="orders">
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Meal Orders</CardTitle>
                      <CardDescription>
                        Track your orders and delivery status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Meal</TableHead>
                            <TableHead>Chef</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders?.map((order: any) => {
                            const chef = chefs?.find(
                              (c: any) => c.id === order.chefId
                            );
                            const meal = chef?.meals?.find(
                              (m: any) => m.id === order.mealId
                            );
                            return (
                              <TableRow key={order.id}>
                                <TableCell>
                                  {order.timestamp
                                    ? format(new Date(order.timestamp), "PPP")
                                    : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {meal?.name || "Unknown meal"}
                                </TableCell>
                                <TableCell>
                                  {chef?.name || "Unknown chef"}
                                </TableCell>
                                <TableCell>
                                  {meal ? formatPrice(meal.price) : "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      order.status === "completed"
                                        ? "default"
                                        : order.status === "in-progress"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {order.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {orders?.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center">
                                No orders placed yet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      {orders?.length > 0 && (
                        <div className="mt-4 p-4 border rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              Total Order Amount:
                            </span>
                            <span className="font-bold">
                              {formatPrice(totalOrderAmount)}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== CARE SERVICES TAB ==================== */}
        <TabsContent value="care" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Stethoscope className="h-6 w-6 text-primary" />
                <CardTitle>Care Services</CardTitle>
              </div>
              <CardDescription>
                Manage your healthcare appointments and requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="counseling" className="space-y-4">
                <TabsList className="grid grid-cols-3 gap-2">
                  <TabsTrigger
                    value="counseling"
                    className="flex items-center space-x-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Counseling</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="appointments"
                    className="flex items-center space-x-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Appointments</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="careVisits"
                    className="flex items-center space-x-2"
                  >
                    <Contact className="h-4 w-4" />
                    <span>Care Visits</span>
                  </TabsTrigger>
                </TabsList>

                {/* Counseling Tab */}
                <TabsContent value="counseling">
                  <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Request Counseling Session</CardTitle>
                        <CardDescription>
                          Schedule a session with a psychologist
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Form {...psychForm}>
                          <form
                            onSubmit={psychForm.handleSubmit((data) =>
                              createPsychRequestMutation.mutate(data)
                            )}
                            className="space-y-4"
                          >
                            <FormField
                              control={psychForm.control}
                              name="requestedDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Preferred Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={psychForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Initial Concerns</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Describe your concerns or reasons for seeking counseling..."
                                      rows={3}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button
                              type="submit"
                              disabled={createPsychRequestMutation.isPending}
                              className="w-full"
                            >
                              {createPsychRequestMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                "Request Counseling"
                              )}
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Counseling Requests</CardTitle>
                        <CardDescription>
                          Your requested counseling sessions and their status
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Requested Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Psychologist</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {psychologistVisitRequests.map((request: any) => (
                              <TableRow key={request.id}>
                                <TableCell>
                                  {format(
                                    new Date(request.requestedDate),
                                    "PPP"
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      request.status === "assigned"
                                        ? "default"
                                        : request.status === "completed"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {request.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {request.psychologist?.name || "Not assigned"}
                                </TableCell>
                                <TableCell>
                                  {request.notes || "No notes"}
                                </TableCell>
                              </TableRow>
                            ))}
                            {psychologistVisitRequests.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center">
                                  No counseling requests submitted yet
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Appointments Tab */}
                <TabsContent value="appointments">
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Appointments</CardTitle>
                      <CardDescription>
                        Upcoming and past appointments with healthcare providers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Psychologist</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {appointments?.map((appointment: any) => (
                            <TableRow key={appointment.id}>
                              <TableCell>
                                {appointment.dateTime
                                  ? format(
                                      new Date(appointment.dateTime),
                                      "PPp"
                                    )
                                  : "N/A"}
                              </TableCell>
                              <TableCell>
                                {appointment.psychologist?.name || "Unknown"}
                              </TableCell>
                              <TableCell>
                                {appointment.notes || "No notes yet"}
                              </TableCell>
                            </TableRow>
                          ))}
                          {!appointments || appointments.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center">
                                No appointments scheduled
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Care Visits Tab */}
                <TabsContent value="careVisits">
                  <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Request Care Taker Visit</CardTitle>
                        <CardDescription>
                          Schedule a visit from a primary care taker
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Form {...careForm}>
                          <form
                            onSubmit={careForm.handleSubmit((data) =>
                              createCareRequestMutation.mutate(data)
                            )}
                            className="space-y-4"
                          >
                            <FormField
                              control={careForm.control}
                              name="requestedDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Preferred Visit Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={careForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Additional Notes</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Describe any specific requirements or concerns..."
                                      rows={3}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button
                              type="submit"
                              disabled={createCareRequestMutation.isPending}
                              className="w-full"
                            >
                              {createCareRequestMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                "Request Visit"
                              )}
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Care Visit Requests</CardTitle>
                        <CardDescription>
                          Your requested care taker visits and their status
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Requested Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Care Taker</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {careVisitRequests.map((request: any) => (
                              <TableRow key={request.id}>
                                <TableCell>
                                  {format(
                                    new Date(request.requestedDate),
                                    "PPP"
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      request.status === "assigned"
                                        ? "default"
                                        : request.status === "completed"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {request.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {request.caretaker?.name || "Not assigned"}
                                </TableCell>
                                <TableCell>
                                  {request.notes || "No notes"}
                                </TableCell>
                              </TableRow>
                            ))}
                            {careVisitRequests.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center">
                                  No care visit requests submitted yet
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

);
}

above is Making I made for my fast apis but

/api/auth/register
/api/auth/login
/api/users/me
/api/users/subscribers
/api/admin/users/{role}
/api/admin/users/{user_id}/approval
/api/admin/users/{user_id}/subscription
/api/admin/caretakers/subscriptions
/api/admin/chefs
/api/admin/chef-orders
/api/admin/orders/{order_id}/status
/api/vitals/{subscriber_id}
/api/vitals/self/{subscriber_id}
/api/vitals
/api/meals/{chef_id}
/api/meals
/api/orders/chef/{chef_id}
/api/orders/subscriber/{subscriber_id}
/api/orders
/api/orders/{order_id}/status
/api/appointments/psychologist/{psychologist_id}
/api/appointments/subscriber/{subscriber_id}
/api/appointments
/api/appointments/{appointment_id}/notes
/api/messages/{user_id}
/api/messages
/api/visit-requests/care
/api/visit-requests/care/subscriber/{subscriber_id}
/api/visit-requests/care
/api/visit-requests/care/{request_id}/assign
/api/visit-requests/psychologist
/api/visit-requests/psychologist/subscriber/{subscriber_id}
/api/visit-requests/psychologist
/api/visit-requests/psychologist/{request_id}/assign
/api/visit-requests/caretakers
/
/health

these are my endpoints now I want you fix my subscriber-view-new.tsxcode becauseits given me error i think the code is not set correctly usingmy fast api in that so give me full code from start to end
