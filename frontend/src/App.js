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
  const [activeFilter, setActiveFilter] = useState('All'); // 🎯 AI Bonus: Category Filter
  const [toast, setToast] = useState({ show: false, text: '', icon: '' });
  const [celebration, setCelebration] = useState({ show: false, orderId: '' });

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return localStorage.getItem('zorik_boss_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [adminTab, setAdminTab] = useState('dashboard');
  const [selectedFile, setSelectedFile] = useState(null);

  // 🎯 UPDATE 1: Dynamic Categories & Gender
  const [newStock, setNewStock] = useState({
    name: '', price: '', description: '', gender: 'Men', category: 'T-Shirt', sizes: []
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
    const chosenSize = selectedSizes[product._id];
    if (product.sizes && product.sizes.length > 0 && !chosenSize) {
      alert("⚠️ Please select your Size before adding to cart!");
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
    // 🎯 UPDATE 2: Added status 'Pending' by default
    const orderData = { orderId: randomOrderId, customerName: customer.name, phone: customer.phone, address: customer.address, items: cart, totalAmount: cartTotal, status: 'Pending' };

    try {
      await axios.post('https://zorik-backend-api.onrender.com/api/orders', orderData);
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
      setAdminOrders(response.data.reverse()); // Latest orders first
    } catch (err) {
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  };

  // 🎯 UPDATE 3: Order Status Toggle (Pending <-> Finished)
  const toggleOrderStatus = async (orderId, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Finished ✅' : 'Pending ⏳';

    // Update local state instantly for fast UI
    setAdminOrders(adminOrders.map(ord => ord._id === orderId ? { ...ord, status: newStatus } : ord));
    triggerToast(`Order marked as ${newStatus}`, "📦");

    // Try updating backend if the route exists (Silent fail if it doesn't)
    try {
      await axios.put(`https://zorik-backend-api.onrender.com/api/orders/${orderId}`, { status: newStatus });
    } catch (err) {
      console.log("Backend route for status update might not exist yet, updated locally.");
    }
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

  // 🎯 UPDATE 4: Dynamic Sizes based on Category
  const getDynamicSizes = (category) => {
    if (['Shoes'].includes(category)) return ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];
    if (['Pants', 'Track Pants', 'Shorts', 'Jeans'].includes(category)) return ['28', '30', '32', '34', '36', '38'];
    if (['Belt', 'Accessories'].includes(category)) return ['Free Size', '32', '34', '36'];
    return ['S', 'M', 'L', 'XL', 'XXL']; // Default for Shirts, T-Shirts
  };

  const handleCategoryChange = (e) => {
    setNewStock({ ...newStock, category: e.target.value, sizes: [] }); // Reset sizes when category changes
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
        category: `${newStock.gender} | ${newStock.category}`, // 🎯 Combined to avoid backend crash         
        countInStock: 50,
        sizes: newStock.sizes,
        colors: ['Standard']
      };

      await axios.post('https://zorik-backend-api.onrender.com/api/products', productData);
      triggerToast("✨ New Stock Published!", "📦");
      setNewStock({ name: '', price: '', description: '', gender: 'Men', category: 'T-Shirt', sizes: [] });
      setSelectedFile(null); setIsUploading(false);
      fetchProducts();
    } catch (err) {
      alert("Failed to upload stock!"); setIsUploading(false);
    }
  };

  // Filter Logic for Homepage
  const filteredProducts = products.filter((product) => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeFilter === 'All' || (product.category && product.category.includes(activeFilter));
    return matchesSearch && matchesCategory;
  });

  // Analytics for Admin Dashboard
  const totalRevenue = adminOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);
  const pendingCount = adminOrders.filter(o => !o.status || o.status.includes('Pending')).length;

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh', paddingBottom: '50px' }}>
      <Navbar cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenAdmin={handleOpenAdminClick} />

      <div style={{ textAlign: 'center', margin: '40px 0 20px 0' }}>
        <h1 style={{ fontSize: '3rem', color: '#222', margin: '0 0 10px 0' }}>Welcome to Zorik.</h1>
        <p style={{ fontSize: '1.1rem', color: '#666', margin: 0 }}>Elevate Your Style. Define Your Vibe.</p>
      </div>

      <div style={{ width: '90%', maxWidth: '600px', margin: '0 auto 20px auto', textAlign: 'center' }}>
        <input type="text" placeholder="🔍 Search Products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '14px 25px', fontSize: '1.05rem', borderRadius: '30px', border: '2px solid #ddd', outline: 'none' }} />
      </div>

      {/* 🎯 AI Bonus: Category Filter Bubbles */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '40px', padding: '0 20px' }}>
        {['All', 'Men', 'Women', 'Unisex', 'T-Shirt', 'Shirt', 'Shoes', 'Pants'].map(cat => (
          <button key={cat} onClick={() => setActiveFilter(cat)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: activeFilter === cat ? '#111' : '#e0e0e0', color: activeFilter === cat ? '#00ffcc' : '#333', cursor: 'pointer', fontWeight: 'bold' }}>{cat}</button>
        ))}
      </div>

      <div style={{ width: '85%', margin: '0 auto', textAlign: 'center' }}>
        {loading && <h3 style={{ color: 'blue' }}>⏳ Loading Premium Collection...</h3>}
        {!loading && filteredProducts.length === 0 && <h3 style={{ color: '#888' }}>No products found for this category.</h3>}

        <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {filteredProducts.map((product) => (
            <div key={product._id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', width: '250px', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '25px', right: '25px', backgroundColor: '#111', color: '#00ffcc', padding: '4px 8px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 'bold' }}>{product.category || 'Apparel'}</span>
              <div>
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: '8px', backgroundColor: '#eee' }} />
                <h3 style={{ fontSize: '1.1rem', margin: '15px 0 5px 0', color: '#222' }}>{product.name}</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 10px 0' }}>{product.description}</p>
              </div>
              <div>
                <p style={{ color: '#111', fontWeight: 'bold', fontSize: '1.25rem', margin: '0 0 10px 0' }}>₹{product.price}</p>
                {/* 🎯 Safe Size Dropdown */}
                {product.sizes && product.sizes.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <select value={selectedSizes[product._id] || ""} onChange={(e) => setSelectedSizes({ ...selectedSizes, [product._id]: e.target.value })} style={{ padding: '8px', width: '100%', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer' }}>
                      <option value="" disabled>📐 Select Size</option>
                      {product.sizes.map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </div>
                )}
                <button onClick={() => addToCart(product)} style={{ padding: '10px 0', backgroundColor: '#222', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>Add to Cart 🛒</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '350px', height: '100vh', backgroundColor: 'white', boxShadow: '-4px 0 15px rgba(0,0,0,0.2)', padding: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}><h2>Your Cart</h2><button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button></div>
            <div style={{ marginTop: '20px', maxHeight: '65vh', overflowY: 'auto' }}>
              {cart.map((item) => (
                <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#333' }}>{item.name}</h4>
                    <p style={{ margin: '3px 0', color: '#888', fontSize: '0.85rem' }}>Size: <strong>{item.selectedSize}</strong></p>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>₹{item.price}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.cartId)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '2px solid #eee', paddingTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '15px' }}><span>Total:</span><span>₹{cartTotal}</span></div>
            <button disabled={cart.length === 0} onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} style={{ width: '100%', padding: '15px', backgroundColor: cart.length === 0 ? '#ccc' : '#111', color: cart.length === 0 ? '#666' : '#00ffcc', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}>CHECKOUT</button>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}><h2>Shipping Info</h2><button onClick={() => setIsCheckoutOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button></div>
            <form onSubmit={handleConfirmOrder} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <input type="text" required placeholder="Full Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
              <input type="tel" required placeholder="Phone Number" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
              <textarea required rows="3" placeholder="Delivery Address..." value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
              <button type="submit" style={{ padding: '15px', backgroundColor: '#111', color: '#00ffcc', fontWeight: 'bold', border: 'none', borderRadius: '5px' }}>CONFIRM ORDER 🚀</button>
            </form>
          </div>
        </div>
      )}

      {isAdminOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          {!isAdminUnlocked ? (
            <div style={{ backgroundColor: '#111', padding: '40px', borderRadius: '15px', textAlign: 'center', border: '2px solid #333' }}>
              <div style={{ fontSize: '3.5rem' }}>🔒</div><h2 style={{ color: '#00ffcc' }}>RESTRICTED HQ</h2>
              <form onSubmit={handlePinSubmit}>
                <input type="password" required autoFocus placeholder="PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={{ width: '80%', padding: '12px', fontSize: '1.5rem', textAlign: 'center', borderRadius: '8px', border: '2px solid #444', backgroundColor: '#222', color: '#00ffcc', marginBottom: '15px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setIsAdminOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#333', color: '#aaa', border: 'none', borderRadius: '5px' }}>CANCEL</button>
                  <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#00ffcc', color: '#111', border: 'none', borderRadius: '5px' }}>UNLOCK</button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ backgroundColor: '#f4f6f8', padding: '25px', borderRadius: '12px', width: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ccc', paddingBottom: '12px', marginBottom: '15px' }}>
                <h2 style={{ margin: 0 }}>🏢 Zorik Boss HQ</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleAdminLogout} style={{ backgroundColor: '#ffe5e5', color: '#d9534f', border: 'none', padding: '6px 12px', borderRadius: '5px' }}>🔒 Lock</button>
                  <button onClick={() => setIsAdminOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button onClick={() => setAdminTab('dashboard')} style={{ flex: 1, padding: '12px', fontWeight: 'bold', backgroundColor: adminTab === 'dashboard' ? '#111' : '#e0e0e0', color: adminTab === 'dashboard' ? '#00ffcc' : '#333', border: 'none', borderRadius: '6px' }}>📊 DASHBOARD</button>
                <button onClick={() => { setAdminTab('orders'); fetchAdminOrders(); }} style={{ flex: 1, padding: '12px', fontWeight: 'bold', backgroundColor: adminTab === 'orders' ? '#111' : '#e0e0e0', color: adminTab === 'orders' ? '#00ffcc' : '#333', border: 'none', borderRadius: '6px' }}>📥 ORDERS</button>
                <button onClick={() => setAdminTab('add_stock')} style={{ flex: 1, padding: '12px', fontWeight: 'bold', backgroundColor: adminTab === 'add_stock' ? '#111' : '#e0e0e0', color: adminTab === 'add_stock' ? '#00ffcc' : '#333', border: 'none', borderRadius: '6px' }}>➕ NEW STOCK</button>
              </div>

              <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '10px' }}>
                {adminTab === 'dashboard' && (
                  <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                    <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #00ffcc', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <p style={{ margin: 0, color: '#666', fontWeight: 'bold' }}>Total Revenue</p>
                      <h2 style={{ margin: '10px 0 0 0', fontSize: '2.5rem', color: '#111' }}>₹{totalRevenue}</h2>
                    </div>
                    <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #ff4444', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <p style={{ margin: 0, color: '#666', fontWeight: 'bold' }}>Pending Orders</p>
                      <h2 style={{ margin: '10px 0 0 0', fontSize: '2.5rem', color: '#111' }}>{pendingCount}</h2>
                    </div>
                  </div>
                )}

                {adminTab === 'orders' && (
                  adminLoading ? <p>⏳ Loading Orders...</p> :
                    adminOrders.map((ord) => (
                      <div key={ord._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '15px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold' }}>Order #{ord.orderId}</span>
                          {/* 🎯 Order Status Toggle Button */}
                          <button onClick={() => toggleOrderStatus(ord._id, ord.status)} style={{ backgroundColor: ord.status && ord.status.includes('Finished') ? '#d4edda' : '#fff3cd', color: ord.status && ord.status.includes('Finished') ? '#155724' : '#856404', border: '1px solid #ccc', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {ord.status || 'Pending ⏳'} (Click to Change)
                          </button>
                        </div>
                        <p style={{ margin: '2px 0' }}>👤 **{ord.customerName}** ({ord.phone})</p>
                        <p style={{ margin: '2px 0', color: '#555' }}>📍 {ord.address} | 💰 ₹{ord.totalAmount}</p>
                        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
                          {ord.items && ord.items.map((item, idx) => (
                            <p key={idx} style={{ margin: '2px 0', fontSize: '0.85rem' }}>• {item.name} <span style={{ color: '#00cc99', fontWeight: 'bold' }}>(Size: {item.selectedSize})</span></p>
                          ))}
                        </div>
                      </div>
                    ))
                )}

                {adminTab === 'add_stock' && (
                  <form onSubmit={handleAddStockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#fff', padding: '20px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      {/* 🎯 Dynamic Gender & Category Selection */}
                      <select value={newStock.gender} onChange={(e) => setNewStock({ ...newStock, gender: e.target.value })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                        <option value="Men">Men</option><option value="Women">Women</option><option value="Unisex">Unisex</option>
                      </select>
                      <select value={newStock.category} onChange={handleCategoryChange} style={{ flex: 2, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                        {['T-Shirt', 'Shirt', 'Pants', 'Track Pants', 'Shorts', 'Jeans', 'Shoes', 'Belt', 'Accessories'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <input type="text" required placeholder="Product Title" value={newStock.name} onChange={(e) => setNewStock({ ...newStock, name: e.target.value })} style={{ flex: 2, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                      <input type="number" required placeholder="Price ₹" value={newStock.price} onChange={(e) => setNewStock({ ...newStock, price: e.target.value })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>
                    <input type="text" placeholder="Short Description..." value={newStock.description} onChange={(e) => setNewStock({ ...newStock, description: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />

                    {/* 🎯 Intelligent Size Checkboxes based on Category */}
                    <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '6px', backgroundColor: '#fcfcfc' }}>
                      <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '0.9rem' }}>📏 Available Sizes for {newStock.category}:</p>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        {getDynamicSizes(newStock.category).map((sz) => (
                          <label key={sz} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={newStock.sizes.includes(sz)} onChange={() => handleSizeCheckboxToggle(sz)} style={{ width: '16px', height: '16px' }} /> {sz}
                          </label>
                        ))}
                      </div>
                    </div>

                    <label style={{ border: '2px dashed #00cc99', padding: '15px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f0fdf4' }}>
                      <span style={{ fontWeight: 'bold', color: '#155724' }}>{selectedFile ? `✅ Ready: "${selectedFile.name}"` : "📸 Choose Image from Gallery"}</span>
                      <input type="file" accept="image/*" required onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />
                    </label>

                    <button type="submit" disabled={isUploading} style={{ padding: '15px', backgroundColor: isUploading ? '#ccc' : '#111', color: isUploading ? '#666' : '#00ffcc', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{isUploading ? "☁️ UPLOADING..." : "⚡ PUBLISH TO STORE"}</button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {toast.show && <div style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#111', color: '#00ffcc', padding: '14px 24px', borderRadius: '8px', fontWeight: 'bold', zIndex: 9999 }}>{toast.icon} {toast.text}</div>}
    </div>
  );
}

export default App;