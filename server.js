const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

const config = {
  "site": {
    "title": "Hair Trimmer",
    "logo": "<i class='fas fa-store me-2'></i>Hair Trimmer",
    "admin_logo": "<i class='fas fa-chart-line me-2'></i>Admin Dashboard",
    "phone": "+৮৮০ ১৩৩০-৫১৩৭২৬",
    "whatsapp": "8801330513726",
    "currency": "BDT",
    "currency_symbol": "৳"
  },
  
  "product": {
    "name": "Hair Removal Trimmer",
    "regular_price": 1500,
    "offer_price": 999,
    "shipping": {
      "inside_dhaka": 60,
      "outside_dhaka": 100
    },
    "images": [
      "https://images.unsplash.com/photo-1596703923338-48f1c07e4f2e?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1591378603223-e15b45a81640?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&h=600&fit=crop&auto=format"
    ],
    "features": [
      "কর্ডলেস ও রিচার্জেবল - কোথাও নিয়ে যেতে সুবিধা",
      "৩টি কম্ব গার্ড (৩মিমি, ৬মিমি, ৯মিমি)",
      "২ ঘন্টা ব্যাকআপ - একবার চার্জে অনেকক্ষণ",
      "ইউএসবি টাইপ-সি চার্জিং - দ্রুত চার্জ",
      "ওয়াটারপ্রুফ ডিজাইন - ভেজা অবস্থায়ও ব্যবহার করা যায়",
      "১ বছর ওয়ারেন্টি - নিশ্চিন্তে ব্যবহার করুন",
      "হালকা ও বহনযোগ্য - ভ্রমণের জন্য উপযুক্ত",
      "আধুনিক ডিজাইন - দেখতে স্টাইলিশ"
    ]
  },
  
  "description": "Hair Removal Trimmer - আপনার ব্যক্তিগত গরমিং পার্টনার।\n\nএই ট্রিমারটি ব্যবহার করে আপনি খুব সহজে, ব্যথাহীনভাবে ও নিরাপদে অবাঞ্ছিত লোম কাটতে পারবেন। এটি প্রতিদিনের ব্যবহারে সময় বাঁচায় এবং আপনার ত্বককে সুরক্ষিত রাখে।\n\nবিশেষ সুযোগ:\nরেগুলার মূল্য ১৫০০ টাকা\nঅফার মূল্য মাত্র ৯৯৯ টাকা\n\nআমরা দিচ্ছি ১০০% অরিজিনাল পণ্য - তাই নিশ্চিন্তে অর্ডার করতে পারেন\nডেলিভারির সময় পণ্য চেক করে নিতে পারবেন\nপুরুষ ও মহিলা - উভয়ের জন্য উপযুক্ত\nবাংলাদেশের সব অঞ্চলে ক্যাশ অন ডেলিভারি\n\nবিশেষ সুবিধা:\n৭ দিনের রিটার্ন পলিসি\n১ বছর ওয়ারেন্টি\n২৪/৭ কাস্টমার সাপোর্ট\n২৪-৪৮ ঘন্টার মধ্যে ডেলিভারি",
  
  "reviews": [
    {
      "name": "আহমেদ রহমান",
      "profilePic": "https://randomuser.me/api/portraits/men/1.jpg",
      "date": "২ দিন আগে",
      "rating": "★★★★★",
      "text": "অসাধারণ পণ্য! ২ দিনের মধ্যে পেয়ে গেছি। কোয়ালিটি একদম ফার্স্ট ক্লাস। ব্যাটারি ব্যাকআপ অনেক ভালো। সত্যিই ওয়াটারপ্রুফ - ভেজা অবস্থায়ও ব্যবহার করেছি।"
    },
    {
      "name": "ফারহানা আক্তার",
      "profilePic": "https://randomuser.me/api/portraits/women/2.jpg",
      "date": "১ সপ্তাহ আগে",
      "rating": "★★★★★",
      "text": "খুবই ভালো লেগেছে এই ট্রিমারটা। হালকা ও বহনযোগ্য, ভ্রমণের জন্য পারফেক্ট। আমার চেহারার লোম খুব সাবলীলভাবে কাটতে পারছি। ব্যথা একদম নেই।"
    },
    {
      "name": "করিম উদ্দিন",
      "profilePic": "https://randomuser.me/api/portraits/men/3.jpg",
      "date": "৩ দিন আগে",
      "rating": "★★★★★",
      "text": "Type-C চার্জিং সিস্টেমের জন্য অনেক ধন্যবাদ। দ্রুত চার্জ হয় এবং ব্যাকআপ অনেক ভালো। ৩টি কম্ব গার্ড দিয়ে আসায় ভিন্ন ভিন্ন লেংথে কাটতে পারছি।"
    }
  ],
  
  "admin": {
    "username": "admin",
    "password": "admin123"
  },
  
  "server": {
    "port": 3000,
    "order_prefix": "HT"
  }
};

const PORT = config.server.port || 3000;
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run(`CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        offer_price REAL,
        images TEXT,
        description TEXT,
        features TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        phone TEXT,
        address TEXT,
        shipping_area TEXT,
        quantity INTEGER DEFAULT 1,
        total REAL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
    
    db.run(`INSERT INTO admin_users (username, password) VALUES ('${config.admin.username}', '${config.admin.password}')`);
    
    const sampleOrders = [
        ['রহিম', '01712345678', 'মোহাম্মদপুর, ঢাকা', 'inside_dhaka', 1, config.product.offer_price + config.product.shipping.inside_dhaka, 'completed'],
        ['করিম', '01876543210', 'মিরপুর, ঢাকা', 'inside_dhaka', 2, (config.product.offer_price * 2) + config.product.shipping.inside_dhaka, 'processing']
    ];
    
    const product = [
        config.product.name,
        config.product.regular_price,
        config.product.offer_price,
        JSON.stringify(config.product.images),
        config.description,
        JSON.stringify(config.product.features)
    ];
    
    const stmt = db.prepare("INSERT INTO products (name, price, offer_price, images, description, features) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(product);
    stmt.finalize();
    
    const orderStmt = db.prepare("INSERT INTO orders (customer_name, phone, address, shipping_area, quantity, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
    sampleOrders.forEach(order => orderStmt.run(order));
    orderStmt.finalize();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function formatPrice(price) {
    return config.site.currency_symbol + price.toLocaleString('en-IN');
}

function generateHTML(title, content) {
    return `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${config.site.title}</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Kalpurush&display=swap" rel="stylesheet">
    
    <style>
        body {
            font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;
            background: #f8f9fa;
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .offer-banner {
            background: linear-gradient(45deg, #ff0000, #ff6b6b);
            color: white;
            padding: 15px 0;
            text-align: center;
            font-weight: 700;
            font-size: 1.2rem;
            border-bottom: 3px solid #fff;
        }
        
        .navbar-market {
            background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%);
            padding: 15px 0;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .nav-brand {
            font-size: 1.8rem;
            font-weight: 700;
            color: white;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
        }
        
        .dynamic-offer {
            background: #000;
            padding: 25px;
            border-radius: 10px;
            margin: 20px auto;
            max-width: 500px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        }
        
        .dynamic-offer .regular-price {
            color: #aaa;
            font-size: 1rem;
            margin-bottom: 10px;
        }
        
        .dynamic-offer .crossed-price {
            text-decoration: line-through;
            color: #ff6b6b;
            font-weight: bold;
        }
        
        .dynamic-offer .offer-text {
            color: white;
            font-size: 1.5rem;
            font-weight: bold;
            margin: 15px 0;
        }
        
        .dynamic-offer .price-circle {
            display: inline-block;
            background: #2ecc71;
            color: white;
            padding: 5px 15px;
            border-radius: 50px;
            font-size: 1.8rem;
            border: 3px solid #fff;
        }
        
        .dynamic-offer .order-btn {
            background: white;
            color: black;
            font-weight: bold;
            padding: 12px 30px;
            border-radius: 50px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 1.2rem;
            margin-top: 15px;
            transition: all 0.3s;
        }
        
        .dynamic-offer .order-btn:hover {
            transform: scale(1.05);
        }
        
        .product-container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            overflow: hidden;
            margin: 20px auto;
            max-width: 1200px;
        }
        
        .product-image-section {
            padding: 20px;
            background: #f8f9fa;
        }
        
        .product-image {
            width: 100%;
            max-height: 500px;
            object-fit: contain;
            border-radius: 10px;
        }
        
        .product-info-section {
            padding: 25px;
        }
        
        .product-title {
            font-size: 2.2rem;
            font-weight: 800;
            color: #2c3e50;
            margin-bottom: 15px;
        }
        
        .price-box {
            background: linear-gradient(45deg, #667eea, #764ba2);
            padding: 20px;
            border-radius: 10px;
            color: white;
            margin: 20px 0;
        }
        
        .old-price {
            font-size: 1.5rem;
            text-decoration: line-through;
            opacity: 0.8;
        }
        
        .current-price {
            font-size: 3rem;
            font-weight: 900;
            margin: 10px 0;
        }
        
        .save-badge {
            background: #ff4757;
            color: white;
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.2rem;
            display: inline-block;
            margin-top: 10px;
        }
        
        .features-list {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .feature-item {
            padding: 10px;
            background: white;
            border-radius: 8px;
            margin: 8px 0;
            border-left: 4px solid #667eea;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .feature-icon {
            color: #667eea;
            font-size: 1.2rem;
        }
        
        .description-box {
            background: #f0f8ff;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            line-height: 1.8;
            font-size: 1.1rem;
        }
        
        .checkout-form {
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin: 25px 0;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .form-label {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 8px;
            display: block;
        }
        
        .form-control-custom {
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 12px 15px;
            font-size: 1.1rem;
            width: 100%;
            margin-bottom: 15px;
        }
        
        .form-control-custom:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
            outline: none;
        }
        
        .shipping-option {
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 12px;
            margin: 8px 0;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .shipping-option.active {
            border-color: #28a745;
            background: rgba(40,167,69,0.05);
        }
        
        .order-summary {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #ddd;
        }
        
        .summary-total {
            font-size: 1.5rem;
            font-weight: bold;
            color: #333;
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
        }
        
        .submit-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 15px;
            font-size: 1.3rem;
            font-weight: bold;
            border-radius: 8px;
            width: 100%;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .submit-btn:hover {
            background: #c82333;
            transform: translateY(-3px);
        }
        
        .review-card {
            background: white;
            border-radius: 10px;
            padding: 15px;
            margin: 10px 0;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
            border-left: 4px solid #007bff;
        }
        
        .review-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .review-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
        }
        
        .review-name {
            font-weight: bold;
            color: #333;
        }
        
        .review-date {
            color: #666;
            font-size: 0.9rem;
        }
        
        .review-rating {
            color: #ffc107;
        }
        
        .whatsapp-float {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #25D366;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(37,211,102,0.3);
            text-decoration: none;
        }
        
        .live-notification {
            position: fixed;
            bottom: 100px;
            right: 30px;
            background: white;
            border-left: 5px solid #28a745;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.5s;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @media (max-width: 768px) {
            .product-title {
                font-size: 1.8rem;
            }
            
            .current-price {
                font-size: 2.5rem;
            }
            
            .product-info-section, .product-image-section {
                padding: 15px;
            }
            
            .whatsapp-float {
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                font-size: 25px;
            }
        }
    </style>
</head>
<body>
    <div class="offer-banner">
        <i class="fas fa-bolt me-2"></i>স্পেশাল অফার! সীমিত সময়ের জন্য
    </div>
    
    <nav class="navbar navbar-market">
        <div class="container">
            <div class="d-flex justify-content-between align-items-center w-100">
                <div class="nav-brand">
                    <i class="fas fa-cut me-2"></i>হেয়ার ট্রিমার
                </div>
                <a href="/admin-login" class="btn btn-outline-light btn-sm">
                    <i class="fas fa-user-shield me-1"></i>এডমিন
                </a>
            </div>
        </div>
    </nav>
    
    <div class="container mt-3">
        <div class="dynamic-offer">
            <div class="regular-price">
                ১ পিসের রেগুলার মূল্য 
                <span class="crossed-price">৳${config.product.regular_price}</span>
            </div>
            
            <div class="offer-text">
                ১ পিসের অফার মূল্য 
                <span class="price-circle">৳${config.product.offer_price}</span>
            </div>

            <a href="#orderForm" class="order-btn" onclick="scrollToOrder()">
                <i class="fas fa-shopping-cart"></i> অর্ডার করতে ক্লিক করুন
            </a>
        </div>
    </div>
    
    ${content}
    
    <a href="https://wa.me/${config.site.whatsapp}" class="whatsapp-float" target="_blank">
        <i class="fab fa-whatsapp"></i>
    </a>

    <div id="liveNotification" class="live-notification d-none">
        <button type="button" class="btn-close float-end" onclick="hideNotification()"></button>
        <h6><i class="fas fa-bell text-success me-2"></i>নতুন অর্ডার!</h6>
        <p id="notificationText" class="mb-1 fw-bold"></p>
        <small class="text-muted"><i class="fas fa-clock me-1"></i>এক্ষুনি</small>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function scrollToOrder() {
            document.getElementById('orderForm').scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
        
        let notificationCount = 0;
        
        function showNotification(name, product) {
            notificationCount++;
            document.getElementById('notificationText').textContent = name + ' অর্ডার করেছেন ' + product;
            document.getElementById('liveNotification').classList.remove('d-none');
            
            setTimeout(() => {
                document.getElementById('liveNotification').classList.add('d-none');
            }, 5000);
        }
        
        function hideNotification() {
            document.getElementById('liveNotification').classList.add('d-none');
        }
        
        setInterval(() => {
            const names = ['রহিম', 'করিম', 'সাদিয়া', 'নাসরিন', 'জাহিদ', 'ফারহানা'];
            const name = names[Math.floor(Math.random() * names.length)];
            showNotification(name, '${config.product.name}');
        }, 15000);
        
        function updateOrderCount() {
            const count = Math.floor(Math.random() * 50) + 100;
            document.getElementById('orderCount').textContent = count;
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            updateOrderCount();
            setInterval(updateOrderCount, 60000);
        });
    </script>
</body>
</html>`;
}

app.get('/', (req, res) => {
    db.get("SELECT * FROM products WHERE id = 1", (err, product) => {
        if (!product) {
            res.send('Product not found');
            return;
        }
        
        const images = JSON.parse(product.images || '[]');
        const features = JSON.parse(product.features || '[]');
        const discount = Math.round(((product.price - product.offer_price) / product.price) * 100);
        const shippingInsideDhaka = config.product.shipping.inside_dhaka;
        const shippingOutsideDhaka = config.product.shipping.outside_dhaka;
        
        let content = `
            <div class="container">
                <div class="product-container">
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="product-image-section">
                                <img src="${images[0]}" class="product-image" alt="Hair Trimmer">
                                <div class="row mt-3">
                                    ${images.slice(1, 5).map(img => `
                                        <div class="col-3">
                                            <img src="${img}" class="img-fluid rounded" style="cursor: pointer; height: 80px; object-fit: cover;" onclick="document.querySelector('.product-image').src='${img}'">
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-lg-6">
                            <div class="product-info-section">
                                <h1 class="product-title">${product.name}</h1>
                                
                                <div class="price-box">
                                    <div class="old-price">${formatPrice(product.price)}</div>
                                    <div class="current-price">${formatPrice(product.offer_price)}</div>
                                    <div class="save-badge">
                                        <i class="fas fa-tag me-1"></i>${discount}% সেভ করুন
                                    </div>
                                </div>
                                
                                <div class="features-list">
                                    <h5 class="mb-3"><i class="fas fa-star me-2 text-warning"></i>বিশেষ ফিচারসমূহ</h5>
                                    ${features.map(feature => `
                                        <div class="feature-item">
                                            <i class="fas fa-check feature-icon"></i>
                                            <span>${feature}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                
                                <div class="description-box">
                                    ${product.description.replace(/\n/g, '<br>')}
                                </div>
                                
                                <div class="mt-4">
                                    <h5><i class="fas fa-comments me-2 text-primary"></i>গ্রাহকদের রিভিউ</h5>
                                    ${config.reviews.map(review => `
                                        <div class="review-card">
                                            <div class="review-header">
                                                <img src="${review.profilePic}" class="review-avatar" alt="${review.name}">
                                                <div>
                                                    <div class="review-name">${review.name}</div>
                                                    <div class="review-date">${review.date}</div>
                                                    <div class="review-rating">${review.rating}</div>
                                                </div>
                                            </div>
                                            <div class="review-text">${review.text}</div>
                                        </div>
                                    `).join('')}
                                </div>
                                
                                <div class="checkout-form" id="orderForm">
                                    <h4 class="text-center mb-4"><i class="fas fa-shopping-cart me-2"></i>অর্ডার করুন</h4>
                                    
                                    <form action="/order" method="POST">
                                        <input type="hidden" name="product_name" value="${product.name}">
                                        <input type="hidden" name="product_price" value="${product.offer_price}">
                                        <input type="hidden" name="quantity" id="quantityInput" value="1">
                                        
                                        <div class="mb-3">
                                            <label class="form-label">আপনার নাম</label>
                                            <input type="text" name="customer_name" class="form-control-custom" placeholder="আপনার পূর্ণ নাম" required>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label class="form-label">মোবাইল নম্বর</label>
                                            <input type="tel" name="phone" class="form-control-custom" placeholder="01XXXXXXXXX" required>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label class="form-label">আপনার ঠিকানা</label>
                                            <textarea name="address" class="form-control-custom" rows="3" placeholder="বাড়ি নং, রাস্তা, এলাকা, জেলা" required></textarea>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label class="form-label">পরিমাণ</label>
                                            <div class="d-flex align-items-center gap-3">
                                                <button type="button" class="btn btn-outline-primary" onclick="updateQuantity(-1)">-</button>
                                                <span id="quantityDisplay" class="fw-bold">1</span>
                                                <button type="button" class="btn btn-outline-primary" onclick="updateQuantity(1)">+</button>
                                            </div>
                                        </div>
                                        
                                        <div class="mb-4">
                                            <label class="form-label">ডেলিভারি অঞ্চল</label>
                                            <div class="shipping-option active" onclick="selectShipping('outside_dhaka')">
                                                <div>
                                                    <input type="radio" name="shipping_area" value="outside_dhaka" checked>
                                                    <span class="ms-2">ঢাকার বাইরে</span>
                                                </div>
                                                <span class="fw-bold">৳${shippingOutsideDhaka}</span>
                                            </div>
                                            <div class="shipping-option" onclick="selectShipping('inside_dhaka')">
                                                <div>
                                                    <input type="radio" name="shipping_area" value="inside_dhaka">
                                                    <span class="ms-2">ঢাকার মধ্যে</span>
                                                </div>
                                                <span class="fw-bold">৳${shippingInsideDhaka}</span>
                                            </div>
                                        </div>
                                        
                                        <div class="order-summary">
                                            <h6>আপনার অর্ডার</h6>
                                            <div class="summary-item">
                                                <span>পণ্য মূল্য</span>
                                                <span id="productPrice">${formatPrice(product.offer_price)}</span>
                                            </div>
                                            <div class="summary-item">
                                                <span>ডেলিভারি চার্জ</span>
                                                <span id="shippingPrice">${formatPrice(shippingOutsideDhaka)}</span>
                                            </div>
                                            <div class="summary-total">
                                                <span>মোট</span>
                                                <span id="totalPrice">${formatPrice(product.offer_price + shippingOutsideDhaka)}</span>
                                            </div>
                                        </div>
                                        
                                        <div class="alert alert-info">
                                            <i class="fas fa-info-circle me-2"></i>
                                            পণ্য হাতে পেয়ে টাকা দিবেন (ক্যাশ অন ডেলিভারি)
                                        </div>
                                        
                                        <button type="submit" class="submit-btn">
                                            <i class="fas fa-check-circle me-2"></i>অর্ডার কনফার্ম করুন
                                        </button>
                                    </form>
                                </div>
                                
                                <div class="text-center mt-4">
                                    <p class="text-muted">
                                        <i class="fas fa-shopping-cart text-success me-2"></i>
                                        <span id="orderCount">150</span> জন আজকে অর্ডার করেছেন
                                    </p>
                                    <p class="text-muted">
                                        <i class="fas fa-phone me-2"></i>সাহায্য চাইলে কল করুন: <strong>${config.site.phone}</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                let quantity = 1;
                let shippingInside = ${shippingInsideDhaka};
                let shippingOutside = ${shippingOutsideDhaka};
                let selectedShipping = 'outside_dhaka';
                let productPrice = ${product.offer_price};
                
                function updateQuantity(change) {
                    quantity += change;
                    if (quantity < 1) quantity = 1;
                    if (quantity > 5) quantity = 5;
                    
                    document.getElementById('quantityDisplay').textContent = quantity;
                    document.getElementById('quantityInput').value = quantity;
                    calculateTotal();
                }
                
                function selectShipping(area) {
                    selectedShipping = area;
                    
                    document.querySelectorAll('.shipping-option').forEach(option => {
                        option.classList.remove('active');
                        option.querySelector('input[type="radio"]').checked = false;
                    });
                    
                    if (area === 'inside_dhaka') {
                        document.querySelectorAll('.shipping-option')[1].classList.add('active');
                        document.querySelector('input[name="shipping_area"][value="inside_dhaka"]').checked = true;
                    } else {
                        document.querySelectorAll('.shipping-option')[0].classList.add('active');
                        document.querySelector('input[name="shipping_area"][value="outside_dhaka"]').checked = true;
                    }
                    
                    calculateTotal();
                }
                
                function calculateTotal() {
                    const shippingCost = selectedShipping === 'inside_dhaka' ? shippingInside : shippingOutside;
                    const subtotal = productPrice * quantity;
                    const total = subtotal + shippingCost;
                    
                    document.getElementById('productPrice').textContent = formatPrice(subtotal);
                    document.getElementById('shippingPrice').textContent = formatPrice(shippingCost);
                    document.getElementById('totalPrice').textContent = formatPrice(total);
                }
                
                function formatPrice(price) {
                    return '৳' + price.toLocaleString('en-IN');
                }
                
                document.addEventListener('DOMContentLoaded', calculateTotal);
            </script>`;
        
        res.send(generateHTML(product.name, content));
    });
});

app.post('/order', (req, res) => {
    const { customer_name, phone, address, shipping_area, quantity, product_name, product_price } = req.body;
    
    const shippingCost = shipping_area === 'inside_dhaka' ? config.product.shipping.inside_dhaka : config.product.shipping.outside_dhaka;
    const total = (parseFloat(product_price) * parseInt(quantity || 1)) + shippingCost;
    
    db.run("INSERT INTO orders (customer_name, phone, address, shipping_area, quantity, total) VALUES (?, ?, ?, ?, ?, ?)",
        [customer_name, phone, address, shipping_area, quantity, total], 
        function(err) {
            if (err) {
                res.send('Error placing order');
            } else {
                const orderId = this.lastID;
                
                let content = `
                    <div class="container mt-5">
                        <div class="row justify-content-center">
                            <div class="col-md-8">
                                <div class="text-center">
                                    <i class="fas fa-check-circle fa-5x text-success mb-4"></i>
                                    <h1 class="text-success">অর্ডার সফল!</h1>
                                    <h4 class="mb-4">ধন্যবাদ ${customer_name} সাহেব/ম্যাডাম</h4>
                                    
                                    <div class="card border-success mb-4">
                                        <div class="card-header bg-success text-white">
                                            <h5 class="mb-0"><i class="fas fa-receipt me-2"></i>অর্ডার ডিটেইলস</h5>
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-md-6 mb-3">
                                                    <strong>অর্ডার নং:</strong><br>
                                                    <h4 class="text-info">#${config.server.order_prefix}${orderId}</h4>
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <strong>পণ্য:</strong><br>
                                                    <h5>${product_name}</h5>
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <strong>পরিমাণ:</strong><br>
                                                    <h5>${quantity} টি</h5>
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <strong>ডেলিভারি:</strong><br>
                                                    <h5>${shipping_area === 'inside_dhaka' ? 'ঢাকার মধ্যে' : 'ঢাকার বাইরে'}</h5>
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <strong>মোট মূল্য:</strong><br>
                                                    <h3 class="text-success">${formatPrice(total)}</h3>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="alert alert-info">
                                        <i class="fas fa-clock me-2"></i>
                                        <strong>পরবর্তী ধাপ:</strong> আমাদের প্রতিনিধি ৩০ মিনিটের মধ্যে আপনার সাথে যোগাযোগ করবে
                                    </div>
                                    
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <a href="/" class="btn btn-primary btn-lg w-100 py-3">
                                                <i class="fas fa-home me-2"></i>হোম পেজে ফিরে যান
                                            </a>
                                        </div>
                                        <div class="col-md-6">
                                            <a href="https://wa.me/${config.site.whatsapp}?text=অর্ডার%20নং:%20${config.server.order_prefix}${orderId}" 
                                               target="_blank" class="btn btn-success btn-lg w-100 py-3">
                                                <i class="fab fa-whatsapp me-2"></i>WhatsApp এ কনফার্ম করুন
                                            </a>
                                        </div>
                                    </div>
                                    
                                    <div class="mt-4">
                                        <p><i class="fas fa-headset me-2"></i>সাহায্য চাইলে কল করুন: <strong>${config.site.phone}</strong></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
                
                res.send(generateHTML('অর্ডার কনফার্ম', content));
            }
        }
    );
});

app.get('/admin-login', (req, res) => {
    let content = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-4">
                    <div class="card shadow-lg">
                        <div class="card-body p-5">
                            <div class="text-center mb-4">
                                <i class="fas fa-user-shield fa-3x text-primary"></i>
                                <h3 class="mt-3">এডমিন লগইন</h3>
                            </div>
                            <form action="/admin-login" method="POST">
                                <div class="mb-3">
                                    <label class="form-label">ইউজারনেম</label>
                                    <input type="text" name="username" class="form-control-custom" required>
                                </div>
                                <div class="mb-4">
                                    <label class="form-label">পাসওয়ার্ড</label>
                                    <input type="password" name="password" class="form-control-custom" required>
                                </div>
                                <button type="submit" class="submit-btn">
                                    <i class="fas fa-sign-in-alt me-2"></i>লগইন করুন
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    res.send(generateHTML('এডমিন লগইন', content));
});

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM admin_users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (user) {
            res.redirect('/admin/dashboard');
        } else {
            res.send('<script>alert("ভুল ইউজারনেম বা পাসওয়ার্ড"); window.location="/admin-login";</script>');
        }
    });
});

app.get('/admin/dashboard', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        let content = `
            <div class="container mt-4">
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h5 class="card-title">মোট অর্ডার</h5>
                                <h2 class="card-text">${orders.length}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <h5 class="card-title">মোট আয়</h5>
                                <h2 class="card-text">${formatPrice(orders.reduce((sum, order) => sum + order.total, 0))}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-white">
                            <div class="card-body">
                                <h5 class="card-title">পেন্ডিং অর্ডার</h5>
                                <h2 class="card-text">${orders.filter(o => o.status === 'pending').length}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-info text-white">
                            <div class="card-body">
                                <h5 class="card-title">আজকের অর্ডার</h5>
                                <h2 class="card-text">${orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">সব অর্ডার</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>অর্ডার নং</th>
                                        <th>গ্রাহক</th>
                                        <th>মোবাইল</th>
                                        <th>ঠিকানা</th>
                                        <th>পরিমাণ</th>
                                        <th>মূল্য</th>
                                        <th>স্ট্যাটাস</th>
                                        <th>তারিখ</th>
                                    </tr>
                                </thead>
                                <tbody>`;
        
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleString('bn-BD');
            const statusBadge = order.status === 'completed' ? 'bg-success' : 
                               order.status === 'processing' ? 'bg-primary' : 
                               order.status === 'shipped' ? 'bg-info' : 'bg-warning';
            
            content += `
                <tr>
                    <td>#${config.server.order_prefix}${order.id}</td>
                    <td>${order.customer_name}</td>
                    <td>${order.phone}</td>
                    <td>${order.address}</td>
                    <td>${order.quantity}</td>
                    <td>${formatPrice(order.total)}</td>
                    <td><span class="badge ${statusBadge}">${order.status}</span></td>
                    <td>${date}</td>
                </tr>`;
        });
        
        content += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="mt-3">
                    <a href="/" class="btn btn-primary">
                        <i class="fas fa-store me-2"></i>স্টোর ফিরে যান
                    </a>
                </div>
            </div>`;
        
        res.send(generateHTML('এডমিন ড্যাশবোর্ড', content));
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
