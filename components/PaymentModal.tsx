import React, { useState } from 'react';
import { PaymentMethod } from '../types';
import { Banknote, CreditCard, UserMinus, X, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { FORMAT_CURRENCY, BANK_CONFIG } from '../constants';

interface PaymentModalProps {
  total: number;
  onConfirm: (method: PaymentMethod) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ total, onConfirm, onClose }) => {
  const [step, setStep] = useState<'method' | 'qr'>('method');

  // Tạo link VietQR động
  // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<NAME>
  const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.BANK_ID}-${BANK_CONFIG.ACCOUNT_NO}-${BANK_CONFIG.TEMPLATE}.png?amount=${total}&addInfo=Thanh toan don hang&accountName=${encodeURIComponent(BANK_CONFIG.ACCOUNT_NAME)}`;

  const handleSelectMethod = (method: PaymentMethod) => {
    if (method === 'transfer') {
      setStep('qr');
    } else {
      onConfirm(method);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        
        {/* HEADER */}
        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            {step === 'qr' && (
              <button onClick={() => setStep('method')} className="text-gray-500 hover:text-indigo-600 transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-800">
              {step === 'qr' ? 'Quét mã thanh toán' : 'Chọn hình thức thanh toán'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm">Tổng tiền cần thanh toán</p>
            <p className="text-3xl font-bold text-indigo-600">{FORMAT_CURRENCY(total)}</p>
          </div>

          {step === 'method' ? (
            /* --- PAYMENT METHOD SELECTION --- */
            <div className="space-y-3">
              <button
                onClick={() => handleSelectMethod('cash')}
                className="w-full flex items-center p-4 border-2 border-green-100 bg-green-50 rounded-xl hover:bg-green-100 hover:border-green-300 transition-all group"
              >
                <div className="bg-green-200 p-3 rounded-full mr-4 group-hover:bg-green-300">
                  <Banknote className="text-green-700" size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-800">Tiền mặt</h3>
                  <p className="text-xs text-gray-500">Thanh toán trực tiếp</p>
                </div>
              </button>

              <button
                onClick={() => handleSelectMethod('transfer')}
                className="w-full flex items-center p-4 border-2 border-blue-100 bg-blue-50 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all group"
              >
                <div className="bg-blue-200 p-3 rounded-full mr-4 group-hover:bg-blue-300">
                  <CreditCard className="text-blue-700" size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-800">Chuyển khoản</h3>
                  <p className="text-xs text-gray-500">QR Code / Ngân hàng</p>
                </div>
              </button>

              <button
                onClick={() => handleSelectMethod('debt')}
                className="w-full flex items-center p-4 border-2 border-orange-100 bg-orange-50 rounded-xl hover:bg-orange-100 hover:border-orange-300 transition-all group"
              >
                <div className="bg-orange-200 p-3 rounded-full mr-4 group-hover:bg-orange-300">
                  <UserMinus className="text-orange-700" size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-800">Ghi nợ</h3>
                  <p className="text-xs text-gray-500">Khách quen / Nợ sau</p>
                </div>
              </button>
            </div>
          ) : (
            /* --- QR CODE VIEW --- */
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white p-2 rounded-lg border shadow-sm mb-4 w-full">
                <img 
                  src={qrUrl} 
                  alt="VietQR Payment" 
                  className="w-full h-auto rounded object-contain"
                  loading="lazy"
                />
              </div>
              
              <div className="w-full space-y-2">
                <div className="text-xs text-center text-gray-400 mb-2">
                  Vui lòng chờ khách hàng thanh toán xong
                </div>
                <button
                  onClick={() => onConfirm('transfer')}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} />
                  Xác nhận đã nhận tiền
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};