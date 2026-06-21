const mongoose = require('mongoose');

// உங்களுடைய MongoDB Connection String-ஐ இங்கே போடவும்
const MONGO_URI = "mongodb+srv://vipismail46ff:Ecommerce123@cluster0.eects4t.mongodb.net/ecommerce?appName=Cluster0";

// Product-க்கான ஸ்கீமா (Schema)
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    imageUrl: String
});

// மாடல் உருவாக்கம்
const Product = mongoose.model('Product', productSchema);

// நாம் டேட்டாபேஸில் ஏற்றப்போகும் 4 ஆடைகள்
const seedProducts = [
    {
        name: "Classic Black T-Shirt",
        price: 499,
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80"
    },
    {
        name: "Vintage Oversized Tee",
        price: 699,
        imageUrl: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&q=80"
    },
    {
        name: "Casual Check Shirt",
        price: 899,
        imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e32f85e23?w=500&q=80"
    },
    {
        name: "Men's Denim Shirt",
        price: 999,
        imageUrl: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&q=80"
    }
];

// டேட்டாபேஸில் இணைக்கும் ஃபங்ஷன்
const seedDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ MongoDB Connected for Seeding...");

        await Product.deleteMany(); // பழைய டேட்டா இருந்தால் அழித்துவிடும்
        console.log("🧹 Old products cleared!");
        await Product.insertMany(seedProducts); // புதிய டேட்டாவை சேர்க்கும்
        console.log("🏆 New products seeded successfully!");

        mongoose.connection.close(); // வேலையை முடித்ததும் இணைப்பைத் துண்டிக்கும்
    } catch (err) {
        console.error("❌ பிழை:", err);
    }
};

// ஃபங்ஷனை இயக்குதல்
seedDB();