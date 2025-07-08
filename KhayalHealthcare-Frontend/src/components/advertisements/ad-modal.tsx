import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ImageOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Advertisement {
  _id: string;
  title: string;
  description: string;
  message: string;
  image_url: string;
  target_role: string;
  status: string;
  display_order: number;
  start_date: string;
  end_date: string;
}

interface AdModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdModal({ open, onClose }: AdModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const isMobile = useIsMobile();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { data: ads = [], isLoading } = useQuery<Advertisement[]>({
    queryKey: [API_ENDPOINTS.ADVERTISEMENTS_MY_ADS],
    enabled: open,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Reset index when ads change
  useEffect(() => {
    setCurrentIndex(0);
  }, [ads]);

  const activeAds = ads
    .filter((ad) => ad.status === "active")
    .sort((a, b) => a.display_order - b.display_order);

  const hasMultipleAds = activeAds.length > 1;
  const currentAd = activeAds[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? activeAds.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === activeAds.length - 1 ? 0 : prev + 1));
  };

  // Auto-advance slideshow
  useEffect(() => {
    if (open && hasMultipleAds && !isPaused) {
      intervalRef.current = setInterval(() => {
        handleNext();
      }, 4000); // Change slide every 4 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [open, hasMultipleAds, isPaused, currentIndex, activeAds.length]);

  const handleKeyDown = (e: KeyboardEvent) => {
    // Check if the event target is within the modal
    if (!modalRef.current?.contains(e.target as Node)) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }

    if (!hasMultipleAds) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      handlePrevious();
      setIsPaused(true);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      handleNext();
      setIsPaused(true);
    }
  };

  useEffect(() => {
    if (open) {
      // Use capture phase to handle events before they bubble
      window.addEventListener("keydown", handleKeyDown, true);
      return () => window.removeEventListener("keydown", handleKeyDown, true);
    }
  }, [open, hasMultipleAds, currentIndex]);

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "";

    const cleanPath = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");

    if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
      return cleanPath;
    }

    return `${API_BASE_URL}/${cleanPath}`;
  };

  const handleImageError = (adId: string) => {
    setImageErrors((prev) => new Set(prev).add(adId));
  };

  // Handle manual navigation with pause
  const handleManualPrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handlePrevious();
    setIsPaused(true);
  };

  const handleManualNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleNext();
    setIsPaused(true);
  };

  // Handle pause/resume
  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    if (!isMobile) {
      setIsPaused(false);
    }
  };

  // For mobile, toggle pause state on touch
  const handleTouch = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (isMobile) {
      setIsPaused(!isPaused);
    }
  };

  // Independent close handler
  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  if (!open || isLoading || activeAds.length === 0) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        ref={modalRef}
        className={cn(
          "p-0 bg-transparent border-0 shadow-none max-w-none max-h-none w-screen h-screen flex items-center justify-center"
        )}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      >
        <DialogTitle className="sr-only">Advertisement</DialogTitle>

        <div
          className="relative w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Image Container */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            onMouseEnter={!isMobile ? handlePause : undefined}
            onMouseLeave={!isMobile ? handleResume : undefined}
            onTouchStart={isMobile ? handleTouch : undefined}
          >
            {currentAd.image_url && !imageErrors.has(currentAd._id) ? (
              <div className="relative">
                <img
                  src={getImageUrl(currentAd.image_url)}
                  alt={currentAd.title}
                  className="max-w-full max-h-[80vh] object-contain"
                  onError={() => handleImageError(currentAd._id)}
                  loading="eager"
                />

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseClick}
                  className="absolute right-4 top-4 h-10 w-10 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm z-50"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Ad Counter & Play/Pause Indicator */}
                {hasMultipleAds && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <span className="text-sm text-white bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-2">
                      <span>
                        {currentIndex + 1} of {activeAds.length}
                      </span>
                      <span className="text-xs">{isPaused ? "⏸" : "▶"}</span>
                    </span>
                  </div>
                )}

                {/* Text Overlay - Bottom Left */}
                <div className="absolute bottom-8 left-8">
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 max-w-sm">
                    <h2
                      className={cn(
                        "font-semibold text-white mb-1",
                        isMobile ? "text-sm" : "text-base"
                      )}
                    >
                      {currentAd.title}
                    </h2>

                    {currentAd.message && (
                      <p
                        className={cn(
                          "text-white/90",
                          isMobile ? "text-xs" : "text-sm"
                        )}
                      >
                        {currentAd.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Navigation Arrows */}
                {hasMultipleAds && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleManualPrevious}
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
                      type="button"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleManualNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
                      type="button"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}

                {/* Pagination Dots with Progress */}
                {hasMultipleAds && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex justify-center gap-2">
                    {activeAds.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentIndex(index);
                          setIsPaused(true);
                        }}
                        className={cn(
                          "h-2 rounded-full transition-all relative overflow-hidden",
                          index === currentIndex
                            ? "bg-white/30 w-6"
                            : "bg-white/50 hover:bg-white/70 w-2"
                        )}
                        aria-label={`Go to advertisement ${index + 1}`}
                        type="button"
                      >
                        {index === currentIndex && !isPaused && (
                          <div
                            className="absolute inset-0 bg-white origin-left animate-slide-progress"
                            style={{
                              animationDuration: "4s",
                              animationPlayState: isPaused
                                ? "paused"
                                : "running",
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mobile touch hint */}
                {isMobile && hasMultipleAds && (
                  <div className="absolute top-16 left-1/2 -translate-x-1/2">
                    <span className="text-xs text-white bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                      Tap to {isPaused ? "play" : "pause"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <ImageOff className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-gray-500 mb-2">
                    {currentAd.title}
                  </p>
                  {currentAd.message && (
                    <p className="text-gray-400">{currentAd.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
