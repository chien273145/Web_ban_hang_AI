import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { Product, Invoice } from "../types";
import { INITIAL_PRODUCTS } from "../constants";

// Tên các bảng (collections) trong Database
const PRODUCTS_COLLECTION = "products";
const INVOICES_COLLECTION = "invoices";

// --- PRODUCTS ---

// Lắng nghe dữ liệu sản phẩm theo thời gian thực
export const subscribeToProducts = (
  callback: (products: Product[]) => void,
  onError?: (error: any) => void
) => {
  if (!isFirebaseConfigured()) {
    console.warn("Firebase chưa được cấu hình. Sử dụng localStorage fallback.");
    const local = localStorage.getItem('smartshop_products');
    callback(local ? JSON.parse(local) : INITIAL_PRODUCTS);
    return () => {};
  }

  const q = query(collection(db, PRODUCTS_COLLECTION), orderBy("name"));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    callback(products);
  }, (error) => {
    // Chỉ log nếu không có handler bên ngoài để tránh duplicate
    if (!onError) console.error("Lỗi lấy sản phẩm:", error);
    if (onError) onError(error);
  });

  return unsubscribe;
};

export const addProductToDb = async (product: Omit<Product, "id">) => {
  if (!isFirebaseConfigured()) return; // Hoặc xử lý fallback
  try {
    await addDoc(collection(db, PRODUCTS_COLLECTION), product);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const updateProductInDb = async (id: string, data: Partial<Product>) => {
  if (!isFirebaseConfigured()) return;
  const productRef = doc(db, PRODUCTS_COLLECTION, id);
  await updateDoc(productRef, data);
};

export const deleteProductFromDb = async (id: string) => {
  if (!isFirebaseConfigured()) return;
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
};

// --- INVOICES ---

export const subscribeToInvoices = (
  callback: (invoices: Invoice[]) => void,
  onError?: (error: any) => void
) => {
  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem('smartshop_invoices');
    callback(local ? JSON.parse(local) : []);
    return () => {};
  }

  // Sắp xếp hóa đơn mới nhất lên đầu
  const q = query(collection(db, INVOICES_COLLECTION), orderBy("date", "desc"));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const invoices: Invoice[] = [];
    snapshot.forEach((doc) => {
      invoices.push({ id: doc.id, ...doc.data() } as Invoice);
    });
    callback(invoices);
  }, (error) => {
    if (!onError) console.error("Lỗi lấy hóa đơn:", error);
    if (onError) onError(error);
  });

  return unsubscribe;
};

// Lưu hóa đơn và trừ tồn kho (Transaction)
export const createInvoiceAndUpdateStock = async (invoice: Invoice) => {
  if (!isFirebaseConfigured()) return;

  const batch = writeBatch(db);

  // 1. Lưu hóa đơn
  const invoiceRef = doc(collection(db, INVOICES_COLLECTION)); // Tạo reference mới với ID tự động
  batch.set(invoiceRef, invoice);

  // 2. Trừ tồn kho
  // Logic trừ kho tối ưu hơn:
  for (const cartItem of invoice.items) {
    // Tìm product gốc trong DB (cần ID của Firestore)
    // Lưu ý: cartItem.id phải khớp với document ID trong Firestore
    const productRef = doc(db, PRODUCTS_COLLECTION, cartItem.id);
    const newStock = Math.max(0, cartItem.stock - cartItem.quantity);
    batch.update(productRef, { stock: newStock });
  }

  await batch.commit();
};

export const deleteInvoiceFromDb = async (id: string) => {
  if (!isFirebaseConfigured()) return;
  await deleteDoc(doc(db, INVOICES_COLLECTION, id));
};