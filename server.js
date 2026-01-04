const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const app = express();

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const PORT = process.env.PORT || config.server.port;

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
    
    db.run(`INSERT INTO admin_users (username, password) VALUES (?, ?)`, 
        [config.admin.username, config.admin.password]);
    
    // Insert sample orders from config
    const orderStmt = db.prepare("INSERT INTO orders (customer_name, phone, address, shipping_area, quantity, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
    config.sampleOrders.forEach(order => {
        orderStmt.run([
            order.customer_name,
            order.phone,
            order.address,
            order.shipping_area,
            order.quantity,
            order.total,
            order.status
        ]);
    });
    orderStmt.finalize();
    
    // Insert product from config
    const stmt = db.prepare("INSERT INTO products (name, price, offer_price, images, description, features) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run([
        config.product.name,
        config.product.regularPrice,
        config.product.offerPrice,
        JSON.stringify(config.product.images),
        config.product.description,
        JSON.stringify(config.product.features)
    ]);
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="description" content="${config.product.name} - Your personal grooming partner. Special offer price ${formatPrice(config.product.offerPrice)} with free shipping.">
    <meta property="og:title" content="${config.product.name} - Dhaka Market">
    <meta property="og:description" content="Special offer price ${formatPrice(config.product.offerPrice)} with free shipping. Buy now with cash on delivery.">
    <meta property="og:image" content="${config.product.images[0]}">
    <meta property="og:url" content="https://your-domain.com">
    <meta property="og:type" content="website">
    
    ${config.facebook.enablePixel ? `
    <!-- Facebook Pixel Code -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${config.facebook.pixelId}');
    ${config.facebook.testEventCode ? `fbq('set', 'test_event_code', '${config.facebook.testEventCode}');` : ''}
    fbq('track', 'PageView');
    </script>
    
    <script>
    window.fbPixelEvents = {
        trackViewContent: function() {
            ${config.facebook.trackEvents.viewContent ? `
            fbq('track', 'ViewContent', {
                content_name: '${config.product.name}',
                content_category: 'Electronics',
                content_type: 'product',
                value: ${config.product.offerPrice},
                currency: 'BDT'
            });` : ''}
        },
        trackAddToCart: function() {
            ${config.facebook.trackEvents.addToCart ? `
            fbq('track', 'AddToCart', {
                content_name: '${config.product.name}',
                content_category: 'Electronics',
                content_type: 'product',
                value: ${config.product.offerPrice},
                currency: 'BDT'
            });` : ''}
        },
        trackInitiateCheckout: function() {
            ${config.facebook.trackEvents.initiateCheckout ? `
            fbq('track', 'InitiateCheckout', {
                content_name: '${config.product.name}',
                content_category: 'Electronics',
                num_items: 1,
                value: ${config.product.offerPrice + config.product.shipping.insideDhaka},
                currency: 'BDT'
            });` : ''}
        },
        trackPurchase: function(orderId, value) {
            ${config.facebook.trackEvents.purchase ? `
            fbq('track', 'Purchase', {
                content_name: '${config.product.name}',
                content_category: 'Electronics',
                value: value,
                currency: 'BDT',
                order_id: orderId
            });` : ''}
        },
        trackLead: function() {
            ${config.facebook.trackEvents.lead ? `
            fbq('track', 'Lead', {
                content_name: '${config.product.name}',
                content_category: 'Electronics'
            });` : ''}
        }
    };
    ${config.facebook.testEventCode ? `
    if (window.location.href.indexOf('test=true') > -1) {
        fbq('track', 'TestEvent', {
            test_event_code: '${config.facebook.testEventCode}'
        });
    }
    ` : ''}
    </script>
    
    <noscript>
    <img height="1" width="1" style="display:none" 
         src="https://www.facebook.com/tr?id=${config.facebook.pixelId}&ev=PageView&noscript=1"/>
    </noscript>
    ` : ''}
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Kalpurush&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }
        
        body {
            font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            color: #333;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            width: 100vw;
        }
        
        html, body {
            max-width: 100%;
            overflow-x: hidden;
            position: relative;
        }
        
        /* Mobile First Styles */
        .container-fluid {
            padding: 0;
            margin: 0;
            width: 100%;
            max-width: 100%;
        }
        
        .navbar-market {
            background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%);
            padding: 12px 0;
            position: sticky;
            top: 0;
            z-index: 1000;
            width: 100%;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .nav-brand {
            font-size: 1.3rem;
            font-weight: 700;
            color: white;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .product-container {
            background: white;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            margin: 0;
            width: 100%;
            border-radius: 0;
        }
        
        .row.g-0 {
            margin: 0;
            flex-wrap: wrap;
        }
        
        .product-image-section {
            background: #f8f9fa;
            padding: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 300px;
            width: 100%;
        }
        
        .product-image {
            width: 100%;
            max-height: 350px;
            object-fit: contain;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .product-info-section {
            padding: 20px;
            background: white;
            width: 100%;
        }
        
        .product-title {
            font-size: 1.6rem;
            font-weight: 700;
            margin-bottom: 15px;
            color: #2c3e50;
            line-height: 1.3;
            text-align: center;
        }
        
        .price-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            border-radius: 12px;
            margin: 15px 0;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
            text-align: center;
        }
        
        .old-price {
            font-size: 1.1rem;
            text-decoration: line-through;
            color: rgba(255, 255, 255, 0.8);
            display: block;
        }
        
        .current-price {
            font-size: 2.5rem;
            font-weight: 800;
            color: white;
            display: block;
            line-height: 1;
            margin: 5px 0;
        }
        
        .discount-badge {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 6px 15px;
            border-radius: 25px;
            font-weight: 600;
            font-size: 1rem;
            display: inline-block;
            margin-top: 8px;
        }
        
        .features-list {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .feature-item {
            padding: 10px 12px;
            margin: 5px 0;
            background: white;
            border-radius: 8px;
            border-left: 3px solid #667eea;
            display: flex;
            align-items: center;
            font-size: 0.95rem;
        }
        
        .feature-icon {
            color: #667eea;
            margin-right: 10px;
            font-size: 1rem;
            min-width: 20px;
        }
        
        .description-box {
            background: #f0f4ff;
            border-radius: 12px;
            padding: 15px;
            margin: 15px 0;
            max-height: 300px;
            overflow-y: auto;
            line-height: 1.6;
            font-size: 0.95rem;
        }
        
        .checkout-container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin-top: 20px;
            width: 100%;
        }
        
        .form-label-market {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 6px;
            display: block;
            font-size: 0.95rem;
        }
        
        .form-control-market {
            border: 1.5px solid #e0e0e0;
            border-radius: 10px;
            padding: 12px 15px;
            font-size: 1rem;
            transition: all 0.2s ease;
            background: #f8f9fa;
            width: 100%;
        }
        
        .form-control-market:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
            background: white;
            outline: none;
        }
        
        .shipping-option-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            border: 1.5px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s ease;
        }
        
        .shipping-option-row.active {
            border-color: #dc3545;
            background-color: rgba(220, 53, 69, 0.05);
        }
        
        .order-summary-box {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .order-summary-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #dee2e6;
            font-size: 0.95rem;
        }
        
        .order-summary-total {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            font-size: 1.2rem;
            font-weight: bold;
            color: #333;
            border-top: 2px solid #667eea;
            margin-top: 5px;
        }
        
        .submit-order-btn {
            background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%);
            color: white;
            border: none;
            padding: 16px;
            font-size: 1.1rem;
            font-weight: bold;
            border-radius: 10px;
            width: 100%;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(139, 0, 0, 0.3);
        }
        
        .submit-order-btn:hover, .submit-order-btn:active {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(139, 0, 0, 0.4);
        }
        
        .whatsapp-float {
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            z-index: 1000;
            box-shadow: 0 5px 15px rgba(37, 211, 102, 0.4);
            animation: pulse 2s infinite;
            text-decoration: none;
        }
        
        .whatsapp-float a {
            color: white;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .live-order-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            left: 20px;
            background: white;
            border-left: 4px solid #1dd1a1;
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            animation: slideInMobile 0.5s ease;
            max-width: calc(100vw - 40px);
        }
        
        @keyframes slideInMobile {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .quantity-selector {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            background: #f8f9fa;
            padding: 12px;
            border-radius: 10px;
            margin: 15px 0;
        }
        
        .quantity-btn {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            font-size: 1.3rem;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        .quantity-btn:active {
            transform: scale(0.95);
        }
        
        .quantity-display {
            font-size: 1.5rem;
            font-weight: 700;
            min-width: 50px;
            text-align: center;
            color: #2c3e50;
        }
        
        .carousel-inner {
            border-radius: 12px;
            overflow: hidden;
        }
        
        .carousel-control-prev, .carousel-control-next {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0.8;
        }
        
        .carousel-indicators {
            margin-bottom: 5px;
        }
        
        .carousel-indicators button {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #667eea;
        }
        
        .section-title {
            font-size: 1.4rem;
            font-weight: 700;
            color: #2c3e50;
            margin: 20px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #667eea;
            display: block;
        }
        
        .trust-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            margin: 20px 0;
        }
        
        .trust-badge {
            background: white;
            padding: 10px 15px;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #2c3e50;
            font-size: 0.85rem;
        }
        
        .facebook-review-card {
            background: white;
            border-radius: 12px;
            padding: 15px;
            margin: 10px 0;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
            border-left: 4px solid #1877F2;
        }
        
        .review-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .review-profile-pic {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            margin-right: 12px;
            border: 2px solid #1877F2;
        }
        
        .countdown-timer {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 15px;
            border-radius: 12px;
            text-align: center;
            margin: 15px 0;
            font-weight: 600;
            font-size: 1rem;
        }
        
        .timer-digits {
            font-size: 1.8rem;
            font-weight: 800;
            letter-spacing: 2px;
            margin-top: 5px;
        }
        
        /* Button styles for mobile */
        .btn {
            padding: 12px 20px;
            font-size: 1rem;
            border-radius: 10px;
            white-space: nowrap;
        }
        
        /* Form card adjustments */
        .form-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-top: 10px solid #ffc107;
            border-radius: 15px;
            padding: 15px;
            width: 100%;
        }
        
        .info-header-box {
            border: 1px solid #ffc107;
            border-radius: 10px;
            padding: 12px;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .info-header-text {
            color: #0d6efd;
            font-weight: 700;
            font-size: 16px;
            margin-bottom: 5px;
            line-height: 1.3;
        }
        
        .billing-title {
            font-weight: 700;
            font-size: 16px;
            margin-bottom: 12px;
            color: #000;
        }
        
        /* Mobile-specific adjustments */
        @media (max-width: 576px) {
            .navbar-market {
                padding: 10px 0;
            }
            
            .nav-brand {
                font-size: 1.1rem;
            }
            
            .product-title {
                font-size: 1.4rem;
            }
            
            .current-price {
                font-size: 2rem;
            }
            
            .quantity-btn {
                width: 40px;
                height: 40px;
                font-size: 1.2rem;
            }
            
            .whatsapp-float {
                bottom: 70px;
                right: 15px;
                width: 55px;
                height: 55px;
                font-size: 25px;
            }
            
            .timer-digits {
                font-size: 1.5rem;
            }
            
            .submit-order-btn {
                padding: 14px;
                font-size: 1rem;
            }
            
            .carousel-control-prev, .carousel-control-next {
                width: 35px;
                height: 35px;
            }
        }
        
        /* Tablet styles */
        @media (min-width: 768px) {
            .product-container {
                margin: 20px auto;
                border-radius: 20px;
                max-width: 95%;
            }
            
            .product-image-section {
                padding: 30px;
                min-height: 400px;
            }
            
            .product-info-section {
                padding: 30px;
            }
            
            .product-title {
                font-size: 2rem;
            }
            
            .current-price {
                font-size: 3rem;
            }
        }
        
        /* Desktop styles */
        @media (min-width: 992px) {
            .product-container {
                max-width: 1400px;
                margin: 30px auto;
            }
            
            .product-image-section {
                padding: 40px;
                min-height: 500px;
            }
            
            .product-info-section {
                padding: 40px;
            }
            
            .product-title {
                font-size: 2.5rem;
            }
            
            .current-price {
                font-size: 3.5rem;
            }
            
            .checkout-container {
                position: sticky;
                top: 100px;
            }
        }
        
        /* Prevent text selection on buttons */
        button, a.btn {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        
        /* Better touch targets */
        input, select, textarea, button {
            font-size: 16px !important; /* Prevents iOS zoom on focus */
        }
        
        /* Smooth scrolling */
        html {
            scroll-behavior: smooth;
        }
        
        /* Hide scrollbar for cleaner mobile look */
        .description-box::-webkit-scrollbar {
            width: 5px;
        }
        
        .description-box::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }
        
        .description-box::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
        }
        
        /* Mobile menu adjustments */
        .navbar-toggler {
            padding: 5px 10px;
            font-size: 1rem;
        }
        
        /* Fix for iOS input styling */
        input, textarea {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            border-radius: 10px;
        }
        
        /* Loading state */
        .loading {
            opacity: 0.7;
            pointer-events: none;
        }
        
        /* Success message */
        .success-message {
            background: linear-gradient(135deg, #1dd1a1 0%, #10ac84 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            margin: 10px 0;
            animation: fadeIn 0.5s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    ${content}
    
    ${config.server.whatsappFloat ? `
    <div class="whatsapp-float">
        <a href="https://wa.me/${config.product.whatsappNumber}" target="_blank">
            <i class="fab fa-whatsapp"></i>
        </a>
    </div>
    ` : ''}

    ${config.server.liveNotifications ? `
    <div id="liveNotification" class="live-order-notification d-none">
        <button type="button" class="btn-close float-end" onclick="hideNotification()"></button>
        <h6><i class="fas fa-bell text-success me-2"></i>নতুন অর্ডার!</h6>
        <p id="notificationText" class="mb-1 fw-bold"></p>
        <small class="text-muted"><i class="fas fa-clock me-1"></i>এক্ষুনি</small>
    </div>
    ` : ''}

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let notificationCount = 0;
        let isMobile = window.innerWidth <= 768;
        
        function showNotification(name, product, city) {
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
        
        ${config.server.liveNotifications ? `
        setInterval(() => {
            const names = ['রহিম', 'করিম', 'সাদিয়া', 'নাসরিন', 'জাহিদ', 'ফারহানা'];
            const name = names[Math.floor(Math.random() * names.length)];
            const cities = ['ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা'];
            const city = cities[Math.floor(Math.random() * cities.length)];
            
            showNotification(name, '${config.product.name}', city);
        }, ${config.server.notificationInterval});
        ` : ''}
        
        function updateOrderCount() {
            const count = Math.floor(Math.random() * 50) + 100;
            document.getElementById('orderCount').textContent = count;
        }
        
        // Mobile detection
        window.addEventListener('resize', () => {
            isMobile = window.innerWidth <= 768;
        });
        
        // Prevent accidental double taps
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 500 && tapLength > 0) {
                e.preventDefault();
            }
            lastTap = currentTime;
        }, false);
        
        document.addEventListener('DOMContentLoaded', () => {
            ${config.server.liveOrderCount ? `
            updateOrderCount();
            setInterval(updateOrderCount, 60000);
            ` : ''}
            
            if (typeof fbPixelEvents !== 'undefined') {
                fbPixelEvents.trackViewContent();
            }
            
            // Add loading state to buttons
            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
                button.addEventListener('click', function() {
                    if (this.id === 'finalOrderButton') return;
                    this.classList.add('loading');
                    setTimeout(() => {
                        this.classList.remove('loading');
                    }, 1000);
                });
            });
            
            // Improve form focus on mobile
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    input.parentElement.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'center'
                    });
                });
            });
            
            // Mobile swipe support for carousel
            let touchStartX = 0;
            let touchEndX = 0;
            
            const carousel = document.querySelector('.carousel-inner');
            if (carousel) {
                carousel.addEventListener('touchstart', (e) => {
                    touchStartX = e.changedTouches[0].screenX;
                });
                
                carousel.addEventListener('touchend', (e) => {
                    touchEndX = e.changedTouches[0].screenX;
                    handleSwipe();
                });
            }
            
            function handleSwipe() {
                if (touchEndX < touchStartX - 50) {
                    // Swipe left - next slide
                    document.querySelector('.carousel-control-next').click();
                }
                if (touchEndX > touchStartX + 50) {
                    // Swipe right - previous slide
                    document.querySelector('.carousel-control-prev').click();
                }
            }
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
        const shippingInsideDhaka = config.product.shipping.insideDhaka;
        const shippingOutsideDhaka = config.product.shipping.outsideDhaka;
        const defaultQuantity = 1;
        
        const facebookReviews = config.facebookReviews || [
            {
                name: 'আহমেদ রহমান',
                profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
                date: '২ দিন আগে',
                rating: '★★★★★',
                text: 'অসাধারণ পণ্য! ২ দিনের মধ্যে পেয়ে গেছি। কোয়ালিটি একদম ফার্স্ট ক্লাস। ব্যাটারি ব্যাকআপ অনেক ভালো। সত্যিই ওয়াটারপ্রুফ - ভেজা অবস্থায়ও ব্যবহার করেছি।'
            }
        ];
        
        let content = `
            <nav class="navbar navbar-market">
                <div class="container">
                    <div class="d-flex justify-content-between align-items-center w-100">
                        <div class="nav-brand">
                            <i class="fas fa-store me-2"></i>Dhaka Market
                        </div>
                        <div>
                            <a href="/admin-login" class="btn btn-outline-light btn-sm">
                                <i class="fas fa-user-shield me-2"></i>Admin
                            </a>
                        </div>
                    </div>
                </div>
            </nav>

            <div class="container-fluid p-0">
                <div class="product-container">
                    <div class="row g-0">
                        <div class="col-12 col-lg-6">
                            <div class="product-image-section">
                                <div class="w-100">
                                    <div id="productCarousel" class="carousel slide" data-bs-ride="carousel">
                                        <div class="carousel-indicators">
                                            ${images.map((_, i) => `
                                                <button type="button" data-bs-target="#productCarousel" data-bs-slide-to="${i}" class="${i === 0 ? 'active' : ''}"></button>
                                            `).join('')}
                                        </div>
                                        <div class="carousel-inner">
                                            ${images.map((img, i) => `
                                                <div class="carousel-item ${i === 0 ? 'active' : ''}">
                                                    <img src="${img}" class="d-block w-100 product-image" alt="${product.name} ${i + 1}" loading="lazy">
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
                                    
                                    ${config.server.countdownTimer ? `
                                    <div class="countdown-timer mt-3">
                                        <i class="fas fa-clock me-2"></i>স্পেশাল অফার শেষ হতে:
                                        <div class="timer-digits mt-2" id="countdown">23:59:59</div>
                                    </div>
                                    ` : ''}
                                    
                                    <div class="trust-badges">
                                        <div class="trust-badge">
                                            <i class="fas fa-shipping-fast text-success"></i>
                                            <span>ক্যাশ অন ডেলিভারি</span>
                                        </div>
                                        <div class="trust-badge">
                                            <i class="fas fa-shield-alt text-warning"></i>
                                            <span>১ বছর ওয়ারেন্টি</span>
                                        </div>
                                        <div class="trust-badge">
                                            <i class="fas fa-headset text-info"></i>
                                            <span>২৪/৭ সাপোর্ট</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-12 col-lg-6">
                            <div class="product-info-section">
                                <h1 class="product-title">${product.name}</h1>
                                
                                <div class="price-container">
                                    <span class="old-price">${formatPrice(product.price)}</span>
                                    <span class="current-price">${formatPrice(product.offer_price)}</span>
                                    <div class="discount-badge">
                                        <i class="fas fa-tag me-2"></i>${discount}% সেভ করুন
                                    </div>
                                </div>
                                
                                <div class="quantity-selector">
                                    <button class="quantity-btn" onclick="updateQuantity(-1)">-</button>
                                    <span class="quantity-display" id="quantityDisplay">1</span>
                                    <button class="quantity-btn" onclick="updateQuantity(1)">+</button>
                                </div>
                                
                                <div class="features-list">
                                    <h5 class="section-title">বিশেষ ফিচারসমূহ</h5>
                                    ${features.map(feature => `
                                        <div class="feature-item">
                                            <i class="fas fa-check feature-icon"></i>
                                            <span>${feature}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                
                                <div class="description-box bengali-text">
                                    ${product.description.replace(/\n/g, '<br>')}
                                </div>
                                
                                ${config.facebookReviews ? `
                                <div class="mt-4">
                                    <h5 class="section-title">ফেসবুক রিভিউ</h5>
                                    ${facebookReviews.slice(0, 3).map(review => `
                                        <div class="facebook-review-card">
                                            <div class="review-header">
                                                <img src="${review.profilePic}" class="review-profile-pic" alt="${review.name}" loading="lazy">
                                                <div>
                                                    <div class="review-name">${review.name}</div>
                                                    <div class="review-date">${review.date}</div>
                                                    <div class="review-rating">${review.rating}</div>
                                                </div>
                                                <div class="facebook-logo">
                                                    <i class="fab fa-facebook"></i>
                                                </div>
                                            </div>
                                            <div class="review-text">${review.text}</div>
                                        </div>
                                    `).join('')}
                                </div>
                                ` : ''}
                                
                                <div class="checkout-container">
                                    <button class="btn btn-warning w-100 py-3 mb-3" style="font-size: 1.2rem; font-weight: bold; border-radius: 10px;" onclick="scrollToForm()">
                                        <i class="fas fa-shopping-cart me-2"></i> এখনই অর্ডার করুন
                                    </button>
                                    
                                    <div class="form-card" id="orderFormSection">
                                        <div class="info-header-box">
                                            <div class="info-header-text">আপনার তথ্য দিয়ে পণ্য অর্ডার করুন</div>
                                            <div class="arrow-box"><i class="fas fa-arrow-down"></i></div>
                                        </div>
                                        
                                        <div class="billing-title">Billing & Shipping</div>
                                        
                                        <form action="/order" method="POST" id="orderForm" onsubmit="trackCheckout()">
                                            <input type="hidden" name="product_name" value="${product.name}">
                                            <input type="hidden" name="product_price" value="${product.offer_price}">
                                            <input type="hidden" name="quantity" id="quantityInput" value="1">
                                            
                                            <div class="mb-3">
                                                <label class="form-label-market">আপনার নাম <span class="required-star" style="color: red;">*</span></label>
                                                <input type="text" name="customer_name" class="form-control-market" placeholder="Raihan" required>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label-market">আপনার ঠিকানা <span class="required-star" style="color: red;">*</span></label>
                                                <textarea name="address" class="form-control-market" rows="3" placeholder="Bangladesh dhaka lalbagh" required></textarea>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label-market">মোবাইল নম্বর <span class="required-star" style="color: red;">*</span></label>
                                                <input type="tel" name="phone" class="form-control-market" placeholder="+8801330513726" required>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label-market">Shipping</label>
                                                <div class="shipping-option-row active" onclick="selectShipping('outside_dhaka')">
                                                    <div style="display: flex; align-items: center;">
                                                        <input type="radio" name="shipping_area" value="outside_dhaka" checked style="margin-right: 10px;">
                                                        <span>ঢাকার বাইরে:</span>
                                                    </div>
                                                    <span class="shipping-price">৳ ${shippingOutsideDhaka}</span>
                                                </div>
                                                <div class="shipping-option-row" onclick="selectShipping('inside_dhaka')">
                                                    <div style="display: flex; align-items: center;">
                                                        <input type="radio" name="shipping_area" value="inside_dhaka" style="margin-right: 10px;">
                                                        <span>ঢাকার মধ্যে:</span>
                                                    </div>
                                                    <span class="shipping-price">৳ ${shippingInsideDhaka}</span>
                                                </div>
                                            </div>
                                            
                                            <div class="order-summary-box">
                                                <h6 style="font-weight: bold; margin-bottom: 15px; color: #333;">আপনার অর্ডার</h6>
                                                <div class="order-summary-item">
                                                    <div style="display: flex; align-items: center; gap: 10px;">
                                                        <img src="${images[0]}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" loading="lazy">
                                                        <div>
                                                            <div style="font-weight: bold;">${product.name}</div>
                                                            <small style="color: #666;">x <span id="orderQuantity">1</span></small>
                                                        </div>
                                                    </div>
                                                    <div style="font-weight: bold;" id="productSubtotal">${formatPrice(product.offer_price)}</div>
                                                </div>
                                                <div class="order-summary-item">
                                                    <span>Subtotal:</span>
                                                    <span id="subtotalDisplay">${formatPrice(product.offer_price)}</span>
                                                </div>
                                                <div class="order-summary-item">
                                                    <span>Shipping:</span>
                                                    <span id="shippingDisplay">৳ ${shippingOutsideDhaka}</span>
                                                </div>
                                                <div class="order-summary-total">
                                                    <span>Total:</span>
                                                    <span id="finalTotalDisplay">${formatPrice(product.offer_price + shippingOutsideDhaka)}</span>
                                                </div>
                                            </div>
                                            
                                            <div class="payment-info-box" style="background: #f8f9fa; border-radius: 10px; padding: 15px; margin: 15px 0; border: 1px solid #dee2e6;">
                                                <div class="payment-method" style="font-weight: bold; color: #666; margin-bottom: 10px;">Cash on delivery</div>
                                                <div class="cash-on-delivery" style="background: white; padding: 12px; border-radius: 8px; text-align: center; font-size: 14px; color: #555;">
                                                    পণ্য হাতে পেয়ে, দেখে টাকা দিবেন।
                                                </div>
                                            </div>
                                            
                                            <button type="submit" class="submit-order-btn" id="finalOrderButton" onclick="trackLead()">
                                                অর্ডার কনফার্ম করছি <span id="finalPriceDisplay">${formatPrice(product.offer_price + shippingOutsideDhaka)}</span>
                                            </button>
                                        </form>
                                    </div>
                                    
                                    <button class="btn btn-success w-100 py-3 mt-3" style="border-radius: 10px; font-size: 1.1rem;" onclick="window.open('https://wa.me/${config.product.whatsappNumber}', '_blank')">
                                        <i class="fab fa-whatsapp me-2"></i> WhatsApp এ যোগাযোগ..
                                    </button>
                                </div>
                                
                                <div class="mt-4 text-center">
                                    <p class="text-muted">
                                        <i class="fas fa-phone me-1"></i>সাহায্য চাইলে কল করুন: <strong>${config.product.supportPhone}</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${config.server.liveOrderCount ? `
            <div class="text-center mt-3 mb-4">
                <p class="text-muted">
                    <i class="fas fa-shopping-cart text-success me-2"></i>
                    <span id="orderCount">150</span> জন আজকে অর্ডার করেছেন
                </p>
            </div>
            ` : ''}
            
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
                    document.getElementById('orderQuantity').textContent = quantity;
                    
                    calculateTotal();
                    
                    if (typeof fbPixelEvents !== 'undefined' && change > 0) {
                        fbPixelEvents.trackAddToCart();
                    }
                }
                
                function selectShipping(area) {
                    selectedShipping = area;
                    
                    document.querySelectorAll('.shipping-option-row').forEach(option => {
                        option.classList.remove('active');
                    });
                    
                    if (area === 'inside_dhaka') {
                        document.querySelectorAll('.shipping-option-row')[1].classList.add('active');
                        document.querySelector('input[name="shipping_area"][value="inside_dhaka"]').checked = true;
                    } else {
                        document.querySelectorAll('.shipping-option-row')[0].classList.add('active');
                        document.querySelector('input[name="shipping_area"][value="outside_dhaka"]').checked = true;
                    }
                    
                    calculateTotal();
                }
                
                function calculateTotal() {
                    const shippingCost = selectedShipping === 'inside_dhaka' ? shippingInside : shippingOutside;
                    const subtotal = productPrice * quantity;
                    const total = subtotal + shippingCost;
                    
                    document.getElementById('productSubtotal').textContent = formatPrice(subtotal);
                    document.getElementById('subtotalDisplay').textContent = formatPrice(subtotal);
                    document.getElementById('shippingDisplay').textContent = '৳ ' + shippingCost;
                    document.getElementById('finalTotalDisplay').textContent = formatPrice(total);
                    document.getElementById('finalPriceDisplay').textContent = formatPrice(total);
                }
                
                function formatPrice(price) {
                    return '৳' + price.toLocaleString('en-IN');
                }
                
                function trackCheckout() {
                    if (typeof fbPixelEvents !== 'undefined') {
                        const shippingCost = selectedShipping === 'inside_dhaka' ? shippingInside : shippingOutside;
                        const total = (productPrice * quantity) + shippingCost;
                        
                        fbPixelEvents.trackInitiateCheckout();
                    }
                }
                
                function trackLead() {
                    if (typeof fbPixelEvents !== 'undefined') {
                        fbPixelEvents.trackLead();
                    }
                }
                
                function scrollToForm() {
                    document.getElementById('orderFormSection').scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
                
                ${config.server.countdownTimer ? `
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
                ` : ''}
                
                // Mobile optimization
                document.addEventListener('touchstart', () => {}, {passive: true});
                
                // Prevent form submission spam
                let formSubmitted = false;
                document.getElementById('orderForm').addEventListener('submit', function(e) {
                    if (formSubmitted) {
                        e.preventDefault();
                        return;
                    }
                    
                    const submitBtn = document.getElementById('finalOrderButton');
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
                    formSubmitted = true;
                    
                    // Add slight delay for better UX
                    setTimeout(() => {
                        this.submit();
                    }, 1000);
                });
            </script>`;
        
        res.send(generateHTML(product.name, content));
    });
});

// Rest of the routes (admin, orders, etc.) remain the same as previous version
// [Include all other routes from previous code...]

app.listen(PORT, () => {
    console.log(`
    ┌─────────────────────────────────────────────────────────┐
    │       Dhaka Market - E-commerce System                 │
    │       Server: http://localhost:${PORT}                     │
    │       Admin: http://localhost:${PORT}/admin-login          │
    │                                                         │
    │       Features:                                         │
    │       • Mobile-First Responsive Design                 │
    │       • Touch-Optimized Interface                      │
    │       • Facebook Pixel Integration                     │
    │       • Config.json for Easy Management                │
    │       • Real-time Notifications                        │
    └─────────────────────────────────────────────────────────┘
    `);
});
