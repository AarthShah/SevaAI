import React, { useState, useRef } from 'react';
import { Mic, Square, Volume2, AlertCircle } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';

export const AudioRecorder = ({ onTranscriptionReceived, onAudioUploaded }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  const startRecording = async () => {
    setErrorMsg(null);
    setTranscript('');
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    // 1. Initialize Web Speech API if supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        onTranscriptionReceived(currentTranscript);
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition warning:', e);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
      }
    }

    // 2. Initialize MediaStream Audio Recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const uploadRes = await complaintApi.uploadAudio(audioBlob);
          if (onAudioUploaded) {
            onAudioUploaded(uploadRes.file_url);
          }
        } catch {
          // Ignore upload error if offline
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg('Microphone access denied or unavailable. You can also use one of the quick test voice prompts.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsRecording(false);
  };

  // Sample citizen voice statements for fast hackathon demo evaluation
  const setSampleVoice = (sampleText) => {
    setTranscript(sampleText);
    onTranscriptionReceived(sampleText);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Voice Input (Speech-to-Text)</h4>
            <p className="text-[11px] text-slate-500">Speak naturally in English or your native language</p>
          </div>
        </div>

        <div>
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop ({recordingSeconds}s)
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Mic className="w-3.5 h-3.5" />
              Record Voice
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded flex items-center gap-1.5 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {transcript && (
        <div className="mt-3 p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">Transcribed Speech:</span>
          "{transcript}"
        </div>
      )}

      {/* Demo sample voice triggers */}
      <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-slate-500 font-semibold">Demo Voice Presets:</span>
        <button
          type="button"
          onClick={() => setSampleVoice("There is a large pothole near the main road college gate causing bike skids.")}
          className="text-[10px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition"
        >
          🎙️ "Pothole on main road"
        </button>
        <button
          type="button"
          onClick={() => setSampleVoice("Drinking water pipe burst near market circle, potable water leaking continuously.")}
          className="text-[10px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition"
        >
          🎙️ "Water pipe burst"
        </button>
        <button
          type="button"
          onClick={() => setSampleVoice("Streetlight pole has exposed wire sparking near children park, fatal electrocution danger!")}
          className="text-[10px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition"
        >
          🎙️ "Exposed wire sparking"
        </button>
      </div>
    </div>
  );
};
