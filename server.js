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

function generateSlug(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

// ==================== MOBILE ROUTES ====================

// Mobile redirect middleware
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent.toLowerCase());
    
    req.isMobile = isMobile;
    next();
});

// Mobile Home Page
app.get('/mobile', (req, res) => {
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
        <a href="/mobile" class="mobile-nav-item active">
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
                    <a href="/mobile" class="text-white text-decoration-none">
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
        <a href="/mobile" class="mobile-nav-item">
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
                <a href="/mobile" class="text-white">
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
        <a href="/mobile" class="mobile-nav-item">
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
            
            <a href="/mobile" class="action-btn btn-primary">
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
            <a href="/mobile" class="btn btn-secondary">
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
            <a href="/mobile" class="btn btn-secondary">
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
                <a href="/mobile" class="text-white text-decoration-none">
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
        <a href="/mobile" class="mobile-nav-item">
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
                <a href="/mobile" class="text-white text-decoration-none">
                    <i class="fas fa-arrow-left"></i>
                </a>
            </div>
            <div>
                <h5 class="mb-0 text-white">Contact Us</h5>
            </div>
            <div>
                <a href="/mobile" class="text-white">
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
        <a href="/mobile" class="mobile-nav-item">
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
                <a href="/mobile" class="text-white text-decoration-none">
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
        <a href="/mobile" class="mobile-nav-item">
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

// ==================== ADMIN ROUTES ====================

// Admin Login Page
app.get('/admin-login', (req, res) => {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .login-container {
            width: 100%;
            max-width: 400px;
        }
        
        .login-card {
            background: white;
            border-radius: 15px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .login-header h3 {
            color: #333;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .login-header p {
            color: #666;
            font-size: 14px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-control {
            height: 50px;
            border-radius: 8px;
            border: 1px solid #ddd;
            padding: 10px 15px;
            font-size: 16px;
        }
        
        .form-control:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        
        .btn-login {
            width: 100%;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .btn-login:active {
            transform: translateY(0);
        }
        
        .alert {
            border-radius: 8px;
            padding: 12px 15px;
            margin-bottom: 20px;
        }
        
        .login-footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 14px;
        }
        
        .back-to-home {
            text-align: center;
            margin-top: 15px;
        }
        
        .logo {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .logo h2 {
            color: white;
            font-weight: 700;
        }
        
        .logo-icon {
            background: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px;
            color: #667eea;
            font-size: 24px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <div class="logo-icon">
                <i class="fas fa-store"></i>
            </div>
            <h2>Dhaka Market</h2>
        </div>
        
        <div class="login-card">
            <div class="login-header">
                <h3>Admin Login</h3>
                <p>Enter your credentials to access the dashboard</p>
            </div>
            
            ${req.session.loginError ? `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    ${req.session.loginError}
                    <button type="button" class="btn-close" onclick="this.parentElement.style.display='none'"></button>
                </div>
            ` : ''}
            
            ${req.session.loginMessage ? `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    ${req.session.loginMessage}
                    <button type="button" class="btn-close" onclick="this.parentElement.style.display='none'"></button>
                </div>
            ` : ''}
            
            <form action="/admin-login" method="POST">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input type="text" name="username" class="form-control" 
                           placeholder="Enter username" required 
                           value="${req.session.loginUsername || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-control" 
                           placeholder="Enter password" required>
                </div>
                
                <button type="submit" class="btn-login">
                    <i class="fas fa-sign-in-alt me-2"></i>Login
                </button>
            </form>
            
            <div class="login-footer">
                <p>Default credentials: admin / admin123</p>
            </div>
            
            <div class="back-to-home">
                <a href="/" class="text-decoration-none">
                    <i class="fas fa-arrow-left me-2"></i>Back to Home
                </a>
            </div>
        </div>
    </div>
    
    <script>
        // Clear error messages after 5 seconds
        setTimeout(() => {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(alert => {
                alert.style.display = 'none';
            });
        }, 5000);
        
        // Focus on username field
        document.querySelector('input[name="username"]').focus();
    </script>
</body>
</html>`;
    
    // Clear any existing session errors
    delete req.session.loginError;
    delete req.session.loginMessage;
    delete req.session.loginUsername;
    
    res.send(html);
});

// Admin Login POST Handler
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    // Store username in session for error handling
    req.session.loginUsername = username;
    
    // Validation
    if (!username || !password) {
        req.session.loginError = 'Username and password are required';
        return res.redirect('/admin-login');
    }
    
    // Check credentials
    db.get("SELECT * FROM admin_users WHERE username = ?", [username], (err, user) => {
        if (err) {
            console.error('Login error:', err);
            req.session.loginError = 'Database error occurred';
            return res.redirect('/admin-login');
        }
        
        if (!user) {
            req.session.loginError = 'Invalid username or password';
            return res.redirect('/admin-login');
        }
        
        // Check password
        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
            req.session.loginError = 'Invalid username or password';
            return res.redirect('/admin-login');
        }
        
        // Set session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions ? JSON.parse(user.permissions) : []
        };
        
        // Update last login
        db.run("UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
        
        // Clear stored username
        delete req.session.loginUsername;
        delete req.session.loginError;
        
        // Set success message
        req.session.loginMessage = `Welcome back, ${user.username}!`;
        
        // Redirect to admin dashboard
        res.redirect('/admin/dashboard');
    });
});

// Admin Logout
app.get('/admin-logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/admin-login');
    });
});

// Admin Dashboard
app.get('/admin/dashboard', requireAuth, (req, res) => {
    // Get statistics
    db.serialize(() => {
        db.get("SELECT COUNT(*) as total FROM products", (err, productRow) => {
            db.get("SELECT COUNT(*) as total FROM orders", (err, orderRow) => {
                db.get("SELECT COUNT(*) as total FROM customers", (err, customerRow) => {
                    db.get("SELECT SUM(grand_total) as revenue FROM orders WHERE status = 'delivered'", (err, revenueRow) => {
                        db.get("SELECT SUM(grand_total) as pending FROM orders WHERE status = 'pending' OR status = 'processing' OR status = 'shipped'", (err, pendingRow) => {
                            // Get recent orders
                            db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 10", (err, recentOrders) => {
                                let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root {
            --primary: #667eea;
            --secondary: #764ba2;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --info: #3b82f6;
            --light: #f8f9fa;
            --dark: #1f2937;
        }
        
        body {
            background-color: #f5f7fb;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .sidebar {
            background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 100%);
            color: white;
            height: 100vh;
            position: fixed;
            left: 0;
            top: 0;
            width: 250px;
            transition: all 0.3s;
            z-index: 1000;
        }
        
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .sidebar-header h3 {
            font-weight: 700;
            margin: 0;
            font-size: 1.3rem;
        }
        
        .sidebar-menu {
            padding: 20px 0;
        }
        
        .sidebar-menu ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .sidebar-menu li {
            margin-bottom: 5px;
        }
        
        .sidebar-menu a {
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            display: flex;
            align-items: center;
            padding: 12px 20px;
            transition: all 0.3s;
            font-size: 15px;
        }
        
        .sidebar-menu a:hover {
            color: white;
            background: rgba(255,255,255,0.1);
            border-left: 4px solid white;
        }
        
        .sidebar-menu a.active {
            color: white;
            background: rgba(255,255,255,0.15);
            border-left: 4px solid white;
        }
        
        .sidebar-menu i {
            width: 25px;
            font-size: 16px;
            margin-right: 10px;
        }
        
        .main-content {
            margin-left: 250px;
            padding: 20px;
            transition: all 0.3s;
        }
        
        .top-bar {
            background: white;
            padding: 15px 20px;
            border-radius: 10px;
            margin-bottom: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .welcome-text h2 {
            font-size: 1.5rem;
            margin: 0;
            color: var(--dark);
        }
        
        .welcome-text p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }
        
        .user-menu .dropdown-toggle {
            border: none;
            background: none;
            color: var(--dark);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            transition: transform 0.3s;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-icon {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            margin-bottom: 15px;
        }
        
        .icon-product { background: rgba(59, 130, 246, 0.1); color: var(--info); }
        .icon-order { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
        .icon-customer { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .icon-revenue { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
        
        .stat-info h3 {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 5px 0;
            color: var(--dark);
        }
        
        .stat-info p {
            color: #666;
            margin: 0;
            font-size: 14px;
        }
        
        .card {
            border: none;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 20px;
        }
        
        .card-header {
            background: white;
            border-bottom: 1px solid #eee;
            padding: 20px;
            border-radius: 10px 10px 0 0 !important;
        }
        
        .card-header h5 {
            margin: 0;
            font-weight: 600;
            color: var(--dark);
        }
        
        .table {
            margin: 0;
        }
        
        .table th {
            border-top: none;
            font-weight: 600;
            color: #666;
            font-size: 14px;
            padding: 15px;
        }
        
        .table td {
            padding: 15px;
            vertical-align: middle;
        }
        
        .badge {
            padding: 6px 12px;
            font-weight: 500;
            border-radius: 6px;
        }
        
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-processing { background: #dbeafe; color: #1e40af; }
        .badge-shipped { background: #f0f9ff; color: #0c4a6e; }
        .badge-delivered { background: #dcfce7; color: #166534; }
        .badge-cancelled { background: #fee2e2; color: #991b1b; }
        
        .status-select {
            border: none;
            background: none;
            padding: 0;
            font-weight: 500;
            cursor: pointer;
        }
        
        .action-btn {
            padding: 5px 10px;
            border-radius: 6px;
            border: none;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-edit {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .btn-edit:hover {
            background: #bfdbfe;
        }
        
        .btn-delete {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .btn-delete:hover {
            background: #fecaca;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                width: 0;
                overflow: hidden;
            }
            
            .sidebar.active {
                width: 250px;
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .top-bar {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }
        }
    </style>
</head>
<body>
    <!-- Sidebar -->
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h3><i class="fas fa-store me-2"></i>Dhaka Market</h3>
            <small class="text-light">Admin Panel</small>
        </div>
        
        <div class="sidebar-menu">
            <ul>
                <li>
                    <a href="/admin/dashboard" class="active">
                        <i class="fas fa-tachometer-alt"></i>Dashboard
                    </a>
                </li>
                <li>
                    <a href="/admin/products">
                        <i class="fas fa-box"></i>Products
                    </a>
                </li>
                <li>
                    <a href="/admin/orders">
                        <i class="fas fa-shopping-cart"></i>Orders
                    </a>
                </li>
                <li>
                    <a href="/admin/categories">
                        <i class="fas fa-list"></i>Categories
                    </a>
                </li>
                <li>
                    <a href="/admin/customers">
                        <i class="fas fa-users"></i>Customers
                    </a>
                </li>
                <li>
                    <a href="/admin/settings">
                        <i class="fas fa-cog"></i>Settings
                    </a>
                </li>
                <li>
                    <a href="/admin/reports">
                        <i class="fas fa-chart-bar"></i>Reports
                    </a>
                </li>
                <li>
                    <a href="/admin/users">
                        <i class="fas fa-user-shield"></i>Admin Users
                    </a>
                </li>
            </ul>
        </div>
        
        <div class="sidebar-footer" style="position: absolute; bottom: 20px; left: 20px; right: 20px;">
            <a href="/admin-logout" class="btn btn-outline-light w-100">
                <i class="fas fa-sign-out-alt me-2"></i>Logout
            </a>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
        <!-- Top Bar -->
        <div class="top-bar">
            <div class="welcome-text">
                <h2>Welcome, ${req.session.user.username}!</h2>
                <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div class="user-menu">
                <div class="dropdown">
                    <button class="dropdown-toggle d-flex align-items-center" type="button" 
                            data-bs-toggle="dropdown" aria-expanded="false">
                        <div class="me-2">
                            <div class="rounded-circle bg-primary d-flex align-items-center justify-content-center" 
                                 style="width: 40px; height: 40px; color: white;">
                                <i class="fas fa-user"></i>
                            </div>
                        </div>
                        <div class="text-start">
                            <strong>${req.session.user.username}</strong>
                            <small class="d-block">${req.session.user.role}</small>
                        </div>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="/admin/profile"><i class="fas fa-user me-2"></i>Profile</a></li>
                        <li><a class="dropdown-item" href="/admin/settings"><i class="fas fa-cog me-2"></i>Settings</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="/admin-logout"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- Statistics -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon icon-product">
                    <i class="fas fa-box"></i>
                </div>
                <div class="stat-info">
                    <h3>${productRow.total || 0}</h3>
                    <p>Total Products</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon icon-order">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="stat-info">
                    <h3>${orderRow.total || 0}</h3>
                    <p>Total Orders</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon icon-customer">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <h3>${customerRow.total || 0}</h3>
                    <p>Total Customers</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon icon-revenue">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="stat-info">
                    <h3>৳${(revenueRow.revenue || 0).toLocaleString('en-IN')}</h3>
                    <p>Total Revenue</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon icon-revenue">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h3>৳${(pendingRow.pending || 0).toLocaleString('en-IN')}</h3>
                    <p>Pending Revenue</p>
                </div>
            </div>
        </div>
        
        <!-- Recent Orders -->
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5><i class="fas fa-history me-2"></i>Recent Orders</h5>
                <a href="/admin/orders" class="btn btn-primary btn-sm">View All</a>
            </div>
            <div class="card-body" style="overflow-x: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Product</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recentOrders.map(order => {
                            const statusClass = {
                                'pending': 'badge-pending',
                                'processing': 'badge-processing',
                                'shipped': 'badge-shipped',
                                'delivered': 'badge-delivered',
                                'cancelled': 'badge-cancelled'
                            }[order.status] || 'badge-pending';
                            
                            return `
                            <tr>
                                <td><strong>${order.order_id}</strong></td>
                                <td>${order.customer_name}<br><small>${order.phone}</small></td>
                                <td>${order.product_name}</td>
                                <td>${formatPrice(order.grand_total)}</td>
                                <td>
                                    <form action="/admin/orders/update-status" method="POST" style="display: inline;">
                                        <input type="hidden" name="order_id" value="${order.id}">
                                        <select name="status" class="status-select ${statusClass}" 
                                                onchange="this.form.submit()">
                                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                        </select>
                                    </form>
                                </td>
                                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                                <td>
                                    <a href="/admin/orders/view/${order.id}" class="action-btn btn-edit">
                                        <i class="fas fa-eye"></i>
                                    </a>
                                    <a href="/admin/orders/edit/${order.id}" class="action-btn btn-edit">
                                        <i class="fas fa-edit"></i>
                                    </a>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="row">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-plus-circle me-2"></i>Quick Actions</h5>
                    </div>
                    <div class="card-body">
                        <a href="/admin/products/add" class="btn btn-primary w-100 mb-2">
                            <i class="fas fa-plus me-2"></i>Add New Product
                        </a>
                        <a href="/admin/orders/add" class="btn btn-success w-100 mb-2">
                            <i class="fas fa-shopping-cart me-2"></i>Create Order
                        </a>
                        <a href="/admin/categories/add" class="btn btn-info w-100 mb-2">
                            <i class="fas fa-tags me-2"></i>Add Category
                        </a>
                        <a href="/admin/reports" class="btn btn-warning w-100">
                            <i class="fas fa-chart-bar me-2"></i>View Reports
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-chart-line me-2"></i>Recent Activity</h5>
                    </div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush">
                            ${recentOrders.slice(0, 5).map(order => {
                                const statusClass = {
                                    'pending': 'badge-pending',
                                    'processing': 'badge-processing',
                                    'shipped': 'badge-shipped',
                                    'delivered': 'badge-delivered',
                                    'cancelled': 'badge-cancelled'
                                }[order.status] || 'badge-pending';
                                
                                return `
                                <li class="list-group-item">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>${order.customer_name}</strong> placed an order
                                            <small class="d-block text-muted">Order #${order.order_id}</small>
                                        </div>
                                        <div class="text-end">
                                            <span class="badge ${statusClass}">${order.status}</span>
                                            <small class="d-block text-muted">
                                                ${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </small>
                                        </div>
                                    </div>
                                </li>
                                `;
                            }).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Mobile sidebar toggle
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('active');
        }
        
        // Auto-refresh dashboard every 60 seconds
        setTimeout(() => {
            window.location.reload();
        }, 60000);
        
        // Notification for new orders
        function checkNewOrders() {
            fetch('/admin/api/new-orders-count')
                .then(response => response.json())
                .then(data => {
                    if (data.count > 0) {
                        showNotification('New Orders', \`You have \${data.count} new order(s)\`);
                    }
                });
        }
        
        // Check every 30 seconds
        setInterval(checkNewOrders, 30000);
        
        function showNotification(title, message) {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body: message });
            }
        }
        
        // Request notification permission on page load
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    </script>
</body>
</html>`;
                                res.send(html);
                            });
                        });
                    });
                });
            });
        });
    });
});

// API for new orders count
app.get('/admin/api/new-orders-count', requireAuth, (req, res) => {
    // Get orders from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    db.get(`SELECT COUNT(*) as count FROM orders WHERE created_at > ?`, 
        [fiveMinutesAgo], (err, result) => {
        if (err) {
            return res.json({ count: 0 });
        }
        res.json({ count: result.count });
    });
});

// Admin Order Status Update
app.post('/admin/orders/update-status', requireAuth, (req, res) => {
    const { order_id, status } = req.body;
    
    db.run(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, 
        [status, order_id], (err) => {
        if (err) {
            console.error('Status update error:', err);
        }
        res.redirect('/admin/dashboard');
    });
});

// ==================== PRODUCT MANAGEMENT ROUTES ====================

// Products List
app.get('/admin/products', requireAuth, (req, res) => {
    const { search, category, status } = req.query;
    let query = `SELECT * FROM products WHERE 1=1`;
    let params = [];
    
    if (search) {
        query += ` AND (name LIKE ? OR description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    if (category) {
        query += ` AND category = ?`;
        params.push(category);
    }
    
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    db.all(query, params, (err, products) => {
        db.all("SELECT DISTINCT category FROM products WHERE category IS NOT NULL", (err, categories) => {
            let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products Management - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .table-actions {
            display: flex;
            gap: 5px;
        }
        
        .table-img {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 5px;
        }
        
        .status-active {
            background: #dcfce7;
            color: #166534;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .status-inactive {
            background: #fee2e2;
            color: #991b1b;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .search-form {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <div class="col-md-3 col-lg-2 d-md-block bg-dark sidebar min-vh-100">
                <div class="position-sticky pt-3">
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/admin/dashboard">
                                <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white active" href="/admin/products">
                                <i class="fas fa-box me-2"></i>Products
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/admin/orders">
                                <i class="fas fa-shopping-cart me-2"></i>Orders
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/admin/categories">
                                <i class="fas fa-list me-2"></i>Categories
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/admin/customers">
                                <i class="fas fa-users me-2"></i>Customers
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/admin-logout">
                                <i class="fas fa-sign-out-alt me-2"></i>Logout
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
            
            <!-- Main Content -->
            <div class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">Products Management</h1>
                    <a href="/admin/products/add" class="btn btn-primary">
                        <i class="fas fa-plus me-2"></i>Add New Product
                    </a>
                </div>
                
                <!-- Search Form -->
                <div class="search-form">
                    <form method="GET" class="row g-3">
                        <div class="col-md-4">
                            <input type="text" name="search" class="form-control" 
                                   placeholder="Search products..." value="${search || ''}">
                        </div>
                        <div class="col-md-3">
                            <select name="category" class="form-control">
                                <option value="">All Categories</option>
                                ${categories.map(cat => `
                                    <option value="${cat.category}" ${category === cat.category ? 'selected' : ''}>
                                        ${cat.category}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select name="status" class="form-control">
                                <option value="">All Status</option>
                                <option value="active" ${status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="fas fa-search"></i> Search
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Products Table -->
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Name</th>
                                        <th>Price</th>
                                        <th>Stock</th>
                                        <th>Category</th>
                                        <th>Status</th>
                                        <th>Sales</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${products.map(product => {
                                        const images = JSON.parse(product.images || '[]');
                                        const mainImage = images[0] || 'https://via.placeholder.com/50x50';
                                        
                                        return `
                                        <tr>
                                            <td>
                                                <img src="${mainImage}" 
                                                     class="table-img"
                                                     alt="${product.name}"
                                                     onerror="this.src='https://via.placeholder.com/50x50'">
                                            </td>
                                            <td>
                                                <strong>${product.name}</strong>
                                                ${product.offer_price ? `
                                                    <div>
                                                        <small class="text-muted">
                                                            <s>${formatPrice(product.price)}</s>
                                                            ${formatPrice(product.offer_price)}
                                                        </small>
                                                    </div>
                                                ` : `
                                                    <div>${formatPrice(product.price)}</div>
                                                `}
                                            </td>
                                            <td>
                                                ${product.offer_price ? `
                                                    <div class="text-danger">${formatPrice(product.offer_price)}</div>
                                                    <small class="text-muted"><s>${formatPrice(product.price)}</s></small>
                                                ` : formatPrice(product.price)}
                                            </td>
                                            <td>
                                                ${product.stock}
                                                ${product.stock < 10 ? '<span class="badge bg-warning">Low</span>' : ''}
                                            </td>
                                            <td>${product.category || '-'}</td>
                                            <td>
                                                <span class="${product.status === 'active' ? 'status-active' : 'status-inactive'}">
                                                    ${product.status}
                                                </span>
                                            </td>
                                            <td>${product.sales}</td>
                                            <td>
                                                <div class="table-actions">
                                                    <a href="/mobile/product/${product.slug}" target="_blank" 
                                                       class="btn btn-sm btn-info" title="View">
                                                        <i class="fas fa-eye"></i>
                                                    </a>
                                                    <a href="/admin/products/edit/${product.id}" 
                                                       class="btn btn-sm btn-warning" title="Edit">
                                                        <i class="fas fa-edit"></i>
                                                    </a>
                                                    <form action="/admin/products/delete/${product.id}" 
                                                          method="POST" style="display: inline;">
                                                        <button type="submit" class="btn btn-sm btn-danger" 
                                                                onclick="return confirm('Are you sure?')" title="Delete">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
            
            res.send(html);
        });
    });
});

// Add Product Page
app.get('/admin/products/add', requireAuth, (req, res) => {
    db.all("SELECT * FROM categories WHERE status = 'active'", (err, categories) => {
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Product - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .image-preview {
            width: 100px;
            height: 100px;
            object-fit: cover;
            border: 2px dashed #ddd;
            border-radius: 5px;
            display: none;
        }
        
        .feature-input-group {
            margin-bottom: 10px;
        }
        
        .image-upload-container {
            border: 2px dashed #ddd;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .image-upload-container:hover {
            border-color: #667eea;
            background: #f8f9fa;
        }
        
        .image-preview-container {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 15px;
        }
        
        .preview-image {
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 5px;
            position: relative;
        }
        
        .remove-image {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #dc3545;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Add New Product</h2>
            <a href="/admin/products" class="btn btn-secondary">
                <i class="fas fa-arrow-left me-2"></i>Back to Products
            </a>
        </div>
        
        <div class="card">
            <div class="card-body">
                <form action="/admin/products/add" method="POST" enctype="multipart/form-data" id="productForm">
                    <div class="row">
                        <div class="col-md-8">
                            <!-- Basic Information -->
                            <div class="mb-3">
                                <label class="form-label">Product Name *</label>
                                <input type="text" name="name" class="form-control" required>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Regular Price *</label>
                                    <input type="number" name="price" class="form-control" step="0.01" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Offer Price</label>
                                    <input type="number" name="offer_price" class="form-control" step="0.01">
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Category</label>
                                    <select name="category" class="form-control">
                                        <option value="">Select Category</option>
                                        ${categories.map(cat => `
                                            <option value="${cat.slug}">${cat.name}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Brand</label>
                                    <input type="text" name="brand" class="form-control">
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Stock Quantity *</label>
                                    <input type="number" name="stock" class="form-control" value="100" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Status</label>
                                    <select name="status" class="form-control">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Description -->
                            <div class="mb-3">
                                <label class="form-label">Description</label>
                                <textarea name="description" class="form-control" rows="4"></textarea>
                            </div>
                            
                            <!-- Features -->
                            <div class="mb-3">
                                <label class="form-label">Features</label>
                                <div id="featuresContainer">
                                    <div class="feature-input-group input-group">
                                        <input type="text" name="features[]" class="form-control" placeholder="Enter a feature">
                                        <button type="button" class="btn btn-outline-danger" onclick="removeFeature(this)">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-primary mt-2" onclick="addFeature()">
                                    <i class="fas fa-plus"></i> Add Feature
                                </button>
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <!-- Image Upload -->
                            <div class="mb-3">
                                <label class="form-label">Product Images</label>
                                <div class="image-upload-container" onclick="document.getElementById('images').click()">
                                    <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                                    <p class="mb-2">Click to upload images</p>
                                    <small class="text-muted">Supported formats: JPG, PNG, GIF</small>
                                    <input type="file" id="images" name="images" 
                                           class="form-control d-none" 
                                           multiple 
                                           accept="image/*"
                                           onchange="previewImages(this)">
                                </div>
                                
                                <div class="image-preview-container" id="imagePreviewContainer">
                                    <!-- Images will be previewed here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save me-2"></i>Save Product
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <script>
        // Features management
        function addFeature() {
            const container = document.getElementById('featuresContainer');
            const div = document.createElement('div');
            div.className = 'feature-input-group input-group mt-2';
            div.innerHTML = \`
                <input type="text" name="features[]" class="form-control" placeholder="Enter a feature">
                <button type="button" class="btn btn-outline-danger" onclick="removeFeature(this)">
                    <i class="fas fa-times"></i>
                </button>
            \`;
            container.appendChild(div);
        }
        
        function removeFeature(button) {
            button.closest('.feature-input-group').remove();
        }
        
        // Image preview
        function previewImages(input) {
            const container = document.getElementById('imagePreviewContainer');
            container.innerHTML = '';
            
            if (input.files) {
                Array.from(input.files).forEach((file, index) => {
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        const div = document.createElement('div');
                        div.className = 'position-relative';
                        div.innerHTML = \`
                            <img src="\${e.target.result}" class="preview-image">
                            <div class="remove-image" onclick="removeImage(\${index})">
                                <i class="fas fa-times"></i>
                            </div>
                        \`;
                        container.appendChild(div);
                    }
                    
                    reader.readAsDataURL(file);
                });
            }
        }
        
        function removeImage(index) {
            const input = document.getElementById('images');
            const dt = new DataTransfer();
            
            // Remove file from input
            for (let i = 0; i < input.files.length; i++) {
                if (i !== index) {
                    dt.items.add(input.files[i]);
                }
            }
            
            input.files = dt.files;
            previewImages(input); // Refresh preview
        }
        
        // Form validation
        document.getElementById('productForm').addEventListener('submit', function(e) {
            const price = parseFloat(this.price.value);
            const offerPrice = parseFloat(this.offer_price.value) || 0;
            
            if (offerPrice > price) {
                e.preventDefault();
                alert('Offer price cannot be higher than regular price');
                return false;
            }
            
            return true;
        });
    </script>
</body>
</html>`;
        
        res.send(html);
    });
});

// Add Product POST Handler
app.post('/admin/products/add', requireAuth, upload.array('images', 5), (req, res) => {
    const { 
        name, price, offer_price, description, 
        category, brand, stock, status, features 
    } = req.body;
    
    const slug = generateSlug(name);
    const imageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    // Handle features array
    const featuresArray = Array.isArray(features) ? features : (features ? [features] : []);
    
    db.run(`INSERT INTO products 
            (name, slug, price, offer_price, images, description, features, category, brand, stock, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name, slug, parseFloat(price), 
            offer_price ? parseFloat(offer_price) : null,
            JSON.stringify(imageUrls),
            description,
            JSON.stringify(featuresArray),
            category,
            brand,
            parseInt(stock),
            status
        ], function(err) {
            if (err) {
                console.error('Product insert error:', err);
                return res.send(`
                    <div class="container mt-5">
                        <div class="alert alert-danger">
                            <h2>Error!</h2>
                            <p>Product could not be added. ${err.message}</p>
                            <a href="/admin/products/add" class="btn btn-primary">Try Again</a>
                        </div>
                    </div>
                `);
            }
            
            res.redirect('/admin/products');
        });
});

// Edit Product Page
app.get('/admin/products/edit/:id', requireAuth, (req, res) => {
    const productId = req.params.id;
    
    db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
        if (!product) {
            return res.redirect('/admin/products');
        }
        
        db.all("SELECT * FROM categories WHERE status = 'active'", (err, categories) => {
            const images = JSON.parse(product.images || '[]');
            const features = JSON.parse(product.features || '[]');
            
            let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Product - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .image-preview-container {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 15px;
        }
        
        .preview-image {
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 5px;
            position: relative;
        }
        
        .remove-image {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #dc3545;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            cursor: pointer;
        }
        
        .feature-input-group {
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Edit Product</h2>
            <a href="/admin/products" class="btn btn-secondary">
                <i class="fas fa-arrow-left me-2"></i>Back to Products
            </a>
        </div>
        
        <div class="card">
            <div class="card-body">
                <form action="/admin/products/edit/${productId}" method="POST" enctype="multipart/form-data" id="productForm">
                    <div class="row">
                        <div class="col-md-8">
                            <!-- Basic Information -->
                            <div class="mb-3">
                                <label class="form-label">Product Name *</label>
                                <input type="text" name="name" class="form-control" 
                                       value="${product.name}" required>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Regular Price *</label>
                                    <input type="number" name="price" class="form-control" 
                                           step="0.01" value="${product.price}" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Offer Price</label>
                                    <input type="number" name="offer_price" class="form-control" 
                                           step="0.01" value="${product.offer_price || ''}">
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Category</label>
                                    <select name="category" class="form-control">
                                        <option value="">Select Category</option>
                                        ${categories.map(cat => `
                                            <option value="${cat.slug}" ${product.category === cat.slug ? 'selected' : ''}>
                                                ${cat.name}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Brand</label>
                                    <input type="text" name="brand" class="form-control" 
                                           value="${product.brand || ''}">
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Stock Quantity *</label>
                                    <input type="number" name="stock" class="form-control" 
                                           value="${product.stock}" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Status</label>
                                    <select name="status" class="form-control">
                                        <option value="active" ${product.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="inactive" ${product.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Description -->
                            <div class="mb-3">
                                <label class="form-label">Description</label>
                                <textarea name="description" class="form-control" rows="4">${product.description || ''}</textarea>
                            </div>
                            
                            <!-- Features -->
                            <div class="mb-3">
                                <label class="form-label">Features</label>
                                <div id="featuresContainer">
                                    ${features.map(feature => `
                                        <div class="feature-input-group input-group">
                                            <input type="text" name="features[]" class="form-control" 
                                                   value="${feature}" placeholder="Enter a feature">
                                            <button type="button" class="btn btn-outline-danger" onclick="removeFeature(this)">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    `).join('')}
                                    ${features.length === 0 ? `
                                        <div class="feature-input-group input-group">
                                            <input type="text" name="features[]" class="form-control" placeholder="Enter a feature">
                                            <button type="button" class="btn btn-outline-danger" onclick="removeFeature(this)">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-primary mt-2" onclick="addFeature()">
                                    <i class="fas fa-plus"></i> Add Feature
                                </button>
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <!-- Existing Images -->
                            <div class="mb-3">
                                <label class="form-label">Current Images</label>
                                <div class="image-preview-container">
                                    ${images.map((img, index) => `
                                        <div class="position-relative">
                                            <img src="${img}" class="preview-image">
                                            <div class="remove-image" onclick="removeExistingImage(${index})">
                                                <i class="fas fa-times"></i>
                                            </div>
                                            <input type="hidden" name="existing_images[]" value="${img}">
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <!-- New Images Upload -->
                            <div class="mb-3">
                                <label class="form-label">Add New Images</label>
                                <input type="file" name="new_images" class="form-control" 
                                       multiple accept="image/*">
                                <small class="text-muted">Select additional images (optional)</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save me-2"></i>Update Product
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <script>
        // Features management
        function addFeature() {
            const container = document.getElementById('featuresContainer');
            const div = document.createElement('div');
            div.className = 'feature-input-group input-group mt-2';
            div.innerHTML = \`
                <input type="text" name="features[]" class="form-control" placeholder="Enter a feature">
                <button type="button" class="btn btn-outline-danger" onclick="removeFeature(this)">
                    <i class="fas fa-times"></i>
                </button>
            \`;
            container.appendChild(div);
        }
        
        function removeFeature(button) {
            button.closest('.feature-input-group').remove();
        }
        
        // Remove existing image
        function removeExistingImage(index) {
            const images = document.querySelectorAll('input[name="existing_images[]"]');
            if (images[index]) {
                images[index].remove();
                images[index].parentElement.remove();
            }
        }
        
        // Form validation
        document.getElementById('productForm').addEventListener('submit', function(e) {
            const price = parseFloat(this.price.value);
            const offerPrice = parseFloat(this.offer_price.value) || 0;
            
            if (offerPrice > price) {
                e.preventDefault();
                alert('Offer price cannot be higher than regular price');
                return false;
            }
            
            return true;
        });
    </script>
</body>
</html>`;
            
            res.send(html);
        });
    });
});

// Edit Product POST Handler
app.post('/admin/products/edit/:id', requireAuth, upload.array('new_images', 5), (req, res) => {
    const productId = req.params.id;
    const { 
        name, price, offer_price, description, 
        category, brand, stock, status, features,
        existing_images = []
    } = req.body;
    
    const existingImages = Array.isArray(existing_images) ? existing_images : [existing_images];
    const newImages = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const allImages = [...existingImages, ...newImages];
    
    // Handle features array
    const featuresArray = Array.isArray(features) ? features : (features ? [features] : []);
    
    db.run(`UPDATE products SET 
            name = ?, 
            price = ?, 
            offer_price = ?, 
            images = ?, 
            description = ?, 
            features = ?, 
            category = ?, 
            brand = ?, 
            stock = ?, 
            status = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
        [
            name,
            parseFloat(price),
            offer_price ? parseFloat(offer_price) : null,
            JSON.stringify(allImages),
            description,
            JSON.stringify(featuresArray),
            category,
            brand,
            parseInt(stock),
            status,
            productId
        ], function(err) {
            if (err) {
                console.error('Product update error:', err);
                return res.send(`
                    <div class="container mt-5">
                        <div class="alert alert-danger">
                            <h2>Error!</h2>
                            <p>Product could not be updated. ${err.message}</p>
                            <a href="/admin/products" class="btn btn-primary">Back to Products</a>
                        </div>
                    </div>
                `);
            }
            
            res.redirect('/admin/products');
        });
});

// Delete Product
app.post('/admin/products/delete/:id', requireAuth, (req, res) => {
    const productId = req.params.id;
    
    db.run("DELETE FROM products WHERE id = ?", [productId], function(err) {
        if (err) {
            console.error('Product delete error:', err);
        }
        res.redirect('/admin/products');
    });
});

// ==================== ORDER MANAGEMENT ROUTES ====================

// Orders List
app.get('/admin/orders', requireAuth, (req, res) => {
    const { search, status, date_from, date_to } = req.query;
    let query = `SELECT * FROM orders WHERE 1=1`;
    let params = [];
    
    if (search) {
        query += ` AND (order_id LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR product_name LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    
    if (date_from) {
        query += ` AND DATE(created_at) >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        query += ` AND DATE(created_at) <= ?`;
        params.push(date_to);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    db.all(query, params, (err, orders) => {
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orders Management - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .order-status-badge {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-processing { background: #dbeafe; color: #1e40af; }
        .status-shipped { background: #f0f9ff; color: #0c4a6e; }
        .status-delivered { background: #dcfce7; color: #166534; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        
        .search-form {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .stats-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            text-align: center;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #333;
        }
        
        .stat-label {
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <div class="col-md-3 col-lg-2 d-md-block bg-dark sidebar min-vh-100">
                <div class="position-sticky pt-3">
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/admin/dashboard">
                                <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/admin/products">
                                <i class="fas fa-box me-2"></i>Products
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white active" href="/admin/orders">
                                <i class="fas fa-shopping-cart me-2"></i>Orders
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/admin/categories">
                                <i class="fas fa-list me-2"></i>Categories
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/admin/customers">
                                <i class="fas fa-users me-2"></i>Customers
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/admin-logout">
                                <i class="fas fa-sign-out-alt me-2"></i>Logout
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
            
            <!-- Main Content -->
            <div class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">Orders Management</h1>
                    <a href="/admin/orders/add" class="btn btn-primary">
                        <i class="fas fa-plus me-2"></i>Create Order
                    </a>
                </div>
                
                <!-- Order Statistics -->
                <div class="stats-cards">
                    <div class="stat-card">
                        <div class="stat-value">${orders.filter(o => o.status === 'pending').length}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${orders.filter(o => o.status === 'processing').length}</div>
                        <div class="stat-label">Processing</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${orders.filter(o => o.status === 'shipped').length}</div>
                        <div class="stat-label">Shipped</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${orders.filter(o => o.status === 'delivered').length}</div>
                        <div class="stat-label">Delivered</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${orders.length}</div>
                        <div class="stat-label">Total Orders</div>
                    </div>
                </div>
                
                <!-- Search Form -->
                <div class="search-form">
                    <form method="GET" class="row g-3">
                        <div class="col-md-3">
                            <input type="text" name="search" class="form-control" 
                                   placeholder="Search orders..." value="${search || ''}">
                        </div>
                        <div class="col-md-2">
                            <select name="status" class="form-control">
                                <option value="">All Status</option>
                                <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="processing" ${status === 'processing' ? 'selected' : ''}>Processing</option>
                                <option value="shipped" ${status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <input type="date" name="date_from" class="form-control" 
                                   value="${date_from || ''}" placeholder="From Date">
                        </div>
                        <div class="col-md-3">
                            <input type="date" name="date_to" class="form-control" 
                                   value="${date_to || ''}" placeholder="To Date">
                        </div>
                        <div class="col-md-1">
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Orders Table -->
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Product</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${orders.map(order => {
                                        const statusClass = `status-${order.status}`;
                                        
                                        return `
                                        <tr>
                                            <td>
                                                <strong>${order.order_id}</strong>
                                                <div class="text-muted">${order.payment_method}</div>
                                            </td>
                                            <td>
                                                <strong>${order.customer_name}</strong>
                                                <div class="text-muted">${order.phone}</div>
                                                <small>${order.address.substring(0, 30)}...</small>
                                            </td>
                                            <td>
                                                ${order.product_name}
                                                <div class="text-muted">Qty: ${order.quantity}</div>
                                            </td>
                                            <td>
                                                <strong>${formatPrice(order.grand_total)}</strong>
                                            </td>
                                            <td>
                                                <span class="order-status-badge ${statusClass}">
                                                    ${order.status}
                                                </span>
                                            </td>
                                            <td>
                                                ${new Date(order.created_at).toLocaleDateString()}
                                                <div class="text-muted">
                                                    ${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </td>
                                            <td>
                                                <div class="btn-group">
                                                    <a href="/admin/orders/view/${order.id}" 
                                                       class="btn btn-sm btn-info" title="View">
                                                        <i class="fas fa-eye"></i>
                                                    </a>
                                                    <a href="/admin/orders/edit/${order.id}" 
                                                       class="btn btn-sm btn-warning" title="Edit">
                                                        <i class="fas fa-edit"></i>
                                                    </a>
                                                    <form action="/admin/orders/delete/${order.id}" 
                                                          method="POST" style="display: inline;">
                                                        <button type="submit" class="btn btn-sm btn-danger" 
                                                                onclick="return confirm('Are you sure?')" title="Delete">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
        
        res.send(html);
    });
});

// View Order Details
app.get('/admin/orders/view/:id', requireAuth, (req, res) => {
    const orderId = req.params.id;
    
    db.get("SELECT * FROM orders WHERE id = ?", [orderId], (err, order) => {
        if (!order) {
            return res.redirect('/admin/orders');
        }
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Details - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .order-details-card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 20px;
        }
        
        .order-header {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px 10px 0 0;
            border-bottom: 1px solid #eee;
        }
        
        .status-badge {
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-processing { background: #dbeafe; color: #1e40af; }
        .status-shipped { background: #f0f9ff; color: #0c4a6e; }
        .status-delivered { background: #dcfce7; color: #166534; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        
        .order-timeline {
            position: relative;
            padding-left: 30px;
        }
        
        .order-timeline::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #dee2e6;
        }
        
        .timeline-item {
            position: relative;
            margin-bottom: 20px;
        }
        
        .timeline-item::before {
            content: '';
            position: absolute;
            left: -23px;
            top: 5px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #6c757d;
        }
        
        .timeline-item.active::before {
            background: #0d6efd;
        }
        
        .timeline-item.completed::before {
            background: #198754;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Order Details</h2>
            <div>
                <a href="/admin/orders" class="btn btn-secondary">
                    <i class="fas fa-arrow-left me-2"></i>Back to Orders
                </a>
                <a href="/admin/orders/edit/${orderId}" class="btn btn-primary ms-2">
                    <i class="fas fa-edit me-2"></i>Edit Order
                </a>
            </div>
        </div>
        
        <!-- Order Header -->
        <div class="order-details-card">
            <div class="order-header">
                <div class="row">
                    <div class="col-md-6">
                        <h4>Order #${order.order_id}</h4>
                        <p class="mb-0">
                            <i class="fas fa-calendar me-2"></i>
                            ${new Date(order.created_at).toLocaleString()}
                        </p>
                    </div>
                    <div class="col-md-6 text-end">
                        <span class="status-badge status-${order.status}">
                            ${order.status.toUpperCase()}
                        </span>
                        <div class="mt-2">
                            <strong>${formatPrice(order.grand_total)}</strong>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="p-4">
                <div class="row">
                    <!-- Order Information -->
                    <div class="col-md-8">
                        <h5 class="mb-3">Order Information</h5>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h6>Customer Details</h6>
                                <p class="mb-1"><strong>Name:</strong> ${order.customer_name}</p>
                                <p class="mb-1"><strong>Phone:</strong> ${order.phone}</p>
                                <p class="mb-1"><strong>Email:</strong> ${order.customer_email || 'N/A'}</p>
                                <p class="mb-0"><strong>Address:</strong> ${order.address}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Shipping Information</h6>
                                <p class="mb-1"><strong>Area:</strong> ${order.shipping_area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}</p>
                                <p class="mb-1"><strong>Cost:</strong> ${formatPrice(order.shipping_cost)}</p>
                                <p class="mb-0"><strong>Method:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}</p>
                            </div>
                        </div>
                        
                        <h5 class="mb-3">Product Details</h5>
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Price</th>
                                        <th>Quantity</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <strong>${order.product_name}</strong>
                                            ${order.product_id ? `
                                                <br>
                                                <a href="/admin/products/edit/${order.product_id}" class="text-decoration-none">
                                                    <small>View Product</small>
                                                </a>
                                            ` : ''}
                                        </td>
                                        <td>${formatPrice(order.unit_price)}</td>
                                        <td>${order.quantity}</td>
                                        <td>${formatPrice(order.total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Order Notes -->
                        ${order.notes ? `
                        <div class="mt-4">
                            <h6>Order Notes</h6>
                            <div class="alert alert-info">
                                ${order.notes}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Order Summary & Timeline -->
                    <div class="col-md-4">
                        <!-- Order Summary -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h6 class="mb-0">Order Summary</h6>
                            </div>
                            <div class="card-body">
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Subtotal:</span>
                                    <span>${formatPrice(order.total)}</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Shipping:</span>
                                    <span>${formatPrice(order.shipping_cost)}</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Discount:</span>
                                    <span>${formatPrice(order.discount)}</span>
                                </div>
                                <hr>
                                <div class="d-flex justify-content-between">
                                    <strong>Total:</strong>
                                    <strong class="text-primary">${formatPrice(order.grand_total)}</strong>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Order Timeline -->
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Order Status Timeline</h6>
                            </div>
                            <div class="card-body">
                                <div class="order-timeline">
                                    <div class="timeline-item ${order.status === 'pending' ? 'active' : 'completed'}">
                                        <strong>Order Placed</strong>
                                        <p class="text-muted mb-0">${new Date(order.created_at).toLocaleString()}</p>
                                    </div>
                                    <div class="timeline-item ${order.status === 'processing' ? 'active' : (order.status === 'shipped' || order.status === 'delivered' ? 'completed' : '')}">
                                        <strong>Processing</strong>
                                        <p class="text-muted mb-0">Order is being processed</p>
                                    </div>
                                    <div class="timeline-item ${order.status === 'shipped' ? 'active' : (order.status === 'delivered' ? 'completed' : '')}">
                                        <strong>Shipped</strong>
                                        <p class="text-muted mb-0">Order has been shipped</p>
                                    </div>
                                    <div class="timeline-item ${order.status === 'delivered' ? 'active' : ''}">
                                        <strong>Delivered</strong>
                                        <p class="text-muted mb-0">Order has been delivered</p>
                                    </div>
                                </div>
                                
                                <!-- Status Update Form -->
                                <form action="/admin/orders/update-status" method="POST" class="mt-4">
                                    <input type="hidden" name="order_id" value="${orderId}">
                                    <div class="mb-3">
                                        <label class="form-label">Update Status</label>
                                        <select name="status" class="form-control">
                                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                        </select>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">
                                        <i class="fas fa-save me-2"></i>Update Status
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
        
        res.send(html);
    });
});

// Edit Order Page
app.get('/admin/orders/edit/:id', requireAuth, (req, res) => {
    const orderId = req.params.id;
    
    db.get("SELECT * FROM orders WHERE id = ?", [orderId], (err, order) => {
        if (!order) {
            return res.redirect('/admin/orders');
        }
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Order - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Edit Order #${order.order_id}</h2>
            <a href="/admin/orders" class="btn btn-secondary">
                <i class="fas fa-arrow-left me-2"></i>Back to Orders
            </a>
        </div>
        
        <div class="card">
            <div class="card-body">
                <form action="/admin/orders/edit/${orderId}" method="POST">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Customer Name *</label>
                                <input type="text" name="customer_name" class="form-control" 
                                       value="${order.customer_name}" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Phone Number *</label>
                                <input type="text" name="phone" class="form-control" 
                                       value="${order.phone}" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" name="customer_email" class="form-control" 
                                       value="${order.customer_email || ''}">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Shipping Area</label>
                                <select name="shipping_area" class="form-control">
                                    <option value="inside_dhaka" ${order.shipping_area === 'inside_dhaka' ? 'selected' : ''}>Inside Dhaka</option>
                                    <option value="outside_dhaka" ${order.shipping_area === 'outside_dhaka' ? 'selected' : ''}>Outside Dhaka</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Shipping Address *</label>
                        <textarea name="address" class="form-control" rows="3" required>${order.address}</textarea>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label">Product Name *</label>
                                <input type="text" name="product_name" class="form-control" 
                                       value="${order.product_name}" required>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label">Quantity *</label>
                                <input type="number" name="quantity" class="form-control" 
                                       value="${order.quantity}" min="1" required>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label">Unit Price *</label>
                                <input type="number" name="unit_price" class="form-control" 
                                       value="${order.unit_price}" step="0.01" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Shipping Cost</label>
                                <input type="number" name="shipping_cost" class="form-control" 
                                       value="${order.shipping_cost}" step="0.01" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Discount</label>
                                <input type="number" name="discount" class="form-control" 
                                       value="${order.discount || 0}" step="0.01">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Payment Method</label>
                                <select name="payment_method" class="form-control">
                                    <option value="cod" ${order.payment_method === 'cod' ? 'selected' : ''}>Cash on Delivery</option>
                                    <option value="bkash" ${order.payment_method === 'bkash' ? 'selected' : ''}>bKash</option>
                                    <option value="card" ${order.payment_method === 'card' ? 'selected' : ''}>Card</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Status</label>
                                <select name="status" class="form-control">
                                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Notes</label>
                        <textarea name="notes" class="form-control" rows="3">${order.notes || ''}</textarea>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save me-2"></i>Update Order
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>`;
        
        res.send(html);
    });
});

// Edit Order POST Handler
app.post('/admin/orders/edit/:id', requireAuth, (req, res) => {
    const orderId = req.params.id;
    const {
        customer_name, customer_email, phone, address,
        shipping_area, product_name, quantity, unit_price,
        shipping_cost, discount, payment_method, status, notes
    } = req.body;
    
    const total = parseFloat(unit_price) * parseInt(quantity);
    const grandTotal = total - parseFloat(discount || 0) + parseFloat(shipping_cost);
    
    db.run(`UPDATE orders SET 
            customer_name = ?, 
            customer_email = ?, 
            phone = ?, 
            address = ?, 
            shipping_area = ?, 
            product_name = ?, 
            quantity = ?, 
            unit_price = ?, 
            total = ?, 
            shipping_cost = ?, 
            discount = ?, 
            grand_total = ?, 
            payment_method = ?, 
            status = ?, 
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
        [
            customer_name,
            customer_email,
            phone,
            address,
            shipping_area,
            product_name,
            parseInt(quantity),
            parseFloat(unit_price),
            total,
            parseFloat(shipping_cost),
            parseFloat(discount || 0),
            grandTotal,
            payment_method,
            status,
            notes,
            orderId
        ], function(err) {
            if (err) {
                console.error('Order update error:', err);
                return res.send(`
                    <div class="container mt-5">
                        <div class="alert alert-danger">
                            <h2>Error!</h2>
                            <p>Order could not be updated. ${err.message}</p>
                            <a href="/admin/orders" class="btn btn-primary">Back to Orders</a>
                        </div>
                    </div>
                `);
            }
            
            res.redirect('/admin/orders');
        });
});

// Delete Order
app.post('/admin/orders/delete/:id', requireAuth, (req, res) => {
    const orderId = req.params.id;
    
    db.run("DELETE FROM orders WHERE id = ?", [orderId], function(err) {
        if (err) {
            console.error('Order delete error:', err);
        }
        res.redirect('/admin/orders');
    });
});

// ==================== CATEGORY MANAGEMENT ROUTES ====================

// Categories List
app.get('/admin/categories', requireAuth, (req, res) => {
    db.all("SELECT * FROM categories ORDER BY sort_order", (err, categories) => {
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Categories Management - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Categories Management</h2>
            <a href="/admin/categories/add" class="btn btn-primary">
                <i class="fas fa-plus me-2"></i>Add Category
            </a>
        </div>
        
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Slug</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Sort Order</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${categories.map((category, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>
                                    <strong>${category.name}</strong>
                                </td>
                                <td>${category.slug}</td>
                                <td>${category.description || '-'}</td>
                                <td>
                                    <span class="badge ${category.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                                        ${category.status}
                                    </span>
                                </td>
                                <td>${category.sort_order}</td>
                                <td>
                                    <div class="btn-group">
                                        <a href="/admin/categories/edit/${category.id}" 
                                           class="btn btn-sm btn-warning">
                                            <i class="fas fa-edit"></i>
                                        </a>
                                        <form action="/admin/categories/delete/${category.id}" 
                                              method="POST" style="display: inline;">
                                            <button type="submit" class="btn btn-sm btn-danger" 
                                                    onclick="return confirm('Are you sure?')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
        
        res.send(html);
    });
});

// Add Category Page
app.get('/admin/categories/add', requireAuth, (req, res) => {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Category - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Add New Category</h2>
            <a href="/admin/categories" class="btn btn-secondary">
                <i class="fas fa-arrow-left me-2"></i>Back to Categories
            </a>
        </div>
        
        <div class="card">
            <div class="card-body">
                <form action="/admin/categories/add" method="POST">
                    <div class="mb-3">
                        <label class="form-label">Category Name *</label>
                        <input type="text" name="name" class="form-control" required>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Description</label>
                        <textarea name="description" class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Sort Order</label>
                                <input type="number" name="sort_order" class="form-control" value="0">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Status</label>
                                <select name="status" class="form-control">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save me-2"></i>Save Category
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>`;
    
    res.send(html);
});

// Add Category POST Handler
app.post('/admin/categories/add', requireAuth, (req, res) => {
    const { name, description, sort_order, status } = req.body;
    const slug = generateSlug(name);
    
    db.run(`INSERT INTO categories (name, slug, description, sort_order, status) 
            VALUES (?, ?, ?, ?, ?)`,
        [name, slug, description, parseInt(sort_order), status], function(err) {
            if (err) {
                console.error('Category insert error:', err);
                return res.send(`
                    <div class="container mt-5">
                        <div class="alert alert-danger">
                            <h2>Error!</h2>
                            <p>Category could not be added. ${err.message}</p>
                            <a href="/admin/categories/add" class="btn btn-primary">Try Again</a>
                        </div>
                    </div>
                `);
            }
            
            res.redirect('/admin/categories');
        });
});

// Edit Category Page
app.get('/admin/categories/edit/:id', requireAuth, (req, res) => {
    const categoryId = req.params.id;
    
    db.get("SELECT * FROM categories WHERE id = ?", [categoryId], (err, category) => {
        if (!category) {
            return res.redirect('/admin/categories');
        }
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Category - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Edit Category</h2>
            <a href="/admin/categories" class="btn btn-secondary">
                <i class="fas fa-arrow-left me-2"></i>Back to Categories
            </a>
        </div>
        
        <div class="card">
            <div class="card-body">
                <form action="/admin/categories/edit/${categoryId}" method="POST">
                    <div class="mb-3">
                        <label class="form-label">Category Name *</label>
                        <input type="text" name="name" class="form-control" 
                               value="${category.name}" required>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Description</label>
                        <textarea name="description" class="form-control" rows="3">${category.description || ''}</textarea>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Sort Order</label>
                                <input type="number" name="sort_order" class="form-control" 
                                       value="${category.sort_order}">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Status</label>
                                <select name="status" class="form-control">
                                    <option value="active" ${category.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${category.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save me-2"></i>Update Category
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>`;
        
        res.send(html);
    });
});

// Edit Category POST Handler
app.post('/admin/categories/edit/:id', requireAuth, (req, res) => {
    const categoryId = req.params.id;
    const { name, description, sort_order, status } = req.body;
    
    db.run(`UPDATE categories SET 
            name = ?, 
            description = ?, 
            sort_order = ?, 
            status = ? 
            WHERE id = ?`,
        [name, description, parseInt(sort_order), status, categoryId], function(err) {
            if (err) {
                console.error('Category update error:', err);
                return res.send(`
                    <div class="container mt-5">
                        <div class="alert alert-danger">
                            <h2>Error!</h2>
                            <p>Category could not be updated. ${err.message}</p>
                            <a href="/admin/categories" class="btn btn-primary">Back to Categories</a>
                        </div>
                    </div>
                `);
            }
            
            res.redirect('/admin/categories');
        });
});

// Delete Category
app.post('/admin/categories/delete/:id', requireAuth, (req, res) => {
    const categoryId = req.params.id;
    
    db.run("DELETE FROM categories WHERE id = ?", [categoryId], function(err) {
        if (err) {
            console.error('Category delete error:', err);
        }
        res.redirect('/admin/categories');
    });
});

// ==================== CUSTOMER MANAGEMENT ROUTES ====================

// Customers List
app.get('/admin/customers', requireAuth, (req, res) => {
    const { search } = req.query;
    let query = `SELECT * FROM customers WHERE 1=1`;
    let params = [];
    
    if (search) {
        query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    db.all(query, params, (err, customers) => {
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customers Management - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Customers Management</h2>
        </div>
        
        <!-- Search Form -->
        <div class="card mb-4">
            <div class="card-body">
                <form method="GET" class="row g-3">
                    <div class="col-md-10">
                        <input type="text" name="search" class="form-control" 
                               placeholder="Search customers by name, phone or email..." 
                               value="${search || ''}">
                    </div>
                    <div class="col-md-2">
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="fas fa-search"></i> Search
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Address</th>
                                <th>Orders</th>
                                <th>Total Spent</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customers.map((customer, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>
                                    <strong>${customer.name}</strong>
                                </td>
                                <td>
                                    <div>${customer.phone}</div>
                                    ${customer.email ? `<div class="text-muted">${customer.email}</div>` : ''}
                                </td>
                                <td>${customer.address || '-'}</td>
                                <td>
                                    <span class="badge bg-primary">${customer.total_orders}</span>
                                </td>
                                <td>
                                    <strong>${formatPrice(customer.total_spent)}</strong>
                                </td>
                                <td>
                                    ${new Date(customer.created_at).toLocaleDateString()}
                                </td>
                                <td>
                                    <div class="btn-group">
                                        <a href="/admin/orders?search=${customer.phone}" 
                                           class="btn btn-sm btn-info" title="View Orders">
                                            <i class="fas fa-shopping-cart"></i>
                                        </a>
                                        <button type="button" class="btn btn-sm btn-warning" 
                                                onclick="viewCustomerDetails(${customer.id})" title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Customer Details Modal -->
    <div class="modal fade" id="customerModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Customer Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" id="customerDetails">
                    Loading...
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function viewCustomerDetails(customerId) {
            fetch('/admin/api/customers/' + customerId)
                .then(response => response.json())
                .then(customer => {
                    const modalBody = document.getElementById('customerDetails');
                    modalBody.innerHTML = \`
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Personal Information</h6>
                                <p><strong>Name:</strong> \${customer.name}</p>
                                <p><strong>Phone:</strong> \${customer.phone}</p>
                                <p><strong>Email:</strong> \${customer.email || 'N/A'}</p>
                                <p><strong>Address:</strong> \${customer.address || 'N/A'}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Order Statistics</h6>
                                <p><strong>Total Orders:</strong> \${customer.total_orders}</p>
                                <p><strong>Total Spent:</strong> \${formatPrice(customer.total_spent)}</p>
                                <p><strong>Customer Since:</strong> \${new Date(customer.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <a href="/admin/orders?search=\${customer.phone}" class="btn btn-primary">
                                <i class="fas fa-shopping-cart me-2"></i>View All Orders
                            </a>
                        </div>
                    \`;
                    
                    const modal = new bootstrap.Modal(document.getElementById('customerModal'));
                    modal.show();
                });
        }
        
        // Helper function to format price
        function formatPrice(price) {
            return '৳' + parseFloat(price).toLocaleString('en-IN');
        }
    </script>
</body>
</html>`;
        
        res.send(html);
    });
});

// Customer Details API
app.get('/admin/api/customers/:id', requireAuth, (req, res) => {
    const customerId = req.params.id;
    
    db.get("SELECT * FROM customers WHERE id = ?", [customerId], (err, customer) => {
        if (err || !customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        res.json(customer);
    });
});

// ==================== MAIN ROUTES ====================

// Root route - redirect based on device
app.get('/', (req, res) => {
    if (req.isMobile) {
        res.redirect('/mobile');
    } else {
        // Desktop home page
        db.all("SELECT * FROM products WHERE status = 'active' ORDER BY sales DESC LIMIT 12", (err, products) => {
            db.all("SELECT * FROM categories WHERE status = 'active' LIMIT 8", (err, categories) => {
                let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dhaka Market - Best Online Shopping in Bangladesh</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .hero-section {
            background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop');
            background-size: cover;
            background-position: center;
            color: white;
            padding: 100px 0;
            text-align: center;
        }
        
        .product-card {
            transition: transform 0.3s;
            border: 1px solid #eee;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        
        .category-card {
            text-align: center;
            padding: 20px;
            border: 1px solid #eee;
            border-radius: 10px;
            transition: all 0.3s;
        }
        
        .category-card:hover {
            background: #f8f9fa;
            border-color: #ff6b6b;
        }
        
        .category-icon {
            font-size: 40px;
            color: #ff6b6b;
            margin-bottom: 15px;
        }
        
        .admin-link {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            z-index: 1000;
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-store text-primary me-2"></i>
                <strong>Dhaka Market</strong>
            </a>
            
            <div class="navbar-nav ms-auto">
                <a href="/admin-login" class="nav-link">
                    <i class="fas fa-user me-2"></i>Admin Login
                </a>
            </div>
        </div>
    </nav>
    
    <!-- Hero Section -->
    <section class="hero-section">
        <div class="container">
            <h1 class="display-4 mb-4">Welcome to Dhaka Market</h1>
            <p class="lead mb-4">Best Online Shopping Experience in Bangladesh</p>
            <a href="/mobile" class="btn btn-primary btn-lg">
                <i class="fas fa-mobile-alt me-2"></i>Go to Mobile Version
            </a>
        </div>
    </section>
    
    <!-- Categories -->
    <section class="py-5">
        <div class="container">
            <h2 class="text-center mb-5">Shop by Category</h2>
            <div class="row g-4">
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
                    <div class="col-md-3 col-sm-6">
                        <a href="/mobile/products?category=${category.slug}" class="text-decoration-none text-dark">
                            <div class="category-card">
                                <div class="category-icon">
                                    <i class="${icon}"></i>
                                </div>
                                <h5>${category.name}</h5>
                                <p class="text-muted">${category.description || ''}</p>
                            </div>
                        </a>
                    </div>`;
                }).join('')}
            </div>
        </div>
    </section>
    
    <!-- Featured Products -->
    <section class="py-5 bg-light">
        <div class="container">
            <h2 class="text-center mb-5">Featured Products</h2>
            <div class="row g-4">
                ${products.map(product => {
                    const images = JSON.parse(product.images || '[]');
                    const discount = product.offer_price ? 
                        Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
                    
                    return `
                    <div class="col-lg-3 col-md-4 col-sm-6">
                        <div class="product-card h-100">
                            <a href="/mobile/product/${product.slug}" class="text-decoration-none text-dark">
                                <img src="${images[0] || 'https://via.placeholder.com/300x300'}" 
                                     class="img-fluid" 
                                     alt="${product.name}"
                                     style="height: 200px; object-fit: cover; width: 100%;">
                                <div class="p-3">
                                    <h6 class="mb-2">${product.name}</h6>
                                    ${product.offer_price ? `
                                        <div class="mb-2">
                                            <span class="text-danger fw-bold">${formatPrice(product.offer_price)}</span>
                                            <span class="text-muted text-decoration-line-through ms-2">${formatPrice(product.price)}</span>
                                            ${discount > 0 ? `
                                                <span class="badge bg-danger ms-2">${discount}% OFF</span>
                                            ` : ''}
                                        </div>
                                    ` : `
                                        <div class="mb-2 fw-bold">${formatPrice(product.price)}</div>
                                    `}
                                    <div class="d-flex justify-content-between align-items-center">
                                        <small class="text-muted">
                                            <i class="fas fa-box"></i> ${product.stock} in stock
                                        </small>
                                        <button class="btn btn-sm btn-primary">
                                            <i class="fas fa-cart-plus"></i>
                                        </button>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>`;
                }).join('')}
            </div>
            <div class="text-center mt-5">
                <a href="/mobile/products" class="btn btn-outline-primary">
                    View All Products <i class="fas fa-arrow-right ms-2"></i>
                </a>
            </div>
        </div>
    </section>
    
    <!-- Footer -->
    <footer class="bg-dark text-white py-5">
        <div class="container">
            <div class="row">
                <div class="col-md-4">
                    <h5>Dhaka Market</h5>
                    <p>Best online shopping platform in Bangladesh with cash on delivery.</p>
                </div>
                <div class="col-md-4">
                    <h5>Contact Us</h5>
                    <p><i class="fas fa-phone me-2"></i> +880 1234-567890</p>
                    <p><i class="fas fa-envelope me-2"></i> info@dhakamarket.com</p>
                </div>
                <div class="col-md-4">
                    <h5>Quick Links</h5>
                    <ul class="list-unstyled">
                        <li><a href="/mobile" class="text-white text-decoration-none">Mobile Version</a></li>
                        <li><a href="/admin-login" class="text-white text-decoration-none">Admin Login</a></li>
                        <li><a href="/mobile/contact" class="text-white text-decoration-none">Contact Us</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </footer>
    
    <!-- Admin Quick Link -->
    <a href="/admin-login" class="admin-link">
        <i class="fas fa-user"></i>
    </a>
</body>
</html>`;
                
                res.send(html);
            });
        });
    }
});

// ==================== ERROR HANDLING ====================

// 404 Error Handler
app.use((req, res) => {
    res.status(404).send(`
        <div class="container mt-5 text-center">
            <h1 class="text-danger">404</h1>
            <h2>Page Not Found</h2>
            <p>The page you are looking for does not exist.</p>
            <a href="/" class="btn btn-primary">Go to Home</a>
        </div>
    `);
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send(`
        <div class="container mt-5 text-center">
            <h1 class="text-danger">500</h1>
            <h2>Internal Server Error</h2>
            <p>Something went wrong. Please try again later.</p>
            <a href="/" class="btn btn-primary">Go to Home</a>
        </div>
    `);
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║   Dhaka Market E-commerce Started Successfully!         ║
    ║                                                          ║
    ║   Local: http://localhost:${PORT}                       ║
    ║   Mobile: http://localhost:${PORT}/mobile               ║
    ║   Admin: http://localhost:${PORT}/admin-login           ║
    ║                                                          ║
    ║   Admin Credentials:                                     ║
    ║   Username: admin                                        ║
    ║   Password: admin123                                     ║
    ║                                                          ║
    ║   Features:                                              ║
    ║   • Mobile-First Design                                  ║
    ║   • Admin Dashboard                                      ║
    ║   • Product Management                                   ║
    ║   • Order Management                                     ║
    ║   • Customer Management                                  ║
    ║   • Category Management                                  ║
    ║   • Cash on Delivery                                     ║
    ║   • Order Tracking                                       ║
    ║   • WhatsApp Integration                                 ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    `);
});
