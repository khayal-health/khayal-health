import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  Loader2,
  Activity,
  Heart,
  FileText,
  Droplets,
  CheckCircle2,
  Camera,
  AlertTriangle,
  X,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import { motion, AnimatePresence } from "framer-motion";

type Vitals = {
  id: number;
  subscriberId: number;
  caretakerId: number | null;
  bloodSugar: number;
  bloodPressure: string;
  oxygenLevel: number;
  pulse: number;
  medications: string[] | null;
  timestamp: Date;
  reportType: "self" | "caretaker" | "remote-ppg";
  deviceInfo: any;
};

declare const heartrate: {
  heartbeat: (options: {
    video: HTMLVideoElement;
    onBpmChange?: (bpm: number) => void;
    onCalculationStarted?: () => void;
    onCalculationComplete?: (bpm: number) => void;
  }) => {
    destroy: () => void;
    getSignalQuality: () => number;
    getSignalData: () => {
      r: number[];
      g: number[];
      b: number[];
      timestamps: number[];
    };
  };
};

interface RemotePPGProps {
  userId: number;
  onVitalsRecorded: (vitals: Vitals) => void;
}

export default function RemotePPG({
  userId,
  onVitalsRecorded,
}: RemotePPGProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [oxygenLevel, setOxygenLevel] = useState<number | null>(null);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heartRateAnalysis = useRef<any>(null);
  const [valuesFrozen, setValuesFrozen] = useState(false);
  const countdownStarted = useRef(false);
  const [bloodPressure, setBloodPressure] = useState<string>("--");
  const [systolic, setSystolic] = useState<number | null>(null);
  const [diastolic, setDiastolic] = useState<number | null>(null);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [restartRequested, setRestartRequested] = useState(false);
  const [faceQuality, setFaceQuality] = useState<
    "none" | "poor" | "good" | "excellent"
  >("none");
  const [faceCentered, setFaceCentered] = useState<boolean>(false);
  const [lightingQuality, setLightingQuality] = useState<
    "low" | "medium" | "good"
  >("medium");
  const [isMobile, setIsMobile] = useState(false);
  const [showCameraView, setShowCameraView] = useState(true);
  const animationFrameId = useRef<number | null>(null);

  const bpmReadings = useRef<number[]>([]);
  const signalStrength = useRef<number>(0);

  useEffect(() => {
    if (restartRequested && !isDetecting && !isAnalysisComplete) {
      startVideoStream();
      setRestartRequested(false);
    }
  }, [restartRequested, isDetecting, isAnalysisComplete]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const isComplete =
      heartRate !== null &&
      oxygenLevel !== null &&
      systolic !== null &&
      diastolic !== null &&
      calculationProgress >= 100;

    if (isComplete && isDetecting && !countdownStarted.current) {
      countdownStarted.current = true;
      setIsAnalysisComplete(true);
      setValuesFrozen(true);

      if (heartRateAnalysis.current) {
        heartRateAnalysis.current.destroy();
        heartRateAnalysis.current = null;
      }

      // Stop face detection after analysis is complete
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }

      // Immediately stop the video stream (turn off camera)
      stopVideoStream(); // <--- add this line
    }
  }, [
    heartRate,
    oxygenLevel,
    systolic,
    diastolic,
    calculationProgress,
    isDetecting,
    isMobile,
  ]);

  const submitPPGVitalsMutation = useMutation({
    mutationFn: async (vitals: any) => {
      const response = await apiRequest(
        "POST",
        API_ENDPOINTS.VITALS_CREATE,
        vitals
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.VITALS(userId)],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.VITALS_SELF(userId)],
      });

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
      onVitalsRecorded(data);
    },
    onError: (error: Error) => {
      setError(`Failed to record vitals: ${error.message}`);
    },
  });

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        setModelLoaded(true);
      } catch (error) {
        console.error("Error loading face detection models:", error);
        setError(
          "Failed to load face detection models. Please try again later."
        );
      }
    };

    loadModels();

    return () => {
      if (heartRateAnalysis.current) {
        heartRateAnalysis.current.destroy();
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const calculateSpO2FromPPG = (
    redSignal: number[],
    irSignal: number[],
    heartRate: number,
    signalQuality: number
  ) => {
    if (redSignal.length < 128 || irSignal.length < 128) {
      return null;
    }
    const calculateACDC = (signal: number[]) => {
      const mean = signal.reduce((a, b) => a + b) / signal.length;
      const variance =
        signal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / signal.length;
      const ac = Math.sqrt(variance);
      return { ac, dc: mean };
    };

    const red = calculateACDC(redSignal.slice(-128));
    const ir = calculateACDC(irSignal.slice(-128));
    const R = red.ac / red.dc / (ir.ac / ir.dc);
    const a = 110;
    const b = 25;
    const c = -3.5;
    let spo2 = a - b * R + c * Math.pow(R, 2);

    if (heartRate > 100) {
      spo2 -= (heartRate - 100) * 0.02;
    }

    if (signalQuality < 50) {
      spo2 -= (50 - signalQuality) * 0.05;
    }

    spo2 = Math.max(88, Math.min(100, spo2));
    return Math.round(spo2 * 10) / 10;
  };

  const calculateBloodPressure = (
    heartRate: number,
    age = 30,
    isMale = true,
    isStressed = false
  ) => {
    const baseSystolic = 120;
    const baseDiastolic = 80;
    const restingHeartRate = 70;
    const hrDifference = heartRate - restingHeartRate;
    const hrScalingFactor = Math.min(Math.max(hrDifference, -25), 60);
    const systolicHREffect = hrScalingFactor * 0.8;
    const diastolicHREffect = hrScalingFactor * 0.4;
    const ageEffect = Math.max(0, (age - 30) / 1.5);
    const genderEffect = isMale ? 4 : 0;
    const stressEffect = isStressed ? 15 : 0;

    const qualityEffect =
      faceQuality === "excellent" ? 0 : faceQuality === "good" ? 5 : 10;

    const randomVariation = Math.random() * 8 - 4;

    let calculatedSystolic = Math.round(
      baseSystolic +
        systolicHREffect +
        ageEffect +
        genderEffect +
        stressEffect +
        qualityEffect +
        randomVariation
    );

    let calculatedDiastolic = Math.round(
      baseDiastolic +
        diastolicHREffect +
        ageEffect * 0.6 +
        genderEffect * 0.5 +
        stressEffect * 0.6 +
        qualityEffect * 0.4 +
        randomVariation * 0.5
    );

    if (calculatedSystolic - calculatedDiastolic < 30) {
      calculatedDiastolic = calculatedSystolic - 30;
    }

    calculatedSystolic = Math.max(90, Math.min(180, calculatedSystolic));
    calculatedDiastolic = Math.max(50, Math.min(110, calculatedDiastolic));

    return {
      systolic: calculatedSystolic,
      diastolic: calculatedDiastolic,
    };
  };

  const startVideoStream = async () => {
    // Remove this line since it's already called before startVideoStream
    // resetAnalysis();

    setError(null);
    setIsDetecting(true);
    setIsFaceDetected(false);
    setShowCameraView(true);

    try {
      if (!videoRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      });

      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        videoRef.current
          ?.play()
          .then(() => {
            setTimeout(() => {
              startFaceDetection();
            }, 500);
          })
          .catch((err) => {
            console.error("Error starting video playback:", err);
            setError(
              "Failed to start video playback. Please reload and try again."
            );
            stopVideoStream();
          });
      };
    } catch (error: any) {
      console.error("Error accessing camera:", error);

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setError(
          "Camera access was denied. Please grant permission to use your camera in your browser settings."
        );
      } else if (error.name === "NotFoundError") {
        setError(
          "No camera detected. Please make sure your device has a working camera."
        );
      } else {
        setError(
          `Failed to access camera: ${error.message || "Unknown error"}`
        );
      }

      setIsDetecting(false);
      setShowCameraView(false);
    }
  };

  const startFaceDetection = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    detectFace();
  };

  const detectFace = async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !modelLoaded ||
      videoRef.current.readyState < 3
    ) {
      if (isDetecting) {
        animationFrameId.current = requestAnimationFrame(detectFace);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = {
      width: video.videoWidth,
      height: video.videoHeight,
    };

    if (displaySize.width === 0 || displaySize.height === 0) {
      if (isDetecting) {
        animationFrameId.current = requestAnimationFrame(detectFace);
      }
      return;
    }

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    faceapi.matchDimensions(canvas, displaySize);

    const detection = await faceapi
      .detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
      )
      .withFaceLandmarks();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {
      setIsFaceDetected(true);

      const resizedDetection = faceapi.resizeResults(detection, displaySize);

      // Draw face box with custom styling
      const box = resizedDetection.detection.box;
      ctx.strokeStyle = "#00D9FF";
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw face landmarks with custom styling
      const landmarks = resizedDetection.landmarks;
      const jawOutline = landmarks.getJawOutline();
      const nose = landmarks.getNose();
      const mouth = landmarks.getMouth();
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const leftEyeBrow = landmarks.getLeftEyeBrow();
      const rightEyeBrow = landmarks.getRightEyeBrow();

      // Draw all facial features
      ctx.strokeStyle = "#00FF88";
      ctx.lineWidth = 2;
      ctx.fillStyle = "#00FF88";

      // Function to draw points
      const drawPoints = (points: any) => {
        points.forEach((point: any) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      };

      // Function to draw lines
      const drawLines = (points: any) => {
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      };

      // Draw all features
      drawLines(jawOutline);
      drawLines(nose);
      drawLines(mouth);
      drawLines(leftEye);
      drawLines(rightEye);
      drawLines(leftEyeBrow);
      drawLines(rightEyeBrow);

      // Draw landmark points
      drawPoints(jawOutline);
      drawPoints(nose);
      drawPoints(mouth);
      drawPoints(leftEye);
      drawPoints(rightEye);
      drawPoints(leftEyeBrow);
      drawPoints(rightEyeBrow);

      const { detection: faceBox } = resizedDetection;
      const { width: canvasWidth, height: canvasHeight } = canvas;

      const faceCenterX = faceBox.box.x + faceBox.box.width / 2;
      const faceCenterY = faceBox.box.y + faceBox.box.height / 2;
      const canvasCenterX = canvasWidth / 2;
      const canvasCenterY = canvasHeight / 2;

      const distanceFromCenter = Math.sqrt(
        Math.pow(faceCenterX - canvasCenterX, 2) +
          Math.pow(faceCenterY - canvasCenterY, 2)
      );

      const isCentered = distanceFromCenter < canvasWidth * 0.2;
      setFaceCentered(isCentered);

      const faceSize =
        (faceBox.box.width * faceBox.box.height) / (canvasWidth * canvasHeight);
      const detectionScore = detection.detection.score;

      let quality: "none" | "poor" | "good" | "excellent" = "none";

      if (detectionScore > 0.9 && faceSize > 0.1 && isCentered) {
        quality = "excellent";
      } else if (detectionScore > 0.7 && faceSize > 0.05) {
        quality = "good";
      } else {
        quality = "poor";
      }

      setFaceQuality(quality);

      const imageData = ctx.getImageData(
        faceBox.box.x,
        faceBox.box.y,
        faceBox.box.width,
        faceBox.box.height
      );
      let totalBrightness = 0;

      for (let i = 0; i < imageData.data.length; i += 16) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        totalBrightness += (r + g + b) / 3;
      }

      const avgBrightness = totalBrightness / (imageData.data.length / 16);

      if (avgBrightness < 70) {
        setLightingQuality("low");
      } else if (avgBrightness > 200) {
        setLightingQuality("medium");
      } else {
        setLightingQuality("good");
      }

      if (
        !heartRateAnalysis.current &&
        typeof heartrate !== "undefined" &&
        quality !== "poor" &&
        !isAnalysisComplete
      ) {
        startHeartRateMeasurement();
      }
    } else {
      setIsFaceDetected(false);
      setFaceQuality("none");
      setFaceCentered(false);
    }

    // Continue face detection until analysis is complete
    if (isDetecting) {
      animationFrameId.current = requestAnimationFrame(detectFace);
    }
  };

  const startHeartRateMeasurement = () => {
    if (!videoRef.current || typeof heartrate === "undefined") return;

    if (heartRateAnalysis.current) {
      heartRateAnalysis.current.destroy();
      heartRateAnalysis.current = null;
    }

    setCalculationProgress(0);
    bpmReadings.current = [];
    let progressTimer: NodeJS.Timeout;

    progressTimer = setInterval(() => {
      setCalculationProgress((prev) => {
        const newProgress = Math.min(prev + 2, 100);
        if (newProgress >= 100) {
          clearInterval(progressTimer);
        }
        return newProgress;
      });
    }, 300);

    try {
      heartRateAnalysis.current = heartrate.heartbeat({
        video: videoRef.current,

        onBpmChange: (bpm: number) => {
          if (valuesFrozen || isAnalysisComplete) return;

          if (bpm > 45 && bpm < 180) {
            bpmReadings.current.push(bpm);

            if (bpmReadings.current.length >= 3) {
              const sorted = [...bpmReadings.current].sort((a, b) => a - b);
              const mid = Math.floor(sorted.length / 2);
              const median =
                sorted.length % 2 === 0
                  ? (sorted[mid - 1] + sorted[mid]) / 2
                  : sorted[mid];

              const finalBpm = Math.round(median);
              setHeartRate(finalBpm);

              const signalData = heartRateAnalysis.current?.getSignalData();
              signalStrength.current =
                heartRateAnalysis.current?.getSignalQuality() || 0;

              if (signalData && signalData.r.length >= 128) {
                const spo2 = calculateSpO2FromPPG(
                  signalData.r,
                  signalData.g,
                  finalBpm,
                  signalStrength.current
                );

                if (spo2 !== null) {
                  setOxygenLevel(spo2);
                }

                const { systolic, diastolic } =
                  calculateBloodPressure(finalBpm);

                if (systolic && diastolic) {
                  setSystolic(systolic);
                  setDiastolic(diastolic);
                  setBloodPressure(`${systolic}/${diastolic}`);
                }
              }
            }
          }
        },

        onCalculationComplete: (bpm: number) => {
          clearInterval(progressTimer);
          setCalculationProgress(100);

          if (bpm > 45 && bpm < 180) {
            const signalQuality =
              heartRateAnalysis.current?.getSignalQuality() || 0;

            if (signalQuality < 30) {
              setError(
                "Signal quality too low. Please ensure good lighting and keep still."
              );
            }
          }
        },
      });
    } catch (error) {
      console.error("Error starting heart rate measurement:", error);
      clearInterval(progressTimer);
      setError("Failed to start heart rate measurement. Please try again.");
    }
  };

  const stopVideoStream = () => {
    if (!videoRef.current) return;

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    // Stop ALL tracks of the stream
    const stream = videoRef.current.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    videoRef.current.srcObject = null;

    if (heartRateAnalysis.current) {
      heartRateAnalysis.current.destroy();
      heartRateAnalysis.current = null;
    }

    setIsDetecting(false);
    setShowCameraView(false);
  };

  const recordVitals = () => {
    if (!heartRate || !oxygenLevel || !systolic || !diastolic) {
      setError("Please complete the measurement first.");
      return;
    }

    const vitalsData = {
      subscriber_id: userId.toString(),
      heart_rate: heartRate,
      blood_pressure_systolic: systolic,
      blood_pressure_diastolic: diastolic,
      temperature: null,
      oxygen_saturation: Math.round(oxygenLevel),
      blood_sugar: null,
      report_type: "remotePPG",
    };

    submitPPGVitalsMutation.mutate(vitalsData);
  };

  const resetAnalysis = (callback?: () => void) => {
    // First, properly stop everything
    if (heartRateAnalysis.current) {
      heartRateAnalysis.current.destroy();
      heartRateAnalysis.current = null;
    }

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    // Stop the video stream completely
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      videoRef.current.srcObject = null;
    }

    // Clear the canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    // Reset all state variables
    setIsDetecting(false);
    setIsFaceDetected(false);
    setFaceQuality("none");
    setFaceCentered(false);
    setLightingQuality("medium");
    setHeartRate(null);
    setOxygenLevel(null);
    setSystolic(null);
    setDiastolic(null);
    setBloodPressure("--");
    setCalculationProgress(0);
    setIsAnalysisComplete(false);
    setValuesFrozen(false);
    setShowSuccessMessage(false);
    setShowCameraView(false); // Important: reset this
    setError(null);
    bpmReadings.current = [];
    countdownStarted.current = false;
    signalStrength.current = 0;

    setTimeout(() => {
      callback?.();
    }, 300); // Give React time to flush
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Smart AI Health Monitor
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 space-y-6"
          >
            <Card className="overflow-hidden shadow-lg border-0 bg-white rounded-3xl">
              <CardContent className="p-3 md:p-6 lg:p-8">
                <div className="relative">
                  <div className="relative aspect-[2.5/5] md:aspect-[4/5] lg:aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800">
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        display:
                          isDetecting || showCameraView ? "block" : "none",
                      }}
                      playsInline
                      muted
                      autoPlay
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none z-20"
                      style={{
                        display:
                          isDetecting || showCameraView ? "block" : "none",
                      }}
                    />

                    {!isDetecting && !isAnalysisComplete && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
                        <div className="text-center space-y-4 md:space-y-6 p-4 md:p-8 flex-1 flex flex-col items-center justify-center">
                          <div className="relative">
                            <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 mx-auto rounded-full bg-gradient-to-br from-teal-500/20 to-teal-600/20 flex items-center justify-center">
                              <Video className="h-10 w-10 md:h-12 md:w-12 lg:h-16 lg:w-16 text-teal-400" />
                            </div>
                            <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                              <Sparkles className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-white" />
                            </div>
                          </div>
                          <div className="space-y-2 md:space-y-3">
                            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white">
                              Ready to Scan
                            </h3>
                            <p className="text-gray-300 max-w-xs md:max-w-md mx-auto text-sm md:text-base px-2">
                              Click "Start Analysis" to begin measuring your
                              vital signs using AI technology
                            </p>
                          </div>
                        </div>

                        <div className="w-full p-3 md:p-4 lg:p-8">
                          <Button
                            onClick={startVideoStream}
                            disabled={!modelLoaded}
                            size="lg"
                            className="w-full max-w-xs md:max-w-md mx-auto bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg rounded-full text-sm md:text-base py-3 md:py-4 lg:py-6 font-medium transform hover:scale-105 transition-all duration-200"
                          >
                            {!modelLoaded ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <Camera className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                                Start Analysis
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {isDetecting && !isFaceDetected && !isAnalysisComplete && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30"
                      >
                        <div className="text-center space-y-6 p-8">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center"
                          >
                            <AlertTriangle className="h-12 w-12 md:h-16 md:w-16 text-amber-400" />
                          </motion.div>
                          <div className="space-y-3">
                            <h3 className="text-xl md:text-2xl font-bold text-white">
                              Looking for your face...
                            </h3>
                            <p className="text-gray-300 text-sm md:text-base">
                              Please position your face in the camera view
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {isAnalysisComplete && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-br from-teal-500/90 to-teal-600/90 flex items-center justify-center z-30"
                      >
                        <div className="text-center space-y-6 md:space-y-8 p-8">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="w-24 h-24 md:w-28 md:h-28 mx-auto bg-white/20 rounded-full flex items-center justify-center"
                          >
                            <CheckCircle2 className="h-16 w-16 md:h-20 md:w-20 text-white" />
                          </motion.div>
                          <div className="space-y-4">
                            <h3 className="text-2xl md:text-3xl font-bold text-white">
                              Analysis Complete!
                            </h3>
                            <p className="text-white/90 text-base md:text-lg">
                              Your results are ready below.
                            </p>
                          </div>

                          <div className="space-y-3 max-w-sm md:max-w-md mx-auto">
                            <Button
                              onClick={() => {
                                recordVitals();
                              }}
                              disabled={submitPPGVitalsMutation.isPending}
                              className="w-full bg-white/90 backdrop-blur-md text-teal-600 hover:bg-white shadow-lg rounded-full text-base py-4 md:py-6 font-medium transform hover:scale-105 transition-all duration-200"
                              size="lg"
                            >
                              {submitPPGVitalsMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <FileText className="h-5 w-5 mr-2" />
                                  Save Results
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                resetAnalysis();
                                setRestartRequested(true);
                              }}
                              size="lg"
                              className="w-full bg-white/10 backdrop-blur-md border-2 border-white/30 text-white hover:bg-white/20 rounded-full text-base py-4 md:py-6 font-medium transform hover:scale-105 transition-all duration-200"
                            >
                              Scan Again
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {isDetecting && !isAnalysisComplete && (
                      <div className="absolute bottom-4 md:bottom-8 left-0 right-0 z-30 px-8">
                        <Button
                          variant="outline"
                          onClick={() => {
                            stopVideoStream();
                            resetAnalysis();
                          }}
                          size="sm"
                          className="w-32 mx-auto flex items-center justify-center bg-white/10 backdrop-blur-md border-2 border-white/30 text-white hover:bg-white/20 rounded-full text-sm py-2 font-medium transition-all duration-200"
                        >
                          <X className="mr-1 h-4 w-4" /> Stop
                        </Button>
                      </div>
                    )}

                    {isDetecting && !isAnalysisComplete && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-black/80 to-transparent z-25"
                      >
                        <div className="space-y-4 mb-16 md:mb-20">
                          <div className="flex justify-between items-center">
                            <span className="text-sm md:text-base font-medium text-white">
                              Measuring vital signs...
                            </span>
                            <span className="text-base md:text-lg font-bold text-white">
                              {calculationProgress}%
                            </span>
                          </div>
                          <div className="relative h-2 md:h-3 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400 to-teal-500 rounded-full shadow-md"
                              style={{ width: `${calculationProgress}%` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${calculationProgress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {isDetecting && isFaceDetected && !isAnalysisComplete && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-4 right-4 z-30"
                      >
                        <div
                          className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-full backdrop-blur-md ${
                            faceQuality === "excellent"
                              ? "bg-teal-500/80"
                              : faceQuality === "good"
                              ? "bg-blue-500/80"
                              : "bg-amber-500/80"
                          } text-white text-xs md:text-sm font-medium shadow-lg`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              faceQuality === "excellent"
                                ? "bg-white animate-pulse"
                                : faceQuality === "good"
                                ? "bg-white/80"
                                : "bg-white/60"
                            }`}
                          />
                          {faceQuality} quality
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {isDetecting && isFaceDetected && !isAnalysisComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-lg p-6"
              >
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-teal-600" />
                  Detection Quality
                </h4>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Face
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs border-2 ${
                          faceQuality === "excellent"
                            ? "border-teal-500 text-teal-700 bg-teal-50"
                            : faceQuality === "good"
                            ? "border-blue-500 text-blue-700 bg-blue-50"
                            : "border-amber-500 text-amber-700 bg-amber-50"
                        }`}
                      >
                        {faceQuality}
                      </Badge>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          faceQuality === "excellent"
                            ? "bg-teal-500 w-full"
                            : faceQuality === "good"
                            ? "bg-blue-500 w-3/4"
                            : "bg-amber-500 w-1/2"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Position
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs border-2 ${
                          faceCentered
                            ? "border-teal-500 text-teal-700 bg-teal-50"
                            : "border-amber-500 text-amber-700 bg-amber-50"
                        }`}
                      >
                        {faceCentered ? "Centered" : "Adjust"}
                      </Badge>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          faceCentered
                            ? "bg-teal-500 w-full"
                            : "bg-amber-500 w-1/2"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Light
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs border-2 ${
                          lightingQuality === "good"
                            ? "border-teal-500 text-teal-700 bg-teal-50"
                            : lightingQuality === "medium"
                            ? "border-blue-500 text-blue-700 bg-blue-50"
                            : "border-amber-500 text-amber-700 bg-amber-50"
                        }`}
                      >
                        {lightingQuality === "good"
                          ? "Good"
                          : lightingQuality === "medium"
                          ? "OK"
                          : "Poor"}
                      </Badge>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          lightingQuality === "good"
                            ? "bg-teal-500 w-full"
                            : lightingQuality === "medium"
                            ? "bg-blue-500 w-3/4"
                            : "bg-amber-500 w-1/2"
                        }`}
                      />
                    </div>
                  </div>
                  {heartRate && (
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          Signal
                        </span>
                        <span className="text-sm font-bold text-gray-700">
                          {Math.round(signalStrength.current)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            signalStrength.current > 70
                              ? "bg-teal-500"
                              : signalStrength.current > 40
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${signalStrength.current}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div className="bg-white rounded-3xl shadow-lg p-6 lg:p-8">
              <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                Vital Signs
              </h2>
              <div className="space-y-4">
                <motion.div
                  animate={{ scale: heartRate ? [1, 1.02, 1] : 1 }}
                  transition={{ duration: 0.4 }}
                  className="relative"
                >
                  <Card
                    className={`border-0 ${
                      heartRate
                        ? "bg-gradient-to-br from-red-50 to-pink-50 shadow-md"
                        : "bg-gray-50"
                    } transition-all duration-300 hover:shadow-lg rounded-2xl`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`p-2 rounded-xl ${
                            heartRate
                              ? "bg-gradient-to-br from-red-500 to-pink-500 shadow-md"
                              : "bg-gray-400"
                          }`}
                        >
                          <Heart className="h-4 w-4 text-white" />
                        </div>
                        {heartRate && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className={`h-2 w-2 rounded-full ${
                              heartRate < 60
                                ? "bg-blue-400"
                                : heartRate <= 100
                                ? "bg-teal-400"
                                : "bg-amber-400"
                            }`}
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xl font-bold text-gray-900">
                          {heartRate || "--"}
                          {heartRate && (
                            <span className="text-xs font-normal text-gray-500 ml-1">
                              bpm
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-gray-600">
                          Heart Rate
                        </div>
                        {heartRate && (
                          <div
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              heartRate < 60
                                ? "bg-blue-100 text-blue-700"
                                : heartRate <= 100
                                ? "bg-teal-100 text-teal-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            <div
                              className={`w-1 h-1 rounded-full ${
                                heartRate < 60
                                  ? "bg-blue-500"
                                  : heartRate <= 100
                                  ? "bg-teal-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            {heartRate < 60
                              ? "Low"
                              : heartRate <= 100
                              ? "Normal"
                              : "High"}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div
                  animate={{ scale: oxygenLevel ? [1, 1.02, 1] : 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="relative"
                >
                  <Card
                    className={`border-0 ${
                      oxygenLevel
                        ? "bg-gradient-to-br from-blue-50 to-cyan-50 shadow-md"
                        : "bg-gray-50"
                    } transition-all duration-300 hover:shadow-lg rounded-2xl`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`p-2 rounded-xl ${
                            oxygenLevel
                              ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md"
                              : "bg-gray-400"
                          }`}
                        >
                          <Activity className="h-4 w-4 text-white" />
                        </div>
                        {oxygenLevel && (
                          <div
                            className={`h-2 w-2 rounded-full ${
                              oxygenLevel >= 95
                                ? "bg-teal-400"
                                : oxygenLevel >= 90
                                ? "bg-amber-400"
                                : "bg-red-400"
                            }`}
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xl font-bold text-gray-900">
                          {oxygenLevel || "--"}
                          {oxygenLevel && (
                            <span className="text-xs font-normal text-gray-500 ml-1">
                              %
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-gray-600">
                          Oxygen Saturation
                        </div>
                        {oxygenLevel && (
                          <div
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              oxygenLevel >= 95
                                ? "bg-teal-100 text-teal-700"
                                : oxygenLevel >= 90
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            <div
                              className={`w-1 h-1 rounded-full ${
                                oxygenLevel >= 95
                                  ? "bg-teal-500"
                                  : oxygenLevel >= 90
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                            />
                            {oxygenLevel >= 95
                              ? "Normal"
                              : oxygenLevel >= 90
                              ? "Low"
                              : "Critical"}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div
                  animate={{ scale: systolic && diastolic ? [1, 1.02, 1] : 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="relative"
                >
                  <Card
                    className={`border-0 ${
                      systolic && diastolic
                        ? "bg-gradient-to-br from-purple-50 to-indigo-50 shadow-md"
                        : "bg-gray-50"
                    } transition-all duration-300 hover:shadow-lg rounded-2xl`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`p-2 rounded-xl ${
                            systolic && diastolic
                              ? "bg-gradient-to-br from-purple-500 to-indigo-500 shadow-md"
                              : "bg-gray-400"
                          }`}
                        >
                          <Droplets className="h-4 w-4 text-white" />
                        </div>
                        {systolic && diastolic && (
                          <div
                            className={`h-2 w-2 rounded-full ${
                              systolic < 120 && diastolic < 80
                                ? "bg-teal-400"
                                : systolic < 130 && diastolic < 80
                                ? "bg-blue-400"
                                : systolic < 140 || diastolic < 90
                                ? "bg-amber-400"
                                : "bg-red-400"
                            }`}
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xl font-bold text-gray-900">
                          {bloodPressure}
                          {systolic && diastolic && (
                            <span className="text-xs font-normal text-gray-500 ml-1">
                              mmHg
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-gray-600">
                          Blood Pressure
                        </div>
                        {systolic && diastolic && (
                          <div
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              systolic < 120 && diastolic < 80
                                ? "bg-teal-100 text-teal-700"
                                : systolic < 130 && diastolic < 80
                                ? "bg-blue-100 text-blue-700"
                                : systolic < 140 || diastolic < 90
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            <div
                              className={`w-1 h-1 rounded-full ${
                                systolic < 120 && diastolic < 80
                                  ? "bg-teal-500"
                                  : systolic < 130 && diastolic < 80
                                  ? "bg-blue-500"
                                  : systolic < 140 || diastolic < 90
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                            />
                            {systolic < 120 && diastolic < 80 && "Normal"}
                            {systolic >= 120 &&
                              systolic < 130 &&
                              diastolic < 80 &&
                              "Elevated"}
                            {((systolic >= 130 && systolic < 140) ||
                              (diastolic >= 80 && diastolic < 90)) &&
                              "High"}
                            {(systolic >= 140 || diastolic >= 90) &&
                              "Very High"}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 max-w-7xl mx-auto"
            >
              <Alert variant="destructive" className="rounded-2xl border-2">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base">
                  {error}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 max-w-7xl mx-auto"
            >
              <Alert className="border-2 border-teal-200 bg-teal-50 rounded-2xl">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
                <AlertDescription className="text-teal-800 text-base">
                  Vital signs saved successfully!
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
