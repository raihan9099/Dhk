const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

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
    
    db.run(`INSERT INTO admin_users (username, password) VALUES ('admin', 'admin123')`);
    
    const product = [
        'Hair Trimmer Pro Max',
        1500,
        999,
        JSON.stringify([
            'https://images.unsplash.com/photo-1598490960012-7f5d5a43d5b8?w=600&h=600&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1591378603223-e15b45a81640?w=600&h=600&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&h=600&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=600&fit=crop&auto=format'
        ]),
        'এই ট্রিমার ব্যবহার করে অবাঞ্ছিত লোম কাটতে পারবেন খুব সহজে, ব্যাথাহীনভাবে ও নিরাপদে। এটি প্রতিদিনের ব্যবহারে সময় বাঁচায়, স্কিন সেফ রাখে। রেগুলার মূল্য ৯৮০ টাকা, অফার মূল্য মাত্র ৬৮০ টাকা। আমরা দিচ্ছি অরিজিনাল পণ্যটি, তাই নিশ্চিন্তে অর্ডার করতে পারেন। আমাদের পণ্য চেক করে নিতে পারবেন। পুরুষ, মহিলা উভয়ের জন্য উপযুক্ত।',
        JSON.stringify([
            'Cordless & Rechargeable',
            '3 Comb Guards (3mm, 6mm, 9mm)',
            '2 Hours Battery Backup',
            'USB Type-C Charging',
            'Waterproof Design',
            '1 Year Warranty'
        ])
    ];
    
    const stmt = db.prepare("INSERT INTO products (name, price, offer_price, images, description, features) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(product);
    stmt.finalize();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function formatPrice(price) {
    return '৳' + price.toLocaleString('en-IN');
}

function generateHTML(title, content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            --gold-gradient: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
            --premium-bg: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
            --dark-bg: #0a0e17;
            --light-bg: #f8f9fa;
            --accent-color: #ff6b6b;
            --success-color: #1dd1a1;
            --warning-color: #feca57;
            --info-color: #54a0ff;
        }
        
        body { 
            font-family: 'Poppins', 'Segoe UI', sans-serif; 
            background: var(--premium-bg);
            color: #fff;
            min-height: 100vh;
        }
        
        .navbar {
            background: rgba(15, 32, 39, 0.95);
            backdrop-filter: blur(10px);
            border-bottom: 2px solid rgba(255, 107, 107, 0.3);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }
        
        .navbar-brand {
            font-family: 'Montserrat', sans-serif;
            font-weight: 800;
            font-size: 1.8rem;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
        }
        
        .product-slider-container {
            position: relative;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
            border: 3px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
        }
        
        .product-slider { 
            height: 500px; 
        }
        
        .product-slider img { 
            width: 100%; 
            height: 100%; 
            object-fit: cover;
            transition: transform 0.5s ease;
        }
        
        .swiper-slide-active img {
            transform: scale(1.05);
        }
        
        .swiper-button-next, .swiper-button-prev {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
        }
        
        .swiper-button-next:after, .swiper-button-prev:after {
            font-size: 20px;
            font-weight: bold;
        }
        
        .swiper-button-next:hover, .swiper-button-prev:hover {
            background: var(--primary-gradient);
            transform: scale(1.1);
        }
        
        .swiper-pagination-bullet {
            background: rgba(255, 255, 255, 0.5);
            width: 12px;
            height: 12px;
            opacity: 0.7;
        }
        
        .swiper-pagination-bullet-active {
            background: var(--primary-gradient);
            opacity: 1;
            transform: scale(1.2);
        }
        
        .order-now-btn { 
            background: var(--secondary-gradient);
            color: white;
            font-weight: 800;
            font-size: 1.3rem;
            padding: 20px 40px;
            border-radius: 15px;
            border: none;
            box-shadow: 0 10px 30px rgba(245, 87, 108, 0.5);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            letter-spacing: 1px;
            text-transform: uppercase;
            position: relative;
            overflow: hidden;
        }
        
        .order-now-btn:before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: 0.5s;
        }
        
        .order-now-btn:hover:before {
            left: 100%;
        }
        
        .order-now-btn:hover {
            transform: translateY(-5px) scale(1.05);
            box-shadow: 0 15px 40px rgba(245, 87, 108, 0.8);
        }
        
        .live-order-notification {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-left: 5px solid var(--success-color);
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            animation: slideInRight 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 350px;
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .feature-list li {
            padding: 15px 20px;
            margin: 8px 0;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            border-left: 4px solid var(--info-color);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            backdrop-filter: blur(5px);
        }
        
        .feature-list li:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(10px);
            border-left: 4px solid var(--success-color);
        }
        
        .price-tag {
            background: var(--gold-gradient);
            color: white;
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 15px 40px rgba(246, 211, 101, 0.4);
            border: 3px solid rgba(255, 255, 255, 0.2);
            position: relative;
            overflow: hidden;
        }
        
        .price-tag:before {
            content: 'HOT DEAL';
            position: absolute;
            top: 10px;
            right: -30px;
            background: var(--accent-color);
            color: white;
            padding: 5px 40px;
            transform: rotate(45deg);
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        
        .description-box {
            max-height: 300px;
            overflow-y: auto;
            padding: 25px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }
        
        .description-box::-webkit-scrollbar {
            width: 8px;
        }
        
        .description-box::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
        }
        
        .description-box::-webkit-scrollbar-thumb {
            background: var(--primary-gradient);
            border-radius: 10px;
        }
        
        .admin-table {
            font-size: 0.9rem;
        }
        
        .footer {
            background: rgba(10, 14, 23, 0.95);
            color: white;
            padding: 40px 0;
            margin-top: 80px;
            border-top: 2px solid rgba(255, 107, 107, 0.3);
        }
        
        .whatsapp-btn {
            position: fixed;
            bottom: 100px;
            right: 30px;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            color: white;
            width: 70px;
            height: 70px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 35px;
            z-index: 9998;
            box-shadow: 0 10px 30px rgba(37, 211, 102, 0.5);
            transition: all 0.3s ease;
            animation: pulse 2s infinite;
            border: 3px solid white;
        }
        
        .whatsapp-btn:hover {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 15px 40px rgba(37, 211, 102, 0.7);
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 10px 30px rgba(37, 211, 102, 0.5); }
            50% { box-shadow: 0 10px 40px rgba(37, 211, 102, 0.8); }
            100% { box-shadow: 0 10px 30px rgba(37, 211, 102, 0.5); }
        }
        
        .countdown {
            background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            font-weight: bold;
            text-align: center;
            font-size: 1.2rem;
            letter-spacing: 2px;
            box-shadow: 0 10px 30px rgba(255, 65, 108, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            transition: all 0.4s ease;
            color: white;
        }
        
        .card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
            border-color: rgba(255, 107, 107, 0.3);
        }
        
        .card-header {
            background: rgba(255, 255, 255, 0.1);
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            letter-spacing: 1px;
        }
        
        .form-control, .form-select, textarea.form-control {
            background: rgba(255, 255, 255, 0.08);
            border: 2px solid rgba(255, 255, 255, 0.1);
            color: white;
            border-radius: 12px;
            padding: 12px 20px;
            transition: all 0.3s ease;
        }
        
        .form-control:focus, .form-select:focus, textarea.form-control:focus {
            background: rgba(255, 255, 255, 0.12);
            border-color: var(--info-color);
            box-shadow: 0 0 0 3px rgba(84, 160, 255, 0.2);
            color: white;
        }
        
        .form-control::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .alert {
            background: rgba(255, 255, 255, 0.08);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        
        .table {
            color: white;
        }
        
        .table-dark {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .table-hover tbody tr:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: scale(1.01);
        }
        
        .progress {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            height: 25px;
        }
        
        .progress-bar {
            background: var(--primary-gradient);
            border-radius: 10px;
        }
        
        .badge {
            padding: 8px 15px;
            border-radius: 10px;
            font-weight: 600;
            letter-spacing: 1px;
        }
        
        .container {
            max-width: 1400px;
        }
        
        .order-summary-table {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        .order-summary-table td, .order-summary-table th {
            border-color: rgba(255, 255, 255, 0.1);
            padding: 15px;
        }
        
        .floating-label {
            position: relative;
            margin-bottom: 25px;
        }
        
        .floating-label label {
            position: absolute;
            top: -10px;
            left: 15px;
            background: var(--dark-bg);
            padding: 0 10px;
            font-size: 12px;
            color: var(--info-color);
            font-weight: 600;
            letter-spacing: 1px;
        }
        
        .stat-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            padding: 25px;
            text-align: center;
            border: 2px solid rgba(255, 255, 255, 0.1);
            transition: all 0.4s ease;
            height: 100%;
        }
        
        .stat-card:hover {
            transform: translateY(-10px);
            border-color: var(--accent-color);
            box-shadow: 0 15px 40px rgba(255, 107, 107, 0.2);
        }
        
        .stat-card i {
            font-size: 3rem;
            margin-bottom: 20px;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .glass-effect {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
        }
        
        .btn-primary {
            background: var(--primary-gradient);
            border: none;
            border-radius: 12px;
            padding: 12px 30px;
            font-weight: 600;
            letter-spacing: 1px;
            transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }
        
        .btn-success {
            background: linear-gradient(135deg, #1dd1a1 0%, #10ac84 100%);
            border: none;
            border-radius: 12px;
            padding: 12px 30px;
            font-weight: 600;
            letter-spacing: 1px;
            transition: all 0.3s ease;
        }
        
        .btn-success:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(29, 209, 161, 0.4);
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
            border: none;
            border-radius: 12px;
            padding: 12px 30px;
            font-weight: 600;
            letter-spacing: 1px;
            transition: all 0.3s ease;
        }
        
        .btn-danger:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(255, 107, 107, 0.4);
        }
        
        .shipping-option {
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .shipping-option:hover, .shipping-option.active {
            background: rgba(84, 160, 255, 0.2);
            border-color: var(--info-color);
            transform: translateX(10px);
        }
        
        .quantity-selector {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 15px;
            border: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        .quantity-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--primary-gradient);
            color: white;
            border: none;
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .quantity-btn:hover {
            transform: scale(1.1);
        }
        
        .quantity-display {
            font-size: 1.5rem;
            font-weight: bold;
            min-width: 50px;
            text-align: center;
        }
        
        .product-highlight {
            position: relative;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            margin-bottom: 20px;
            border-left: 4px solid var(--success-color);
        }
        
        .product-highlight:before {
            content: '✨';
            position: absolute;
            top: -10px;
            right: -10px;
            font-size: 1.5rem;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark fixed-top">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-crown me-2"></i>Premium Store
            </a>
            <div class="navbar-nav ms-auto">
                <a href="/admin-login" class="nav-link"><i class="fas fa-user-shield me-2"></i>Admin Dashboard</a>
            </div>
        </div>
    </nav>

    ${content}

    <div class="whatsapp-btn">
        <a href="https://wa.me/8801330513726" target="_blank" style="color: white;">
            <i class="fab fa-whatsapp"></i>
        </a>
    </div>

    <div id="liveNotification" class="live-order-notification d-none">
        <button type="button" class="btn-close btn-close-white float-end" onclick="hideNotification()"></button>
        <h6><i class="fas fa-gift text-warning me-2"></i> New Order Alert!</h6>
        <p id="notificationText" class="mb-1 fw-bold"></p>
        <small class="text-light"><i class="fas fa-clock me-1"></i>Just now from <span id="notificationCity"></span></small>
    </div>

    <footer class="footer">
        <div class="container text-center">
            <div class="row justify-content-center">
                <div class="col-md-8">
                    <h4 class="mb-4" style="background: var(--gold-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">Premium Shopping Experience</h4>
                    <p class="mb-3"><i class="fas fa-shield-alt me-2 text-warning"></i>100% Secure Payment | <i class="fas fa-truck me-2 text-info"></i>Fast Delivery | <i class="fas fa-headset me-2 text-success"></i>24/7 Support</p>
                    <p class="mb-2"><i class="fas fa-phone me-2"></i> +880 1330-513726 | <i class="fas fa-envelope me-2"></i> premium@dhakamarket.com</p>
                    <p class="mb-4">Dhaka, Bangladesh | Cash on Delivery Available Nationwide</p>
                    <p class="text-light opacity-75">&copy; 2024 Premium Store. All rights reserved. Crafted with <i class="fas fa-heart text-danger"></i> for Bangladesh</p>
                </div>
            </div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/gsap.min.js"></script>
    <script>
        let notificationCount = 0;
        
        function showNotification(name, product, city) {
            notificationCount++;
            document.getElementById('notificationText').textContent = name + ' ordered ' + product;
            document.getElementById('notificationCity').textContent = city;
            document.getElementById('liveNotification').classList.remove('d-none');
            
            gsap.from('#liveNotification', {
                x: 100,
                opacity: 0,
                duration: 0.6,
                ease: "back.out(1.7)"
            });
            
            setTimeout(() => {
                gsap.to('#liveNotification', {
                    x: 100,
                    opacity: 0,
                    duration: 0.5,
                    onComplete: () => {
                        document.getElementById('liveNotification').classList.add('d-none');
                    }
                });
            }, 5000);
        }
        
        function hideNotification() {
            gsap.to('#liveNotification', {
                x: 100,
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    document.getElementById('liveNotification').classList.add('d-none');
                }
            });
        }
        
        if (window.location.pathname === '/') {
            setInterval(() => {
                const names = ['রহিম', 'করিম', 'সাদিয়া', 'নাসরিন', 'জাহিদ', 'ফারহানা'];
                const name = names[Math.floor(Math.random() * names.length)];
                const cities = ['ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা'];
                const city = cities[Math.floor(Math.random() * cities.length)];
                
                showNotification(name, 'Premium Hair Trimmer', city);
            }, 15000);
            
            gsap.from('.navbar', {
                y: -100,
                opacity: 0,
                duration: 1,
                delay: 0.2
            });
            
            gsap.from('.product-slider-container', {
                scale: 0.8,
                opacity: 0,
                duration: 1,
                delay: 0.4,
                ease: "back.out(1.7)"
            });
            
            gsap.from('.price-tag', {
                y: 50,
                opacity: 0,
                duration: 1,
                delay: 0.6,
                ease: "back.out(1.7)"
            });
            
            gsap.from('.card', {
                y: 30,
                opacity: 0,
                duration: 0.8,
                delay: 0.8,
                stagger: 0.2
            });
        }
        
        if (document.querySelector('.product-swiper')) {
            const swiper = new Swiper('.product-swiper', {
                pagination: { 
                    el: '.swiper-pagination', 
                    clickable: true,
                    dynamicBullets: true 
                },
                navigation: { 
                    nextEl: '.swiper-button-next', 
                    prevEl: '.swiper-button-prev' 
                },
                autoplay: { 
                    delay: 4000, 
                    disableOnInteraction: false 
                },
                loop: true,
                effect: 'creative',
                creativeEffect: {
                    prev: {
                        shadow: true,
                        translate: [0, 0, -400],
                    },
                    next: {
                        translate: ['100%', 0, 0],
                    },
                },
                speed: 800
            });
        }
        
        function updateOrderCount() {
            const count = Math.floor(Math.random() * 50) + 150;
            document.getElementById('orderCount').textContent = count;
            
            gsap.to('#orderCount', {
                scale: 1.2,
                duration: 0.3,
                yoyo: true,
                repeat: 1
            });
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            updateOrderCount();
            setInterval(updateOrderCount, 60000);
            
            const stars = document.createElement('div');
            stars.style.position = 'fixed';
            stars.style.top = '0';
            stars.style.left = '0';
            stars.style.width = '100%';
            stars.style.height = '100%';
            stars.style.pointerEvents = 'none';
            stars.style.zIndex = '-1';
            stars.style.background = 'radial-gradient(circle at 20% 50%, rgba(41, 196, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 65, 108, 0.1) 0%, transparent 50%)';
            document.body.appendChild(stars);
            
            gsap.to(stars, {
                backgroundPosition: '100% 50%',
                duration: 20,
                repeat: -1,
                ease: "none"
            });
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
        const shippingInsideDhaka = 60;
        const shippingOutsideDhaka = 100;
        const defaultQuantity = 1;
        const defaultTotal = product.offer_price + shippingInsideDhaka;
        
        let content = `
            <div class="container mt-5 pt-5">
                <div class="row">
                    <div class="col-md-7">
                        <div class="product-slider-container mb-5">
                            <div class="swiper product-swiper">
                                <div class="swiper-wrapper">`;
        
        images.forEach(img => {
            content += `
                    <div class="swiper-slide">
                        <img src="${img}" class="img-fluid">
                    </div>`;
        });
        
        content += `</div>
                                <div class="swiper-pagination"></div>
                                <div class="swiper-button-next"></div>
                                <div class="swiper-button-prev"></div>
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <div class="countdown mb-4">
                                <i class="fas fa-bolt me-2"></i>FLASH SALE ENDS IN: 
                                <span id="countdown" class="display-6 fw-bold">23:59:59</span>
                            </div>
                            
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h4 class="mb-0"><i class="fas fa-star me-2" style="background: var(--gold-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i>Premium Benefits</h4>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="product-highlight">
                                                <h6><i class="fas fa-shipping-fast text-success me-2"></i> Premium Delivery</h6>
                                                <p class="mb-0">Doorstep delivery within 24 hours</p>
                                            </div>
                                            <div class="product-highlight">
                                                <h6><i class="fas fa-shield-alt text-warning me-2"></i> Premium Warranty</h6>
                                                <p class="mb-0">1 Year comprehensive warranty</p>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="product-highlight">
                                                <h6><i class="fas fa-headset text-info me-2"></i> VIP Support</h6>
                                                <p class="mb-0">Dedicated customer support</p>
                                            </div>
                                            <div class="product-highlight">
                                                <h6><i class="fas fa-undo text-success me-2"></i> Easy Returns</h6>
                                                <p class="mb-0">7-day hassle-free returns</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-5">
                        <div class="sticky-top" style="top: 100px;">
                            <h1 class="mb-4 fw-bold" style="font-family: 'Montserrat', sans-serif; font-size: 2.5rem;">${product.name}</h1>
                            
                            <div class="price-tag mb-4">
                                <div class="mb-3">
                                    <span class="text-light opacity-75">Regular Price:</span>
                                    <h3 class="text-decoration-line-through mb-0">${formatPrice(product.price)}</h3>
                                </div>
                                <div>
                                    <span class="text-light opacity-75">Today's Special:</span>
                                    <h1 class="display-3 fw-bold mb-3">${formatPrice(product.offer_price)}</h1>
                                </div>
                                <div class="d-flex justify-content-center gap-3">
                                    <span class="badge bg-danger px-4 py-2">${discount}% OFF</span>
                                    <span class="badge bg-warning text-dark px-4 py-2"><i class="fas fa-bolt me-1"></i>Limited Stock</span>
                                </div>
                            </div>
                            
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h4 class="mb-0"><i class="fas fa-gem me-2" style="color: #00d4ff;"></i>Premium Features</h4>
                                </div>
                                <div class="card-body">
                                    <ul class="feature-list list-unstyled">`;
        
        features.forEach(feature => {
            content += `<li><i class="fas fa-check-circle text-success me-3"></i> ${feature}</li>`;
        });
        
        content += `</ul>
                                </div>
                            </div>
                            
                            <div class="description-box mb-4">
                                <h5 class="mb-3"><i class="fas fa-info-circle me-2" style="color: #00d4ff;"></i>Product Description</h5>
                                <p class="mb-0" style="line-height: 1.8;">${product.description}</p>
                            </div>
                            
                            <div class="card mb-4">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h5 class="mb-0"><i class="fas fa-fire text-danger me-2"></i>Trending Now</h5>
                                        <span class="badge bg-danger px-3 py-2">HOT</span>
                                    </div>
                                    <div class="progress mb-2" style="height: 25px;">
                                        <div class="progress-bar" style="width: 85%">
                                            <span class="fw-bold">85% Sold Today</span>
                                        </div>
                                    </div>
                                    <p class="mb-0 text-center">
                                        <i class="fas fa-shopping-cart text-success me-2"></i>
                                        <span id="orderCount" class="fw-bold">150</span> people ordered in last 24 hours
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-5">
                    <div class="col-12">
                        <div class="card border-0 shadow-lg" style="background: rgba(255, 255, 255, 0.08);">
                            <div class="card-header" style="border-bottom: 2px solid rgba(255, 107, 107, 0.3);">
                                <h3 class="mb-0"><i class="fas fa-shopping-bag me-2" style="color: #00d4ff;"></i>Place Your Order Now</h3>
                            </div>
                            <div class="card-body p-4">
                                <form action="/order" method="POST" id="orderForm">
                                    <input type="hidden" name="product_name" value="${product.name}">
                                    <input type="hidden" name="product_price" value="${product.offer_price}">
                                    
                                    <div class="row mb-4">
                                        <div class="col-md-4">
                                            <div class="floating-label">
                                                <label for="customer_name"><i class="fas fa-user me-1"></i>আপনার নাম *</label>
                                                <input type="text" id="customer_name" name="customer_name" class="form-control form-control-lg" placeholder="আপনার পুরো নাম" required>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="floating-label">
                                                <label for="phone"><i class="fas fa-phone me-1"></i>মোবাইল নম্বর *</label>
                                                <input type="tel" id="phone" name="phone" class="form-control form-control-lg" placeholder="০১৭১২-৩৪৫৬৭৮" required>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="floating-label">
                                                <label for="quantity"><i class="fas fa-box me-1"></i>পরিমাণ *</label>
                                                <select id="quantity" name="quantity" class="form-control form-control-lg" onchange="calculateTotal()">
                                                    <option value="1">1 Piece</option>
                                                    <option value="2">2 Pieces</option>
                                                    <option value="3">3 Pieces</option>
                                                    <option value="4">4 Pieces</option>
                                                    <option value="5">5 Pieces</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-4">
                                        <div class="col-md-8">
                                            <div class="floating-label">
                                                <label for="address"><i class="fas fa-map-marker-alt me-1"></i>আপনার ঠিকানা *</label>
                                                <textarea id="address" name="address" class="form-control form-control-lg" rows="3" placeholder="বাড়ি নং, রাস্তা, এলাকা, জেলা" required></textarea>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label mb-3 d-block"><i class="fas fa-truck me-1"></i>Shipping Area *</label>
                                            <div class="shipping-option active" onclick="selectShipping('inside_dhaka')" id="insideOption">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="shipping_area" id="insideDhaka" value="inside_dhaka" checked onchange="calculateTotal()">
                                                    <label class="form-check-label d-flex justify-content-between" for="insideDhaka">
                                                        <span>ঢাকার মধ্যে</span>
                                                        <span class="fw-bold">৳${shippingInsideDhaka}</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="shipping-option" onclick="selectShipping('outside_dhaka')" id="outsideOption">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="shipping_area" id="outsideDhaka" value="outside_dhaka" onchange="calculateTotal()">
                                                    <label class="form-check-label d-flex justify-content-between" for="outsideDhaka">
                                                        <span>ঢাকার বাইরে</span>
                                                        <span class="fw-bold">৳${shippingOutsideDhaka}</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-4">
                                        <div class="col-md-6">
                                            <div class="card h-100">
                                                <div class="card-body">
                                                    <h5 class="card-title mb-3"><i class="fas fa-money-bill-wave text-success me-2"></i>Payment Method</h5>
                                                    <div class="alert alert-info mb-0">
                                                        <div class="d-flex align-items-center">
                                                            <i class="fas fa-hand-holding-usd fa-2x me-3 text-warning"></i>
                                                            <div>
                                                                <h6 class="mb-1">Cash on Delivery Only</h6>
                                                                <p class="mb-0 small">পণ্য হাতে পেয়ে টাকা দিন</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="card h-100">
                                                <div class="card-body">
                                                    <h5 class="card-title mb-3"><i class="fas fa-receipt text-info me-2"></i>Order Summary</h5>
                                                    <div class="order-summary-table">
                                                        <table class="table table-borderless mb-0">
                                                            <tbody>
                                                                <tr>
                                                                    <td>${product.name}</td>
                                                                    <td class="text-end">x 1</td>
                                                                    <td class="text-end fw-bold">${formatPrice(product.offer_price)}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td colspan="2">Shipping (ঢাকার মধ্যে)</td>
                                                                    <td id="shippingCost" class="text-end fw-bold">৳${shippingInsideDhaka}</td>
                                                                </tr>
                                                                <tr class="border-top">
                                                                    <td colspan="2"><h5 class="mb-0">Total</h5></td>
                                                                    <td class="text-end">
                                                                        <h3 id="totalAmount" class="mb-0 fw-bold" style="color: #00d4ff;">${formatPrice(defaultTotal)}</h3>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="text-center mt-4">
                                        <button type="submit" class="order-now-btn">
                                            <i class="fas fa-bolt me-2"></i>ORDER NOW - ${formatPrice(defaultTotal)}
                                        </button>
                                        <p class="mt-3 text-light opacity-75">
                                            <i class="fas fa-lock me-1"></i>আপনার তথ্য 100% নিরাপদে সংরক্ষিত হবে
                                        </p>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-5">
                    <div class="col-md-4 mb-4">
                        <div class="stat-card">
                            <i class="fas fa-gem"></i>
                            <h3>Premium Quality</h3>
                            <p class="mb-0">100% authentic products with premium quality assurance</p>
                        </div>
                    </div>
                    <div class="col-md-4 mb-4">
                        <div class="stat-card">
                            <i class="fas fa-rocket"></i>
                            <h3>Fast Delivery</h3>
                            <p class="mb-0">24-48 hours delivery across Bangladesh</p>
                        </div>
                    </div>
                    <div class="col-md-4 mb-4">
                        <div class="stat-card">
                            <i class="fas fa-shield-alt"></i>
                            <h3>Secure Shopping</h3>
                            <p class="mb-0">Your data is protected with enterprise-grade security</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                function selectShipping(area) {
                    document.getElementById('insideOption').classList.remove('active');
                    document.getElementById('outsideOption').classList.remove('active');
                    
                    if (area === 'inside_dhaka') {
                        document.getElementById('insideDhaka').checked = true;
                        document.getElementById('insideOption').classList.add('active');
                    } else {
                        document.getElementById('outsideDhaka').checked = true;
                        document.getElementById('outsideOption').classList.add('active');
                    }
                    calculateTotal();
                }
                
                function calculateTotal() {
                    const productPrice = ${product.offer_price};
                    const quantity = parseInt(document.getElementById('quantity').value);
                    const shippingInside = ${shippingInsideDhaka};
                    const shippingOutside = ${shippingOutsideDhaka};
                    
                    const isInsideDhaka = document.getElementById('insideDhaka').checked;
                    const shippingCost = isInsideDhaka ? shippingInside : shippingOutside;
                    const shippingText = isInsideDhaka ? 'ঢাকার মধ্যে' : 'ঢাকার বাইরে';
                    const total = (productPrice * quantity) + shippingCost;
                    
                    document.getElementById('shippingCost').textContent = '৳' + shippingCost;
                    document.getElementById('totalAmount').textContent = formatPrice(total);
                    
                    document.querySelector('.order-now-btn').innerHTML = '<i class="fas fa-bolt me-2"></i>ORDER NOW - ' + formatPrice(total);
                    
                    gsap.to('#totalAmount', {
                        scale: 1.2,
                        color: '#ff6b6b',
                        duration: 0.3,
                        yoyo: true,
                        repeat: 1
                    });
                }
                
                function formatPrice(price) {
                    return '৳' + price.toLocaleString('en-IN');
                }
                
                const countdownElement = document.getElementById('countdown');
                let timeLeft = 23 * 3600 + 59 * 60 + 59;
                
                function updateCountdown() {
                    const hours = Math.floor(timeLeft / 3600);
                    const minutes = Math.floor((timeLeft % 3600) / 60);
                    const seconds = timeLeft % 60;
                    
                    countdownElement.textContent = 
                        hours.toString().padStart(2, '0') + ':' +
                        minutes.toString().padStart(2, '0') + ':' +
                        seconds.toString().padStart(2, '0');
                    
                    if (timeLeft > 0) {
                        timeLeft--;
                    }
                }
                
                setInterval(updateCountdown, 1000);
                updateCountdown();
            </script>`;
        
        res.send(generateHTML(product.name, content));
    });
});

app.post('/order', (req, res) => {
    const { customer_name, phone, address, shipping_area, quantity, product_name, product_price } = req.body;
    
    const shippingCost = shipping_area === 'inside_dhaka' ? 60 : 100;
    const total = (parseFloat(product_price) * parseInt(quantity || 1)) + shippingCost;
    
    db.run("INSERT INTO orders (customer_name, phone, address, shipping_area, quantity, total) VALUES (?, ?, ?, ?, ?, ?)",
        [customer_name, phone, address, shipping_area, quantity, total], 
        function(err) {
            if (err) {
                res.send('<div class="alert alert-danger">Error placing order</div>');
            } else {
                const orderId = this.lastID;
                let content = `
                    <div class="container mt-5 pt-5">
                        <div class="row justify-content-center">
                            <div class="col-md-8">
                                <div class="card border-0 shadow-lg" style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px); border: 2px solid rgba(0, 212, 255, 0.3);">
                                    <div class="card-body text-center p-5">
                                        <div class="mb-4">
                                            <div class="position-relative d-inline-block">
                                                <i class="fas fa-check-circle text-success fa-6x"></i>
                                                <div class="position-absolute top-0 start-100 translate-middle">
                                                    <span class="badge bg-warning text-dark px-3 py-2" style="font-size: 0.9rem;">ORDER #DM${orderId}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <h1 class="card-title mb-4" style="background: linear-gradient(135deg, #00d4ff 0%, #0099ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">Order Confirmed!</h1>
                                        <p class="card-text mb-4 fs-5">Thank you <span class="fw-bold text-warning">${customer_name}</span>, your premium order has been received successfully.</p>
                                        
                                        <div class="glass-effect p-4 mb-4">
                                            <h4 class="mb-3"><i class="fas fa-receipt me-2"></i>Order Details</h4>
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <div class="text-start mb-3">
                                                        <p class="mb-1"><strong>Order Number:</strong></p>
                                                        <h5 class="text-info">#DM${orderId}</h5>
                                                    </div>
                                                    <div class="text-start mb-3">
                                                        <p class="mb-1"><strong>Product:</strong></p>
                                                        <h6 class="text-light">${product_name}</h6>
                                                    </div>
                                                    <div class="text-start mb-3">
                                                        <p class="mb-1"><strong>Quantity:</strong></p>
                                                        <h6 class="text-light">${quantity} Piece(s)</h6>
                                                    </div>
                                                </div>
                                                <div class="col-md-6">
                                                    <div class="text-start mb-3">
                                                        <p class="mb-1"><strong>Delivery:</strong></p>
                                                        <h6 class="text-light">${shipping_area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}</h6>
                                                    </div>
                                                    <div class="text-start mb-3">
                                                        <p class="mb-1"><strong>Total Amount:</strong></p>
                                                        <h3 class="text-success">${formatPrice(total)}</h3>
                                                    </div>
                                                    <div class="text-start mb-3">
                                                        <p class="mb-1"><strong>Status:</strong></p>
                                                        <span class="badge bg-warning text-dark px-3 py-2">Processing</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="alert alert-info glass-effect mb-4">
                                            <div class="d-flex">
                                                <i class="fas fa-info-circle fa-2x me-3 text-info"></i>
                                                <div class="text-start">
                                                    <h6 class="mb-2"><i class="fas fa-clock me-1"></i>Next Steps</h6>
                                                    <p class="mb-0">Our premium representative will contact you within 30 minutes for confirmation. Keep your phone nearby.</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <a href="/" class="btn btn-primary btn-lg w-100 py-3">
                                                    <i class="fas fa-shopping-bag me-2"></i>Continue Shopping
                                                </a>
                                            </div>
                                            <div class="col-md-6">
                                                <a href="https://wa.me/8801330513726?text=Hello%20I%20have%20ordered%20${encodeURIComponent(product_name)}%20Order%20ID:%20DM${orderId}" 
                                                   target="_blank" class="btn btn-success btn-lg w-100 py-3">
                                                    <i class="fab fa-whatsapp me-2"></i>Confirm on WhatsApp
                                                </a>
                                            </div>
                                        </div>
                                        
                                        <div class="mt-4">
                                            <p class="text-light opacity-75">
                                                <i class="fas fa-headset me-1"></i>Need help? Call us: +880 1330-513726
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
                res.send(generateHTML('Order Confirmed', content));
            }
        }
    );
});

app.get('/admin-login', (req, res) => {
    let content = `
        <div class="container mt-5 pt-5">
            <div class="row justify-content-center">
                <div class="col-md-5">
                    <div class="card border-0 shadow-lg glass-effect">
                        <div class="card-body p-5">
                            <div class="text-center mb-4">
                                <div class="mb-3">
                                    <i class="fas fa-user-shield fa-4x" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i>
                                </div>
                                <h2 class="fw-bold" style="font-family: 'Montserrat', sans-serif;">Premium Admin</h2>
                                <p class="text-light opacity-75">Access your premium dashboard</p>
                            </div>
                            <form action="/admin-login" method="POST">
                                <div class="mb-4">
                                    <label class="form-label fw-bold">Username</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-transparent border-end-0">
                                            <i class="fas fa-user text-light opacity-75"></i>
                                        </span>
                                        <input type="text" name="username" class="form-control border-start-0" required>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <label class="form-label fw-bold">Password</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-transparent border-end-0">
                                            <i class="fas fa-lock text-light opacity-75"></i>
                                        </span>
                                        <input type="password" name="password" class="form-control border-start-0" required>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary w-100 py-3 fw-bold">
                                    <i class="fas fa-sign-in-alt me-2"></i>Login to Dashboard
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    res.send(generateHTML('Admin Login', content));
});

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM admin_users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (user) {
            res.redirect('/admin-panel');
        } else {
            res.send('<script>Swal.fire("Access Denied", "Invalid credentials!", "error").then(() => window.location="/admin-login");</script>');
        }
    });
});

app.get('/admin-panel', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        db.get("SELECT COUNT(*) as total_orders FROM orders", (err, countResult) => {
            db.get("SELECT SUM(total) as total_revenue FROM orders WHERE status = 'completed'", (err, revenueResult) => {
                db.get("SELECT * FROM products WHERE id = 1", (err, product) => {
                    const totalOrders = countResult.total_orders || 0;
                    const totalRevenue = revenueResult.total_revenue || 0;
                    const pendingOrders = orders.filter(o => o.status === 'pending').length;
                    const today = new Date().toISOString().split('T')[0];
                    const todayOrders = orders.filter(o => o.created_at.includes(today)).length;
                    
                    let content = `
                        <div class="container-fluid mt-3 pt-5">
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <h2 class="fw-bold" style="font-family: 'Montserrat', sans-serif;">
                                    <i class="fas fa-chart-line me-2" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i>
                                    Premium Dashboard
                                </h2>
                                <div class="btn-group">
                                    <button class="btn btn-success" onclick="exportToCSV()">
                                        <i class="fas fa-file-csv me-2"></i>Export Orders
                                    </button>
                                    <a href="/admin/customers-csv" class="btn btn-info">
                                        <i class="fas fa-users me-2"></i>Export Customers
                                    </a>
                                    <a href="/" class="btn btn-primary">
                                        <i class="fas fa-store me-2"></i>View Store
                                    </a>
                                </div>
                            </div>
                            
                            <div class="row mb-4">
                                <div class="col-xl-3 col-md-6 mb-4">
                                    <div class="stat-card" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);">
                                        <i class="fas fa-shopping-cart"></i>
                                        <h2 class="display-5 fw-bold mb-2">${totalOrders}</h2>
                                        <h5>Total Orders</h5>
                                    </div>
                                </div>
                                <div class="col-xl-3 col-md-6 mb-4">
                                    <div class="stat-card" style="background: linear-gradient(135deg, rgba(29, 209, 161, 0.2) 0%, rgba(16, 172, 132, 0.2) 100%);">
                                        <i class="fas fa-money-bill-wave"></i>
                                        <h2 class="display-5 fw-bold mb-2">${formatPrice(totalRevenue)}</h2>
                                        <h5>Total Revenue</h5>
                                    </div>
                                </div>
                                <div class="col-xl-3 col-md-6 mb-4">
                                    <div class="stat-card" style="background: linear-gradient(135deg, rgba(84, 160, 255, 0.2) 0%, rgba(41, 128, 185, 0.2) 100%);">
                                        <i class="fas fa-clock"></i>
                                        <h2 class="display-5 fw-bold mb-2">${pendingOrders}</h2>
                                        <h5>Pending Orders</h5>
                                    </div>
                                </div>
                                <div class="col-xl-3 col-md-6 mb-4">
                                    <div class="stat-card" style="background: linear-gradient(135deg, rgba(246, 211, 101, 0.2) 0%, rgba(253, 160, 133, 0.2) 100%);">
                                        <i class="fas fa-calendar-day"></i>
                                        <h2 class="display-5 fw-bold mb-2">${todayOrders}</h2>
                                        <h5>Today's Orders</h5>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card glass-effect mb-4">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0 fw-bold"><i class="fas fa-list me-2"></i>All Orders</h5>
                                    <div class="text-end">
                                        <small class="text-light opacity-75">Showing ${orders.length} orders</small>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table class="table table-hover table-dark">
                                            <thead>
                                                <tr>
                                                    <th class="text-center">Order ID</th>
                                                    <th>Customer</th>
                                                    <th>Phone</th>
                                                    <th>Address</th>
                                                    <th class="text-center">Qty</th>
                                                    <th class="text-end">Amount</th>
                                                    <th>Status</th>
                                                    <th>Date</th>
                                                    <th class="text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>`;
                    
                    orders.forEach(order => {
                        const date = new Date(order.created_at);
                        const formattedDate = date.toLocaleDateString('en-BD', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        
                        const statusColors = {
                            'pending': 'warning',
                            'processing': 'info',
                            'shipped': 'primary',
                            'completed': 'success',
                            'cancelled': 'danger'
                        };
                        
                        content += `
                            <tr>
                                <td class="text-center">
                                    <span class="badge bg-dark px-3 py-2">#DM${order.id}</span>
                                </td>
                                <td>
                                    <div class="fw-bold">${order.customer_name}</div>
                                </td>
                                <td>
                                    <code>${order.phone}</code>
                                </td>
                                <td>
                                    <small class="text-light opacity-75">${order.address.substring(0, 30)}...</small>
                                </td>
                                <td class="text-center">
                                    <span class="badge bg-secondary px-3">${order.quantity}</span>
                                </td>
                                <td class="text-end fw-bold">
                                    ${formatPrice(order.total)}
                                </td>
                                <td>
                                    <select class="form-select form-select-sm border-0 bg-${statusColors[order.status]}" 
                                            style="background-color: var(--bs-${statusColors[order.status]}) !important; color: white;"
                                            onchange="updateStatus(${order.id}, this.value)">
                                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>🔄 Processing</option>
                                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>🚚 Shipped</option>
                                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                                    </select>
                                </td>
                                <td>
                                    <small>${formattedDate}</small>
                                </td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder(${order.id})" title="Delete Order">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>`;
                    });
                    
                    content += `</tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <script>
                            function updateStatus(orderId, status) {
                                fetch('/admin/update-status', {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({orderId, status})
                                }).then(() => {
                                    const statusColors = {
                                        'pending': 'warning',
                                        'processing': 'info',
                                        'shipped': 'primary',
                                        'completed': 'success',
                                        'cancelled': 'danger'
                                    };
                                    
                                    const select = event.target;
                                    select.className = 'form-select form-select-sm border-0 bg-' + statusColors[status];
                                    select.style.backgroundColor = 'var(--bs-' + statusColors[status] + ')';
                                    select.style.color = 'white';
                                    
                                    Swal.fire({
                                        icon: 'success',
                                        title: 'Status Updated!',
                                        text: 'Order status has been updated successfully.',
                                        timer: 2000,
                                        showConfirmButton: false
                                    });
                                });
                            }
                            
                            function deleteOrder(orderId) {
                                Swal.fire({
                                    title: 'Are you sure?',
                                    text: "You won't be able to revert this!",
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#ff6b6b',
                                    cancelButtonColor: '#6c757d',
                                    confirmButtonText: 'Yes, delete it!'
                                }).then((result) => {
                                    if (result.isConfirmed) {
                                        fetch('/admin/delete-order/' + orderId, {method: 'DELETE'})
                                            .then(() => {
                                                Swal.fire(
                                                    'Deleted!',
                                                    'Order has been deleted.',
                                                    'success'
                                                ).then(() => location.reload());
                                            });
                                    }
                                });
                            }
                            
                            function exportToCSV() {
                                const csvContent = "data:text/csv;charset=utf-8," 
                                    + "Order ID,Customer Name,Phone,Address,Shipping Area,Quantity,Total,Status,Order Date\\n"
                                    + ${orders.map(order => 
                                        `"#DM${order.id}","${order.customer_name}","${order.phone}","${order.address.replace(/"/g, '""')}","${order.shipping_area}","${order.quantity}","${order.total}","${order.status}","${new Date(order.created_at).toLocaleString()}"`
                                    ).join("\\n")};
                                
                                const encodedUri = encodeURI(csvContent);
                                const link = document.createElement("a");
                                link.setAttribute("href", encodedUri);
                                link.setAttribute("download", "premium_orders_${new Date().toISOString().split('T')[0]}.csv");
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Exported!',
                                    text: 'CSV file has been downloaded.',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            }
                            
                            document.addEventListener('DOMContentLoaded', () => {
                                gsap.from('.stat-card', {
                                    y: 50,
                                    opacity: 0,
                                    duration: 0.8,
                                    stagger: 0.2,
                                    ease: "back.out(1.2)"
                                });
                            });
                        </script>
                        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>`;
                    
                    res.send(generateHTML('Admin Panel', content));
                });
            });
        });
    });
});

app.get('/admin/customers-csv', (req, res) => {
    db.all(`SELECT 
                o.id as order_id,
                o.customer_name,
                o.phone,
                o.address,
                o.shipping_area,
                o.quantity,
                o.total,
                o.status,
                o.created_at,
                p.name as product_name,
                p.offer_price as product_price,
                p.description as product_description
            FROM orders o
            CROSS JOIN products p
            WHERE p.id = 1
            ORDER BY o.created_at DESC`, (err, rows) => {
        if (err) {
            res.status(500).send('Error generating CSV');
            return;
        }
        
        let csv = 'Order ID,Customer Name,Phone,Address,Shipping Area,Quantity,Total,Status,Order Date,Product Name,Product Price,Product Description\n';
        
        rows.forEach(row => {
            const rowData = [
                `#DM${row.order_id}`,
                `"${row.customer_name}"`,
                `"${row.phone}"`,
                `"${row.address}"`,
                row.shipping_area,
                row.quantity,
                row.total,
                row.status,
                `"${new Date(row.created_at).toLocaleString()}"`,
                `"${row.product_name}"`,
                row.product_price,
                `"${row.product_description.replace(/"/g, '""')}"`
            ];
            csv += rowData.join(',') + '\n';
        });
        
        res.header('Content-Type', 'text/csv');
        res.attachment(`premium_customers_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    });
});

app.post('/admin/update-status', (req, res) => {
    const { orderId, status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
    res.json({ success: true });
});

app.delete('/admin/delete-order/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM orders WHERE id = ?", [id]);
    res.json({ success: true });
});

app.get('/orders', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        let content = `
            <div class="container mt-5 pt-5">
                <div class="card glass-effect">
                    <div class="card-header">
                        <h3 class="mb-0"><i class="fas fa-history me-2"></i>Order History</h3>
                    </div>
                    <div class="card-body">`;
        
        if (orders.length === 0) {
            content += `<div class="alert alert-info text-center py-5">
                            <i class="fas fa-box-open fa-3x mb-3 opacity-50"></i>
                            <h4>No orders found</h4>
                            <p class="mb-0">No orders have been placed yet.</p>
                        </div>`;
        } else {
            content += `<div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Phone</th>
                                        <th>Address</th>
                                        <th class="text-center">Qty</th>
                                        <th class="text-end">Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>`;
            
            orders.forEach(order => {
                const date = new Date(order.created_at).toLocaleDateString('en-BD', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                });
                const statusClass = order.status === 'completed' ? 'bg-success' : 
                                   order.status === 'pending' ? 'bg-warning' : 
                                   order.status === 'processing' ? 'bg-info' : 'bg-secondary';
                
                content += `
                    <tr>
                        <td><span class="badge bg-dark">#DM${order.id}</span></td>
                        <td class="fw-bold">${order.customer_name}</td>
                        <td><code>${order.phone}</code></td>
                        <td><small class="text-light opacity-75">${order.address.substring(0, 25)}...</small></td>
                        <td class="text-center"><span class="badge bg-secondary">${order.quantity}</span></td>
                        <td class="text-end fw-bold">${formatPrice(order.total)}</td>
                        <td><span class="badge ${statusClass}">${order.status}</span></td>
                        <td><small>${date}</small></td>
                    </tr>`;
            });
            
            content += `</tbody></table></div>`;
        }
        
        content += `<div class="mt-4 text-center">
                        <a href="/" class="btn btn-primary btn-lg">
                            <i class="fas fa-arrow-left me-2"></i>Back to Home
                        </a>
                    </div></div></div></div>`;
        
        res.send(generateHTML('Orders', content));
    });
});

app.listen(PORT, () => {
    console.log(`
    ┌─────────────────────────────────────────────────────────┐
    │       PREMIUM STORE - Luxury Single Product System      │
    │       Server: http://localhost:${PORT}                     │
    │       Admin: http://localhost:${PORT}/admin-login          │
    │                                                         │
    │       🚀 Premium Features:                              │
    │       • Luxury Dark Theme with Gradient Effects         │
    │       • Premium Animations (GSAP)                       │
    │       • Glass Morphism Design                           │
    │       • Advanced Image Slider                           │
    │       • Real-time Order Notifications                   │
    │       • WhatsApp Integration                            │
    │       • Countdown Timer with Effects                    │
    │       • Advanced Admin Dashboard                        │
    │       • CSV Export with Product Details                 │
    │       • SweetAlert2 for Premium Alerts                  │
    │       • Responsive Premium Design                       │
    │       • Animated Background Effects                     │
    └─────────────────────────────────────────────────────────┘
    `);
});
