const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const Order = require('./models/Order');
const productRoutes = require('./routes/productRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/products', productRoutes);

// ==================================================================
// 1. CLOUDINARY & MULTER CONFIG (கண்டிப்பாக இதுதான் முதலில் இருக்க வேண்டும்)
// ==================================================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'zorik_products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
    }
});

const upload = multer({ storage: storage }); // <-- எஞ்சின் இங்கே உருவாக்கப்படுகிறது

// ==================================================================
// 2. IMAGE UPLOAD ROUTE (உருவாக்கிய எஞ்சினை இப்போது பயன்படுத்துகிறோம்)
// ==================================================================
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        res.json({ imageUrl: req.file.path });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: 'Image upload failed!' });
    }
});

// ==================================================================
// 3. ADMIN & ORDERS ROUTES
// ==================================================================
app.post('/api/admin/verify', (req, res) => {
    const { pin } = req.body;
    const masterPin = process.env.ADMIN_PIN || "1234";

    if (pin === masterPin) {
        res.status(200).json({ success: true, message: "Access Granted to HQ" });
    } else {
        res.status(401).json({ success: false, message: "❌ Access Denied: Incorrect Master PIN" });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    console.log("\n📥 [CCTV] Received new order request:", req.body.customerName);
    try {
        const newOrder = new Order(req.body);
        const savedOrder = await newOrder.save();
        console.log("✅ [SUCCESS] Order saved! ID:", savedOrder.orderId);
        res.status(201).json({ success: true, order: savedOrder });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send("Zorik E-Commerce Backend is Running Live!");
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟩 MongoDB Connected Successfully!'))
    .catch((err) => console.log('❌ MongoDB Connection Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`⚡ Server is running on port ${PORT}`);
});