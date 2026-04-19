import { useState, useRef, useEffect } from 'react';

export const useSpeechRecognition = () => {
  const [activeField, setActiveField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const isMountedRef = useRef(true);

  // Cleanup global au démontage : arrête la reconnaissance et bloque les setState
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const rec = recognitionRef.current;
      if (rec) {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        try { rec.stop(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  const safeSetActiveField = (v: string | null) => {
    if (isMountedRef.current) setActiveField(v);
  };

  const toggleListening = (fieldName: string, onResult: (text: string) => void) => {
    // Clic sur le champ actif → arrêt
    if (activeField === fieldName) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      safeSetActiveField(null);
      return;
    }

    // Arrêt propre de l'enregistrement précédent avant d'en démarrer un nouveau
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    safeSetActiveField(fieldName);
    finalTranscriptRef.current = '';

    // @ts-ignore
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      safeSetActiveField(null);
      alert("Dictée vocale non supportée. Utilisez Chrome ou Edge.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onend = () => {
      recognitionRef.current = null;
      safeSetActiveField(null);
    };

    recognition.onerror = () => {
      recognitionRef.current = null;
      safeSetActiveField(null);
    };

    recognition.onresult = (event: any) => {
      if (!isMountedRef.current) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      // Envoie le texte cumulé (final + interim en cours) pour affichage temps réel
      onResult(finalTranscriptRef.current + interim);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('[SpeechRecognition] start failed:', e);
      recognitionRef.current = null;
      safeSetActiveField(null);
    }
  };

  return { activeField, toggleListening };
};
