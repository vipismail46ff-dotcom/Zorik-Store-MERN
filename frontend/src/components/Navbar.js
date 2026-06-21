import React from 'react';

function Navbar({ cartCount = 0, onOpenCart, onOpenAdmin }) {
    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 50px',
            backgroundColor: '#111',
            color: 'white',
            fontFamily: 'sans-serif'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h2 style={{ margin: 0, letterSpacing: '2px' }}>Zorik.</h2>

                {/* <-- NEW: Admin Button --> */}
                <span
                    onClick={onOpenAdmin}
                    style={{ fontSize: '0.75rem', backgroundColor: '#222', border: '1px solid #444', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', color: '#ffcc00', fontWeight: 'bold', letterSpacing: '1px' }}
                >
                    ADMIN ⚙️
                </span>
            </div>

            <div>
                <span style={{ marginRight: '20px', cursor: 'pointer' }}>Home</span>
                <span style={{ marginRight: '20px', cursor: 'pointer' }}>Shop</span>
                <span onClick={onOpenCart} style={{ cursor: 'pointer', fontWeight: 'bold', color: '#00ffcc' }}>
                    Cart ({cartCount}) 🛒
                </span>
            </div>
        </nav>
    );
}

export default Navbar;