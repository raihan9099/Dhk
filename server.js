const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './'
    }),
    secret: 'dhaka-market-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/admin-login');
    }
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
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

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        price REAL NOT NULL,
        offer_price REAL,
        images TEXT,
        description TEXT,
        features TEXT,
        stock INTEGER DEFAULT 100,
        status TEXT DEFAULT 'active',
        views INTEGER DEFAULT 0,
        sales INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        shipping_area TEXT,
        quantity INTEGER DEFAULT 1,
        product_id INTEGER,
        product_name TEXT,
        unit_price REAL,
        total REAL,
        shipping_cost REAL DEFAULT 0,
        grand_total REAL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'cod',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'admin',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE,
        address TEXT,
        total_orders INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.get("SELECT COUNT(*) as count FROM admin_users", (err, row) => {
        if (row.count === 0) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run(`INSERT INTO admin_users (username, password, email, role) VALUES (?, ?, ?, ?)`, 
                ['admin', hashedPassword, 'mailraihanpremium@gmail.com', 'superadmin']);
        }
    });

    const defaultSettings = [
        ['site_name', 'Multy Cart Homeware'],
        ['site_email', 'mailraihanpremium@gmail.com'],
        ['site_phone', '01330513726'],
        ['site_address', 'Dhaka, Bangladesh'],
        ['whatsapp_number', '01330513726'],
        ['shipping_inside_dhaka', '80'],
        ['shipping_outside_dhaka', '150'],
        ['currency', 'BDT'],
        ['currency_symbol', '৳'],
        ['cod_enabled', 'true']
    ];

    defaultSettings.forEach(setting => {
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, setting);
    });

    const sampleProducts = [
        ['Professional Hair Trimmer', 'professional-hair-trimmer', 1999, 899,
         JSON.stringify(['/uploads/sample1.jpg']),
         'Premium cordless hair trimmer with 3 comb guards.',
         JSON.stringify(['Cordless', 'USB-C Charging', 'Waterproof']),
         50],
        
        ['Smart Watch X1', 'smart-watch-x1', 4500, 3499,
         JSON.stringify(['/uploads/sample2.jpg']),
         'Smart watch with heart rate monitor and GPS.',
         JSON.stringify(['Heart Rate Monitor', 'GPS', 'Waterproof']),
         30]
    ];

    sampleProducts.forEach(p => {
        db.run(`INSERT OR IGNORE INTO products (name, slug, price, offer_price, images, description, features, stock) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, p);
    });
});

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
    return 'MC' + timestamp.slice(-6) + random;
}

function generateSlug(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// MOBILE HOME PAGE
app.get('/mobile', (req, res) => {
    db.all("SELECT * FROM products WHERE status = 'active' ORDER BY sales DESC LIMIT 12", (err, products) => {
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multy Cart Homeware</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background: #f5f7fb; padding-bottom: 80px; }
        .mobile-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; display: flex; justify-content: space-around; padding: 10px 0; box-shadow: 0 -2px 20px rgba(0,0,0,0.1); z-index: 1000; }
        .mobile-nav-item { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #666; font-size: 12px; flex: 1; padding: 5px; }
        .mobile-nav-item.active { color: #ff6b6b; }
        .mobile-nav-icon { font-size: 20px; margin-bottom: 4px; }
        .mobile-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); color: white; padding: 15px; position: sticky; top: 0; z-index: 999; }
        .mobile-product-card { background: white; border-radius: 12px; overflow: hidden; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .mobile-product-img { width: 100%; height: 180px; object-fit: cover; }
        .mobile-product-info { padding: 12px; }
        .mobile-product-title { font-size: 14px; font-weight: 600; margin-bottom: 5px; height: 36px; overflow: hidden; }
        .mobile-product-price { font-size: 16px; font-weight: 700; color: #ff6b6b; }
        .mobile-old-price { font-size: 12px; color: #999; text-decoration: line-through; margin-right: 5px; }
        .whatsapp-float { position: fixed; bottom: 80px; right: 20px; width: 60px; height: 60px; background: #25D366; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; z-index: 999; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3); text-decoration: none; }
        .mobile-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 15px; }
        .mobile-hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; margin-bottom: 20px; border-radius: 0 0 20px 20px; }
        .mobile-btn { display: block; width: 100%; padding: 12px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; text-decoration: none; margin: 8px 0; transition: all 0.2s; }
        .mobile-btn-primary { background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%); color: white; }
    </style>
</head>
<body>
    <div class="mobile-header">
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <h1><i class="fas fa-store me-2"></i>Multy Cart</h1>
            </div>
            <div>
                <a href="/admin-login" class="text-white">
                    <i class="fas fa-user"></i>
                </a>
            </div>
        </div>
    </div>
    
    <div class="mobile-hero">
        <h2>Welcome to Multy Cart</h2>
        <p>Best Homeware Shopping in Bangladesh</p>
        <a href="#products" class="mobile-btn mobile-btn-primary">
            <i class="fas fa-shopping-cart me-2"></i>Shop Now
        </a>
    </div>
    
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
                        <img src="${images[0] || '/uploads/default.jpg'}" 
                             class="mobile-product-img"
                             alt="${product.name}"
                             onerror="this.src='/uploads/default.jpg'">
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
    
    <nav class="mobile-nav">
        <a href="/mobile" class="mobile-nav-item active">
            <i class="fas fa-home mobile-nav-icon"></i>
            <span>Home</span>
        </a>
        <a href="/mobile/products" class="mobile-nav-item">
            <i class="fas fa-store mobile-nav-icon"></i>
            <span>Products</span>
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
    
    <a href="https://wa.me/8801330513726" target="_blank" class="whatsapp-float">
        <i class="fab fa-whatsapp"></i>
    </a>
</body>
</html>`;
        res.send(html);
    });
});

// MOBILE PRODUCTS PAGE
app.get('/mobile/products', (req, res) => {
    const { search } = req.query;
    let query = `SELECT * FROM products WHERE status = 'active'`;
    let params = [];
    
    if (search) {
        query += ` AND (name LIKE ? OR description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    db.all(query, params, (err, products) => {
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background: #f5f7fb; padding-bottom: 80px; }
        .mobile-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); color: white; padding: 15px; position: sticky; top: 0; z-index: 999; }
        .mobile-search-bar { padding: 15px; background: white; position: sticky; top: 70px; z-index: 998; }
        .mobile-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 15px; }
        .mobile-product-card { background: white; border-radius: 12px; overflow: hidden; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .mobile-product-img { width: 100%; height: 180px; object-fit: cover; }
        .mobile-product-info { padding: 12px; }
        .mobile-product-title { font-size: 14px; font-weight: 600; margin-bottom: 5px; height: 36px; overflow: hidden; }
        .mobile-product-price { font-size: 16px; font-weight: 700; color: #ff6b6b; }
        .mobile-old-price { font-size: 12px; color: #999; text-decoration: line-through; margin-right: 5px; }
        .mobile-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; display: flex; justify-content: space-around; padding: 10px 0; box-shadow: 0 -2px 20px rgba(0,0,0,0.1); z-index: 1000; }
        .mobile-nav-item { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #666; font-size: 12px; flex: 1; padding: 5px; }
        .mobile-nav-item.active { color: #ff6b6b; }
        .mobile-nav-icon { font-size: 20px; margin-bottom: 4px; }
        .no-products { text-align: center; padding: 40px 20px; color: #666; }
    </style>
</head>
<body>
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
        </div>
    </div>
    
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
    
    <div class="mobile-grid">
        ${products.length === 0 ? `
            <div class="no-products">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5>No products found</h5>
                <p>Try a different search term</p>
                <a href="/mobile/products" class="btn btn-primary">View All Products</a>
            </div>
        ` : `
            ${products.map(product => {
                const images = JSON.parse(product.images || '[]');
                const discount = product.offer_price ? 
                    Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
                
                return `
                <div class="mobile-product-card">
                    <a href="/mobile/product/${product.slug}" class="text-decoration-none">
                        <img src="${images[0] || '/uploads/default.jpg'}" 
                             class="mobile-product-img"
                             alt="${product.name}"
                             onerror="this.src='/uploads/default.jpg'">
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
                    </a>
                </div>`;
            }).join('')}
        `}
    </div>
    
    <nav class="mobile-nav">
        <a href="/mobile" class="mobile-nav-item">
            <i class="fas fa-home mobile-nav-icon"></i>
            <span>Home</span>
        </a>
        <a href="/mobile/products" class="mobile-nav-item active">
            <i class="fas fa-store mobile-nav-icon"></i>
            <span>Products</span>
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

// MOBILE PRODUCT DETAIL PAGE
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${product.name} - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background: #f5f7fb; padding-bottom: 80px; }
        .mobile-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); color: white; padding: 15px; position: sticky; top: 0; z-index: 999; }
        .product-main-image { width: 100%; height: 300px; object-fit: contain; background: white; }
        .product-thumbnails { display: flex; overflow-x: auto; padding: 10px; background: white; gap: 10px; }
        .product-thumbnail { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 2px solid transparent; cursor: pointer; }
        .product-thumbnail.active { border-color: #ff6b6b; }
        .product-details { padding: 20px; background: white; margin-top: 10px; }
        .product-title { font-size: 18px; font-weight: 700; margin-bottom: 10px; color: #333; }
        .product-price { font-size: 22px; font-weight: 700; color: #ff6b6b; margin-bottom: 15px; }
        .product-old-price { font-size: 16px; color: #999; text-decoration: line-through; margin-right: 10px; }
        .product-discount { background: #ff6b6b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 14px; font-weight: 600; }
        .product-features { margin: 20px 0; }
        .feature-item { display: flex; align-items: center; margin-bottom: 8px; }
        .feature-item i { color: #28a745; margin-right: 10px; font-size: 14px; }
        .order-form-section { background: white; margin-top: 10px; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; font-size: 14px; }
        .form-control { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
        .form-control:focus { border-color: #ff6b6b; outline: none; }
        .quantity-selector { display: flex; align-items: center; justify-content: center; gap: 15px; margin: 20px 0; }
        .quantity-btn { width: 40px; height: 40px; border-radius: 50%; background: #ff6b6b; color: white; border: none; font-size: 20px; display: flex; align-items: center; justify-content: center; }
        .quantity-input { width: 60px; text-align: center; font-size: 18px; font-weight: bold; border: 2px solid #ddd; border-radius: 8px; padding: 5px; }
        .order-summary { background: #f8f9fa; border-radius: 12px; padding: 15px; margin: 20px 0; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .summary-total { font-size: 18px; font-weight: 700; color: #ff6b6b; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; }
        .order-btn { display: block; width: 100%; padding: 15px; background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; margin-top: 20px; text-decoration: none; }
        .order-btn:disabled { background: #ccc; cursor: not-allowed; }
        .mobile-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; display: flex; justify-content: space-around; padding: 10px 0; box-shadow: 0 -2px 20px rgba(0,0,0,0.1); z-index: 1000; }
        .mobile-nav-item { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #666; font-size: 12px; flex: 1; padding: 5px; }
        .mobile-nav-item.active { color: #ff6b6b; }
        .mobile-nav-icon { font-size: 20px; margin-bottom: 4px; }
        .stock-badge { padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .in-stock { background: #d4edda; color: #155724; }
        .out-of-stock { background: #f8d7da; color: #721c24; }
        .whatsapp-btn { display: block; width: 100%; padding: 15px; background: #25D366; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; margin-top: 10px; text-decoration: none; }
    </style>
</head>
<body>
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
    
    <div style="background: white;">
        <img id="mainImage" 
             src="${images[0] || '/uploads/default.jpg'}" 
             class="product-main-image"
             alt="${product.name}"
             onerror="this.src='/uploads/default.jpg'">
        
        ${images.length > 1 ? `
        <div class="product-thumbnails">
            ${images.map((img, index) => `
                <img src="${img}" 
                     class="product-thumbnail ${index === 0 ? 'active' : ''}" 
                     alt="Thumbnail ${index + 1}"
                     onclick="changeImage('${img}', this)"
                     onerror="this.src='/uploads/default.jpg'">
            `).join('')}
        </div>
        ` : ''}
    </div>
    
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
                       placeholder="01330513726" 
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
        
        <a href="https://wa.me/8801330513726" class="whatsapp-btn" target="_blank">
            <i class="fab fa-whatsapp"></i> Order via WhatsApp
        </a>
    </div>
    
    <nav class="mobile-nav">
        <a href="/mobile" class="mobile-nav-item">
            <i class="fas fa-home mobile-nav-icon"></i>
            <span>Home</span>
        </a>
        <a href="/mobile/products" class="mobile-nav-item">
            <i class="fas fa-store mobile-nav-icon"></i>
            <span>Products</span>
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
            
            document.getElementById('productPriceDisplay').textContent = '৳' + productPrice.toLocaleString('en-IN');
            document.getElementById('shippingDisplay').textContent = '৳' + shippingCost.toLocaleString('en-IN');
            document.getElementById('totalDisplay').textContent = '৳' + total.toLocaleString('en-IN');
            document.getElementById('shippingCostInput').value = shippingCost;
        }
        
        calculateTotal();
        
        const phoneInput = document.querySelector('input[name="phone"]');
        phoneInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^\d]/g, '');
            if (this.value.length > 11) {
                this.value = this.value.slice(0, 11);
            }
        });
        
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

// MOBILE CHECKOUT
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
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
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
                    
                    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmed - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #f5f7fb; padding: 20px; }
        .success-card { background: white; border-radius: 16px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; margin-top: 50px; }
        .success-icon { font-size: 60px; color: #28a745; margin-bottom: 20px; }
        .order-id { background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 20px 0; font-family: monospace; font-size: 18px; font-weight: bold; }
        .order-details { text-align: left; margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .action-btn { display: block; width: 100%; padding: 15px; border-radius: 10px; font-size: 16px; font-weight: 600; text-align: center; text-decoration: none; margin-bottom: 10px; border: none; }
        .btn-primary { background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%); color: white; }
        .btn-success { background: #25D366; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .whatsapp-float { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background: #25D366; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; z-index: 999; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3); text-decoration: none; }
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
            
            <a href="https://wa.me/8801330513726?text=Order%20Confirmed%0AOrder%20ID:%20${orderId}%0AName:%20${customer_name}%0AProduct:%20${product_name}%0AQuantity:%20${quantity}%0ATotal:%20${formatPrice(total)}" 
               target="_blank" class="action-btn btn-success">
                <i class="fab fa-whatsapp"></i> Message on WhatsApp
            </a>
            
            <a href="/mobile/track?order_id=${orderId}" class="action-btn btn-secondary">
                <i class="fas fa-search"></i> Track Order
            </a>
        </div>
    </div>
    
    <a href="https://wa.me/8801330513726" target="_blank" class="whatsapp-float">
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

// MOBILE TRACK ORDER
app.get('/mobile/track', (req, res) => {
    const orderId = req.query.order_id;
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Track Order - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #f5f7fb; padding: 20px; }
        .track-card { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-top: 20px; }
        .track-input { height: 50px; font-size: 16px; border-radius: 10px; padding: 15px; }
        .track-btn { height: 50px; border-radius: 10px; font-size: 16px; font-weight: 600; }
        .order-status { margin: 30px 0; }
        .status-step { display: flex; align-items: center; margin-bottom: 25px; position: relative; }
        .status-step:before { content: ''; position: absolute; left: 19px; top: 40px; bottom: -25px; width: 2px; background: #ddd; z-index: 1; }
        .status-step:last-child:before { display: none; }
        .status-step.completed:before { background: #28a745; }
        .status-icon { width: 40px; height: 40px; border-radius: 50%; background: #ddd; display: flex; align-items: center; justify-content: center; margin-right: 15px; position: relative; z-index: 2; }
        .status-step.completed .status-icon { background: #28a745; color: white; }
        .status-step.active .status-icon { background: #007bff; color: white; }
        .status-info h6 { margin: 0; font-weight: 600; }
        .status-info p { margin: 0; color: #666; font-size: 14px; }
        .order-details { background: #f8f9fa; border-radius: 12px; padding: 20px; margin-top: 20px; }
        .detail-item { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
        .detail-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    </style>
</head>
<body>
    <div class="container">
        <h3 class="text-center mb-4">Track Your Order</h3>
        
        <div class="track-card">
            <form action="/mobile/track" method="GET" class="mb-4">
                <div class="input-group">
                    <input type="text" name="order_id" class="form-control track-input" 
                           placeholder="Enter Order ID (e.g., MC123456)" 
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
                        <a href="tel:01330513726" class="btn btn-outline-primary w-100">
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

// MOBILE CONTACT PAGE
app.get('/mobile/contact', (req, res) => {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Us - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #f5f7fb; padding-bottom: 80px; }
        .mobile-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); color: white; padding: 15px; position: sticky; top: 0; z-index: 999; }
        .contact-section { padding: 20px; }
        .contact-card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; }
        .contact-icon { font-size: 35px; color: #ff6b6b; margin-bottom: 15px; }
        .contact-btn { display: block; width: 100%; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 10px; text-align: center; }
        .btn-call { background: #28a745; color: white; }
        .btn-whatsapp { background: #25D366; color: white; }
        .btn-email { background: #007bff; color: white; }
        .mobile-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; display: flex; justify-content: space-around; padding: 10px 0; box-shadow: 0 -2px 20px rgba(0,0,0,0.1); z-index: 1000; }
        .mobile-nav-item { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #666; font-size: 12px; flex: 1; padding: 5px; }
        .mobile-nav-item.active { color: #ff6b6b; }
        .mobile-nav-icon { font-size: 20px; margin-bottom: 4px; }
        .office-hours { background: #f8f9fa; border-radius: 8px; padding: 15px; margin-top: 10px; font-size: 14px; }
        .office-hours li { margin-bottom: 5px; }
    </style>
</head>
<body>
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
    
    <div class="contact-section">
        <div class="contact-card">
            <div class="contact-icon">
                <i class="fas fa-phone-alt"></i>
            </div>
            <h5>Call Us</h5>
            <p>01330-513726</p>
            <p>01330-513726</p>
            <a href="tel:01330513726" class="contact-btn btn-call">
                <i class="fas fa-phone"></i> Call Now
            </a>
        </div>
        
        <div class="contact-card">
            <div class="contact-icon">
                <i class="fab fa-whatsapp"></i>
            </div>
            <h5>WhatsApp</h5>
            <p>01330-513726</p>
            <p>24/7 Customer Support</p>
            <a href="https://wa.me/8801330513726" target="_blank" class="contact-btn btn-whatsapp">
                <i class="fab fa-whatsapp"></i> Message on WhatsApp
            </a>
        </div>
        
        <div class="contact-card">
            <div class="contact-icon">
                <i class="fas fa-envelope"></i>
            </div>
            <h5>Email Us</h5>
            <p>mailraihanpremium@gmail.com</p>
            <p>support@multycart.com</p>
            <a href="mailto:mailraihanpremium@gmail.com" class="contact-btn btn-email">
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
            <p><i class="fas fa-map-marker-alt text-danger"></i> Dhaka, Bangladesh</p>
            <p class="text-muted">Visit our office for any inquiries</p>
        </div>
    </div>
    
    <nav class="mobile-nav">
        <a href="/mobile" class="mobile-nav-item">
            <i class="fas fa-home mobile-nav-icon"></i>
            <span>Home</span>
        </a>
        <a href="/mobile/products" class="mobile-nav-item">
            <i class="fas fa-store mobile-nav-icon"></i>
            <span>Products</span>
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

// ADMIN LOGIN PAGE
app.get('/admin-login', (req, res) => {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .login-container { width: 100%; max-width: 400px; }
        .login-card { background: white; border-radius: 15px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .login-header { text-align: center; margin-bottom: 30px; }
        .login-header h3 { color: #333; font-weight: 600; margin-bottom: 5px; }
        .login-header p { color: #666; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        .form-control { height: 50px; border-radius: 8px; border: 1px solid #ddd; padding: 10px 15px; font-size: 16px; }
        .form-control:focus { border-color: #667eea; box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25); }
        .btn-login { width: 100%; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 16px; cursor: pointer; transition: all 0.3s; }
        .btn-login:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3); }
        .btn-login:active { transform: translateY(0); }
        .alert { border-radius: 8px; padding: 12px 15px; margin-bottom: 20px; }
        .login-footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        .back-to-home { text-align: center; margin-top: 15px; }
        .logo { text-align: center; margin-bottom: 20px; }
        .logo h2 { color: white; font-weight: 700; }
        .logo-icon { background: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: #667eea; font-size: 24px; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <div class="logo-icon">
                <i class="fas fa-store"></i>
            </div>
            <h2>Multy Cart</h2>
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
                <a href="/mobile" class="text-decoration-none">
                    <i class="fas fa-arrow-left me-2"></i>Back to Home
                </a>
            </div>
        </div>
    </div>
    
    <script>
        setTimeout(() => {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(alert => {
                alert.style.display = 'none';
            });
        }, 5000);
        
        document.querySelector('input[name="username"]').focus();
    </script>
</body>
</html>`;
    
    delete req.session.loginError;
    delete req.session.loginMessage;
    delete req.session.loginUsername;
    
    res.send(html);
});

// ADMIN LOGIN POST
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    req.session.loginUsername = username;
    
    if (!username || !password) {
        req.session.loginError = 'Username and password are required';
        return res.redirect('/admin-login');
    }
    
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
        
        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
            req.session.loginError = 'Invalid username or password';
            return res.redirect('/admin-login');
        }
        
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };
        
        db.run("UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
        
        delete req.session.loginUsername;
        delete req.session.loginError;
        
        req.session.loginMessage = `Welcome back, ${user.username}!`;
        
        res.redirect('/admin/dashboard');
    });
});

// ADMIN LOGOUT
app.get('/admin-logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/admin-login');
    });
});

// ADMIN DASHBOARD
app.get('/admin/dashboard', requireAuth, (req, res) => {
    db.serialize(() => {
        db.get("SELECT COUNT(*) as total FROM products", (err, productRow) => {
            db.get("SELECT COUNT(*) as total FROM orders", (err, orderRow) => {
                db.get("SELECT COUNT(*) as total FROM customers", (err, customerRow) => {
                    db.get("SELECT SUM(grand_total) as revenue FROM orders WHERE status = 'delivered'", (err, revenueRow) => {
                        db.get("SELECT SUM(grand_total) as pending FROM orders WHERE status = 'pending' OR status = 'processing' OR status = 'shipped'", (err, pendingRow) => {
                            db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 10", (err, recentOrders) => {
                                let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --primary: #667eea; --secondary: #764ba2; --success: #10b981; --danger: #ef4444; --warning: #f59e0b; --info: #3b82f6; --light: #f8f9fa; --dark: #1f2937; }
        body { background-color: #f5f7fb; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .sidebar { background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 100%); color: white; height: 100vh; position: fixed; left: 0; top: 0; width: 250px; transition: all 0.3s; z-index: 1000; }
        .sidebar-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .sidebar-header h3 { font-weight: 700; margin: 0; font-size: 1.3rem; }
        .sidebar-menu { padding: 20px 0; }
        .sidebar-menu ul { list-style: none; padding: 0; margin: 0; }
        .sidebar-menu li { margin-bottom: 5px; }
        .sidebar-menu a { color: rgba(255,255,255,0.8); text-decoration: none; display: flex; align-items: center; padding: 12px 20px; transition: all 0.3s; font-size: 15px; }
        .sidebar-menu a:hover { color: white; background: rgba(255,255,255,0.1); border-left: 4px solid white; }
        .sidebar-menu a.active { color: white; background: rgba(255,255,255,0.15); border-left: 4px solid white; }
        .sidebar-menu i { width: 25px; font-size: 16px; margin-right: 10px; }
        .main-content { margin-left: 250px; padding: 20px; transition: all 0.3s; }
        .top-bar { background: white; padding: 15px 20px; border-radius: 10px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
        .welcome-text h2 { font-size: 1.5rem; margin: 0; color: var(--dark); }
        .welcome-text p { margin: 0; color: #666; font-size: 14px; }
        .user-menu .dropdown-toggle { border: none; background: none; color: var(--dark); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: transform 0.3s; }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-icon { width: 50px; height: 50px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 15px; }
        .icon-product { background: rgba(59, 130, 246, 0.1); color: var(--info); }
        .icon-order { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
        .icon-customer { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .icon-revenue { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
        .stat-info h3 { font-size: 28px; font-weight: 700; margin: 0 0 5px 0; color: var(--dark); }
        .stat-info p { color: #666; margin: 0; font-size: 14px; }
        .card { border: none; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 20px; }
        .card-header { background: white; border-bottom: 1px solid #eee; padding: 20px; border-radius: 10px 10px 0 0 !important; }
        .card-header h5 { margin: 0; font-weight: 600; color: var(--dark); }
        .table { margin: 0; }
        .table th { border-top: none; font-weight: 600; color: #666; font-size: 14px; padding: 15px; }
        .table td { padding: 15px; vertical-align: middle; }
        .badge { padding: 6px 12px; font-weight: 500; border-radius: 6px; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-processing { background: #dbeafe; color: #1e40af; }
        .badge-shipped { background: #f0f9ff; color: #0c4a6e; }
        .badge-delivered { background: #dcfce7; color: #166534; }
        .badge-cancelled { background: #fee2e2; color: #991b1b; }
        .status-select { border: none; background: none; padding: 0; font-weight: 500; cursor: pointer; }
        .action-btn { padding: 5px 10px; border-radius: 6px; border: none; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-edit { background: #dbeafe; color: #1e40af; }
        .btn-edit:hover { background: #bfdbfe; }
        @media (max-width: 768px) {
            .sidebar { width: 0; overflow: hidden; }
            .sidebar.active { width: 250px; }
            .main-content { margin-left: 0; }
            .top-bar { flex-direction: column; align-items: flex-start; gap: 15px; }
        }
    </style>
</head>
<body>
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h3><i class="fas fa-store me-2"></i>Multy Cart</h3>
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
    
    <div class="main-content">
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
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('active');
        }
        
        setTimeout(() => {
            window.location.reload();
        }, 60000);
        
        function checkNewOrders() {
            fetch('/admin/api/new-orders-count')
                .then(response => response.json())
                .then(data => {
                    if (data.count > 0) {
                        showNotification('New Orders', \`You have \${data.count} new order(s)\`);
                    }
                });
        }
        
        setInterval(checkNewOrders, 30000);
        
        function showNotification(title, message) {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body: message });
            }
        }
        
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

// ADMIN PRODUCTS PAGE
app.get('/admin/products', requireAuth, (req, res) => {
    const { search, status } = req.query;
    let query = `SELECT * FROM products WHERE 1=1`;
    let params = [];
    
    if (search) {
        query += ` AND (name LIKE ? OR description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    db.all(query, params, (err, products) => {
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products Management - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .table-actions { display: flex; gap: 5px; }
        .table-img { width: 50px; height: 50px; object-fit: cover; border-radius: 5px; }
        .status-active { background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
        .status-inactive { background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
        .search-form { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
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
            
            <div class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">Products Management</h1>
                    <a href="/admin/products/add" class="btn btn-primary">
                        <i class="fas fa-plus me-2"></i>Add New Product
                    </a>
                </div>
                
                <div class="search-form">
                    <form method="GET" class="row g-3">
                        <div class="col-md-8">
                            <input type="text" name="search" class="form-control" 
                                   placeholder="Search products..." value="${search || ''}">
                        </div>
                        <div class="col-md-3">
                            <select name="status" class="form-control">
                                <option value="">All Status</option>
                                <option value="active" ${status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        <div class="col-md-1">
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </form>
                </div>
                
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
                                        <th>Status</th>
                                        <th>Sales</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${products.map(product => {
                                        const images = JSON.parse(product.images || '[]');
                                        const mainImage = images[0] || '/uploads/default.jpg';
                                        
                                        return `
                                        <tr>
                                            <td>
                                                <img src="${mainImage}" 
                                                     class="table-img"
                                                     alt="${product.name}"
                                                     onerror="this.src='/uploads/default.jpg'">
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

// ADMIN ADD PRODUCT PAGE
app.get('/admin/products/add', requireAuth, (req, res) => {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Product - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .image-preview { width: 100px; height: 100px; object-fit: cover; border: 2px dashed #ddd; border-radius: 5px; display: none; }
        .feature-input-group { margin-bottom: 10px; }
        .image-upload-container { border: 2px dashed #ddd; border-radius: 10px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s; }
        .image-upload-container:hover { border-color: #667eea; background: #f8f9fa; }
        .image-preview-container { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }
        .preview-image { width: 100px; height: 100px; object-fit: cover; border-radius: 5px; position: relative; }
        .remove-image { position: absolute; top: -5px; right: -5px; background: #dc3545; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; }
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
                            
                            <div class="mb-3">
                                <label class="form-label">Description</label>
                                <textarea name="description" class="form-control" rows="4"></textarea>
                            </div>
                            
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
            
            for (let i = 0; i < input.files.length; i++) {
                if (i !== index) {
                    dt.items.add(input.files[i]);
                }
            }
            
            input.files = dt.files;
            previewImages(input);
        }
        
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

// ADMIN ADD PRODUCT POST
app.post('/admin/products/add', requireAuth, upload.array('images', 5), (req, res) => {
    const { 
        name, price, offer_price, description, 
        stock, status, features 
    } = req.body;
    
    const slug = generateSlug(name);
    const imageUrls = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];
    
    const featuresArray = Array.isArray(features) ? features : (features ? [features] : []);
    
    db.run(`INSERT INTO products 
            (name, slug, price, offer_price, images, description, features, stock, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name, slug, parseFloat(price), 
            offer_price ? parseFloat(offer_price) : null,
            JSON.stringify(imageUrls),
            description,
            JSON.stringify(featuresArray),
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

// ADMIN EDIT PRODUCT PAGE
app.get('/admin/products/edit/:id', requireAuth, (req, res) => {
    const productId = req.params.id;
    
    db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
        if (!product) {
            return res.redirect('/admin/products');
        }
        
        const images = JSON.parse(product.images || '[]');
        const features = JSON.parse(product.features || '[]');
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Product - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .image-preview-container { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }
        .preview-image { width: 100px; height: 100px; object-fit: cover; border-radius: 5px; position: relative; }
        .remove-image { position: absolute; top: -5px; right: -5px; background: #dc3545; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; }
        .feature-input-group { margin-bottom: 10px; }
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
                            
                            <div class="mb-3">
                                <label class="form-label">Description</label>
                                <textarea name="description" class="form-control" rows="4">${product.description || ''}</textarea>
                            </div>
                            
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
        
        function removeExistingImage(index) {
            const images = document.querySelectorAll('input[name="existing_images[]"]');
            if (images[index]) {
                images[index].remove();
                images[index].parentElement.remove();
            }
        }
        
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

// ADMIN EDIT PRODUCT POST
app.post('/admin/products/edit/:id', requireAuth, upload.array('new_images', 5), (req, res) => {
    const productId = req.params.id;
    const { 
        name, price, offer_price, description, 
        stock, status, features,
        existing_images = []
    } = req.body;
    
    const existingImages = Array.isArray(existing_images) ? existing_images : [existing_images];
    const newImages = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];
    const allImages = [...existingImages, ...newImages];
    
    const featuresArray = Array.isArray(features) ? features : (features ? [features] : []);
    
    db.run(`UPDATE products SET 
            name = ?, 
            price = ?, 
            offer_price = ?, 
            images = ?, 
            description = ?, 
            features = ?, 
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

// ADMIN DELETE PRODUCT
app.post('/admin/products/delete/:id', requireAuth, (req, res) => {
    const productId = req.params.id;
    
    db.run("DELETE FROM products WHERE id = ?", [productId], function(err) {
        if (err) {
            console.error('Product delete error:', err);
        }
        res.redirect('/admin/products');
    });
});

// ADMIN ORDERS PAGE
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
    <title>Orders Management - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .order-status-badge { padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-processing { background: #dbeafe; color: #1e40af; }
        .status-shipped { background: #f0f9ff; color: #0c4a6e; }
        .status-delivered { background: #dcfce7; color: #166534; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .search-form { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .stats-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); text-align: center; }
        .stat-value { font-size: 24px; font-weight: 700; color: #333; }
        .stat-label { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
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
            
            <div class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">Orders Management</h1>
                    <a href="/admin/orders/add" class="btn btn-primary">
                        <i class="fas fa-plus me-2"></i>Create Order
                    </a>
                </div>
                
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

// ADMIN VIEW ORDER DETAILS
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
    <title>Order Details - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
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
        
        <div class="card">
            <div class="card-body">
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h4>Order #${order.order_id}</h4>
                        <p class="mb-0">
                            <i class="fas fa-calendar me-2"></i>
                            ${new Date(order.created_at).toLocaleString()}
                        </p>
                    </div>
                    <div class="col-md-6 text-end">
                        <span class="badge ${order.status === 'pending' ? 'bg-warning' : order.status === 'delivered' ? 'bg-success' : 'bg-info'}">
                            ${order.status.toUpperCase()}
                        </span>
                        <div class="mt-2">
                            <strong>${formatPrice(order.grand_total)}</strong>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <h5>Customer Details</h5>
                        <p><strong>Name:</strong> ${order.customer_name}</p>
                        <p><strong>Phone:</strong> ${order.phone}</p>
                        <p><strong>Address:</strong> ${order.address}</p>
                    </div>
                    <div class="col-md-6">
                        <h5>Shipping Information</h5>
                        <p><strong>Area:</strong> ${order.shipping_area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}</p>
                        <p><strong>Cost:</strong> ${formatPrice(order.shipping_cost)}</p>
                        <p><strong>Method:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}</p>
                    </div>
                </div>
                
                <hr>
                
                <h5 class="mt-4">Product Details</h5>
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
                
                <div class="row mt-4">
                    <div class="col-md-6">
                        <h5>Order Summary</h5>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Subtotal:</span>
                            <span>${formatPrice(order.total)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Shipping:</span>
                            <span>${formatPrice(order.shipping_cost)}</span>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between">
                            <strong>Total:</strong>
                            <strong class="text-primary">${formatPrice(order.grand_total)}</strong>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h5>Update Status</h5>
                        <form action="/admin/orders/update-status" method="POST">
                            <input type="hidden" name="order_id" value="${orderId}">
                            <div class="mb-3">
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
</body>
</html>`;
        
        res.send(html);
    });
});

// ADMIN ORDER STATUS UPDATE
app.post('/admin/orders/update-status', requireAuth, (req, res) => {
    const { order_id, status } = req.body;
    
    db.run(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, 
        [status, order_id], (err) => {
        if (err) {
            console.error('Status update error:', err);
        }
        res.redirect('back');
    });
});

// ADMIN EDIT ORDER PAGE
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
    <title>Edit Order - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
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
                                <label class="form-label">Shipping Area</label>
                                <select name="shipping_area" class="form-control">
                                    <option value="inside_dhaka" ${order.shipping_area === 'inside_dhaka' ? 'selected' : ''}>Inside Dhaka</option>
                                    <option value="outside_dhaka" ${order.shipping_area === 'outside_dhaka' ? 'selected' : ''}>Outside Dhaka</option>
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
                                <label class="form-label">Payment Method</label>
                                <select name="payment_method" class="form-control">
                                    <option value="cod" ${order.payment_method === 'cod' ? 'selected' : ''}>Cash on Delivery</option>
                                    <option value="bkash" ${order.payment_method === 'bkash' ? 'selected' : ''}>bKash</option>
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

// ADMIN EDIT ORDER POST
app.post('/admin/orders/edit/:id', requireAuth, (req, res) => {
    const orderId = req.params.id;
    const {
        customer_name, phone, address,
        shipping_area, product_name, quantity, unit_price,
        shipping_cost, payment_method, status, notes
    } = req.body;
    
    const total = parseFloat(unit_price) * parseInt(quantity);
    const grandTotal = total + parseFloat(shipping_cost);
    
    db.run(`UPDATE orders SET 
            customer_name = ?, 
            phone = ?, 
            address = ?, 
            shipping_area = ?, 
            product_name = ?, 
            quantity = ?, 
            unit_price = ?, 
            total = ?, 
            shipping_cost = ?, 
            grand_total = ?, 
            payment_method = ?, 
            status = ?, 
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
        [
            customer_name,
            phone,
            address,
            shipping_area,
            product_name,
            parseInt(quantity),
            parseFloat(unit_price),
            total,
            parseFloat(shipping_cost),
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

// ADMIN DELETE ORDER
app.post('/admin/orders/delete/:id', requireAuth, (req, res) => {
    const orderId = req.params.id;
    
    db.run("DELETE FROM orders WHERE id = ?", [orderId], function(err) {
        if (err) {
            console.error('Order delete error:', err);
        }
        res.redirect('/admin/orders');
    });
});

// ADMIN CUSTOMERS PAGE
app.get('/admin/customers', requireAuth, (req, res) => {
    const { search } = req.query;
    let query = `SELECT * FROM customers WHERE 1=1`;
    let params = [];
    
    if (search) {
        query += ` AND (name LIKE ? OR phone LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    db.all(query, params, (err, customers) => {
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customers Management - Multy Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Customers Management</h2>
        </div>
        
        <div class="card mb-4">
            <div class="card-body">
                <form method="GET" class="row g-3">
                    <div class="col-md-10">
                        <input type="text" name="search" class="form-control" 
                               placeholder="Search customers by name or phone..." 
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

// MAIN HOME PAGE
app.get('/', (req, res) => {
    res.redirect('/mobile');
});

// API FOR NEW ORDERS COUNT
app.get('/admin/api/new-orders-count', requireAuth, (req, res) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    db.get(`SELECT COUNT(*) as count FROM orders WHERE created_at > ?`, 
        [fiveMinutesAgo], (err, result) => {
        if (err) {
            return res.json({ count: 0 });
        }
        res.json({ count: result.count });
    });
});

// START SERVER
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   Multy Cart Homeware Started Successfully!             ║
║                                                          ║
║   Local: http://localhost:${PORT}                       ║
║   Mobile: http://localhost:${PORT}/mobile               ║
║   Admin: http://localhost:${PORT}/admin-login           ║
║                                                          ║
║   Admin Credentials:                                     ║
║   Username: admin                                        ║
║   Password: admin123                                     ║
║                                                          ║
║   Contact Info:                                          ║
║   Phone: 01330-513726                                    ║
║   Email: mailraihanpremium@gmail.com                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
});
