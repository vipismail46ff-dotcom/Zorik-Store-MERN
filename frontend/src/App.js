import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  const [activeFilter, setActiveFilter] = useState('All');
  const [toast, setToast] = useState({ show: false, text: '', icon: '' });
  const [celebration, setCelebration] = useState({ show: false, orderId: '' });

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return localStorage.getItem('zorik_boss_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [adminTab, setAdminTab] = useState('dashboard');
  const [selectedFile, setSelectedFile] = useState(null);

  // 🎯 UPDATE 1: Added CountInStock Input field
  const [newStock, setNewStock] = useState({
    name: '', price: '', description: '', gender: 'Men', category: 'T-Shirt', countInStock: '25', sizes: []
  });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState({});

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://zorik-backend-api.onrender.com/api/products');
      if (Array.isArray(response.data)) setProducts(response.data.reverse());
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
    if (product.countInStock <= 0) return alert("🚫 Sorry! This item is completely Sold Out.");

    const chosenSize = selectedSizes[product._id];
    if (product.sizes && product.sizes.length > 0 && !chosenSize) {
      alert("⚠️ Please select your Size first!");
      return;
    }
    const cartItem = { ...product, selectedSize: chosenSize || 'Standard', cartId: Math.random() };
    setCart([...cart, cartItem]);
    triggerToast(`Added "${product.name}" (Size: ${cartItem.selectedSize})`, '🛒');
  };

  const removeFromCart = (cartIdToRemove) => {
    setCart(cart.filter((item) => item.cartId !== cartIdToRemove));
    triggerToast("Item removed from cart", '🗑️');
  };

  const cartTotal = cart.reduce((total, item) => total + Number(item.price || 0), 0);

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    const randomOrderId = "ZK" + Math.floor(100000 + Math.random() * 900000);
    const orderData = { orderId: randomOrderId, customerName: customer.name, phone: customer.phone, address: customer.address, items: cart, totalAmount: cartTotal, status: 'Pending ⏳' };

    try {
      await axios.post('https://zorik-backend-api.onrender.com/api/orders', orderData);

      // 🎯 UPDATE 2: Instant UI stock decrementing logic
      const updatedProducts = products.map(p => {
        const orderedCount = cart.filter(c => c._id === p._id).length;
        if (orderedCount > 0) {
          const newBalance = Math.max(0, Number(p.countInStock) - orderedCount);
          axios.put(`https://zorik-backend-api.onrender.com/api/products/${p._id}`, { countInStock: newBalance }).catch(() => { });
          return { ...p, countInStock: newBalance };
        }
        return p;
      });
      setProducts(updatedProducts);

      setCelebration({ show: true, orderId: randomOrderId });
      setCart([]); setIsCheckoutOpen(false); setCustomer({ name: '', phone: '', address: '' });
      setSelectedSizes({});
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
      const response = await axios.get('https://zorik-backend-api.onrender.com/api/orders');
      setAdminOrders(response.data.reverse());
    } catch (err) {
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  };

  const toggleOrderStatus = async (orderId, currentStatus) => {
    const newStatus = currentStatus && currentStatus.includes('Pending') ? 'Finished ✅' : 'Pending ⏳';
    setAdminOrders(adminOrders.map(ord => ord._id === orderId ? { ...ord, status: newStatus } : ord));
    triggerToast(`Order status updated!`, "📦");
    axios.put(`https://zorik-backend-api.onrender.com/api/orders/${orderId}`, { status: newStatus }).catch(() => { });
  };

  // 🎯 UPDATE 3: Admin Order Deletion
  const deleteOrder = async (orderId) => {
    if (!window.confirm("⚠️ Are you sure you want to permanently DELETE this customer order?")) return;
    setAdminOrders(adminOrders.filter(o => o._id !== orderId));
    triggerToast("Order deleted permanently", "🗑️");
    axios.delete(`https://zorik-backend-api.onrender.com/api/orders/${orderId}`).catch(() => { });
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://zorik-backend-api.onrender.com/api/admin/verify', { pin: pinInput });
      if (res.data.success) {
        setIsAdminUnlocked(true); localStorage.setItem('zorik_boss_unlocked', 'true');
        setPinError(''); setPinInput('');
        triggerToast("Zorik HQ Unlocked 🔓", "🛡️");
        fetchAdminOrders();
      }
    } catch (err) {
      setPinError("❌ Invalid Master PIN!"); setPinInput('');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('zorik_boss_unlocked'); setIsAdminUnlocked(false);
    triggerToast("HQ Locked Securely", "🔒");
  };

  const getDynamicSizes = (category) => {
    if (['Shoes'].includes(category)) return ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];
    if (['Pants', 'Track Pants', 'Shorts', 'Jeans'].includes(category)) return ['28', '30', '32', '34', '36', '38'];
    if (['Belt', 'Accessories'].includes(category)) return ['Free Size', '32', '34', '36'];
    return ['S', 'M', 'L', 'XL', 'XXL'];
  };

  const handleSizeCheckboxToggle = (size) => {
    setNewStock((prev) => {
      const updatedSizes = prev.sizes.includes(size) ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size];
      return { ...prev, sizes: updatedSizes };
    });
  };

  const handleAddStockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert("Please choose a product image from your Gallery!");
    if (newStock.sizes.length === 0) return alert("Please select at least one available size!");

    setIsUploading(true);
    triggerToast("Uploading image to Cloudinary... ☁️", "⏳");

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      const uploadRes = await axios.post('https://zorik-backend-api.onrender.com/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      const productData = {
        name: newStock.name,
        price: Number(newStock.price),
        description: newStock.description || "Premium Zorik Fit",
        imageUrl: uploadRes.data.imageUrl,
        category: `${newStock.gender} | ${newStock.category}`,
        countInStock: Number(newStock.countInStock || 0), // 🎯 Saved exact user qty                     
        sizes: newStock.sizes,
        colors: ['Standard']
      };

      await axios.post('https://zorik-backend-api.onrender.com/api/products', productData);
      triggerToast("✨ New Stock Published!", "📦");
      setNewStock({ name: '', price: '', description: '', gender: 'Men', category: 'T-Shirt', countInStock: '25', sizes: [] });
      setSelectedFile(null); setIsUploading(false);
      fetchProducts();
    } catch (err) {
      alert("Failed to upload stock!"); setIsUploading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeFilter === 'All' || (product.category && product.category.includes(activeFilter));
    return matchesSearch && matchesCategory;
  });

  const totalRevenue = adminOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);
  const pendingCount = adminOrders.filter(o => !o.status || o.status.includes('Pending')).length;

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', paddingBottom: '60px', margin: 0 }}>

      {/* 🌟 THE NEW APPLE/NIKE STYLE STICKY MOBILE HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 1000, backgroundColor: 'rgba(15, 15, 15, 0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 25px rgba(0,0,0,0.18)' }}>
        <div onClick={() => { setSearchQuery(''); setActiveFilter('All'); }} style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '1.6rem', fontWeight: '900', letterSpacing: '2.5px', background: 'linear-gradient(45deg, #ffffff, #00ffcc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ZORIK.</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => setActiveFilter('All')} style={{ background: 'none', border: 'none', color: '#e0e0e0', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>Shop</button>

          <button onClick={() => setIsCartOpen(true)} style={{ backgroundColor: '#222', border: '1px solid #333', padding: '8px 15px', borderRadius: '25px', color: '#00ffcc', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,255,204,0.15)' }}>
            🛒 Cart <span style={{ backgroundColor: '#00ffcc', color: '#111', borderRadius: '50%', padding: '1px 7px', fontSize: '0.75rem', fontWeight: '900' }}>{cart.length}</span>
          </button>

          <button onClick={handleOpenAdminClick} style={{ backgroundColor: isAdminUnlocked ? '#00cc99' : '#2a2a2a', border: '1px solid #444', padding: '8px 12px', borderRadius: '8px', color: isAdminUnlocked ? '#111' : '#fff', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
            {isAdminUnlocked ? '⚡ HQ Active' : '🔒 Admin'}
          </button>
        </div>
      </header>

      <div style={{ textAlign: 'center', margin: '35px 0 20px 0', padding: '0 15px' }}>
        <h1 style={{ fontSize: '2.6rem', color: '#111', margin: '0 0 8px 0', fontWeight: '900', letterSpacing: '-0.5px' }}>Welcome to Zorik.</h1>
        <p style={{ fontSize: '1.05rem', color: '#666', margin: 0 }}>Elevate Your Everyday Aesthetic.</p>
      </div>

      <div style={{ width: '88%', maxWidth: '550px', margin: '0 auto 25px auto' }}>
        <input type="text" placeholder="🔍 Search Clothing, Shoes, Vibes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '14px 24px', fontSize: '1rem', borderRadius: '30px', border: 'none', outline: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '35px', padding: '0 15px' }}>
        {['All', 'Men', 'Women', 'Unisex', 'T-Shirt', 'Shirt', 'Shoes', 'Pants'].map(cat => (
          <button key={cat} onClick={() => setActiveFilter(cat)} style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: activeFilter === cat ? '#111' : '#e9ecef', color: activeFilter === cat ? '#00ffcc' : '#333', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem', transition: '0.2s' }}>{cat}</button>
        ))}
      </div>

      <div style={{ width: '90%', margin: '0 auto', textAlign: 'center' }}>
        {loading && <h3 style={{ color: '#0055ff' }}>⏳ Fetching Live Drops from Cloud...</h3>}
        {!loading && filteredProducts.length === 0 && <h3 style={{ color: '#888', marginTop: '40px' }}>No products found in this section.</h3>}

        <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {filteredProducts.map((product) => {
            const stock = Number(product.countInStock || 0);
            const isSoldOut = stock <= 0;

            return (
              <div key={product._id} style={{ backgroundColor: 'white', padding: '14px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', width: '260px', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', opacity: isSoldOut ? 0.75 : 1 }}>
                <span style={{ position: 'absolute', top: '22px', right: '22px', backgroundColor: 'rgba(0,0,0,0.75)', color: '#00ffcc', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 'bold', zIndex: 2 }}>{product.category || 'Apparel'}</span>

                {/* 🎯 SOLD OUT OVERLAY BANNER */}
                {isSoldOut && (
                  <div style={{ position: 'absolute', top: '140px', left: 0, width: '100%', backgroundColor: '#ff3333', color: 'white', textAlign: 'center', padding: '10px 0', fontWeight: '900', letterSpacing: '4px', fontSize: '1.1rem', zIndex: 3, boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                    SOLD OUT
                  </div>
                )}

                <div>
                  <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '310px', objectFit: 'cover', borderRadius: '12px', filter: isSoldOut ? 'grayscale(85%)' : 'none', backgroundColor: '#f0f0f0' }} />
                  <h3 style={{ fontSize: '1.15rem', margin: '14px 0 4px 0', color: '#111', fontWeight: '800' }}>{product.name}</h3>
                  <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 12px 0', minHeight: '35px', lineHeight: '1.4' }}>{product.description}</p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <p style={{ color: '#111', fontWeight: '900', fontSize: '1.35rem', margin: 0 }}>₹{product.price}</p>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isSoldOut ? '#ff3333' : stock <= 5 ? '#e67e22' : '#00b894' }}>
                      {isSoldOut ? 'Out of Stock' : stock <= 5 ? `🔥 Only ${stock} Left!` : `📦 ${stock} Left`}
                    </span>
                  </div>

                  {product.sizes && product.sizes.length > 0 && !isSoldOut && (
                    <div style={{ marginBottom: '12px' }}>
                      <select value={selectedSizes[product._id] || ""} onChange={(e) => setSelectedSizes({ ...selectedSizes, [product._id]: e.target.value })} style={{ padding: '10px', width: '100%', borderRadius: '8px', border: '1.5px solid #ddd', outline: 'none', fontWeight: '700', color: '#333', cursor: 'pointer', backgroundColor: '#fcfcfc' }}>
                        <option value="" disabled>📐 Select Size</option>
                        {product.sizes.map(size => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </div>
                  )}

                  <button disabled={isSoldOut} onClick={() => addToCart(product)} style={{ padding: '14px 0', backgroundColor: isSoldOut ? '#e0e0e0' : '#111', color: isSoldOut ? '#888' : '#00ffcc', border: 'none', borderRadius: '10px', cursor: isSoldOut ? 'not-allowed' : 'pointer', width: '100%', fontWeight: '900', fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                    {isSoldOut ? '🚫 CURRENTLY UNAVAILABLE' : 'ADD TO CART 🛒'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '360px', maxWidth: '90vw', height: '100vh', backgroundColor: 'white', boxShadow: '-8px 0 30px rgba(0,0,0,0.2)', padding: '24px', zIndex: 2000, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f0f0', paddingBottom: '14px' }}><h2 style={{ margin: 0, fontWeight: '900' }}>Your Cart ({cart.length})</h2><button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>✖</button></div>
            <div style={{ marginTop: '20px', maxHeight: '62vh', overflowY: 'auto' }}>
              {cart.map((item) => (
                <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                  <div><h4 style={{ margin: 0, fontSize: '1rem', color: '#222' }}>{item.name}</h4><p style={{ margin: '4px 0', color: '#888', fontSize: '0.85rem' }}>Size: <strong>{item.selectedSize}</strong></p><p style={{ margin: 0, fontWeight: '900', color: '#111' }}>₹{item.price}</p></div>
                  <button onClick={() => removeFromCart(item.cartId)} style={{ color: '#ff3333', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '1.3rem', marginBottom: '18px', color: '#111' }}><span>Total:</span><span>₹{cartTotal}</span></div>
            <button disabled={cart.length === 0} onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} style={{ width: '100%', padding: '16px', backgroundColor: cart.length === 0 ? '#ccc' : '#111', color: cart.length === 0 ? '#666' : '#00ffcc', fontWeight: '900', border: 'none', borderRadius: '12px', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontSize: '1rem' }}>PROCEED TO CHECKOUT</button>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, backdropFilter: 'blur(5px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '400px', maxWidth: '85vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px' }}><h2 style={{ margin: 0 }}>Shipping Info</h2><button onClick={() => setIsCheckoutOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button></div>
            <form onSubmit={handleConfirmOrder} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <input type="text" required placeholder="Full Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} />
              <input type="tel" required placeholder="Phone Number" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} />
              <textarea required rows="3" placeholder="Delivery Address..." value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} />
              <button type="submit" style={{ padding: '16px', backgroundColor: '#111', color: '#00ffcc', fontWeight: '900', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>CONFIRM ORDER 🚀</button>
            </form>
          </div>
        </div>
      )}

      {isAdminOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000, backdropFilter: 'blur(8px)' }}>
          {!isAdminUnlocked ? (
            <div style={{ backgroundColor: '#111', padding: '40px', borderRadius: '18px', textAlign: 'center', border: '2px solid #333', width: '340px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🔒</div><h2 style={{ color: '#00ffcc', margin: '0 0 20px 0', letterSpacing: '2px' }}>BOSS HQ</h2>
              <form onSubmit={handlePinSubmit}>
                <input type="password" required autoFocus placeholder="••••" maxLength="6" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={{ width: '80%', padding: '14px', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '8px', borderRadius: '10px', border: '2px solid #444', backgroundColor: '#222', color: '#00ffcc', outline: 'none', marginBottom: '18px' }} />
                {pinError && <p style={{ color: '#ff4444', fontSize: '0.85rem', margin: '0 0 15px 0', fontWeight: 'bold' }}>{pinError}</p>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setIsAdminOpen(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#333', color: '#aaa', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>CANCEL</button>
                  <button type="submit" style={{ flex: 1, padding: '14px', backgroundColor: '#00ffcc', color: '#111', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}>UNLOCK</button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ backgroundColor: '#f4f6f8', padding: '25px', borderRadius: '16px', width: '780px', maxWidth: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ddd', paddingBottom: '14px', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, color: '#111', fontWeight: '900' }}>🏢 Zorik Boss HQ</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleAdminLogout} style={{ backgroundColor: '#ffe5e5', color: '#d9534f', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🔒 Lock HQ</button>
                  <button onClick={() => setIsAdminOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#555' }}>✖</button>
                </div>
              </div>

              {/* 🎯 ADVANCED ADMIN TABS */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', overflowX: 'auto' }}>
                <button onClick={() => setAdminTab('dashboard')} style={{ flex: 1, padding: '12px', fontWeight: '800', backgroundColor: adminTab === 'dashboard' ? '#111' : '#e0e0e0', color: adminTab === 'dashboard' ? '#00ffcc' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>📊 DASHBOARD</button>
                <button onClick={() => { setAdminTab('orders'); fetchAdminOrders(); }} style={{ flex: 1, padding: '12px', fontWeight: '800', backgroundColor: adminTab === 'orders' ? '#111' : '#e0e0e0', color: adminTab === 'orders' ? '#00ffcc' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>📥 ORDERS ({adminOrders.length})</button>
                <button onClick={() => setAdminTab('inventory')} style={{ flex: 1, padding: '12px', fontWeight: '800', backgroundColor: adminTab === 'inventory' ? '#111' : '#e0e0e0', color: adminTab === 'inventory' ? '#00ffcc' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>📦 INVENTORY</button>
                <button onClick={() => setAdminTab('add_stock')} style={{ flex: 1, padding: '12px', fontWeight: '800', backgroundColor: adminTab === 'add_stock' ? '#111' : '#e0e0e0', color: adminTab === 'add_stock' ? '#00ffcc' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>➕ UPLOAD</button>
              </div>

              <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '6px' }}>

                {adminTab === 'dashboard' && (
                  <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#fff', padding: '22px', borderRadius: '12px', borderLeft: '6px solid #00ffcc', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <p style={{ margin: 0, color: '#666', fontWeight: 'bold' }}>Total Sales Revenue</p>
                      <h2 style={{ margin: '10px 0 0 0', fontSize: '2.4rem', color: '#111', fontWeight: '900' }}>₹{totalRevenue}</h2>
                    </div>
                    <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#fff', padding: '22px', borderRadius: '12px', borderLeft: '6px solid #ff4444', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <p style={{ margin: 0, color: '#666', fontWeight: 'bold' }}>Pending Shipments</p>
                      <h2 style={{ margin: '10px 0 0 0', fontSize: '2.4rem', color: '#111', fontWeight: '900' }}>{pendingCount}</h2>
                    </div>
                  </div>
                )}

                {/* 🎯 ORDERS VIEW WITH DELETE BUTTON */}
                {adminTab === 'orders' && (
                  adminLoading ? <p style={{ textAlign: 'center' }}>⏳ Loading Orders...</p> :
                    adminOrders.length === 0 ? <p style={{ textAlign: 'center', color: '#777' }}>No orders placed yet.</p> :
                      adminOrders.map((ord) => (
                        <div key={ord._id} style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '18px', marginBottom: '16px', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                            <span style={{ fontWeight: '900', fontSize: '1.05rem', color: '#111' }}>Order #{ord.orderId}</span>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <button onClick={() => toggleOrderStatus(ord._id, ord.status)} style={{ backgroundColor: ord.status && ord.status.includes('Finished') ? '#d4edda' : '#fff3cd', color: ord.status && ord.status.includes('Finished') ? '#155724' : '#856404', border: '1px solid #ccc', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem' }}>
                                {ord.status || 'Pending ⏳'}
                              </button>
                              <button onClick={() => deleteOrder(ord._id)} style={{ backgroundColor: '#ffe5e5', color: '#d9534f', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>🗑️ Delete</button>
                            </div>
                          </div>
                          <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>👤 <strong>{ord.customerName}</strong> ({ord.phone})</p>
                          <p style={{ margin: '4px 0', color: '#555', fontSize: '0.9rem' }}>📍 {ord.address} | 💰 <strong>₹{ord.totalAmount}</strong></p>
                          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                            {ord.items && ord.items.map((item, idx) => (
                              <p key={idx} style={{ margin: '3px 0', fontSize: '0.85rem', color: '#444' }}>• {item.name} <span style={{ color: '#00aa77', fontWeight: '800' }}>(Size: {item.selectedSize})</span></p>
                            ))}
                          </div>
                        </div>
                      ))
                )}

                {/* 🎯 THE ALL NEW STOCK INVENTORY MANAGER */}
                {adminTab === 'inventory' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#555' }}>📦 Real-Time Stock Balance ({products.length} Products):</p>
                    {products.map(prod => {
                      const bal = Number(prod.countInStock || 0);
                      const isZero = bal <= 0;
                      return (
                        <div key={prod._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
                          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                            <img src={prod.imageUrl} alt="" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', color: '#111' }}>{prod.name}</h4>
                              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#777' }}>₹{prod.price} | {prod.category}</p>
                            </div>
                          </div>
                          <div>
                            <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '900', backgroundColor: isZero ? '#ffe5e5' : bal <= 5 ? '#fff3cd' : '#e6f4ea', color: isZero ? '#d9534f' : bal <= 5 ? '#856404' : '#137333' }}>
                              {isZero ? '🔴 SOLD OUT (0)' : bal <= 5 ? `🟡 Low Qty (${bal})` : `🟢 In Stock (${bal})`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 🎯 UPLOAD FORM WITH QUANTITY INPUT */}
                {adminTab === 'add_stock' && (
                  <form onSubmit={handleAddStockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                      <select value={newStock.gender} onChange={(e) => setNewStock({ ...newStock, gender: e.target.value })} style={{ flex: 1, minWidth: '120px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontWeight: 'bold' }}>
                        <option value="Men">Men</option><option value="Women">Women</option><option value="Unisex">Unisex</option>
                      </select>
                      <select value={newStock.category} onChange={(e) => setNewStock({ ...newStock, category: e.target.value, sizes: [] })} style={{ flex: 2, minWidth: '180px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontWeight: 'bold' }}>
                        {['T-Shirt', 'Shirt', 'Pants', 'Track Pants', 'Shorts', 'Jeans', 'Shoes', 'Belt', 'Accessories'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                      <input type="text" required placeholder="Product Title" value={newStock.name} onChange={(e) => setNewStock({ ...newStock, name: e.target.value })} style={{ flex: 2, minWidth: '200px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} />
                      <input type="number" required placeholder="Price ₹" value={newStock.price} onChange={(e) => setNewStock({ ...newStock, price: e.target.value })} style={{ flex: 1, minWidth: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontWeight: 'bold' }} />

                      {/* 🎯 THE NEW STOCK QUANTITY INPUT BOX */}
                      <input type="number" required placeholder="Qty (e.g 20)" value={newStock.countInStock} onChange={(e) => setNewStock({ ...newStock, countInStock: e.target.value })} style={{ width: '110px', padding: '12px', borderRadius: '8px', border: '2px solid #00cc99', outline: 'none', fontWeight: '900', color: '#111', backgroundColor: '#f0fdf4' }} title="Total pieces available in stock" />
                    </div>

                    <input type="text" placeholder="Short Description..." value={newStock.description} onChange={(e) => setNewStock({ ...newStock, description: e.target.value })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} />

                    <div style={{ border: '1px solid #ccc', padding: '14px', borderRadius: '8px', backgroundColor: '#fcfcfc' }}>
                      <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>📏 Tick Available Sizes for {newStock.category}:</p>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {getDynamicSizes(newStock.category).map((sz) => (
                          <label key={sz} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem' }}>
                            <input type="checkbox" checked={newStock.sizes.includes(sz)} onChange={() => handleSizeCheckboxToggle(sz)} style={{ width: '18px', height: '18px', accentColor: '#111' }} /> {sz}
                          </label>
                        ))}
                      </div>
                    </div>

                    <label style={{ border: '2px dashed #00cc99', padding: '20px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', backgroundColor: '#f0fdf4' }}>
                      <span style={{ fontWeight: 'bold', color: '#155724', fontSize: '1rem' }}>{selectedFile ? `✅ Ready: "${selectedFile.name}"` : "📸 Tap to Pick Image from Gallery"}</span>
                      <input type="file" accept="image/*" required onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />
                    </label>

                    <button type="submit" disabled={isUploading} style={{ padding: '16px', backgroundColor: isUploading ? '#ccc' : '#111', color: isUploading ? '#666' : '#00ffcc', fontWeight: '900', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', letterSpacing: '1px' }}>{isUploading ? "☁️ UPLOADING TO CLOUD..." : "⚡ PUBLISH TO LIVE STORE"}</button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {toast.show && <div style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#111', color: '#00ffcc', padding: '14px 26px', borderRadius: '10px', fontWeight: '900', zIndex: 9999, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>{toast.icon} {toast.text}</div>}
      {celebration.show && <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}><div style={{ backgroundColor: 'white', padding: '45px', borderRadius: '24px', textAlign: 'center', maxWidth: '80vw' }}><h1 style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>🎉 WOOHOO!</h1><p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '25px' }}>Your Order was Placed Successfully!</p><button onClick={() => { setCelebration({ show: false }); handleOpenAdminClick(); }} style={{ padding: '14px 28px', backgroundColor: '#111', color: '#00ffcc', border: 'none', borderRadius: '30px', fontWeight: '900', cursor: 'pointer', fontSize: '1rem' }}>TRACK IN ADMIN HQ</button></div></div>}
    </div>
  );
}

export default App;