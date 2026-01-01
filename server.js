const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    store: new SQLiteStore({ db: 'sessions.db', dir: './' }),
    secret: 'dhaka-market-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
    if (req.session && req.session.user) next();
    else res.redirect('/admin-login');
}

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

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
        category TEXT,
        stock INTEGER DEFAULT 100,
        status TEXT DEFAULT 'active',
        views INTEGER DEFAULT 0,
        sales INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        total REAL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'cod',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.get("SELECT COUNT(*) as count FROM admin_users", (err, row) => {
        if (row.count === 0) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run(`INSERT INTO admin_users (username, password, role) VALUES (?, ?, ?)`, 
                ['admin', hashedPassword, 'superadmin']);
        }
    });

    const categories = [
        ['Electronics', 'electronics', 'Mobile phones, laptops, gadgets'],
        ['Fashion', 'fashion', 'Clothing, shoes, accessories'],
        ['Home', 'home', 'Home and kitchen appliances'],
        ['Beauty', 'beauty', 'Cosmetics, skincare'],
        ['Sports', 'sports', 'Sports equipment']
    ];

    categories.forEach(cat => {
        db.run(`INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)`, cat);
    });

    const products = [
        ['Hair Trimmer Pro', 'hair-trimmer-pro', 1999, 899,
         JSON.stringify(['https://images.unsplash.com/photo-1598490960012-7f5d5a43d5b8?w=600&h=600']),
         'Premium cordless hair trimmer',
         JSON.stringify(['Cordless', 'Waterproof', '1 Year Warranty']),
         'beauty', 50],
        
        ['Smart Watch X1', 'smart-watch-x1', 4500, 3499,
         JSON.stringify(['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600']),
         'Smart watch with heart rate monitor',
         JSON.stringify(['Heart Rate', 'GPS', 'Waterproof']),
         'electronics', 30],
        
        ['Wireless Earbuds', 'wireless-earbuds', 3500, 2499,
         JSON.stringify(['https://images.unsplash.com/photo-1590658165737-15a047b8b5e8?w=600&h=600']),
         'Wireless earbuds with noise cancellation',
         JSON.stringify(['Noise Cancellation', '24h Battery']),
         'electronics', 40],
        
        ['T-Shirt Pack', 't-shirt-pack', 1200, 899,
         JSON.stringify(['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600']),
         'Pack of 3 cotton t-shirts',
         JSON.stringify(['100% Cotton', 'Pack of 3']),
         'fashion', 100],
        
        ['Electric Kettle', 'electric-kettle', 1800, 1299,
         JSON.stringify(['https://images.unsplash.com/photo-1579972383661-fbbf67b7d5d4?w=600&h=600']),
         '1.5L electric kettle',
         JSON.stringify(['1.5L Capacity', 'Auto Shut-off']),
         'home', 25],
        
        ['Samsung Phone', 'samsung-phone', 85000, 79999,
         JSON.stringify(['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600']),
         'Latest smartphone',
         JSON.stringify(['108MP Camera', '8GB RAM']),
         'electronics', 15],
        
        ['Nike Shoes', 'nike-shoes', 12000, 9999,
         JSON.stringify(['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600']),
         'Sports shoes',
         JSON.stringify(['Air Cushion', 'Premium Leather']),
         'sports', 40],
        
        ['Laptop Desk', 'laptop-desk', 2500, 1999,
         JSON.stringify(['https://images.unsplash.com/photo-1594736797933-d0ab81a6d8e6?w=600&h=600']),
         'Adjustable laptop desk',
         JSON.stringify(['Adjustable Height', 'Portable']),
         'home', 30]
    ];

    products.forEach(p => {
        db.run(`INSERT OR IGNORE INTO products (name, slug, price, offer_price, images, description, features, category, stock) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, p);
    });
});

function formatPrice(price) {
    return '৳' + parseFloat(price).toLocaleString('en-IN');
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
    return 'DM' + Date.now().toString().slice(-8);
}

// Mobile-friendly Homepage
app.get('/', (req, res) => {
    db.all("SELECT * FROM categories WHERE status = 'active' LIMIT 8", (err, categories) => {
        db.all("SELECT * FROM products WHERE status = 'active' ORDER BY sales DESC LIMIT 8", (err, products) => {
            let html = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ঢাকা মার্কেট - অনলাইন শপিং</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{font-family:'Segoe UI','Kalpurush',sans-serif;background:#f5f5f5;}
        
        /* Mobile Header */
        .mobile-header{background:linear-gradient(135deg,#ff6b6b,#ff4757);color:white;padding:15px;position:fixed;top:0;left:0;right:0;z-index:1000;box-shadow:0 2px 10px rgba(0,0,0,0.1);}
        .mobile-header h1{font-size:1.5rem;margin:0;font-weight:bold;}
        .mobile-header small{font-size:0.8rem;opacity:0.9;}
        
        /* Mobile Bottom Navigation */
        .mobile-nav{position:fixed;bottom:0;left:0;right:0;background:white;z-index:1000;box-shadow:0 -2px 10px rgba(0,0,0,0.1);padding:10px 0;}
        .mobile-nav-item{text-align:center;color:#666;text-decoration:none;flex:1;}
        .mobile-nav-item i{font-size:1.2rem;display:block;margin-bottom:5px;}
        .mobile-nav-item span{font-size:0.8rem;}
        .mobile-nav-item.active{color:#ff6b6b;}
        
        /* Main Content */
        .main-content{padding:70px 15px 80px;min-height:100vh;}
        
        /* Hero Section */
        .hero-section{background:linear-gradient(rgba(0,0,0,0.7),rgba(0,0,0,0.7)),url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop');background-size:cover;border-radius:15px;color:white;padding:30px 20px;margin-bottom:20px;text-align:center;}
        .hero-section h2{font-size:1.8rem;margin-bottom:10px;font-weight:bold;}
        
        /* Categories */
        .categories-scroll{display:flex;overflow-x:auto;gap:15px;padding:10px 5px;margin:15px 0;}
        .categories-scroll::-webkit-scrollbar{display:none;}
        .category-card{flex:0 0 auto;width:80px;text-align:center;}
        .category-icon{width:60px;height:60px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;box-shadow:0 3px 10px rgba(0,0,0,0.1);}
        .category-icon i{font-size:1.5rem;color:#ff6b6b;}
        .category-card span{font-size:0.8rem;color:#333;display:block;}
        
        /* Products Grid */
        .products-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px;margin:20px 0;}
        .product-card{background:white;border-radius:10px;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,0.08);}
        .product-image{width:100%;height:150px;object-fit:cover;}
        .product-info{padding:12px;}
        .product-name{font-size:0.9rem;font-weight:600;margin-bottom:8px;height:40px;overflow:hidden;line-height:1.3;}
        .product-price{display:flex;align-items:center;gap:5px;margin-bottom:10px;}
        .current-price{color:#ff6b6b;font-weight:bold;font-size:1rem;}
        .old-price{color:#999;font-size:0.8rem;text-decoration:line-through;}
        .discount-badge{background:#ff6b6b;color:white;padding:2px 8px;border-radius:10px;font-size:0.7rem;}
        .buy-btn{background:linear-gradient(to right,#ff6b6b,#ff4757);color:white;border:none;width:100%;padding:8px;border-radius:8px;font-weight:600;font-size:0.9rem;}
        
        /* Order Form */
        .order-form-container{background:white;border-radius:10px;padding:20px;margin:20px 0;box-shadow:0 3px 10px rgba(0,0,0,0.08);}
        .form-group{margin-bottom:15px;}
        .form-label{font-weight:600;margin-bottom:5px;display:block;}
        .form-control{border:1px solid #ddd;border-radius:8px;padding:10px;width:100%;font-size:1rem;}
        .quantity-selector{display:flex;align-items:center;gap:10px;}
        .qty-btn{width:35px;height:35px;border-radius:50%;background:#ff6b6b;color:white;border:none;}
        .qty-input{width:50px;text-align:center;font-weight:bold;}
        .summary-box{background:#f8f9fa;border-radius:8px;padding:15px;margin:15px 0;}
        .summary-row{display:flex;justify-content:space-between;margin:5px 0;}
        .total-row{border-top:1px solid #ddd;padding-top:10px;margin-top:10px;font-weight:bold;}
        
        /* WhatsApp Float */
        .whatsapp-float{position:fixed;bottom:80px;right:20px;width:60px;height:60px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:2rem;z-index:999;box-shadow:0 4px 15px rgba(37,211,102,0.4);}
        
        /* Live Order */
        .live-order-notification{position:fixed;bottom:150px;right:20px;background:white;border-radius:10px;padding:15px;box-shadow:0 4px 15px rgba(0,0,0,0.1);z-index:998;max-width:250px;border-left:4px solid #28a745;animation:slideIn 0.3s;}
        @keyframes slideIn{from{transform:translateX(100%);}to{transform:translateX(0);}}
        
        /* Responsive */
        @media (min-width:768px){.products-grid{grid-template-columns:repeat(3,1fr);}}
        @media (min-width:992px){.products-grid{grid-template-columns:repeat(4,1fr);}}
        
        /* Fix for mobile input */
        input,select,textarea{font-size:16px!important;}
    </style>
</head>
<body>
    <!-- Mobile Header -->
    <div class="mobile-header">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h1><i class="fas fa-store"></i> ঢাকা মার্কেট</h1>
                <small>সেরা অনলাইন শপিং</small>
            </div>
            <div>
                <a href="tel:+8801234567890" class="btn btn-sm btn-light">
                    <i class="fas fa-phone"></i> কল করুন
                </a>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Hero Section -->
        <div class="hero-section">
            <h2>স্বাগতম ঢাকা মার্কেটে</h2>
            <p>বাংলাদেশের সেরা অনলাইন শপিং প্লাটফর্ম</p>
            <div class="mt-3">
                <div class="row g-2">
                    <div class="col-6"><div class="bg-white text-dark rounded p-2"><small><i class="fas fa-shipping-fast"></i> দ্রুত ডেলিভারি</small></div></div>
                    <div class="col-6"><div class="bg-white text-dark rounded p-2"><small><i class="fas fa-money-bill-wave"></i> ক্যাশ অন ডেলিভারি</small></div></div>
                </div>
            </div>
        </div>

        <!-- Search -->
        <div class="mb-3">
            <div class="input-group">
                <input type="text" id="searchInput" class="form-control" placeholder="পণ্য খুঁজুন..." onkeyup="searchProducts()">
                <button class="btn btn-primary" onclick="searchProducts()">
                    <i class="fas fa-search"></i>
                </button>
            </div>
        </div>

        <!-- Categories -->
        <h5 class="mb-3">ক্যাটাগরি</h5>
        <div class="categories-scroll">`;
            
            const categoryIcons = {
                'electronics': 'fas fa-mobile-alt',
                'fashion': 'fas fa-tshirt',
                'home': 'fas fa-home',
                'beauty': 'fas fa-spa',
                'sports': 'fas fa-futbol',
                'books': 'fas fa-book',
                'toys': 'fas fa-gamepad'
            };
            
            categories.forEach(category => {
                const icon = categoryIcons[category.slug] || 'fas fa-shopping-bag';
                html += `
                <a href="javascript:void(0)" onclick="filterCategory('${category.slug}')" class="category-card text-decoration-none">
                    <div class="category-icon">
                        <i class="${icon}"></i>
                    </div>
                    <span>${category.name}</span>
                </a>`;
            });
            
            html += `
        </div>

        <!-- Products -->
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>পণ্যসমূহ</h5>
            <select id="sortSelect" class="form-select form-select-sm" style="width:auto;" onchange="sortProducts()">
                <option value="default">সর্ট করুন</option>
                <option value="price_low">দাম: কম থেকে বেশি</option>
                <option value="price_high">দাম: বেশি থেকে কম</option>
                <option value="popular">জনপ্রিয়</option>
            </select>
        </div>
        
        <div id="productsContainer" class="products-grid">`;
        
        products.forEach(product => {
            const images = JSON.parse(product.images || '[]');
            const discount = product.offer_price ? Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
            
            html += `
            <div class="product-card" data-category="${product.category}" data-price="${product.offer_price || product.price}">
                <img src="${images[0] || 'https://via.placeholder.com/300x200'}" class="product-image" alt="${product.name}">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">
                        ${product.offer_price ? `
                            <span class="current-price">${formatPrice(product.offer_price)}</span>
                            <span class="old-price">${formatPrice(product.price)}</span>
                            ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
                        ` : `<span class="current-price">${formatPrice(product.price)}</span>`}
                    </div>
                    <button class="buy-btn" onclick="showOrderForm(${product.id}, '${product.name}', ${product.offer_price || product.price})">
                        <i class="fas fa-cart-plus"></i> অর্ডার করুন
                    </button>
                </div>
            </div>`;
        });
        
        html += `
        </div>

        <!-- Order Form Modal -->
        <div id="orderModal" class="order-form-container" style="display:none;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 id="modalProductName"></h5>
                <button class="btn btn-sm btn-outline-secondary" onclick="hideOrderForm()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <form id="orderForm" onsubmit="submitOrder(event)">
                <input type="hidden" id="productId">
                <input type="hidden" id="productPrice">
                
                <div class="form-group">
                    <label class="form-label">আপনার নাম *</label>
                    <input type="text" id="customerName" class="form-control" required placeholder="পুরো নাম লিখুন">
                </div>
                
                <div class="form-group">
                    <label class="form-label">মোবাইল নাম্বার *</label>
                    <input type="tel" id="phoneNumber" class="form-control" required 
                           pattern="01[3-9]\\d{8}" placeholder="01XXXXXXXXX"
                           oninput="formatPhoneInput(this)">
                    <small class="text-muted">বাংলাদেশি মোবাইল নাম্বার দিন (11 ডিজিট)</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">ঠিকানা *</label>
                    <textarea id="address" class="form-control" rows="3" required placeholder="পুরো ঠিকানা লিখুন"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">পরিমাণ</label>
                    <div class="quantity-selector">
                        <button type="button" class="qty-btn" onclick="changeQuantity(-1)"><i class="fas fa-minus"></i></button>
                        <input type="number" id="quantity" class="qty-input" value="1" min="1" readonly>
                        <button type="button" class="qty-btn" onclick="changeQuantity(1)"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">ডেলিভারি এরিয়া</label>
                    <select id="shippingArea" class="form-control" onchange="calculateTotal()">
                        <option value="inside_dhaka">ঢাকার ভিতরে (৳৮০)</option>
                        <option value="outside_dhaka">ঢাকার বাইরে (৳১৫০)</option>
                    </select>
                </div>
                
                <div class="summary-box">
                    <h6>অর্ডার সামারি</h6>
                    <div class="summary-row">
                        <span>পণ্যের দাম:</span>
                        <span id="summaryPrice">৳০</span>
                    </div>
                    <div class="summary-row">
                        <span>ডেলিভারি চার্জ:</span>
                        <span id="summaryShipping">৳৮০</span>
                    </div>
                    <div class="summary-row total-row">
                        <span>মোট টাকা:</span>
                        <span id="summaryTotal" class="text-danger fw-bold">৳০</span>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-danger w-100 py-3">
                    <i class="fas fa-bolt"></i> অর্ডার কনফার্ম করুন
                </button>
            </form>
        </div>

        <!-- Live Order Notification -->
        <div id="liveOrder" class="live-order-notification" style="display:none;">
            <div class="d-flex align-items-start">
                <i class="fas fa-bell text-success me-2"></i>
                <div>
                    <h6 id="liveOrderText" class="mb-1">নতুন অর্ডার!</h6>
                    <small class="text-muted" id="liveOrderTime">এখনই</small>
                </div>
            </div>
        </div>
    </div>

    <!-- Mobile Bottom Navigation -->
    <div class="mobile-nav d-flex justify-content-around">
        <a href="/" class="mobile-nav-item active">
            <i class="fas fa-home"></i>
            <span>হোম</span>
        </a>
        <a href="/products" class="mobile-nav-item">
            <i class="fas fa-box"></i>
            <span>পণ্য</span>
        </a>
        <a href="/categories" class="mobile-nav-item">
            <i class="fas fa-list"></i>
            <span>ক্যাটাগরি</span>
        </a>
        <a href="/track-order" class="mobile-nav-item">
            <i class="fas fa-search"></i>
            <span>ট্র্যাক</span>
        </a>
        <a href="/contact" class="mobile-nav-item">
            <i class="fas fa-phone"></i>
            <span>যোগাযোগ</span>
        </a>
    </div>

    <!-- WhatsApp Float -->
    <div class="whatsapp-float">
        <a href="https://wa.me/8801234567890" target="_blank" style="color:white;">
            <i class="fab fa-whatsapp"></i>
        </a>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let currentProduct = null;
        let currentPrice = 0;
        let currentQuantity = 1;
        
        function formatPhoneInput(input) {
            let value = input.value.replace(/\D/g, '');
            if (value.length > 11) value = value.substring(0, 11);
            input.value = value;
        }
        
        function showOrderForm(productId, productName, price) {
            currentProduct = productId;
            currentPrice = price;
            currentQuantity = 1;
            
            document.getElementById('modalProductName').textContent = productName;
            document.getElementById('productId').value = productId;
            document.getElementById('productPrice').value = price;
            document.getElementById('quantity').value = 1;
            document.getElementById('customerName').value = '';
            document.getElementById('phoneNumber').value = '';
            document.getElementById('address').value = '';
            document.getElementById('shippingArea').value = 'inside_dhaka';
            
            document.getElementById('orderModal').style.display = 'block';
            document.querySelector('.main-content').scrollTop = 0;
            
            calculateTotal();
        }
        
        function hideOrderForm() {
            document.getElementById('orderModal').style.display = 'none';
        }
        
        function changeQuantity(amount) {
            let qty = parseInt(document.getElementById('quantity').value);
            qty += amount;
            if (qty < 1) qty = 1;
            document.getElementById('quantity').value = qty;
            currentQuantity = qty;
            calculateTotal();
        }
        
        function calculateTotal() {
            const shipping = document.getElementById('shippingArea').value === 'inside_dhaka' ? 80 : 150;
            const productTotal = currentPrice * currentQuantity;
            const total = productTotal + shipping;
            
            document.getElementById('summaryPrice').textContent = '৳' + productTotal.toLocaleString('en-IN');
            document.getElementById('summaryShipping').textContent = '৳' + shipping;
            document.getElementById('summaryTotal').textContent = '৳' + total.toLocaleString('en-IN');
        }
        
        function submitOrder(event) {
            event.preventDefault();
            
            const phone = document.getElementById('phoneNumber').value;
            if (!phone.match(/^01[3-9]\\d{8}$/)) {
                alert('সঠিক মোবাইল নাম্বার দিন (01XXXXXXXXX)');
                return;
            }
            
            const orderData = {
                product_id: document.getElementById('productId').value,
                product_name: document.getElementById('modalProductName').textContent,
                product_price: document.getElementById('productPrice').value,
                customer_name: document.getElementById('customerName').value,
                phone: phone,
                address: document.getElementById('address').value,
                quantity: document.getElementById('quantity').value,
                shipping_area: document.getElementById('shippingArea').value
            };
            
            fetch('/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            })
            .then(response => response.text())
            .then(html => {
                document.body.innerHTML = html;
            })
            .catch(error => {
                console.error('Error:', error);
                alert('অর্ডার করতে সমস্যা হচ্ছে। আবার চেষ্টা করুন।');
            });
        }
        
        function filterCategory(category) {
            const products = document.querySelectorAll('.product-card');
            products.forEach(product => {
                if (category === 'all' || product.dataset.category === category) {
                    product.style.display = 'block';
                } else {
                    product.style.display = 'none';
                }
            });
        }
        
        function searchProducts() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const products = document.querySelectorAll('.product-card');
            
            products.forEach(product => {
                const productName = product.querySelector('.product-name').textContent.toLowerCase();
                if (productName.includes(searchTerm)) {
                    product.style.display = 'block';
                } else {
                    product.style.display = 'none';
                }
            });
        }
        
        function sortProducts() {
            const sortBy = document.getElementById('sortSelect').value;
            const container = document.getElementById('productsContainer');
            const products = Array.from(container.querySelectorAll('.product-card'));
            
            products.sort((a, b) => {
                const priceA = parseFloat(a.dataset.price);
                const priceB = parseFloat(b.dataset.price);
                
                switch(sortBy) {
                    case 'price_low': return priceA - priceB;
                    case 'price_high': return priceB - priceA;
                    default: return 0;
                }
            });
            
            products.forEach(product => container.appendChild(product));
        }
        
        // Show live orders
        function showLiveOrder() {
            const customers = ['রহিম (ঢাকা)', 'করিম (চট্টগ্রাম)', 'সাদিয়া (সিলেট)', 'নাসরিন (রাজশাহী)', 'জাহিদ (খুলনা)'];
            const products = ['হেয়ার ট্রিমার', 'স্মার্ট ওয়াচ', 'ওয়্যারলেস ইয়ারবাড', 'টি-শার্ট', 'ইলেকট্রিক কেটলি'];
            
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const product = products[Math.floor(Math.random() * products.length)];
            
            document.getElementById('liveOrderText').textContent = customer + ' অর্ডার করেছেন ' + product;
            document.getElementById('liveOrder').style.display = 'block';
            
            setTimeout(() => {
                document.getElementById('liveOrder').style.display = 'none';
            }, 5000);
        }
        
        // Initialize
        calculateTotal();
        
        // Show first live order after 5 seconds
        setTimeout(showLiveOrder, 5000);
        
        // Show live orders every 10-30 seconds
        setInterval(() => {
            if (Math.random() > 0.5) {
                showLiveOrder();
            }
        }, 15000);
        
        // Handle image errors
        document.addEventListener('DOMContentLoaded', function() {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                img.onerror = function() {
                    this.src = 'https://via.placeholder.com/300x200';
                };
            });
        });
        
        // Prevent zoom on input focus (for mobile)
        document.addEventListener('touchstart', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                document.body.style.zoom = "100%";
            }
        });
    </script>
</body>
</html>`;
            res.send(html);
        });
    });
});

// Mobile-friendly Products Page
app.get('/products', (req, res) => {
    const { category, search } = req.query;
    let query = `SELECT * FROM products WHERE status = 'active'`;
    let params = [];
    
    if (category) {
        query += ` AND category = ?`;
        params.push(category);
    }
    
    if (search) {
        query += ` AND name LIKE ?`;
        params.push(`%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    db.all(query, params, (err, products) => {
        db.all("SELECT * FROM categories WHERE status = 'active'", (err, categories) => {
            let html = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>পণ্যসমূহ - ঢাকা মার্কেট</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Segoe UI','Kalpurush',sans-serif;background:#f5f5f5;}
        
        .mobile-header{background:linear-gradient(135deg,#ff6b6b,#ff4757);color:white;padding:15px;position:fixed;top:0;left:0;right:0;z-index:1000;}
        .mobile-nav{position:fixed;bottom:0;left:0;right:0;background:white;z-index:1000;box-shadow:0 -2px 10px rgba(0,0,0,0.1);padding:10px 0;}
        .mobile-nav-item{text-align:center;color:#666;text-decoration:none;flex:1;}
        .main-content{padding:70px 15px 80px;min-height:100vh;}
        
        .products-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px;}
        .product-card{background:white;border-radius:10px;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,0.08);}
        .product-image{width:100%;height:150px;object-fit:cover;}
        .product-info{padding:12px;}
        .product-name{font-size:0.9rem;font-weight:600;margin-bottom:8px;height:40px;overflow:hidden;}
        .current-price{color:#ff6b6b;font-weight:bold;}
        .old-price{color:#999;font-size:0.8rem;text-decoration:line-through;}
        .buy-btn{background:linear-gradient(to right,#ff6b6b,#ff4757);color:white;border:none;width:100%;padding:8px;border-radius:8px;}
        
        .filter-bar{background:white;padding:15px;margin-bottom:15px;border-radius:10px;}
        
        @media(min-width:768px){.products-grid{grid-template-columns:repeat(3,1fr);}}
        @media(min-width:992px){.products-grid{grid-template-columns:repeat(4,1fr);}}
    </style>
</head>
<body>
    <div class="mobile-header">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5><i class="fas fa-box"></i> সব পণ্য</h5>
                <small>${products.length} টি পণ্য</small>
            </div>
            <a href="/" class="btn btn-sm btn-light">
                <i class="fas fa-arrow-left"></i>
            </a>
        </div>
    </div>

    <div class="main-content">
        <div class="filter-bar">
            <form action="/products" method="GET" class="row g-2">
                <div class="col-8">
                    <input type="text" name="search" class="form-control" placeholder="পণ্য খুঁজুন..." value="${search || ''}">
                </div>
                <div class="col-4">
                    <button type="submit" class="btn btn-primary w-100">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <div class="col-12 mt-2">
                    <select name="category" class="form-select" onchange="this.form.submit()">
                        <option value="">সব ক্যাটাগরি</option>`;
        
        categories.forEach(cat => {
            html += `<option value="${cat.slug}" ${category === cat.slug ? 'selected' : ''}>${cat.name}</option>`;
        });
        
        html += `
                    </select>
                </div>
            </form>
        </div>
        
        <div class="products-grid">`;
        
        products.forEach(product => {
            const images = JSON.parse(product.images || '[]');
            const discount = product.offer_price ? Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
            
            html += `
            <div class="product-card">
                <img src="${images[0] || 'https://via.placeholder.com/300x200'}" class="product-image" alt="${product.name}">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="mb-2">
                        ${product.offer_price ? `
                            <span class="current-price">${formatPrice(product.offer_price)}</span>
                            <span class="old-price">${formatPrice(product.price)}</span>
                            ${discount > 0 ? `<span class="badge bg-danger" style="font-size:0.7rem;">${discount}% OFF</span>` : ''}
                        ` : `<span class="current-price">${formatPrice(product.price)}</span>`}
                    </div>
                    <a href="/product/${product.slug}" class="buy-btn">
                        <i class="fas fa-cart-plus"></i> অর্ডার
                    </a>
                </div>
            </div>`;
        });
        
        html += `
        </div>
        
        ${products.length === 0 ? `
        <div class="text-center py-5">
            <i class="fas fa-search fa-3x text-muted mb-3"></i>
            <h5>কোন পণ্য পাওয়া যায়নি</h5>
            <a href="/products" class="btn btn-primary mt-3">সব পণ্য দেখুন</a>
        </div>
        ` : ''}
    </div>

    <div class="mobile-nav d-flex justify-content-around">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home"></i>
            <span>হোম</span>
        </a>
        <a href="/products" class="mobile-nav-item active">
            <i class="fas fa-box"></i>
            <span>পণ্য</span>
        </a>
        <a href="/categories" class="mobile-nav-item">
            <i class="fas fa-list"></i>
            <span>ক্যাটাগরি</span>
        </a>
        <a href="/track-order" class="mobile-nav-item">
            <i class="fas fa-search"></i>
            <span>ট্র্যাক</span>
        </a>
        <a href="/contact" class="mobile-nav-item">
            <i class="fas fa-phone"></i>
            <span>যোগাযোগ</span>
        </a>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                img.onerror = function() {
                    this.src = 'https://via.placeholder.com/300x200';
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

// Mobile-friendly Single Product Page
app.get('/product/:slug', (req, res) => {
    const slug = req.params.slug;
    db.run("UPDATE products SET views = views + 1 WHERE slug = ?", [slug]);
    
    db.get("SELECT * FROM products WHERE slug = ?", [slug], (err, product) => {
        if (!product) {
            res.status(404).send('Product not found');
            return;
        }
        
        const images = JSON.parse(product.images || '[]');
        const features = JSON.parse(product.features || '[]');
        const discount = product.offer_price ? Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
        
        let html = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${product.name} - ঢাকা মার্কেট</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Segoe UI','Kalpurush',sans-serif;background:#f5f5f5;}
        
        .mobile-header{background:linear-gradient(135deg,#ff6b6b,#ff4757);color:white;padding:15px;position:fixed;top:0;left:0;right:0;z-index:1000;}
        .mobile-nav{position:fixed;bottom:0;left:0;right:0;background:white;z-index:1000;box-shadow:0 -2px 10px rgba(0,0,0,0.1);padding:10px 0;}
        .main-content{padding:70px 15px 80px;min-height:100vh;}
        
        .product-image{width:100%;max-height:400px;object-fit:contain;border-radius:10px;background:white;padding:20px;}
        .product-title{font-size:1.2rem;font-weight:bold;margin:15px 0;}
        .product-price{font-size:1.5rem;color:#ff6b6b;font-weight:bold;margin:10px 0;}
        .old-price{color:#999;text-decoration:line-through;font-size:1rem;}
        .discount-badge{background:#ff6b6b;color:white;padding:3px 10px;border-radius:15px;font-size:0.9rem;}
        .feature-list li{margin:8px 0;padding-left:20px;position:relative;}
        .feature-list li:before{content:"✓";color:#28a745;position:absolute;left:0;}
        
        .order-section{background:white;border-radius:15px;padding:20px;margin-top:20px;box-shadow:0 3px 15px rgba(0,0,0,0.1);position:sticky;bottom:80px;}
        .quantity-selector{display:flex;align-items:center;justify-content:center;gap:15px;margin:15px 0;}
        .qty-btn{width:40px;height:40px;border-radius:50%;background:#ff6b6b;color:white;border:none;}
        .qty-input{width:50px;text-align:center;font-weight:bold;}
        .order-btn{background:linear-gradient(to right,#ff6b6b,#ff4757);color:white;border:none;width:100%;padding:15px;border-radius:10px;font-size:1.1rem;font-weight:bold;}
    </style>
</head>
<body>
    <div class="mobile-header">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h6>পণ্যের বিবরণ</h6>
            </div>
            <a href="/products" class="btn btn-sm btn-light">
                <i class="fas fa-arrow-left"></i> ফিরে যান
            </a>
        </div>
    </div>

    <div class="main-content">
        <div id="imageCarousel" class="carousel slide" data-bs-ride="carousel">
            <div class="carousel-inner">`;
        
        images.forEach((img, index) => {
            html += `
                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <img src="${img}" class="d-block w-100 product-image" alt="Image ${index + 1}">
                </div>`;
        });
        
        html += `
            </div>
            ${images.length > 1 ? `
            <button class="carousel-control-prev" type="button" data-bs-target="#imageCarousel" data-bs-slide="prev">
                <span class="carousel-control-prev-icon"></span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#imageCarousel" data-bs-slide="next">
                <span class="carousel-control-next-icon"></span>
            </button>
            ` : ''}
        </div>
        
        <h1 class="product-title">${product.name}</h1>
        
        <div class="d-flex align-items-center mb-3">
            ${product.offer_price ? `
                <div class="product-price">${formatPrice(product.offer_price)}</div>
                <div class="old-price ms-3">${formatPrice(product.price)}</div>
                ${discount > 0 ? `<div class="discount-badge ms-3">${discount}% ছাড়</div>` : ''}
            ` : `<div class="product-price">${formatPrice(product.price)}</div>`}
        </div>
        
        <div class="card mb-3">
            <div class="card-body">
                <h6><i class="fas fa-info-circle text-primary"></i> বিবরণ</h6>
                <p>${product.description}</p>
            </div>
        </div>
        
        <div class="card mb-3">
            <div class="card-body">
                <h6><i class="fas fa-star text-warning"></i> ফিচারসমূহ</h6>
                <ul class="feature-list">
                    ${features.map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>
        </div>
        
        <div class="row mb-3">
            <div class="col-6">
                <div class="card text-center">
                    <div class="card-body">
                        <i class="fas fa-box text-success fa-2x mb-2"></i>
                        <h6>স্টক</h6>
                        <p class="${product.stock > 0 ? 'text-success' : 'text-danger'} fw-bold">
                            ${product.stock > 0 ? 'স্টকে আছে' : 'স্টক নেই'}
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-6">
                <div class="card text-center">
                    <div class="card-body">
                        <i class="fas fa-shipping-fast text-primary fa-2x mb-2"></i>
                        <h6>ডেলিভারি</h6>
                        <p class="fw-bold">১-৩ দিন</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="order-section">
            <form id="orderForm" action="/checkout" method="POST">
                <input type="hidden" name="product_id" value="${product.id}">
                <input type="hidden" name="product_name" value="${product.name}">
                <input type="hidden" name="product_price" value="${product.offer_price || product.price}">
                
                <div class="mb-3">
                    <label class="form-label">আপনার নাম *</label>
                    <input type="text" name="customer_name" class="form-control" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">মোবাইল নাম্বার *</label>
                    <input type="tel" name="phone" class="form-control" required pattern="01[3-9]\\d{8}" placeholder="01XXXXXXXXX">
                </div>
                
                <div class="mb-3">
                    <label class="form-label">ঠিকানা *</label>
                    <textarea name="address" class="form-control" rows="2" required></textarea>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">পরিমাণ</label>
                    <div class="quantity-selector">
                        <button type="button" class="qty-btn" onclick="changeQuantity(-1)"><i class="fas fa-minus"></i></button>
                        <input type="number" name="quantity" id="quantity" class="qty-input" value="1" min="1" max="${product.stock}" readonly>
                        <button type="button" class="qty-btn" onclick="changeQuantity(1)"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">ডেলিভারি এরিয়া</label>
                    <select name="shipping_area" class="form-control" onchange="calculateTotal()">
                        <option value="inside_dhaka">ঢাকার ভিতরে (৳৮০)</option>
                        <option value="outside_dhaka">ঢাকার বাইরে (৳১৫০)</option>
                    </select>
                </div>
                
                <div class="alert alert-success">
                    <div class="d-flex justify-content-between">
                        <span>মোট টাকা:</span>
                        <span id="totalAmount" class="fw-bold">${formatPrice((product.offer_price || product.price) + 80)}</span>
                    </div>
                </div>
                
                <button type="submit" class="order-btn" ${product.stock <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-bolt"></i> 
                    ${product.stock <= 0 ? 'স্টক নেই' : 'অর্ডার করুন'}
                </button>
            </form>
        </div>
    </div>

    <div class="mobile-nav d-flex justify-content-around">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home"></i>
            <span>হোম</span>
        </a>
        <a href="/products" class="mobile-nav-item">
            <i class="fas fa-box"></i>
            <span>পণ্য</span>
        </a>
        <a href="/categories" class="mobile-nav-item">
            <i class="fas fa-list"></i>
            <span>ক্যাটাগরি</span>
        </a>
        <a href="/track-order" class="mobile-nav-item">
            <i class="fas fa-search"></i>
            <span>ট্র্যাক</span>
        </a>
        <a href="/contact" class="mobile-nav-item">
            <i class="fas fa-phone"></i>
            <span>যোগাযোগ</span>
        </a>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let quantity = 1;
        const price = ${product.offer_price || product.price};
        const maxQuantity = ${product.stock};
        
        function changeQuantity(amount) {
            quantity += amount;
            if (quantity < 1) quantity = 1;
            if (quantity > maxQuantity) quantity = maxQuantity;
            document.getElementById('quantity').value = quantity;
            calculateTotal();
        }
        
        function calculateTotal() {
            const shipping = document.querySelector('[name="shipping_area"]').value === 'inside_dhaka' ? 80 : 150;
            const total = (price * quantity) + shipping;
            document.getElementById('totalAmount').textContent = '৳' + total.toLocaleString('en-IN');
        }
        
        // Initialize
        calculateTotal();
        
        // Handle phone number input
        document.querySelector('[name="phone"]').addEventListener('input', function() {
            this.value = this.value.replace(/\\D/g, '');
        });
        
        // Prevent form submission on enter
        document.getElementById('orderForm').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    </script>
</body>
</html>`;
        
        res.send(html);
    });
});

// Checkout for mobile
app.post('/checkout', (req, res) => {
    const { 
        product_id, product_name, product_price, 
        customer_name, phone, address, quantity, shipping_area 
    } = req.body;
    
    const shippingCost = shipping_area === 'inside_dhaka' ? 80 : 150;
    const total = (parseFloat(product_price) * parseInt(quantity)) + shippingCost;
    const orderId = generateOrderId();
    const formattedPhone = formatPhone(phone);
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.run(`INSERT INTO orders 
                (order_id, customer_name, phone, address, shipping_area, quantity, 
                 product_id, product_name, total) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, customer_name, formattedPhone, address, shipping_area, quantity, 
             product_id, product_name, total], function(err) {
            
            if (err) {
                db.run('ROLLBACK');
                let errorHtml = `<!DOCTYPE html>
<html lang="bn">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>ত্রুটি</title>
<style>body{font-family:'Kalpurush',sans-serif;padding:20px;text-align:center;background:#f5f5f5;}
.error-box{background:white;padding:30px;border-radius:15px;margin-top:50px;box-shadow:0 3px 15px rgba(0,0,0,0.1);}
</style></head>
<body>
<div class="error-box">
<i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
<h2>অর্ডার ব্যর্থ হয়েছে!</h2>
<p>দুঃখিত, অর্ডারটি সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।</p>
<a href="/product/${product_id}" class="btn btn-primary">ফিরে যান</a>
</div>
</body></html>`;
                res.send(errorHtml);
                return;
            }
            
            db.run(`UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?`,
                [quantity, quantity, product_id], function(err) {
                
                if (err) {
                    db.run('ROLLBACK');
                    let errorHtml = `<!DOCTYPE html>
<html lang="bn"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>ত্রুটি</title>
<style>body{font-family:'Kalpurush',sans-serif;padding:20px;text-align:center;}
</style></head>
<body>
<h2 class="text-danger">স্টক আপডেট করতে সমস্যা!</h2>
<p>অনুগ্রহ করে আবার চেষ্টা করুন।</p>
<a href="/" class="btn btn-primary">হোমে ফিরে যান</a>
</body></html>`;
                    res.send(errorHtml);
                    return;
                }
                
                db.run('COMMIT');
                
                let successHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>অর্ডার সফল - ঢাকা মার্কেট</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Kalpurush',sans-serif;background:linear-gradient(135deg,#f5f7fa,#c3cfe2);min-height:100vh;}
        .success-container{padding:30px20px;text-align:center;}
        .success-icon{font-size:80px;color:#28a745;margin-bottom:20px;}
        .order-card{background:white;border-radius:15px;padding:25px;margin:20px0;box-shadow:0 5px 20px rgba(0,0,0,0.1);}
        .info-card{background:#f8f9fa;border-radius:10px;padding:20px;margin:15px0;}
        .whatsapp-btn{background:#25D366;color:white;border:none;padding:15px;border-radius:10px;width:100%;font-weight:bold;margin:10px0;}
    </style>
</head>
<body>
    <div class="success-container">
        <div class="success-icon">
            <i class="fas fa-check-circle"></i>
        </div>
        
        <h2 class="mb-3">অর্ডার সফল!</h2>
        <p class="lead">ধন্যবাদ ${customer_name}, আপনার অর্ডারটি গ্রহণ করা হয়েছে।</p>
        
        <div class="order-card">
            <h5 class="mb-4">অর্ডার তথ্য</h5>
            <div class="text-start">
                <div class="mb-3">
                    <strong>অর্ডার আইডি:</strong>
                    <div class="h5 text-primary">${orderId}</div>
                </div>
                <div class="mb-3">
                    <strong>পণ্য:</strong>
                    <div>${product_name}</div>
                </div>
                <div class="mb-3">
                    <strong>পরিমাণ:</strong>
                    <div>${quantity} টি</div>
                </div>
                <div class="mb-3">
                    <strong>মোবাইল:</strong>
                    <div>${formattedPhone}</div>
                </div>
                <div class="mb-3">
                    <strong>ঠিকানা:</strong>
                    <div>${address}</div>
                </div>
                <div class="mb-3">
                    <strong>ডেলিভারি:</strong>
                    <div>${shipping_area === 'inside_dhaka' ? 'ঢাকার ভিতরে' : 'ঢাকার বাইরে'}</div>
                </div>
                <div class="mb-3">
                    <strong>মোট টাকা:</strong>
                    <div class="h4 text-success">${formatPrice(total)}</div>
                </div>
            </div>
        </div>
        
        <div class="info-card">
            <h6><i class="fas fa-info-circle"></i> পরবর্তী ধাপ</h6>
            <p class="mb-2">আমরা আপনার সাথে ${formattedPhone} নম্বরে ৩০ মিনিটের মধ্যে যোগাযোগ করব।</p>
            <p class="mb-0">অর্ডারটি ২৪ ঘন্টার মধ্যে ডেলিভারি করা হবে।</p>
        </div>
        
        <div class="mt-4">
            <a href="https://wa.me/8801234567890?text=অর্ডার%20আইডি:%20${orderId}%0Aপণ্য:%20${encodeURIComponent(product_name)}%0Aনাম:%20${encodeURIComponent(customer_name)}%0Aমোবাইল:%20${formattedPhone}" 
               target="_blank" class="whatsapp-btn">
                <i class="fab fa-whatsapp me-2"></i> WhatsApp এ মেসেজ
            </a>
            
            <a href="tel:+8801234567890" class="btn btn-primary w-100 py-3 mt-2">
                <i class="fas fa-phone"></i> কল করুন
            </a>
            
            <a href="/" class="btn btn-outline-primary w-100 py-3 mt-2">
                <i class="fas fa-shopping-cart"></i> আরো শপিং করুন
            </a>
        </div>
    </div>
</body>
</html>`;
                
                res.send(successHtml);
            });
        });
    });
});

// Mobile-friendly Track Order
app.get('/track-order', (req, res) => {
    const orderId = req.query.order_id;
    
    let html = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>অর্ডার ট্র্যাক - ঢাকা মার্কেট</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Kalpurush',sans-serif;background:#f5f5f5;}
        .mobile-header{background:linear-gradient(135deg,#ff6b6b,#ff4757);color:white;padding:15px;position:fixed;top:0;left:0;right:0;z-index:1000;}
        .mobile-nav{position:fixed;bottom:0;left:0;right:0;background:white;z-index:1000;box-shadow:0 -2px 10px rgba(0,0,0,0.1);padding:10px 0;}
        .main-content{padding:70px 15px 80px;min-height:100vh;}
        .track-card{background:white;border-radius:15px;padding:25px;margin:20px0;box-shadow:0 3px 15px rgba(0,0,0,0.1);}
        .timeline{position:relative;padding-left:25px;margin:20px0;}
        .timeline:before{content:'';position:absolute;left:7px;top:0;bottom:0;width:3px;background:#28a745;}
        .timeline-step{position:relative;margin-bottom:25px;}
        .timeline-step:before{content:'';position:absolute;left:-31px;top:3px;width:15px;height:15px;border-radius:50%;background:white;border:3pxsolid#28a745;}
        .timeline-step.active:before{background:#28a745;}
    </style>
</head>
<body>
    <div class="mobile-header">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5><i class="fas fa-search-location"></i> অর্ডার ট্র্যাক</h5>
            </div>
            <a href="/" class="btn btn-sm btn-light">
                <i class="fas fa-arrow-left"></i>
            </a>
        </div>
    </div>

    <div class="main-content">
        <div class="track-card">
            <form action="/track-order" method="GET">
                <div class="mb-3">
                    <label class="form-label">আপনার অর্ডার আইডি দিন</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="fas fa-receipt"></i></span>
                        <input type="text" name="order_id" class="form-control" placeholder="যেমন: DM12345678" value="${orderId || ''}" required>
                        <button class="btn btn-primary" type="submit">খুঁজুন</button>
                    </div>
                    <small class="text-muted">অর্ডার কনফার্মেশনে অর্ডার আইডি দেওয়া আছে</small>
                </div>
            </form>
        </div>`;
    
    if (orderId) {
        db.get("SELECT * FROM orders WHERE order_id = ?", [orderId], (err, order) => {
            if (!order) {
                html += `
                <div class="alert alert-danger">
                    <h6><i class="fas fa-exclamation-triangle"></i> অর্ডার পাওয়া যায়নি</h6>
                    <p>অর্ডার আইডি: ${orderId} দিয়ে কোন অর্ডার পাওয়া যায়নি।</p>
                </div>`;
            } else {
                const statusSteps = [
                    { status: 'pending', label: 'অর্ডার প্লেসড', description: 'আপনার অর্ডারটি গ্রহণ করা হয়েছে' },
                    { status: 'processing', label: 'প্রসেসিং', description: 'অর্ডারটি প্রসেস করা হচ্ছে' },
                    { status: 'shipped', label: 'শিপড', description: 'অর্ডারটি পাঠানো হয়েছে' },
                    { status: 'delivered', label: 'ডেলিভার্ড', description: 'অর্ডারটি ডেলিভার করা হয়েছে' }
                ];
                
                const statusIndex = statusSteps.findIndex(step => step.status === order.status);
                
                html += `
                <div class="track-card">
                    <div class="alert alert-${order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : 'info'}">
                        <h6>অর্ডার স্ট্যাটাস: ${order.status === 'pending' ? 'পেন্ডিং' : 
                          order.status === 'processing' ? 'প্রসেসিং' : 
                          order.status === 'shipped' ? 'শিপড' : 
                          order.status === 'delivered' ? 'ডেলিভার্ড' : 'ক্যান্সেল্ড'}</h6>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-6">
                            <small class="text-muted">অর্ডার আইডি</small>
                            <div class="fw-bold">${order.order_id}</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">তারিখ</small>
                            <div class="fw-bold">${new Date(order.created_at).toLocaleDateString('bn-BD')}</div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <small class="text-muted">পণ্য</small>
                        <div class="fw-bold">${order.product_name} (${order.quantity} টি)</div>
                    </div>
                    
                    <div class="mb-3">
                        <small class="text-muted">গ্রাহক</small>
                        <div class="fw-bold">${order.customer_name}</div>
                        <div>${order.phone}</div>
                    </div>
                    
                    <div class="mb-4">
                        <small class="text-muted">ঠিকানা</small>
                        <div>${order.address}</div>
                    </div>
                    
                    <h6>ট্র্যাকিং</h6>
                    <div class="timeline">
                        ${statusSteps.map((step, index) => `
                            <div class="timeline-step ${index <= statusIndex ? 'active' : ''}">
                                <div class="fw-bold">${step.label}</div>
                                <small class="text-muted">${step.description}</small>
                                ${index <= statusIndex ? `<small class="text-success d-block"><i class="fas fa-check-circle"></i> সম্পন্ন</small>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="mt-4 text-center">
                        <a href="tel:+8801234567890" class="btn btn-outline-primary">
                            <i class="fas fa-phone"></i> কল করুন
                        </a>
                    </div>
                </div>`;
            }
            
            html += `
    </div>

    <div class="mobile-nav d-flex justify-content-around">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home"></i>
            <span>হোম</span>
        </a>
        <a href="/products" class="mobile-nav-item">
            <i class="fas fa-box"></i>
            <span>পণ্য</span>
        </a>
        <a href="/categories" class="mobile-nav-item">
            <i class="fas fa-list"></i>
            <span>ক্যাটাগরি</span>
        </a>
        <a href="/track-order" class="mobile-nav-item active">
            <i class="fas fa-search"></i>
            <span>ট্র্যাক</span>
        </a>
        <a href="/contact" class="mobile-nav-item">
            <i class="fas fa-phone"></i>
            <span>যোগাযোগ</span>
        </a>
    </div>
</body>
</html>`;
            
            res.send(html);
        });
    } else {
        html += `
    </div>

    <div class="mobile-nav d-flex justify-content-around">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home"></i>
            <span>হোম</span>
        </a>
        <a href="/products" class="mobile-nav-item">
            <i class="fas fa-box"></i>
            <span>পণ্য</span>
        </a>
        <a href="/categories" class="mobile-nav-item">
            <i class="fas fa-list"></i>
            <span>ক্যাটাগরি</span>
        </a>
        <a href="/track-order" class="mobile-nav-item active">
            <i class="fas fa-search"></i>
            <span>ট্র্যাক</span>
        </a>
        <a href="/contact" class="mobile-nav-item">
            <i class="fas fa-phone"></i>
            <span>যোগাযোগ</span>
        </a>
    </div>
</body>
</html>`;
        res.send(html);
    }
});

// Mobile-friendly Contact Page
app.get('/contact', (req, res) => {
    let html = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>যোগাযোগ - ঢাকা মার্কেট</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Kalpurush',sans-serif;background:#f5f5f5;}
        .mobile-header{background:linear-gradient(135deg,#ff6b6b,#ff4757);color:white;padding:15px;position:fixed;top:0;left:0;right:0;z-index:1000;}
        .mobile-nav{position:fixed;bottom:0;left:0;right:0;background:white;z-index:1000;box-shadow:0 -2px 10px rgba(0,0,0,0.1);padding:10px 0;}
        .main-content{padding:70px 15px 80px;min-height:100vh;}
        .contact-card{background:white;border-radius:15px;padding:25px;margin:15px0;text-align:center;box-shadow:0 3px 15px rgba(0,0,0,0.1);}
        .contact-icon{font-size:2.5rem;color:#ff6b6b;margin-bottom:15px;}
        .btn-contact{width:100%;padding:12px;border-radius:10px;margin:5px0;}
    </style>
</head>
<body>
    <div class="mobile-header">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5><i class="fas fa-phone-alt"></i> যোগাযোগ</h5>
            </div>
            <a href="/" class="btn btn-sm btn-light">
                <i class="fas fa-arrow-left"></i>
            </a>
        </div>
    </div>

    <div class="main-content">
        <div class="contact-card">
            <div class="contact-icon">
                <i class="fas fa-phone-alt"></i>
            </div>
            <h4>কল করুন</h4>
            <p class="lead">+৮৮০ ১২৩৪-৫৬৭৮৯০</p>
            <a href="tel:+8801234567890" class="btn btn-primary btn-contact">
                <i class="fas fa-phone"></i> কল করুন এখনই
            </a>
        </div>
        
        <div class="contact-card">
            <div class="contact-icon">
                <i class="fab fa-whatsapp"></i>
            </div>
            <h4>WhatsApp</h4>
            <p class="lead">+৮৮০ ১২৩৪-৫৬৭৮৯০</p>
            <a href="https://wa.me/8801234567890" target="_blank" class="btn btn-success btn-contact">
                <i class="fab fa-whatsapp"></i> WhatsApp এ মেসেজ
            </a>
        </div>
        
        <div class="contact-card">
            <div class="contact-icon">
                <i class="fas fa-envelope"></i>
            </div>
            <h4>ইমেইল</h4>
            <p class="lead">info@dhakamarket.com</p>
            <a href="mailto:info@dhakamarket.com" class="btn btn-primary btn-contact">
                <i class="fas fa-envelope"></i> ইমেইল পাঠান
            </a>
        </div>
        
        <div class="contact-card">
            <div class="contact-icon">
                <i class="fas fa-map-marker-alt"></i>
            </div>
            <h4>ঠিকানা</h4>
            <p>১২৩ মার্কেট স্ট্রিট, ঢাকা ১২০৫</p>
            <p>বাংলাদেশ</p>
            <p><i class="fas fa-clock me-2"></i>সকাল ৯টা - রাত ১০টা</p>
        </div>
        
        <div class="mt-4">
            <h5>দ্রুত সহায়তা</h5>
            <p>যেকোনো সমস্যা বা প্রশ্নের জন্য সরাসরি কল করুন বা WhatsApp এ মেসেজ করুন। আমরা ২৪/৭ আপনাকে সাহায্য করতে প্রস্তুত।</p>
        </div>
    </div>

    <div class="mobile-nav d-flex justify-content-around">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home"></i>
            <span>হোম</span>
        </a>
        <a href="/products" class="mobile-nav-item">
            <i class="fas fa-box"></i>
            <span>পণ্য</span>
        </a>
        <a href="/categories" class="mobile-nav-item">
            <i class="fas fa-list"></i>
            <span>ক্যাটাগরি</span>
        </a>
        <a href="/track-order" class="mobile-nav-item">
            <i class="fas fa-search"></i>
            <span>ট্র্যাক</span>
        </a>
        <a href="/contact" class="mobile-nav-item active">
            <i class="fas fa-phone"></i>
            <span>যোগাযোগ</span>
        </a>
    </div>
</body>
</html>`;
    
    res.send(html);
});

// Categories page for mobile
app.get('/categories', (req, res) => {
    db.all("SELECT * FROM categories WHERE status = 'active'", (err, categories) => {
        let html = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ক্যাটাগরি - ঢাকা মার্কেট</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Kalpurush',sans-serif;background:#f5f5f5;}
        .mobile-header{background:linear-gradient(135deg,#ff6b6b,#ff4757);color:white;padding:15px;position:fixed;top:0;left:0;right:0;z-index:1000;}
        .mobile-nav{position:fixed;bottom:0;left:0;right:0;background:white;z-index:1000;box-shadow:0 -2px 10px rgba(0,0,0,0.1);padding:10px 0;}
        .main-content{padding:70px 15px 80px;min-height:100vh;}
        .categories-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px;}
        .category-card{background:white;border-radius:15px;padding:25px;text-align:center;box-shadow:0 3px 15px rgba(0,0,0,0.1);}
        .category-icon{font-size:2.5rem;color:#ff6b6b;margin-bottom:15px;}
        @media(min-width:768px){.categories-grid{grid-template-columns:repeat(3,1fr);}}
    </style>
</head>
<body>
    <div class="mobile-header">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5><i class="fas fa-list"></i> ক্যাটাগরি</h5>
                <small>${categories.length} টি ক্যাটাগরি</small>
            </div>
            <a href="/" class="btn btn-sm btn-light">
                <i class="fas fa-arrow-left"></i>
            </a>
        </div>
    </div>

    <div class="main-content">
        <div class="categories-grid">`;
        
        const categoryIcons = {
            'electronics': 'fas fa-mobile-alt',
            'fashion': 'fas fa-tshirt',
            'home': 'fas fa-home',
            'beauty': 'fas fa-spa',
            'sports': 'fas fa-futbol',
            'books': 'fas fa-book',
            'toys': 'fas fa-gamepad'
        };
        
        categories.forEach(category => {
            const icon = categoryIcons[category.slug] || 'fas fa-shopping-bag';
            
            html += `
            <a href="/products?category=${category.slug}" class="text-decoration-none">
                <div class="category-card">
                    <div class="category-icon">
                        <i class="${icon}"></i>
                    </div>
                    <h5>${category.name}</h5>
                    ${category.description ? `<p class="text-muted">${category.description}</p>` : ''}
                    <span class="badge bg-primary">পণ্য দেখুন</span>
                </div>
            </a>`;
        });
        
        html += `
        </div>
    </div>

    <div class="mobile-nav d-flex justify-content-around">
        <a href="/" class="mobile-nav-item">
            <i class="fas fa-home"></i>
            <span>হোম</span>
        </a>
        <a href="/products" class="mobile-nav-item">
            <i class="fas fa-box"></i>
            <span>পণ্য</span>
        </a>
        <a href="/categories" class="mobile-nav-item active">
            <i class="fas fa-list"></i>
            <span>ক্যাটাগরি</span>
        </a>
        <a href="/track-order" class="mobile-nav-item">
            <i class="fas fa-search"></i>
            <span>ট্র্যাক</span>
        </a>
        <a href="/contact" class="mobile-nav-item">
            <i class="fas fa-phone"></i>
            <span>যোগাযোগ</span>
        </a>
    </div>
</body>
</html>`;
        
        res.send(html);
    });
});

// Admin login for mobile
app.get('/admin-login', (req, res) => {
    if (req.session.user) {
        res.redirect('/admin/dashboard');
        return;
    }
    
    let html = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Admin Login - ঢাকা মার্কেট</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body{background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;}
        .login-box{background:white;border-radius:15px;padding:30px;margin:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2);}
        .login-header{text-align:center;margin-bottom:30px;}
        .btn-login{background:linear-gradient(135deg,#ff6b6b,#ff4757);color:white;border:none;padding:12px;width:100%;border-radius:8px;font-weight:bold;}
    </style>
</head>
<body>
    <div class="container">
        <div class="login-box">
            <div class="login-header">
                <h4><i class="fas fa-user-shield"></i> Admin Login</h4>
                <p class="text-muted">ঢাকা মার্কেট এডমিন</p>
            </div>
            
            <form action="/admin-login" method="POST">
                <div class="mb-3">
                    <label class="form-label">Username</label>
                    <input type="text" name="username" class="form-control" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-control" required>
                </div>
                
                <button type="submit" class="btn-login">
                    <i class="fas fa-sign-in-alt me-2"></i> Login
                </button>
                
                <div class="text-center mt-3">
                    <small class="text-muted">Username: admin | Password: admin123</small>
                </div>
                
                <div class="text-center mt-3">
                    <a href="/" class="btn btn-sm btn-outline-secondary">
                        <i class="fas fa-arrow-left"></i> Back to Site
                    </a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>`;
    
    res.send(html);
});

// Mobile-friendly Admin Dashboard
app.get('/admin/dashboard', requireAuth, (req, res) => {
    db.serialize(() => {
        db.get(`SELECT COUNT(*) as total_orders, SUM(total) as total_revenue FROM orders`, (err, orderStats) => {
            db.get(`SELECT COUNT(*) as total_products FROM products`, (err, productStats) => {
                db.all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 5`, (err, recentOrders) => {
                    
                    let html = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Admin Dashboard - ঢাকা মার্কেট</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Segoe UI',sans-serif;background:#f5f5f5;}
        .admin-header{background:linear-gradient(135deg,#2c3e50,#1a252f);color:white;padding:15px;position:fixed;top:0;left:0;right:0;z-index:1000;}
        .admin-nav{background:#34495e;padding:10px;position:fixed;bottom:0;left:0;right:0;}
        .main-content{padding:70px 15px 70px;min-height:100vh;}
        .stat-card{background:white;border-radius:10px;padding:20px;margin-bottom:15px;box-shadow:0 3px 10px rgba(0,0,0,0.1);}
        .stat-number{font-size:1.8rem;font-weight:bold;margin-bottom:5px;}
        .table-card{background:white;border-radius:10px;padding:20px;margin:20px0;box-shadow:0 3px 10px rgba(0,0,0,0.1);}
        .nav-btn{color:white;text-decoration:none;text-align:center;flex:1;}
        .nav-btn i{font-size:1.2rem;display:block;margin-bottom:5px;}
        .nav-btn span{font-size:0.8rem;}
    </style>
</head>
<body>
    <div class="admin-header">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5><i class="fas fa-tachometer-alt"></i> Dashboard</h5>
                <small>Welcome, ${req.session.user.username}</small>
            </div>
            <a href="/admin-logout" class="btn btn-sm btn-light">
                <i class="fas fa-sign-out-alt"></i>
            </a>
        </div>
    </div>

    <div class="main-content">
        <div class="row g-3 mb-4">
            <div class="col-6">
                <div class="stat-card">
                    <div class="stat-number text-primary">${orderStats?.total_orders || 0}</div>
                    <div class="text-muted">Total Orders</div>
                </div>
            </div>
            <div class="col-6">
                <div class="stat-card">
                    <div class="stat-number text-success">${formatPrice(orderStats?.total_revenue || 0)}</div>
                    <div class="text-muted">Total Revenue</div>
                </div>
            </div>
            <div class="col-6">
                <div class="stat-card">
                    <div class="stat-number text-danger">${productStats?.total_products || 0}</div>
                    <div class="text-muted">Total Products</div>
                </div>
            </div>
            <div class="col-6">
                <div class="stat-card">
                    <div class="stat-number text-warning">${orderStats?.total_orders || 0}</div>
                    <div class="text-muted">Total Customers</div>
                </div>
            </div>
        </div>
        
        <div class="table-card">
            <h6 class="mb-3">Recent Orders</h6>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>`;
                    
                    recentOrders.forEach(order => {
                        html += `
                        <tr>
                            <td><small>${order.order_id}</small></td>
                            <td><small>${order.customer_name}</small></td>
                            <td><small>${formatPrice(order.total)}</small></td>
                        </tr>`;
                    });
                    
                    html += `
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="table-card">
            <h6 class="mb-3">Quick Actions</h6>
            <div class="row g-2">
                <div class="col-6">
                    <a href="/admin/orders" class="btn btn-primary w-100 py-2">
                        <i class="fas fa-shopping-cart"></i> Orders
                    </a>
                </div>
                <div class="col-6">
                    <a href="/admin/products" class="btn btn-success w-100 py-2">
                        <i class="fas fa-box"></i> Products
                    </a>
                </div>
                <div class="col-6">
                    <a href="/" target="_blank" class="btn btn-info w-100 py-2">
                        <i class="fas fa-eye"></i> View Site
                    </a>
                </div>
                <div class="col-6">
                    <a href="/admin/export" class="btn btn-warning w-100 py-2">
                        <i class="fas fa-download"></i> Export
                    </a>
                </div>
            </div>
        </div>
    </div>

    <div class="admin-nav d-flex justify-content-around">
        <a href="/admin/dashboard" class="nav-btn active">
            <i class="fas fa-tachometer-alt"></i>
            <span>Dashboard</span>
        </a>
        <a href="/admin/orders" class="nav-btn">
            <i class="fas fa-shopping-cart"></i>
            <span>Orders</span>
        </a>
        <a href="/admin/products" class="nav-btn">
            <i class="fas fa-box"></i>
            <span>Products</span>
        </a>
        <a href="/admin/export" class="nav-btn">
            <i class="fas fa-download"></i>
            <span>Export</span>
        </a>
        <a href="/admin-logout" class="nav-btn">
            <i class="fas fa-sign-out-alt"></i>
            <span>Logout</span>
        </a>
    </div>
</body>
</html>`;
                    
                    res.send(html);
                });
            });
        });
    });
});

// Other admin routes (simplified for mobile)
app.get('/admin/orders', requireAuth, (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 20", (err, orders) => {
        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orders - Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .order-card{background:white;border-radius:10px;padding:15px;margin-bottom:10px;box-shadow:0 2px 5px rgba(0,0,0,0.1);}
    </style>
</head>
<body>
    <div class="container py-4">
        <h4>Orders Management</h4>
        ${orders.map(order => `
        <div class="order-card">
            <div class="d-flex justify-content-between">
                <strong>${order.order_id}</strong>
                <span class="badge bg-${order.status === 'pending' ? 'warning' : order.status === 'delivered' ? 'success' : 'info'}">${order.status}</span>
            </div>
            <div>${order.customer_name} - ${order.phone}</div>
            <div>${order.product_name} x ${order.quantity}</div>
            <div class="text-end fw-bold">${formatPrice(order.total)}</div>
        </div>
        `).join('')}
        <a href="/admin/dashboard" class="btn btn-secondary mt-3">Back</a>
    </div>
</body>
</html>`;
        res.send(html);
    });
});

app.get('/admin/export', requireAuth, (req, res) => {
    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Export - Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .export-btn{background:#28a745;color:white;border:none;padding:15px;border-radius:8px;margin:10px0;width:100%;}
    </style>
</head>
<body>
    <div class="container py-4">
        <h4>Export Data</h4>
        <button class="export-btn" onclick="exportData('orders')">Export Orders</button>
        <button class="export-btn" onclick="exportData('products')">Export Products</button>
        <a href="/admin/dashboard" class="btn btn-secondary w-100 mt-3">Back</a>
    </div>
    <script>
        function exportData(type) {
            alert('Exporting ' + type + '...');
            window.location.href = '/api/export/' + type;
        }
    </script>
</body>
</html>`;
    res.send(html);
});

app.get('/admin-logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin-login');
});

// 404 for mobile
app.use((req, res) => {
    let html = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>পেজ পাওয়া যায়নি - ঢাকা মার্কেট</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body{font-family:'Kalpurush',sans-serif;background:#f5f5f5;padding:30px20px;text-align:center;}
        .error-icon{font-size:5rem;color:#ff6b6b;margin-bottom:20px;}
    </style>
</head>
<body>
    <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
    <h1>৪০৪</h1>
    <h3>পেজটি পাওয়া যায়নি</h3>
    <p class="mb-4">আপনি যে পেজটি খুঁজছেন তা পাওয়া যায়নি।</p>
    <a href="/" class="btn btn-primary btn-lg">
        <i class="fas fa-home"></i> হোমে ফিরে যান
    </a>
</body>
</html>`;
    res.status(404).send(html);
});

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ঢাকা মার্কেট মোবাইল ভার্সন শুরু হয়েছে!           ║
║                                                       ║
║   লিঙ্ক: http://localhost:${PORT}                    ║
║                                                       ║
║   Admin: http://localhost:${PORT}/admin-login         ║
║   Username: admin                                    ║
║   Password: admin123                                 ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);
});
