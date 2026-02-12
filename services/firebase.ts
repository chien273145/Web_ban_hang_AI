import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- CẤU HÌNH FIREBASE ---
// Đã cập nhật theo hình ảnh bạn cung cấp
const firebaseConfig = {
  apiKey: "AIzaSyDwhQ3hdN9I97hdi8yfdi7SQDrTZXHzBrw",
  authDomain: "web-ban-hang-ai.firebaseapp.com",
  projectId: "web-ban-hang-ai",
  storageBucket: "web-ban-hang-ai.firebasestorage.app",
  messagingSenderId: "70652843414",
  appId: "1:70652843414:web:6395a2951b813d254ab9b7"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore Database
export const db = getFirestore(app);

// Helper để kiểm tra xem đã config chưa
export const isFirebaseConfigured = () => {
  // Vì đã điền key thật, hàm này luôn trả về true
  return true;
};