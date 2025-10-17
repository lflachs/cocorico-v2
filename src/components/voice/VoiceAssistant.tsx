"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mic, MicOff, Loader2, Volume2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";

type ConversationState = "idle" | "recording" | "transcribing" | "parsing" | "confirming" | "executing" | "speaking";

type ParsedCommand = {
  action: "add" | "remove" | "check" | "list" | "unknown";
  product: string;
  quantity: number;
  matchedProductId: string | null;
  matchedProductName: string | null;
  currentQuantity: number | null;
  unit: string | null;
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Start recording with voice activity detection
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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
        if (mediaRecorder.state !== "recording") return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

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

        requestAnimationFrame(checkAudioLevel);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        console.log("[Voice] Recording stopped, blob size:", audioBlob.size, "bytes");

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
          stream.getTracks().forEach((track) => track.stop());
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
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setState("recording");
      toast.info("Listening... Speak your command");

      // Start monitoring audio levels
      checkAudioLevel();
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to access microphone");
      setState("idle");
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setState("transcribing");
    }
  }, []);

  // Process audio: transcribe → parse → speak
  // Remove useCallback to avoid stale closure - we need fresh language value
  const processAudio = async (audioBlob: Blob) => {
    try {
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

      if (!transcribeRes.ok) {
        throw new Error("Transcription failed");
      }

      const { text } = await transcribeRes.json();
      setTranscript(text);
      console.log("[Voice] Transcript:", text);

      // Step 2: Parse command with GPT-4o
      setState("parsing");
      const parseRes = await fetch("/api/voice/parse-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: currentLang }),
      });

      if (!parseRes.ok) {
        throw new Error("Command parsing failed");
      }

      const { command } = await parseRes.json();
      setParsedCommand(command);
      console.log("[Voice] Parsed command:", command);

      // Step 3: Speak confirmation
      if (command.confirmationMessage) {
        await speakText(command.confirmationMessage);
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
      toast.error("Failed to process command");
      setState("idle");
    }
  };

  // Listen for confirmation (yes/no) via voice
  const listenForConfirmationWithCommand = async (currentCommand: ParsedCommand) => {
    console.log("[Voice] listenForConfirmationWithCommand called with:", currentCommand);

    try {
      // Start recording for confirmation
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      // Set up audio analysis for voice activity detection
      const audioContext = new AudioContext();
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
        if (mediaRecorder.state !== "recording") return;

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

        requestAnimationFrame(checkAudioLevel);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });

        // Clean up
        if (silenceTimeout) clearTimeout(silenceTimeout);
        audioContext.close();

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

        if (transcribeRes.ok) {
          const { text } = await transcribeRes.json();
          console.log("[Voice] Confirmation response:", text);

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
            // Try again with the same command
            await listenForConfirmationWithCommand(currentCommand);
          }
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setState("recording");

      // Start monitoring audio levels
      checkAudioLevel();

      // Fallback: Auto-stop after 5 seconds max
      setTimeout(() => {
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

      // Play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          setIsPlayingAudio(false);
          resolve();
        };
        audio.onerror = reject;
        audio.play();
      });

      URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error("TTS error:", error);
      setIsPlayingAudio(false);
    }
  };

  // Execute command (extracted from handleConfirm to avoid state closure issues)
  const executeCommand = async (command: ParsedCommand) => {
    console.log("[Voice] executeCommand started, action:", command.action);

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

      // Execute the action
      if (command.action === "add") {
        if (command.matchedProductId) {
          console.log("[Voice] Updating existing product:", command.matchedProductId);
          // Update existing product
          const newQuantity = (command.currentQuantity || 0) + command.quantity;
          const response = await fetch(`/api/products/${command.matchedProductId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: newQuantity }),
          });

          if (!response.ok) {
            throw new Error(`Failed to update product: ${response.status}`);
          }

          console.log("[Voice] Product updated successfully");

          const successMessage = currentLang === 'fr'
            ? `Terminé! Vous avez maintenant ${newQuantity} ${command.unit || ""} de ${command.matchedProductName}.`
            : `Done! You now have ${newQuantity} ${command.unit || ""} of ${command.matchedProductName}.`;

          console.log("[Voice] Speaking success message:", successMessage);
          await speakText(successMessage);
          toast.success(successMessage);

          // Trigger inventory refresh
          onInventoryUpdate?.();
        } else {
          console.log("[Voice] Creating new product:", command.product);
          // Create new product
          const response = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: command.product,
              quantity: command.quantity,
              unit: command.unit || "PC",
              trackable: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to create product: ${response.status} - ${JSON.stringify(errorData)}`);
          }

          console.log("[Voice] Product created successfully");

          const successMessage = currentLang === 'fr'
            ? `Nouveau produit ${command.product} créé avec une quantité de ${command.quantity}.`
            : `Created new product ${command.product} with quantity ${command.quantity}.`;

          console.log("[Voice] Speaking success message:", successMessage);
          await speakText(successMessage);
          toast.success(successMessage);

          // Trigger inventory refresh
          onInventoryUpdate?.();
        }
      } else if (command.action === "remove") {
        if (command.matchedProductId) {
          console.log("[Voice] Removing quantity from product:", command.matchedProductId);
          const newQuantity = Math.max(0, (command.currentQuantity || 0) - command.quantity);
          const response = await fetch(`/api/products/${command.matchedProductId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: newQuantity }),
          });

          if (!response.ok) {
            throw new Error(`Failed to update product: ${response.status}`);
          }

          console.log("[Voice] Product quantity reduced successfully");

          const successMessage = currentLang === 'fr'
            ? `Terminé! Vous avez maintenant ${newQuantity} ${command.unit || ""} de ${command.matchedProductName}.`
            : `Done! You now have ${newQuantity} ${command.unit || ""} of ${command.matchedProductName}.`;

          console.log("[Voice] Speaking success message:", successMessage);
          await speakText(successMessage);
          toast.success(successMessage);

          // Trigger inventory refresh
          onInventoryUpdate?.();
        }
      }

      // Reset
      console.log("[Voice] Action completed, resetting state");
      setState("idle");
      setTimeout(() => {
        setIsOpen(false);
        setTranscript("");
        setParsedCommand(null);
      }, 2000);
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
      default:
        return { text: "Ready", icon: Mic, color: "text-gray-500" };
    }
  };

  const stateDisplay = getStateDisplay();
  const StateIcon = stateDisplay.icon;

  return (
    <>
      {/* Floating Voice Button */}
      <Button
        size="lg"
        className={cn(
          "fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-lg z-50",
          state === "recording" && "bg-red-500 hover:bg-red-600 animate-pulse"
        )}
        onClick={() => setIsOpen(true)}
      >
        <Mic className="h-6 w-6" />
      </Button>

      {/* Voice Assistant Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Voice Assistant</DialogTitle>
            <DialogDescription>
              Speak naturally to add, remove, or check inventory
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* State indicator */}
            <div className="flex items-center justify-center gap-2 py-4">
              <StateIcon className={cn("h-8 w-8", stateDisplay.color, state === "transcribing" || state === "parsing" || state === "executing" ? "animate-spin" : "")} />
              <span className={cn("text-lg font-medium", stateDisplay.color)}>
                {stateDisplay.text}
              </span>
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">You said:</p>
                <p className="font-medium">{transcript}</p>
              </div>
            )}

            {/* Parsed command */}
            {parsedCommand && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={parsedCommand.action === "add" ? "default" : parsedCommand.action === "remove" ? "destructive" : "secondary"}>
                    {parsedCommand.action}
                  </Badge>
                  {parsedCommand.matchedProductName && (
                    <Badge variant="outline">{parsedCommand.matchedProductName}</Badge>
                  )}
                </div>
                <p className="text-sm">{parsedCommand.confirmationMessage}</p>
                {parsedCommand.confidence < 0.7 && (
                  <p className="text-xs text-yellow-600">Low confidence match - please verify</p>
                )}
              </div>
            )}

            {/* Recording controls */}
            <div className="flex gap-2">
              {state === "idle" && (
                <Button onClick={startRecording} className="flex-1" size="lg">
                  <Mic className="mr-2 h-5 w-5" />
                  Start Speaking
                </Button>
              )}

              {state === "recording" && (
                <Button onClick={stopRecording} variant="destructive" className="flex-1" size="lg">
                  <MicOff className="mr-2 h-5 w-5" />
                  Stop
                </Button>
              )}

              {state === "confirming" && (
                <>
                  <Button onClick={handleConfirm} className="flex-1" size="lg">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Confirm
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="flex-1" size="lg">
                    <XCircle className="mr-2 h-5 w-5" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
