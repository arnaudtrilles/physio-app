import { useState, useRef } from 'react';

export const useSpeechRecognition = () => {
  const [activeField, setActiveField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  const toggleListening = (fieldName: string, onResult: (text: string) => void) => {
    // Clic sur le champ actif → arrêt
    if (activeField === fieldName) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setActiveField(null);
      return;
    }

    // Arrêt propre de l'enregistrement précédent avant d'en démarrer un nouveau
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setActiveField(fieldName);
    finalTranscriptRef.current = '';

    // @ts-ignore
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setActiveField(null);
      alert("Dictée vocale non supportée. Utilisez Chrome ou Edge.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onend = () => {
      recognitionRef.current = null;
      setActiveField(null);
    };

    recognition.onerror = () => {
      recognitionRef.current = null;
      setActiveField(null);
    };

    recognition.onresult = (event: any) => {
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
    recognition.start();
  };

  return { activeField, toggleListening };
};
