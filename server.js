const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-writer').createObjectCsvWriter;
const moment = require('moment');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Session management
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './'
    }),
    secret: 'dhaka-market-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/admin-login');
    }
}

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Database initialization
const db = new sqlite3.Database('./database.db');

// Initialize database tables
db.serialize(() => {
    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        price REAL NOT NULL,
        offer_price REAL,
        images TEXT,
        description TEXT,
        features TEXT,
        category TEXT,
        subcategory TEXT,
        brand TEXT,
        stock INTEGER DEFAULT 100,
        status TEXT DEFAULT 'active',
        views INTEGER DEFAULT 0,
        sales INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        shipping_area TEXT,
        quantity INTEGER DEFAULT 1,
        product_id INTEGER,
        product_name TEXT,
        unit_price REAL,
        total REAL,
        discount REAL DEFAULT 0,
        shipping_cost REAL DEFAULT 0,
        grand_total REAL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'cod',
        payment_status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    // Categories table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        image TEXT,
        description TEXT,
        parent_id INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'admin',
        permissions TEXT,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Customers table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        address TEXT,
        total_orders INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert default admin user if not exists
    db.get("SELECT COUNT(*) as count FROM admin_users", (err, row) => {
        if (row.count === 0) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run(`INSERT INTO admin_users (username, password, email, role) VALUES (?, ?, ?, ?)`, 
                ['admin', hashedPassword, 'admin@dhakamarket.com', 'superadmin']);
        }
    });

    // Insert default settings
    const defaultSettings = [
        ['site_name', 'Dhaka Market'],
        ['site_email', 'info@dhakamarket.com'],
        ['site_phone', '+8801234567890'],
        ['site_address', 'Dhaka, Bangladesh'],
        ['shipping_inside_dhaka', '80'],
        ['shipping_outside_dhaka', '150'],
        ['currency', 'BDT'],
        ['currency_symbol', '৳'],
        ['whatsapp_number', '8801234567890'],
        ['facebook_url', 'https://facebook.com/dhakamarket'],
        ['instagram_url', 'https://instagram.com/dhakamarket'],
        ['return_policy', '7 days return policy'],
        ['cod_enabled', 'true'],
        ['maintenance_mode', 'false']
    ];

    defaultSettings.forEach(setting => {
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, setting);
    });

    // Insert sample categories
    const categories = [
        ['Electronics', 'electronics', 'Mobile phones, laptops, gadgets'],
        ['Fashion', 'fashion', 'Clothing, shoes, accessories'],
        ['Home Appliances', 'home-appliances', 'Home and kitchen appliances'],
        ['Beauty', 'beauty', 'Cosmetics, skincare, haircare'],
        ['Sports', 'sports', 'Sports equipment and accessories'],
        ['Books', 'books', 'Books and stationery'],
        ['Toys', 'toys', 'Toys and games']
    ];

    categories.forEach(cat => {
        db.run(`INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)`, cat);
    });

    // Insert sample products
    const products = [
        ['Professional Hair Trimmer Pro Max', 'professional-hair-trimmer-pro-max', 1999, 899,
         JSON.stringify(['https://images.unsplash.com/photo-1598490960012-7f5d5a43d5b8?w=600&h=600', 
                         'https://images.unsplash.com/photo-1519207603886-7b6d0efc79e0?w=600&h=600']),
         'Premium cordless hair trimmer with 3 comb guards. Perfect for home use with waterproof design.',
         JSON.stringify(['Cordless', 'USB-C Charging', 'Waterproof', '1 Year Warranty', '3 Comb Guards', '60min Runtime']),
         'beauty', null, 'Remington', 50],
        
        ['Smart Watch X1', 'smart-watch-x1', 4500, 3499,
         JSON.stringify(['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600',
                         'https://images.unsplash.com/photo-1579586337278-3fc42608b529?w=600&h=600']),
         'Smart watch with heart rate monitor, GPS, and 7 days battery life.',
         JSON.stringify(['Heart Rate Monitor', 'GPS Tracking', 'Waterproof IP68', '7 Days Battery', 'Sleep Tracking', 'Call Notifications']),
         'electronics', null, 'Amazfit', 30],
        
        ['Wireless Earbuds Pro', 'wireless-earbuds-pro', 3500, 2499,
         JSON.stringify(['https://images.unsplash.com/photo-1590658165737-15a047b8b5e8?w=600&h=600',
                         'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600']),
         'Wireless earbuds with active noise cancellation and 24h battery life.',
         JSON.stringify(['Active Noise Cancellation', '24h Battery Life', 'Bluetooth 5.0', 'IPX4 Waterproof', 'Touch Controls', 'Voice Assistant']),
         'electronics', null, 'Soundcore', 40],
        
        ['Casual T-Shirt Pack', 'casual-t-shirt-pack', 1200, 899,
         JSON.stringify(['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600',
                         'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600&h=600']),
         'Pack of 3 premium cotton t-shirts in different colors.',
         JSON.stringify(['100% Cotton', 'Pack of 3', 'Machine Washable', 'Available in M, L, XL', 'Color Fast']),
         'fashion', null, 'Easy', 100],
        
        ['Electric Kettle', 'electric-kettle', 1800, 1299,
         JSON.stringify(['https://images.unsplash.com/photo-1579972383661-fbbf67b7d5d4?w=600&h=600',
                         'https://images.unsplash.com/photo-1581674210503-d1e0a9d41b57?w=600&h=600']),
         '1.5L electric kettle with auto shut-off and boil-dry protection.',
         JSON.stringify(['1.5L Capacity', 'Auto Shut-off', 'Boil-dry Protection', '360° Rotating Base', 'Stainless Steel']),
         'home-appliances', null, 'Prestige', 25]
    ];

    products.forEach(p => {
        db.run(`INSERT OR IGNORE INTO products (name, slug, price, offer_price, images, description, features, category, subcategory, brand, stock) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, p);
    });
});

// Helper functions
function formatPrice(price) {
    return '৳' + parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function formatPhone(phone) {
    let num = phone.toString().replace(/\D/g, '');
    
    if (num.startsWith('880')) num = num.substring(3);
    if (num.startsWith('+880')) num = num.substring(4);
    if (num.startsWith('88')) num = num.substring(2);
    
    if (num.length === 10) num = '0' + num;
    if (num.length === 11 && num.startsWith('0')) return num;
    if (num.length === 11 && !num.startsWith('0')) return '0' + num.substring(1);
    
    return num;
}

function generateOrderId() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return 'DM' + timestamp.slice(-6) + random;
}

// MOBILE OPTIMIZED ROUTES
// Home page - Mobile Optimized
app.get('/', (req, res) => {
    db.all("SELECT * FROM products WHERE status = 'active' ORDER BY sales DESC LIMIT 8", (err, products) => {
        db.all("SELECT * FROM categories WHERE status = 'active' LIMIT 6", (err, categories) => {
            let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#ff6b6b">
    <title>Dhaka Market - Best Online Shopping in Bangladesh</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        /* Mobile First Design */
        * {
            -webkit-tap-highlight-color: transparent;
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f7fb;
            color: #333;
            padding-bottom: 80px; /* Space for bottom navbar */
        }
        
        /* Mobile Navigation */
        .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            display: flex;
            justify-content: space-around;
            padding: 10px 0;
            box-shadow: 0 -2px 20px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-decoration: none;
            color: #666;
            font-size: 12px;
            flex: 1;
            padding: 5px;
        }
        
        .mobile-nav-item.active {
            color: #ff6b6b;
        }
        
        .mobile-nav-icon {
            font-size: 20px;
            margin-bottom: 4px;
        }
        
        /* Header for mobile */
        .mobile-header {
            background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
            color: white;
            padding: 15px;
            position: sticky;
            top: 0;
            z-index: 999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .mobile-header h1 {
            font-size: 1.4rem;
            margin: 0;
            font-weight: 600;
        }
        
        /* Mobile Product Cards */
        .mobile-product-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            transition: transform 0.2s;
        }
        
        .mobile-product-card:active {
            transform: scale(0.98);
        }
        
        .mobile-product-img {
            width: 100%;
            height: 180px;
            object-fit: cover;
        }
        
        .mobile-product-info {
            padding: 12px;
        }
        
        .mobile-product-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 5px;
            height: 36px;
            overflow: hidden;
            line-height: 1.2;
        }
        
        .mobile-product-price {
            font-size: 16px;
            font-weight: 700;
            color: #ff6b6b;
            margin-bottom: 8px;
        }
        
        .mobile-old-price {
            font-size: 12px;
            color: #999;
            text-decoration: line-through;
            margin-right: 5px;
        }
        
        /* Mobile Buttons */
        .mobile-btn {
            display: block;
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            text-decoration: none;
            margin: 8px 0;
            transition: all 0.2s;
        }
        
        .mobile-btn:active {
            transform: scale(0.98);
        }
        
        .mobile-btn-primary {
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
            color: white;
        }
        
        .mobile-btn-secondary {
            background: #f8f9fa;
            color: #333;
            border: 1px solid #dee2e6;
        }
        
        /* Mobile Category Cards */
        .mobile-category-card {
            background: white;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .mobile-category-icon {
            font-size: 28px;
            color: #ff6b6b;
            margin-bottom: 8px;
        }
        
        .mobile-category-name {
            font-size: 13px;
            font-weight: 600;
            color: #333;
        }
        
        /* Mobile Search */
        .mobile-search {
            padding: 15px;
            background: white;
            margin-bottom: 10px;
        }
        
        .mobile-search input {
            height: 45px;
            font-size: 16px;
            border-radius: 8px;
            padding-left: 45px;
        }
        
        .mobile-search .fa-search {
            position: absolute;
            left: 25px;
            top: 50%;
            transform: translateY(-50%);
            color: #666;
            z-index: 10;
        }
        
        /* Mobile Product Grid */
        .mobile-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            padding: 15px;
        }
        
        /* Mobile Hero Section */
        .mobile-hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            margin-bottom: 20px;
            border-radius: 0 0 20px 20px;
        }
        
        .mobile-hero h2 {
            font-size: 1.6rem;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        /* Mobile Features */
        .mobile-features {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            padding: 20px 15px;
            background: white;
            margin: 20px 15px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .mobile-feature {
            text-align: center;
        }
        
        .mobile-feature-icon {
            font-size: 22px;
            color: #ff6b6b;
            margin-bottom: 5px;
        }
        
        .mobile-feature-text {
            font-size: 11px;
            color: #666;
        }
        
        /* Mobile Footer */
        .mobile-footer {
            background: #2c3e50;
            color: white;
            padding: 30px 20px;
            margin-top: 30px;
            text-align: center;
        }
        
        /* Mobile Modal Styles */
        .mobile-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }
        
        .mobile-modal-content {
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            animation: modalSlideUp 0.3s ease;
        }
        
        @keyframes modalSlideUp {
            from {
                transform: translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        /* Mobile Order Form */
        .mobile-form-group {
            margin-bottom: 15px;
        }
        
        .mobile-form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            font-size: 14px;
            color: #333;
        }
        
        .mobile-form-input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            background: white;
        }
        
        .mobile-form-input:focus {
            border-color: #ff6b6b;
            outline: none;
        }
        
        /* Mobile Quantity Selector */
        .mobile-quantity {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 20px 0;
        }
        
        .mobile-quantity-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #ff6b6b;
            color: white;
            border: none;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .mobile-quantity-input {
            width: 60px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 5px;
            background: white;
        }
        
        /* Mobile Order Summary */
        .mobile-order-summary {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .mobile-summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .mobile-summary-total {
            font-size: 18px;
            font-weight: 700;
            color: #ff6b6b;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
        }
        
        /* Whatsapp Float Button */
        .whatsapp-float {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: #25D366;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            z-index: 999;
            box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
            text-decoration: none;
        }
        
        /* Loading Spinner */
        .mobile-loading {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.9);
            z-index: 10000;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #ff6b6b;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Responsive adjustments */
        @media (min-width: 768px) {
            .mobile-grid {
                grid-template-columns: repeat(3, 1fr);
            }
            
            .mobile-nav {
                display: none;
            }
            
            body {
                padding-bottom: 0;
            }
            
            .mobile-header {
                display: none;
            }
        }
        
        @media (min-width: 992px) {
            .mobile-grid {
                grid-template-columns: repeat(4, 1fr);
            }
        }
    </style>
</head>
<body>
    <!-- Mobile Header -->
    <div class="mobile-header">
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <h1><i class="fas fa-store me-2"></i>Dhaka Market</h1>
            </div>
            <div>
                <a href="/admin-login" class="text-white">
                    <i class="fas fa-user"></i>
                </a>
            </div>
        </div>
    </div>
    
    <!-- Mobile Hero Section -->
    <div class="mobile-hero">
        <h2>Welcome to Dhaka Market</h2>
        <p>Best Online Shopping in Bangladesh</p>
        <a href="#products" class="mobile-btn mobile-btn-primary">
            <i class="fas fa-shopping-cart me-2"></i>Shop Now
        </a>
    </div>
    
    <!-- Mobile Features -->
    <div class="mobile-features">
        <div class="mobile-feature">
            <div class="mobile-feature-icon">
                <i class="fas fa-shipping-fast"></i>
            </div>
            <div class="mobile-feature-text">Fast Delivery</div>
        </div>
        <div class="mobile-feature">
            <div class="mobile-feature-icon">
                <i class="fas fa-money-bill-wave"></i>
            </div>
            <div class="mobile-feature-text">Cash on Delivery</div>
        </div>
        <div class="mobile-feature">
            <div class="mobile-feature-icon">
                <i class="fas fa-shield-alt"></i>
            </div>
            <div class="mobile-feature-text">Secure</div>
        </div>
        <div class="mobile-feature">
            <div class="mobile-feature-icon">
                <i class="fas fa-headset"></i>
            </div>
            <div class="mobile-feature-text">24/7 Support</div>
        </div>
    </div>
    
    <!-- Mobile Search -->
    <div class="mobile-search">
        <div class="position-relative">
            <i class="fas fa-search"></i>
            <input type="text" class="form-control" placeholder="Search products..." 
                   id="mobileSearch" onkeyup="searchProducts()">
        </div>
    </div>
    
    <!-- Categories -->
    <div class="container mt-3">
        <h5 class="mb-3 px-2">Categories</h5>
        <div class="row g-2 px-2">
            ${categories.slice(0, 6).map(category => {
                const icons = {
                    'electronics': 'fas fa-laptop',
                    'fashion': 'fas fa-tshirt',
                    'home-appliances': 'fas fa-blender',
                    'beauty': 'fas fa-spa',
                    'sports': 'fas fa-futbol',
                    'books': 'fas fa-book',
                    'toys': 'fas fa-gamepad'
                };
                const icon = icons[category.slug] || 'fas fa-shopping-bag';
                
                return `
                <div class="col-4 col-sm-3">
                    <a href="/mobile/products?category=${category.slug}" class="text-decoration-none">
                        <div class="mobile-category-card">
                            <div class="mobile-category-icon">
                                <i class="${icon}"></i>
                            </div>
                            <div class="mobile-category-name">${category.name}</div>
                        </div>
                    </a>
                </div>`;
            }).join('')}
        </div>
    </div>
    
    <!-- Featured Products -->
    <div class="container mt-4" id="products">
        <div class="d-flex justify-content-between align-items-center mb-3 px-2">
            <h5>Featured Products</h5>
            <a href="/mobile/products" class="btn btn-sm btn-outline-primary">View All</a>
        </div>
        
        <div class="mobile-grid">
            ${products.map(product => {
                const images = JSON.parse(product.images || '[]');
                const discount = product.offer_price ? 
                    Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
                
                return `
                <div class="mobile-product-card">
                    <a href="/mobile/product/${product.slug}" class="text-decoration-none">
                        <img src="${images[0] || 'https://via.placeholder.com/300x300'}" 
                             class="mobile-product-img"
                             alt="${product.name}"
                             onerror="this.src='https://via.placeholder.com/300x300'">
                        <div class="mobile-product-info">
                            <div class="mobile-product-title">${product.name}</div>
                            ${product.offer_price ? `
                                <div class="mobile-product-price">
                                    <span class="mobile-old-price">${formatPrice(product.price)}</span>
                                    ${formatPrice(product.offer_price)}
                                </div>
                                ${discount > 0 ? `
                                    <span class="badge bg-danger">${discount}% OFF</span>
                                ` : ''}
                            ` : `
                                <div class="mobile-product-price">${formatPrice(product.price)}</div>
                            `}
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-box"></i> ${product.stock}
                                </small>
                                <button class="btn btn-sm btn-primary">
                                    <i class="fas fa-cart-plus"></i>
                                </button>
                            </div>
                        </div>
                    </a>
                </div>`;
            }).join('')}
        </div>
    </div>
    
    <!-- Mobile Navigation -->
    <nav class="mobile-nav">
        <a href="/" class="mobile-nav-item active">
            <i class="fas fa-home mobile-nav-icon"></i>
            <span>Home</span>
        </a>
        <a href="/mobile/products" class="mobile-nav-item">
            <i class="fas fa-store mobile-nav-icon"></i>
            <span>Products</span>
        </a>
        <a href="/mobile/categories" class="mobile-nav-item">
            <i class="fas fa-list mobile-nav-icon"></i>
            <span>Categories</span>
        </a>
        <a href="/mobile/track" class="mobile-nav-item">
            <i class="fas fa-search mobile-nav-icon"></i>
            <span>Track</span>
        </a>
        <a href="/mobile/contact" class="mobile-nav-item">
            <i class="fas fa-user mobile-nav-icon"></i>
            <span>Contact</span>
        </a>
    </nav>
    
    <!-- Whatsapp Float Button -->
    <a href="https://wa.me/8801234567890" target="_blank" class="whatsapp-float">
        <i class="fab fa-whatsapp"></i>
    </a>
    
    <!-- Loading Spinner -->
    <div class="mobile-loading" id="loading">
        <div class="spinner"></div>
        <div class="mt-3">Loading...</div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Mobile search functionality
        function searchProducts() {
            const searchTerm = document.getElementById('mobileSearch').value.toLowerCase();
            const productCards = document.querySelectorAll('.mobile-product-card');
            
            productCards.forEach(card => {
                const title = card.querySelector('.mobile-product-title').textContent.toLowerCase();
                if (title.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        // Show loading
        function showLoading() {
            document.getElementById('loading').style.display = 'flex';
        }
        
        // Hide loading
        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }
        
        // Handle page transitions
        document.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function(e) {
                if (this.getAttribute('href') && 
                    this.getAttribute('href').startsWith('/') &&
                    !this.getAttribute('href').startsWith('#')) {
                    showLoading();
                }
            });
        });
        
        // Hide loading when page is loaded
        window.addEventListener('load', hideLoading);
        
        // Mobile menu active state
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            if (item.getAttribute('href') === window.location.pathname) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    </script>
</body>
</html>`;
            res.send(html);
        });
    });
});

// Mobile Products Page
app.get('/mobile/products', (req, res) => {
    const { category, search } = req.query;
    let query = `SELECT * FROM products WHERE status = 'active'`;
    let params = [];
    
    if (category) {
        query += ` AND category = ?`;
        params.push(category);
    }
    
    if (search) {
        query += ` AND (name LIKE ? OR description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    db.all(query, params, (err, products) => {
        db.all("SELECT * FROM categories WHERE status = 'active'", (err, categories) => {
            let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>Products - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background: #f5f7fb;
            padding-bottom: 80px;
        }
        
        .mobile-header {
            background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
            color: white;
            padding: 15px;
            position: sticky;
            top: 0;
            z-index: 999;
        }
        
        .mobile-search-bar {
            padding: 15px;
            background: white;
            position: sticky;
            top: 70px;
            z-index: 998;
        }
        
        .mobile-products-grid {
            padding: 15px;
        }
        
        .mobile-product-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .mobile-product-img {
            width: 100%;
            height: 180px;
            object-fit: cover;
        }
        
        .mobile-product-info {
            padding: 12px;
        }
        
        .mobile-product-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 5px;
            height: 36px;
            overflow: hidden;
        }
        
        .mobile-product-price {
            font-size: 16px;
            font-weight: 700;
            color: #ff6b6b;
        }
        
        .mobile-old-price {
            font-size: 12px;
            color: #999;
            text-decoration: line-through;
            margin-right: 5px;
        }
        
        .mobile-category-filter {
            display: flex;
            overflow-x: auto;
            padding: 10px 15px;
            background: white;
            gap: 10px;
            -webkit-overflow-scrolling: touch;
        }
        
        .mobile-category-btn {
            padding: 8px 15px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 20px;
            white-space: nowrap;
            font-size: 14px;
            color: #333;
            text-decoration: none;
        }
        
        .mobile-category-btn.active {
            background: #ff6b6b;
            color: white;
            border-color: #ff6b6b;
        }
        
        .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            display: flex;
            justify-content: space-around;
            padding: 10px 0;
            box-shadow: 0 -2px 20px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-decoration: none;
            color: #666;
            font-size: 12px;
            flex: 1;
            padding: 5px;
        }
        
        .mobile-nav-item.active {
            color: #ff6b6b;
        }
        
        .mobile-nav-icon {
            font-size: 20px;
            margin-bottom: 4px;
        }
        
        .loading-spinner {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .no-products {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <!-- Mobile Header -->
    <div class="mobile-header">
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <h4 class="mb-0">
                    <a href="/" class="text-white text-decoration-none">
                        <i class="fas fa-arrow-left me-2"></i>
                    </a>
                    Products
                </h4>
            </div>
            <div>
                <a href="/mobile/cart" class="text-white">
                    <i class="fas fa-shopping-cart"></i>
                </a>
            </div>
        </div>
    </div>
    
    <!-- Search Bar -->
    <div class="mobile-search-bar">
        <form action="/mobile/products" method="GET" class="d-flex">
            <input type="text" name="search" class="form-control me-2" 
                   placeholder="Search products..." 
                   value="${search || ''}"
                   style="height: 45px; font-size: 16px;">
            <button type="submit" class="btn btn-primary" style="height: 45px;">
                <i class="fas fa-search"></i>
            </button>
        </form>
    </div>
    
    <!-- Category Filter -->
    <div class="mobile-category-filter">
        <a href="/mobile/products" class="mobile-category-btn ${!category ? 'active' : ''}">
            All
        </a>
        ${categories.map(cat => `
            <a href="/mobile/products?category=${cat.slug}" 
               class="mobile-category-btn ${category === cat.slug ? 'active' : ''}">
                ${cat.name}
            </a>
        `).join('')}
    </div>
    
    <!-- Products Grid -->
    <div class="mobile-products-grid">
        ${products.length === 0 ? `
            <div class="no-products">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5>No products found</h5>
                <p>Try a different search term</p>
                <a href="/mobile/products" class="btn btn-primary">View All Products</a>
            </div>
        ` : `
            <div class="row">
                ${products.map(product => {
                    const images = JSON.parse(product.images || '[]');
                    const discount = product.offer_price ? 
                        Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
                    
                    return `
                    <div class="col-6 mb-3">
                        <a href="/mobile/product/${product.slug}" class="text-decoration-none">
                            <div class="mobile-product-card">
                                <img src="${images[0] || 'https://via.placeholder.com/300x300'}" 
                                     class="mobile-product-img"
                                     alt="${product.name}"
                                     onerror="this.src='https://via.placeholder.com/300x300'">
                                <div class="mobile-product-info">
                                    <div class="mobile-product-title">${product.name}</div>
                                    ${product.offer_price ? `
                                        <div class="mobile-product-price">
                                            <span class="mobile-old-price">${formatPrice(product.price)}</span>
                                            ${formatPrice(product.offer_price)}
                                        </div>
                                        ${discount > 0 ? `
                                            <span class="badge bg-danger">${discount}% OFF</span>
                                        ` : ''}
                                    ` : `
                                        <div class="mobile-product-price">${formatPrice(product.price)}</div>
                                    `}
                                    <small class="text-muted">
                                        <i class="fas fa-box"></i> ${product.stock} in stock
                                    </small>
                                </div>
                            </div>
                        </a>
                    </div>`;
                }).join('')}
            </div>
        `}
    </div>
    
    <!-- Mobile Navigation -->
    <nav class="mobile-nav">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home mobile-nav-icon"></i>
            <span>Home</span>
        </a>
        <a href="/mobile/products" class="mobile-nav-item active">
            <i class="fas fa-store mobile-nav-icon"></i>
            <span>Products</span>
        </a>
        <a href="/mobile/categories" class="mobile-nav-item">
            <i class="fas fa-list mobile-nav-icon"></i>
            <span>Categories</span>
        </a>
        <a href="/mobile/track" class="mobile-nav-item">
            <i class="fas fa-search mobile-nav-icon"></i>
            <span>Track</span>
        </a>
        <a href="/mobile/contact" class="mobile-nav-item">
            <i class="fas fa-user mobile-nav-icon"></i>
            <span>Contact</span>
        </a>
    </nav>
</body>
</html>`;
            res.send(html);
        });
    });
});

// Mobile Product Detail Page
app.get('/mobile/product/:slug', (req, res) => {
    const slug = req.params.slug;
    
    db.get("SELECT * FROM products WHERE slug = ?", [slug], (err, product) => {
        if (!product) {
            res.redirect('/mobile/products');
            return;
        }
        
        const images = JSON.parse(product.images || '[]');
        const features = JSON.parse(product.features || '[]');
        const discount = product.offer_price ? 
            Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>${product.name} - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background: #f5f7fb;
            padding-bottom: 80px;
        }
        
        .mobile-header {
            background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
            color: white;
            padding: 15px;
            position: sticky;
            top: 0;
            z-index: 999;
        }
        
        .product-image-slider {
            position: relative;
            background: white;
        }
        
        .product-main-image {
            width: 100%;
            height: 300px;
            object-fit: contain;
            background: white;
        }
        
        .product-thumbnails {
            display: flex;
            overflow-x: auto;
            padding: 10px;
            background: white;
            gap: 10px;
            -webkit-overflow-scrolling: touch;
        }
        
        .product-thumbnail {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid transparent;
            cursor: pointer;
        }
        
        .product-thumbnail.active {
            border-color: #ff6b6b;
        }
        
        .product-details {
            padding: 20px;
            background: white;
            margin-top: 10px;
        }
        
        .product-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 10px;
            color: #333;
        }
        
        .product-price {
            font-size: 22px;
            font-weight: 700;
            color: #ff6b6b;
            margin-bottom: 15px;
        }
        
        .product-old-price {
            font-size: 16px;
            color: #999;
            text-decoration: line-through;
            margin-right: 10px;
        }
        
        .product-discount {
            background: #ff6b6b;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .product-features {
            margin: 20px 0;
        }
        
        .feature-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .feature-item i {
            color: #28a745;
            margin-right: 10px;
            font-size: 14px;
        }
        
        .order-form-section {
            background: white;
            margin-top: 10px;
            padding: 20px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #333;
            font-size: 14px;
        }
        
        .form-control {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
        }
        
        .form-control:focus {
            border-color: #ff6b6b;
            outline: none;
        }
        
        input[type="tel"] {
            font-size: 16px;
        }
        
        .quantity-selector {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 20px 0;
        }
        
        .quantity-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #ff6b6b;
            color: white;
            border: none;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .quantity-input {
            width: 60px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 5px;
        }
        
        .order-summary {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .summary-total {
            font-size: 18px;
            font-weight: 700;
            color: #ff6b6b;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
        }
        
        .order-btn {
            display: block;
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            margin-top: 20px;
            text-decoration: none;
        }
        
        .order-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            display: flex;
            justify-content: space-around;
            padding: 10px 0;
            box-shadow: 0 -2px 20px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-decoration: none;
            color: #666;
            font-size: 12px;
            flex: 1;
            padding: 5px;
        }
        
        .mobile-nav-item.active {
            color: #ff6b6b;
        }
        
        .mobile-nav-icon {
            font-size: 20px;
            margin-bottom: 4px;
        }
        
        .stock-badge {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .in-stock {
            background: #d4edda;
            color: #155724;
        }
        
        .out-of-stock {
            background: #f8d7da;
            color: #721c24;
        }
        
        .whatsapp-btn {
            display: block;
            width: 100%;
            padding: 15px;
            background: #25D366;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            margin-top: 10px;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <!-- Mobile Header -->
    <div class="mobile-header">
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <a href="/mobile/products" class="text-white text-decoration-none">
                    <i class="fas fa-arrow-left"></i>
                </a>
            </div>
            <div>
                <h5 class="mb-0 text-white">Product Details</h5>
            </div>
            <div>
                <a href="/" class="text-white">
                    <i class="fas fa-home"></i>
                </a>
            </div>
        </div>
    </div>
    
    <!-- Product Images -->
    <div class="product-image-slider">
        <img id="mainImage" 
             src="${images[0] || 'https://via.placeholder.com/600x600'}" 
             class="product-main-image"
             alt="${product.name}"
             onerror="this.src='https://via.placeholder.com/600x600'">
        
        ${images.length > 1 ? `
        <div class="product-thumbnails">
            ${images.map((img, index) => `
                <img src="${img}" 
                     class="product-thumbnail ${index === 0 ? 'active' : ''}" 
                     alt="Thumbnail ${index + 1}"
                     onclick="changeImage('${img}', this)"
                     onerror="this.src='https://via.placeholder.com/60x60'">
            `).join('')}
        </div>
        ` : ''}
    </div>
    
    <!-- Product Details -->
    <div class="product-details">
        <h1 class="product-title">${product.name}</h1>
        
        <div class="d-flex align-items-center mb-3">
            ${product.offer_price ? `
                <div class="d-flex align-items-center">
                    <span class="product-old-price">${formatPrice(product.price)}</span>
                    <span class="product-price">${formatPrice(product.offer_price)}</span>
                    ${discount > 0 ? `
                        <span class="product-discount ms-2">${discount}% OFF</span>
                    ` : ''}
                </div>
            ` : `
                <span class="product-price">${formatPrice(product.price)}</span>
            `}
        </div>
        
        <div class="mb-3">
            <span class="stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                <i class="fas fa-box"></i> 
                ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </span>
            <span class="badge bg-light text-dark ms-2">
                <i class="fas fa-shopping-cart"></i> ${product.sales} sold
            </span>
        </div>
        
        <div class="product-features">
            <h6>Key Features:</h6>
            ${features.map(feature => `
                <div class="feature-item">
                    <i class="fas fa-check-circle"></i>
                    <span>${feature}</span>
                </div>
            `).join('')}
        </div>
        
        <div class="mb-3">
            <h6>Description:</h6>
            <p>${product.description}</p>
        </div>
    </div>
    
    <!-- Order Form -->
    <div class="order-form-section">
        <h5 class="mb-4">Order Now</h5>
        
        <form id="orderForm" action="/mobile/checkout" method="POST">
            <input type="hidden" name="product_id" value="${product.id}">
            <input type="hidden" name="product_name" value="${product.name}">
            <input type="hidden" name="product_price" value="${product.offer_price || product.price}">
            <input type="hidden" name="shipping_cost" value="80" id="shippingCostInput">
            
            <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input type="text" name="customer_name" class="form-control" 
                       placeholder="Enter your full name" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Phone Number *</label>
                <input type="tel" name="phone" class="form-control" 
                       placeholder="01XXXXXXXXX" 
                       pattern="01[3-9]\d{8}" 
                       inputmode="numeric"
                       maxlength="11"
                       required>
                <small class="text-muted">11 digits starting with 01</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Shipping Address *</label>
                <textarea name="address" class="form-control" rows="3" 
                          placeholder="Full address with area, city" required></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Shipping Area</label>
                <select name="shipping_area" class="form-control" onchange="calculateTotal()">
                    <option value="inside_dhaka">Inside Dhaka (৳80)</option>
                    <option value="outside_dhaka">Outside Dhaka (৳150)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Quantity</label>
                <div class="quantity-selector">
                    <button type="button" class="quantity-btn" onclick="decreaseQuantity()">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" name="quantity" class="quantity-input" 
                           value="1" min="1" max="${product.stock}" readonly 
                           id="quantityInput">
                    <button type="button" class="quantity-btn" onclick="increaseQuantity()">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <small class="text-muted">Maximum: ${product.stock} units</small>
            </div>
            
            <!-- Order Summary -->
            <div class="order-summary">
                <div class="summary-row">
                    <span>Product Price:</span>
                    <span id="productPriceDisplay">${formatPrice(product.offer_price || product.price)}</span>
                </div>
                <div class="summary-row">
                    <span>Quantity:</span>
                    <span id="quantityDisplay">1</span>
                </div>
                <div class="summary-row">
                    <span>Shipping:</span>
                    <span id="shippingDisplay">৳80</span>
                </div>
                <div class="summary-row summary-total">
                    <span>Total:</span>
                    <span id="totalDisplay">${formatPrice((product.offer_price || product.price) + 80)}</span>
                </div>
            </div>
            
            <button type="submit" class="order-btn" ${product.stock <= 0 ? 'disabled' : ''}>
                <i class="fas fa-bolt"></i> 
                ${product.stock <= 0 ? 'OUT OF STOCK' : 'PLACE ORDER'}
            </button>
        </form>
        
        <a href="https://wa.me/8801234567890" class="whatsapp-btn" target="_blank">
            <i class="fab fa-whatsapp"></i> Order via WhatsApp
        </a>
    </div>
    
    <!-- Mobile Navigation -->
    <nav class="mobile-nav">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home mobile-nav-icon"></i>
            <span>Home</span>
        </a>
        <a href="/mobile/products" class="mobile-nav-item">
            <i class="fas fa-store mobile-nav-icon"></i>
            <span>Products</span>
        </a>
        <a href="/mobile/categories" class="mobile-nav-item">
            <i class="fas fa-list mobile-nav-icon"></i>
            <span>Categories</span>
        </a>
        <a href="/mobile/track" class="mobile-nav-item">
            <i class="fas fa-search mobile-nav-icon"></i>
            <span>Track</span>
        </a>
        <a href="/mobile/contact" class="mobile-nav-item">
            <i class="fas fa-user mobile-nav-icon"></i>
            <span>Contact</span>
        </a>
    </nav>
    
    <script>
        let currentQuantity = 1;
        const maxQuantity = ${product.stock};
        const productPrice = ${product.offer_price || product.price};
        let shippingCost = 80;
        
        function changeImage(src, element) {
            document.getElementById('mainImage').src = src;
            document.querySelectorAll('.product-thumbnail').forEach(thumb => {
                thumb.classList.remove('active');
            });
            element.classList.add('active');
        }
        
        function increaseQuantity() {
            if (currentQuantity < maxQuantity) {
                currentQuantity++;
                updateQuantity();
                calculateTotal();
            }
        }
        
        function decreaseQuantity() {
            if (currentQuantity > 1) {
                currentQuantity--;
                updateQuantity();
                calculateTotal();
            }
        }
        
        function updateQuantity() {
            document.getElementById('quantityInput').value = currentQuantity;
            document.getElementById('quantityDisplay').textContent = currentQuantity;
        }
        
        function calculateTotal() {
            const shippingSelect = document.querySelector('select[name="shipping_area"]');
            shippingCost = shippingSelect.value === 'inside_dhaka' ? 80 : 150;
            
            const total = (productPrice * currentQuantity) + shippingCost;
            
            // Update displays
            document.getElementById('productPriceDisplay').textContent = '৳' + productPrice.toLocaleString('en-IN');
            document.getElementById('shippingDisplay').textContent = '৳' + shippingCost.toLocaleString('en-IN');
            document.getElementById('totalDisplay').textContent = '৳' + total.toLocaleString('en-IN');
            document.getElementById('shippingCostInput').value = shippingCost;
        }
        
        // Initialize
        calculateTotal();
        
        // Phone number validation
        const phoneInput = document.querySelector('input[name="phone"]');
        phoneInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^\d]/g, '');
            if (this.value.length > 11) {
                this.value = this.value.slice(0, 11);
            }
        });
        
        // Form validation
        document.getElementById('orderForm').addEventListener('submit', function(e) {
            const phone = document.querySelector('input[name="phone"]').value;
            if (!phone.match(/^01[3-9]\d{8}$/)) {
                e.preventDefault();
                alert('Please enter a valid Bangladeshi phone number (11 digits starting with 01)');
                return false;
            }
        });
    </script>
</body>
</html>`;
        
        res.send(html);
    });
});

// Mobile Checkout
app.post('/mobile/checkout', (req, res) => {
    const { 
        product_id, product_name, product_price, 
        customer_name, phone, address, 
        quantity, shipping_area, shipping_cost 
    } = req.body;
    
    const shippingCost = parseInt(shipping_cost) || (shipping_area === 'inside_dhaka' ? 80 : 150);
    const subtotal = parseFloat(product_price) * parseInt(quantity);
    const total = subtotal + shippingCost;
    const orderId = generateOrderId();
    const formattedPhone = formatPhone(phone);
    
    // Start transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insert order
        db.run(`INSERT INTO orders 
                (order_id, customer_name, phone, address, shipping_area, 
                 quantity, product_id, product_name, unit_price, total, shipping_cost, 
                 grand_total, payment_method) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, customer_name, formattedPhone, address, shipping_area, 
             quantity, product_id, product_name, product_price, subtotal, shippingCost, 
             total, 'cod'], function(err) {
            
            if (err) {
                db.run('ROLLBACK');
                console.error('Order insert error:', err);
                return res.send(`
                    <div class="container mt-5">
                        <div class="alert alert-danger">
                            <h2><i class="fas fa-exclamation-triangle"></i> Error!</h2>
                            <p>Order could not be placed. Please try again.</p>
                            <a href="/mobile/product/${product_id}" class="btn btn-primary">Go Back</a>
                        </div>
                    </div>
                `);
            }
            
            // Update product stock and sales
            db.run(`UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?`,
                [quantity, quantity, product_id], function(err) {
                
                if (err) {
                    db.run('ROLLBACK');
                    console.error('Stock update error:', err);
                    return res.send(`
                        <div class="container mt-5">
                            <div class="alert alert-danger">
                                <h2><i class="fas fa-exclamation-triangle"></i> Error!</h2>
                                <p>Could not update product stock. Please try again.</p>
                                <a href="/mobile/product/${product_id}" class="btn btn-primary">Go Back</a>
                            </div>
                        </div>
                    `);
                }
                
                // Insert/update customer
                db.run(`INSERT OR REPLACE INTO customers (phone, name, address, total_orders, total_spent)
                        VALUES (?, ?, ?, 
                                COALESCE((SELECT total_orders FROM customers WHERE phone = ?), 0) + 1,
                                COALESCE((SELECT total_spent FROM customers WHERE phone = ?), 0) + ?)`,
                    [formattedPhone, customer_name, address, 
                     formattedPhone, formattedPhone, total], function(err) {
                    
                    if (err) {
                        console.error('Customer update error:', err);
                    }
                    
                    db.run('COMMIT');
                    
                    // Success response
                    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Order Confirmed - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: #f5f7fb;
            padding: 20px;
        }
        
        .success-card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
            margin-top: 50px;
        }
        
        .success-icon {
            font-size: 60px;
            color: #28a745;
            margin-bottom: 20px;
        }
        
        .order-id {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
        }
        
        .order-details {
            text-align: left;
            margin: 25px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 12px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .action-btn {
            display: block;
            width: 100%;
            padding: 15px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            text-decoration: none;
            margin-bottom: 10px;
            border: none;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
            color: white;
        }
        
        .btn-success {
            background: #25D366;
            color: white;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .whatsapp-float {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: #25D366;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            z-index: 999;
            box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-card">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            
            <h2>Order Confirmed!</h2>
            <p class="text-muted">Thank you ${customer_name}, your order has been received.</p>
            
            <div class="order-id">${orderId}</div>
            
            <div class="order-details">
                <div class="detail-row">
                    <span>Product:</span>
                    <span>${product_name}</span>
                </div>
                <div class="detail-row">
                    <span>Quantity:</span>
                    <span>${quantity}</span>
                </div>
                <div class="detail-row">
                    <span>Total Amount:</span>
                    <span class="fw-bold">${formatPrice(total)}</span>
                </div>
                <div class="detail-row">
                    <span>Payment Method:</span>
                    <span>Cash on Delivery</span>
                </div>
                <div class="detail-row">
                    <span>Delivery Address:</span>
                    <span>${address}</span>
                </div>
            </div>
            
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                Our team will call you at ${formattedPhone} within 30 minutes to confirm your order.
            </div>
            
            <a href="/" class="action-btn btn-primary">
                <i class="fas fa-shopping-cart"></i> Continue Shopping
            </a>
            
            <a href="https://wa.me/8801234567890?text=Order%20Confirmed%0AOrder%20ID:%20${orderId}%0AName:%20${customer_name}%0AProduct:%20${product_name}%0AQuantity:%20${quantity}%0ATotal:%20${formatPrice(total)}" 
               target="_blank" class="action-btn btn-success">
                <i class="fab fa-whatsapp"></i> Message on WhatsApp
            </a>
            
            <a href="/mobile/track?order_id=${orderId}" class="action-btn btn-secondary">
                <i class="fas fa-search"></i> Track Order
            </a>
        </div>
    </div>
    
    <a href="https://wa.me/8801234567890" target="_blank" class="whatsapp-float">
        <i class="fab fa-whatsapp"></i>
    </a>
</body>
</html>`;
                    
                    res.send(html);
                });
            });
        });
    });
});

// Mobile Track Order
app.get('/mobile/track', (req, res) => {
    const orderId = req.query.order_id;
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Track Order - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: #f5f7fb;
            padding: 20px;
        }
        
        .track-card {
            background: white;
            border-radius: 16px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            margin-top: 20px;
        }
        
        .track-input {
            height: 50px;
            font-size: 16px;
            border-radius: 10px;
            padding: 15px;
        }
        
        .track-btn {
            height: 50px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
        }
        
        .order-status {
            margin: 30px 0;
        }
        
        .status-step {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            position: relative;
        }
        
        .status-step:before {
            content: '';
            position: absolute;
            left: 19px;
            top: 40px;
            bottom: -25px;
            width: 2px;
            background: #ddd;
            z-index: 1;
        }
        
        .status-step:last-child:before {
            display: none;
        }
        
        .status-step.completed:before {
            background: #28a745;
        }
        
        .status-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            position: relative;
            z-index: 2;
        }
        
        .status-step.completed .status-icon {
            background: #28a745;
            color: white;
        }
        
        .status-step.active .status-icon {
            background: #007bff;
            color: white;
        }
        
        .status-info h6 {
            margin: 0;
            font-weight: 600;
        }
        
        .status-info p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }
        
        .order-details {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .detail-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h3 class="text-center mb-4">Track Your Order</h3>
        
        <div class="track-card">
            <form action="/mobile/track" method="GET" class="mb-4">
                <div class="input-group">
                    <input type="text" name="order_id" class="form-control track-input" 
                           placeholder="Enter Order ID (e.g., DM123456)" 
                           value="${orderId || ''}"
                           required>
                    <button type="submit" class="btn btn-primary track-btn">
                        <i class="fas fa-search"></i> Track
                    </button>
                </div>
                <small class="text-muted">You can find Order ID in your confirmation message</small>
            </form>`;
    
    if (orderId) {
        db.get("SELECT * FROM orders WHERE order_id = ?", [orderId], (err, order) => {
            if (!order) {
                html += `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        Order not found. Please check your Order ID.
                    </div>`;
            } else {
                const statusSteps = [
                    { status: 'pending', icon: 'fas fa-receipt', label: 'Order Placed', desc: 'Your order has been received' },
                    { status: 'processing', icon: 'fas fa-cogs', label: 'Processing', desc: 'Order is being processed' },
                    { status: 'shipped', icon: 'fas fa-shipping-fast', label: 'Shipped', desc: 'Order has been shipped' },
                    { status: 'delivered', icon: 'fas fa-check-circle', label: 'Delivered', desc: 'Order has been delivered' }
                ];
                
                const currentStatusIndex = statusSteps.findIndex(step => step.status === order.status);
                
                html += `
                    <div class="order-details">
                        <h5>Order Information</h5>
                        <div class="detail-item">
                            <span>Order ID:</span>
                            <span class="fw-bold">${order.order_id}</span>
                        </div>
                        <div class="detail-item">
                            <span>Product:</span>
                            <span>${order.product_name}</span>
                        </div>
                        <div class="detail-item">
                            <span>Quantity:</span>
                            <span>${order.quantity}</span>
                        </div>
                        <div class="detail-item">
                            <span>Total Amount:</span>
                            <span class="fw-bold text-primary">${formatPrice(order.grand_total)}</span>
                        </div>
                        <div class="detail-item">
                            <span>Order Date:</span>
                            <span>${new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <div class="order-status mt-4">
                        <h5>Order Status</h5>
                        ${statusSteps.map((step, index) => {
                            const isCompleted = index <= currentStatusIndex;
                            const isActive = index === currentStatusIndex;
                            const className = isCompleted ? 'completed' : (isActive ? 'active' : '');
                            
                            return `
                            <div class="status-step ${className}">
                                <div class="status-icon">
                                    <i class="${step.icon}"></i>
                                </div>
                                <div class="status-info">
                                    <h6>${step.label}</h6>
                                    <p>${step.desc}</p>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                    
                    <div class="mt-4">
                        <a href="tel:+8801234567890" class="btn btn-outline-primary w-100">
                            <i class="fas fa-phone"></i> Contact Support
                        </a>
                    </div>`;
            }
            
            html += `
        </div>
        
        <div class="text-center mt-4">
            <a href="/" class="btn btn-secondary">
                <i class="fas fa-home"></i> Back to Home
            </a>
        </div>
    </div>
</body>
</html>`;
            
            res.send(html);
        });
    } else {
        html += `
        </div>
        
        <div class="text-center mt-4">
            <a href="/" class="btn btn-secondary">
                <i class="fas fa-home"></i> Back to Home
            </a>
        </div>
    </div>
</body>
</html>`;
        res.send(html);
    }
});

// Mobile Categories Page
app.get('/mobile/categories', (req, res) => {
    db.all("SELECT * FROM categories WHERE status = 'active'", (err, categories) => {
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Categories - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: #f5f7fb;
            padding-bottom: 80px;
        }
        
        .mobile-header {
            background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
            color: white;
            padding: 15px;
            position: sticky;
            top: 0;
            z-index: 999;
        }
        
        .categories-grid {
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .category-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            text-decoration: none;
            color: #333;
            transition: transform 0.2s;
        }
        
        .category-card:active {
            transform: scale(0.98);
        }
        
        .category-icon {
            font-size: 35px;
            color: #ff6b6b;
            margin-bottom: 10px;
        }
        
        .category-name {
            font-size: 14px;
            font-weight: 600;
            margin: 0;
        }
        
        .category-count {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        
        .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            display: flex;
            justify-content: space-around;
            padding: 10px 0;
            box-shadow: 0 -2px 20px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-decoration: none;
            color: #666;
            font-size: 12px;
            flex: 1;
            padding: 5px;
        }
        
        .mobile-nav-item.active {
            color: #ff6b6b;
        }
        
        .mobile-nav-icon {
            font-size: 20px;
            margin-bottom: 4px;
        }
    </style>
</head>
<body>
    <!-- Mobile Header -->
    <div class="mobile-header">
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <a href="/" class="text-white text-decoration-none">
                    <i class="fas fa-arrow-left"></i>
                </a>
            </div>
            <div>
                <h5 class="mb-0 text-white">Categories</h5>
            </div>
            <div>
                <a href="/mobile/search" class="text-white">
                    <i class="fas fa-search"></i>
                </a>
            </div>
        </div>
    </div>
    
    <!-- Categories Grid -->
    <div class="categories-grid">
        ${categories.map(category => {
            const icons = {
                'electronics': 'fas fa-laptop',
                'fashion': 'fas fa-tshirt',
                'home-appliances': 'fas fa-blender',
                'beauty': 'fas fa-spa',
                'sports': 'fas fa-futbol',
                'books': 'fas fa-book',
                'toys': 'fas fa-gamepad'
            };
            
            const icon = icons[category.slug] || 'fas fa-shopping-bag';
            
            return `
            <a href="/mobile/products?category=${category.slug}" class="category-card">
                <div class="category-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="category-name">${category.name}</div>
                ${category.description ? `
                    <div class="category-count">${category.description}</div>
                ` : ''}
            </a>`;
        }).join('')}
    </div>
    
    <!-- Mobile Navigation -->
    <nav class="mobile-nav">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home mobile-nav-icon"></i>
            <span>Home</span>
        </a>
        <a href="/mobile/products" class="mobile-nav-item">
            <i class="fas fa-store mobile-nav-icon"></i>
            <span>Products</span>
        </a>
        <a href="/mobile/categories" class="mobile-nav-item active">
            <i class="fas fa-list mobile-nav-icon"></i>
            <span>Categories</span>
        </a>
        <a href="/mobile/track" class="mobile-nav-item">
            <i class="fas fa-search mobile-nav-icon"></i>
            <span>Track</span>
        </a>
        <a href="/mobile/contact" class="mobile-nav-item">
            <i class="fas fa-user mobile-nav-icon"></i>
            <span>Contact</span>
        </a>
    </nav>
</body>
</html>`;
        
        res.send(html);
    });
});

// Mobile Contact Page
app.get('/mobile/contact', (req, res) => {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Contact Us - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: #f5f7fb;
            padding-bottom: 80px;
        }
        
        .mobile-header {
            background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
            color: white;
            padding: 15px;
            position: sticky;
            top: 0;
            z-index: 999;
        }
        
        .contact-section {
            padding: 20px;
        }
        
        .contact-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            text-align: center;
        }
        
        .contact-icon {
            font-size: 35px;
            color: #ff6b6b;
            margin-bottom: 15px;
        }
        
        .contact-btn {
            display: block;
            width: 100%;
            padding: 12px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 10px;
            text-align: center;
        }
        
        .btn-call {
            background: #28a745;
            color: white;
        }
        
        .btn-whatsapp {
            background: #25D366;
            color: white;
        }
        
        .btn-email {
            background: #007bff;
            color: white;
        }
        
        .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            display: flex;
            justify-content: space-around;
            padding: 10px 0;
            box-shadow: 0 -2px 20px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-decoration: none;
            color: #666;
            font-size: 12px;
            flex: 1;
            padding: 5px;
        }
        
        .mobile-nav-item.active {
            color: #ff6b6b;
        }
        
        .mobile-nav-icon {
            font-size: 20px;
            margin-bottom: 4px;
        }
        
        .office-hours {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
            font-size: 14px;
        }
        
        .office-hours li {
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <!-- Mobile Header -->
    <div class="mobile-header">
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <a href="/" class="text-white text-decoration-none">
                    <i class="fas fa-arrow-left"></i>
                </a>
            </div>
            <div>
                <h5 class="mb-0 text-white">Contact Us</h5>
            </div>
            <div>
                <a href="/" class="text-white">
                    <i class="fas fa-home"></i>
                </a>
            </div>
        </div>
    </div>
    
    <!-- Contact Section -->
    <div class="contact-section">
        <div class="contact-card">
            <div class="contact-icon">
                <i class="fas fa-phone-alt"></i>
            </div>
            <h5>Call Us</h5>
            <p>+880 1234-567890</p>
            <p>+880 1234-567891</p>
            <a href="tel:+8801234567890" class="contact-btn btn-call">
                <i class="fas fa-phone"></i> Call Now
            </a>
        </div>
        
        <div class="contact-card">
            <div class="contact-icon">
                <i class="fab fa-whatsapp"></i>
            </div>
            <h5>WhatsApp</h5>
            <p>+880 1234-567890</p>
            <p>24/7 Customer Support</p>
            <a href="https://wa.me/8801234567890" target="_blank" class="contact-btn btn-whatsapp">
                <i class="fab fa-whatsapp"></i> Message on WhatsApp
            </a>
        </div>
        
        <div class="contact-card">
            <div class="contact-icon">
                <i class="fas fa-envelope"></i>
            </div>
            <h5>Email Us</h5>
            <p>info@dhakamarket.com</p>
            <p>support@dhakamarket.com</p>
            <a href="mailto:info@dhakamarket.com" class="contact-btn btn-email">
                <i class="fas fa-envelope"></i> Send Email
            </a>
        </div>
        
        <div class="contact-card">
            <h5>Office Hours</h5>
            <div class="office-hours">
                <ul class="list-unstyled mb-0">
                    <li><strong>Sunday - Thursday:</strong> 9:00 AM - 10:00 PM</li>
                    <li><strong>Friday:</strong> 3:00 PM - 10:00 PM</li>
                    <li><strong>Saturday:</strong> 9:00 AM - 10:00 PM</li>
                </ul>
            </div>
        </div>
        
        <div class="contact-card">
            <h5>Our Location</h5>
            <p><i class="fas fa-map-marker-alt text-danger"></i> 123 Market Street, Dhaka 1205, Bangladesh</p>
            <p class="text-muted">Visit our office for any inquiries</p>
        </div>
    </div>
    
    <!-- Mobile Navigation -->
    <nav class="mobile-nav">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home mobile-nav-icon"></i>
            <span>Home</span>
        </a>
        <a href="/mobile/products" class="mobile-nav-item">
            <i class="fas fa-store mobile-nav-icon"></i>
            <span>Products</span>
        </a>
        <a href="/mobile/categories" class="mobile-nav-item">
            <i class="fas fa-list mobile-nav-icon"></i>
            <span>Categories</span>
        </a>
        <a href="/mobile/track" class="mobile-nav-item">
            <i class="fas fa-search mobile-nav-icon"></i>
            <span>Track</span>
        </a>
        <a href="/mobile/contact" class="mobile-nav-item active">
            <i class="fas fa-user mobile-nav-icon"></i>
            <span>Contact</span>
        </a>
    </nav>
</body>
</html>`;
    
    res.send(html);
});

// Mobile Search Page
app.get('/mobile/search', (req, res) => {
    const query = req.query.q || '';
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Search - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: #f5f7fb;
            padding-bottom: 80px;
        }
        
        .mobile-header {
            background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
            color: white;
            padding: 15px;
            position: sticky;
            top: 0;
            z-index: 999;
        }
        
        .search-box {
            padding: 15px;
            background: white;
        }
        
        .search-input {
            height: 50px;
            font-size: 16px;
            border-radius: 10px;
            padding: 15px;
        }
        
        .search-results {
            padding: 15px;
        }
        
        .product-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .product-img {
            width: 100%;
            height: 150px;
            object-fit: cover;
        }
        
        .product-info {
            padding: 12px;
        }
        
        .product-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 5px;
            height: 36px;
            overflow: hidden;
        }
        
        .product-price {
            font-size: 16px;
            font-weight: 700;
            color: #ff6b6b;
        }
        
        .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            display: flex;
            justify-content: space-around;
            padding: 10px 0;
            box-shadow: 0 -2px 20px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-decoration: none;
            color: #666;
            font-size: 12px;
            flex: 1;
            padding: 5px;
        }
        
        .mobile-nav-icon {
            font-size: 20px;
            margin-bottom: 4px;
        }
        
        .no-results {
            text-align: center;
            padding: 50px 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <!-- Mobile Header -->
    <div class="mobile-header">
        <div class="d-flex align-items-center">
            <div class="me-3">
                <a href="/" class="text-white text-decoration-none">
                    <i class="fas fa-arrow-left"></i>
                </a>
            </div>
            <div class="flex-grow-1">
                <form action="/mobile/search" method="GET">
                    <input type="text" name="q" class="form-control search-input" 
                           placeholder="Search products..." value="${query}" 
                           autofocus>
                </form>
            </div>
        </div>
    </div>
    
    <!-- Search Results -->
    <div class="search-results">
        ${query ? `
            <h6 class="mb-3">Search results for: "${query}"</h6>
            <div id="searchResults">
                Loading...
            </div>
        ` : `
            <div class="no-results">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5>Search Products</h5>
                <p>Enter product name to search</p>
            </div>
        `}
    </div>
    
    <!-- Mobile Navigation -->
    <nav class="mobile-nav">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home mobile-nav-icon"></i>
            <span>Home</span>
        </a>
        <a href="/mobile/products" class="mobile-nav-item">
            <i class="fas fa-store mobile-nav-icon"></i>
            <span>Products</span>
        </a>
        <a href="/mobile/categories" class="mobile-nav-item">
            <i class="fas fa-list mobile-nav-icon"></i>
            <span>Categories</span>
        </a>
        <a href="/mobile/track" class="mobile-nav-item">
            <i class="fas fa-search mobile-nav-icon"></i>
            <span>Track</span>
        </a>
        <a href="/mobile/contact" class="mobile-nav-item">
            <i class="fas fa-user mobile-nav-icon"></i>
            <span>Contact</span>
        </a>
    </nav>
    
    <script>
        // Load search results
        ${query ? `
        fetch('/api/mobile/search?q=${encodeURIComponent(query)}')
            .then(response => response.json())
            .then(products => {
                const resultsDiv = document.getElementById('searchResults');
                
                if (products.length === 0) {
                    resultsDiv.innerHTML = \`
                        <div class="no-results">
                            <i class="fas fa-search fa-3x text-muted mb-3"></i>
                            <h5>No products found</h5>
                            <p>Try a different search term</p>
                        </div>
                    \`;
                    return;
                }
                
                resultsDiv.innerHTML = \`
                    <div class="row">
                        \${products.map(product => {
                            const images = JSON.parse(product.images || '[]');
                            return \`
                            <div class="col-6 mb-3">
                                <a href="/mobile/product/\${product.slug}" class="text-decoration-none">
                                    <div class="product-card">
                                        <img src="\${images[0] || 'https://via.placeholder.com/300x300'}" 
                                             class="product-img"
                                             alt="\${product.name}"
                                             onerror="this.src='https://via.placeholder.com/300x300'">
                                        <div class="product-info">
                                            <div class="product-title">\${product.name}</div>
                                            <div class="product-price">\${'৳' + (product.offer_price || product.price).toLocaleString('en-IN')}</div>
                                        </div>
                                    </div>
                                </a>
                            </div>
                            \`;
                        }).join('')}
                    </div>
                \`;
            });
        ` : ''}
    </script>
</body>
</html>`;
    
    res.send(html);
});

// Mobile API for search
app.get('/api/mobile/search', (req, res) => {
    const query = req.query.q;
    
    if (!query) {
        return res.json([]);
    }
    
    const searchQuery = `SELECT * FROM products WHERE status = 'active' 
                        AND (name LIKE ? OR description LIKE ?) 
                        LIMIT 20`;
    
    db.all(searchQuery, [`%${query}%`, `%${query}%`], (err, products) => {
        if (err) {
            console.error('Search error:', err);
            return res.json([]);
        }
        
        res.json(products);
    });
});

// Add this route to redirect mobile users to mobile version
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent.toLowerCase());
    
    // If mobile user accesses root, redirect to mobile version
    if (isMobile && req.path === '/') {
        return res.redirect('/mobile');
    }
    
    next();
});

// Add mobile home route
app.get('/mobile', (req, res) => {
    res.redirect('/');
});

// Keep all your existing routes below...
// ... [Keep all your existing routes as they are] ...

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║   Dhaka Market Mobile Server Started Successfully!      ║
    ║                                                          ║
    ║   Local: http://localhost:${PORT}                       ║
    ║   Mobile: http://localhost:${PORT}/mobile               ║
    ║                                                          ║
    ║   Mobile Features:                                       ║
    ║   • Full Mobile Responsive Design                       ║
    ║   • Touch-friendly Interface                            ║
    ║   • Numeric Keyboard for Phone Input                    ║
    ║   • Fast Loading                                        ║
    ║   • Mobile Navigation                                   ║
    ║   • WhatsApp Integration                                ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    `);
});
