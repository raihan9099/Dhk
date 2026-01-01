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

function getStatusBadge(status) {
    const badges = {
        'pending': 'warning',
        'processing': 'info',
        'shipped': 'primary',
        'delivered': 'success',
        'cancelled': 'danger'
    };
    return badges[status] || 'secondary';
}

function getPaymentStatusBadge(status) {
    const badges = {
        'pending': 'warning',
        'paid': 'success',
        'failed': 'danger',
        'refunded': 'info'
    };
    return badges[status] || 'secondary';
}

// CSV Export Functions
async function exportOrdersToCSV(filter = {}) {
    let query = `SELECT * FROM orders WHERE 1=1`;
    let params = [];
    
    if (filter.startDate) {
        query += ` AND DATE(created_at) >= DATE(?)`;
        params.push(filter.startDate);
    }
    
    if (filter.endDate) {
        query += ` AND DATE(created_at) <= DATE(?)`;
        params.push(filter.endDate);
    }
    
    if (filter.status && filter.status !== 'all') {
        query += ` AND status = ?`;
        params.push(filter.status);
    }
    
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            
            const csvWriter = csv({
                path: `exports/orders_${Date.now()}.csv`,
                header: [
                    { id: 'order_id', title: 'Order ID' },
                    { id: 'customer_name', title: 'Customer Name' },
                    { id: 'phone', title: 'Phone' },
                    { id: 'address', title: 'Address' },
                    { id: 'product_name', title: 'Product' },
                    { id: 'quantity', title: 'Quantity' },
                    { id: 'unit_price', title: 'Unit Price' },
                    { id: 'total', title: 'Total' },
                    { id: 'status', title: 'Status' },
                    { id: 'payment_method', title: 'Payment Method' },
                    { id: 'created_at', title: 'Order Date' }
                ]
            });
            
            csvWriter.writeRecords(rows)
                .then(() => resolve(csvWriter.path))
                .catch(reject);
        });
    });
}

async function exportProductsToCSV() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM products`, (err, rows) => {
            if (err) reject(err);
            
            const csvWriter = csv({
                path: `exports/products_${Date.now()}.csv`,
                header: [
                    { id: 'name', title: 'Product Name' },
                    { id: 'slug', title: 'Slug' },
                    { id: 'price', title: 'Price' },
                    { id: 'offer_price', title: 'Offer Price' },
                    { id: 'category', title: 'Category' },
                    { id: 'stock', title: 'Stock' },
                    { id: 'sales', title: 'Sales' },
                    { id: 'views', title: 'Views' },
                    { id: 'status', title: 'Status' },
                    { id: 'created_at', title: 'Created At' }
                ]
            });
            
            csvWriter.writeRecords(rows)
                .then(() => resolve(csvWriter.path))
                .catch(reject);
        });
    });
}

// Create exports directory if it doesn't exist
if (!fs.existsSync('exports')) {
    fs.mkdirSync('exports');
}

// Routes

// Home page
app.get('/', (req, res) => {
    db.all("SELECT * FROM products WHERE status = 'active' ORDER BY sales DESC LIMIT 8", (err, products) => {
        db.all("SELECT * FROM categories WHERE status = 'active' LIMIT 6", (err, categories) => {
            let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dhaka Market - Best Online Shopping in Bangladesh</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.theme.default.min.css">
    <style>
        :root {
            --primary: #ff6b6b;
            --secondary: #4ecdc4;
            --dark: #2c3e50;
            --light: #f8f9fa;
        }
        
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f7fb;
            color: #333;
        }
        
        .navbar {
            background: linear-gradient(135deg, var(--dark) 0%, #1a252f 100%);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            padding: 15px 0;
        }
        
        .navbar-brand {
            font-weight: 700;
            font-size: 1.8rem;
            background: linear-gradient(135deg, var(--primary) 0%, #ff8e8e 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .hero-section {
            background: linear-gradient(rgba(44, 62, 80, 0.9), rgba(44, 62, 80, 0.9)), 
                        url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=600&fit=crop');
            background-size: cover;
            background-position: center;
            color: white;
            padding: 120px 0;
            text-align: center;
            margin-bottom: 60px;
            border-radius: 0 0 30px 30px;
        }
        
        .hero-title {
            font-size: 3.5rem;
            font-weight: 800;
            margin-bottom: 20px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .product-card {
            border: none;
            border-radius: 20px;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            background: white;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            margin-bottom: 30px;
            position: relative;
        }
        
        .product-card:hover {
            transform: translateY(-15px) scale(1.02);
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
        }
        
        .product-card .card-img-top {
            height: 250px;
            object-fit: cover;
            transition: transform 0.5s;
        }
        
        .product-card:hover .card-img-top {
            transform: scale(1.1);
        }
        
        .product-badge {
            position: absolute;
            top: 15px;
            left: 15px;
            background: var(--primary);
            color: white;
            padding: 8px 15px;
            border-radius: 25px;
            font-weight: 600;
            font-size: 0.9rem;
            z-index: 2;
        }
        
        .category-card {
            background: white;
            border-radius: 15px;
            padding: 30px 20px;
            text-align: center;
            transition: all 0.3s;
            box-shadow: 0 8px 25px rgba(0,0,0,0.05);
            border: 2px solid transparent;
        }
        
        .category-card:hover {
            transform: translateY(-10px);
            border-color: var(--primary);
            box-shadow: 0 15px 35px rgba(255,107,107,0.15);
        }
        
        .category-icon {
            font-size: 3rem;
            color: var(--primary);
            margin-bottom: 15px;
        }
        
        .btn-primary-custom {
            background: linear-gradient(135deg, var(--primary) 0%, #ff8e8e 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 30px;
            font-weight: 600;
            transition: all 0.3s;
            box-shadow: 0 5px 15px rgba(255,107,107,0.3);
        }
        
        .btn-primary-custom:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(255,107,107,0.4);
            color: white;
        }
        
        .old-price {
            text-decoration: line-through;
            color: #999;
            font-size: 0.9rem;
        }
        
        .offer-price {
            color: var(--primary);
            font-weight: bold;
            font-size: 1.4rem;
        }
        
        .discount-badge {
            background: linear-gradient(135deg, var(--secondary) 0%, #26a69a 100%);
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .features-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 80px 0;
            border-radius: 30px;
            margin: 80px 0;
        }
        
        .feature-icon {
            font-size: 2.5rem;
            margin-bottom: 20px;
            color: #ffd166;
        }
        
        .footer {
            background: var(--dark);
            color: white;
            padding: 60px 0 20px;
            margin-top: 80px;
        }
        
        .social-icons a {
            color: white;
            font-size: 1.2rem;
            margin: 0 10px;
            transition: all 0.3s;
        }
        
        .social-icons a:hover {
            color: var(--primary);
            transform: translateY(-3px);
        }
        
        .whatsapp-float {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #25D366;
            color: white;
            width: 70px;
            height: 70px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 35px;
            z-index: 1000;
            box-shadow: 0 8px 25px rgba(37, 211, 102, 0.4);
            transition: all 0.3s;
            animation: pulse 2s infinite;
        }
        
        .whatsapp-float:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 30px rgba(37, 211, 102, 0.6);
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(37, 211, 102, 0); }
            100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
        
        .live-order-notification {
            position: fixed;
            bottom: 120px;
            right: 30px;
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 35px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideInRight 0.5s;
            max-width: 300px;
            border-left: 5px solid var(--secondary);
            display: none;
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .stats-counter {
            background: white;
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            transition: all 0.3s;
        }
        
        .stats-counter:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .stats-number {
            font-size: 3rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        @media (max-width: 768px) {
            .hero-title {
                font-size: 2.5rem;
            }
            
            .product-card {
                margin-bottom: 20px;
            }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-store me-2"></i>Dhaka Market
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item">
                        <a class="nav-link active" href="/">
                            <i class="fas fa-home me-1"></i> Home
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/products">
                            <i class="fas fa-box me-1"></i> Products
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/categories">
                            <i class="fas fa-list me-1"></i> Categories
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/track-order">
                            <i class="fas fa-search me-1"></i> Track Order
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/contact">
                            <i class="fas fa-phone me-1"></i> Contact
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/admin-login">
                            <i class="fas fa-user-shield me-1"></i> Admin
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section">
        <div class="container">
            <h1 class="hero-title">Welcome to Dhaka Market</h1>
            <p class="lead fs-4 mb-4">Best Online Shopping Platform in Bangladesh</p>
            <p class="mb-5">Fast Delivery • Cash on Delivery • 24/7 Support • Best Prices</p>
            <a href="/products" class="btn btn-primary-custom btn-lg px-5 py-3">
                <i class="fas fa-shopping-cart me-2"></i>Start Shopping Now
            </a>
        </div>
    </section>

    <!-- Statistics -->
    <div class="container mb-5">
        <div class="row g-4">
            <div class="col-md-3 col-6">
                <div class="stats-counter">
                    <div class="stats-number" id="totalProducts">0</div>
                    <p>Total Products</p>
                </div>
            </div>
            <div class="col-md-3 col-6">
                <div class="stats-counter">
                    <div class="stats-number" id="totalOrders">0</div>
                    <p>Orders Completed</p>
                </div>
            </div>
            <div class="col-md-3 col-6">
                <div class="stats-counter">
                    <div class="stats-number" id="happyCustomers">0</div>
                    <p>Happy Customers</p>
                </div>
            </div>
            <div class="col-md-3 col-6">
                <div class="stats-counter">
                    <div class="stats-number" id="deliveryRate">100%</div>
                    <p>Delivery Rate</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Featured Categories -->
    <div class="container mb-5">
        <h2 class="text-center mb-5">Shop by Category</h2>
        <div class="row g-4">`;
            
            const categoryIcons = {
                'electronics': 'fas fa-laptop',
                'fashion': 'fas fa-tshirt',
                'home-appliances': 'fas fa-blender',
                'beauty': 'fas fa-spa',
                'sports': 'fas fa-futbol',
                'books': 'fas fa-book',
                'toys': 'fas fa-gamepad'
            };
            
            categories.forEach(category => {
                const icon = categoryIcons[category.slug] || 'fas fa-shopping-bag';
                html += `
                <div class="col-lg-2 col-md-4 col-6">
                    <a href="/products?category=${category.slug}" class="text-decoration-none">
                        <div class="category-card">
                            <div class="category-icon">
                                <i class="${icon}"></i>
                            </div>
                            <h6 class="mb-0">${category.name}</h6>
                        </div>
                    </a>
                </div>`;
            });
            
            html += `
        </div>
    </div>

    <!-- Featured Products -->
    <div class="container mb-5">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Featured Products</h2>
            <a href="/products" class="btn btn-outline-primary">
                View All <i class="fas fa-arrow-right ms-1"></i>
            </a>
        </div>
        <div class="row">`;
        
        products.forEach(product => {
            const images = JSON.parse(product.images || '[]');
            const discount = product.offer_price ? 
                Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
            
            html += `
            <div class="col-lg-3 col-md-4 col-6">
                <div class="product-card">
                    ${discount > 0 ? `<div class="product-badge">${discount}% OFF</div>` : ''}
                    <img src="${images[0] || 'https://via.placeholder.com/600x400'}" 
                         class="card-img-top" 
                         alt="${product.name}"
                         onerror="this.src='https://via.placeholder.com/600x400'">
                    <div class="card-body">
                        <h6 class="card-title mb-2" style="height: 48px; overflow: hidden;">${product.name}</h6>
                        ${product.offer_price ? `
                            <div class="d-flex align-items-center mb-2">
                                <span class="old-price">${formatPrice(product.price)}</span>
                                <span class="offer-price ms-2">${formatPrice(product.offer_price)}</span>
                            </div>
                        ` : `
                            <div class="mb-2">
                                <span class="offer-price">${formatPrice(product.price)}</span>
                            </div>
                        `}
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-light text-dark">
                                <i class="fas fa-box me-1"></i> ${product.stock} in stock
                            </span>
                            <a href="/product/${product.slug}" class="btn btn-primary-custom btn-sm">
                                <i class="fas fa-cart-plus me-1"></i> Buy Now
                            </a>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        
        html += `
        </div>
    </div>

    <!-- Features Section -->
    <section class="features-section">
        <div class="container">
            <h2 class="text-center mb-5">Why Choose Dhaka Market?</h2>
            <div class="row">
                <div class="col-md-3 text-center mb-4">
                    <div class="feature-icon">
                        <i class="fas fa-shipping-fast"></i>
                    </div>
                    <h4>Fast Delivery</h4>
                    <p>Same day delivery in Dhaka, 2-3 days nationwide</p>
                </div>
                <div class="col-md-3 text-center mb-4">
                    <div class="feature-icon">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <h4>Cash on Delivery</h4>
                    <p>Pay when you receive your order</p>
                </div>
                <div class="col-md-3 text-center mb-4">
                    <div class="feature-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h4>Secure Shopping</h4>
                    <p>100% secure and protected shopping</p>
                </div>
                <div class="col-md-3 text-center mb-4">
                    <div class="feature-icon">
                        <i class="fas fa-headset"></i>
                    </div>
                    <h4>24/7 Support</h4>
                    <p>Always here to help you</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="row">
                <div class="col-lg-4 mb-4">
                    <h3 class="mb-3"><i class="fas fa-store me-2"></i>Dhaka Market</h3>
                    <p>Best online shopping platform in Bangladesh offering quality products at affordable prices with fast delivery.</p>
                    <div class="social-icons">
                        <a href="#"><i class="fab fa-facebook"></i></a>
                        <a href="#"><i class="fab fa-instagram"></i></a>
                        <a href="#"><i class="fab fa-twitter"></i></a>
                        <a href="#"><i class="fab fa-youtube"></i></a>
                    </div>
                </div>
                <div class="col-lg-2 col-6 mb-4">
                    <h5>Quick Links</h5>
                    <ul class="list-unstyled">
                        <li><a href="/" class="text-light text-decoration-none">Home</a></li>
                        <li><a href="/products" class="text-light text-decoration-none">Products</a></li>
                        <li><a href="/categories" class="text-light text-decoration-none">Categories</a></li>
                        <li><a href="/contact" class="text-light text-decoration-none">Contact</a></li>
                    </ul>
                </div>
                <div class="col-lg-3 col-6 mb-4">
                    <h5>Customer Service</h5>
                    <ul class="list-unstyled">
                        <li><a href="/track-order" class="text-light text-decoration-none">Track Order</a></li>
                        <li><a href="/return-policy" class="text-light text-decoration-none">Return Policy</a></li>
                        <li><a href="/privacy-policy" class="text-light text-decoration-none">Privacy Policy</a></li>
                        <li><a href="/terms" class="text-light text-decoration-none">Terms & Conditions</a></li>
                    </ul>
                </div>
                <div class="col-lg-3 mb-4">
                    <h5>Contact Info</h5>
                    <p><i class="fas fa-phone me-2"></i> +880 1234-567890</p>
                    <p><i class="fas fa-envelope me-2"></i> info@dhakamarket.com</p>
                    <p><i class="fas fa-map-marker-alt me-2"></i> Dhaka, Bangladesh</p>
                    <p><i class="fas fa-clock me-2"></i> 9:00 AM - 10:00 PM</p>
                </div>
            </div>
            <hr class="bg-light">
            <div class="text-center pt-3">
                <p>&copy; 2024 Dhaka Market. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <!-- Floating Elements -->
    <div class="whatsapp-float">
        <a href="https://wa.me/8801234567890" target="_blank" style="color: white;">
            <i class="fab fa-whatsapp"></i>
        </a>
    </div>

    <div id="liveOrderNotification" class="live-order-notification">
        <h6><i class="fas fa-bell text-success me-2"></i> New Order!</h6>
        <p id="liveOrderText" class="mb-1 small"></p>
        <small class="text-muted" id="liveOrderTime"></small>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/owl.carousel.min.js"></script>
    <script>
        // Animate counters
        function animateCounter(element, target) {
            let current = 0;
            const increment = target / 100;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                element.textContent = Math.floor(current);
            }, 20);
        }

        // Initialize counters
        setTimeout(() => {
            animateCounter(document.getElementById('totalProducts'), ${products.length || 50});
            animateCounter(document.getElementById('totalOrders'), 1247);
            animateCounter(document.getElementById('happyCustomers'), 895);
        }, 1000);

        // Live order notifications
        const customerNames = ['রহিম (ঢাকা)', 'করিম (চট্টগ্রাম)', 'সাদিয়া (সিলেট)', 'নাসরিন (রাজশাহী)', 'জাহিদ (খুলনা)', 'ফারহানা (বরিশাল)'];
        const productNames = ['Hair Trimmer', 'Smart Watch', 'Wireless Earbuds', 'T-Shirt Pack', 'Electric Kettle'];
        const areas = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna'];

        function showLiveOrder() {
            const name = customerNames[Math.floor(Math.random() * customerNames.length)];
            const product = productNames[Math.floor(Math.random() * productNames.length)];
            const area = areas[Math.floor(Math.random() * areas.length)];
            
            document.getElementById('liveOrderText').textContent = name + ' ordered ' + product;
            document.getElementById('liveOrderTime').textContent = 'From ' + area + ' • Just now';
            
            const notification = document.getElementById('liveOrderNotification');
            notification.style.display = 'block';
            
            // Play notification sound
            try {
                const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
                audio.volume = 0.3;
                audio.play();
            } catch(e) {}
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
        }

        // Show first notification after 3 seconds
        setTimeout(showLiveOrder, 3000);
        
        // Show random notifications every 10-30 seconds
        setInterval(() => {
            if (Math.random() > 0.5) {
                showLiveOrder();
            }
        }, 10000 + Math.random() * 20000);

        // Handle image errors
        document.addEventListener('DOMContentLoaded', function() {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                img.onerror = function() {
                    this.src = 'https://via.placeholder.com/600x400';
                };
            });
        });
    </script>
</body>
</html>`;
            res.send(html);
        });
    });
});

// Products page
app.get('/products', (req, res) => {
    const { category, search, min_price, max_price, sort } = req.query;
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
    
    if (min_price) {
        query += ` AND (offer_price IS NOT NULL AND offer_price >= ? OR offer_price IS NULL AND price >= ?)`;
        params.push(min_price, min_price);
    }
    
    if (max_price) {
        query += ` AND (offer_price IS NOT NULL AND offer_price <= ? OR offer_price IS NULL AND price <= ?)`;
        params.push(max_price, max_price);
    }
    
    // Sorting
    switch(sort) {
        case 'price_low':
            query += ` ORDER BY COALESCE(offer_price, price) ASC`;
            break;
        case 'price_high':
            query += ` ORDER BY COALESCE(offer_price, price) DESC`;
            break;
        case 'popular':
            query += ` ORDER BY sales DESC`;
            break;
        case 'newest':
            query += ` ORDER BY created_at DESC`;
            break;
        default:
            query += ` ORDER BY created_at DESC`;
    }
    
    db.all(query, params, (err, products) => {
        db.all("SELECT * FROM categories WHERE status = 'active'", (err, categories) => {
            let html = `<!DOCTYPE html>
<html>
<head>
    <title>Products - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .filter-sidebar {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            position: sticky;
            top: 20px;
        }
        .price-slider .form-range {
            height: 6px;
        }
        .price-slider .form-range::-webkit-slider-thumb {
            background: #ff6b6b;
        }
        .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 25px;
        }
        .product-card-grid {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            transition: all 0.3s;
        }
        .product-card-grid:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container-fluid py-4">
        <div class="row">
            <!-- Sidebar Filters -->
            <div class="col-lg-3">
                <div class="filter-sidebar mb-4">
                    <h5 class="mb-4">Filters</h5>
                    
                    <!-- Search -->
                    <div class="mb-4">
                        <form action="/products" method="GET" class="d-flex">
                            <input type="text" name="search" class="form-control me-2" placeholder="Search products..." value="${search || ''}">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-search"></i>
                            </button>
                        </form>
                    </div>
                    
                    <!-- Categories -->
                    <div class="mb-4">
                        <h6>Categories</h6>
                        <div class="list-group list-group-flush">
                            <a href="/products" class="list-group-item list-group-item-action ${!category ? 'active' : ''}">
                                All Categories
                            </a>`;
            
            categories.forEach(cat => {
                html += `
                            <a href="/products?category=${cat.slug}" 
                               class="list-group-item list-group-item-action ${category === cat.slug ? 'active' : ''}">
                                ${cat.name}
                            </a>`;
            });
            
            html += `
                        </div>
                    </div>
                    
                    <!-- Price Range -->
                    <div class="mb-4 price-slider">
                        <h6>Price Range</h6>
                        <input type="range" class="form-range mb-2" min="0" max="10000" step="100" id="priceRange">
                        <div class="d-flex justify-content-between">
                            <span id="minPrice">৳0</span>
                            <span id="maxPrice">৳10,000</span>
                        </div>
                    </div>
                    
                    <!-- Sorting -->
                    <div class="mb-4">
                        <h6>Sort By</h6>
                        <select class="form-select" onchange="window.location.href=this.value">
                            <option value="/products?sort=newest" ${sort === 'newest' ? 'selected' : ''}>Newest First</option>
                            <option value="/products?sort=price_low" ${sort === 'price_low' ? 'selected' : ''}>Price: Low to High</option>
                            <option value="/products?sort=price_high" ${sort === 'price_high' ? 'selected' : ''}>Price: High to Low</option>
                            <option value="/products?sort=popular" ${sort === 'popular' ? 'selected' : ''}>Most Popular</option>
                        </select>
                    </div>
                    
                    <button class="btn btn-danger w-100" onclick="resetFilters()">
                        <i class="fas fa-times"></i> Clear Filters
                    </button>
                </div>
            </div>
            
            <!-- Products Grid -->
            <div class="col-lg-9">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3>All Products</h3>
                    <span class="badge bg-primary">${products.length} Products Found</span>
                </div>
                
                ${products.length === 0 ? `
                    <div class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>No products found</h4>
                        <p>Try adjusting your search or filter criteria</p>
                        <a href="/products" class="btn btn-primary">View All Products</a>
                    </div>
                ` : `
                    <div class="product-grid">
                `}
                
                ${products.map(product => {
                    const images = JSON.parse(product.images || '[]');
                    const discount = product.offer_price ? 
                        Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
                    
                    return `
                        <div class="product-card-grid">
                            <img src="${images[0] || 'https://via.placeholder.com/600x400'}" 
                                 class="card-img-top" 
                                 style="height: 200px; object-fit: cover;"
                                 alt="${product.name}"
                                 onerror="this.src='https://via.placeholder.com/600x400'">
                            <div class="card-body">
                                <h6 class="card-title" style="height: 48px; overflow: hidden;">${product.name}</h6>
                                ${product.offer_price ? `
                                    <div class="mb-2">
                                        <span class="text-muted text-decoration-line-through small">${formatPrice(product.price)}</span>
                                        <span class="text-danger fw-bold ms-2">${formatPrice(product.offer_price)}</span>
                                        ${discount > 0 ? `<span class="badge bg-danger ms-2">${discount}% OFF</span>` : ''}
                                    </div>
                                ` : `
                                    <div class="mb-2">
                                        <span class="text-primary fw-bold">${formatPrice(product.price)}</span>
                                    </div>
                                `}
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="badge bg-light text-dark">
                                        <i class="fas fa-box"></i> ${product.stock}
                                    </span>
                                    <a href="/product/${product.slug}" class="btn btn-primary btn-sm">
                                        <i class="fas fa-eye"></i> View
                                    </a>
                                </div>
                            </div>
                        </div>`;
                }).join('')}
                
                ${products.length > 0 ? `</div>` : ''}
            </div>
        </div>
    </div>
    
    <script>
        function resetFilters() {
            window.location.href = '/products';
        }
        
        const priceRange = document.getElementById('priceRange');
        const minPrice = document.getElementById('minPrice');
        const maxPrice = document.getElementById('maxPrice');
        
        priceRange.addEventListener('input', function() {
            maxPrice.textContent = '৳' + parseInt(this.value).toLocaleString('en-IN');
        });
        
        // Update price display when page loads
        maxPrice.textContent = '৳10,000';
    </script>
</body>
</html>`;
            res.send(html);
        });
    });
});

// Product detail page
app.get('/product/:slug', (req, res) => {
    const slug = req.params.slug;
    
    // Increment view count
    db.run("UPDATE products SET views = views + 1 WHERE slug = ?", [slug]);
    
    db.get("SELECT * FROM products WHERE slug = ?", [slug], (err, product) => {
        if (!product) {
            res.status(404).send('Product not found');
            return;
        }
        
        const images = JSON.parse(product.images || '[]');
        const features = JSON.parse(product.features || '[]');
        const discount = product.offer_price ? 
            Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
        
        let html = `<!DOCTYPE html>
<html>
<head>
    <title>${product.name} - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background: #f8f9fa; padding-top: 20px; }
        .product-detail {
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.08);
        }
        .product-image {
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .thumbnail-images {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        .thumbnail {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 10px;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.3s;
        }
        .thumbnail:hover, .thumbnail.active {
            border-color: #ff6b6b;
            transform: scale(1.05);
        }
        .feature-list li {
            margin-bottom: 10px;
            padding-left: 10px;
        }
        .feature-list li:before {
            content: "✓";
            color: #28a745;
            font-weight: bold;
            margin-right: 10px;
        }
        .order-form-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            padding: 25px;
        }
        .quantity-selector {
            display: flex;
            align-items: center;
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
            font-size: 1.2rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .quantity-input {
            width: 60px;
            text-align: center;
            font-size: 1.2rem;
            font-weight: bold;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            padding: 5px;
        }
        .shipping-option {
            background: white;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .shipping-option:hover, .shipping-option.selected {
            border-color: #ff6b6b;
            background: rgba(255,107,107,0.05);
        }
        .total-box {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin-top: 20px;
        }
        .sticky-order {
            position: sticky;
            top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <nav aria-label="breadcrumb" class="mb-4">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="/">Home</a></li>
                <li class="breadcrumb-item"><a href="/products">Products</a></li>
                <li class="breadcrumb-item active" aria-current="page">${product.name}</li>
            </ol>
        </nav>
        
        <div class="row">
            <div class="col-lg-7">
                <div class="product-detail mb-4">
                    <!-- Product Images -->
                    <div class="mb-4">
                        <div class="product-image">
                            <img id="mainImage" 
                                 src="${images[0] || 'https://via.placeholder.com/800x600'}" 
                                 class="img-fluid rounded" 
                                 alt="${product.name}"
                                 onerror="this.src='https://via.placeholder.com/800x600'">
                        </div>
                        ${images.length > 1 ? `
                        <div class="thumbnail-images">
                            ${images.map((img, index) => `
                                <img src="${img}" 
                                     class="thumbnail ${index === 0 ? 'active' : ''}" 
                                     alt="Thumbnail ${index + 1}"
                                     onclick="changeImage('${img}', this)"
                                     onerror="this.src='https://via.placeholder.com/80x80'">
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Product Details -->
                    <h1 class="mb-3">${product.name}</h1>
                    
                    <div class="d-flex align-items-center mb-4">
                        ${product.offer_price ? `
                            <div>
                                <span class="text-muted text-decoration-line-through fs-4">${formatPrice(product.price)}</span>
                                <span class="text-danger fw-bold fs-2 ms-3">${formatPrice(product.offer_price)}</span>
                                ${discount > 0 ? `
                                    <span class="badge bg-danger fs-6 ms-2">${discount}% OFF</span>
                                ` : ''}
                            </div>
                        ` : `
                            <h2 class="text-primary">${formatPrice(product.price)}</h2>
                        `}
                        <span class="badge bg-light text-dark fs-6 ms-3">
                            <i class="fas fa-eye"></i> ${product.views} views
                        </span>
                        <span class="badge bg-light text-dark fs-6 ms-2">
                            <i class="fas fa-shopping-cart"></i> ${product.sales} sold
                        </span>
                    </div>
                    
                    <div class="mb-4">
                        <h5>Description</h5>
                        <p>${product.description}</p>
                    </div>
                    
                    <div class="mb-4">
                        <h5>Key Features</h5>
                        <ul class="feature-list">
                            ${features.map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body text-center">
                                    <i class="fas fa-box fa-2x text-primary mb-2"></i>
                                    <h6>Stock Status</h6>
                                    <p class="mb-0 ${product.stock > 0 ? 'text-success' : 'text-danger'}">
                                        ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                    </p>
                                    <small>${product.stock} units available</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body text-center">
                                    <i class="fas fa-shipping-fast fa-2x text-primary mb-2"></i>
                                    <h6>Delivery</h6>
                                    <p class="mb-0">1-3 Days</p>
                                    <small>All over Bangladesh</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body text-center">
                                    <i class="fas fa-undo fa-2x text-primary mb-2"></i>
                                    <h6>Return Policy</h6>
                                    <p class="mb-0">7 Days</p>
                                    <small>Easy return</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-5">
                <div class="sticky-order">
                    <div class="order-form-section">
                        <h3 class="mb-4">Order Now</h3>
                        
                        <form id="orderForm" action="/checkout" method="POST">
                            <input type="hidden" name="product_id" value="${product.id}">
                            <input type="hidden" name="product_name" value="${product.name}">
                            <input type="hidden" name="product_price" value="${product.offer_price || product.price}">
                            
                            <div class="mb-3">
                                <label class="form-label">Your Full Name *</label>
                                <input type="text" name="customer_name" class="form-control" required 
                                       placeholder="Enter your full name">
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Phone Number *</label>
                                    <input type="tel" name="phone" class="form-control" required 
                                           pattern="01[3-9]\d{8}" placeholder="01XXXXXXXXX">
                                    <small class="text-muted">Must be 11 digits starting with 01</small>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Email (Optional)</label>
                                    <input type="email" name="customer_email" class="form-control" 
                                           placeholder="your@email.com">
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Shipping Address *</label>
                                <textarea name="address" class="form-control" rows="3" required 
                                          placeholder="Full address with area, city, and postal code"></textarea>
                            </div>
                            
                            <!-- Quantity Selector -->
                            <div class="mb-4">
                                <label class="form-label">Quantity</label>
                                <div class="quantity-selector">
                                    <button type="button" class="quantity-btn" onclick="decreaseQuantity()">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <input type="number" name="quantity" class="quantity-input" 
                                           value="1" min="1" max="${product.stock}" readonly>
                                    <button type="button" class="quantity-btn" onclick="increaseQuantity()">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                    <span class="text-muted">Max: ${product.stock} units</span>
                                </div>
                            </div>
                            
                            <!-- Shipping Area -->
                            <div class="mb-4">
                                <label class="form-label mb-3">Shipping Area</label>
                                <div class="shipping-option selected" onclick="selectShipping('inside_dhaka')">
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="shipping_area" 
                                               id="inside_dhaka" value="inside_dhaka" checked>
                                        <label class="form-check-label" for="inside_dhaka">
                                            <strong>Inside Dhaka</strong>
                                            <span class="float-end">৳80</span>
                                            <p class="text-muted mb-0">Delivery in 1-2 days</p>
                                        </label>
                                    </div>
                                </div>
                                <div class="shipping-option" onclick="selectShipping('outside_dhaka')">
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="shipping_area" 
                                               id="outside_dhaka" value="outside_dhaka">
                                        <label class="form-check-label" for="outside_dhaka">
                                            <strong>Outside Dhaka</strong>
                                            <span class="float-end">৳150</span>
                                            <p class="text-muted mb-0">Delivery in 2-3 days</p>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Payment Method -->
                            <div class="mb-4">
                                <label class="form-label">Payment Method</label>
                                <div class="form-check mb-2">
                                    <input class="form-check-input" type="radio" name="payment_method" 
                                           id="cod" value="cod" checked>
                                    <label class="form-check-label" for="cod">
                                        <i class="fas fa-money-bill-wave me-2"></i> Cash on Delivery (COD)
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="payment_method" 
                                           id="bkash" value="bkash">
                                    <label class="form-check-label" for="bkash">
                                        <i class="fas fa-mobile-alt me-2"></i> bKash
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Notes -->
                            <div class="mb-4">
                                <label class="form-label">Order Notes (Optional)</label>
                                <textarea name="notes" class="form-control" rows="2" 
                                          placeholder="Any special instructions..."></textarea>
                            </div>
                            
                            <!-- Order Summary -->
                            <div class="total-box">
                                <h5 class="mb-3">Order Summary</h5>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Product Price:</span>
                                    <span id="productPrice">${formatPrice(product.offer_price || product.price)}</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Quantity:</span>
                                    <span id="summaryQuantity">1 x ${formatPrice(product.offer_price || product.price)}</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Shipping:</span>
                                    <span id="shippingCost">৳80</span>
                                </div>
                                <hr style="border-color: rgba(255,255,255,0.3);">
                                <div class="d-flex justify-content-between fs-4 fw-bold">
                                    <span>Total:</span>
                                    <span id="grandTotal">${formatPrice((product.offer_price || product.price) + 80)}</span>
                                </div>
                            </div>
                            
                            <!-- Submit Button -->
                            <button type="submit" class="btn btn-danger btn-lg w-100 mt-4 py-3" 
                                    ${product.stock <= 0 ? 'disabled' : ''}>
                                <i class="fas fa-bolt"></i> 
                                ${product.stock <= 0 ? 'OUT OF STOCK' : 'CONFIRM ORDER'}
                            </button>
                            
                            ${product.stock <= 0 ? `
                                <div class="alert alert-warning mt-3">
                                    <i class="fas fa-exclamation-triangle"></i> 
                                    This product is currently out of stock. Please check back later.
                                </div>
                            ` : ''}
                        </form>
                    </div>
                    
                    <!-- Contact Info -->
                    <div class="card mt-3">
                        <div class="card-body text-center">
                            <h6>Need Help?</h6>
                            <a href="tel:+8801234567890" class="btn btn-outline-primary btn-sm me-2">
                                <i class="fas fa-phone"></i> Call Now
                            </a>
                            <a href="https://wa.me/8801234567890" target="_blank" class="btn btn-success btn-sm">
                                <i class="fab fa-whatsapp"></i> WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let currentQuantity = 1;
        const maxQuantity = ${product.stock};
        const productPrice = ${product.offer_price || product.price};
        
        function changeImage(src, element) {
            document.getElementById('mainImage').src = src;
            document.querySelectorAll('.thumbnail').forEach(thumb => {
                thumb.classList.remove('active');
            });
            element.classList.add('active');
        }
        
        function increaseQuantity() {
            if (currentQuantity < maxQuantity) {
                currentQuantity++;
                updateQuantity();
            }
        }
        
        function decreaseQuantity() {
            if (currentQuantity > 1) {
                currentQuantity--;
                updateQuantity();
            }
        }
        
        function updateQuantity() {
            const quantityInput = document.querySelector('[name="quantity"]');
            quantityInput.value = currentQuantity;
            calculateTotal();
        }
        
        function selectShipping(option) {
            document.querySelectorAll('.shipping-option').forEach(el => {
                el.classList.remove('selected');
            });
            document.getElementById(option).closest('.shipping-option').classList.add('selected');
            document.getElementById(option).checked = true;
            calculateTotal();
        }
        
        function calculateTotal() {
            const shippingCost = document.querySelector('[name="shipping_area"]:checked').value === 'inside_dhaka' ? 80 : 150;
            const total = (productPrice * currentQuantity) + shippingCost;
            
            // Update display
            document.getElementById('productPrice').textContent = '৳' + productPrice.toLocaleString('en-IN');
            document.getElementById('summaryQuantity').textContent = currentQuantity + ' x ৳' + productPrice.toLocaleString('en-IN');
            document.getElementById('shippingCost').textContent = '৳' + shippingCost.toLocaleString('en-IN');
            document.getElementById('grandTotal').textContent = '৳' + total.toLocaleString('en-IN');
        }
        
        // Initialize calculations
        calculateTotal();
        
        // Handle shipping option clicks
        document.querySelectorAll('.shipping-option').forEach(option => {
            option.addEventListener('click', function() {
                const radio = this.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    selectShipping(radio.value);
                }
            });
        });
        
        // Phone number validation
        const phoneInput = document.querySelector('[name="phone"]');
        phoneInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^\d]/g, '');
            if (this.value.length > 11) {
                this.value = this.value.slice(0, 11);
            }
        });
        
        // Form validation
        document.getElementById('orderForm').addEventListener('submit', function(e) {
            const phone = document.querySelector('[name="phone"]').value;
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

// Checkout process
app.post('/checkout', (req, res) => {
    const { 
        product_id, product_name, product_price, 
        customer_name, customer_email, phone, address, 
        quantity, shipping_area, payment_method, notes 
    } = req.body;
    
    const shippingCost = shipping_area === 'inside_dhaka' ? 80 : 150;
    const subtotal = parseFloat(product_price) * parseInt(quantity);
    const total = subtotal + shippingCost;
    const orderId = generateOrderId();
    const formattedPhone = formatPhone(phone);
    
    // Start transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insert order
        db.run(`INSERT INTO orders 
                (order_id, customer_name, customer_email, phone, address, shipping_area, 
                 quantity, product_id, product_name, unit_price, total, shipping_cost, 
                 grand_total, payment_method, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, customer_name, customer_email || null, formattedPhone, address, shipping_area, 
             quantity, product_id, product_name, product_price, subtotal, shippingCost, 
             total, payment_method, notes || null], function(err) {
            
            if (err) {
                db.run('ROLLBACK');
                console.error('Order insert error:', err);
                res.send(`
                    <div class="container mt-5">
                        <div class="alert alert-danger">
                            <h2><i class="fas fa-exclamation-triangle"></i> Error!</h2>
                            <p>Order could not be placed. Please try again.</p>
                            <a href="/product/${product_id}" class="btn btn-primary">Go Back</a>
                        </div>
                    </div>
                `);
                return;
            }
            
            // Update product stock and sales
            db.run(`UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?`,
                [quantity, quantity, product_id], function(err) {
                
                if (err) {
                    db.run('ROLLBACK');
                    console.error('Stock update error:', err);
                    res.send(`
                        <div class="container mt-5">
                            <div class="alert alert-danger">
                                <h2><i class="fas fa-exclamation-triangle"></i> Error!</h2>
                                <p>Could not update product stock. Please try again.</p>
                                <a href="/product/${product_id}" class="btn btn-primary">Go Back</a>
                            </div>
                        </div>
                    `);
                    return;
                }
                
                // Insert/update customer
                db.run(`INSERT OR REPLACE INTO customers (phone, name, email, address, total_orders, total_spent)
                        VALUES (?, ?, ?, ?, 
                                COALESCE((SELECT total_orders FROM customers WHERE phone = ?), 0) + 1,
                                COALESCE((SELECT total_spent FROM customers WHERE phone = ?), 0) + ?)`,
                    [formattedPhone, customer_name, customer_email || null, address, 
                     formattedPhone, formattedPhone, total], function(err) {
                    
                    if (err) {
                        console.error('Customer update error:', err);
                    }
                    
                    db.run('COMMIT');
                    
                    // Send success response
                    let html = `<!DOCTYPE html>
<html>
<head>
    <title>Order Confirmed - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { 
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
        }
        .success-container {
            max-width: 800px;
            margin: auto;
            background: white;
            border-radius: 25px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .success-header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .success-icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: bounce 1s infinite alternate;
        }
        @keyframes bounce {
            from { transform: translateY(0); }
            to { transform: translateY(-20px); }
        }
        .order-details {
            padding: 40px;
        }
        .detail-card {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            border-left: 5px solid #28a745;
        }
        .whatsapp-btn {
            background: #25D366;
            color: white;
            padding: 15px 30px;
            border-radius: 25px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            transition: all 0.3s;
        }
        .whatsapp-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(37, 211, 102, 0.3);
            color: white;
        }
        .track-order {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-container">
            <div class="success-header">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h1 class="display-5 mb-3">Order Confirmed!</h1>
                <p class="lead mb-0">Thank you ${customer_name}, your order has been received.</p>
            </div>
            
            <div class="order-details">
                <div class="detail-card">
                    <h4 class="mb-4">Order Details</h4>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <strong>Order ID:</strong>
                            <div class="h5 text-primary">${orderId}</div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Order Date:</strong>
                            <div>${new Date().toLocaleDateString('en-US', { 
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                            })}</div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Product:</strong>
                            <div>${product_name}</div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Quantity:</strong>
                            <div>${quantity}</div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Unit Price:</strong>
                            <div>${formatPrice(product_price)}</div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Shipping:</strong>
                            <div>${formatPrice(shippingCost)} (${shipping_area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Payment Method:</strong>
                            <div class="text-uppercase">${payment_method}</div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Total Amount:</strong>
                            <div class="h4 text-success">${formatPrice(total)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-card">
                    <h4 class="mb-4">Delivery Information</h4>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <strong>Customer Name:</strong>
                            <div>${customer_name}</div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Phone Number:</strong>
                            <div>${formattedPhone}</div>
                        </div>
                        ${customer_email ? `
                        <div class="col-md-6 mb-3">
                            <strong>Email:</strong>
                            <div>${customer_email}</div>
                        </div>
                        ` : ''}
                        <div class="col-12 mb-3">
                            <strong>Shipping Address:</strong>
                            <div>${address}</div>
                        </div>
                    </div>
                </div>
                
                <div class="track-order">
                    <h5 class="mb-3"><i class="fas fa-shipping-fast"></i> Track Your Order</h5>
                    <p class="mb-3">Use your Order ID to track your order status</p>
                    <a href="/track-order?order_id=${orderId}" class="btn btn-light">
                        <i class="fas fa-search"></i> Track Now
                    </a>
                </div>
                
                <div class="alert alert-info mt-4">
                    <h5><i class="fas fa-info-circle"></i> What's Next?</h5>
                    <p class="mb-2"><strong>1. Order Confirmation:</strong> You will receive an SMS confirmation shortly.</p>
                    <p class="mb-2"><strong>2. Customer Support Call:</strong> Our representative will call you at ${formattedPhone} within 30 minutes to verify your order.</p>
                    <p class="mb-2"><strong>3. Order Processing:</strong> Your order will be processed and shipped within 24 hours.</p>
                    <p class="mb-0"><strong>4. Delivery:</strong> You will receive your order in 1-3 business days.</p>
                </div>
                
                <div class="d-grid gap-3 mt-4">
                    <a href="/" class="btn btn-primary btn-lg py-3">
                        <i class="fas fa-shopping-cart"></i> Continue Shopping
                    </a>
                    
                    <a href="https://wa.me/8801234567890?text=Hello%20Dhaka%20Market%2C%20I%20have%20ordered%3A%0A%0AOrder%20ID%3A%20${orderId}%0AProduct%3A%20${encodeURIComponent(product_name)}%0AQuantity%3A%20${quantity}%0ATotal%3A%20${total}%0AName%3A%20${encodeURIComponent(customer_name)}%0APhone%3A%20${formattedPhone}" 
                       target="_blank" class="whatsapp-btn btn-lg py-3">
                        <i class="fab fa-whatsapp me-2"></i> Message on WhatsApp
                    </a>
                    
                    <button onclick="window.print()" class="btn btn-outline-secondary btn-lg py-3">
                        <i class="fas fa-print me-2"></i> Print Order Details
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Send order confirmation to server (for analytics)
        setTimeout(() => {
            fetch('/api/order-confirmed/${orderId}', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        }, 1000);
    </script>
</body>
</html>`;
                    
                    res.send(html);
                });
            });
        });
    });
});

// Track order page
app.get('/track-order', (req, res) => {
    const orderId = req.query.order_id;
    
    let html = `<!DOCTYPE html>
<html>
<head>
    <title>Track Order - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .track-order-container {
            max-width: 800px;
            margin: 50px auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.1);
        }
        .track-form {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 40px;
        }
        .timeline {
            position: relative;
            padding-left: 30px;
        }
        .timeline:before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #28a745;
        }
        .timeline-step {
            position: relative;
            margin-bottom: 40px;
        }
        .timeline-step:before {
            content: '';
            position: absolute;
            left: -34px;
            top: 0;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: white;
            border: 3px solid #28a745;
        }
        .timeline-step.active:before {
            background: #28a745;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="track-order-container">
            <h1 class="text-center mb-4"><i class="fas fa-search-location"></i> Track Your Order</h1>
            
            <div class="track-form">
                <form action="/track-order" method="GET">
                    <div class="mb-3">
                        <label class="form-label">Enter Your Order ID</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="fas fa-receipt"></i></span>
                            <input type="text" name="order_id" class="form-control form-control-lg" 
                                   placeholder="e.g., DM123456789" value="${orderId || ''}" required>
                            <button class="btn btn-primary btn-lg" type="submit">
                                <i class="fas fa-search"></i> Track
                            </button>
                        </div>
                        <small class="text-muted">You can find your Order ID in your order confirmation email or SMS.</small>
                    </div>
                </form>
            </div>`;
    
    if (orderId) {
        db.get("SELECT * FROM orders WHERE order_id = ?", [orderId], (err, order) => {
            if (!order) {
                html += `
                    <div class="alert alert-danger">
                        <h4><i class="fas fa-exclamation-triangle"></i> Order Not Found</h4>
                        <p>No order found with ID: ${orderId}</p>
                        <p>Please check your Order ID and try again.</p>
                    </div>`;
            } else {
                const statusSteps = [
                    { status: 'pending', label: 'Order Placed', description: 'Your order has been received' },
                    { status: 'processing', label: 'Processing', description: 'Order is being processed' },
                    { status: 'shipped', label: 'Shipped', description: 'Order has been shipped' },
                    { status: 'delivered', label: 'Delivered', description: 'Order has been delivered' }
                ];
                
                const statusIndex = statusSteps.findIndex(step => step.status === order.status);
                
                html += `
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h4 class="mb-0">Order Status: ${order.status.toUpperCase()}</h4>
                        </div>
                        <div class="card-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6>Order Information</h6>
                                    <p><strong>Order ID:</strong> ${order.order_id}</p>
                                    <p><strong>Product:</strong> ${order.product_name}</p>
                                    <p><strong>Quantity:</strong> ${order.quantity}</p>
                                    <p><strong>Total Amount:</strong> ${formatPrice(order.grand_total)}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Customer Information</h6>
                                    <p><strong>Name:</strong> ${order.customer_name}</p>
                                    <p><strong>Phone:</strong> ${order.phone}</p>
                                    <p><strong>Shipping:</strong> ${order.shipping_area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}</p>
                                    <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            
                            <h5 class="mb-4">Order Tracking</h5>
                            <div class="timeline">
                                ${statusSteps.map((step, index) => `
                                    <div class="timeline-step ${index <= statusIndex ? 'active' : ''}">
                                        <h6>${step.label}</h6>
                                        <p class="text-muted mb-0">${step.description}</p>
                                        ${index <= statusIndex ? `
                                            <small class="text-success">
                                                <i class="fas fa-check-circle"></i> Completed
                                            </small>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                            
                            ${order.notes ? `
                                <div class="alert alert-info mt-4">
                                    <h6><i class="fas fa-sticky-note"></i> Order Notes</h6>
                                    <p class="mb-0">${order.notes}</p>
                                </div>
                            ` : ''}
                            
                            <div class="text-center mt-4">
                                <a href="tel:+8801234567890" class="btn btn-outline-primary">
                                    <i class="fas fa-phone"></i> Call Support
                                </a>
                                <a href="/" class="btn btn-primary ms-2">
                                    <i class="fas fa-home"></i> Back to Home
                                </a>
                            </div>
                        </div>
                    </div>`;
            }
            
            html += `
        </div>
    </div>
</body>
</html>`;
            
            res.send(html);
        });
    } else {
        html += `
        </div>
    </div>
</body>
</html>`;
        res.send(html);
    }
});

// Admin login page
app.get('/admin-login', (req, res) => {
    if (req.session.user) {
        res.redirect('/admin/dashboard');
        return;
    }
    
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Admin Login - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
        }
        .login-container {
            max-width: 400px;
            margin: auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        .login-header {
            background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .login-body {
            padding: 40px 30px;
        }
        .form-floating {
            margin-bottom: 20px;
        }
        .btn-login {
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
            color: white;
            border: none;
            padding: 15px;
            font-weight: bold;
            width: 100%;
            border-radius: 10px;
            transition: all 0.3s;
        }
        .btn-login:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(255,107,107,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="login-container">
            <div class="login-header">
                <h2><i class="fas fa-user-shield"></i> Admin Panel</h2>
                <p class="mb-0">Dhaka Market Management System</p>
            </div>
            
            <div class="login-body">
                <form action="/admin-login" method="POST">
                    <div class="form-floating">
                        <input type="text" class="form-control" id="username" 
                               name="username" placeholder="Username" required>
                        <label for="username"><i class="fas fa-user me-2"></i>Username</label>
                    </div>
                    
                    <div class="form-floating">
                        <input type="password" class="form-control" id="password" 
                               name="password" placeholder="Password" required>
                        <label for="password"><i class="fas fa-lock me-2"></i>Password</label>
                    </div>
                    
                    <button type="submit" class="btn-login mt-3">
                        <i class="fas fa-sign-in-alt me-2"></i> Login
                    </button>
                    
                    <div class="text-center mt-3">
                        <small class="text-muted">
                            Default credentials: admin / admin123
                        </small>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>`);
});

// Admin login POST
app.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM admin_users WHERE username = ?", [username], async (err, user) => {
        if (!user) {
            res.send(`
                <script>
                    alert('Invalid username or password');
                    window.location = '/admin-login';
                </script>
            `);
            return;
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.send(`
                <script>
                    alert('Invalid username or password');
                    window.location = '/admin-login';
                </script>
            `);
            return;
        }
        
        // Update last login
        db.run("UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
        
        // Set session
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email
        };
        
        res.redirect('/admin/dashboard');
    });
});

// Admin logout
app.get('/admin-logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin-login');
});

// Admin dashboard with CSV export
app.get('/admin/dashboard', requireAuth, (req, res) => {
    // Get dashboard statistics
    db.serialize(() => {
        db.get(`SELECT 
            COUNT(*) as total_orders,
            SUM(grand_total) as total_revenue,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
            SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
            FROM orders`, (err, orderStats) => {
            
            db.get(`SELECT 
                COUNT(*) as total_products,
                SUM(stock) as total_stock,
                SUM(sales) as total_sales,
                SUM(views) as total_views
                FROM products`, (err, productStats) => {
                
                db.get(`SELECT COUNT(*) as total_customers FROM customers`, (err, customerStats) => {
                    
                    db.all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`, (err, recentOrders) => {
                        
                        db.all(`SELECT 
                            strftime('%Y-%m', created_at) as month,
                            COUNT(*) as order_count,
                            SUM(grand_total) as revenue
                            FROM orders 
                            WHERE created_at >= date('now', '-6 months')
                            GROUP BY strftime('%Y-%m', created_at)
                            ORDER BY month DESC
                            LIMIT 6`, (err, monthlyStats) => {
                            
                            let html = `<!DOCTYPE html>
<html>
<head>
    <title>Admin Dashboard - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap5.min.css">
    <style>
        :root {
            --sidebar-width: 250px;
        }
        
        body {
            background: #f5f7fb;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        #sidebar {
            width: var(--sidebar-width);
            background: linear-gradient(180deg, #2c3e50 0%, #1a252f 100%);
            color: white;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 100;
            box-shadow: 3px 0 15px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .sidebar-menu {
            padding: 20px 0;
        }
        
        .sidebar-menu .nav-link {
            color: rgba(255,255,255,0.7);
            padding: 12px 20px;
            margin: 2px 10px;
            border-radius: 8px;
            transition: all 0.3s;
        }
        
        .sidebar-menu .nav-link:hover, .sidebar-menu .nav-link.active {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        
        .main-content {
            margin-left: var(--sidebar-width);
            padding: 20px;
            transition: all 0.3s;
        }
        
        @media (max-width: 768px) {
            #sidebar {
                margin-left: -250px;
            }
            .main-content {
                margin-left: 0;
            }
            #sidebar.active {
                margin-left: 0;
            }
        }
        
        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
            border-left: 5px solid;
            transition: all 0.3s;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .stat-card.revenue { border-left-color: #28a745; }
        .stat-card.orders { border-left-color: #007bff; }
        .stat-card.products { border-left-color: #ff6b6b; }
        .stat-card.customers { border-left-color: #6f42c1; }
        
        .stat-icon {
            font-size: 2.5rem;
            opacity: 0.8;
            margin-bottom: 15px;
        }
        
        .stat-number {
            font-size: 2.2rem;
            font-weight: 800;
            margin-bottom: 5px;
        }
        
        .table-container {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
            margin-bottom: 20px;
        }
        
        .btn-export {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s;
        }
        
        .btn-export:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(40,167,69,0.3);
            color: white;
        }
        
        .status-badge {
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .badge-pending { background: #ffc107; color: #000; }
        .badge-processing { background: #17a2b8; color: white; }
        .badge-shipped { background: #007bff; color: white; }
        .badge-delivered { background: #28a745; color: white; }
        .badge-cancelled { background: #dc3545; color: white; }
        
        .user-dropdown {
            border: none;
            background: none;
            color: white;
            font-weight: 600;
        }
        
        .user-dropdown:after {
            display: none;
        }
        
        .notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #dc3545;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .dropdown-menu {
            border: none;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            padding: 10px 0;
        }
        
        .dropdown-item {
            padding: 10px 20px;
            transition: all 0.3s;
        }
        
        .dropdown-item:hover {
            background: #f8f9fa;
            padding-left: 25px;
        }
    </style>
</head>
<body>
    <!-- Sidebar -->
    <nav id="sidebar">
        <div class="sidebar-header">
            <h3 class="mb-0">
                <i class="fas fa-store"></i> Dhaka Market
            </h3>
            <p class="text-muted mb-0">Admin Panel</p>
        </div>
        
        <div class="sidebar-menu">
            <ul class="nav flex-column">
                <li class="nav-item">
                    <a class="nav-link active" href="/admin/dashboard">
                        <i class="fas fa-tachometer-alt me-2"></i> Dashboard
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/admin/orders">
                        <i class="fas fa-shopping-cart me-2"></i> Orders
                        <span class="badge bg-danger float-end">${orderStats?.pending_orders || 0}</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/admin/products">
                        <i class="fas fa-box me-2"></i> Products
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/admin/categories">
                        <i class="fas fa-list me-2"></i> Categories
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/admin/customers">
                        <i class="fas fa-users me-2"></i> Customers
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/admin/export">
                        <i class="fas fa-file-export me-2"></i> Export Data
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/admin/settings">
                        <i class="fas fa-cog me-2"></i> Settings
                    </a>
                </li>
                <li class="nav-item mt-4">
                    <a class="nav-link" href="/admin-logout">
                        <i class="fas fa-sign-out-alt me-2"></i> Logout
                    </a>
                </li>
            </ul>
        </div>
        
        <div class="sidebar-footer" style="position: absolute; bottom: 20px; left: 20px; right: 20px;">
            <div class="text-center">
                <small class="text-muted">
                    Logged in as: <strong>${req.session.user.username}</strong><br>
                    Role: ${req.session.user.role}
                </small>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <button class="btn btn-primary d-md-none" id="sidebarToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <h1 class="h3 mb-0 d-none d-md-block">Dashboard Overview</h1>
            </div>
            
            <div class="dropdown">
                <button class="btn user-dropdown dropdown-toggle" type="button" 
                        data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-user-circle me-2"></i> ${req.session.user.username}
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/admin/profile">
                        <i class="fas fa-user me-2"></i> Profile
                    </a></li>
                    <li><a class="dropdown-item" href="/admin/settings">
                        <i class="fas fa-cog me-2"></i> Settings
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="/admin-logout">
                        <i class="fas fa-sign-out-alt me-2"></i> Logout
                    </a></li>
                </ul>
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="row g-4 mb-4">
            <div class="col-md-3 col-6">
                <div class="stat-card revenue">
                    <div class="stat-icon text-success">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-number text-success">
                        ${formatPrice(orderStats?.total_revenue || 0)}
                    </div>
                    <p class="text-muted mb-0">Total Revenue</p>
                </div>
            </div>
            
            <div class="col-md-3 col-6">
                <div class="stat-card orders">
                    <div class="stat-icon text-primary">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-number text-primary">
                        ${orderStats?.total_orders || 0}
                    </div>
                    <p class="text-muted mb-0">Total Orders</p>
                </div>
            </div>
            
            <div class="col-md-3 col-6">
                <div class="stat-card products">
                    <div class="stat-icon text-danger">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="stat-number text-danger">
                        ${productStats?.total_products || 0}
                    </div>
                    <p class="text-muted mb-0">Total Products</p>
                </div>
            </div>
            
            <div class="col-md-3 col-6">
                <div class="stat-card customers">
                    <div class="stat-icon text-purple">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-number text-purple">
                        ${customerStats?.total_customers || 0}
                    </div>
                    <p class="text-muted mb-0">Total Customers</p>
                </div>
            </div>
        </div>

        <!-- Quick Stats -->
        <div class="row g-4 mb-4">
            <div class="col-md-8">
                <div class="table-container">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h5>Recent Orders</h5>
                        <a href="/admin/orders" class="btn btn-sm btn-primary">
                            View All <i class="fas fa-arrow-right ms-1"></i>
                        </a>
                    </div>
                    
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
                                </tr>
                            </thead>
                            <tbody>`;
                            
                            recentOrders.forEach(order => {
                                html += `
                                <tr>
                                    <td><strong>${order.order_id}</strong></td>
                                    <td>${order.customer_name}</td>
                                    <td>${order.product_name}</td>
                                    <td>${formatPrice(order.grand_total)}</td>
                                    <td>
                                        <span class="status-badge badge-${order.status}">
                                            ${order.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                                </tr>`;
                            });
                            
                            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="table-container">
                    <h5 class="mb-4">Order Status</h5>
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Pending</span>
                            <span class="fw-bold">${orderStats?.pending_orders || 0}</span>
                        </div>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar bg-warning" style="width: ${(orderStats?.pending_orders / orderStats?.total_orders * 100) || 0}%"></div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Processing</span>
                            <span class="fw-bold">${((orderStats?.total_orders || 0) - (orderStats?.pending_orders || 0) - (orderStats?.delivered_orders || 0) - (orderStats?.cancelled_orders || 0))}</span>
                        </div>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar bg-info" style="width: ${(((orderStats?.total_orders || 0) - (orderStats?.pending_orders || 0) - (orderStats?.delivered_orders || 0) - (orderStats?.cancelled_orders || 0)) / (orderStats?.total_orders || 1) * 100)}%"></div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Delivered</span>
                            <span class="fw-bold">${orderStats?.delivered_orders || 0}</span>
                        </div>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar bg-success" style="width: ${(orderStats?.delivered_orders / orderStats?.total_orders * 100) || 0}%"></div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Cancelled</span>
                            <span class="fw-bold">${orderStats?.cancelled_orders || 0}</span>
                        </div>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar bg-danger" style="width: ${(orderStats?.cancelled_orders / orderStats?.total_orders * 100) || 0}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="table-container mt-4">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h5>Quick Actions</h5>
                    </div>
                    
                    <div class="d-grid gap-2">
                        <a href="/admin/orders/new" class="btn btn-primary">
                            <i class="fas fa-plus me-2"></i> Add New Order
                        </a>
                        <a href="/admin/products/new" class="btn btn-success">
                            <i class="fas fa-box me-2"></i> Add New Product
                        </a>
                        <a href="/admin/export" class="btn btn-export">
                            <i class="fas fa-file-export me-2"></i> Export Data
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Monthly Stats -->
        <div class="table-container mb-4">
            <h5 class="mb-4">Monthly Revenue</h5>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Orders</th>
                            <th>Revenue</th>
                            <th>Average Order Value</th>
                        </tr>
                    </thead>
                    <tbody>`;
                    
                    monthlyStats.forEach(stat => {
                        const avg = stat.revenue / stat.order_count;
                        html += `
                        <tr>
                            <td>${stat.month}</td>
                            <td>${stat.order_count}</td>
                            <td>${formatPrice(stat.revenue)}</td>
                            <td>${formatPrice(avg)}</td>
                        </tr>`;
                    });
                    
                    html += `
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap5.min.js"></script>
    <script>
        // Toggle sidebar on mobile
        $('#sidebarToggle').click(function() {
            $('#sidebar').toggleClass('active');
        });
        
        // Initialize DataTables
        $(document).ready(function() {
            $('table').DataTable({
                pageLength: 10,
                responsive: true
            });
        });
        
        // Auto-refresh dashboard every 30 seconds
        setInterval(() => {
            window.location.reload();
        }, 30000);
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

// Export data page
app.get('/admin/export', requireAuth, (req, res) => {
    let html = `<!DOCTYPE html>
<html>
<head>
    <title>Export Data - Dhaka Market Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .export-container {
            max-width: 800px;
            margin: 50px auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.1);
        }
        .export-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 20px;
            border: 2px dashed #dee2e6;
            transition: all 0.3s;
        }
        .export-card:hover {
            border-color: #28a745;
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(40,167,69,0.1);
        }
        .btn-export {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            border: none;
            padding: 10px 30px;
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.3s;
        }
        .btn-export:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(40,167,69,0.3);
            color: white;
        }
        .date-filter {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="export-container">
            <h1 class="text-center mb-4"><i class="fas fa-file-export"></i> Export Data</h1>
            <p class="text-center text-muted mb-5">Export your data in CSV format for analysis and backup.</p>
            
            <!-- Date Filter -->
            <div class="date-filter">
                <h5><i class="fas fa-filter me-2"></i> Filter by Date Range</h5>
                <form id="dateFilterForm" class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">Start Date</label>
                        <input type="date" id="startDate" class="form-control">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">End Date</label>
                        <input type="date" id="endDate" class="form-control">
                    </div>
                    <div class="col-md-4 d-flex align-items-end">
                        <button type="button" class="btn btn-primary w-100" onclick="applyDateFilter()">
                            <i class="fas fa-check"></i> Apply Filter
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Export Options -->
            <div class="row">
                <div class="col-md-6">
                    <div class="export-card">
                        <div class="d-flex align-items-center mb-3">
                            <div class="me-3">
                                <i class="fas fa-shopping-cart fa-3x text-primary"></i>
                            </div>
                            <div>
                                <h4>Export Orders</h4>
                                <p class="text-muted mb-0">Export all order data</p>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Filter by Status</label>
                            <select id="orderStatus" class="form-select">
                                <option value="all">All Orders</option>
                                <option value="pending">Pending Only</option>
                                <option value="processing">Processing Only</option>
                                <option value="shipped">Shipped Only</option>
                                <option value="delivered">Delivered Only</option>
                                <option value="cancelled">Cancelled Only</option>
                            </select>
                        </div>
                        <button onclick="exportOrders()" class="btn-export w-100">
                            <i class="fas fa-download me-2"></i> Export Orders CSV
                        </button>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="export-card">
                        <div class="d-flex align-items-center mb-3">
                            <div class="me-3">
                                <i class="fas fa-box fa-3x text-danger"></i>
                            </div>
                            <div>
                                <h4>Export Products</h4>
                                <p class="text-muted mb-0">Export all product data</p>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Filter by Category</label>
                            <select id="productCategory" class="form-select">
                                <option value="all">All Categories</option>
                                <option value="electronics">Electronics</option>
                                <option value="fashion">Fashion</option>
                                <option value="home-appliances">Home Appliances</option>
                                <option value="beauty">Beauty</option>
                                <option value="sports">Sports</option>
                            </select>
                        </div>
                        <button onclick="exportProducts()" class="btn-export w-100">
                            <i class="fas fa-download me-2"></i> Export Products CSV
                        </button>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="export-card">
                        <div class="d-flex align-items-center mb-3">
                            <div class="me-3">
                                <i class="fas fa-users fa-3x text-purple"></i>
                            </div>
                            <div>
                                <h4>Export Customers</h4>
                                <p class="text-muted mb-0">Export customer database</p>
                            </div>
                        </div>
                        <button onclick="exportCustomers()" class="btn-export w-100">
                            <i class="fas fa-download me-2"></i> Export Customers CSV
                        </button>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="export-card">
                        <div class="d-flex align-items-center mb-3">
                            <div class="me-3">
                                <i class="fas fa-chart-bar fa-3x text-success"></i>
                            </div>
                            <div>
                                <h4>Export Analytics</h4>
                                <p class="text-muted mb-0">Export sales analytics data</p>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Time Period</label>
                            <select id="analyticsPeriod" class="form-select">
                                <option value="last_7_days">Last 7 Days</option>
                                <option value="last_30_days">Last 30 Days</option>
                                <option value="last_90_days">Last 90 Days</option>
                                <option value="this_year">This Year</option>
                                <option value="all_time">All Time</option>
                            </select>
                        </div>
                        <button onclick="exportAnalytics()" class="btn-export w-100">
                            <i class="fas fa-download me-2"></i> Export Analytics CSV
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Export History -->
            <div class="table-container mt-5">
                <h5 class="mb-4"><i class="fas fa-history me-2"></i> Recent Exports</h5>
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Export Type</th>
                                <th>Date</th>
                                <th>File Size</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="exportHistory">
                            <tr>
                                <td colspan="5" class="text-center text-muted py-4">
                                    No export history found
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="text-center mt-4">
                <a href="/admin/dashboard" class="btn btn-secondary">
                    <i class="fas fa-arrow-left me-2"></i> Back to Dashboard
                </a>
            </div>
        </div>
    </div>
    
    <script>
        let dateFilter = {};
        
        function applyDateFilter() {
            dateFilter = {
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value
            };
            alert('Date filter applied!');
        }
        
        function exportOrders() {
            const status = document.getElementById('orderStatus').value;
            const filter = { ...dateFilter, status };
            
            showLoading('Exporting orders...');
            
            fetch('/api/export/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(filter)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/api/download/' + data.filename;
                    addToExportHistory('Orders', data.filename);
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Export failed!');
            })
            .finally(() => {
                hideLoading();
            });
        }
        
        function exportProducts() {
            const category = document.getElementById('productCategory').value;
            
            showLoading('Exporting products...');
            
            fetch('/api/export/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ category })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/api/download/' + data.filename;
                    addToExportHistory('Products', data.filename);
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Export failed!');
            })
            .finally(() => {
                hideLoading();
            });
        }
        
        function exportCustomers() {
            showLoading('Exporting customers...');
            
            fetch('/api/export/customers', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/api/download/' + data.filename;
                    addToExportHistory('Customers', data.filename);
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Export failed!');
            })
            .finally(() => {
                hideLoading();
            });
        }
        
        function exportAnalytics() {
            const period = document.getElementById('analyticsPeriod').value;
            
            showLoading('Exporting analytics...');
            
            fetch('/api/export/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ period })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/api/download/' + data.filename;
                    addToExportHistory('Analytics', data.filename);
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Export failed!');
            })
            .finally(() => {
                hideLoading();
            });
        }
        
        function addToExportHistory(type, filename) {
            const historyRow = document.createElement('tr');
            const now = new Date();
            
            historyRow.innerHTML = \`
                <td>\${type}</td>
                <td>\${now.toLocaleDateString()} \${now.toLocaleTimeString()}</td>
                <td>Calculating...</td>
                <td><span class="badge bg-success">Completed</span></td>
                <td>
                    <a href="/api/download/\${filename}" class="btn btn-sm btn-primary">
                        <i class="fas fa-download"></i>
                    </a>
                </td>
            \`;
            
            document.getElementById('exportHistory').prepend(historyRow);
        }
        
        function showLoading(message) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'loadingOverlay';
            loadingDiv.innerHTML = \`
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                ">
                    <div class="spinner-border text-light" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="ms-3 text-light">\${message}</div>
                </div>
            \`;
            document.body.appendChild(loadingDiv);
        }
        
        function hideLoading() {
            const loadingDiv = document.getElementById('loadingOverlay');
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }
        
        // Load export history on page load
        window.onload = function() {
            // Simulate loading export history
            setTimeout(() => {
                const exportHistory = document.getElementById('exportHistory');
                exportHistory.innerHTML = \`
                    <tr>
                        <td>Products</td>
                        <td>\${new Date().toLocaleDateString()}</td>
                        <td>45 KB</td>
                        <td><span class="badge bg-success">Completed</span></td>
                        <td>
                            <button class="btn btn-sm btn-primary" disabled>
                                <i class="fas fa-download"></i>
                            </button>
                        </td>
                    </tr>
                \`;
            }, 1000);
        };
    </script>
</body>
</html>`;
    
    res.send(html);
});

// API Endpoints for Export
app.post('/api/export/orders', requireAuth, async (req, res) => {
    try {
        const filter = req.body;
        const csvPath = await exportOrdersToCSV(filter);
        
        res.json({
            success: true,
            filename: path.basename(csvPath),
            message: 'Orders exported successfully'
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post('/api/export/products', requireAuth, async (req, res) => {
    try {
        const csvPath = await exportProductsToCSV();
        
        res.json({
            success: true,
            filename: path.basename(csvPath),
            message: 'Products exported successfully'
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post('/api/export/customers', requireAuth, async (req, res) => {
    try {
        db.all(`SELECT * FROM customers`, (err, rows) => {
            if (err) throw err;
            
            const csvWriter = csv({
                path: `exports/customers_${Date.now()}.csv`,
                header: [
                    { id: 'name', title: 'Name' },
                    { id: 'email', title: 'Email' },
                    { id: 'phone', title: 'Phone' },
                    { id: 'address', title: 'Address' },
                    { id: 'total_orders', title: 'Total Orders' },
                    { id: 'total_spent', title: 'Total Spent' },
                    { id: 'created_at', title: 'Join Date' }
                ]
            });
            
            csvWriter.writeRecords(rows)
                .then(() => {
                    res.json({
                        success: true,
                        filename: path.basename(csvWriter.path),
                        message: 'Customers exported successfully'
                    });
                })
                .catch(error => {
                    throw error;
                });
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post('/api/export/analytics', requireAuth, async (req, res) => {
    try {
        const { period } = req.body;
        let dateCondition = '';
        
        switch (period) {
            case 'last_7_days':
                dateCondition = "WHERE created_at >= date('now', '-7 days')";
                break;
            case 'last_30_days':
                dateCondition = "WHERE created_at >= date('now', '-30 days')";
                break;
            case 'last_90_days':
                dateCondition = "WHERE created_at >= date('now', '-90 days')";
                break;
            case 'this_year':
                dateCondition = "WHERE strftime('%Y', created_at) = strftime('%Y', 'now')";
                break;
            default:
                dateCondition = '';
        }
        
        db.all(`SELECT 
                strftime('%Y-%m-%d', created_at) as date,
                COUNT(*) as orders,
                SUM(grand_total) as revenue,
                AVG(grand_total) as avg_order_value
                FROM orders 
                ${dateCondition}
                GROUP BY strftime('%Y-%m-%d', created_at)
                ORDER BY date DESC`, (err, rows) => {
            
            if (err) throw err;
            
            const csvWriter = csv({
                path: `exports/analytics_${Date.now()}.csv`,
                header: [
                    { id: 'date', title: 'Date' },
                    { id: 'orders', title: 'Orders' },
                    { id: 'revenue', title: 'Revenue' },
                    { id: 'avg_order_value', title: 'Average Order Value' }
                ]
            });
            
            csvWriter.writeRecords(rows)
                .then(() => {
                    res.json({
                        success: true,
                        filename: path.basename(csvWriter.path),
                        message: 'Analytics exported successfully'
                    });
                })
                .catch(error => {
                    throw error;
                });
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// File download endpoint
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'exports', filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).send('Error downloading file');
            }
            
            // Optional: Delete file after download
            // fs.unlinkSync(filePath);
        });
    } else {
        res.status(404).send('File not found');
    }
});

// Orders management page
app.get('/admin/orders', requireAuth, (req, res) => {
    const { status, date, search } = req.query;
    
    let query = `SELECT * FROM orders WHERE 1=1`;
    let params = [];
    
    if (status && status !== 'all') {
        query += ` AND status = ?`;
        params.push(status);
    }
    
    if (date) {
        query += ` AND DATE(created_at) = DATE(?)`;
        params.push(date);
    }
    
    if (search) {
        query += ` AND (order_id LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR product_name LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    db.all(query, params, (err, orders) => {
        let html = `<!DOCTYPE html>
<html>
<head>
    <title>Manage Orders - Dhaka Market Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap5.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="container-fluid py-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1><i class="fas fa-shopping-cart"></i> Order Management</h1>
            <a href="/admin/dashboard" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Back to Dashboard
            </a>
        </div>
        
        <!-- Filters -->
        <div class="card mb-4">
            <div class="card-body">
                <form method="GET" class="row g-3">
                    <div class="col-md-3">
                        <label class="form-label">Status</label>
                        <select name="status" class="form-select">
                            <option value="all" ${!status || status === 'all' ? 'selected' : ''}>All Status</option>
                            <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="shipped" ${status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Date</label>
                        <input type="date" name="date" class="form-control" value="${date || ''}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Search</label>
                        <input type="text" name="search" class="form-control" placeholder="Search by Order ID, Name, Phone..." value="${search || ''}">
                    </div>
                    <div class="col-md-2 d-flex align-items-end">
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="fas fa-search"></i> Filter
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Orders Table -->
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table id="ordersTable" class="table table-hover">
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
                        <tbody>`;
        
        orders.forEach(order => {
            html += `
                            <tr>
                                <td><strong>${order.order_id}</strong></td>
                                <td>
                                    <div>${order.customer_name}</div>
                                    <small class="text-muted">${order.phone}</small>
                                </td>
                                <td>${order.product_name} x ${order.quantity}</td>
                                <td>${formatPrice(order.grand_total)}</td>
                                <td>
                                    <select class="form-select form-select-sm status-select" data-order-id="${order.order_id}">
                                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    </select>
                                </td>
                                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-sm btn-info view-order" data-order-id="${order.order_id}">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <a href="tel:${order.phone}" class="btn btn-sm btn-success">
                                        <i class="fas fa-phone"></i>
                                    </a>
                                    <button class="btn btn-sm btn-danger delete-order" data-order-id="${order.order_id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>`;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <!-- View Order Modal -->
    <div class="modal fade" id="viewOrderModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Order Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" id="orderDetails">
                    Loading...
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap5.min.js"></script>
    <script>
        $(document).ready(function() {
            $('#ordersTable').DataTable({
                pageLength: 25,
                order: [[5, 'desc']]
            });
            
            // Update order status
            $('.status-select').change(function() {
                const orderId = $(this).data('order-id');
                const status = $(this).val();
                
                fetch('/api/orders/' + orderId + '/status', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: status })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Error updating status');
                    }
                });
            });
            
            // View order details
            $('.view-order').click(function() {
                const orderId = $(this).data('order-id');
                
                fetch('/api/orders/' + orderId)
                    .then(response => response.json())
                    .then(order => {
                        const html = \`
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Order Information</h6>
                                    <p><strong>Order ID:</strong> \${order.order_id}</p>
                                    <p><strong>Date:</strong> \${new Date(order.created_at).toLocaleString()}</p>
                                    <p><strong>Status:</strong> <span class="badge bg-primary">\${order.status}</span></p>
                                    <p><strong>Payment Method:</strong> \${order.payment_method}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Customer Information</h6>
                                    <p><strong>Name:</strong> \${order.customer_name}</p>
                                    <p><strong>Phone:</strong> \${order.phone}</p>
                                    <p><strong>Email:</strong> \${order.customer_email || 'N/A'}</p>
                                    <p><strong>Address:</strong> \${order.address}</p>
                                    <p><strong>Shipping Area:</strong> \${order.shipping_area}</p>
                                </div>
                            </div>
                            <hr>
                            <div class="row">
                                <div class="col-12">
                                    <h6>Order Summary</h6>
                                    <table class="table table-sm">
                                        <tr>
                                            <td>Product:</td>
                                            <td>\${order.product_name}</td>
                                        </tr>
                                        <tr>
                                            <td>Quantity:</td>
                                            <td>\${order.quantity}</td>
                                        </tr>
                                        <tr>
                                            <td>Unit Price:</td>
                                            <td>\${order.unit_price}</td>
                                        </tr>
                                        <tr>
                                            <td>Shipping:</td>
                                            <td>\${order.shipping_cost}</td>
                                        </tr>
                                        <tr class="table-primary">
                                            <td><strong>Total:</strong></td>
                                            <td><strong>\${order.grand_total}</strong></td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                            \${order.notes ? \`
                            <div class="alert alert-info mt-3">
                                <h6>Order Notes</h6>
                                <p>\${order.notes}</p>
                            </div>
                            \` : ''}
                        \`;
                        
                        $('#orderDetails').html(html);
                        new bootstrap.Modal(document.getElementById('viewOrderModal')).show();
                    });
            });
            
            // Delete order
            $('.delete-order').click(function() {
                if (confirm('Are you sure you want to delete this order?')) {
                    const orderId = $(this).data('order-id');
                    
                    fetch('/api/orders/' + orderId, {
                        method: 'DELETE'
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            location.reload();
                        } else {
                            alert('Error deleting order');
                        }
                    });
                }
            });
        });
    </script>
</body>
</html>`;
        
        res.send(html);
    });
});

// Products management page
app.get('/admin/products', requireAuth, (req, res) => {
    db.all("SELECT * FROM products ORDER BY created_at DESC", (err, products) => {
        let html = `<!DOCTYPE html>
<html>
<head>
    <title>Manage Products - Dhaka Market Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap5.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="container-fluid py-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1><i class="fas fa-box"></i> Product Management</h1>
            <div>
                <a href="/admin/products/new" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add New Product
                </a>
                <a href="/admin/dashboard" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Dashboard
                </a>
            </div>
        </div>
        
        <!-- Products Table -->
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table id="productsTable" class="table table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Sales</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>`;
        
        products.forEach(product => {
            const images = JSON.parse(product.images || '[]');
            const mainImage = images[0] || 'https://via.placeholder.com/50';
            
            html += `
                            <tr>
                                <td>${product.id}</td>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <img src="${mainImage}" 
                                             class="rounded me-2" 
                                             style="width: 50px; height: 50px; object-fit: cover;"
                                             onerror="this.src='https://via.placeholder.com/50'">
                                        <div>
                                            <strong>${product.name}</strong><br>
                                            <small class="text-muted">${product.slug}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>${product.category || 'Uncategorized'}</td>
                                <td>
                                    ${product.offer_price ? `
                                        <div><del class="text-muted">${formatPrice(product.price)}</del></div>
                                        <div class="text-danger">${formatPrice(product.offer_price)}</div>
                                    ` : `
                                        <div>${formatPrice(product.price)}</div>
                                    `}
                                </td>
                                <td>
                                    <span class="badge ${product.stock > 10 ? 'bg-success' : product.stock > 0 ? 'bg-warning' : 'bg-danger'}">
                                        ${product.stock}
                                    </span>
                                </td>
                                <td>${product.sales}</td>
                                <td>
                                    <span class="badge ${product.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                                        ${product.status}
                                    </span>
                                </td>
                                <td>
                                    <a href="/admin/products/edit/${product.id}" class="btn btn-sm btn-primary">
                                        <i class="fas fa-edit"></i>
                                    </a>
                                    <a href="/product/${product.slug}" target="_blank" class="btn btn-sm btn-info">
                                        <i class="fas fa-eye"></i>
                                    </a>
                                    <button class="btn btn-sm btn-danger delete-product" data-product-id="${product.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>`;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap5.min.js"></script>
    <script>
        $(document).ready(function() {
            $('#productsTable').DataTable({
                pageLength: 25,
                order: [[0, 'desc']]
            });
            
            // Delete product
            $('.delete-product').click(function() {
                if (confirm('Are you sure you want to delete this product?')) {
                    const productId = $(this).data('product-id');
                    
                    fetch('/api/products/' + productId, {
                        method: 'DELETE'
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            location.reload();
                        } else {
                            alert('Error deleting product');
                        }
                    });
                }
            });
        });
    </script>
</body>
</html>`;
        
        res.send(html);
    });
});

// Add new product page
app.get('/admin/products/new', requireAuth, (req, res) => {
    db.all("SELECT * FROM categories", (err, categories) => {
        let html = `<!DOCTYPE html>
<html>
<head>
    <title>Add New Product - Dhaka Market Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .form-container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .image-preview {
            border: 2px dashed #dee2e6;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .preview-img {
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 5px;
            border: 1px solid #dee2e6;
        }
    </style>
</head>
<body>
    <div class="container py-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1><i class="fas fa-plus-circle"></i> Add New Product</h1>
            <a href="/admin/products" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Back to Products
            </a>
        </div>
        
        <div class="form-container">
            <form id="productForm" action="/api/products" method="POST" enctype="multipart/form-data">
                <div class="row">
                    <!-- Basic Information -->
                    <div class="col-md-8">
                        <div class="mb-3">
                            <label class="form-label">Product Name *</label>
                            <input type="text" name="name" class="form-control" required>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Regular Price *</label>
                                <input type="number" name="price" class="form-control" step="0.01" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Offer Price (Optional)</label>
                                <input type="number" name="offer_price" class="form-control" step="0.01">
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Description *</label>
                            <textarea name="description" class="form-control" rows="4" required></textarea>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Features (One per line) *</label>
                            <textarea name="features" class="form-control" rows="4" required placeholder="Feature 1&#10;Feature 2&#10;Feature 3"></textarea>
                        </div>
                    </div>
                    
                    <!-- Sidebar -->
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">Product Details</h6>
                                
                                <div class="mb-3">
                                    <label class="form-label">Category</label>
                                    <select name="category" class="form-select">
                                        <option value="">Select Category</option>`;
        
        categories.forEach(cat => {
            html += `<option value="${cat.slug}">${cat.name}</option>`;
        });
        
        html += `
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Stock Quantity *</label>
                                    <input type="number" name="stock" class="form-control" value="100" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Status</label>
                                    <select name="status" class="form-select">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Brand (Optional)</label>
                                    <input type="text" name="brand" class="form-control">
                                </div>
                                
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save"></i> Save Product
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Image Upload -->
                <div class="card mt-4">
                    <div class="card-body">
                        <h6 class="card-title">Product Images</h6>
                        <div class="mb-3">
                            <label class="form-label">Upload Images (Multiple)</label>
                            <input type="file" name="images" class="form-control" accept="image/*" multiple>
                            <div class="form-text">You can upload multiple images. First image will be the main image.</div>
                        </div>
                        
                        <div class="image-preview mb-3" id="imagePreview">
                            <div class="text-center text-muted">
                                <i class="fas fa-image fa-3x mb-2"></i>
                                <p>No images selected</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Image URLs -->
                <div class="card mt-3">
                    <div class="card-body">
                        <h6 class="card-title">Or Add Image URLs</h6>
                        <div class="mb-3">
                            <label class="form-label">Image URLs (One per line)</label>
                            <textarea name="image_urls" class="form-control" rows="3" placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"></textarea>
                            <div class="form-text">Add image URLs if you don't want to upload files.</div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
    
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script>
        // Image preview
        document.querySelector('input[name="images"]').addEventListener('change', function(e) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = '';
            
            const files = e.target.files;
            if (files.length === 0) {
                preview.innerHTML = \`
                    <div class="text-center text-muted">
                        <i class="fas fa-image fa-3x mb-2"></i>
                        <p>No images selected</p>
                    </div>
                \`;
                return;
            }
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-img';
                    preview.appendChild(img);
                }
                
                reader.readAsDataURL(file);
            }
        });
        
        // Form submission
        document.getElementById('productForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            // Convert features textarea to array
            const features = formData.get('features').split('\\n').filter(f => f.trim() !== '');
            formData.set('features', JSON.stringify(features));
            
            // Handle image URLs
            const imageUrls = formData.get('image_urls').split('\\n').filter(url => url.trim() !== '');
            if (imageUrls.length > 0) {
                formData.set('image_urls', JSON.stringify(imageUrls));
            }
            
            fetch('/api/products', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Product added successfully!');
                    window.location.href = '/admin/products';
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error adding product');
            });
        });
        
        // Initialize Select2
        $(document).ready(function() {
            $('select').select2({
                theme: 'bootstrap-5'
            });
        });
    </script>
</body>
</html>`;
        
        res.send(html);
    });
});

// API endpoints
app.post('/api/products', upload.array('images', 10), (req, res) => {
    const { 
        name, price, offer_price, description, 
        features, category, stock, status, brand,
        image_urls 
    } = req.body;
    
    const uploadedImages = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const urlImages = image_urls ? JSON.parse(image_urls) : [];
    const allImages = [...uploadedImages, ...urlImages];
    
    const slug = name.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
    
    db.run(`INSERT INTO products 
            (name, slug, price, offer_price, images, description, 
             features, category, stock, status, brand) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, slug, price, offer_price || null, JSON.stringify(allImages), 
         description, features, category || null, stock, status, brand || null], 
        function(err) {
            
            if (err) {
                console.error('Product insert error:', err);
                res.json({ success: false, message: err.message });
                return;
            }
            
            res.json({ 
                success: true, 
                message: 'Product added successfully',
                productId: this.lastID 
            });
        });
});

app.put('/api/orders/:orderId/status', (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    
    db.run("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?", 
        [status, orderId], function(err) {
            
            if (err) {
                res.json({ success: false, message: err.message });
                return;
            }
            
            res.json({ success: true, message: 'Order status updated' });
        });
});

app.get('/api/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    
    db.get("SELECT * FROM orders WHERE order_id = ?", [orderId], (err, order) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        
        res.json(order);
    });
});

app.delete('/api/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    
    db.run("DELETE FROM orders WHERE order_id = ?", [orderId], function(err) {
        if (err) {
            res.json({ success: false, message: err.message });
            return;
        }
        
        res.json({ success: true, message: 'Order deleted successfully' });
    });
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    
    db.run("DELETE FROM products WHERE id = ?", [id], function(err) {
        if (err) {
            res.json({ success: false, message: err.message });
            return;
        }
        
        res.json({ success: true, message: 'Product deleted successfully' });
    });
});

// Settings page
app.get('/admin/settings', requireAuth, (req, res) => {
    db.all("SELECT * FROM settings", (err, settings) => {
        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });
        
        let html = `<!DOCTYPE html>
<html>
<head>
    <title>Settings - Dhaka Market Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="container py-4">
        <h1 class="mb-4"><i class="fas fa-cog"></i> Settings</h1>
        
        <div class="row">
            <!-- Site Settings -->
            <div class="col-md-6">
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Site Settings</h5>
                    </div>
                    <div class="card-body">
                        <form id="siteSettings">
                            <div class="mb-3">
                                <label class="form-label">Site Name</label>
                                <input type="text" class="form-control" name="site_name" value="${settingsMap.site_name || ''}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Site Email</label>
                                <input type="email" class="form-control" name="site_email" value="${settingsMap.site_email || ''}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Site Phone</label>
                                <input type="text" class="form-control" name="site_phone" value="${settingsMap.site_phone || ''}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Site Address</label>
                                <textarea class="form-control" name="site_address" rows="2">${settingsMap.site_address || ''}</textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </form>
                    </div>
                </div>
                
                <!-- Shipping Settings -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Shipping Settings</h5>
                    </div>
                    <div class="card-body">
                        <form id="shippingSettings">
                            <div class="mb-3">
                                <label class="form-label">Inside Dhaka Shipping Cost</label>
                                <input type="number" class="form-control" name="shipping_inside_dhaka" 
                                       value="${settingsMap.shipping_inside_dhaka || '80'}" step="0.01">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Outside Dhaka Shipping Cost</label>
                                <input type="number" class="form-control" name="shipping_outside_dhaka" 
                                       value="${settingsMap.shipping_outside_dhaka || '150'}" step="0.01">
                            </div>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Payment & Social Settings -->
            <div class="col-md-6">
                <!-- Payment Settings -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Payment Settings</h5>
                    </div>
                    <div class="card-body">
                        <form id="paymentSettings">
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="cod_enabled" 
                                           id="cod_enabled" ${settingsMap.cod_enabled === 'true' ? 'checked' : ''}>
                                    <label class="form-check-label" for="cod_enabled">
                                        Enable Cash on Delivery (COD)
                                    </label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">bKash Number (Optional)</label>
                                <input type="text" class="form-control" name="bkash_number" 
                                       value="${settingsMap.bkash_number || ''}" placeholder="01XXXXXXXXX">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Nagad Number (Optional)</label>
                                <input type="text" class="form-control" name="nagad_number" 
                                       value="${settingsMap.nagad_number || ''}" placeholder="01XXXXXXXXX">
                            </div>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </form>
                    </div>
                </div>
                
                <!-- Social Media Settings -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Social Media</h5>
                    </div>
                    <div class="card-body">
                        <form id="socialSettings">
                            <div class="mb-3">
                                <label class="form-label">Facebook URL</label>
                                <input type="url" class="form-control" name="facebook_url" 
                                       value="${settingsMap.facebook_url || ''}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Instagram URL</label>
                                <input type="url" class="form-control" name="instagram_url" 
                                       value="${settingsMap.instagram_url || ''}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">WhatsApp Number</label>
                                <input type="text" class="form-control" name="whatsapp_number" 
                                       value="${settingsMap.whatsapp_number || '8801234567890'}">
                            </div>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </form>
                    </div>
                </div>
                
                <!-- System Settings -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">System Settings</h5>
                    </div>
                    <div class="card-body">
                        <form id="systemSettings">
                            <div class="mb-3">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" name="maintenance_mode" 
                                           id="maintenance_mode" ${settingsMap.maintenance_mode === 'true' ? 'checked' : ''}>
                                    <label class="form-check-label" for="maintenance_mode">
                                        Maintenance Mode
                                    </label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Currency</label>
                                <select class="form-select" name="currency">
                                    <option value="BDT" ${settingsMap.currency === 'BDT' ? 'selected' : ''}>Bangladeshi Taka (৳)</option>
                                    <option value="USD" ${settingsMap.currency === 'USD' ? 'selected' : ''}>US Dollar ($)</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Danger Zone -->
        <div class="card border-danger">
            <div class="card-header bg-danger text-white">
                <h5 class="mb-0">Danger Zone</h5>
            </div>
            <div class="card-body">
                <div class="alert alert-danger">
                    <h6><i class="fas fa-exclamation-triangle"></i> Warning</h6>
                    <p>These actions are irreversible. Please proceed with caution.</p>
                </div>
                
                <div class="d-grid gap-2">
                    <button class="btn btn-outline-danger" onclick="clearAllOrders()">
                        <i class="fas fa-trash"></i> Clear All Orders
                    </button>
                    <button class="btn btn-outline-danger" onclick="resetAllProducts()">
                        <i class="fas fa-undo"></i> Reset All Products
                    </button>
                    <button class="btn btn-danger" onclick="backupDatabase()">
                        <i class="fas fa-database"></i> Backup Database
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Save settings
        function saveSettings(formId, data) {
            fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Settings saved successfully!');
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error saving settings');
            });
        }
        
        // Site settings
        document.getElementById('siteSettings').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            saveSettings('site', data);
        });
        
        // Shipping settings
        document.getElementById('shippingSettings').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            saveSettings('shipping', data);
        });
        
        // Payment settings
        document.getElementById('paymentSettings').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            // Convert checkbox to boolean string
            data.cod_enabled = document.getElementById('cod_enabled').checked ? 'true' : 'false';
            saveSettings('payment', data);
        });
        
        // Social settings
        document.getElementById('socialSettings').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            saveSettings('social', data);
        });
        
        // System settings
        document.getElementById('systemSettings').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            // Convert checkbox to boolean string
            data.maintenance_mode = document.getElementById('maintenance_mode').checked ? 'true' : 'false';
            saveSettings('system', data);
        });
        
        // Danger zone actions
        function clearAllOrders() {
            if (confirm('Are you sure you want to clear ALL orders? This action cannot be undone!')) {
                fetch('/api/orders/clear', {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('All orders have been cleared!');
                    } else {
                        alert('Error: ' + data.message);
                    }
                });
            }
        }
        
        function resetAllProducts() {
            if (confirm('Are you sure you want to reset ALL products to default values?')) {
                fetch('/api/products/reset', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Products have been reset!');
                    } else {
                        alert('Error: ' + data.message);
                    }
                });
            }
        }
        
        function backupDatabase() {
            fetch('/api/database/backup', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Database backup created successfully!');
                } else {
                    alert('Error: ' + data.message);
                }
            });
        }
    </script>
</body>
</html>`;
        
        res.send(html);
    });
});

// Settings API
app.post('/api/settings', requireAuth, (req, res) => {
    const settings = req.body;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        try {
            Object.entries(settings).forEach(([key, value]) => {
                db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
            });
            
            db.run('COMMIT');
            res.json({ success: true, message: 'Settings saved successfully' });
        } catch (error) {
            db.run('ROLLBACK');
            res.json({ success: false, message: error.message });
        }
    });
});

// Additional pages
app.get('/categories', (req, res) => {
    db.all("SELECT * FROM categories WHERE status = 'active'", (err, categories) => {
        let html = `<!DOCTYPE html>
<html>
<head>
    <title>Categories - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .category-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }
        .category-card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            transition: all 0.3s;
            text-align: center;
            padding: 30px 20px;
        }
        .category-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .category-icon {
            font-size: 3rem;
            color: #ff6b6b;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container py-5">
        <h1 class="text-center mb-5">Shop by Categories</h1>
        
        <div class="category-grid">
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
                <a href="/products?category=${category.slug}" class="text-decoration-none">
                    <div class="category-card">
                        <div class="category-icon">
                            <i class="${icon}"></i>
                        </div>
                        <h3>${category.name}</h3>
                        ${category.description ? `<p class="text-muted">${category.description}</p>` : ''}
                        <button class="btn btn-primary">Browse Products</button>
                    </div>
                </a>`;
            }).join('')}
        </div>
        
        <div class="text-center mt-5">
            <a href="/" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Back to Home
            </a>
        </div>
    </div>
</body>
</html>`;
        
        res.send(html);
    });
});

app.get('/contact', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Contact Us - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .contact-card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            margin-top: 30px;
        }
        .contact-icon {
            font-size: 2.5rem;
            color: #ff6b6b;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container py-5">
        <h1 class="text-center mb-5">Contact Us</h1>
        
        <div class="row">
            <div class="col-md-4">
                <div class="contact-card text-center h-100">
                    <div class="contact-icon">
                        <i class="fas fa-phone-alt"></i>
                    </div>
                    <h4>Call Us</h4>
                    <p>+880 1234-567890</p>
                    <p>+880 1234-567891</p>
                    <a href="tel:+8801234567890" class="btn btn-primary">
                        <i class="fas fa-phone"></i> Call Now
                    </a>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="contact-card text-center h-100">
                    <div class="contact-icon">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <h4>Email Us</h4>
                    <p>info@dhakamarket.com</p>
                    <p>support@dhakamarket.com</p>
                    <a href="mailto:info@dhakamarket.com" class="btn btn-primary">
                        <i class="fas fa-envelope"></i> Send Email
                    </a>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="contact-card text-center h-100">
                    <div class="contact-icon">
                        <i class="fab fa-whatsapp"></i>
                    </div>
                    <h4>WhatsApp</h4>
                    <p>+880 1234-567890</p>
                    <p>24/7 Support</p>
                    <a href="https://wa.me/8801234567890" target="_blank" class="btn btn-success">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </a>
                </div>
            </div>
        </div>
        
        <div class="contact-card mt-4">
            <h4 class="text-center mb-4">Visit Our Office</h4>
            <div class="row">
                <div class="col-md-6">
                    <h5>Head Office</h5>
                    <p><i class="fas fa-map-marker-alt me-2"></i> 123 Market Street, Dhaka 1205, Bangladesh</p>
                    <p><i class="fas fa-clock me-2"></i> Open: 9:00 AM - 10:00 PM (Everyday)</p>
                </div>
                <div class="col-md-6">
                    <h5>Warehouse</h5>
                    <p><i class="fas fa-map-marker-alt me-2"></i> 456 Industrial Area, Tongi, Gazipur</p>
                    <p><i class="fas fa-clock me-2"></i> Open: 8:00 AM - 8:00 PM (Mon-Sat)</p>
                </div>
            </div>
        </div>
        
        <div class="text-center mt-4">
            <a href="/" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Back to Home
            </a>
        </div>
    </div>
</body>
</html>`);
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`<!DOCTYPE html>
<html>
<head>
    <title>404 - Page Not Found</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .error-container {
            max-width: 600px;
            margin: 100px auto;
            text-align: center;
        }
        .error-icon {
            font-size: 5rem;
            color: #ff6b6b;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-container">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h1>404</h1>
            <h2>Page Not Found</h2>
            <p class="lead mb-4">The page you are looking for doesn't exist or has been moved.</p>
            <a href="/" class="btn btn-primary btn-lg">
                <i class="fas fa-home"></i> Go Back Home
            </a>
        </div>
    </div>
</body>
</html>`);
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   Dhaka Market Server Started Successfully!          ║
    ║                                                       ║
    ║   Local: http://localhost:${PORT}                    ║
    ║                                                       ║
    ║   Admin Panel: http://localhost:${PORT}/admin-login  ║
    ║   Username: admin                                    ║
    ║   Password: admin123                                 ║
    ║                                                       ║
    ║   Features:                                          ║
    ║   • Complete E-commerce Platform                     ║
    ║   • Admin Dashboard with Analytics                   ║
    ║   • CSV Export Functionality                         ║
    ║   • Order Management System                          ║
    ║   • Product Management                               ║
    ║   • Customer Management                              ║
    ║   • Settings Management                              ║
    ║   • Responsive Design                                ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    `);
});
