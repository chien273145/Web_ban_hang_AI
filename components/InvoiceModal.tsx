import React from 'react';
import { Invoice } from '../types';
import { FORMAT_CURRENCY } from '../constants';
import { X, Printer, CheckCircle2 } from 'lucide-react';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Tiền mặt';
      case 'transfer': return 'Chuyển khoản';
      case 'debt': return 'Ghi nợ';
      default: return 'Khác';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - No Print */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 no-print">
          <h2 className="text-lg font-bold text-gray-800">Chi Tiết Hóa Đơn</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Printable Area - Designed for 80mm Thermal Printer */}
        <div className="p-4 overflow-y-auto print-area bg-white" id="invoice-content">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold uppercase tracking-wider text-black">SmartShop</h1>
            <p className="text-xs text-black">Văn Miếu Xích Đằng, TP. Hưng Yên</p>
            <p className="text-xs text-black">Hotline: 0334994329</p>
          </div>

          <div className="mb-4 text-xs text-black font-mono border-b border-black border-dashed pb-2">
            <div className="flex justify-between">
              <span>HĐ: {invoice.id}</span>
              <span>{new Date(invoice.date).toLocaleDateString('vi-VN')} {new Date(invoice.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Hình thức:</span>
              <span className="font-bold">{getPaymentMethodName(invoice.paymentMethod)}</span>
            </div>
          </div>

          <div className="mb-4">
            {/* Table Header for Print */}
            <div className="flex text-xs font-bold border-b border-black text-black pb-1 mb-2">
              <span className="flex-1">Tên SP</span>
              <span className="w-8 text-center">SL</span>
              <span className="w-16 text-right">T.Tiền</span>
            </div>

            {/* Items List */}
            {invoice.items.map((item, index) => (
              <div key={index} className="mb-2 text-xs text-black">
                <div className="font-medium">{item.name}</div>
                <div className="flex justify-between items-center text-gray-600 print:text-black">
                  <span className="flex-1 italic">{FORMAT_CURRENCY(item.price)}</span>
                  <span className="w-8 text-center">x{item.quantity}</span>
                  <span className="w-16 text-right font-medium">{FORMAT_CURRENCY(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-black pt-2 mb-6">
            <div className="flex justify-between items-center text-lg font-bold text-black">
              <span>TỔNG CỘNG:</span>
              <span>{FORMAT_CURRENCY(invoice.total)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-black italic">
            <p>-- Cảm ơn quý khách --</p>
            <p>Hẹn gặp lại!</p>
          </div>
        </div>

        {/* Footer Actions - No Print */}
        <div className="p-4 border-t bg-gray-50 flex justify-between gap-2 no-print">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Đóng
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors shadow-sm font-medium"
          >
            <Printer size={18} />
            In Hóa Đơn
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          
          body {
            background: white;
            color: black;
          }

          /* Hide everything by default using visibility, NOT display or height */
          body * {
            visibility: hidden;
          }

          /* Make the modal wrapper visible but static positioned to avoid scroll issues */
          .fixed {
            position: absolute !important;
            inset: 0 !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            visibility: visible !important;
            z-index: 9999 !important;
          }

          /* The print content itself */
          .print-area, .print-area * {
            visibility: visible !important;
            color: black !important;
          }

          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm; /* Fix width to standard thermal paper size */
            font-size: 12px; /* Ensure text is small enough */
            line-height: 1.2;
            margin: 0;
            padding: 2mm;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};