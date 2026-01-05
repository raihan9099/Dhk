const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = 3000;

// Database setup
const db = new sqlite3.Database('./ecommerce.db');

// Create tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Categories table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        sale_price REAL,
        category_id INTEGER,
        brand TEXT,
        sku TEXT UNIQUE,
        stock INTEGER DEFAULT 100,
        images TEXT,
        features TEXT,
        specifications TEXT,
        rating REAL DEFAULT 0,
        total_reviews INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )`);
    
    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        total_amount REAL NOT NULL,
        shipping_address TEXT NOT NULL,
        billing_address TEXT,
        payment_method TEXT DEFAULT 'cash_on_delivery',
        payment_status TEXT DEFAULT 'pending',
        order_status TEXT DEFAULT 'pending',
        tracking_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    
    // Order items table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        product_name TEXT,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);
    
    // Cart table
    db.run(`CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);
    
    // Wishlist table
    db.run(`CREATE TABLE IF NOT EXISTS wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);
    
    // Reviews table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        rating INTEGER NOT NULL,
        comment TEXT,
        images TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);
    
    // Insert sample data
    insertSampleData();
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'ecommerce_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// File upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Helper functions
function formatPrice(price) {
    return '৳' + price.toLocaleString('en-IN');
}

function generateOrderNumber() {
    return 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
}

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Insert sample data
function insertSampleData() {
    // Check if data already exists
    db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
        if (row.count === 0) {
            // Insert categories
            const categories = [
                ['ইলেকট্রনিক্স', 'electronics', '/uploads/electronics.jpg'],
                ['ফ্যাশন', 'fashion', '/uploads/fashion.jpg'],
                ['ঘরোয়া সামগ্রী', 'home', '/uploads/home.jpg'],
                ['বই', 'books', '/uploads/books.jpg'],
                ['খেলনা', 'toys', '/uploads/toys.jpg'],
                ['স্বাস্থ্য ও সৌন্দর্য', 'beauty', '/uploads/beauty.jpg']
            ];
            
            categories.forEach(category => {
                db.run("INSERT INTO categories (name, slug, image) VALUES (?, ?, ?)", category);
            });
            
            // Insert sample products
            const products = [
                ['স্মার্টফোন X10', 'smartphone-x10', 'উন্নত ক্যামেরা সহ স্মার্টফোন', 25000, 22999, 1, 'Samsung', 'SMX101', 50, 
                 JSON.stringify(['/uploads/phone1.jpg', '/uploads/phone2.jpg']),
                 JSON.stringify(['48MP ক্যামেরা', '128GB স্টোরেজ', '5000mAh ব্যাটারি', 'ফাস্ট চার্জিং']),
                 JSON.stringify({display: '6.5"', ram: '6GB', storage: '128GB', battery: '5000mAh'})],
                
                ['ল্যাপটপ প্রো', 'laptop-pro', 'হাই-পারফরমেন্স ল্যাপটপ', 85000, 79999, 1, 'Dell', 'DLP202', 30,
                 JSON.stringify(['/uploads/laptop1.jpg']),
                 JSON.stringify(['Intel i7 প্রসেসর', '16GB RAM', '512GB SSD', 'ডেডিকেটেড গ্রাফিক্স']),
                 JSON.stringify({processor: 'Intel i7', ram: '16GB', storage: '512GB SSD', display: '15.6"'})],
                
                ['শার্ট', 'shirt-premium', 'কটন শার্ট', 1200, 999, 2, 'Richman', 'RMS101', 100,
                 JSON.stringify(['/uploads/shirt1.jpg']),
                 JSON.stringify(['১০০% কটন', 'কমফোর্টেবল', 'মেশিন ওয়াশেবল']),
                 JSON.stringify({material: 'Cotton', size: 'M,L,XL', color: 'Blue, White, Black'})]
            ];
            
            products.forEach(product => {
                db.run("INSERT INTO products (name, slug, description, price, sale_price, category_id, brand, sku, stock, images, features, specifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", product);
            });
            
            // Insert admin user
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run("INSERT INTO users (name, email, password, phone, address) VALUES (?, ?, ?, ?, ?)", 
                ['এডমিন', 'admin@email.com', hashedPassword, '01712345678', 'ঢাকা, বাংলাদেশ']);
        }
    });
}

// ============= C-STYLE ORDER MANAGEMENT FUNCTIONS =============
// This simulates the C program functionality in JavaScript

// Define Order structure similar to C
class Order {
    constructor(id, customer, status) {
        this.id = id;
        this.customer = customer;
        this.status = status;
    }
}

// Action for incomplete orders (like C's handleIncompleteOrder)
function handleIncompleteOrder(order) {
    console.log(`⚠️ Incomplete Order Found: ID=${order.id}, Customer=${order.customer}, Status=${order.status}`);
    
    // Log to file like in C program
    const logMessage = `Order ${order.id} (${order.customer}) is ${order.status} - ${new Date().toISOString()}\n`;
    
    // Ensure logs directory exists
    if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs');
    }
    
    fs.appendFile('logs/incomplete_orders.log', logMessage, (err) => {
        if (err) console.error('Error writing to log file:', err);
    });
    
    return logMessage;
}

// Filter orders function (like C's filterOrders)
function filterOrders(orders) {
    const incompleteOrders = [];
    
    for (let i = 0; i < orders.length; i++) {
        if (orders[i].status === 'pending' || 
            orders[i].status === 'failed' || 
            orders[i].status === 'processing') {
            
            const logMessage = handleIncompleteOrder(orders[i]);
            incompleteOrders.push({
                order: orders[i],
                log: logMessage
            });
        }
    }
    
    return incompleteOrders;
}

// Simulate loading orders (like C's loadOrders)
function loadOrdersFromDatabase() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT id, order_number, order_status, 
                       (SELECT name FROM users WHERE id = orders.user_id) as customer
                FROM orders 
                ORDER BY created_at DESC`, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Convert to C-style Order objects
            const orders = rows.map(row => 
                new Order(row.id, row.customer || 'Unknown', row.order_status)
            );
            
            resolve(orders);
        });
    });
}

// Run C-style order monitoring
async function runOrderMonitoring() {
    try {
        console.log("=== Server Order Filter (C-Style) ===");
        const orders = await loadOrdersFromDatabase();
        const incompleteOrders = filterOrders(orders);
        
        console.log(`Total orders scanned: ${orders.length}`);
        console.log(`Incomplete orders found: ${incompleteOrders.length}`);
        
        return incompleteOrders;
    } catch (error) {
        console.error('Error in order monitoring:', error);
        return [];
    }
}

// Schedule regular monitoring (every 30 minutes)
setInterval(() => {
    runOrderMonitoring().then(incompleteOrders => {
        if (incompleteOrders.length > 0) {
            console.log(`🚨 Alert: ${incompleteOrders.length} orders need attention!`);
        }
    });
}, 30 * 60 * 1000); // 30 minutes

// ============= ROUTES =============

// Home page route (unchanged from your original code)
app.get('/', (req, res) => {
    db.all(`SELECT p.*, c.name as category_name FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC LIMIT 12`, (err, products) => {
        
        db.all("SELECT * FROM categories ORDER BY name", (err, categories) => {
            
            db.all(`SELECT p.*, COUNT(r.id) as review_count FROM products p 
                    LEFT JOIN reviews r ON p.id = r.product_id 
                    GROUP BY p.id ORDER BY p.rating DESC LIMIT 6`, (err, trending) => {
                
                let cartCount = 0;
                if (req.session.user) {
                    db.get("SELECT COUNT(*) as count FROM cart WHERE user_id = ?", [req.session.user.id], (err, row) => {
                        cartCount = row.count;
                        renderHome();
                    });
                } else {
                    renderHome();
                }
                
                function renderHome() {
                    const template = `
                    <!DOCTYPE html>
                    <html lang="bn">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Amazon-Style ই-কমার্স</title>
                        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                        <style>
                            :root {
                                --amazon-orange: #FF9900;
                                --amazon-dark: #232F3E;
                                --amazon-light: #F3F3F3;
                            }
                            body {
                                font-family: 'Hind Siliguri', sans-serif;
                                background: var(--amazon-light);
                            }
                            .amazon-navbar {
                                background: var(--amazon-dark);
                                padding: 10px 0;
                            }
                            .amazon-logo {
                                color: white;
                                font-size: 1.8rem;
                                font-weight: bold;
                                text-decoration: none;
                            }
                            .amazon-search {
                                width: 100%;
                                border-radius: 5px;
                                border: none;
                                padding: 10px;
                            }
                            .amazon-category-nav {
                                background: #37475A;
                                padding: 8px 0;
                            }
                            .category-link {
                                color: white;
                                text-decoration: none;
                                margin: 0 15px;
                                font-size: 0.9rem;
                            }
                            .hero-section {
                                background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/uploads/hero-bg.jpg');
                                background-size: cover;
                                color: white;
                                padding: 80px 0;
                                text-align: center;
                            }
                            .product-card {
                                background: white;
                                border-radius: 5px;
                                padding: 15px;
                                margin-bottom: 20px;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                transition: transform 0.3s;
                                height: 100%;
                            }
                            .product-card:hover {
                                transform: translateY(-5px);
                                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                            }
                            .product-image {
                                height: 200px;
                                object-fit: contain;
                                width: 100%;
                            }
                            .product-price {
                                color: #B12704;
                                font-weight: bold;
                                font-size: 1.2rem;
                            }
                            .old-price {
                                text-decoration: line-through;
                                color: #565959;
                                font-size: 0.9rem;
                            }
                            .rating {
                                color: var(--amazon-orange);
                            }
                            .btn-amazon {
                                background: var(--amazon-orange);
                                color: white;
                                border: none;
                                padding: 8px 20px;
                                border-radius: 3px;
                                font-weight: bold;
                            }
                            .btn-amazon:hover {
                                background: #e68900;
                                color: white;
                            }
                            .category-card {
                                background: white;
                                padding: 20px;
                                text-align: center;
                                border-radius: 5px;
                                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                                text-decoration: none;
                                color: #333;
                                display: block;
                                transition: all 0.3s;
                            }
                            .category-card:hover {
                                background: var(--amazon-light);
                                color: var(--amazon-orange);
                            }
                            .category-icon {
                                font-size: 2.5rem;
                                margin-bottom: 10px;
                            }
                            .footer {
                                background: var(--amazon-dark);
                                color: white;
                                padding: 40px 0;
                                margin-top: 50px;
                            }
                            .cart-badge {
                                position: absolute;
                                top: -5px;
                                right: -5px;
                                background: var(--amazon-orange);
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
                                min-width: 200px;
                            }
                            .wishlist-btn {
                                position: absolute;
                                top: 10px;
                                right: 10px;
                                background: white;
                                border: none;
                                width: 35px;
                                height: 35px;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                                color: #666;
                            }
                            .wishlist-btn.active {
                                color: #ff4757;
                            }
                        </style>
                    </head>
                    <body>
                        <!-- Navbar -->
                        <nav class="amazon-navbar">
                            <div class="container">
                                <div class="row align-items-center">
                                    <div class="col-md-2">
                                        <a href="/" class="amazon-logo">
                                            <i class="fab fa-amazon me-2"></i>Amazon-Style
                                        </a>
                                    </div>
                                    <div class="col-md-5">
                                        <div class="input-group">
                                            <input type="text" class="amazon-search" placeholder="পণ্য খুঁজুন...">
                                            <button class="btn btn-warning"><i class="fas fa-search"></i></button>
                                        </div>
                                    </div>
                                    <div class="col-md-5 text-end">
                                        ${req.session.user ? `
                                            <div class="dropdown d-inline-block">
                                                <button class="btn btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                                    <i class="fas fa-user me-1"></i>${req.session.user.name}
                                                </button>
                                                <ul class="dropdown-menu">
                                                    <li><a class="dropdown-item" href="/profile"><i class="fas fa-user me-2"></i>প্রোফাইল</a></li>
                                                    <li><a class="dropdown-item" href="/orders"><i class="fas fa-shopping-bag me-2"></i>আমার অর্ডার</a></li>
                                                    <li><a class="dropdown-item" href="/wishlist"><i class="fas fa-heart me-2"></i>উইশলিস্ট</a></li>
                                                    <li><hr class="dropdown-divider"></li>
                                                    <li><a class="dropdown-item" href="/logout"><i class="fas fa-sign-out-alt me-2"></i>লগআউট</a></li>
                                                </ul>
                                            </div>
                                            <a href="/cart" class="btn btn-outline-light ms-3 position-relative">
                                                <i class="fas fa-shopping-cart"></i>
                                                <span class="cart-badge">${cartCount}</span>
                                            </a>
                                        ` : `
                                            <a href="/login" class="btn btn-outline-light">লগইন</a>
                                            <a href="/register" class="btn btn-warning ms-2">রেজিস্টার</a>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </nav>
                        
                        <!-- Category Navigation -->
                        <div class="amazon-category-nav d-none d-md-block">
                            <div class="container">
                                ${categories.map(cat => `
                                    <a href="/category/${cat.slug}" class="category-link">
                                        <i class="fas fa-tag me-1"></i>${cat.name}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Hero Section -->
                        <div class="hero-section">
                            <div class="container">
                                <h1 class="display-4 mb-4">আপনার প্রিয় পণ্য এখন ঘরে বসে কিনুন</h1>
                                <p class="lead mb-4">৫০০০+ পণ্য, ১০০% অরিজিনাল, ক্যাশ অন ডেলিভারি</p>
                                <a href="/products" class="btn btn-warning btn-lg">এখনই শপিং শুরু করুন</a>
                            </div>
                        </div>
                        
                        <!-- Main Content -->
                        <div class="container mt-5">
                            <!-- Categories -->
                            <div class="row mb-5">
                                <div class="col-12 mb-4">
                                    <h3><i class="fas fa-th-large me-2"></i>ক্যাটেগরি ব্রাউজ করুন</h3>
                                </div>
                                ${categories.map(cat => `
                                    <div class="col-md-2 col-6 mb-3">
                                        <a href="/category/${cat.slug}" class="category-card">
                                            <div class="category-icon">
                                                <i class="fas fa-${cat.slug === 'electronics' ? 'mobile-alt' : cat.slug === 'fashion' ? 'tshirt' : cat.slug === 'home' ? 'home' : cat.slug === 'books' ? 'book' : cat.slug === 'toys' ? 'gamepad' : 'spa'}"></i>
                                            </div>
                                            <div class="category-name">${cat.name}</div>
                                        </a>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <!-- Trending Products -->
                            <div class="row mb-5">
                                <div class="col-12 mb-4">
                                    <h3><i class="fas fa-fire me-2 text-danger"></i>ট্রেন্ডিং পণ্য</h3>
                                </div>
                                ${trending.map(product => {
                                    const images = JSON.parse(product.images || '[]');
                                    return `
                                    <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                                        <div class="product-card">
                                            ${req.session.user ? `
                                                <button class="wishlist-btn" onclick="toggleWishlist(${product.id})">
                                                    <i class="far fa-heart"></i>
                                                </button>
                                            ` : ''}
                                            <img src="${images[0] || '/uploads/default.jpg'}" class="product-image mb-3" alt="${product.name}">
                                            <h6 class="product-title" style="height: 50px; overflow: hidden;">${product.name}</h6>
                                            <div class="rating mb-2">
                                                ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5-Math.floor(product.rating))}
                                                <small class="text-muted">(${product.total_reviews})</small>
                                            </div>
                                            <div class="product-price">
                                                ${formatPrice(product.sale_price || product.price)}
                                                ${product.sale_price ? `<span class="old-price ms-2">${formatPrice(product.price)}</span>` : ''}
                                            </div>
                                            <div class="mt-3">
                                                <button class="btn btn-amazon w-100 mb-2" onclick="addToCart(${product.id})">
                                                    <i class="fas fa-cart-plus me-1"></i>কার্টে যোগ করুন
                                                </button>
                                                <a href="/product/${product.slug}" class="btn btn-outline-secondary w-100">
                                                    বিস্তারিত দেখুন
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                            
                            <!-- New Arrivals -->
                            <div class="row">
                                <div class="col-12 mb-4">
                                    <h3><i class="fas fa-bolt me-2 text-warning"></i>নতুন পণ্য</h3>
                                </div>
                                ${products.map(product => {
                                    const images = JSON.parse(product.images || '[]');
                                    return `
                                    <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                                        <div class="product-card">
                                            <img src="${images[0] || '/uploads/default.jpg'}" class="product-image mb-3" alt="${product.name}">
                                            <h6 class="product-title" style="height: 50px; overflow: hidden;">${product.name}</h6>
                                            <div class="rating mb-2">
                                                ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5-Math.floor(product.rating))}
                                            </div>
                                            <div class="product-price">
                                                ${formatPrice(product.sale_price || product.price)}
                                                ${product.sale_price ? `<span class="old-price ms-2">${formatPrice(product.price)}</span>` : ''}
                                            </div>
                                            <div class="mt-3">
                                                <button class="btn btn-amazon w-100 mb-2" onclick="addToCart(${product.id})">
                                                    <i class="fas fa-cart-plus me-1"></i>কার্টে যোগ করুন
                                                </button>
                                                <a href="/product/${product.slug}" class="btn btn-outline-secondary w-100">
                                                    বিস্তারিত দেখুন
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div class="footer">
                            <div class="container">
                                <div class="row">
                                    <div class="col-md-3">
                                        <h5>Amazon-Style</h5>
                                        <p>বাংলাদেশের সবচেয়ে বড় ই-কমার্স প্ল্যাটফর্ম</p>
                                    </div>
                                    <div class="col-md-3">
                                        <h5>লিংক</h5>
                                        <ul class="list-unstyled">
                                            <li><a href="/about" class="text-light">আমাদের সম্পর্কে</a></li>
                                            <li><a href="/contact" class="text-light">যোগাযোগ</a></li>
                                            <li><a href="/privacy" class="text-light">প্রাইভেসি পলিসি</a></li>
                                            <li><a href="/terms" class="text-light">শর্তাবলী</a></li>
                                        </ul>
                                    </div>
                                    <div class="col-md-3">
                                        <h5>কাস্টমার সার্ভিস</h5>
                                        <ul class="list-unstyled">
                                            <li><a href="/help" class="text-light">সাহায্য কেন্দ্র</a></li>
                                            <li><a href="/returns" class="text-light">রিটার্ন পলিসি</a></li>
                                            <li><a href="/shipping" class="text-light">শিপিং তথ্য</a></li>
                                            <li><a href="/faq" class="text-light">সচরাচর জিজ্ঞাসা</a></li>
                                        </ul>
                                    </div>
                                    <div class="col-md-3">
                                        <h5>যোগাযোগ</h5>
                                        <p><i class="fas fa-phone me-2"></i> 09678-123456</p>
                                        <p><i class="fas fa-envelope me-2"></i> support@amazonstyle.com</p>
                                        <p><i class="fas fa-map-marker-alt me-2"></i> ঢাকা, বাংলাদেশ</p>
                                    </div>
                                </div>
                                <hr class="bg-light">
                                <div class="text-center">
                                    <p>&copy; 2024 Amazon-Style. All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                        
                        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
                        <script>
                            function addToCart(productId) {
                                ${req.session.user ? `
                                    fetch('/api/cart/add', {
                                        method: 'POST',
                                        headers: {'Content-Type': 'application/json'},
                                        body: JSON.stringify({product_id: productId, quantity: 1})
                                    }).then(res => res.json()).then(data => {
                                        if(data.success) {
                                            alert('পণ্যটি কার্টে যোগ করা হয়েছে!');
                                            location.reload();
                                        }
                                    });
                                ` : `window.location.href = '/login';`}
                            }
                            
                            function toggleWishlist(productId) {
                                fetch('/api/wishlist/toggle', {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({product_id: productId})
                                }).then(res => res.json()).then(data => {
                                    if(data.success) {
                                        location.reload();
                                    }
                                });
                            }
                        </script>
                    </body>
                    </html>
                    `;
                    res.send(template);
                }
            });
        });
    });
});

// User Authentication Routes (unchanged from your original code)
app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        res.send(`
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>লগইন - Amazon-Style</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body {
                    background: #f3f3f3;
                    font-family: 'Hind Siliguri', sans-serif;
                }
                .login-container {
                    max-width: 400px;
                    margin: 100px auto;
                    padding: 30px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                }
                .login-logo {
                    color: #FF9900;
                    font-size: 2rem;
                    font-weight: bold;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <div class="login-logo text-center">
                    <i class="fab fa-amazon"></i> Amazon-Style
                </div>
                <h3 class="text-center mb-4">লগইন করুন</h3>
                <form action="/login" method="POST">
                    <div class="mb-3">
                        <label>ইমেইল</label>
                        <input type="email" name="email" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label>পাসওয়ার্ড</label>
                        <input type="password" name="password" class="form-control" required>
                    </div>
                    <button type="submit" class="btn btn-warning w-100">লগইন</button>
                </form>
                <div class="text-center mt-3">
                    <a href="/register">নতুন অ্যাকাউন্ট তৈরি করুন</a>
                </div>
            </div>
        </body>
        </html>
        `);
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = user;
            res.redirect('/');
        } else {
            res.send('<script>alert("ভুল ইমেইল বা পাসওয়ার্ড"); window.location="/login";</script>');
        }
    });
});

app.get('/register', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>রেজিস্টার - Amazon-Style</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body {
                background: #f3f3f3;
                font-family: 'Hind Siliguri', sans-serif;
            }
            .register-container {
                max-width: 500px;
                margin: 50px auto;
                padding: 30px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            }
            .register-logo {
                color: #FF9900;
                font-size: 2rem;
                font-weight: bold;
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="register-container">
            <div class="register-logo text-center">
                <i class="fab fa-amazon"></i> Amazon-Style
            </div>
            <h3 class="text-center mb-4">নতুন অ্যাকাউন্ট তৈরি করুন</h3>
            <form action="/register" method="POST">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label>নাম</label>
                        <input type="text" name="name" class="form-control" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>ইমেইল</label>
                        <input type="email" name="email" class="form-control" required>
                    </div>
                </div>
                <div class="mb-3">
                    <label>মোবাইল নম্বর</label>
                    <input type="tel" name="phone" class="form-control" required>
                    </div>
                <div class="mb-3">
                    <label>ঠিকানা</label>
                    <textarea name="address" class="form-control" rows="3" required></textarea>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label>পাসওয়ার্ড</label>
                        <input type="password" name="password" class="form-control" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>পাসওয়ার্ড নিশ্চিত করুন</label>
                        <input type="password" name="confirm_password" class="form-control" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-warning w-100">রেজিস্টার</button>
            </form>
            <div class="text-center mt-3">
                <a href="/login">ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন</a>
            </div>
        </div>
    </body>
    </html>
    `);
});

app.post('/register', (req, res) => {
    const { name, email, phone, address, password, confirm_password } = req.body;
    
    if (password !== confirm_password) {
        res.send('<script>alert("পাসওয়ার্ড মিলছে না"); window.location="/register";</script>');
        return;
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run("INSERT INTO users (name, email, phone, address, password) VALUES (?, ?, ?, ?, ?)", 
        [name, email, phone, address, hashedPassword], function(err) {
            if (err) {
                res.send('<script>alert("ইমেইল ইতিমধ্যে ব্যবহার করা হয়েছে"); window.location="/register";</script>');
            } else {
                res.send('<script>alert("রেজিস্ট্রেশন সফল! লগইন করুন"); window.location="/login";</script>');
            }
        });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Product Routes (unchanged from your original code)
app.get('/products', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;
    
    db.all(`SELECT p.*, c.name as category_name FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [limit, offset], (err, products) => {
        
        db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
            const totalPages = Math.ceil(row.count / limit);
            
            res.send(`
            <!DOCTYPE html>
            <html lang="bn">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>সব পণ্য - Amazon-Style</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    .product-card {
                        background: white;
                        border-radius: 5px;
                        padding: 15px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        transition: transform 0.3s;
                        height: 100%;
                    }
                    .product-card:hover {
                        transform: translateY(-5px);
                    }
                    .pagination .page-link {
                        color: #FF9900;
                    }
                    .pagination .page-item.active .page-link {
                        background: #FF9900;
                        border-color: #FF9900;
                    }
                </style>
            </head>
            <body>
                <div class="container mt-5">
                    <h1 class="mb-4">সব পণ্য</h1>
                    <div class="row">
                        ${products.map(product => {
                            const images = JSON.parse(product.images || '[]');
                            return `
                            <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                                <div class="product-card">
                                    <img src="${images[0] || '/uploads/default.jpg'}" class="img-fluid mb-3" style="height: 200px; object-fit: contain; width: 100%;">
                                    <h6>${product.name}</h6>
                                    <p class="text-danger fw-bold">${formatPrice(product.sale_price || product.price)}</p>
                                    <a href="/product/${product.slug}" class="btn btn-outline-warning btn-sm">বিস্তারিত</a>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <nav>
                        <ul class="pagination justify-content-center">
                            ${page > 1 ? `<li class="page-item"><a class="page-link" href="/products?page=${page-1}">পূর্ববর্তী</a></li>` : ''}
                            ${Array.from({length: totalPages}, (_, i) => i + 1).map(p => `
                                <li class="page-item ${p === page ? 'active' : ''}">
                                    <a class="page-link" href="/products?page=${p}">${p}</a>
                                </li>
                            `).join('')}
                            ${page < totalPages ? `<li class="page-item"><a class="page-link" href="/products?page=${page+1}">পরবর্তী</a></li>` : ''}
                        </ul>
                    </nav>
                </div>
            </body>
            </html>
            `);
        });
    });
});

app.get('/product/:slug', (req, res) => {
    const { slug } = req.params;
    
    db.get(`SELECT p.*, c.name as category_name FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.slug = ?`, [slug], (err, product) => {
        
        if (!product) {
            res.status(404).send('পণ্য পাওয়া যায়নি');
            return;
        }
        
        const images = JSON.parse(product.images || '[]');
        const features = JSON.parse(product.features || '[]');
        const specifications = JSON.parse(product.specifications || '{}');
        
        db.all(`SELECT r.*, u.name as user_name FROM reviews r 
                LEFT JOIN users u ON r.user_id = u.id 
                WHERE r.product_id = ? ORDER BY r.created_at DESC`, [product.id], (err, reviews) => {
            
            res.send(`
            <!DOCTYPE html>
            <html lang="bn">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${product.name} - Amazon-Style</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-5">
                    <div class="row">
                        <div class="col-md-6">
                            <div id="productCarousel" class="carousel slide">
                                <div class="carousel-inner">
                                    ${images.map((img, i) => `
                                    <div class="carousel-item ${i === 0 ? 'active' : ''}">
                                        <img src="${img}" class="d-block w-100" style="max-height: 500px; object-fit: contain;">
                                    </div>
                                    `).join('')}
                                </div>
                                <button class="carousel-control-prev" type="button" data-bs-target="#productCarousel" data-bs-slide="prev">
                                    <span class="carousel-control-prev-icon"></span>
                                </button>
                                <button class="carousel-control-next" type="button" data-bs-target="#productCarousel" data-bs-slide="next">
                                    <span class="carousel-control-next-icon"></span>
                                </button>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h2>${product.name}</h2>
                            <div class="rating mb-3">
                                ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5-Math.floor(product.rating))}
                                <span class="text-muted">(${product.total_reviews} রিভিউ)</span>
                            </div>
                            <div class="mb-3">
                                <span class="text-danger fs-3 fw-bold">${formatPrice(product.sale_price || product.price)}</span>
                                ${product.sale_price ? `<span class="text-decoration-line-through ms-2">${formatPrice(product.price)}</span>` : ''}
                            </div>
                            <div class="mb-3">
                                <strong>স্টক:</strong> ${product.stock > 0 ? `<span class="text-success">ইন স্টক (${product.stock})</span>` : '<span class="text-danger">স্টক আউট</span>'}
                            </div>
                            <div class="mb-3">
                                <strong>ব্র্যান্ড:</strong> ${product.brand}
                            </div>
                            <div class="mb-4">
                                <button class="btn btn-warning btn-lg me-2" onclick="addToCart(${product.id})">
                                    <i class="fas fa-cart-plus"></i> কার্টে যোগ করুন
                                </button>
                                <button class="btn btn-outline-warning btn-lg">
                                    <i class="far fa-heart"></i> উইশলিস্ট
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mt-5">
                        <div class="col-md-8">
                            <h4>বিবরণ</h4>
                            <p>${product.description || 'কোন বিবরণ নেই'}</p>
                            
                            <h4 class="mt-4">বৈশিষ্ট্য</h4>
                            <ul>
                                ${features.map(f => `<li>${f}</li>`).join('')}
                            </ul>
                            
                            <h4 class="mt-4">স্পেসিফিকেশন</h4>
                            <table class="table">
                                ${Object.entries(specifications).map(([key, value]) => `
                                    <tr>
                                        <td><strong>${key}</strong></td>
                                        <td>${value}</td>
                                    </tr>
                                `).join('')}
                            </table>
                            
                            <h4 class="mt-4">রিভিউ (${reviews.length})</h4>
                            ${reviews.map(review => `
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <div class="rating">
                                            ${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}
                                        </div>
                                        <h6>${review.user_name}</h6>
                                        <p>${review.comment || 'কোন মন্তব্য নেই'}</p>
                                        <small class="text-muted">${new Date(review.created_at).toLocaleDateString('bn-BD')}</small>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <script>
                    function addToCart(productId) {
                        fetch('/api/cart/add', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({product_id: productId, quantity: 1})
                        }).then(res => res.json()).then(data => {
                            if(data.success) {
                                alert('পণ্যটি কার্টে যোগ করা হয়েছে!');
                            }
                        });
                    }
                </script>
            </body>
            </html>
            `);
        });
    });
});

// Cart Routes (unchanged from your original code)
app.get('/cart', isAuthenticated, (req, res) => {
    db.all(`SELECT c.*, p.name, p.price, p.sale_price, p.images, p.stock 
            FROM cart c 
            JOIN products p ON c.product_id = p.id 
            WHERE c.user_id = ?`, [req.session.user.id], (err, cartItems) => {
        
        const total = cartItems.reduce((sum, item) => {
            const price = item.sale_price || item.price;
            return sum + (price * item.quantity);
        }, 0);
        
        res.send(`
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>কার্ট - Amazon-Style</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-5">
                <h1 class="mb-4">আপনার কার্ট</h1>
                
                ${cartItems.length === 0 ? `
                    <div class="text-center py-5">
                        <i class="fas fa-shopping-cart fa-5x text-muted mb-3"></i>
                        <h3>আপনার কার্ট খালি</h3>
                        <p class="mb-4">কার্টে পণ্য যোগ করতে 'কার্টে যোগ করুন' বাটনে ক্লিক করুন</p>
                        <a href="/" class="btn btn-warning">শপিংয়ে ফিরে যান</a>
                    </div>
                ` : `
                    <div class="row">
                        <div class="col-md-8">
                            ${cartItems.map(item => {
                                const images = JSON.parse(item.images || '[]');
                                const price = item.sale_price || item.price;
                                return `
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col-md-3">
                                                <img src="${images[0] || '/uploads/default.jpg'}" class="img-fluid" style="height: 100px; object-fit: contain;">
                                            </div>
                                            <div class="col-md-6">
                                                <h5>${item.name}</h5>
                                                <p class="text-danger fw-bold">${formatPrice(price)}</p>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="input-group">
                                                    <button class="btn btn-outline-secondary" onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                                                    <input type="text" class="form-control text-center" value="${item.quantity}" readonly>
                                                    <button class="btn btn-outline-secondary" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                                                </div>
                                                <button class="btn btn-danger btn-sm mt-2" onclick="removeFromCart(${item.id})">
                                                    <i class="fas fa-trash"></i> মুছুন
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body">
                                    <h5>অর্ডার সামারি</h5>
                                    <div class="d-flex justify-content-between mb-2">
                                        <span>সাবটোটাল:</span>
                                        <span>${formatPrice(total)}</span>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2">
                                        <span>ডেলিভারি:</span>
                                        <span>৳${total > 5000 ? '০' : '১০০'}</span>
                                    </div>
                                    <hr>
                                    <div class="d-flex justify-content-between mb-3">
                                        <strong>মোট:</strong>
                                        <strong>${formatPrice(total + (total > 5000 ? 0 : 100))}</strong>
                                    </div>
                                    <a href="/checkout" class="btn btn-warning w-100">
                                        চেকআউট করুন
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                `}
            </div>
            
            <script>
                function updateQuantity(cartId, newQuantity) {
                    if(newQuantity < 1) return;
                    fetch('/api/cart/update', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({cart_id: cartId, quantity: newQuantity})
                    }).then(res => res.json()).then(data => {
                        if(data.success) {
                            location.reload();
                        }
                    });
                }
                
                function removeFromCart(cartId) {
                    if(confirm('আপনি কি এই পণ্যটি কার্ট থেকে মুছতে চান?')) {
                        fetch('/api/cart/remove', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({cart_id: cartId})
                        }).then(res => res.json()).then(data => {
                            if(data.success) {
                                location.reload();
                            }
                        });
                    }
                }
            </script>
        </body>
        </html>
        `);
    });
});

// API Routes (unchanged from your original code)
app.post('/api/cart/add', isAuthenticated, (req, res) => {
    const { product_id, quantity } = req.body;
    
    db.run("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET quantity = quantity + ?", 
        [req.session.user.id, product_id, quantity, quantity], function(err) {
            res.json({ success: !err });
        });
});

app.post('/api/cart/update', isAuthenticated, (req, res) => {
    const { cart_id, quantity } = req.body;
    
    db.run("UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?", 
        [quantity, cart_id, req.session.user.id], function(err) {
            res.json({ success: !err });
        });
});

app.post('/api/cart/remove', isAuthenticated, (req, res) => {
    const { cart_id } = req.body;
    
    db.run("DELETE FROM cart WHERE id = ? AND user_id = ?", 
        [cart_id, req.session.user.id], function(err) {
            res.json({ success: !err });
        });
});

// Checkout (unchanged from your original code)
app.get('/checkout', isAuthenticated, (req, res) => {
    db.all(`SELECT c.*, p.name, p.price, p.sale_price 
            FROM cart c 
            JOIN products p ON c.product_id = p.id 
            WHERE c.user_id = ?`, [req.session.user.id], (err, cartItems) => {
        
        const subtotal = cartItems.reduce((sum, item) => {
            const price = item.sale_price || item.price;
            return sum + (price * item.quantity);
        }, 0);
        
        const shipping = subtotal > 5000 ? 0 : 100;
        const total = subtotal + shipping;
        
        res.send(`
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>চেকআউট - Amazon-Style</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-5">
                <div class="row">
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-body">
                                <h4>ঠিকানা</h4>
                                <form id="checkoutForm">
                                    <div class="mb-3">
                                        <label>পূর্ণ নাম</label>
                                        <input type="text" class="form-control" name="name" value="${req.session.user.name}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label>মোবাইল নম্বর</label>
                                        <input type="tel" class="form-control" name="phone" value="${req.session.user.phone}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label>ঠিকানা</label>
                                        <textarea class="form-control" name="address" rows="3" required>${req.session.user.address}</textarea>
                                    </div>
                                    <div class="mb-3">
                                        <label>পেমেন্ট মেথড</label>
                                        <select class="form-select" name="payment_method" required>
                                            <option value="cash_on_delivery">ক্যাশ অন ডেলিভারি</option>
                                            <option value="bkash">bKash</option>
                                            <option value="nagad">Nagad</option>
                                        </select>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body">
                                <h4>অর্ডার সামারি</h4>
                                ${cartItems.map(item => {
                                    const price = item.sale_price || item.price;
                                    return `
                                    <div class="d-flex justify-content-between mb-2">
                                        <span>${item.name} x${item.quantity}</span>
                                        <span>${formatPrice(price * item.quantity)}</span>
                                    </div>
                                    `;
                                }).join('')}
                                <hr>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>সাবটোটাল</span>
                                    <span>${formatPrice(subtotal)}</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>ডেলিভারি</span>
                                    <span>৳${shipping}</span>
                                </div>
                                <div class="d-flex justify-content-between mb-3">
                                    <strong>মোট</strong>
                                    <strong>${formatPrice(total)}</strong>
                                </div>
                                <button class="btn btn-warning w-100" onclick="placeOrder()">
                                    অর্ডার কনফার্ম করুন
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                function placeOrder() {
                    const form = document.getElementById('checkoutForm');
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData);
                    
                    fetch('/api/order/create', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(data)
                    }).then(res => res.json()).then(data => {
                        if(data.success) {
                            alert('অর্ডার সফলভাবে করা হয়েছে!');
                            window.location.href = '/orders/' + data.order_id;
                        }
                    });
                }
            </script>
        </body>
        </html>
        `);
    });
});

app.post('/api/order/create', isAuthenticated, (req, res) => {
    const { name, phone, address, payment_method } = req.body;
    
    // Get cart items
    db.all(`SELECT c.*, p.name as product_name, p.price, p.sale_price 
            FROM cart c 
            JOIN products p ON c.product_id = p.id 
            WHERE c.user_id = ?`, [req.session.user.id], (err, cartItems) => {
        
        if (cartItems.length === 0) {
            res.json({ success: false, message: 'কার্ট খালি' });
            return;
        }
        
        const subtotal = cartItems.reduce((sum, item) => {
            const price = item.sale_price || item.price;
            return sum + (price * item.quantity);
        }, 0);
        
        const shipping = subtotal > 5000 ? 0 : 100;
        const total_amount = subtotal + shipping;
        
        const order_number = generateOrderNumber();
        
        db.run(`INSERT INTO orders (order_number, user_id, total_amount, shipping_address, payment_method) 
                VALUES (?, ?, ?, ?, ?)`, 
                [order_number, req.session.user.id, total_amount, address, payment_method], 
                function(err) {
                    if (err) {
                        res.json({ success: false, message: 'অর্ডার ব্যর্থ' });
                        return;
                    }
                    
                    const orderId = this.lastID;
                    
                    // Insert order items
                    const stmt = db.prepare(`INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total) 
                                             VALUES (?, ?, ?, ?, ?, ?)`);
                    
                    cartItems.forEach(item => {
                        const price = item.sale_price || item.price;
                        const total = price * item.quantity;
                        stmt.run([orderId, item.product_id, item.product_name, item.quantity, price, total]);
                        
                        // Update product stock
                        db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id]);
                    });
                    stmt.finalize();
                    
                    // Clear cart
                    db.run("DELETE FROM cart WHERE user_id = ?", [req.session.user.id]);
                    
                    res.json({ success: true, order_id: orderId });
                });
    });
});

// Orders page (unchanged from your original code)
app.get('/orders', isAuthenticated, (req, res) => {
    db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, 
        [req.session.user.id], (err, orders) => {
        
        res.send(`
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>আমার অর্ডার - Amazon-Style</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-5">
                <h1 class="mb-4">আমার অর্ডার</h1>
                
                ${orders.length === 0 ? `
                    <div class="text-center py-5">
                        <i class="fas fa-shopping-bag fa-5x text-muted mb-3"></i>
                        <h3>কোন অর্ডার নেই</h3>
                        <a href="/" class="btn btn-warning mt-3">শপিংয়ে ফিরে যান</a>
                    </div>
                ` : `
                    <div class="list-group">
                        ${orders.map(order => `
                            <div class="list-group-item">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h5>অর্ডার #${order.order_number}</h5>
                                        <p class="mb-1">তারিখ: ${new Date(order.created_at).toLocaleDateString('bn-BD')}</p>
                                        <p class="mb-1">মোট: ${formatPrice(order.total_amount)}</p>
                                    </div>
                                    <div>
                                        <span class="badge bg-${order.order_status === 'delivered' ? 'success' : order.order_status === 'shipped' ? 'info' : order.order_status === 'processing' ? 'primary' : 'warning'}">
                                            ${order.order_status}
                                        </span>
                                    </div>
                                </div>
                                <a href="/orders/${order.id}" class="btn btn-sm btn-outline-warning mt-2">বিস্তারিত দেখুন</a>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </body>
        </html>
        `);
    });
});

app.get('/orders/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    
    db.get(`SELECT * FROM orders WHERE id = ? AND user_id = ?`, [id, req.session.user.id], (err, order) => {
        if (!order) {
            res.status(404).send('অর্ডার পাওয়া যায়নি');
            return;
        }
        
        db.all(`SELECT * FROM order_items WHERE order_id = ?`, [id], (err, items) => {
            res.send(`
            <!DOCTYPE html>
            <html lang="bn">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>অর্ডার বিস্তারিত - Amazon-Style</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-5">
                    <h1 class="mb-4">অর্ডার #${order.order_number}</h1>
                    
                    <div class="row">
                        <div class="col-md-8">
                            <div class="card mb-4">
                                <div class="card-body">
                                    <h5>অর্ডার আইটেম</h5>
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>পণ্য</th>
                                                <th>পরিমাণ</th>
                                                <th>মূল্য</th>
                                                <th>মোট</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${items.map(item => `
                                                <tr>
                                                    <td>${item.product_name}</td>
                                                    <td>${item.quantity}</td>
                                                    <td>${formatPrice(item.price)}</td>
                                                    <td>${formatPrice(item.total)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body">
                                    <h5>অর্ডার তথ্য</h5>
                                    <p><strong>অর্ডার স্ট্যাটাস:</strong> 
                                        <span class="badge bg-${order.order_status === 'delivered' ? 'success' : order.order_status === 'shipped' ? 'info' : order.order_status === 'processing' ? 'primary' : 'warning'}">
                                            ${order.order_status}
                                        </span>
                                    </p>
                                    <p><strong>পেমেন্ট স্ট্যাটাস:</strong> ${order.payment_status}</p>
                                    <p><strong>পেমেন্ট মেথড:</strong> ${order.payment_method}</p>
                                    <p><strong>মোট মূল্য:</strong> ${formatPrice(order.total_amount)}</p>
                                    <p><strong>অর্ডার তারিখ:</strong> ${new Date(order.created_at).toLocaleString('bn-BD')}</p>
                                    <p><strong>শিপিং ঠিকানা:</strong> ${order.shipping_address}</p>
                                    ${order.tracking_number ? `<p><strong>ট্র্যাকিং নম্বর:</strong> ${order.tracking_number}</p>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            `);
        });
    });
});

// ============= C-STYLE ORDER MANAGEMENT API ROUTES =============

// C-style order monitoring API endpoint
app.get('/api/orders/monitor', (req, res) => {
    if (!req.session.user || req.session.user.email !== 'admin@email.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    runOrderMonitoring().then(incompleteOrders => {
        res.json({
            success: true,
            message: 'C-style order monitoring completed',
            timestamp: new Date().toISOString(),
            incomplete_orders: incompleteOrders.length,
            orders: incompleteOrders.map(o => o.order)
        });
    });
});

// Manual trigger for C-style order filter
app.post('/api/orders/filter-c-style', (req, res) => {
    if (!req.session.user || req.session.user.email !== 'admin@email.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { status_filter } = req.body;
    
    // Load orders from database
    db.all(`SELECT id, order_number, order_status, 
                   (SELECT name FROM users WHERE id = orders.user_id) as customer
            FROM orders 
            ${status_filter ? `WHERE order_status = ?` : ''}
            ORDER BY created_at DESC`, 
            status_filter ? [status_filter] : [], (err, rows) => {
        
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Convert to C-style Order objects
        const orders = rows.map(row => 
            new Order(row.id, row.customer || 'Unknown', row.order_status)
        );
        
        // Apply C-style filter
        const incompleteOrders = filterOrders(orders);
        
        res.json({
            success: true,
            total_orders_scanned: orders.length,
            incomplete_orders_found: incompleteOrders.length,
            incomplete_orders: incompleteOrders.map(o => ({
                id: o.order.id,
                order_number: rows.find(r => r.id === o.order.id)?.order_number,
                customer: o.order.customer,
                status: o.order.status,
                log_message: o.log
            })),
            scan_date: new Date().toISOString()
        });
    });
});

// Admin Routes with C-style order management
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.email !== 'admin@email.com') {
        res.redirect('/login');
        return;
    }
    
    // Get dashboard stats
    db.all(`SELECT 
            (SELECT COUNT(*) FROM orders) as total_orders,
            (SELECT SUM(total_amount) FROM orders WHERE DATE(created_at) = DATE('now')) as today_sales,
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM products WHERE stock < 10) as low_stock`, (err, stats) => {
        
        db.all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`, (err, recentOrders) => {
            
            // Run C-style monitoring and get incomplete orders count
            db.all(`SELECT COUNT(*) as incomplete_count 
                   FROM orders 
                   WHERE order_status IN ('pending', 'failed', 'processing')`, 
                   (err, incompleteResult) => {
                
                const incompleteCount = incompleteResult[0]?.incomplete_count || 0;
                
                res.send(`
                <!DOCTYPE html>
                <html lang="bn">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>এডমিন ড্যাশবোর্ড - Amazon-Style</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        .card-stat {
                            transition: transform 0.3s;
                        }
                        .card-stat:hover {
                            transform: translateY(-5px);
                        }
                        .incomplete-alert {
                            animation: blink 1.5s infinite;
                        }
                        @keyframes blink {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.5; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container-fluid">
                        <div class="row">
                            <nav class="col-md-2 d-md-block bg-dark sidebar min-vh-100">
                                <div class="position-sticky pt-3">
                                    <h5 class="text-white p-3">Admin Panel</h5>
                                    <ul class="nav flex-column">
                                        <li class="nav-item">
                                            <a class="nav-link text-white active" href="/admin">ড্যাশবোর্ড</a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link text-white" href="/admin/orders">অর্ডার</a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link text-white" href="/admin/orders/c-style">C-Style ফিল্টার</a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link text-white" href="/admin/products">পণ্য</a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link text-white" href="/admin/categories">ক্যাটেগরি</a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link text-white" href="/admin/users">ব্যবহারকারী</a>
                                        </li>
                                    </ul>
                                </div>
                            </nav>
                            
                            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                                    <h1 class="h2">ড্যাশবোর্ড</h1>
                                    <button class="btn btn-warning" onclick="runCStyleMonitor()">
                                        <i class="fas fa-filter"></i> C-Style ফিল্টার চালান
                                    </button>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-3 mb-3">
                                        <div class="card card-stat bg-primary text-white">
                                            <div class="card-body">
                                                <h5 class="card-title">মোট অর্ডার</h5>
                                                <h2>${stats[0].total_orders}</h2>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <div class="card card-stat bg-success text-white">
                                            <div class="card-body">
                                                <h5 class="card-title">আজকের বিক্রয়</h5>
                                                <h2>${formatPrice(stats[0].today_sales || 0)}</h2>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <div class="card card-stat bg-info text-white">
                                            <div class="card-body">
                                                <h5 class="card-title">ব্যবহারকারী</h5>
                                                <h2>${stats[0].total_users}</h2>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <div class="card card-stat ${incompleteCount > 0 ? 'incomplete-alert bg-warning' : 'bg-secondary'} text-white">
                                            <div class="card-body">
                                                <h5 class="card-title">ইনকমপ্লিট অর্ডার</h5>
                                                <h2>${incompleteCount}</h2>
                                                ${incompleteCount > 0 ? '<p class="mb-0"><small>C-style filter needed</small></p>' : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <h4 class="mb-3">সাম্প্রতিক অর্ডার</h4>
                                <div class="table-responsive">
                                    <table class="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>অর্ডার নং</th>
                                                <th>গ্রাহক</th>
                                                <th>মোট</th>
                                                <th>স্ট্যাটাস</th>
                                                <th>তারিখ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${recentOrders.map(order => `
                                                <tr>
                                                    <td>${order.order_number}</td>
                                                    <td>${order.user_id}</td>
                                                    <td>${formatPrice(order.total_amount)}</td>
                                                    <td>
                                                        <select class="form-select form-select-sm" onchange="updateOrderStatus(${order.id}, this.value)">
                                                            <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option>
                                                            <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>Processing</option>
                                                            <option value="shipped" ${order.order_status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                                            <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                                            <option value="failed" ${order.order_status === 'failed' ? 'selected' : ''}>Failed</option>
                                                        </select>
                                                    </td>
                                                    <td>${new Date(order.created_at).toLocaleDateString('bn-BD')}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </main>
                        </div>
                    </div>
                    
                    <script>
                        function updateOrderStatus(orderId, status) {
                            fetch('/api/admin/order/status', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({order_id: orderId, status: status})
                            }).then(res => res.json()).then(data => {
                                if(data.success) {
                                    alert('স্ট্যাটাস আপডেট করা হয়েছে');
                                    location.reload();
                                }
                            });
                        }
                        
                        function runCStyleMonitor() {
                            fetch('/api/orders/monitor')
                                .then(res => res.json())
                                .then(data => {
                                    if(data.success) {
                                        alert('C-Style ফিল্টারিং সম্পন্ন! ' + data.incomplete_orders + 'টি ইনকমপ্লিট অর্ডার পাওয়া গেছে।');
                                        location.reload();
                                    }
                                });
                        }
                    </script>
                </body>
                </html>
                `);
            });
        });
    });
});

// C-style order management page
app.get('/admin/orders/c-style', (req, res) => {
    if (!req.session.user || req.session.user.email !== 'admin@email.com') {
        res.redirect('/login');
        return;
    }
    
    res.send(`
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>C-Style Order Management - Admin Panel</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            .c-style-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 0;
                border-radius: 10px;
                margin-bottom: 30px;
            }
            .log-window {
                background: #1e1e1e;
                color: #00ff00;
                font-family: 'Courier New', monospace;
                padding: 15px;
                border-radius: 5px;
                height: 300px;
                overflow-y: auto;
                white-space: pre-wrap;
            }
            .order-item {
                border-left: 4px solid;
                margin-bottom: 10px;
            }
            .order-pending { border-left-color: #ffc107; }
            .order-failed { border-left-color: #dc3545; }
            .order-processing { border-left-color: #17a2b8; }
        </style>
    </head>
    <body>
        <div class="container-fluid">
            <div class="row">
                <nav class="col-md-2 d-md-block bg-dark sidebar min-vh-100">
                    <div class="position-sticky pt-3">
                        <h5 class="text-white p-3">Admin Panel</h5>
                        <ul class="nav flex-column">
                            <li class="nav-item">
                                <a class="nav-link text-white" href="/admin">ড্যাশবোর্ড</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link text-white" href="/admin/orders">অর্ডার</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link text-white active" href="/admin/orders/c-style">C-Style ফিল্টার</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link text-white" href="/admin/products">পণ্য</a>
                            </li>
                        </ul>
                    </div>
                </nav>
                
                <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                    <div class="c-style-header text-center">
                        <h1><i class="fas fa-cogs me-2"></i>C-Style Order Management System</h1>
                        <p class="lead">C programming style order filtering and monitoring</p>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h3><i class="fas fa-play-circle text-primary"></i></h3>
                                    <h5>রান ফিল্টার</h5>
                                    <p>C-style order filter চালান</p>
                                    <button class="btn btn-primary w-100" onclick="runFilter()">
                                        ফিল্টার চালান
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h3><i class="fas fa-file-alt text-success"></i></h3>
                                    <h5>লগ ফাইল</h5>
                                    <p>ইনকমপ্লিট অর্ডার লগ</p>
                                    <a href="/api/orders/logs" class="btn btn-success w-100" target="_blank">
                                        লগ দেখুন
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h3><i class="fas fa-cog text-warning"></i></h3>
                                    <h5>সেটিংস</h5>
                                    <p>ফিল্টার সেটিংস</p>
                                    <button class="btn btn-warning w-100" data-bs-toggle="modal" data-bs-target="#settingsModal">
                                        সেটিংস
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h5>ফিল্টার স্ট্যাটাস</h5>
                                </div>
                                <div class="card-body">
                                    <div id="filterStatus">
                                        <p class="text-muted">ফিল্টার চালাতে উপরের বাটনে ক্লিক করুন</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h5>C-Style লগ আউটপুট</h5>
                                </div>
                                <div class="card-body">
                                    <div class="log-window" id="logOutput">
=== Server Order Filter ===
Waiting for execution...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mt-4">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header">
                                    <h5>ইনকমপ্লিট অর্ডার লিস্ট</h5>
                                </div>
                                <div class="card-body">
                                    <div id="incompleteOrders">
                                        <p class="text-muted">ফিল্টার চালানোর পর এখানে ইনকমপ্লিট অর্ডার দেখা যাবে</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
        
        <!-- Settings Modal -->
        <div class="modal fade" id="settingsModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">C-Style ফিল্টার সেটিংস</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="settingsForm">
                            <div class="mb-3">
                                <label>ফিল্টার স্ট্যাটাস</label>
                                <select class="form-select" name="status_filter">
                                    <option value="">সব স্ট্যাটাস</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                    <option value="processing">Processing</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="auto_log" checked>
                                    <label class="form-check-label">অটোমেটিক লগিং</label>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">বন্ধ</button>
                        <button type="button" class="btn btn-primary" onclick="saveSettings()">সেভ করুন</button>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
        <script>
            function runFilter() {
                const form = document.getElementById('settingsForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                
                // Update status
                document.getElementById('filterStatus').innerHTML = 
                    '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> ফিল্টার চলছে...</div>';
                
                // Clear log
                document.getElementById('logOutput').textContent = '=== Server Order Filter ===\\n';
                
                fetch('/api/orders/filter-c-style', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                })
                .then(res => res.json())
                .then(data => {
                    if(data.success) {
                        // Update status
                        document.getElementById('filterStatus').innerHTML = \`
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle"></i> ফিল্টার সম্পন্ন!
                                <p class="mb-0">স্ক্যান করা অর্ডার: \${data.total_orders_scanned}</p>
                                <p class="mb-0">ইনকমপ্লিট অর্ডার: \${data.incomplete_orders_found}</p>
                                <p class="mb-0">তারিখ: \${new Date(data.scan_date).toLocaleString()}</p>
                            </div>
                        \`;
                        
                        // Update log
                        let logText = '=== Server Order Filter ===\\n';
                        logText += \`Total orders scanned: \${data.total_orders_scanned}\\n\`;
                        logText += \`Incomplete orders found: \${data.incomplete_orders_found}\\n\\n\`;
                        
                        data.incomplete_orders.forEach(order => {
                            logText += \`⚠️ Incomplete Order Found: ID=\${order.id}, Customer=\${order.customer}, Status=\${order.status}\\n\`;
                        });
                        
                        document.getElementById('logOutput').textContent = logText;
                        
                        // Update incomplete orders list
                        if(data.incomplete_orders.length > 0) {
                            let ordersHtml = '';
                            data.incomplete_orders.forEach(order => {
                                ordersHtml += \`
                                <div class="order-item order-\${order.status} p-3 mb-2 bg-light">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6>অর্ডার #\${order.order_number}</h6>
                                            <p class="mb-1">গ্রাহক: \${order.customer}</p>
                                            <p class="mb-1">স্ট্যাটাস: \${order.status}</p>
                                        </div>
                                        <div>
                                            <span class="badge bg-\${order.status === 'pending' ? 'warning' : order.status === 'failed' ? 'danger' : 'info'}">
                                                \${order.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                \`;
                            });
                            document.getElementById('incompleteOrders').innerHTML = ordersHtml;
                        } else {
                            document.getElementById('incompleteOrders').innerHTML = 
                                '<div class="alert alert-success">কোন ইনকমপ্লিট অর্ডার পাওয়া যায়নি!</div>';
                        }
                    }
                })
                .catch(error => {
                    document.getElementById('filterStatus').innerHTML = 
                        '<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> ত্রুটি: ' + error + '</div>';
                });
            }
            
            function saveSettings() {
                alert('সেটিংস সেভ করা হয়েছে!');
                const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
                modal.hide();
            }
        </script>
    </body>
    </html>
    `);
});

// API to get log files
app.get('/api/orders/logs', (req, res) => {
    if (!req.session.user || req.session.user.email !== 'admin@email.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        if (fs.existsSync('logs/incomplete_orders.log')) {
            const logContent = fs.readFileSync('logs/incomplete_orders.log', 'utf8');
            res.set('Content-Type', 'text/plain');
            res.send(logContent);
        } else {
            res.send('No log file found.');
        }
    } catch (error) {
        res.status(500).send('Error reading log file: ' + error.message);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Amazon-Style ই-কমার্স ওয়েবসাইট চলছে: http://localhost:${PORT}`);
    console.log(`এডমিন লগইন: admin@email.com / admin123`);
    console.log(`C-Style Order Management: http://localhost:${PORT}/admin/orders/c-style`);
    
    // Create logs directory if not exists
    if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs');
    }
    
    // Run initial C-style monitoring
    runOrderMonitoring().then(() => {
        console.log('Initial C-style order monitoring completed');
    });
});
