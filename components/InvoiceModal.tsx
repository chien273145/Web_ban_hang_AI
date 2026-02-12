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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 no-print">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - No Print */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 no-print">
          <h2 className="text-lg font-bold text-gray-800">Chi Tiết Hóa Đơn</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto print-area bg-white" id="invoice-content">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold uppercase tracking-wider text-indigo-700 print:text-black">SmartShop</h1>
            <p className="text-sm text-gray-500 print:text-black">Văn Miếu Xích Đằng, TP. Hưng Yên</p>
            <p className="text-sm text-gray-500 print:text-black">Hotline: 0334994329</p>
          </div>

          <div className="mb-6 border-b border-gray-300 pb-4 border-dashed print:border-black">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 print:text-black">Mã hóa đơn:</span>
              <span className="font-mono font-medium print:text-black">{invoice.id}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 print:text-black">Ngày:</span>
              <span className="print:text-black">{new Date(invoice.date).toLocaleString('vi-VN')}</span>
            </div>
             <div className="flex justify-between text-sm">
              <span className="text-gray-600 print:text-black">Hình thức:</span>
              <span className="font-bold uppercase print:text-black">{getPaymentMethodName(invoice.paymentMethod)}</span>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-gray-200 print:border-black">
                <th className="text-left py-2 font-bold text-gray-700 print:text-black">Mặt hàng</th>
                <th className="text-center py-2 font-bold text-gray-700 print:text-black">SL</th>
                <th className="text-right py-2 font-bold text-gray-700 print:text-black">Đơn giá</th>
                <th className="text-right py-2 font-bold text-gray-700 print:text-black">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 print:border-gray-300">
                  <td className="py-2 text-gray-800 print:text-black font-medium">{item.name}</td>
                  <td className="text-center py-2 print:text-black">{item.quantity}</td>
                  <td className="text-right py-2 print:text-black">{FORMAT_CURRENCY(item.price)}</td>
                  <td className="text-right py-2 font-bold print:text-black">{FORMAT_CURRENCY(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center text-xl font-bold border-t-2 border-gray-300 print:border-black pt-4">
            <span className="print:text-black">Tổng cộng:</span>
            <span className="text-indigo-600 print:text-black">{FORMAT_CURRENCY(invoice.total)}</span>
          </div>

          <div className="mt-8 text-center text-xs text-gray-400 italic print:text-black">
            <p>Cảm ơn quý khách đã mua hàng!</p>
            <p>Hẹn gặp lại.</p>
          </div>
        </div>

        {/* Footer Actions - No Print */}
        <div className="p-4 border-t bg-gray-50 flex justify-between gap-2 no-print">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Hoàn tất
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

          /* Hide everything outside the print area */
          body * {
            visibility: hidden;
            height: 0;
            overflow: hidden;
          }

          /* Reset visibility for the modal wrapper and print area */
          .fixed {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            z-index: 9999 !important;
            visibility: visible !important;
            overflow: visible !important;
          }

          .print-area, .print-area * {
            visibility: visible !important;
            height: auto !important;
            color: black !important; /* Force black text for thermal printers */
          }

          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 5mm; /* Nhỏ gọn cho giấy in nhiệt */
            overflow: visible !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};