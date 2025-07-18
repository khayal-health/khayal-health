import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRole } from "@/types/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KhayalLogo } from "@/components/ui/logo";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { VerificationForm } from "@/components/auth/verification-form";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";

// Pakistani cities list organized by province
const PAKISTANI_CITIES = [
  // Punjab
  "Lahore",
  "Faisalabad",
  "Rawalpindi",
  "Multan",
  "Gujranwala",
  "Sialkot",
  "Bahawalpur",
  "Sargodha",
  "Sheikhupura",
  "Jhang",
  "Gujrat",
  "Kasur",
  "Rahimyar Khan",
  "Sahiwal",
  "Okara",
  "Wah Cantonment",
  "Dera Ghazi Khan",
  "Mirpur Mathelo",
  "Kamoke",
  "Sadiqabad",
  "Burewala",
  "Kohat",
  "Jacobabad",
  "Muzaffargarh",
  "Khanpur",
  "Gojra",
  "Bahawalnagar",
  "Muridke",
  "Pak Pattan",
  "Abottabad",
  "Talagang",
  "Jalalpur Jattan",
  "Gujar Khan",
  "Chishtian Mandi",

  // Sindh
  "Karachi",
  "Hyderabad",
  "Sukkur",
  "Larkana",
  "Nawabshah",
  "Mirpurkhas",
  "Jacobabad",
  "Shikarpur",
  "Khairpur",
  "Dadu",
  "Ghotki",
  "Badin",
  "Thatta",
  "Sujawal",
  "Tando Allahyar",
  "Matiari",
  "Tando Muhammad Khan",
  "Jamshoro",
  "Umerkot",
  "Sanghar",
  "Naushahro Feroze",
  "Shahdadkot",

  // Khyber Pakhtunkhwa (KPK)
  "Peshawar",
  "Mardan",
  "Mingora",
  "Kohat",
  "Dera Ismail Khan",
  "Bannu",
  "Swabi",
  "Charsadda",
  "Nowshera",
  "Mansehra",
  "Abbottabad",
  "Karak",
  "Hangu",
  "Parachinar",
  "Chitral",
  "Dir",
  "Wazirabad",
  "Lakki Marwat",
  "Tank",
  "Miranshah",
  "Kurram",
  "Orakzai",
  "Khyber",
  "Mohmand",

  // Balochistan
  "Quetta",
  "Hub",
  "Turbat",
  "Khuzdar",
  "Chaman",
  "Gwadar",
  "Zhob",
  "Sibi",
  "Loralai",
  "Mastung",
  "Kalat",
  "Kharan",
  "Pishin",
  "Nushki",
  "Taftan",
  "Dalbandin",
  "Panjgur",
  "Awaran",
  "Lasbela",
  "Jaffarabad",

  // Islamabad Capital Territory
  "Islamabad",

  // Azad Kashmir
  "Muzaffarabad",
  "Mirpur",
  "Kotli",
  "Bhimber",
  "Rawalakot",
  "Bagh",
  "Palandri",

  // Gilgit-Baltistan
  "Gilgit",
  "Skardu",
  "Hunza",
  "Ghanche",
  "Shigar",
  "Nagar",
  "Gupis-Yasin",
  "Kharmang",
  "Rondu",
  "Ghizer",
  "Astore",
  "Diamer",
  "Tangir",
  "Darel",
].sort();

// Enhanced validation schemas
const phoneValidation = z
  .string()
  .min(11, "📞 Phone number must be exactly 11 digits")
  .max(11, "📞 Phone number must be exactly 11 digits")
  .regex(
    /^03\d{9}$/,
    "📞 Phone number must start with '03' and contain only digits"
  )
  .transform((val) => val.replace(/\D/g, ""));

const passwordValidation = z
  .string()
  .min(8, "🔐 Password must be at least 8 characters long")
  .regex(/[A-Z]/, "🔐 Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "🔐 Password must contain at least one lowercase letter")
  .regex(/\d.*\d/, "🔐 Password must contain at least two numbers");

const cityValidation = z
  .string()
  .min(1, "🏙️ Please select your city")
  .refine(
    (val) => PAKISTANI_CITIES.includes(val),
    "🏙️ Please select a valid Pakistani city"
  );

// Updated form schemas
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerFormSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: passwordValidation,
    email: z.string().email("Please enter a valid email address"),
    role: z.nativeEnum(UserRole),
    name: z.string().min(2, "Full name must be at least 2 characters"),
    phone: phoneValidation,
    experience: z.number().optional(),
    degree: z.string().optional(),
    address: z.string().optional(),
    city: cityValidation.optional(),
    previousIllness: z.string().optional(),
  })
  .refine(
    (data) => {
      // City is required for subscribers
      if (data.role === UserRole.SUBSCRIBER && !data.city) {
        return false;
      }
      return true;
    },
    {
      message: "🏙️ City is required for subscribers",
      path: ["city"],
    }
  );

interface LoginFormData {
  username: string;
  password: string;
}

interface RegisterFormData {
  username: string;
  password: string;
  email: string;
  role: UserRole;
  name: string;
  phone: string;
  experience?: number;
  degree?: string;
  address?: string;
  city?: string;
  previousIllness?: string;
}

interface LoginMutation {
  mutate: (data: LoginFormData) => void;
  isPending: boolean;
}

interface RegisterMutation {
  mutate: (data: RegisterFormData) => void;
  isPending: boolean;
  isSuccess: boolean;
}

interface LoginFormProps {
  loginForm: UseFormReturn<LoginFormData>;
  loginMutation: LoginMutation;
}

interface RegisterFormProps {
  registerForm: UseFormReturn<RegisterFormData>;
  registerMutation: RegisterMutation;
  selectedRole: UserRole;
}

// Add these new types
interface VerificationState {
  email: string;
  phone: string;
  type: "registration" | "password_reset";
  registrationData?: any;
  code?: string;
}

// Background decorations component
const BackgroundDecorations = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-24 -right-24 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-teal-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
    <div className="absolute -bottom-24 -left-24 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-tr from-blue-200/30 to-teal-200/30 rounded-full blur-3xl"></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-r from-teal-100/20 to-blue-100/20 rounded-full blur-2xl"></div>
  </div>
);

const MobileHeader = ({ isMobile }: { isMobile: boolean }) => {
  if (!isMobile) return null;

  return (
    <div className="flex flex-col items-center mb-6 sm:mb-8">
      <div className="flex items-center gap-3 mb-2">
        <KhayalLogo
          size="md"
          className="drop-shadow-md w-12 h-12 sm:w-14 sm:h-14"
        />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
            Khayal Health
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Healthcare Platform
          </p>
        </div>
      </div>
      <p className="text-sm text-slate-600 text-center mt-2 px-4">
        Connect with health professionals
      </p>
    </div>
  );
};

const DesktopBanner = ({ isMobile }: { isMobile: boolean }) => {
  if (isMobile) return null;

  return (
    <div className="flex w-full lg:w-1/2 xl:w-2/5 flex-col justify-center items-center p-6 lg:p-8 xl:p-12 relative z-10">
      <div className="max-w-md space-y-6 lg:space-y-8 text-center">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 lg:gap-4 mb-6 lg:mb-8">
            <KhayalLogo size="xl" className="drop-shadow-lg" />
            <div className="text-center sm:text-left mt-3 sm:mt-0">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                Khayal Health
              </h1>
              <p className="text-base lg:text-lg text-slate-600 font-medium">
                Healthcare Platform
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 lg:space-y-6">
          <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-slate-800 leading-tight">
            Your Platform for Health & Wellness Services
          </h2>
          <p className="text-base lg:text-lg text-slate-600 leading-relaxed">
            Connect with health professionals, chefs, psychologists, and primary
            care takers
          </p>
        </div>
      </div>
    </div>
  );
};

// Form utilities
const FormUtils = {
  TAB_LIST_CLASSES:
    "grid w-full grid-cols-2 mb-6 sm:mb-8 bg-slate-100/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-1 h-10 sm:h-12",
  TAB_TRIGGER_CLASSES:
    "rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-teal-600 transition-all duration-200",
  INPUT_CLASSES:
    "border-slate-200 rounded-lg sm:rounded-xl focus:border-teal-400 focus:ring-teal-400/20 bg-white/50 backdrop-blur-sm transition-all duration-200",
  BUTTON_CLASSES:
    "w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium rounded-lg sm:rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-200 transform hover:-translate-y-0.5",

  getInputClasses: (height: string): string =>
    `${height} ${FormUtils.INPUT_CLASSES}`,
  getButtonClasses: (height: string): string =>
    `${FormUtils.BUTTON_CLASSES} ${height}`,
};

// Phone number formatter utility
const formatPhoneNumber = (value: string) => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");

  // Limit to 11 digits
  const truncated = digits.slice(0, 11);

  // Format as 03XX-XXXXXXX
  if (truncated.length > 4) {
    return `${truncated.slice(0, 4)}-${truncated.slice(4)}`;
  }
  return truncated;
};

// Password strength indicator
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const checks = [
    { test: password.length >= 8, label: "At least 8 characters" },
    { test: /[A-Z]/.test(password), label: "One uppercase letter" },
    { test: /[a-z]/.test(password), label: "One lowercase letter" },
    { test: /\d.*\d/.test(password), label: "Two numbers" },
  ];

  const passedChecks = checks.filter((check) => check.test).length;

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < passedChecks
                ? passedChecks === 4
                  ? "bg-green-500"
                  : passedChecks >= 2
                  ? "bg-yellow-500"
                  : "bg-red-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <div className="space-y-1">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div
              className={`w-3 h-3 rounded-full flex items-center justify-center ${
                check.test
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {check.test ? "✓" : "○"}
            </div>
            <span className={check.test ? "text-green-600" : "text-gray-500"}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Login form component
const LoginForm: React.FC<LoginFormProps> = ({ loginForm, loginMutation }) => (
  <Form {...loginForm}>
    <form
      onSubmit={loginForm.handleSubmit((data: LoginFormData) =>
        loginMutation.mutate(data)
      )}
      className="space-y-4 sm:space-y-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <FormField
          control={loginForm.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                Username
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className={FormUtils.getInputClasses(
                    "h-10 sm:h-12 text-sm sm:text-base"
                  )}
                  placeholder="Enter your username"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={loginForm.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                Password
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  {...field}
                  className={FormUtils.getInputClasses(
                    "h-10 sm:h-12 text-sm sm:text-base"
                  )}
                  placeholder="Enter your password"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <Button
        type="submit"
        className={FormUtils.getButtonClasses(
          "h-10 sm:h-12 text-sm sm:text-base"
        )}
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-sm sm:text-base">Logging in...</span>
          </div>
        ) : (
          "Login"
        )}
      </Button>
    </form>
  </Form>
);

const RegisterForm: React.FC<RegisterFormProps> = ({
  registerForm,
  registerMutation,
  selectedRole,
}) => {
  const watchedPassword = registerForm.watch("password");

  return (
    <Form {...registerForm}>
      <form
        onSubmit={registerForm.handleSubmit((data: RegisterFormData) =>
          registerMutation.mutate(data)
        )}
        className="space-y-4 sm:space-y-5"
      >
        <div className="h-[350px] sm:h-[400px] lg:h-[450px] overflow-y-auto px-2 sm:px-4 space-y-4 sm:space-y-5 custom-scrollbar">
          {/* Role Selector - REMOVED ADMIN OPTION */}
          <FormField
            control={registerForm.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                  Role
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger
                      className={FormUtils.getInputClasses(
                        "h-10 sm:h-12 text-sm sm:text-base"
                      )}
                    >
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-lg sm:rounded-xl border-slate-200 bg-white/95 backdrop-blur-lg">
                    <SelectItem
                      value={UserRole.SUBSCRIBER}
                      className="rounded-lg text-sm sm:text-base"
                    >
                      Subscriber
                    </SelectItem>
                    <SelectItem
                      value={UserRole.CHEF}
                      className="rounded-lg text-sm sm:text-base"
                    >
                      Chef
                    </SelectItem>
                    <SelectItem
                      value={UserRole.PSYCHOLOGIST}
                      className="rounded-lg text-sm sm:text-base"
                    >
                      Psychologist
                    </SelectItem>
                    <SelectItem
                      value={UserRole.CARETAKER}
                      className="rounded-lg text-sm sm:text-base"
                    >
                      Primary Caretaker
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Basic Fields - Required for all roles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField
              control={registerForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                    Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className={FormUtils.getInputClasses(
                        "h-9 sm:h-11 text-sm sm:text-base"
                      )}
                      placeholder="Username"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                    Password
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      className={FormUtils.getInputClasses(
                        "h-9 sm:h-11 text-sm sm:text-base"
                      )}
                      placeholder="Password"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                  <PasswordStrengthIndicator password={watchedPassword || ""} />
                </FormItem>
              )}
            />
          </div>

          {/* Email field - Required for all roles */}
          <FormField
            control={registerForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                  Email Address
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    {...field}
                    className={FormUtils.getInputClasses(
                      "h-9 sm:h-11 text-sm sm:text-base"
                    )}
                    placeholder="your.email@example.com"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Name and Phone - Required for all roles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField
              control={registerForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className={FormUtils.getInputClasses(
                        "h-9 sm:h-11 text-sm sm:text-base"
                      )}
                      placeholder="Your full name"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                    Phone Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={formatPhoneNumber(field.value || "")}
                      onChange={(e) => {
                        const formattedValue = formatPhoneNumber(
                          e.target.value
                        );
                        field.onChange(formattedValue.replace(/-/g, ""));
                      }}
                      className={FormUtils.getInputClasses(
                        "h-9 sm:h-11 text-sm sm:text-base"
                      )}
                      placeholder="03XX-XXXXXXX"
                      maxLength={12} // 11 digits + 1 dash
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          {/* Professional Fields */}
          <div className="space-y-4 sm:space-y-5">
            <div
              className={`transition-all duration-300 ease-in-out ${
                selectedRole === UserRole.CHEF ||
                selectedRole === UserRole.PSYCHOLOGIST ||
                selectedRole === UserRole.CARETAKER
                  ? "opacity-100 max-h-20"
                  : "opacity-0 max-h-0 overflow-hidden"
              }`}
            >
              <FormField
                control={registerForm.control}
                name="experience"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                      Years of Experience
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...fieldProps}
                        value={value || ""}
                        onChange={(e) =>
                          onChange(parseInt(e.target.value) || undefined)
                        }
                        className={FormUtils.getInputClasses(
                          "h-9 sm:h-11 text-sm sm:text-base"
                        )}
                        placeholder="Years of experience"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div
              className={`transition-all duration-300 ease-in-out ${
                selectedRole === UserRole.CHEF ||
                selectedRole === UserRole.PSYCHOLOGIST
                  ? "opacity-100 max-h-20"
                  : "opacity-0 max-h-0 overflow-hidden"
              }`}
            >
              <FormField
                control={registerForm.control}
                name="degree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                      Degree/Certification
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className={FormUtils.getInputClasses(
                          "h-9 sm:h-11 text-sm sm:text-base"
                        )}
                        placeholder="Your degree or certification"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Subscriber Fields */}
          <div
            className={`space-y-4 sm:space-y-5 transition-all duration-300 ease-in-out ${
              selectedRole === UserRole.SUBSCRIBER
                ? "opacity-100 max-h-96"
                : "opacity-0 max-h-0 overflow-hidden"
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={registerForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                      Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className={FormUtils.getInputClasses(
                          "h-9 sm:h-11 text-sm sm:text-base"
                        )}
                        placeholder="Your address"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                      City
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger
                          className={FormUtils.getInputClasses(
                            "h-9 sm:h-11 text-sm sm:text-base"
                          )}
                        >
                          <SelectValue placeholder="Select your city" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-lg sm:rounded-xl border-slate-200 bg-white/95 backdrop-blur-lg max-h-60">
                        {PAKISTANI_CITIES.map((city) => (
                          <SelectItem
                            key={city}
                            value={city}
                            className="rounded-lg text-sm sm:text-base"
                          >
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={registerForm.control}
              name="previousIllness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-xs sm:text-sm">
                    Previous Illnesses (if any)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className={FormUtils.getInputClasses(
                        "h-9 sm:h-11 text-sm sm:text-base"
                      )}
                      placeholder="Previous medical history (optional)"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          <div className="h-4 sm:h-8"></div>
        </div>

        <Button
          type="submit"
          className={`${FormUtils.getButtonClasses(
            "h-10 sm:h-12"
          )} mt-4 sm:mt-6 text-sm sm:text-base`}
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="text-sm sm:text-base">Creating Account...</span>
            </div>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation, showAds } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showVerification, setShowVerification] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [verificationState, setVerificationState] =
    useState<VerificationState | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && !showAds) {
      setLocation("/");
    }
  }, [user, showAds, setLocation]);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
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

  // Handle registration with verification - UPDATED WITH LOADING STATE
  const handleRegister = async (data: RegisterFormData) => {
    try {
      setIsRegistering(true);
      const response = await apiRequest("POST", API_ENDPOINTS.REGISTER, data);

      if (response.ok) {
        setVerificationState({
          email: data.email,
          phone: data.phone,
          type: "registration",
          registrationData: data,
        });
        setShowVerification(true);
        toast({
          title: "Registration initiated",
          description:
            "Please check your email and WhatsApp for the verification code",
        });
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Could not register",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle verification
  const handleVerification = async (code: string) => {
    if (!verificationState) return;

    try {
      if (verificationState.type === "registration") {
        // Handle registration verification
        const response = await apiRequest(
          "POST",
          API_ENDPOINTS.VERIFY_REGISTRATION,
          {
            email: verificationState.email,
            phone: verificationState.phone,
            code,
            type: verificationState.type,
          }
        );

        if (response.ok) {
          toast({
            title: "Verification successful",
            description: "Your account has been created. Please login.",
          });
          setShowVerification(false);
          setVerificationState(null);
          setActiveTab("login");
          registerForm.reset();
        } else {
          const error = await response.json();
          throw new Error(error.detail || "Verification failed");
        }
      } else if (verificationState.type === "password_reset") {
        // For password reset, just validate the code format
        if (code.length !== 6 || !/^\d+$/.test(code)) {
          throw new Error("Invalid code format");
        }

        // Store the code and transition to password reset form
        setVerificationState({
          ...verificationState,
          code: code,
        });
        setShowVerification(false);
        setShowPasswordReset(true);
      }
    } catch (error: any) {
      throw error;
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    if (!verificationState) return;

    const response = await apiRequest("POST", API_ENDPOINTS.RESEND_CODE, {
      email: verificationState.email,
      phone: verificationState.phone,
      type: verificationState.type,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to resend code");
    }
  };

  // Handle password reset request
  const handlePasswordResetRequest = async (
    identifier: string,
    method: "email" | "whatsapp"
  ) => {
    try {
      const response = await apiRequest("POST", API_ENDPOINTS.FORGOT_PASSWORD, {
        identifier,
        method,
      });

      const result = await response.json();

      if (response.ok) {
        setVerificationState({
          email: result.email,
          phone: result.phone,
          type: "password_reset",
        });
        setShowPasswordReset(false);
        setShowVerification(true);
        toast({
          title: "Reset code sent",
          description: `Verification code sent via ${method}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message || "Could not process request",
        variant: "destructive",
      });
    }
  };

  // Handle password reset
  const handlePasswordReset = async (newPassword: string) => {
    if (!verificationState || !verificationState.code) return;

    try {
      const response = await apiRequest("POST", API_ENDPOINTS.RESET_PASSWORD, {
        email: verificationState.email,
        phone: verificationState.phone,
        code: verificationState.code,
        new_password: newPassword,
      });

      if (response.ok) {
        toast({
          title: "Password reset successful",
          description: "You can now login with your new password",
        });
        setShowVerification(false);
        setShowPasswordReset(false);
        setVerificationState(null);
        setActiveTab("login");
        // Clear the login form
        loginForm.reset();
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to reset password");
      }
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Could not reset password",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update register form to use handleRegister - UPDATED WITH PROPER LOADING STATE
  const RegisterMutation = {
    mutate: handleRegister,
    isPending: isRegistering,
    isSuccess: registerMutation.isSuccess,
  };

  useEffect(() => {
    if (RegisterMutation.isSuccess) {
      setActiveTab("login");
      registerForm.reset();
    }
  }, [RegisterMutation.isSuccess]);

  // Show verification form if needed
  if (showVerification && verificationState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 p-4">
        <div className="w-full max-w-md">
          <VerificationForm
            email={verificationState.email}
            phone={verificationState.phone}
            type={verificationState.type}
            onVerify={handleVerification}
            onResend={handleResendCode}
            onBack={() => {
              setShowVerification(false);
              setVerificationState(null);
            }}
          />
        </div>
      </div>
    );
  }

  // Show password reset form after verification
  if (
    showPasswordReset &&
    verificationState?.email &&
    verificationState?.phone &&
    verificationState?.code
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 p-4">
        <div className="w-full max-w-md">
          <PasswordResetForm
            onRequestReset={handlePasswordResetRequest}
            onResetPassword={handlePasswordReset}
            onBack={() => {
              setShowPasswordReset(false);
              setVerificationState(null);
            }}
            email={verificationState.email}
            phone={verificationState.phone}
            showNewPasswordForm={true}
          />
        </div>
      </div>
    );
  }

  // Show initial password reset form
  if (showPasswordReset && !verificationState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 p-4">
        <div className="w-full max-w-md">
          <PasswordResetForm
            onRequestReset={handlePasswordResetRequest}
            onResetPassword={handlePasswordReset}
            onBack={() => setShowPasswordReset(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 relative overflow-hidden">
        <BackgroundDecorations />

        {/* Desktop Banner */}
        <DesktopBanner isMobile={isMobile} />

        {/* Auth Form Section */}
        <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-4 sm:p-6 lg:p-8 relative z-10 min-h-screen">
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
            {/* Mobile Header */}
            <MobileHeader isMobile={isMobile} />

            {/* Auth Card */}
            <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-2xl shadow-teal-500/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
              <Tabs
                value={activeTab}
                onValueChange={(val) =>
                  setActiveTab(val as "login" | "register")
                }
                className="w-full"
              >
                <TabsList className={FormUtils.TAB_LIST_CLASSES}>
                  <TabsTrigger
                    value="login"
                    className={FormUtils.TAB_TRIGGER_CLASSES}
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className={FormUtils.TAB_TRIGGER_CLASSES}
                  >
                    Register
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <LoginForm
                    loginForm={loginForm}
                    loginMutation={loginMutation}
                  />
                  <div className="mt-4 text-center">
                    <Button
                      variant="link"
                      onClick={() => setShowPasswordReset(true)}
                      className="text-sm text-teal-600 hover:text-teal-700"
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="register" className="mt-0">
                  <RegisterForm
                    registerForm={registerForm}
                    registerMutation={RegisterMutation}
                    selectedRole={selectedRole}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
