import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [products, setProducts] = useState([]);

  // 🎯 LocalStorage Cart Integration
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('zorik_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [toast, setToast] = useState({ show: false, text: '', icon: '' });

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => localStorage.getItem('zorik_boss_unlocked') === 'true');
  const [pinInput, setPinInput] = useState('');
  const [adminTab, setAdminTab] = useState('inventory');

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [newStock, setNewStock] = useState({
    name: '', price: '', description: '', gender: 'Men', category: 'T-Shirt', countInStock: '25', sizes: [], highlights: ['']
  });
  const [isUploading, setIsUploading] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSizeForProduct, setSelectedSizeForProduct] = useState("");

  useEffect(() => {
    localStorage.setItem('zorik_cart', JSON.stringify(cart));
  }, [cart]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://zorik-backend-api.onrender.com/api/products');
      if (Array.isArray(response.data)) setProducts(response.data.reverse());
    } catch (err) { } finally { setLoading(false); }
  };

  // 🎯 FIX 1: Safe Array check for Admin Orders fetching
  const fetchAdminOrders = async () => {
    setAdminLoading(true);
    try {
      const response = await axios.get('https://zorik-backend-api.onrender.com/api/orders');
      if (Array.isArray(response.data)) {
        setAdminOrders(response.data.reverse());
      } else if (response.data && Array.isArray(response.data.orders)) {
        setAdminOrders(response.data.orders.reverse());
      } else {
        setAdminOrders([]);
      }
    } catch (err) {
      console.error("Fetch Admin Orders Failed:", err);
      setAdminOrders([]);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    if (isAdminUnlocked) fetchAdminOrders();
  }, [isAdminUnlocked]);

  const triggerToast = (text, icon = '🛍️') => {
    setToast({ show: true, text, icon });
    setTimeout(() => setToast({ show: false, text: '', icon: '' }), 3000);
  };

  const parseProductData = (prod) => {
    try {
      if (prod.description && prod.description.startsWith('{')) {
        const parsed = JSON.parse(prod.description);
        return { ...prod, richText: parsed.text, images: parsed.images || [prod.imageUrl], highlights: parsed.highlights || [] };
      }
    } catch (e) { }
    return { ...prod, richText: prod.description, images: [prod.imageUrl], highlights: [] };
  };

  const handleAddToCart = (product, size) => {
    if (product.countInStock <= 0) return alert("🚫 Sorry! Sold Out.");
    if (product.sizes && product.sizes.length > 0 && !size) return alert("⚠️ Please select your Size first!");

    const cartItem = { ...product, selectedSize: size || 'Standard', cartId: Math.random() };
    setCart([...cart, cartItem]);
    triggerToast(`Added "${product.name}" to cart!`, '🛒');
  };

  const handleBuyNow = (product, size) => {
    if (product.sizes && product.sizes.length > 0 && !size) return alert("⚠️ Please select your Size first!");
    handleAddToCart(product, size);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  // 🎯 FIX 2: Clean Items array & structure to satisfy Mongoose Order Schema rules perfectly
  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    const randomOrderId = "ZK" + Math.floor(100000 + Math.random() * 900000);
    const cartTotal = cart.reduce((sum, item) => sum + Number(item.price), 0);

    // Filtering out local UI properties (richText, images, highlights) to avoid Mongoose 400 error
    const cleanedItems = cart.map(item => ({
      name: item.name,
      price: Number(item.price),
      description: typeof item.description === 'string' ? item.description : "Zorik Premium Fit",
      imageUrl: item.imageUrl || item.images[0],
      category: item.category || "Zorik Live Collection"
    }));

    const orderData = {
      orderId: randomOrderId,
      customerName: customer.name,
      phone: customer.phone,
      address: customer.address,
      items: cleanedItems,
      totalAmount: cartTotal
      // Omitted status emoji to prevent strict backend enum validation crash
    };

    try {
      await axios.post('https://zorik-backend-api.onrender.com/api/orders', orderData);
      setCart([]);
      localStorage.removeItem('zorik_cart');
      setIsCheckoutOpen(false);
      setCustomer({ name: '', phone: '', address: '' });
      triggerToast("Order Placed Successfully! 🎉", "✅");
      fetchProducts();
      fetchAdminOrders(); // Refresh Admin list instantly!
    } catch (err) {
      console.error("Order Pipeline Blocked:", err);
      alert("Database Refused Order! Check console fields.");
    }
  };

  // 🎯 FIX 3: Permanent Instant DB Deletion to avoid Page Reload Return Bugs
  const handleDeleteStockClick = async (prod) => {
    if (!window.confirm(`⚠️ Are you sure you want to permanently delete "${prod.name}" from Live Cloud?`)) return;

    // Instant UI optimization
    setProducts(prev => prev.filter(p => p._id !== prod._id));
    triggerToast("Deleting from Cloud Database...", "⏳");

    try {
      await axios.delete(`https://zorik-backend-api.onrender.com/api/products/${prod._id}`);
      triggerToast("Product deleted permanently!", "🗑️");
    } catch (err) {
      console.error("DB Delete Blocked:", err);
      alert("Failed to delete from Cloud Server!");
      fetchProducts(); // rollback UI on error
    }
  };

  const toggleOrderStatus = async (orderId, currentStatus) => {
    const newStatus = currentStatus && currentStatus.includes('Pending') ? 'Finished' : 'Pending';
    setAdminOrders(adminOrders.map(ord => ord._id === orderId ? { ...ord, status: newStatus } : ord));
    triggerToast(`Order status updated!`, "📦");
    axios.put(`https://zorik-backend-api.onrender.com/api/orders/${orderId}`, { status: newStatus }).catch(() => { });
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("⚠️ Delete this order permanently?")) return;
    setAdminOrders(adminOrders.filter(o => o._id !== orderId));
    triggerToast("Order deleted", "🗑️");
    axios.delete(`https://zorik-backend-api.onrender.com/api/orders/${orderId}`).catch(() => { });
  };

  const handleAddStockSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return alert("Please select at least 1 image!");
    if (newStock.sizes.length === 0) return alert("Please select at least one available size!");

    setIsUploading(true);
    triggerToast("Uploading multiple images to Cloud... ☁️", "⏳");

    try {
      const uploadedUrls = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const formData = new FormData();
        formData.append('image', selectedFiles[i]);
        const res = await axios.post('https://zorik-backend-api.onrender.com/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploadedUrls.push(res.data.imageUrl);
      }

      const richDescription = JSON.stringify({
        text: newStock.description,
        images: uploadedUrls,
        highlights: newStock.highlights.filter(h => h.trim() !== '')
      });

      const productData = {
        name: newStock.name, price: Number(newStock.price), description: richDescription,
        imageUrl: uploadedUrls[0], category: `${newStock.gender} | ${newStock.category}`,
        countInStock: Number(newStock.countInStock || 0), sizes: newStock.sizes, colors: ['Standard']
      };

      await axios.post('https://zorik-backend-api.onrender.com/api/products', productData);
      triggerToast("✨ Amazon-Style Product Published!", "📦");
      setNewStock({ name: '', price: '', description: '', gender: 'Men', category: 'T-Shirt', countInStock: '25', sizes: [], highlights: [''] });
      setSelectedFiles([]); setIsUploading(false); fetchProducts();
    } catch (err) { alert("Failed to upload stock!"); setIsUploading(false); }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeFilter === 'All' || (product.category && product.category.includes(activeFilter));
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', paddingBottom: '70px', margin: 0 }}>

      <header style={{ position: 'sticky', top: 0, zIndex: 1000, backgroundColor: 'rgba(15, 15, 15, 0.92)', backdropFilter: 'blur(12px)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 25px rgba(0,0,0,0.18)' }}>
        <div onClick={() => { setSearchQuery(''); setActiveFilter('All'); }} style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '1.6rem', fontWeight: '900', letterSpacing: '2.5px', background: 'linear-gradient(45deg, #ffffff, #00ffcc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ZORIK.</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => setIsCartOpen(true)} style={{ backgroundColor: '#222', border: '1px solid #333', padding: '8px 15px', borderRadius: '25px', color: '#00ffcc', fontWeight: '800', cursor: 'pointer' }}>
            🛒 Cart <span style={{ backgroundColor: '#00ffcc', color: '#111', borderRadius: '50%', padding: '1px 7px', fontSize: '0.75rem' }}>{cart.length}</span>
          </button>
          <button onClick={() => setIsAdminOpen(true)} style={{ backgroundColor: isAdminUnlocked ? '#00cc99' : '#2a2a2a', border: '1px solid #444', padding: '8px 12px', borderRadius: '8px', color: isAdminUnlocked ? '#111' : '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            {isAdminUnlocked ? '⚡ HQ' : '🔒 Admin'}
          </button>
        </div>
      </header>

      <div style={{ textAlign: 'center', margin: '35px 0 20px 0', padding: '0 15px' }}>
        <h1 style={{ fontSize: '2.6rem', color: '#111', margin: '0 0 8px 0', fontWeight: '900', letterSpacing: '-0.5px' }}>Welcome to Zorik.</h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '35px', padding: '0 15px' }}>
        {['All', 'Men', 'Women', 'Unisex', 'T-Shirt', 'Shirt', 'Shoes', 'Pants'].map(cat => (
          <button key={cat} onClick={() => setActiveFilter(cat)} style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: activeFilter === cat ? '#111' : '#e9ecef', color: activeFilter === cat ? '#00ffcc' : '#333', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem' }}>{cat}</button>
        ))}
      </div>

      <div style={{ width: '90%', margin: '0 auto', textAlign: 'center' }}>
        {loading && <h3 style={{ color: '#0055ff' }}>⏳ Fetching Drops...</h3>}

        <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {filteredProducts.map((rawProduct) => {
            const product = parseProductData(rawProduct);
            const stock = Number(product.countInStock || 0);
            const isSoldOut = stock <= 0;

            return (
              <div key={product._id} onClick={() => { setSelectedProduct(product); setActiveImageIndex(0); setSelectedSizeForProduct(""); }} style={{ backgroundColor: 'white', padding: '14px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', width: '240px', textAlign: 'left', cursor: 'pointer', position: 'relative', opacity: isSoldOut ? 0.75 : 1 }}>
                {isSoldOut && <div style={{ position: 'absolute', top: '140px', left: 0, width: '100%', backgroundColor: '#ff3333', color: 'white', textAlign: 'center', padding: '8px 0', fontWeight: '900', letterSpacing: '4px', zIndex: 3 }}>SOLD OUT</div>}
                <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '12px', filter: isSoldOut ? 'grayscale(85%)' : 'none', backgroundColor: '#f0f0f0' }} />
                <h3 style={{ fontSize: '1.15rem', margin: '14px 0 4px 0', color: '#111', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h3>
                <p style={{ color: '#111', fontWeight: '900', fontSize: '1.25rem', margin: '5px 0' }}>₹{product.price}</p>
                <button style={{ padding: '10px 0', backgroundColor: '#f5f5f5', color: '#111', border: '1.5px solid #111', borderRadius: '8px', width: '100%', fontWeight: '900', fontSize: '0.85rem' }}>View Details 👁️</button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'white', zIndex: 3000, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
            <span style={{ fontWeight: '900', fontSize: '1.2rem', color: '#111' }}>{selectedProduct.category}</span>
            <button onClick={() => setSelectedProduct(null)} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '35px', height: '35px', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', padding: '20px', gap: '30px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <img src={selectedProduct.images[activeImageIndex]} alt="" style={{ width: '100%', height: '500px', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
              {selectedProduct.images.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                  {selectedProduct.images.map((img, idx) => (
                    <img key={idx} src={img} onClick={() => setActiveImageIndex(idx)} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: activeImageIndex === idx ? '3px solid #111' : '1px solid #ddd', opacity: activeImageIndex === idx ? 1 : 0.6 }} />
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', color: '#111', lineHeight: '1.2' }}>{selectedProduct.name}</h1>
              <p style={{ margin: 0, fontSize: '1.1rem', color: '#555', lineHeight: '1.6' }}>{selectedProduct.richText}</p>
              <div style={{ display: 'flex', alignItems: 'end', gap: '15px' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#111' }}>₹{selectedProduct.price}</span>
              </div>

              {selectedProduct.highlights && selectedProduct.highlights.length > 0 && (
                <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: '900' }}>Top Highlights</h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#333', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedProduct.highlights.map((point, idx) => (
                      <li key={idx} style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '15px' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '900' }}>Select Size:</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {selectedProduct.sizes.map(sz => (
                    <button key={sz} onClick={() => setSelectedSizeForProduct(sz)} style={{ padding: '12px 20px', borderRadius: '8px', border: selectedSizeForProduct === sz ? '2px solid #111' : '1px solid #ccc', backgroundColor: selectedSizeForProduct === sz ? '#111' : '#fff', color: selectedSizeForProduct === sz ? '#fff' : '#111', fontWeight: 'bold', fontSize: '1rem' }}>{sz}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                <button onClick={() => handleAddToCart(selectedProduct, selectedSizeForProduct)} style={{ flex: 1, padding: '16px', backgroundColor: '#fff', color: '#111', border: '2px solid #111', borderRadius: '12px', fontWeight: '900', fontSize: '1.1rem' }}>ADD TO CART 🛒</button>
                <button onClick={() => handleBuyNow(selectedProduct, selectedSizeForProduct)} style={{ flex: 1, padding: '16px', backgroundColor: '#ff9900', color: '#111', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '1.1rem' }}>BUY NOW ⚡</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '380px', maxWidth: '90vw', height: '100vh', backgroundColor: 'white', boxShadow: '-8px 0 30px rgba(0,0,0,0.2)', padding: '24px', zIndex: 4000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f0f0', paddingBottom: '14px' }}><h2 style={{ margin: 0, fontWeight: '900' }}>Cart ({cart.length})</h2><button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button></div>
          <div style={{ marginTop: '20px', flexGrow: 1, overflowY: 'auto' }}>
            {cart.map((item) => (
              <div key={item.cartId} style={{ display: 'flex', gap: '15px', marginBottom: '16px', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                <img src={parseProductData(item).images[0]} onClick={() => { setIsCartOpen(false); setSelectedProduct(parseProductData(item)); }} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{item.name}</h4>
                  <p style={{ margin: '4px 0', color: '#888', fontSize: '0.85rem' }}>Size: <strong>{item.selectedSize}</strong></p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontWeight: '900' }}>₹{item.price}</p>
                    <button onClick={() => { setCart(cart.filter((c) => c.cartId !== item.cartId)); triggerToast("Removed", "🗑️"); }} style={{ color: '#ff3333', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '1.3rem', marginBottom: '18px' }}><span>Total:</span><span>₹{cart.reduce((sum, item) => sum + Number(item.price), 0)}</span></div>
            <button disabled={cart.length === 0} onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} style={{ width: '100%', padding: '16px', backgroundColor: cart.length === 0 ? '#ccc' : '#111', color: cart.length === 0 ? '#666' : '#00ffcc', fontWeight: '900', border: 'none', borderRadius: '12px', fontSize: '1rem' }}>PROCEED TO CHECKOUT</button>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5000, backdropFilter: 'blur(5px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '400px', maxWidth: '85vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px' }}><h2 style={{ margin: 0 }}>Shipping Info</h2><button onClick={() => setIsCheckoutOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button></div>
            <form onSubmit={handleConfirmOrder} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <input type="text" required placeholder="Full Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
              <input type="tel" required placeholder="Phone Number" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
              <textarea required rows="3" placeholder="Delivery Address..." value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
              <button type="submit" style={{ padding: '16px', backgroundColor: '#111', color: '#00ffcc', fontWeight: '900', border: 'none', borderRadius: '8px', fontSize: '1rem' }}>CONFIRM ORDER 🚀</button>
            </form>
          </div>
        </div>
      )}

      {isAdminOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 6000 }}>
          {!isAdminUnlocked ? (
            <div style={{ backgroundColor: '#111', padding: '40px', borderRadius: '18px', textAlign: 'center', width: '340px' }}>
              <h2 style={{ color: '#00ffcc', margin: '0 0 20px 0', letterSpacing: '2px' }}>BOSS HQ</h2>
              <form onSubmit={async (e) => { e.preventDefault(); try { const res = await axios.post('https://zorik-backend-api.onrender.com/api/admin/verify', { pin: pinInput }); if (res.data.success) { setIsAdminUnlocked(true); localStorage.setItem('zorik_boss_unlocked', 'true'); triggerToast("Unlocked 🔓", "🛡️"); } } catch (e) { alert("Wrong PIN") } }}>
                <input type="password" required autoFocus placeholder="••••" maxLength="6" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={{ width: '80%', padding: '14px', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '8px', borderRadius: '10px', backgroundColor: '#222', color: '#00ffcc', marginBottom: '18px', border: '1px solid #444' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setIsAdminOpen(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#333', color: '#aaa', border: 'none', borderRadius: '8px' }}>CANCEL</button>
                  <button type="submit" style={{ flex: 1, padding: '14px', backgroundColor: '#00ffcc', color: '#111', border: 'none', borderRadius: '8px', fontWeight: '900' }}>UNLOCK</button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ backgroundColor: '#f4f6f8', padding: '25px', borderRadius: '16px', width: '780px', maxWidth: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ddd', paddingBottom: '14px', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontWeight: '900' }}>🏢 Zorik Boss HQ</h2>
                <button onClick={() => setIsAdminOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', overflowX: 'auto' }}>
                <button onClick={() => setAdminTab('inventory')} style={{ flex: 1, padding: '12px', fontWeight: '800', backgroundColor: adminTab === 'inventory' ? '#111' : '#e0e0e0', color: adminTab === 'inventory' ? '#00ffcc' : '#333', border: 'none', borderRadius: '8px' }}>📦 INVENTORY</button>
                <button onClick={() => setAdminTab('orders')} style={{ flex: 1, padding: '12px', fontWeight: '800', backgroundColor: adminTab === 'orders' ? '#111' : '#e0e0e0', color: adminTab === 'orders' ? '#00ffcc' : '#333', border: 'none', borderRadius: '8px' }}>📥 LIVE ORDERS ({adminOrders.length})</button>
                <button onClick={() => setAdminTab('add_stock')} style={{ flex: 1, padding: '12px', fontWeight: '800', backgroundColor: adminTab === 'add_stock' ? '#111' : '#e0e0e0', color: adminTab === 'add_stock' ? '#00ffcc' : '#333', border: 'none', borderRadius: '8px' }}>➕ NEW STOCK</button>
              </div>

              <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '6px' }}>
                {adminTab === 'inventory' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {products.map(rawProd => {
                      const prod = parseProductData(rawProd);
                      return (
                        <div key={prod._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <img src={prod.images[0]} alt="" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover' }} />
                            <div><h4 style={{ margin: 0, fontSize: '0.95rem' }}>{prod.name}</h4><p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#777' }}>₹{prod.price} | Stock: {prod.countInStock}</p></div>
                          </div>
                          <button onClick={() => handleDeleteStockClick(prod)} style={{ backgroundColor: '#ffe5e5', color: '#d9534f', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>🗑️ Del</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {adminTab === 'orders' && (
                  adminLoading ? <p style={{ textAlign: 'center' }}>⏳ Loading Cloud Orders...</p> :
                    adminOrders.length === 0 ? <p style={{ textAlign: 'center', color: '#777' }}>No orders placed yet.</p> :
                      adminOrders.map((ord) => (
                        <div key={ord._id} style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '18px', marginBottom: '16px', backgroundColor: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                            <span style={{ fontWeight: '900' }}>Order #{ord.orderId}</span>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button onClick={() => toggleOrderStatus(ord._id, ord.status)} style={{ backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ccc', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem' }}>
                                {ord.status || 'Order Placed'} ⏳
                              </button>
                              <button onClick={() => deleteOrder(ord._id)} style={{ backgroundColor: '#ffe5e5', color: '#d9534f', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Delete</button>
                            </div>
                          </div>
                          <p style={{ margin: '2px 0' }}>👤 <strong>{ord.customerName}</strong> ({ord.phone})</p>
                          <p style={{ margin: '2px 0', color: '#555' }}>📍 {ord.address} | 💰 <strong>₹{ord.totalAmount}</strong></p>
                        </div>
                      ))
                )}

                {adminTab === 'add_stock' && (
                  <form onSubmit={handleAddStockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <input type="text" required placeholder="Product Title" value={newStock.name} onChange={(e) => setNewStock({ ...newStock, name: e.target.value })} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
                      <input type="number" required placeholder="Price ₹" value={newStock.price} onChange={(e) => setNewStock({ ...newStock, price: e.target.value })} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
                    </div>

                    <textarea placeholder="Overall Description..." value={newStock.description} onChange={(e) => setNewStock({ ...newStock, description: e.target.value })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} />

                    <div style={{ border: '1px solid #ccc', padding: '14px', borderRadius: '8px', backgroundColor: '#fcfcfc' }}>
                      <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '0.9rem' }}>✨ Top Highlights (Amazon Style):</p>
                      {newStock.highlights.map((point, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '1.2rem', color: '#888' }}>•</span>
                          <input type="text" placeholder={`Highlight feature ${index + 1}...`} value={point} onChange={(e) => { const newH = [...newStock.highlights]; newH[index] = e.target.value; setNewStock({ ...newStock, highlights: newH }) }} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
                        </div>
                      ))}
                      <button type="button" onClick={() => setNewStock({ ...newStock, highlights: [...newStock.highlights, ''] })} style={{ padding: '6px 12px', backgroundColor: '#e9ecef', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>+ Add Bullet Point</button>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                      <select value={newStock.gender} onChange={(e) => setNewStock({ ...newStock, gender: e.target.value })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}>
                        <option value="Men">Men</option><option value="Women">Women</option><option value="Unisex">Unisex</option>
                      </select>
                      <select value={newStock.category} onChange={(e) => setNewStock({ ...newStock, category: e.target.value, sizes: [] })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}>
                        {['T-Shirt', 'Shirt', 'Pants', 'Track Pants', 'Shorts', 'Jeans', 'Shoes', 'Belt'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input type="number" required placeholder="Stock Qty" value={newStock.countInStock} onChange={(e) => setNewStock({ ...newStock, countInStock: e.target.value })} style={{ width: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
                    </div>

                    <label style={{ border: '2px dashed #00cc99', padding: '20px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', backgroundColor: '#f0fdf4' }}>
                      <span style={{ fontWeight: 'bold', color: '#155724' }}>
                        {selectedFiles.length > 0 ? `✅ ${selectedFiles.length} Images Selected` : "📸 Select MULTIPLE Images for Carousel"}
                      </span>
                      <input type="file" accept="image/*" multiple required onChange={(e) => setSelectedFiles(Array.from(e.target.files))} style={{ display: 'none' }} />
                    </label>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <input type="text" placeholder="Sizes separated by comma (S, M, L)" onChange={(e) => setNewStock({ ...newStock, sizes: e.target.value.split(',').map(s => s.trim()) })} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
                    </div>

                    <button type="submit" disabled={isUploading} style={{ padding: '16px', backgroundColor: isUploading ? '#ccc' : '#111', color: isUploading ? '#666' : '#00ffcc', fontWeight: '900', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>{isUploading ? "☁️ UPLOADING..." : "⚡ PUBLISH TO LIVE STORE"}</button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {toast.show && <div style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#111', color: '#00ffcc', padding: '14px 24px', borderRadius: '10px', fontWeight: '900', zIndex: 9999 }}>{toast.icon} {toast.text}</div>}
    </div>
  );
}

export default App;