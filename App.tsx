import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Package, FileText, Search, Plus, Trash2, Save, Minus, X, Database, AlertTriangle, ExternalLink, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Product, CartItem, Invoice, Tab, VoiceIntentType, PaymentMethod } from './types';
import { INITIAL_PRODUCTS, FORMAT_CURRENCY } from './constants';
import { parseVoiceCommand } from './services/geminiService';
import { VoiceControl } from './components/VoiceControl';
import { InvoiceModal } from './components/InvoiceModal';
import { PaymentModal } from './components/PaymentModal';
import { SuccessModal } from './components/SuccessModal';
import {
  subscribeToProducts,
  subscribeToInvoices,
  addProductToDb,
  updateProductInDb,
  deleteProductFromDb,
  createInvoiceAndUpdateStock,
  deleteInvoiceFromDb
} from './services/dbService';
import { isFirebaseConfigured } from './services/firebase';

const App: React.FC = () => {
  // State for Data
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<{ title: string, message: string, link?: string } | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('pos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Inventory State
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [configError, setConfigError] = useState(false);

  // UI Loading States
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'product' | 'invoice' } | null>(null);

  // Retry mechanism
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Refs
  const unsubProductsRef = useRef<(() => void) | null>(null);
  const unsubInvoicesRef = useRef<(() => void) | null>(null);

  // Track if we just finished a payment to trigger success modal
  const isNewTransactionRef = useRef(false);

  // --- Real-time Data Subscription ---
  useEffect(() => {
    // Check Config
    if (!isFirebaseConfigured()) {
      setConfigError(true);
      // Fallback data loading for demo purposes
      const localP = localStorage.getItem('smartshop_products');
      setProducts(localP ? JSON.parse(localP) : INITIAL_PRODUCTS);
      const localI = localStorage.getItem('smartshop_invoices');
      setInvoices(localI ? JSON.parse(localI) : []);
      setLoading(false);
      return;
    }

    setLoading(true);
    setBackendError(null);

    const onErrorHandler = (error: any) => {
      setLoading(false);

      // Handle specific Firebase errors
      const isMissingDb = error?.code === 'not-found' || error?.message?.includes('database (default) does not exist');
      const isPermissionDenied = error?.message?.includes('Cloud Firestore API') || error?.code === 'permission-denied';

      if (isMissingDb) {
        setBackendError({
          title: "Database chưa tồn tại",
          message: "Dự án chưa có Database. Vui lòng tạo Firestore Database trong Google Cloud Console.",
          link: "https://console.cloud.google.com/datastore/setup?project=web-ban-hang-ai"
        });
      } else if (isPermissionDenied) {
        setBackendError({
          title: "Thiếu quyền truy cập",
          message: "Bạn chưa mở quyền Đọc/Ghi cho Database. Vui lòng vào tab Rules và sửa thành 'allow read, write: if true;'",
          link: "https://console.firebase.google.com/project/web-ban-hang-ai/firestore/rules"
        });
      } else {
        // Only switch to offline mode if it's a connection error, not a logic error
        setBackendError({
          title: "Kết nối không ổn định",
          message: "Đang hiển thị dữ liệu Offline."
        });

        // FALLBACK: Load local data
        const localP = localStorage.getItem('smartshop_products');
        setProducts(prev => prev.length > 0 ? prev : (localP ? JSON.parse(localP) : INITIAL_PRODUCTS));

        const localI = localStorage.getItem('smartshop_invoices');
        setInvoices(prev => prev.length > 0 ? prev : (localI ? JSON.parse(localI) : []));
      }
    };

    // Clean up old subscriptions before creating new ones
    if (unsubProductsRef.current) unsubProductsRef.current();
    if (unsubInvoicesRef.current) unsubInvoicesRef.current();

    unsubProductsRef.current = subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
      // Nếu load thành công thì clear lỗi cũ (nếu có)
      if (data.length > 0) setBackendError(null);
    }, onErrorHandler);

    unsubInvoicesRef.current = subscribeToInvoices((data) => {
      setInvoices(data);
    }, onErrorHandler);

    return () => {
      if (unsubProductsRef.current) unsubProductsRef.current();
      if (unsubInvoicesRef.current) unsubInvoicesRef.current();
    };
  }, [retryTrigger]); // Re-run when retryTrigger changes

  // --- Fallback Persistence for Demo (if no Firebase OR if Backend Error) ---
  useEffect(() => {
    // Allow saving to local storage if config is bad OR backend is unreachable
    if (configError || backendError) {
      localStorage.setItem('smartshop_products', JSON.stringify(products));
      localStorage.setItem('smartshop_invoices', JSON.stringify(invoices));
    }
  }, [products, invoices, configError, backendError]);

  // --- Text to Speech Helper ---
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      // Cancel existing speech to speak the new one immediately
      if (synth.speaking) {
        synth.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN'; // Set language to Vietnamese
      utterance.rate = 1.0;
      synth.speak(utterance);
    }
  };

  // --- POS Logic ---
  const addToCart = (product: Product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  // Triggered when clicking "Thanh Toán"
  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    speakText(`Tổng tiền cần thanh toán là ${total} đồng. Vui lòng chọn hình thức thanh toán.`);
    setShowPaymentModal(true);
  };

  // Triggered when Payment Method is selected
  const handlePaymentConfirm = async (method: PaymentMethod) => {
    setShowPaymentModal(false);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const newInvoice: Invoice = {
      id: `HD-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      items: [...cart],
      total,
      paymentMethod: method
    };

    // Mark as new transaction so when we close the Invoice Modal, we show the Success message
    isNewTransactionRef.current = true;

    if (!configError && !backendError) {
      // Use Firebase Transaction
      try {
        await createInvoiceAndUpdateStock(newInvoice);
        clearCart();
        setSelectedInvoice(newInvoice);
      } catch (error: any) {
        console.error("Transaction failed, falling back to local:", error);

        const isMissingDb = error?.code === 'not-found' || error?.message?.includes('database (default) does not exist');

        if (isMissingDb) {
          setBackendError({
            title: "Database chưa tồn tại",
            message: "Đang chạy Offline. Vui lòng tạo Database để đồng bộ.",
            link: "https://console.cloud.google.com/datastore/setup?project=web-ban-hang-ai"
          });
        } else if (error.code === 'permission-denied') {
          alert("LỖI QUYỀN TRUY CẬP: Không thể lưu hóa đơn. Vui lòng kiểm tra Rules trên Firebase.");
          return;
        } else {
          setBackendError({ title: "Mất kết nối", message: "Đã chuyển sang chế độ Offline." });
          alert("Không thể lưu lên Server. Hóa đơn sẽ lưu tạm trên máy.");
        }

        // Fallback logic
        setInvoices(prev => [newInvoice, ...prev]);
        setSelectedInvoice(newInvoice);
        clearCart();
        setProducts(prev => prev.map(p => {
          const cartItem = cart.find(c => c.id === p.id);
          if (cartItem) {
            return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
          }
          return p;
        }));
      }
    } else {
      // Local Fallback Mode
      setInvoices(prev => [newInvoice, ...prev]);
      setSelectedInvoice(newInvoice);
      clearCart();
      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(c => c.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
        }
        return p;
      }));
    }
  };

  const handleCloseInvoice = () => {
    setSelectedInvoice(null);

    // Check if this was a fresh checkout flow
    if (isNewTransactionRef.current) {
      isNewTransactionRef.current = false;
      // Show success modal
      setShowSuccessModal(true);
      speakText("Thanh toán thành công");
      // Ensure we are on the POS tab (Home)
      setActiveTab('pos');
    }
  };

  // --- Voice Logic ---
  const handleVoiceInput = async (base64: string, mimeType: string, intent: VoiceIntentType) => {
    setIsProcessingVoice(true);

    // Use product list for context
    const productNames = products.map(p => p.name);

    // Pass the intent (button pressed) to the AI service
    const result = await parseVoiceCommand(base64, mimeType, productNames, intent);

    console.log("AI Result:", result);

    if (result.productName === "MISSING_KEY") {
      alert("LỖI: Chưa cấu hình API Key trên Vercel.\n\nVui lòng vào Settings > Environment Variables trên Vercel và thêm 'GEMINI_API_KEY'.");
    } else if (result.productName === "INVALID_KEY") {
      alert("LỖI: API Key không hợp lệ.");
    } else if (result.intent === VoiceIntentType.UNKNOWN) {
      alert(`Không nghe rõ tên sản phẩm. Vui lòng nói lại.`);
    } else if (result.productName) {
      const matchedProduct = products.find(p => p.name.toLowerCase() === result.productName?.toLowerCase());

      if (matchedProduct) {
        if (result.intent === VoiceIntentType.CHECK_PRICE) {
          // Switch to POS tab if not active
          setActiveTab('pos');
          setSearchTerm(matchedProduct.name); // Filter view

          // Audio feedback for price check
          speakText(`Sản phẩm ${matchedProduct.name} có giá ${matchedProduct.price} đồng`);
        } else if (result.intent === VoiceIntentType.ADD_TO_CART) {
          setActiveTab('pos');
          addToCart(matchedProduct, result.quantity || 1);
          speakText(`Đã thêm ${result.quantity || 1} ${matchedProduct.name} vào giỏ`);
        }
      } else {
        speakText(`Không tìm thấy sản phẩm ${result.productName}`);
        alert(`Không tìm thấy sản phẩm "${result.productName}" trong kho.`);
      }
    } else {
      alert("Không xác định được tên sản phẩm.");
    }

    setIsProcessingVoice(false);
  };

  // --- Inventory Logic ---
  const handleSaveProduct = async () => {
    if (!currentProduct.name || !currentProduct.price) return;

    if (configError || backendError) {
      // Fallback Local Mode
      if (currentProduct.id) {
        setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, ...currentProduct } as Product : p));
      } else {
        const newProd: Product = {
          id: Date.now().toString(),
          name: currentProduct.name,
          price: Number(currentProduct.price),
          category: currentProduct.category || 'Khác',
          stock: Number(currentProduct.stock) || 0,
          unit: currentProduct.unit || 'cái'
        };
        setProducts(prev => [...prev, newProd]);
      }
    } else {
      // Firebase
      try {
        if (currentProduct.id) {
          // Edit
          await updateProductInDb(currentProduct.id, currentProduct);
        } else {
          // Add
          await addProductToDb({
            name: currentProduct.name,
            price: Number(currentProduct.price),
            category: currentProduct.category || 'Khác',
            stock: Number(currentProduct.stock) || 0,
            unit: currentProduct.unit || 'cái'
          });
        }
      } catch (error: any) {
        console.error("Save product failed:", error);

        // FALLBACK MOI: Nếu lỗi Firebase, tự động lưu vào state local để người dùng không bị gián đoạn
        const newProd: Product = {
          id: currentProduct.id || Date.now().toString(),
          name: currentProduct.name,
          price: Number(currentProduct.price),
          category: currentProduct.category || 'Khác',
          stock: Number(currentProduct.stock) || 0,
          unit: currentProduct.unit || 'cái'
        };

        if (currentProduct.id) {
          setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, ...currentProduct } as Product : p));
        } else {
          setProducts(prev => [...prev, newProd]);
        }

        if (error.code === 'permission-denied') {
          alert("⚠️ LƯU Ý: Bạn chưa mở quyền ghi (Write) cho Database trên Firebase.\nSản phẩm tạm thời được lưu trên máy này.");
        } else {
          alert("⚠️ Lỗi kết nối Server. Sản phẩm đã được lưu cục bộ (Offline Mode).");
        }
      }
    }

    setIsEditingProduct(false);
    setCurrentProduct({});
  };

  const triggerDeleteProduct = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItemToDelete({ id, type: 'product' });
  };

  const triggerDeleteInvoice = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItemToDelete({ id, type: 'invoice' });
  };

  const performDelete = async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    setItemToDelete(null); // Close modal

    setDeletingId(id);

    // Xử lý chung cho cả 2 loại
    const isOffline = configError || (backendError && backendError.title !== "Thiếu quyền truy cập");

    try {
      if (type === 'product') {
        if (isOffline) {
          setProducts(prev => prev.filter(p => p.id !== id));
        } else {
          await deleteProductFromDb(id);
          setProducts(prev => prev.filter(p => p.id !== id)); // Optimistic update
        }
      } else {
        if (isOffline) {
          setInvoices(prev => prev.filter(i => i.id !== id));
        } else {
          await deleteInvoiceFromDb(id);
          setInvoices(prev => prev.filter(i => i.id !== id)); // Optimistic update
        }
      }
    } catch (error: any) {
      console.error("Xóa thất bại:", error);

      if (error.code === 'permission-denied') {
        alert("⚠️ KHÔNG THỂ XÓA!\n\nLý do: Firebase chặn quyền xóa.\n\nCách sửa:\n1. Vào trang cài đặt Firebase.\n2. Vào tab 'Rules' (Quy tắc).\n3. Đổi 'if false' thành 'if true'.");
      } else if (error.code === 'not-found') {
        alert("Lỗi: Không tìm thấy Database.");
      } else {
        alert("Lỗi khi xóa: " + error.message);
      }

      // Revert optimistic update if needed? 
      // With onSnapshot, it will fix itself, but if we want to be precise we could reload.
    } finally {
      setDeletingId(null);
    }
  };

  // --- Render Helpers ---
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans text-gray-800">

      {/* Sidebar Navigation */}
      <nav className="bg-white w-full md:w-20 md:h-screen flex md:flex-col items-center justify-between md:justify-start shadow-md z-30 shrink-0">
        <div className="p-4 bg-indigo-600 w-full md:w-auto flex justify-center">
          <span className="text-white font-bold text-xl md:text-2xl">SS</span>
        </div>

        <div className="flex md:flex-col w-full md:w-auto justify-around md:mt-8 gap-2 p-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === 'pos' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ShoppingCart size={24} />
            <span className="text-xs font-medium">Bán Hàng</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === 'inventory' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Package size={24} />
            <span className="text-xs font-medium">Kho</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === 'invoices' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <FileText size={24} />
            <span className="text-xs font-medium">Hóa Đơn</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-[calc(100vh-60px)] md:h-screen overflow-hidden">

        {/* Header Bar */}
        <header className="bg-white h-16 border-b flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800 hidden md:block">
              {activeTab === 'pos' && 'Bán Hàng & Thu Ngân'}
              {activeTab === 'inventory' && 'Quản Lý Kho Hàng'}
              {activeTab === 'invoices' && 'Lịch Sử Hóa Đơn'}
            </h1>
            {(configError || (backendError && backendError.title !== "Thiếu quyền truy cập")) && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full flex items-center gap-1">
                <Database size={12} /> Offline Mode
              </span>
            )}
            {!configError && !backendError && loading && (
              <span className="text-xs text-indigo-600 animate-pulse">Đang đồng bộ...</span>
            )}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {backendError && (
          <div className="bg-red-50 border-b border-red-200 p-3 px-6 flex items-start gap-3 text-sm shrink-0">
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <h3 className="font-bold text-red-800">{backendError.title}</h3>
              <p className="text-red-700 mt-1">{backendError.message}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {backendError.link && (
                  <a
                    href={backendError.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-red-700 underline font-medium hover:text-red-900"
                  >
                    <ExternalLink size={14} /> Sửa lỗi ngay
                  </a>
                )}
                <button
                  onClick={() => setRetryTrigger(prev => prev + 1)}
                  className="inline-flex items-center gap-1 bg-white border border-red-300 text-red-700 px-3 py-1 rounded hover:bg-red-50 font-medium text-xs shadow-sm"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Thử lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden relative">

          {/* POS TAB */}
          {activeTab === 'pos' && (
            <div className="flex flex-col md:flex-row h-full">
              {/* Product Grid - Added pb-32 for mobile button clearance */}
              <div className="flex-1 overflow-y-auto p-6 pb-32 md:pb-6">
                {products.length === 0 && !loading && (
                  <div className="text-center text-gray-400 mt-10">Kho hàng trống</div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
                    >
                      <div className="h-24 bg-gray-50 rounded-lg mb-3 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform">
                        {/* Placeholder visual based on category */}
                        {product.category === 'Đồ uống' ? '🥤' :
                          product.category === 'Đồ ăn vặt' ? '🍟' :
                            product.category === 'Gia vị' ? '🧂' : '📦'}
                      </div>
                      <h3 className="font-semibold text-gray-800 line-clamp-1">{product.name}</h3>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-indigo-600 font-bold">{FORMAT_CURRENCY(product.price)}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{product.stock} {product.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Panel */}
              <div className="w-full md:w-96 bg-white shadow-xl border-l flex flex-col h-1/2 md:h-full z-20">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <ShoppingCart size={20} className="text-indigo-600" />
                    Giỏ Hàng <span className="text-sm font-normal text-gray-500">({cart.length} món)</span>
                  </h2>
                  <button onClick={clearCart} className="text-red-500 text-xs hover:underline">Xóa tất cả</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                      <ShoppingCart size={48} className="opacity-20" />
                      <p>Chưa có sản phẩm nào</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-800">{item.name}</h4>
                          <span className="text-xs text-gray-500">{FORMAT_CURRENCY(item.price)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white rounded-md border shadow-sm">
                            <button
                              onClick={() => updateCartQuantity(item.id, -1)}
                              className="p-1 hover:bg-gray-100 text-gray-600"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.id, 1)}
                              className="p-1 hover:bg-gray-100 text-gray-600"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-gray-50 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Tổng tiền</span>
                    <span className="text-2xl font-bold text-indigo-700">{FORMAT_CURRENCY(cartTotal)}</span>
                  </div>
                  <button
                    onClick={handleCheckoutClick}
                    disabled={cart.length === 0}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    Thanh Toán
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="p-6 h-full overflow-y-auto pb-32 md:pb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-700">Danh sách sản phẩm</h2>
                <button
                  onClick={() => { setCurrentProduct({}); setIsEditingProduct(true); }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-sm"
                >
                  <Plus size={18} /> Thêm Mới
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-medium">
                    <tr>
                      <th className="p-4">Tên Sản Phẩm</th>
                      <th className="p-4 hidden sm:table-cell">Danh Mục</th>
                      <th className="p-4 text-right">Giá Bán</th>
                      <th className="p-4 text-center">Tồn Kho</th>
                      <th className="p-4 text-center hidden sm:table-cell">Đơn Vị</th>
                      <th className="p-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-800">
                          {product.name}
                          <div className="sm:hidden text-xs text-gray-400 mt-1">{product.category}</div>
                        </td>
                        <td className="p-4 text-gray-500 hidden sm:table-cell">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">{product.category}</span>
                        </td>
                        <td className="p-4 text-right text-indigo-600 font-semibold">{FORMAT_CURRENCY(product.price)}</td>
                        <td className="p-4 text-center">
                          <span className={`${product.stock < 10 ? 'text-red-500 font-bold' : 'text-gray-700'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="p-4 text-center text-gray-500 hidden sm:table-cell">{product.unit}</td>
                        <td className="p-4 text-right space-x-2">
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); setCurrentProduct(product); setIsEditingProduct(true); }}
                              disabled={deletingId === product.id}
                              className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={(e) => triggerDeleteProduct(product.id, e)}
                              disabled={deletingId === product.id}
                              className="px-3 py-1 text-red-600 hover:bg-red-50 rounded flex items-center justify-center min-w-[30px]"
                            >
                              {deletingId === product.id ? <Loader2 size={16} className="animate-spin" /> : "Xóa"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INVOICES TAB */}
          {activeTab === 'invoices' && (
            <div className="p-6 h-full overflow-y-auto pb-32 md:pb-6">
              <h2 className="text-lg font-bold text-gray-700 mb-6">Lịch Sử Giao Dịch</h2>
              <div className="grid gap-4">
                {invoices.length === 0 ? (
                  <p className="text-center text-gray-400 py-10">Chưa có hóa đơn nào được tạo.</p>
                ) : (
                  invoices.map(invoice => (
                    <div key={invoice.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center hover:shadow-md transition-all">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono font-bold text-gray-800">{invoice.id}</span>
                          <span className="text-xs text-gray-500">{new Date(invoice.date).toLocaleString('vi-VN')}</span>
                        </div>
                        <p className="text-sm text-gray-600">{invoice.items.length} mặt hàng</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-indigo-700 mr-2">{FORMAT_CURRENCY(invoice.total)}</span>

                        <button
                          onClick={(e) => triggerDeleteInvoice(invoice.id, e)}
                          disabled={deletingId === invoice.id}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center"
                          title="Xóa hóa đơn"
                        >
                          {deletingId === invoice.id ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                        </button>

                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                          title="Xem chi tiết"
                        >
                          <FileText size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Voice Assistant Button */}
      <VoiceControl
        onAudioCapture={handleVoiceInput}
        isProcessing={isProcessingVoice}
      />

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={cartTotal}
          onConfirm={handlePaymentConfirm}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">Xác nhận xóa</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Bạn có chắc chắn muốn xóa {itemToDelete.type === 'product' ? 'sản phẩm' : 'hóa đơn'} này không?
                  Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium"
              >
                Hủy
              </button>
              <button
                onClick={performDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium shadow-sm"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Edit Modal */}
      {isEditingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">{currentProduct.id ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h2>
            {(configError || (backendError && backendError.title !== "Thiếu quyền truy cập")) && <div className="mb-2 p-2 bg-yellow-50 text-yellow-700 text-xs rounded">Đang chạy chế độ Offline. Dữ liệu chỉ lưu trên máy này.</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={currentProduct.name || ''}
                  onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá (VNĐ)</label>
                  <input
                    type="number"
                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={currentProduct.price || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho</label>
                  <input
                    type="number"
                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={currentProduct.stock || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, stock: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <input
                    type="text"
                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={currentProduct.category || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                    placeholder="VD: Đồ uống"
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
                  <input
                    type="text"
                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={currentProduct.unit || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, unit: e.target.value })}
                    placeholder="cái/lon"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsEditingProduct(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveProduct}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
              >
                <Save size={16} /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={handleCloseInvoice}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal onClose={() => setShowSuccessModal(false)} />
      )}
    </div>
  );
};

export default App;