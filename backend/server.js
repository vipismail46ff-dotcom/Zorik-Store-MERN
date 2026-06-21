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
// 🛡️ NEW: Admin Master PIN Verification API
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
// --- IMAGE UPLOAD API ---
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        // Cloudinary-ல் படம் சேவ் ஆனதும், அதற்கான URL-ஐ React-க்கு அனுப்புகிறோம்
        res.json({ imageUrl: req.file.path });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: 'Image upload failed!' });
    }
});

app.get('/', (req, res) => {
    res.send("Zorik E-Commerce Backend is Running!");
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟩 MongoDB Connected Successfully!'))
    .catch((err) => console.log('❌ MongoDB Connection Error:', err));
// --- CLOUDINARY & MULTER CONFIGURATION ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'zorik_products', // Cloudinary-ல் இந்த பெயரில் ஒரு போல்டர் உருவாகும்
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
    }
});

const upload = multer({ storage: storage });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`⚡ Server is running on port ${PORT}`);
});