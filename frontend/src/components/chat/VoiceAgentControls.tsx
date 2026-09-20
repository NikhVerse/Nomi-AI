import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, VolumeX } from 'lucide-react';

interface VoiceAgentProps {
  onTranscript: (text: string) => void;
  autoVoiceEnabled: boolean;
  onToggleAutoVoice: () => void;
}

export const VoiceAgentControls: React.FC<VoiceAgentProps> = ({
  onTranscript,
  autoVoiceEnabled,
  onToggleAutoVoice,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check speech recognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          onTranscript(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Could not initialize SpeechRecognition', e);
      setSpeechSupported(false);
    }
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition', err);
      }
    }
  };

  if (!speechSupported) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1.5">
      {/* Auto Voice Mode Toggle */}
      <button
        type="button"
        id="toggle-voice-mode-btn"
        onClick={onToggleAutoVoice}
        className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
          autoVoiceEnabled
            ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-500/20 shadow-2xs'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
        title={autoVoiceEnabled ? 'Voice Agent active (Persona speaks responses aloud)' : 'Voice Agent muted'}
      >
        {autoVoiceEnabled ? (
          <>
            <Volume2 className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span className="text-[11px]">Voice On</span>
          </>
        ) : (
          <>
            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px]">Voice Off</span>
          </>
        )}
      </button>

      {/* Speech-to-Text Microphone Button */}
      <button
        type="button"
        id="mic-listen-btn"
        onClick={toggleListening}
        className={`p-2 rounded-xl transition-all relative ${
          isListening
            ? 'bg-rose-500 text-white shadow-md ring-4 ring-rose-300/50 animate-bounce'
            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
        }`}
        title={isListening ? 'Listening... click to stop' : 'Tap to speak with Voice Agent'}
      >
        {isListening ? (
          <Mic className="w-4 h-4 text-white" />
        ) : (
          <Mic className="w-4 h-4 text-slate-600 hover:text-indigo-600" />
        )}
      </button>
    </div>
  );
};

export const speakPersonaText = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    // Clean markdown asterisks and code blocks for speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 1500); // safety length limit

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick best natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Speech synthesis error', e);
  }
};

export const stopPersonaSpeech = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};
