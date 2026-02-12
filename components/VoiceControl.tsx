import React, { useState, useRef, useCallback } from 'react';
import { Mic, Loader2, Square, ShoppingCart, Search, Info } from 'lucide-react';
import { VoiceIntentType } from '../types';

interface VoiceControlProps {
  onAudioCapture: (base64: string, mimeType: string, intent: VoiceIntentType) => void;
  isProcessing: boolean;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ onAudioCapture, isProcessing }) => {
  const [recordingMode, setRecordingMode] = useState<VoiceIntentType | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      'audio/wav',
      'audio/aac'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = async (intent: VoiceIntentType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        alert("Trình duyệt của bạn không hỗ trợ ghi âm.");
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the actual mime type from the recorder or the one we selected
        const finalMimeType = mediaRecorder.mimeType || mimeType;
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Extract base64 part
          const base64Data = base64String.split(',')[1];
          onAudioCapture(base64Data, finalMimeType, intent);
        };

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setRecordingMode(null);
      };

      mediaRecorder.start();
      setRecordingMode(intent);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingMode) {
      mediaRecorderRef.current.stop();
    }
  }, [recordingMode]);

  const handleInteraction = (intent: VoiceIntentType) => {
    if (isProcessing) return;

    if (recordingMode === intent) {
      stopRecording();
    } else if (!recordingMode) {
      startRecording(intent);
    }
    // If recording another mode, ignore or stop first (currently simplified to ignore)
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">

      {/* Recording Indicator */}
      {recordingMode && (
        <div className={`text-white text-xs py-1 px-3 rounded-full animate-pulse shadow-lg ${recordingMode === VoiceIntentType.ADD_TO_CART ? 'bg-green-600' : 'bg-blue-600'}`}>
          {recordingMode === VoiceIntentType.ADD_TO_CART ? 'Đang nghe: Mua hàng...' : 'Đang nghe: Hỏi giá...'}
        </div>
      )}

      <div className="flex gap-4">
        {/* Button 1: Check Price */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => handleInteraction(VoiceIntentType.CHECK_PRICE)}
            disabled={isProcessing || (recordingMode !== null && recordingMode !== VoiceIntentType.CHECK_PRICE)}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 focus:outline-none 
              ${isProcessing || (recordingMode !== null && recordingMode !== VoiceIntentType.CHECK_PRICE)
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                : recordingMode === VoiceIntentType.CHECK_PRICE
                  ? 'bg-blue-600 text-white animate-pulse ring-4 ring-blue-300'
                  : 'bg-white text-blue-600 border-2 border-blue-100 hover:border-blue-300'
              }`}
          >
            {recordingMode === VoiceIntentType.CHECK_PRICE ? (
              <Square size={20} fill="currentColor" />
            ) : (
              <Search size={24} />
            )}
          </button>
          {!recordingMode && <span className="text-[10px] font-bold text-gray-500 bg-white/90 px-1 rounded">Hỏi giá</span>}
        </div>

        {/* Button 2: Add to Cart */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => handleInteraction(VoiceIntentType.ADD_TO_CART)}
            disabled={isProcessing || (recordingMode !== null && recordingMode !== VoiceIntentType.ADD_TO_CART)}
            className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 focus:outline-none
              ${isProcessing
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : recordingMode === VoiceIntentType.ADD_TO_CART
                  ? 'bg-green-600 text-white animate-pulse ring-4 ring-green-300'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
          >
            {isProcessing ? (
              <Loader2 size={28} className="animate-spin" />
            ) : recordingMode === VoiceIntentType.ADD_TO_CART ? (
              <Square size={24} fill="currentColor" />
            ) : (
              <ShoppingCart size={28} />
            )}
          </button>
          {!recordingMode && <span className="text-[10px] font-bold text-gray-500 bg-white/90 px-1 rounded">Mua hàng</span>}
        </div>
      </div>
    </div>
  );
};