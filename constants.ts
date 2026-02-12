import { Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Nước Ngọt Coca Cola', price: 10000, category: 'Đồ uống', stock: 100, unit: 'lon' },
  { id: '2', name: 'Bánh Snack Khoai Tây', price: 15000, category: 'Đồ ăn vặt', stock: 50, unit: 'gói' },
  { id: '3', name: 'Mì Hảo Hảo Tôm Chua Cay', price: 4500, category: 'Thực phẩm khô', stock: 200, unit: 'gói' },
  { id: '4', name: 'Dầu Ăn Tường An 1L', price: 45000, category: 'Gia vị', stock: 30, unit: 'chai' },
  { id: '5', name: 'Gạo ST25 (5kg)', price: 180000, category: 'Lương thực', stock: 20, unit: 'túi' },
  { id: '6', name: 'Nước Mắm Nam Ngư', price: 32000, category: 'Gia vị', stock: 40, unit: 'chai' },
  { id: '7', name: 'Sữa Tươi Vinamilk 1L', price: 30000, category: 'Sữa', stock: 60, unit: 'hộp' },
  { id: '8', name: 'Bột Giặt Omo 3kg', price: 125000, category: 'Hóa phẩm', stock: 15, unit: 'túi' },
];

export const FORMAT_CURRENCY = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Cấu hình tài khoản ngân hàng để tạo mã QR
// Bạn hãy thay đổi thông tin bên dưới thành tài khoản thật của bạn
export const BANK_CONFIG = {
  BANK_ID: 'BIDV', // Mã ngân hàng (VD: MB, VCB, ACB, TPB, VPB...)
  ACCOUNT_NO: '4650569183', // Số tài khoản
  ACCOUNT_NAME: 'LA NGOC CHIEN', // Tên chủ tài khoản (Không dấu)
  TEMPLATE: 'compact' // Kiểu giao diện QR (compact, print, qr_only)
};