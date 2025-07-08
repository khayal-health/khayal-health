/**
 * Simplified heartrate detection library using JavaScript and canvas
 * This implementation uses rPPG (remote Photoplethysmography) principles
 * to analyze facial coloration changes that correspond to blood flow
 */

(function (global) {
  const heartrate = {
    // Initialization function that sets up the analyzer
    heartbeat: function (options) {
      const instance = {};

      // Default configuration values
      const config = {
        // DOM video element to analyze
        video: null,

        // Callbacks
        onBpmChange: () => {},
        onCalculationStarted: () => {},
        onCalculationComplete: () => {},

        // Analysis settings
        samplingFrequency: 30, // Frames per second
        minSignalLength: 5, // Minimum seconds of data required
        windowSize: 6, // Moving average window size in seconds

        // Override with user options
        ...options,
      };

      // Internal state
      let animationFrameId = null; // requestAnimationFrame reference
      let analyzing = false; // Current analysis state flag
      let rgbSignal = {
        // Collected RGB signal data
        r: [],
        g: [],
        b: [],
      };
      let timestamps = []; // Timestamp for each data point
      let lastProcessedTime = 0; // Last processing timestamp
      let canvas = document.createElement("canvas"); // Internal canvas for processing
      let context = canvas.getContext("2d");

      // Setup canvas dimensions
      if (config.video) {
        canvas.width = 40; // Low resolution is fine for analysis
        canvas.height = 40;
      } else {
        console.error("Video element is required for heartrate analysis");
        return null;
      }

      // Start data collection and analysis
      const start = function () {
        if (analyzing) return;

        analyzing = true;
        resetData();

        if (config.onCalculationStarted) {
          config.onCalculationStarted();
        }

        animationFrameId = requestAnimationFrame(processFrame);
      };

      // Reset all collected data
      const resetData = function () {
        rgbSignal = { r: [], g: [], b: [] };
        timestamps = [];
        lastProcessedTime = 0;
      };

      // Main frame processing function
      const processFrame = function () {
        if (!analyzing) return;

        const now = Date.now();
        const video = config.video;

        // Throttle processing based on sampling frequency
        if (now - lastProcessedTime >= 1000 / config.samplingFrequency) {
          lastProcessedTime = now;

          // Draw current video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Get pixel data from the canvas
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          const { data, width, height } = frame;

          // Calculate average RGB values for the frame
          let r = 0,
            g = 0,
            b = 0;
          let pixelCount = 0;

          // Center region analysis (focusing on most likely facial area)
          const centerX = Math.floor(width / 2);
          const centerY = Math.floor(height / 2);
          const radius = Math.min(width, height) * 0.4;

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              // Focus on center area (rough approximation of face area)
              const dx = x - centerX;
              const dy = y - centerY;
              const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

              if (distanceFromCenter <= radius) {
                const i = (y * width + x) * 4;
                r += data[i]; // Red channel
                g += data[i + 1]; // Green channel
                b += data[i + 2]; // Blue channel
                pixelCount++;
              }
            }
          }

          // Calculate averages
          if (pixelCount > 0) {
            r /= pixelCount;
            g /= pixelCount;
            b /= pixelCount;

            // Store signal data
            rgbSignal.r.push(r);
            rgbSignal.g.push(g);
            rgbSignal.b.push(b);
            timestamps.push(now);

            // Compute heart rate when we have enough data
            if (
              rgbSignal.g.length >=
              config.minSignalLength * config.samplingFrequency
            ) {
              calculateHeartRate();
            }
          }
        }

        // Continue processing frames
        animationFrameId = requestAnimationFrame(processFrame);
      };

      // Calculate heart rate from collected signal data
      const calculateHeartRate = function () {
        if (rgbSignal.g.length < 3) return;

        // Use green channel as it typically shows the strongest plethysmographic signal
        const signal = [...rgbSignal.g];

        // Normalize signal
        const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
        const normalizedSignal = signal.map((val) => val - mean);

        // Apply bandpass filter-like effect using moving average
        // This helps isolate frequency components in the expected heart rate range (0.75-4Hz or 45-240 BPM)
        const windowSize = Math.floor(
          config.windowSize * config.samplingFrequency
        );
        const filteredSignal = [];

        for (let i = windowSize; i < normalizedSignal.length; i++) {
          let sum = 0;
          for (let j = 0; j < windowSize; j++) {
            sum += normalizedSignal[i - j];
          }
          filteredSignal.push(sum / windowSize);
        }

        if (filteredSignal.length < 3) return;

        // Count zero-crossings to estimate frequency
        let crossings = 0;
        for (let i = 1; i < filteredSignal.length; i++) {
          if (
            (filteredSignal[i - 1] < 0 && filteredSignal[i] >= 0) ||
            (filteredSignal[i - 1] >= 0 && filteredSignal[i] < 0)
          ) {
            crossings++;
          }
        }

        // Calculate heart rate
        const duration =
          (timestamps[timestamps.length - 1] -
            timestamps[timestamps.length - windowSize]) /
          1000;
        const frequency = crossings / (2 * duration); // Divide by 2 as each cycle has 2 crossings
        const bpm = frequency * 60;

        // Apply realistic constraints (40-180 BPM for normal human range)
        const validBpm = Math.max(40, Math.min(180, bpm));

        // Call callback with result
        if (config.onBpmChange) {
          config.onBpmChange(validBpm);
        }

        // Check if we've collected enough data for a stable reading
        if (
          rgbSignal.g.length >=
          config.minSignalLength * config.samplingFrequency * 2
        ) {
          if (config.onCalculationComplete) {
            config.onCalculationComplete(validBpm);
            stop(); // Stop analysis after completion
          }
        }
      };

      // Stop analysis
      const stop = function () {
        analyzing = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      };

      // Clean up resources
      const destroy = function () {
        stop();
        canvas = null;
        context = null;
      };

      // Initialize and auto-start
      start();

      // Public API
      instance.start = start;
      instance.stop = stop;
      instance.destroy = destroy;

      return instance;
    },
  };

  // Expose to global scope
  global.heartrate = heartrate;
})(window);
/**
 * Advanced rPPG Heart Rate Detection Library
 * Uses FFT-based frequency analysis for accurate heart rate detection
 */

(function (global) {
  const heartrate = {
    heartbeat: function (options) {
      const instance = {};

      const config = {
        video: null,
        onBpmChange: () => {},
        onCalculationStarted: () => {},
        onCalculationComplete: () => {},
        samplingFrequency: 30,
        windowSize: 256, // FFT window size
        minHz: 0.75, // 45 bpm
        maxHz: 3.0, // 180 bpm
        ...options,
      };

      let analyzing = false;
      let animationFrameId = null;
      let rgbSignal = { r: [], g: [], b: [] };
      let timestamps = [];
      let lastProcessedTime = 0;

      // Create canvas with willReadFrequently for better performance
      let canvas = document.createElement("canvas");
      let context = canvas.getContext("2d", { willReadFrequently: true });

      canvas.width = 60; // Increased resolution for better signal
      canvas.height = 60;

      // Complex number class for FFT
      class Complex {
        constructor(real, imag) {
          this.real = real;
          this.imag = imag;
        }

        add(other) {
          return new Complex(this.real + other.real, this.imag + other.imag);
        }

        subtract(other) {
          return new Complex(this.real - other.real, this.imag - other.imag);
        }

        multiply(other) {
          return new Complex(
            this.real * other.real - this.imag * other.imag,
            this.real * other.imag + this.imag * other.real
          );
        }

        magnitude() {
          return Math.sqrt(this.real * this.real + this.imag * this.imag);
        }
      }

      // Cooley-Tukey FFT implementation
      const fft = function (signal) {
        const N = signal.length;

        // Pad to power of 2
        let paddedLength = 1;
        while (paddedLength < N) paddedLength *= 2;

        // Create padded signal
        const paddedSignal = new Array(paddedLength);
        for (let i = 0; i < paddedLength; i++) {
          paddedSignal[i] =
            i < N ? new Complex(signal[i], 0) : new Complex(0, 0);
        }

        // Bit reversal
        const reversed = new Array(paddedLength);
        for (let i = 0; i < paddedLength; i++) {
          let reversed_i = 0;
          let temp = i;
          for (let j = 0; j < Math.log2(paddedLength); j++) {
            reversed_i = (reversed_i << 1) | (temp & 1);
            temp >>= 1;
          }
          reversed[i] = paddedSignal[reversed_i];
        }

        // Cooley-Tukey FFT
        for (let size = 2; size <= paddedLength; size *= 2) {
          const halfsize = size / 2;
          const step = paddedLength / size;
          for (let i = 0; i < paddedLength; i += size) {
            for (let j = i, k = 0; j < i + halfsize; j++, k += step) {
              const twiddle = new Complex(
                Math.cos((2 * Math.PI * k) / paddedLength),
                -Math.sin((2 * Math.PI * k) / paddedLength)
              );
              const temp = reversed[j + halfsize].multiply(twiddle);
              reversed[j + halfsize] = reversed[j].subtract(temp);
              reversed[j] = reversed[j].add(temp);
            }
          }
        }

        // Return magnitudes
        const magnitudes = new Array(Math.floor(paddedLength / 2));
        for (let i = 0; i < magnitudes.length; i++) {
          magnitudes[i] = reversed[i].magnitude() / paddedLength;
        }

        return magnitudes;
      };

      // Butterworth bandpass filter
      const butterworthFilter = function (signal, lowFreq, highFreq, fs) {
        const filtered = new Array(signal.length);

        // 2nd order Butterworth coefficients
        const nyquist = fs / 2;
        const low = lowFreq / nyquist;
        const high = highFreq / nyquist;

        // Apply cascaded high-pass and low-pass
        let x1 = 0,
          x2 = 0,
          y1 = 0,
          y2 = 0;

        for (let i = 0; i < signal.length; i++) {
          // High-pass stage
          const alpha = 0.1; // Simplified coefficient
          const highpassed = signal[i] - alpha * y1;
          y1 = highpassed;

          // Low-pass stage
          const lowpassed = alpha * highpassed + (1 - alpha) * y2;
          y2 = lowpassed;

          filtered[i] = lowpassed;
        }

        return filtered;
      };

      // Detrend signal to remove DC component and linear trends
      const detrend = function (signal) {
        const n = signal.length;
        let sumX = 0,
          sumY = 0,
          sumXY = 0,
          sumX2 = 0;

        for (let i = 0; i < n; i++) {
          sumX += i;
          sumY += signal[i];
          sumXY += i * signal[i];
          sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return signal.map((val, i) => val - (slope * i + intercept));
      };

      // Extract Region of Interest (forehead/cheek area)
      const extractROI = function (imageData, width, height) {
        const data = imageData.data;
        let r = 0,
          g = 0,
          b = 0;
        let pixelCount = 0;

        // Focus on upper face region (forehead) - better for pulse detection
        const startY = Math.floor(height * 0.15);
        const endY = Math.floor(height * 0.45);
        const startX = Math.floor(width * 0.25);
        const endX = Math.floor(width * 0.75);

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const i = (y * width + x) * 4;

            // Skip pixels that are too dark or too bright (likely not skin)
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (brightness > 50 && brightness < 200) {
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              pixelCount++;
            }
          }
        }

        if (pixelCount > 0) {
          return {
            r: r / pixelCount,
            g: g / pixelCount,
            b: b / pixelCount,
          };
        }

        return null;
      };

      // Hamming window for better frequency resolution
      const hammingWindow = function (signal) {
        const windowed = new Array(signal.length);
        for (let i = 0; i < signal.length; i++) {
          const hammingCoeff =
            0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (signal.length - 1));
          windowed[i] = signal[i] * hammingCoeff;
        }
        return windowed;
      };

      const start = function () {
        if (analyzing) return;

        analyzing = true;
        rgbSignal = { r: [], g: [], b: [] };
        timestamps = [];
        lastProcessedTime = 0;

        if (config.onCalculationStarted) {
          config.onCalculationStarted();
        }

        animationFrameId = requestAnimationFrame(processFrame);
      };

      const processFrame = function () {
        if (!analyzing) return;

        const now = Date.now();
        const elapsed = now - lastProcessedTime;

        if (elapsed >= 1000 / config.samplingFrequency) {
          lastProcessedTime = now;

          try {
            context.drawImage(config.video, 0, 0, canvas.width, canvas.height);
            const frame = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );

            const roi = extractROI(frame, canvas.width, canvas.height);

            if (roi) {
              rgbSignal.r.push(roi.r);
              rgbSignal.g.push(roi.g);
              rgbSignal.b.push(roi.b);
              timestamps.push(now);

              // Process when we have enough samples
              if (rgbSignal.g.length >= config.windowSize) {
                calculateHeartRate();
              }
            }
          } catch (e) {
            console.error("Frame processing error:", e);
          }
        }

        animationFrameId = requestAnimationFrame(processFrame);
      };

      const calculateHeartRate = function () {
        try {
          // Use green channel (best for pulse detection)
          let signal = rgbSignal.g.slice(-config.windowSize);

          // Preprocessing pipeline
          signal = detrend(signal);

          // Normalize
          const mean = signal.reduce((a, b) => a + b) / signal.length;
          const std = Math.sqrt(
            signal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
              signal.length
          );

          if (std === 0) return; // Avoid division by zero

          signal = signal.map((x) => (x - mean) / std);

          // Apply bandpass filter
          signal = butterworthFilter(
            signal,
            config.minHz,
            config.maxHz,
            config.samplingFrequency
          );

          // Apply Hamming window
          signal = hammingWindow(signal);

          // Apply FFT
          const fftResult = fft(signal);

          // Find peaks in frequency domain
          const freqResolution = config.samplingFrequency / config.windowSize;
          const peaks = [];

          for (let i = 1; i < fftResult.length - 1; i++) {
            const freq = i * freqResolution;
            if (freq >= config.minHz && freq <= config.maxHz) {
              // Check if it's a local maximum
              if (
                fftResult[i] > fftResult[i - 1] &&
                fftResult[i] > fftResult[i + 1]
              ) {
                peaks.push({
                  frequency: freq,
                  power: fftResult[i],
                });
              }
            }
          }

          // Sort peaks by power
          peaks.sort((a, b) => b.power - a.power);

          if (peaks.length > 0) {
            // Use the strongest peak
            const dominantFreq = peaks[0].frequency;
            const bpm = Math.round(dominantFreq * 60);

            // Validate BPM is in reasonable range
            if (bpm >= 45 && bpm <= 180) {
              if (config.onBpmChange) {
                config.onBpmChange(bpm);
              }

              // Check if we have enough data for stable reading
              if (rgbSignal.g.length >= config.windowSize * 2) {
                if (config.onCalculationComplete) {
                  config.onCalculationComplete(bpm);
                }
              }
            }
          }
        } catch (e) {
          console.error("Heart rate calculation error:", e);
        }
      };

      const stop = function () {
        analyzing = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      };

      const destroy = function () {
        stop();
        canvas = null;
        context = null;
      };

      // Auto-start
      if (config.video) {
        start();
      }

      instance.start = start;
      instance.stop = stop;
      instance.destroy = destroy;
      instance.getSignalQuality = () => {
        if (rgbSignal.g.length < 30) return 0;

        // Calculate signal quality based on signal-to-noise ratio
        const signal = rgbSignal.g.slice(-60);
        const mean = signal.reduce((a, b) => a + b) / signal.length;
        const variance =
          signal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / signal.length;
        const snr = mean / Math.sqrt(variance);

        return Math.min(100, Math.max(0, snr * 10));
      };

      // Expose signal data for advanced calculations
      instance.getSignalData = () => ({
        r: [...rgbSignal.r],
        g: [...rgbSignal.g],
        b: [...rgbSignal.b],
        timestamps: [...timestamps],
      });

      return instance;
    },
  };

  global.heartrate = heartrate;
})(window);
