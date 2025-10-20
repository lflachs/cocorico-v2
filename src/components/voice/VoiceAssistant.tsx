"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mic, MicOff, Loader2, Volume2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";
import { SiriWaveform } from "./SiriWaveform";

type ConversationState = "idle" | "recording" | "transcribing" | "parsing" | "confirming" | "executing" | "speaking" | "asking_price";

type ProductCommand = {
  product: string;
  quantity: number;
  matchedProductId: string | null;
  matchedProductName: string | null;
  currentQuantity: number | null;
  unit: string | null;
};

type ParsedCommand = {
  action: "add" | "remove" | "check" | "list" | "unknown";
  products: ProductCommand[];
  confidence: number;
  needsConfirmation: boolean;
  confirmationMessage: string;
};

type VoiceAssistantProps = {
  onInventoryUpdate?: () => void;
};

export function VoiceAssistant({ onInventoryUpdate }: VoiceAssistantProps) {
  const { language } = useLanguage();

  // Debug: Log language on mount and changes
  useEffect(() => {
    console.log("[VoiceAssistant] Language from context:", language);
    console.log("[VoiceAssistant] Cookie:", document.cookie);
    console.log("[VoiceAssistant] LocalStorage:", localStorage.getItem('language'));
  }, [language]);

  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ConversationState>("idle");
  const [transcript, setTranscript] = useState("");
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [pendingProductsQueue, setPendingProductsQueue] = useState<Array<{
    product: string;
    quantity: number;
    unit: string;
    action: string;
  }>>([]);
  const [productPrice, setProductPrice] = useState<number | null>(null);

  // Load wake word setting from localStorage (default: disabled)
  // Always start with false to match SSR, then update from localStorage on client
  const [enableWakeWord, setEnableWakeWord] = useState(false);

  const [isWakeWordListening, setIsWakeWordListening] = useState(false);

  // Load wake word setting from localStorage on client after mount
  useEffect(() => {
    const stored = localStorage.getItem('voiceAssistantWakeWordEnabled');
    if (stored === 'true') {
      setEnableWakeWord(true);
    }
  }, []);

  // Save wake word setting to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('voiceAssistantWakeWordEnabled', String(enableWakeWord));
  }, [enableWakeWord]);

  // Toggle wake word function
  const toggleWakeWord = useCallback(() => {
    setEnableWakeWord(prev => !prev);
    if (enableWakeWord) {
      // If disabling, stop wake word listening
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.abort();
        } catch (e) {
          console.log("[WakeWord] Error stopping:", e);
        }
        wakeWordRecognitionRef.current = null;
        setIsWakeWordListening(false);
        wakeWordInitializedRef.current = false;
      }
    }
  }, [enableWakeWord]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const confirmationRecorderRef = useRef<MediaRecorder | null>(null);
  const confirmationStreamRef = useRef<MediaStream | null>(null);
  const confirmationContextRef = useRef<AudioContext | null>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const wakeWordInitializedRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const confirmationAnimationFrameRef = useRef<number | null>(null);
  const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldListenForWakeWordRef = useRef<boolean>(true);
  const isDialogOpenRef = useRef<boolean>(false);
  const notificationAudioContextRef = useRef<AudioContext | null>(null);

  // Play notification sound when dialog opens
  const playNotificationSound = useCallback(() => {
    try {
      // Create audio context if it doesn't exist
      if (!notificationAudioContextRef.current) {
        notificationAudioContextRef.current = new AudioContext();
      }

      const audioContext = notificationAudioContextRef.current;
      const now = audioContext.currentTime;

      // Create oscillator for a pleasant "chime" sound
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Create two tones for a harmonious sound (major third interval)
      oscillator1.type = 'sine';
      oscillator1.frequency.setValueAtTime(800, now); // E5

      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(1000, now); // B5

      // Connect oscillators to gain node
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Envelope for smooth sound (attack and decay)
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4); // Decay

      // Start and stop the sound
      oscillator1.start(now);
      oscillator2.start(now);
      oscillator1.stop(now + 0.4);
      oscillator2.stop(now + 0.4);

      console.log("[Voice] Notification sound played");
    } catch (error) {
      console.error("[Voice] Error playing notification sound:", error);
      // Silently fail - notification sound is not critical
    }
  }, []);

  // Stop everything and cleanup all resources
  const stopEverything = useCallback(() => {
    console.log("[Voice] Stopping everything and cleaning up");

    // Cancel animation frames
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (confirmationAnimationFrameRef.current !== null) {
      cancelAnimationFrame(confirmationAnimationFrameRef.current);
      confirmationAnimationFrameRef.current = null;
    }

    // Stop any active audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Stop main recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log("[Voice] Error stopping main recorder:", e);
      }
      mediaRecorderRef.current = null;
    }

    // Stop main media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Stop confirmation recording
    if (confirmationRecorderRef.current && confirmationRecorderRef.current.state !== "inactive") {
      try {
        confirmationRecorderRef.current.stop();
      } catch (e) {
        console.log("[Voice] Error stopping confirmation recorder:", e);
      }
      confirmationRecorderRef.current = null;
    }

    // Stop confirmation media stream
    if (confirmationStreamRef.current) {
      confirmationStreamRef.current.getTracks().forEach((track) => track.stop());
      confirmationStreamRef.current = null;
    }

    // Close audio contexts
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.log("[Voice] Error closing audio context:", e);
      }
      audioContextRef.current = null;
    }

    if (confirmationContextRef.current) {
      try {
        confirmationContextRef.current.close();
      } catch (e) {
        console.log("[Voice] Error closing confirmation context:", e);
      }
      confirmationContextRef.current = null;
    }

    // Close notification audio context
    if (notificationAudioContextRef.current) {
      try {
        notificationAudioContextRef.current.close();
      } catch (e) {
        console.log("[Voice] Error closing notification context:", e);
      }
      notificationAudioContextRef.current = null;
    }

    // Clear all timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
      confirmationTimeoutRef.current = null;
    }

    // Reset recording flag
    isRecordingRef.current = false;

    // Reset state
    setAudioLevel(0);
    setIsPlayingAudio(false);
    setState("idle");
    setPendingProductsQueue([]);
    setProductPrice(null);
  }, []);

  // Start recording with voice activity detection
  const startRecording = useCallback(async () => {
    // Guard: Prevent starting if already recording
    if (isRecordingRef.current) {
      console.log("[Voice] Already recording, ignoring start request");
      return;
    }

    isRecordingRef.current = true;
    console.log("[Voice] Starting recording");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Try to use the best supported audio format
      // Prefer formats that OpenAI Whisper supports well
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log('[Voice] Using MIME type:', mimeType);
          break;
        }
      }

      const mediaRecorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up audio analysis for voice activity detection
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 2048;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = 25; // Adjust sensitivity (higher = less sensitive to background noise)
      const SILENCE_DURATION = 2000; // Stop after 2 seconds of silence
      const MIN_RECORDING_TIME = 500; // Minimum 0.5 seconds before allowing auto-stop

      let hasDetectedVoice = false;
      const startTime = Date.now();

      // Monitor audio levels
      const checkAudioLevel = () => {
        if (mediaRecorder.state !== "recording") {
          animationFrameRef.current = null;
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // Update audio level for visualization (normalize to 0-1 range)
        setAudioLevel(Math.min(average / 100, 1));

        // Log audio level for debugging
        if (Math.random() < 0.1) { // Log 10% of the time to avoid spam
          console.log("[Voice] Audio level:", Math.round(average));
        }

        if (average > SILENCE_THRESHOLD) {
          // Voice detected
          hasDetectedVoice = true;
          // Clear any existing silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        } else if (hasDetectedVoice && (Date.now() - startTime) > MIN_RECORDING_TIME) {
          // Silence detected after voice (and after minimum time)
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              console.log("[Voice] Silence detected, stopping recording");
              stopRecording();
            }, SILENCE_DURATION);
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Use the actual MIME type from the MediaRecorder
        const actualMimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });

        console.log("[Voice] Recording stopped, blob size:", audioBlob.size, "bytes", "type:", actualMimeType);

        // Clean up
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Check if we have meaningful audio data
        if (audioBlob.size < 1000) {
          console.warn("[Voice] Audio blob too small, ignoring");
          toast.error("Recording too short, please try again");
          setState("idle");
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
          return;
        }

        // Get fresh language value at the time of processing
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        };

        const currentLang = getCookie('language') || localStorage.getItem('language') || 'en';
        console.log("[Voice] Recording stopped - using language:", currentLang);

        try {
          await processAudio(audioBlob);
        } catch (error) {
          console.error("[Voice] Error processing audio:", error);
          setState("idle");
        }

        // Stop all tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorder.start();
      setState("recording");

      // Play notification sound when listening starts
      playNotificationSound();

      toast.info("Listening... Speak your command");

      // Start monitoring audio levels
      checkAudioLevel();
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to access microphone");
      setState("idle");
      isRecordingRef.current = false; // Reset flag on error
    }
  }, [playNotificationSound]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setState("transcribing");
      setAudioLevel(0); // Reset audio level
    }
  }, []);

  // Process audio: transcribe → parse → speak
  // Remove useCallback to avoid stale closure - we need fresh language value
  const processAudio = async (audioBlob: Blob) => {
    try {
      // Check if dialog is still open before processing
      if (!isDialogOpenRef.current) {
        console.log("[Voice] Dialog closed, aborting audio processing");
        return;
      }

      // Step 1: Transcribe with Whisper
      setState("transcribing");

      // Always get fresh language from cookie/localStorage, ignore context
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      const currentLang = getCookie('language') || localStorage.getItem('language') || 'en';
      console.log("[Voice] Current language:", currentLang, "from cookie:", getCookie('language'), "from localStorage:", localStorage.getItem('language'));

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("language", currentLang);

      const transcribeRes = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      // Check again after async operation
      if (!isDialogOpenRef.current) {
        console.log("[Voice] Dialog closed during transcription, aborting");
        return;
      }

      if (!transcribeRes.ok) {
        throw new Error("Transcription failed");
      }

      const { text } = await transcribeRes.json();
      setTranscript(text);
      console.log("[Voice] Transcript:", text);

      // Check again before parsing
      if (!isDialogOpenRef.current) {
        console.log("[Voice] Dialog closed after transcription, aborting");
        return;
      }

      // Step 2: Parse command with GPT-4o
      setState("parsing");
      const parseRes = await fetch("/api/voice/parse-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: currentLang }),
      });

      // Check again after async operation
      if (!isDialogOpenRef.current) {
        console.log("[Voice] Dialog closed during parsing, aborting");
        return;
      }

      if (!parseRes.ok) {
        throw new Error("Command parsing failed");
      }

      const { command } = await parseRes.json();
      setParsedCommand(command);
      console.log("[Voice] Parsed command:", command);

      // Check before speaking
      if (!isDialogOpenRef.current) {
        console.log("[Voice] Dialog closed after parsing, aborting");
        return;
      }

      // Step 3: Speak confirmation
      if (command.confirmationMessage) {
        await speakText(command.confirmationMessage);
      }

      // Check before confirmation
      if (!isDialogOpenRef.current) {
        console.log("[Voice] Dialog closed after speaking, aborting");
        return;
      }

      console.log("[Voice] About to enter confirmation, parsedCommand state:", parsedCommand);
      console.log("[Voice] Command object we'll use:", command);

      // Step 4: Wait for user confirmation via voice
      if (command.needsConfirmation) {
        setState("confirming");
        // Automatically start listening for yes/no response
        // Pass command directly instead of relying on state
        await listenForConfirmationWithCommand(command);
      } else {
        // Auto-execute for check/list commands
        if (command.action === "check" || command.action === "list") {
          setState("idle");
        } else {
          setState("confirming");
          // Automatically start listening for yes/no response
          // Pass command directly instead of relying on state
          await listenForConfirmationWithCommand(command);
        }
      }
    } catch (error) {
      console.error("Audio processing error:", error);
      if (isDialogOpenRef.current) {
        toast.error("Failed to process command");
      }
      setState("idle");
    }
  };

  // Create product with price and handle queue
  const createProductWithPrice = async (
    productData: { product: string; quantity: number; unit: string; action: string },
    price: number | null,
    currentLang: string
  ) => {
    try {
      console.log("[Voice] Creating product with price:", productData, price);
      setState("executing");

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productData.product,
          quantity: productData.quantity,
          unit: productData.unit || "PC",
          trackable: true,
          unitPrice: price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create product: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      console.log("[Voice] Product created successfully with price");

      // Trigger inventory refresh
      onInventoryUpdate?.();

      // Build success message
      let successMessage = '';
      if (price !== null) {
        successMessage = currentLang === 'fr'
          ? `Produit ${productData.product} créé avec ${productData.quantity} ${productData.unit} à ${price} euros.`
          : `Product ${productData.product} created with ${productData.quantity} ${productData.unit} at ${price} euros.`;
      } else {
        successMessage = currentLang === 'fr'
          ? `Produit ${productData.product} créé avec ${productData.quantity} ${productData.unit}.`
          : `Product ${productData.product} created with ${productData.quantity} ${productData.unit}.`;
      }

      await speakText(successMessage);
      toast.success(successMessage);

      // Check if there are more products in the queue
      setPendingProductsQueue(prevQueue => {
        const remainingQueue = prevQueue.slice(1); // Remove the first product we just created

        // If there are more products, ask for the next one's price
        if (remainingQueue.length > 0) {
          const nextProduct = remainingQueue[0];
          console.log("[Voice] More products in queue, asking for next price:", nextProduct);

          // Ask for price of next product
          setTimeout(async () => {
            const priceQuestion = currentLang === 'fr'
              ? `Quel est le prix unitaire de ${nextProduct.product}? Vous pouvez dire le prix en euros, ou dire "je ne sais pas".`
              : `What is the unit price for ${nextProduct.product}? You can say the price in euros, or say "I don't know".`;

            await speakText(priceQuestion);
            setState("asking_price");

            // Listen for price response
            await listenForPriceResponse();
          }, 500); // Small delay for better UX
        } else {
          // No more products - reset and close
          console.log("[Voice] All products created, resetting state");
          setState("idle");
          setProductPrice(null);
          setTimeout(() => {
            setIsOpen(false);
            setTranscript("");
            setParsedCommand(null);
          }, 2000);
        }

        return remainingQueue;
      });
    } catch (error) {
      console.error("[Voice] Error creating product:", error);
      toast.error("Failed to create product");
      setState("idle");
    }
  };

  // Listen for price response via voice
  const listenForPriceResponse = async () => {
    console.log("[Voice] listenForPriceResponse called");

    // Check if dialog is still open
    if (!isDialogOpenRef.current) {
      console.log("[Voice] Dialog closed, aborting price listening");
      return;
    }

    try {
      // Start recording for price
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      confirmationStreamRef.current = stream;

      // Try to use the best supported audio format
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      const mediaRecorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      confirmationRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      // Set up audio analysis for voice activity detection
      const audioContext = new AudioContext();
      confirmationContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = 20; // Lower threshold - more sensitive to voice
      const SILENCE_DURATION = 2500; // 2.5 seconds of silence required
      const MIN_RECORDING_TIME = 1000; // Minimum 1 second before allowing auto-stop

      let hasDetectedVoice = false;
      let silenceTimeout: NodeJS.Timeout | null = null;
      const startTime = Date.now();

      // Monitor audio levels
      const checkAudioLevel = () => {
        if (mediaRecorder.state !== "recording") {
          confirmationAnimationFrameRef.current = null;
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // Log audio level occasionally for debugging
        if (Math.random() < 0.1) {
          console.log("[Voice] Price audio level:", Math.round(average));
        }

        if (average > SILENCE_THRESHOLD) {
          // Voice detected
          hasDetectedVoice = true;
          if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
          }
        } else if (hasDetectedVoice && (Date.now() - startTime) > MIN_RECORDING_TIME) {
          // Silence detected after voice (and after minimum time)
          if (!silenceTimeout) {
            silenceTimeout = setTimeout(() => {
              console.log("[Voice] Silence detected in price response, stopping");
              if (mediaRecorder.state === "recording") {
                mediaRecorder.stop();
                setState("transcribing");
              }
            }, SILENCE_DURATION);
          }
        }

        confirmationAnimationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Use the actual MIME type from the MediaRecorder
        const actualMimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(chunks, { type: actualMimeType });

        console.log("[Voice] Price recording stopped, blob size:", audioBlob.size, "bytes", "type:", actualMimeType);

        // Clean up
        if (silenceTimeout) clearTimeout(silenceTimeout);
        if (confirmationContextRef.current) {
          confirmationContextRef.current.close();
          confirmationContextRef.current = null;
        }

        // Check if we have meaningful audio data
        if (audioBlob.size < 1000) {
          console.warn("[Voice] Price audio blob too small, treating as 'no price provided'");

          // Clean up streams
          if (confirmationStreamRef.current) {
            confirmationStreamRef.current.getTracks().forEach((track) => track.stop());
            confirmationStreamRef.current = null;
          }

          // Create product without price
          if (pendingProductsQueue.length > 0) {
            const getCookie = (name: string) => {
              const value = `; ${document.cookie}`;
              const parts = value.split(`; ${name}=`);
              if (parts.length === 2) return parts.pop()?.split(';').shift();
              return null;
            };
            const currentLang = getCookie('language') || localStorage.getItem('language') || 'en';
            await createProductWithPrice(pendingProductsQueue[0], null, currentLang);
          }
          return;
        }

        // Check if dialog is still open before proceeding
        if (!isDialogOpenRef.current) {
          console.log("[Voice] Dialog closed during price recording, aborting");
          if (confirmationStreamRef.current) {
            confirmationStreamRef.current.getTracks().forEach((track) => track.stop());
            confirmationStreamRef.current = null;
          }
          return;
        }

        // Get current language
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        };
        const currentLang = getCookie('language') || localStorage.getItem('language') || 'en';

        // Transcribe the response
        const formData = new FormData();
        formData.append("audio", audioBlob, "price.webm");
        formData.append("language", currentLang);

        const transcribeRes = await fetch("/api/voice/transcribe", {
          method: "POST",
          body: formData,
        });

        // Check again after async operation
        if (!isDialogOpenRef.current) {
          console.log("[Voice] Dialog closed during price transcription, aborting");
          if (confirmationStreamRef.current) {
            confirmationStreamRef.current.getTracks().forEach((track) => track.stop());
            confirmationStreamRef.current = null;
          }
          return;
        }

        if (transcribeRes.ok) {
          const { text } = await transcribeRes.json();
          console.log("[Voice] Price response:", text);

          // Parse the price
          const parseRes = await fetch("/api/voice/parse-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, language: currentLang }),
          });

          if (parseRes.ok) {
            const { price: priceData } = await parseRes.json();
            console.log("[Voice] Parsed price:", priceData);

            // Store the price (or null if not provided)
            const finalPrice = priceData.understood && priceData.price !== null ? priceData.price : null;
            setProductPrice(finalPrice);

            // Now create the product with the price
            if (pendingProductsQueue.length > 0) {
              await createProductWithPrice(pendingProductsQueue[0], finalPrice, currentLang);
            }
          }
        }

        if (confirmationStreamRef.current) {
          confirmationStreamRef.current.getTracks().forEach((track) => track.stop());
          confirmationStreamRef.current = null;
        }
      };

      mediaRecorder.start();
      setState("recording");

      // Start monitoring audio levels
      checkAudioLevel();

      // Fallback: Auto-stop after 8 seconds max
      confirmationTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          console.log("[Voice] Max time reached for price, stopping");
          mediaRecorder.stop();
          setState("transcribing");
        }
      }, 8000);

    } catch (error) {
      console.error("Price listening error:", error);
      toast.error("Failed to listen for price");
      setState("asking_price");
    }
  };

  // Listen for confirmation (yes/no) via voice
  const listenForConfirmationWithCommand = async (currentCommand: ParsedCommand) => {
    console.log("[Voice] listenForConfirmationWithCommand called with:", currentCommand);

    // Check if dialog is still open
    if (!isDialogOpenRef.current) {
      console.log("[Voice] Dialog closed, aborting confirmation listening");
      return;
    }

    try {
      // Start recording for confirmation
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      confirmationStreamRef.current = stream;

      // Try to use the best supported audio format
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      const mediaRecorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      confirmationRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      // Set up audio analysis for voice activity detection
      const audioContext = new AudioContext();
      confirmationContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = 20;
      const SILENCE_DURATION = 1000; // Shorter for yes/no (1 second)

      let hasDetectedVoice = false;
      let silenceTimeout: NodeJS.Timeout | null = null;

      // Monitor audio levels
      const checkAudioLevel = () => {
        if (mediaRecorder.state !== "recording") {
          confirmationAnimationFrameRef.current = null;
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        if (average > SILENCE_THRESHOLD) {
          // Voice detected
          hasDetectedVoice = true;
          if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
          }
        } else if (hasDetectedVoice) {
          // Silence detected after voice
          if (!silenceTimeout) {
            silenceTimeout = setTimeout(() => {
              console.log("[Voice] Silence detected in confirmation, stopping");
              if (mediaRecorder.state === "recording") {
                mediaRecorder.stop();
                setState("transcribing");
              }
            }, SILENCE_DURATION);
          }
        }

        confirmationAnimationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Use the actual MIME type from the MediaRecorder
        const actualMimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(chunks, { type: actualMimeType });

        console.log("[Voice] Confirmation recording stopped, type:", actualMimeType);

        // Clean up
        if (silenceTimeout) clearTimeout(silenceTimeout);
        if (confirmationContextRef.current) {
          confirmationContextRef.current.close();
          confirmationContextRef.current = null;
        }

        // Check if dialog is still open before proceeding
        if (!isDialogOpenRef.current) {
          console.log("[Voice] Dialog closed during confirmation recording, aborting");
          if (confirmationStreamRef.current) {
            confirmationStreamRef.current.getTracks().forEach((track) => track.stop());
            confirmationStreamRef.current = null;
          }
          return;
        }

        // Get current language
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        };
        const currentLang = getCookie('language') || localStorage.getItem('language') || 'en';

        // Transcribe the response
        const formData = new FormData();
        formData.append("audio", audioBlob, "confirmation.webm");
        formData.append("language", currentLang);

        const transcribeRes = await fetch("/api/voice/transcribe", {
          method: "POST",
          body: formData,
        });

        // Check again after async operation
        if (!isDialogOpenRef.current) {
          console.log("[Voice] Dialog closed during confirmation transcription, aborting");
          if (confirmationStreamRef.current) {
            confirmationStreamRef.current.getTracks().forEach((track) => track.stop());
            confirmationStreamRef.current = null;
          }
          return;
        }

        if (transcribeRes.ok) {
          const { text } = await transcribeRes.json();
          console.log("[Voice] Confirmation response:", text);

          // Check one more time before processing response
          if (!isDialogOpenRef.current) {
            console.log("[Voice] Dialog closed after confirmation transcription, aborting");
            if (confirmationStreamRef.current) {
              confirmationStreamRef.current.getTracks().forEach((track) => track.stop());
              confirmationStreamRef.current = null;
            }
            return;
          }

          // Check for yes/no in both languages
          const lowerText = text.toLowerCase().trim();
          const isYes = lowerText.includes('oui') || lowerText.includes('yes') ||
                       lowerText.includes('ouais') || lowerText.includes('yeah') ||
                       lowerText.includes('ok') || lowerText.includes('d\'accord');
          const isNo = lowerText.includes('non') || lowerText.includes('no') ||
                      lowerText.includes('pas') || lowerText.includes('annule');

          if (isYes) {
            console.log("[Voice] User confirmed, executing action with command:", currentCommand);
            // Execute directly with the captured command
            await executeCommand(currentCommand);
          } else if (isNo) {
            console.log("[Voice] User cancelled");
            await handleCancel();
          } else {
            // Unclear response, ask again
            const retryMessage = currentLang === 'fr'
              ? "Désolé, je n'ai pas compris. Dites oui ou non."
              : "Sorry, I didn't understand. Say yes or no.";
            await speakText(retryMessage);
            // Try again with the same command (only if dialog is still open)
            if (isDialogOpenRef.current) {
              await listenForConfirmationWithCommand(currentCommand);
            }
          }
        }

        if (confirmationStreamRef.current) {
          confirmationStreamRef.current.getTracks().forEach((track) => track.stop());
          confirmationStreamRef.current = null;
        }
      };

      mediaRecorder.start();
      setState("recording");

      // Start monitoring audio levels
      checkAudioLevel();

      // Fallback: Auto-stop after 5 seconds max
      confirmationTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          console.log("[Voice] Max time reached, stopping");
          mediaRecorder.stop();
          setState("transcribing");
        }
      }, 5000);

    } catch (error) {
      console.error("Confirmation listening error:", error);
      toast.error("Failed to listen for confirmation");
      setState("confirming");
    }
  };

  // Speak text using OpenAI TTS
  const speakText = async (text: string) => {
    try {
      setState("speaking");
      setIsPlayingAudio(true);

      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "nova", language }),
      });

      if (!response.ok) {
        throw new Error("TTS failed");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio with iOS compatibility
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // iOS requires explicit load before play
      audio.load();

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          setIsPlayingAudio(false);
          resolve();
        };
        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          // On iOS, if autoplay fails, still resolve to continue
          setIsPlayingAudio(false);
          resolve();
        };

        // Try to play with iOS compatibility
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Play failed:", error);
            // On iOS, autoplay might fail - user needs to interact first
            // We'll still resolve to continue the flow
            setIsPlayingAudio(false);
            resolve();
          });
        }
      });

      URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error("TTS error:", error);
      setIsPlayingAudio(false);
    }
  };

  // Execute command (extracted from handleConfirm to avoid state closure issues)
  const executeCommand = async (command: ParsedCommand) => {
    console.log("[Voice] executeCommand started, action:", command.action, "products:", command.products);

    try {
      setState("executing");

      // Get current language for success messages
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      const currentLang = getCookie('language') || localStorage.getItem('language') || 'en';

      // Process each product in the command
      const results = [];
      for (const productCmd of command.products) {
        // Execute the action for each product
        if (command.action === "add") {
          if (productCmd.matchedProductId) {
            console.log("[Voice] Updating existing product:", productCmd.matchedProductId);
            // Update existing product
            const newQuantity = (productCmd.currentQuantity || 0) + productCmd.quantity;
            const response = await fetch(`/api/products/${productCmd.matchedProductId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ quantity: newQuantity }),
            });

            if (!response.ok) {
              throw new Error(`Failed to update product: ${response.status}`);
            }

            console.log("[Voice] Product updated successfully");
            results.push({ name: productCmd.matchedProductName, quantity: newQuantity, unit: productCmd.unit });

            // Trigger inventory refresh
            onInventoryUpdate?.();
          } else {
            console.log("[Voice] New product detected:", productCmd.product);
            // Store pending product creation - we'll ask for price first
            results.push({ name: productCmd.product, quantity: productCmd.quantity, unit: productCmd.unit, isNew: true });
          }
        } else if (command.action === "remove") {
          if (productCmd.matchedProductId) {
            console.log("[Voice] Removing quantity from product:", productCmd.matchedProductId);
            const newQuantity = Math.max(0, (productCmd.currentQuantity || 0) - productCmd.quantity);
            const response = await fetch(`/api/products/${productCmd.matchedProductId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ quantity: newQuantity }),
            });

            if (!response.ok) {
              throw new Error(`Failed to update product: ${response.status}`);
            }

            console.log("[Voice] Product quantity reduced successfully");
            results.push({ name: productCmd.matchedProductName, quantity: newQuantity, unit: productCmd.unit });

            // Trigger inventory refresh
            onInventoryUpdate?.();
          }
        }
      }

      // Check if we have new products to create
      const newProducts = results.filter(r => r.isNew);
      if (newProducts.length > 0) {
        console.log("[Voice] New products detected, asking for prices before creation:", newProducts);

        // Store all pending products in the queue
        setPendingProductsQueue(newProducts.map(p => ({
          product: p.name,
          quantity: p.quantity,
          unit: p.unit || "PC",
          action: command.action
        })));

        // Ask for price of the first product
        const firstProduct = newProducts[0];
        const priceQuestion = currentLang === 'fr'
          ? `Quel est le prix unitaire de ${firstProduct.name}? Vous pouvez dire le prix en euros, ou dire "je ne sais pas".`
          : `What is the unit price for ${firstProduct.name}? You can say the price in euros, or say "I don't know".`;

        await speakText(priceQuestion);
        setState("asking_price");

        // Listen for price response
        await listenForPriceResponse();
      } else {
        // No new product - just updated existing products
        // Generate success message
        let successMessage = '';
        if (results.length === 1) {
          const result = results[0];
          successMessage = currentLang === 'fr'
            ? `Terminé! Vous avez maintenant ${result.quantity} ${result.unit || ""} de ${result.name}.`
            : `Done! You now have ${result.quantity} ${result.unit || ""} of ${result.name}.`;
        } else {
          // Multiple products
          successMessage = currentLang === 'fr'
            ? `Terminé! ${results.length} produits mis à jour avec succès.`
            : `Done! ${results.length} products updated successfully.`;
        }

        console.log("[Voice] Speaking success message:", successMessage);
        await speakText(successMessage);
        toast.success(successMessage);

        // Reset normally
        console.log("[Voice] Action completed, resetting state");
        setState("idle");
        setTimeout(() => {
          setIsOpen(false);
          setTranscript("");
          setParsedCommand(null);
        }, 2000);
      }
    } catch (error) {
      console.error("[Voice] Execute error:", error);
      toast.error("Failed to execute command");
      setState("confirming");
    }
  };

  // Confirm action (wrapper that uses current parsedCommand state)
  const handleConfirm = async () => {
    if (!parsedCommand) {
      console.log("[Voice] No parsed command, returning");
      return;
    }

    await executeCommand(parsedCommand);
  };

  // Cancel action
  const handleCancel = async () => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };
    const currentLang = getCookie('language') || localStorage.getItem('language') || 'en';
    const cancelMessage = currentLang === 'fr' ? "D'accord, annulé." : "Okay, cancelled.";

    await speakText(cancelMessage);
    setState("idle");
    setTimeout(() => {
      setIsOpen(false);
      setTranscript("");
      setParsedCommand(null);
    }, 1500);
  };

  // Handle dialog close with cleanup
  const handleDialogClose = (open: boolean) => {
    isDialogOpenRef.current = open;

    if (!open) {
      stopEverything();
      setTranscript("");
      setParsedCommand(null);
      setPendingProductsQueue([]);
      setProductPrice(null);
    }
    setIsOpen(open);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, [stopEverything]);

  // Sync isDialogOpenRef with isOpen state
  useEffect(() => {
    isDialogOpenRef.current = isOpen;
  }, [isOpen]);

  // Auto-start recording when dialog opens
  useEffect(() => {
    if (isOpen && state === "idle") {
      // Small delay before starting recording
      const timer = setTimeout(() => {
        console.log("[Voice] Auto-starting recording after dialog open");
        startRecording();
      }, 800); // 800ms delay for smooth UX

      return () => clearTimeout(timer);
    }
  }, [isOpen, state, startRecording]);

  // Wake word detection using browser's SpeechRecognition API
  useEffect(() => {
    // Only enable if user has enabled wake word detection
    if (!enableWakeWord) {
      console.log("[WakeWord] Wake word detection is disabled");
      return;
    }

    // Prevent multiple instances
    if (wakeWordInitializedRef.current) {
      console.log("[WakeWord] Already initialized, skipping");
      return;
    }

    // Check if browser supports SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log("[WakeWord] SpeechRecognition not supported in this browser");
      return;
    }

    wakeWordInitializedRef.current = true;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'fr-FR'; // Default to French since "cocorico" is French

    let isRunning = false;

    recognition.onstart = () => {
      isRunning = true;
      console.log("[WakeWord] Recognition started");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      console.log("[WakeWord] Heard:", transcript);

      // Check if "cocorico" is in the transcript
      if (transcript.includes('cocorico')) {
        console.log("[WakeWord] Wake word detected! Opening voice assistant");
        setIsOpen(true);
        toast.success("Cocorico! Opening voice assistant...");
      }
    };

    recognition.onerror = (event: any) => {
      console.log("[WakeWord] Recognition error:", event.error);
      isRunning = false;

      // Don't restart on permission or aborted errors
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'aborted') {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.log("[WakeWord] Permission denied, stopping wake word detection");
          setIsWakeWordListening(false);
        }
        return;
      }
    };

    recognition.onend = () => {
      console.log("[WakeWord] Recognition ended, should listen:", shouldListenForWakeWordRef.current);
      isRunning = false;

      // Only restart if we should be listening (dialog is closed)
      if (shouldListenForWakeWordRef.current && wakeWordRecognitionRef.current && isWakeWordListening) {
        setTimeout(() => {
          // Double check we're not already running and should still listen
          if (!isRunning && shouldListenForWakeWordRef.current && wakeWordRecognitionRef.current && isWakeWordListening) {
            try {
              recognition.start();
              console.log("[WakeWord] Auto-restarted");
            } catch (e) {
              console.log("[WakeWord] Failed to restart:", e);
            }
          }
        }, 300);
      }
    };

    // Start wake word detection
    try {
      recognition.start();
      wakeWordRecognitionRef.current = recognition;
      setIsWakeWordListening(true);
      console.log("[WakeWord] Wake word detection initialized");
    } catch (error) {
      console.error("[WakeWord] Failed to start:", error);
      wakeWordInitializedRef.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (wakeWordRecognitionRef.current) {
        isRunning = false;
        try {
          wakeWordRecognitionRef.current.abort();
        } catch (e) {
          console.log("[WakeWord] Error stopping on cleanup:", e);
        }
        wakeWordRecognitionRef.current = null;
        setIsWakeWordListening(false);
        wakeWordInitializedRef.current = false;
        console.log("[WakeWord] Wake word detection stopped");
      }
    };
  }, [isWakeWordListening, enableWakeWord]);

  // Pause wake word detection when dialog is open, resume when closed
  useEffect(() => {
    const recognition = wakeWordRecognitionRef.current;
    if (!recognition) return;

    if (isOpen) {
      // Dialog is open - stop wake word detection completely
      console.log("[WakeWord] Dialog opened, stopping wake word detection");
      shouldListenForWakeWordRef.current = false;
      try {
        recognition.abort();
      } catch (e) {
        console.log("[WakeWord] Error aborting:", e);
      }
    } else {
      // Dialog is closed - resume wake word detection
      console.log("[WakeWord] Dialog closed, starting wake word detection");
      shouldListenForWakeWordRef.current = true;
      try {
        recognition.start();
      } catch (e) {
        // Already running is fine
        const error = e as Error;
        if (!error.message?.includes('already started')) {
          console.log("[WakeWord] Error starting:", e);
        }
      }
    }
  }, [isOpen]);

  const getStateDisplay = () => {
    switch (state) {
      case "recording":
        return { text: "Listening...", icon: Mic, color: "text-red-500" };
      case "transcribing":
        return { text: "Transcribing...", icon: Loader2, color: "text-blue-500" };
      case "parsing":
        return { text: "Understanding...", icon: Loader2, color: "text-purple-500" };
      case "speaking":
        return { text: "Speaking...", icon: Volume2, color: "text-green-500" };
      case "confirming":
        return { text: "Waiting for confirmation", icon: CheckCircle, color: "text-yellow-500" };
      case "executing":
        return { text: "Executing...", icon: Loader2, color: "text-green-500" };
      case "asking_price":
        return { text: "Waiting for price", icon: CheckCircle, color: "text-blue-500" };
      default:
        return { text: "Ready", icon: Mic, color: "text-gray-500" };
    }
  };

  const stateDisplay = getStateDisplay();
  const StateIcon = stateDisplay.icon;

  return (
    <>
      {/* Floating Voice Button with gradient animation - Brand Colors */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 group">
        {/* Wake word toggle - only visible on hover and when dialog is closed */}
        {!isOpen && (
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1d3557]/90 backdrop-blur-lg border border-white/10 shadow-lg">
              {isWakeWordListening && (
                <div className="w-1.5 h-1.5 bg-[#e63946] rounded-full animate-pulse shadow-sm shadow-[#e63946]/50" />
              )}
              <span className="text-xs font-medium text-white/90 whitespace-nowrap">
                Say "Cocorico"
              </span>
              <button
                onClick={toggleWakeWord}
                className={cn(
                  "relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-300",
                  enableWakeWord ? "bg-[#457b9d]" : "bg-white/20"
                )}
                aria-label="Toggle wake word detection"
              >
                <span
                  className={cn(
                    "inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-300",
                    enableWakeWord ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
            {/* Invisible bridge to prevent gap */}
            <div className="absolute top-full left-0 right-0 h-2" />
          </div>
        )}

        {/* Animated gradient ring when recording */}
        {state === "recording" && (
          <div className="absolute inset-0 rounded-full animate-ping">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-[#e63946] via-[#457b9d] to-[#1d3557] opacity-60" />
          </div>
        )}
        <Button
          size="lg"
          className={cn(
            "relative rounded-full w-14 h-14 sm:w-16 sm:h-16 shadow-lg transition-all duration-500 backdrop-blur-sm",
            state === "recording"
              ? "bg-gradient-to-r from-[#e63946]/90 via-[#457b9d]/90 to-[#1d3557]/90 hover:shadow-2xl hover:scale-110 shadow-[#e63946]/40 border border-white/20"
              : state === "speaking"
              ? "bg-gradient-to-r from-[#457b9d]/90 via-[#a8dadc]/90 to-[#1d3557]/90 animate-pulse shadow-[#457b9d]/40 border border-white/20"
              : "bg-gradient-to-r from-[#1d3557]/90 via-[#457b9d]/90 to-[#1d3557]/90 hover:shadow-xl hover:scale-105 shadow-[#1d3557]/30 border border-white/20"
          )}
          onClick={() => setIsOpen(true)}
        >
          <Mic className="h-5 w-5 sm:h-6 sm:w-6 relative z-10 text-white" />
        </Button>
      </div>

      {/* Voice Assistant Dialog - Fullscreen with glass effect */}
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent
          showCloseButton={false}
          className="!fixed !inset-0 !w-screen !h-screen !max-w-none !p-0 !border-0 !translate-x-0 !translate-y-0 !top-0 !left-0 bg-gradient-to-br from-[#1d3557]/30 via-[#457b9d]/25 to-[#1d3557]/30 backdrop-blur-lg overflow-hidden !duration-500"
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1d3557]/15 via-transparent to-[#457b9d]/15" />

          {/* Floating gradient orbs - subtle */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-[#457b9d] rounded-full mix-blend-soft-light filter blur-3xl opacity-10 animate-blob" />
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-[#a8dadc] rounded-full mix-blend-soft-light filter blur-3xl opacity-10 animate-blob animation-delay-2000" />

          {/* Custom close button */}
          <button
            onClick={() => handleDialogClose(false)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all duration-300 hover:scale-110"
            aria-label="Close"
          >
            <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-[#f1faee]" />
          </button>

          {/* Content container */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
            <DialogHeader className="mb-6 sm:mb-8 text-center">
              <DialogTitle className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-[#f1faee] to-[#a8dadc] bg-clip-text text-transparent mb-2 sm:mb-4 animate-in slide-in-from-top duration-700">
                Voice Assistant
              </DialogTitle>
              <DialogDescription className="text-base sm:text-lg md:text-xl text-[#f1faee]/90 animate-in slide-in-from-top duration-700 delay-150">
                Speak naturally to add, remove, or check inventory
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6 w-full max-w-3xl">
              {/* Siri-like Waveform Animation */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-6 md:p-8 shadow-lg animate-in fade-in scale-in duration-700 delay-300">
                <SiriWaveform
                  isActive={state === "recording" || state === "speaking" || state === "transcribing"}
                  audioLevel={audioLevel}
                  state={state}
                />
                {/* State indicator overlay */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 transition-all duration-300">
                  <StateIcon className={cn(
                    "h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 transition-all duration-300",
                    state === "recording" ? "text-[#e63946]" :
                    state === "speaking" ? "text-[#a8dadc]" :
                    state === "transcribing" || state === "parsing" ? "text-[#457b9d]" :
                    state === "confirming" ? "text-[#f1faee]" :
                    "text-[#a8dadc]",
                    state === "transcribing" || state === "parsing" || state === "executing" ? "animate-spin" : ""
                  )} />
                  <span className={cn(
                    "text-lg sm:text-xl md:text-2xl font-semibold transition-all duration-300",
                    "text-[#f1faee]"
                  )}>
                    {stateDisplay.text}
                  </span>
                </div>
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-white/5 backdrop-blur-lg animate-in fade-in slide-in-from-top-2 duration-500 shadow-lg">
                  <p className="text-xs sm:text-sm text-[#a8dadc] mb-1 sm:mb-2 font-medium">You said:</p>
                  <p className="text-base sm:text-lg font-medium text-[#f1faee] break-words">{transcript}</p>
                </div>
              )}

              {/* Parsed command */}
              {parsedCommand && (
                <div className="border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-700 bg-white/5 backdrop-blur-lg shadow-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={cn(
                        "transition-all duration-300 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-1.5",
                        parsedCommand.action === "add" ? "bg-[#457b9d]/90 text-white" :
                        parsedCommand.action === "remove" ? "bg-[#e63946]/90 text-white" :
                        "bg-[#a8dadc]/90 text-[#1d3557]"
                      )}
                    >
                      {parsedCommand.action}
                    </Badge>
                    {parsedCommand.products.map((prod, idx) => (
                      <Badge
                        key={idx}
                        className="bg-white/10 text-[#f1faee] border border-white/20 transition-all duration-300 hover:scale-105 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-1.5 backdrop-blur-sm"
                      >
                        {prod.matchedProductName || prod.product} ({prod.quantity} {prod.unit})
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-[#f1faee]/90 leading-relaxed">{parsedCommand.confirmationMessage}</p>
                  {parsedCommand.confidence < 0.7 && (
                    <p className="text-xs sm:text-sm text-[#e63946] animate-pulse font-medium">
                      Low confidence match - please verify
                    </p>
                  )}
                </div>
              )}

              {/* Recording controls */}
              <div className="flex gap-2 sm:gap-3 w-full">
                {state === "idle" && (
                  <Button
                    onClick={startRecording}
                    className="flex-1 bg-gradient-to-r from-[#1d3557]/90 via-[#457b9d]/90 to-[#1d3557]/90 hover:from-[#1d3557] hover:via-[#457b9d] hover:to-[#1d3557] hover:shadow-xl hover:shadow-[#457b9d]/30 transition-all duration-500 hover:scale-105 text-white text-base sm:text-lg py-4 sm:py-6 rounded-xl sm:rounded-2xl border border-white/20 backdrop-blur-sm"
                    size="lg"
                  >
                    <Mic className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="hidden sm:inline">Start Speaking</span>
                    <span className="sm:hidden">Speak</span>
                  </Button>
                )}

                {state === "recording" && (
                  <Button
                    onClick={stopRecording}
                    className="flex-1 bg-[#e63946]/90 hover:bg-[#e63946] hover:shadow-xl hover:shadow-[#e63946]/50 animate-pulse transition-all duration-500 text-white text-base sm:text-lg py-4 sm:py-6 rounded-xl sm:rounded-2xl border border-white/20 backdrop-blur-sm"
                    size="lg"
                  >
                    <MicOff className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                    Stop
                  </Button>
                )}

                {state === "confirming" && (
                  <>
                    <Button
                      onClick={handleConfirm}
                      className="flex-1 bg-[#457b9d]/90 hover:bg-[#457b9d] hover:shadow-xl hover:shadow-[#457b9d]/40 transition-all duration-500 hover:scale-105 text-white text-base sm:text-lg py-4 sm:py-6 rounded-xl sm:rounded-2xl border border-white/20 backdrop-blur-sm"
                      size="lg"
                    >
                      <CheckCircle className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                      Confirm
                    </Button>
                    <Button
                      onClick={handleCancel}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/20 backdrop-blur-sm transition-all duration-500 hover:scale-105 text-[#f1faee] text-base sm:text-lg py-4 sm:py-6 rounded-xl sm:rounded-2xl"
                      size="lg"
                    >
                      <XCircle className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                      Cancel
                    </Button>
                  </>
                )}

                {state === "asking_price" && (
                  <div className="flex-1 text-center text-[#f1faee] text-base sm:text-lg py-4">
                    Listening for price...
                  </div>
                )}

                {/* Emergency stop button - visible when not idle */}
                {state !== "idle" && (
                  <Button
                    onClick={() => {
                      stopEverything();
                      setTranscript("");
                      setParsedCommand(null);
                      toast.info("Stopped");
                    }}
                    className="bg-[#e63946]/10 hover:bg-[#e63946]/90 border border-[#e63946]/50 text-[#e63946] hover:text-white transition-all duration-500 h-12 w-12 sm:h-14 sm:w-14 rounded-full backdrop-blur-sm"
                    size="icon"
                    title="Stop everything"
                  >
                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
