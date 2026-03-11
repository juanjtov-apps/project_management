/**
 * useVoiceInput — Web Speech API hook for voice input.
 * Falls back to a simulated typing demo when Speech API is unavailable.
 */

import { useState, useCallback, useRef, useEffect } from "react";

interface UseVoiceInputReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  isInterim: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

// Web Speech API types (not in all TS lib targets)
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechAPI(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isInterim, setIsInterim] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const simulationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SpeechAPI = getSpeechAPI();

  const isSupported = Boolean(SpeechAPI);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (simulationRef.current) clearTimeout(simulationRef.current);
    };
  }, []);

  const start = useCallback(() => {
    setTranscript("");
    setIsInterim(true);

    if (SpeechAPI) {
      const recognition = new SpeechAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          setIsInterim(false);
        } else {
          setTranscript(interimTranscript);
          setIsInterim(true);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setIsInterim(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } else {
      // Fallback: simulate voice input for demo/unsupported browsers
      simulateVoice();
    }
  }, [SpeechAPI]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (simulationRef.current) {
      clearTimeout(simulationRef.current);
      simulationRef.current = null;
    }
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript("");
    setIsInterim(false);
  }, [stop]);

  const simulateVoice = useCallback(() => {
    const demoPhrase = "Show me overdue tasks for this week";
    setIsListening(true);
    setIsInterim(true);

    let idx = 0;
    const typeChar = () => {
      if (idx < demoPhrase.length) {
        idx++;
        setTranscript(demoPhrase.slice(0, idx));
        const delay = 36 + Math.random() * 20;
        simulationRef.current = setTimeout(typeChar, delay);
      } else {
        setIsInterim(false);
        setIsListening(false);
      }
    };

    // Start after a short "listening" pause
    simulationRef.current = setTimeout(typeChar, 800);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    isInterim,
    start,
    stop,
    reset,
  };
}
