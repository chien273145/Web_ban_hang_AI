import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

interface SuccessModalProps {
  message?: string;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ message = "Thanh toán thành công!", onClose }) => {
  useEffect(() => {
    // Tự động đóng sau 2 giây
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center animate-[bounce_0.5s_ease-out]">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={40} className="text-green-600" strokeWidth={3} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{message}</h2>
        <p className="text-gray-500 text-sm">Đang quay về trang chủ...</p>
      </div>
    </div>
  );
};