"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type SpeechRecognitionResultEvent = Event & {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const subscribeToBrowserCapability = () => () => {};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function VoiceInputButton({
  fieldName,
  onTranscript,
  disabled = false,
}: {
  fieldName: string;
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const supported = useSyncExternalStore(
    subscribeToBrowserCapability,
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      const transcripts: string[] = [];
      let hasFinalResult = false;
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;
        transcripts.push(result[0].transcript);
        hasFinalResult ||= result.isFinal;
      }
      const transcript = transcripts.join(" ").trim();
      setStatus(transcript ? `Heard: ${transcript}` : "Listening…");
      if (hasFinalResult && transcript) onTranscript(transcript);
    };
    recognition.onerror = (event) => {
      setListening(false);
      setStatus(speechErrorMessage(event.error));
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      setListening(true);
      setStatus(`Listening for ${fieldName}…`);
    } catch {
      setStatus("Voice input could not start. Try again.");
    }
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={listening}
        aria-label={
          listening
            ? `Stop voice input for ${fieldName}`
            : `Enter ${fieldName} with your voice`
        }
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:border-accent disabled:opacity-50"
      >
        <span aria-hidden="true">🎙</span>
        {listening ? "Stop" : "Speak"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </span>
  );
}

function speechErrorMessage(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone access was blocked. Allow it in browser settings to use voice input.";
  }
  if (error === "no-speech") {
    return "No speech was heard. Try again and speak after the microphone starts.";
  }
  if (error === "audio-capture") {
    return "No microphone is available.";
  }
  return "Voice input stopped. Try again.";
}
