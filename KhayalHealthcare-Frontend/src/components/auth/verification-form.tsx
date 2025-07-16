import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const verificationSchema = z.object({
  code: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Code must contain only numbers"),
});

interface VerificationFormProps {
  email: string;
  phone: string;
  type: "registration" | "password_reset";
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack?: () => void;
}

export function VerificationForm({
  email,
  phone,
  type,
  onVerify,
  onResend,
  onBack,
}: VerificationFormProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const { toast } = useToast();

  const form = useForm<{ code: string }>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVerify = async (data: { code: string }) => {
    setIsVerifying(true);
    try {
      await onVerify(data.code);
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setIsResending(true);
    try {
      await onResend();
      toast({
        title: "Code resent",
        description: "A new verification code has been sent",
      });
      // Reset timer
      setResendTimer(300);
      setCanResend(false);
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message || "Could not resend verification code",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === "registration"
            ? "Verify Your Account"
            : "Verify Password Reset"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>We've sent a 6-digit verification code to:</p>
          <p className="font-medium mt-1">📧 {email}</p>
          <p className="font-medium">📱 {phone}</p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleVerify)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="text-center text-2xl tracking-widest"
                      autoComplete="one-time-code"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  disabled={!canResend || isResending}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {isResending
                    ? "Sending..."
                    : canResend
                    ? "Resend Code"
                    : `Resend in ${formatTime(resendTimer)}`}
                </Button>

                {onBack && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                  >
                    Back
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>

        <div className="text-xs text-gray-500 mt-4">
          <p>⚠️ Code expires in 10 minutes</p>
          <p>⚠️ Maximum 3 resend attempts allowed</p>
        </div>
      </CardContent>
    </Card>
  );
}
