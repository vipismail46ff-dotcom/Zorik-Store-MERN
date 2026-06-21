import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ show: false, text: '', icon: '' });
  const [celebration, setCelebration] = useState({ show: false, orderId: '' });

  // --- ADMIN AUTH STATES ---
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return localStorage.getItem('zorik_boss_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // ==================================================================
  // 🖼️ NEW: GALLERY UPLOAD & STOCK FORM STATES
  // ==================================================================
  const [adminTab, setAdminTab] = useState('orders'); // 'orders' or 'add_stock'
  const [selectedFile, setSelectedFile] = useState(null);
  const [newStock, setNewStock] = useState({ name: '', price: '', description: '' });
  const [isUploading, setIsUploading] = useState(false);

  // ப்ராடக்ட்களை சர்வரில் இருந்து இழுக்கும் மெயின் ஃபங்ஷன்
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/products');
      if (Array.isArray(response.data)) setProducts(response.data);
    } catch (err) {
      setError(err.message || "Could not connect to Server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const triggerToast = (text, icon = '🛍️') => {
    setToast({ show: true, text, icon });
    setTimeout(() => setToast({ show: false, text: '', icon: '' }), 3000);
  };

  const addToCart = (product) => {
    setCart([...cart, product]);
    triggerToast(`Added "${product.name}" to your cart!`, '🛒');
  };

  const removeFromCart = (indexToRemove) => {
    setCart(cart.filter((_, index) => index !== indexToRemove));
    triggerToast("Item removed from cart", '🗑️');
  };

  const cartTotal = cart.reduce((total, item) => total + Number(item.price || 0), 0);

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    const randomOrderId = "ZK" + Math.floor(100000 + Math.random() * 900000);
    const orderData = { orderId: randomOrderId, customerName: customer.name, phone: customer.phone, address: customer.address, items: cart, totalAmount: cartTotal };

    try {
      await axios.post('http://localhost:5000/api/orders', orderData);
      setCelebration({ show: true, orderId: randomOrderId });
      setCart([]); setIsCheckoutOpen(false); setCustomer({ name: '', phone: '', address: '' });
    } catch (err) {
      alert("Error placing order! Check console.");
    }
  };

  const handleOpenAdminClick = async () => {
    setIsAdminOpen(true);
    if (isAdminUnlocked) fetchAdminOrders();
  };

  const fetchAdminOrders = async () => {
    setAdminLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/orders');
      setAdminOrders(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/admin/verify', { pin: pinInput });
      if (res.data.success) {
        setIsAdminUnlocked(true);
        localStorage.setItem('zorik_boss_unlocked', 'true');
        setPinError(''); setPinInput('');
        triggerToast("Zorik HQ Unlocked 🔓", "🛡️");
        fetchAdminOrders();
      }
    } catch (err) {
      setPinError("❌ Invalid Master PIN!");
      setPinInput('');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('zorik_boss_unlocked');
    setIsAdminUnlocked(false);
    triggerToast("HQ Locked Securely", "🔒");
  };

  // ==================================================================
  // 🚀 NEW: கேலரி இமேஜை Cloudinary-ல் ஏற்றி, MongoDB-யில் ப்ராடக்ட்டை சேமிக்கும் ஃபங்ஷன்
  // ==================================================================
  const handleAddStockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please choose a product image from your Gallery!");
      return;
    }

    setIsUploading(true);
    triggerToast("Uploading image to Cloudinary... ☁️", "⏳");

    try {
      // 1. படத்தை முதலில் Cloudinary-க்கு அனுப்புகிறோம்
      const formData = new FormData();
      formData.append('image', selectedFile);

      const uploadRes = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const secureCloudUrl = uploadRes.data.imageUrl; // Cloudinary கொடுத்த நிரந்தர லிங்க்

      // 2. லிங்க் கிடைத்தவுடன், ப்ராடக்ட் பெயரை மாங்கோடிபி-க்கு அனுப்புகிறோம்
      const productData = {
        name: newStock.name,
        price: Number(newStock.price),
        description: newStock.description || "Premium Zorik Luxury Fit",
        imageUrl: secureCloudUrl
      };

      await axios.post('http://localhost:5000/api/products', productData);

      triggerToast("✨ New Stock Published to Live Store!", "📦");

      // படிவத்தை ரீசெட் செய்கிறோம்
      setNewStock({ name: '', price: '', description: '' });
      setSelectedFile(null);
      setIsUploading(false);
      setAdminTab('orders'); // மீண்டும் ஆர்டர் லிஸ்ட்டைக் காட்டுகிறோம்

      fetchProducts(); // முகப்புப் பக்கத்தில் புதிய துணியை உடனே அப்டேட் செய்ய!

    } catch (err) {
      console.error("Upload Error Details:", err);
      alert("Failed to upload stock! Check Backend console.");
      setIsUploading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    (product.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh', paddingBottom: '50px', position: 'relative' }}>

      <Navbar cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenAdmin={handleOpenAdminClick} />

      <div style={{ textAlign: 'center', margin: '40px 0 20px 0' }}>
        <h1 style={{ fontSize: '3rem', color: '#222', margin: '0 0 10px 0' }}>Welcome to Zorik.</h1>
        <p style={{ fontSize: '1.1rem', color: '#666', margin: 0 }}>Premium Clothing for the Modern You.</p>
      </div>

      <div style={{ width: '50%', maxWidth: '500px', margin: '0 auto 40px auto', textAlign: 'center' }}>
        <input type="text" placeholder="🔍 Search T-shirts, Shirts, Black..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '14px 25px', fontSize: '1.05rem', borderRadius: '30px', border: '2px solid #ddd', outline: 'none' }} />
      </div>

      {/* --- MAIN PRODUCTS GRID --- */}
      <div style={{ width: '85%', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', color: '#333' }}>Featured Collections</h2>
        {loading && <h3 style={{ color: 'blue', marginTop: '40px' }}>⏳ Loading products from server...</h3>}
        {error && <h3 style={{ color: 'red', marginTop: '40px' }}>❌ Server Error: {error}</h3>}

        {!loading && !error && filteredProducts.length > 0 && (
          <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', marginTop: '30px', justifyContent: 'center' }}>
            {filteredProducts.map((product) => (
              <div key={product._id || Math.random()} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', width: '250px', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: '8px', backgroundColor: '#eee' }} />
                  <h3 style={{ fontSize: '1.1rem', margin: '15px 0 5px 0', color: '#222' }}>{product.name}</h3>
                  <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 10px 0' }}>{product.description || 'Premium Quality Apparel'}</p>
                </div>
                <div>
                  <p style={{ color: '#111', fontWeight: 'bold', fontSize: '1.25rem', margin: '0 0 10px 0' }}>₹{product.price}</p>
                  <button onClick={() => addToCart(product)} style={{ padding: '10px 0', backgroundColor: '#222', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>Add to Cart 🛒</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- CART DRAWER --- */}
      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '350px', height: '100vh', backgroundColor: 'white', boxShadow: '-4px 0 15px rgba(0,0,0,0.2)', padding: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}><h2 style={{ margin: 0, color: '#222' }}>Your Cart</h2><button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>✖</button></div>
            <div style={{ marginTop: '20px', maxHeight: '65vh', overflowY: 'auto' }}>
              {cart.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>
                  <div><h4 style={{ margin: 0, color: '#333' }}>{item.name}</h4><p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>₹{item.price}</p></div>
                  <button onClick={() => removeFromCart(index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '2px solid #eee', paddingTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '15px', color: '#222' }}><span>Total:</span><span>₹{cartTotal}</span></div>
            <button disabled={cart.length === 0} onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} style={{ width: '100%', padding: '15px', backgroundColor: cart.length === 0 ? '#ccc' : '#111', color: cart.length === 0 ? '#666' : '#00ffcc', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}>PROCEED TO CHECKOUT</button>
          </div>
        </div>
      )}

      {/* --- CHECKOUT MODAL --- */}
      {isCheckoutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '400px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}><h2 style={{ margin: 0, color: '#222' }}>Shipping Details</h2><button onClick={() => setIsCheckoutOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button></div>
            <form onSubmit={handleConfirmOrder} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <input type="text" required placeholder="Full Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
              <input type="tel" required placeholder="Phone Number" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
              <textarea required rows="3" placeholder="Delivery Address..." value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
              <button type="submit" style={{ padding: '15px', backgroundColor: '#111', color: '#00ffcc', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>CONFIRM ORDER 🚀</button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================
          🛡️ BOSS HQ MODAL (WITH ORDERS TAB & UPLOAD GALLERY TAB)
          ================================================================== */}
      {isAdminOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, backdropFilter: 'blur(5px)' }}>

          {!isAdminUnlocked ? (
            /* STAGE 1: PIN LOCK */
            <div style={{ backgroundColor: '#111', color: 'white', padding: '40px', borderRadius: '15px', width: '350px', textAlign: 'center', border: '2px solid #333', boxShadow: '0 0 40px rgba(0, 255, 204, 0.2)' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🔒</div>
              <h2 style={{ margin: '0 0 5px 0', color: '#00ffcc', letterSpacing: '2px' }}>RESTRICTED HQ</h2>
              <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '25px' }}>Enter Boss PIN to authenticate</p>
              <form onSubmit={handlePinSubmit}>
                <input type="password" maxLength="6" required autoFocus placeholder="••••" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={{ width: '80%', padding: '12px', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '8px', borderRadius: '8px', border: '2px solid #444', backgroundColor: '#222', color: '#00ffcc', outline: 'none', marginBottom: '15px' }} />
                {pinError && <p style={{ color: '#ff4444', fontSize: '0.85rem', margin: '0 0 15px 0', fontWeight: 'bold' }}>{pinError}</p>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setIsAdminOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#333', color: '#aaa', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>CANCEL</button>
                  <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#00ffcc', color: '#111', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>UNLOCK ⚡</button>
                </div>
              </form>
            </div>
          ) : (
            /* STAGE 2: BOSS DASHBOARD */
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', textAlign: 'left', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #222', paddingBottom: '12px', marginBottom: '15px' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#222' }}>🏢 Zorik Boss HQ</h2>
                  <p style={{ margin: 0, color: '#00cc99', fontSize: '0.85rem', fontWeight: 'bold' }}>🟢 CLOUD PIPELINE SECURED</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button onClick={handleAdminLogout} style={{ fontSize: '0.8rem', backgroundColor: '#ffe5e5', color: '#d9534f', border: '1px solid #d9534f', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>🔒 Lock HQ</button>
                  <button onClick={() => setIsAdminOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>✖</button>
                </div>
              </div>

              {/* --- TABS SWITCHER --- */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  onClick={() => { setAdminTab('orders'); fetchAdminOrders(); }}
                  style={{ flex: 1, padding: '12px', fontWeight: 'bold', backgroundColor: adminTab === 'orders' ? '#111' : '#f1f1f1', color: adminTab === 'orders' ? '#00ffcc' : '#444', border: 'none', borderRadius: '6px', cursor: 'pointer', letterSpacing: '0.5px' }}
                >
                  📥 CUSTOMER ORDERS ({adminOrders.length})
                </button>
                <button
                  onClick={() => setAdminTab('add_stock')}
                  style={{ flex: 1, padding: '12px', fontWeight: 'bold', backgroundColor: adminTab === 'add_stock' ? '#111' : '#f1f1f1', color: adminTab === 'add_stock' ? '#00ffcc' : '#444', border: 'none', borderRadius: '6px', cursor: 'pointer', letterSpacing: '0.5px' }}
                >
                  ➕ UPLOAD NEW STOCK 🖼️
                </button>
              </div>

              {/* --- TAB 1: ORDERS LIST --- */}
              <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '5px' }}>
                {adminTab === 'orders' ? (
                  adminLoading ? <p style={{ textAlign: 'center', color: 'blue' }}>⏳ Loading Orders...</p> :
                    adminOrders.length === 0 ? <p style={{ textAlign: 'center', color: '#777' }}>No orders found.</p> :
                      adminOrders.map((ord) => (
                        <div key={ord._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '15px', backgroundColor: '#fafafa' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: '6px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 'bold', color: '#111' }}>Order #{ord.orderId}</span>
                            <span style={{ color: 'green', fontWeight: 'bold' }}>{ord.status || 'Order Placed'}</span>
                          </div>
                          <p style={{ margin: '2px 0', fontSize: '0.95rem' }}>👤 **{ord.customerName}** ({ord.phone})</p>
                          <p style={{ margin: '2px 0', fontSize: '0.9rem', color: '#555' }}>📍 {ord.address} | 💰 **₹{ord.totalAmount}**</p>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#888' }}>🛒 Items: {ord.items.map(i => i.name).join(', ')}</p>
                        </div>
                      ))
                ) : (

                  /* --- TAB 2: UPLOAD IMAGE FROM GALLERY FORM --- */
                  <form onSubmit={handleAddStockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '5px' }}>

                    {/* GALLERY FILE SELECTOR BOX */}
                    <div style={{ border: '2px dashed #00cc99', padding: '25px', textAlign: 'center', borderRadius: '10px', backgroundColor: '#f0fdf4', cursor: 'pointer', transition: 'all 0.3s' }}>
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>📸</div>
                        <span style={{ fontWeight: 'bold', color: '#155724', fontSize: '1.05rem', display: 'block' }}>
                          {selectedFile ? `✅ Ready: "${selectedFile.name}"` : "Click here to Choose from Gallery / Phone Camera"}
                        </span>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#28a745' }}>Auto Cloud-Optimized (JPG, PNG, WEBP)</p>
                        <input type="file" accept="image/*" required onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#555' }}>Product Title</label>
                        <input type="text" required placeholder="e.g. Zorik Heavy Oversized Tee" value={newStock.name} onChange={(e) => setNewStock({ ...newStock, name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px', boxSizing: 'border-box', fontSize: '1rem' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#555' }}>Price (₹)</label>
                        <input type="number" required placeholder="1299" value={newStock.price} onChange={(e) => setNewStock({ ...newStock, price: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px', boxSizing: 'border-box', fontSize: '1rem', fontWeight: 'bold' }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#555' }}>Short Description</label>
                      <input type="text" placeholder="100% Premium Cotton, 240 GSM, Luxury fit..." value={newStock.description} onChange={(e) => setNewStock({ ...newStock, description: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px', boxSizing: 'border-box', fontSize: '0.95rem' }} />
                    </div>

                    <button type="submit" disabled={isUploading} style={{ width: '100%', padding: '15px', backgroundColor: isUploading ? '#ccc' : '#111', color: isUploading ? '#666' : '#00ffcc', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: isUploading ? 'wait' : 'pointer', fontSize: '1rem', letterSpacing: '1px', marginTop: '5px' }}>
                      {isUploading ? "☁️ UPLOADING TO CLOUDINARY SERVER..." : "⚡ PUBLISH TO LIVE STORE"}
                    </button>

                  </form>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {toast.show && (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#111', color: '#00ffcc', padding: '14px 24px', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold', zIndex: 9999, borderLeft: '4px solid #00ffcc' }}>
          <span style={{ fontSize: '1.3rem' }}>{toast.icon}</span><span>{toast.text}</span>
        </div>
      )}

      {celebration.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '450px', width: '90%', border: '3px solid #00ffcc' }}>
            <div style={{ fontSize: '4.5rem', margin: '0 0 10px 0' }}>🎉🥳🚀</div><h1 style={{ color: '#111', margin: '0 0 5px 0', fontSize: '2.2rem' }}>WOOHOO!</h1><h3 style={{ color: '#00cc99', margin: '0 0 20px 0' }}>Order Placed Successfully</h3>
            <button onClick={() => { setCelebration({ show: false, orderId: '' }); handleOpenAdminClick(); }} style={{ width: '100%', padding: '16px', backgroundColor: '#111', color: '#00ffcc', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>VIEW IN ADMIN PANEL ⚙️</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;