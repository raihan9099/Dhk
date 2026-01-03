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
    
    const sampleOrders = [
        ['রহিম', '01712345678', 'মোহাম্মদপুর, ঢাকা', 'inside_dhaka', 1, 1059, 'completed', '2024-01-01 10:30:00'],
        ['করিম', '01876543210', 'মিরপুর, ঢাকা', 'inside_dhaka', 2, 2058, 'processing', '2024-01-01 11:45:00'],
        ['সাদিয়া', '01987654321', 'চট্টগ্রাম সিটি', 'outside_dhaka', 1, 1149, 'pending', '2024-01-01 12:15:00'],
        ['জাহিদ', '01612345678', 'সিলেট', 'outside_dhaka', 3, 3297, 'shipped', '2024-01-01 13:30:00']
    ];
    
    const product = [
        'Hair Removal Trimmer',
        1500,
        999,
        JSON.stringify([
            'https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=600&h=600&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1591378603223-e15b45a81640?w=600&h=600&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=600&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&h=600&fit=crop&auto=format'
        ]),
        'Hair Removal Trimmer - আপনার ব্যক্তিগত গরমিং পার্টনার।\n\n' +
        'এই ট্রিমারটি ব্যবহার করে আপনি খুব সহজে, ব্যথাহীনভাবে ও নিরাপদে অবাঞ্ছিত লোম কাটতে পারবেন। এটি প্রতিদিনের ব্যবহারে সময় বাঁচায় এবং আপনার ত্বককে সুরক্ষিত রাখে।\n\n' +
        'বিশেষ সুযোগ:\n' +
        'রেগুলার মূল্য ১৫০০ টাকা\n' +
        'অফার মূল্য মাত্র ৯৯৯ টাকা\n\n' +
        'আমরা দিচ্ছি ১০০% অরিজিনাল পণ্য - তাই নিশ্চিন্তে অর্ডার করতে পারেন\n' +
        'ডেলিভারির সময় পণ্য চেক করে নিতে পারবেন\n' +
        'পুরুষ ও মহিলা - উভয়ের জন্য উপযুক্ত\n' +
        'বাংলাদেশের সব অঞ্চলে ক্যাশ অন ডেলিভারি\n\n' +
        'বিশেষ সুবিধা:\n' +
        '৭ দিনের রিটার্ন পলিসি\n' +
        '১ বছর ওয়ারেন্টি\n' +
        '২৪/৭ কাস্টমার সাপোর্ট\n' +
        '২৪-৪৮ ঘন্টার মধ্যে ডেলিভারি',
        JSON.stringify([
            'কর্ডলেস ও রিচার্জেবল - কোথাও নিয়ে যেতে সুবিধা',
            '৩টি কম্ব গার্ড (৩মিমি, ৬মিমি, ৯মিমি)',
            '২ ঘন্টা ব্যাকআপ - একবার চার্জে অনেকক্ষণ',
            'ইউএসবি টাইপ-সি চার্জিং - দ্রুত চার্জ',
            'ওয়াটারপ্রুফ ডিজাইন - ভেজা অবস্থায়ও ব্যবহার করা যায়',
            '১ বছর ওয়ারেন্টি - নিশ্চিন্তে ব্যবহার করুন',
            'হালকা ও বহনযোগ্য - ভ্রমণের জন্য উপযুক্ত',
            'আধুনিক ডিজাইন - দেখতে স্টাইলিশ'
        ])
    ];
    
    const stmt = db.prepare("INSERT INTO products (name, price, offer_price, images, description, features) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(product);
    stmt.finalize();
    
    const orderStmt = db.prepare("INSERT INTO orders (customer_name, phone, address, shipping_area, quantity, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    sampleOrders.forEach(order => orderStmt.run(order));
    orderStmt.finalize();
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
    
    <!-- Meta Pixel Code -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    // Replace with your Pixel ID from Facebook Ads Manager
    fbq('init', 'YOUR_PIXEL_ID_HERE');
    
    // Test Event Configuration (from Events Manager)
    fbq('set', 'test_event_code', 'YOUR_TEST_EVENT_CODE');
    
    // Track PageView
    fbq('track', 'PageView');
    </script>
    
    <!-- Additional Pixel Tracking for Conversions -->
    <script>
    // Store pixel events for later use
    window.fbPixelEvents = {
        trackViewContent: function() {
            fbq('track', 'ViewContent', {
                content_name: 'Hair Removal Trimmer',
                content_category: 'Electronics',
                content_type: 'product',
                value: 999,
                currency: 'BDT'
            });
        },
        trackAddToCart: function() {
            fbq('track', 'AddToCart', {
                content_name: 'Hair Removal Trimmer',
                content_category: 'Electronics',
                content_type: 'product',
                value: 999,
                currency: 'BDT'
            });
        },
        trackInitiateCheckout: function() {
            fbq('track', 'InitiateCheckout', {
                content_name: 'Hair Removal Trimmer',
                content_category: 'Electronics',
                num_items: 1,
                value: 1059,
                currency: 'BDT'
            });
        },
        trackPurchase: function(orderId, value) {
            fbq('track', 'Purchase', {
                content_name: 'Hair Removal Trimmer',
                content_category: 'Electronics',
                value: value,
                currency: 'BDT',
                order_id: orderId
            });
        },
        trackLead: function() {
            fbq('track', 'Lead', {
                content_name: 'Hair Removal Trimmer',
                content_category: 'Electronics'
            });
        }
    };
    
    // Send test events if in test mode
    if (window.location.href.indexOf('test=true') > -1) {
        fbq('track', 'TestEvent', {
            test_event_code: 'YOUR_TEST_EVENT_CODE'
        });
    }
    </script>
    
    <noscript>
    <img height="1" width="1" style="display:none" 
         src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID_HERE&ev=PageView&noscript=1"/>
    </noscript>
    <!-- End Meta Pixel Code -->
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Kalpurush&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            color: #333;
        }
        
        .navbar-market {
            background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            padding: 15px 0;
        }
        
        .nav-brand {
            font-size: 1.8rem;
            font-weight: 700;
            color: white;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .product-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            margin: 30px auto;
            max-width: 1400px;
        }
        
        .product-image-section {
            background: #f8f9fa;
            padding: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 600px;
        }
        
        .product-image {
            width: 100%;
            max-height: 500px;
            object-fit: contain;
            border-radius: 15px;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
        }
        
        .product-info-section {
            padding: 40px;
            background: white;
        }
        
        .product-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            color: #2c3e50;
            line-height: 1.2;
        }
        
        .price-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 25px;
            border-radius: 15px;
            margin: 25px 0;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        }
        
        .old-price {
            font-size: 1.5rem;
            text-decoration: line-through;
            color: rgba(255, 255, 255, 0.8);
            display: block;
        }
        
        .current-price {
            font-size: 3.5rem;
            font-weight: 800;
            color: white;
            display: block;
            line-height: 1;
        }
        
        .discount-badge {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 1.2rem;
            display: inline-block;
            margin-top: 10px;
        }
        
        .features-list {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            margin: 25px 0;
        }
        
        .feature-item {
            padding: 12px 15px;
            margin: 8px 0;
            background: white;
            border-radius: 10px;
            border-left: 4px solid #667eea;
            display: flex;
            align-items: center;
            font-size: 1.1rem;
        }
        
        .feature-icon {
            color: #667eea;
            margin-right: 15px;
            font-size: 1.2rem;
        }
        
        .description-box {
            background: #f0f4ff;
            border-radius: 15px;
            padding: 25px;
            margin: 25px 0;
            max-height: 400px;
            overflow-y: auto;
            line-height: 1.8;
        }
        
        .description-box::-webkit-scrollbar {
            width: 8px;
        }
        
        .description-box::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }
        
        .description-box::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
        }
        
        .checkout-container {
            position: sticky;
            top: 30px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 15px 50px rgba(0, 0, 0, 0.1);
            padding: 35px;
            margin-top: 30px;
        }
        
        .checkout-title {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 25px;
            color: #2c3e50;
            text-align: center;
        }
        
        .form-label-market {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
            display: block;
            font-size: 1.1rem;
        }
        
        .form-control-market {
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 15px 20px;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            background: #f8f9fa;
        }
        
        .form-control-market:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
            background: white;
        }
        
        .shipping-option {
            background: #f8f9fa;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .shipping-option:hover, .shipping-option.active {
            background: rgba(102, 126, 234, 0.1);
            border-color: #667eea;
            transform: translateY(-3px);
        }
        
        .order-summary {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            margin: 25px 0;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px dashed #ddd;
        }
        
        .summary-total {
            font-size: 1.8rem;
            font-weight: 700;
            color: #2c3e50;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #667eea;
        }
        
        .order-now-btn {
            background: linear-gradient(135deg, #1dd1a1 0%, #10ac84 100%);
            color: white;
            border: none;
            padding: 20px 40px;
            font-size: 1.4rem;
            font-weight: 700;
            border-radius: 15px;
            width: 100%;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(29, 209, 161, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }
        
        .order-now-btn:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(29, 209, 161, 0.6);
        }
        
        .order-now-btn:active {
            transform: translateY(-2px);
        }
        
        .live-order-notification {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: white;
            border-left: 5px solid #1dd1a1;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            max-width: 350px;
            animation: slideIn 0.5s ease;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .whatsapp-float {
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
            z-index: 999;
            box-shadow: 0 10px 30px rgba(37, 211, 102, 0.4);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .guarantee-badge {
            background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
            color: white;
            padding: 12px 25px;
            border-radius: 50px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin: 10px 5px;
        }
        
        .countdown-timer {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            margin: 20px 0;
            font-weight: 600;
            font-size: 1.3rem;
        }
        
        .timer-digits {
            font-size: 2.5rem;
            font-weight: 800;
            letter-spacing: 3px;
        }
        
        .quantity-selector {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 12px;
            margin: 20px 0;
        }
        
        .quantity-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            font-size: 1.5rem;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .quantity-btn:hover {
            transform: scale(1.1);
        }
        
        .quantity-display {
            font-size: 1.8rem;
            font-weight: 700;
            min-width: 60px;
            text-align: center;
            color: #2c3e50;
        }
        
        .trust-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            justify-content: center;
            margin: 30px 0;
        }
        
        .trust-badge {
            background: white;
            padding: 15px 25px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .product-slider {
            border-radius: 15px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        
        .carousel-control-prev, .carousel-control-next {
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0.8;
        }
        
        .carousel-control-prev:hover, .carousel-control-next:hover {
            opacity: 1;
        }
        
        .carousel-indicators button {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #667eea;
        }
        
        .scroll-hint {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: #667eea;
            font-size: 1.2rem;
            animation: bounce 2s infinite;
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {transform: translateY(0) translateX(-50%);}
            40% {transform: translateY(-20px) translateX(-50%);}
            60% {transform: translateY(-10px) translateX(-50%);}
        }
        
        .testimonial-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        .testimonial-text {
            font-style: italic;
            color: #555;
            line-height: 1.6;
        }
        
        .customer-name {
            font-weight: 600;
            color: #667eea;
            margin-top: 15px;
        }
        
        .customer-city {
            color: #777;
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .product-container {
                margin: 10px;
                border-radius: 15px;
            }
            
            .product-image-section, .product-info-section {
                padding: 20px;
            }
            
            .product-title {
                font-size: 1.8rem;
            }
            
            .current-price {
                font-size: 2.5rem;
            }
            
            .checkout-container {
                margin-top: 20px;
                padding: 20px;
            }
            
            .whatsapp-float {
                width: 60px;
                height: 60px;
                font-size: 30px;
                bottom: 80px;
                right: 20px;
            }
        }
        
        .bengali-text {
            font-family: 'Kalpurush', sans-serif;
            line-height: 1.8;
            font-size: 1.1rem;
        }
        
        .section-title {
            font-size: 1.8rem;
            font-weight: 700;
            color: #2c3e50;
            margin: 30px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            display: inline-block;
        }
        
        /* Checkout Form Style as per image */
        .form-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-top: 15px solid #ffc107;
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .info-header-box {
            border: 1px solid #ffc107;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
            margin-bottom: 25px;
        }
        
        .info-header-text {
            color: #0d6efd;
            font-weight: 700;
            font-size: 20px;
            margin-bottom: 5px;
        }
        
        .arrow-box {
            display: inline-block;
            background-color: #3b82f6;
            color: white;
            padding: 2px 8px;
            border-radius: 3px;
            margin-top: 5px;
        }
        
        .billing-title {
            font-weight: 700;
            font-size: 18px;
            margin-bottom: 15px;
            color: #000;
        }
        
        .required-star {
            color: red;
        }
        
        /* Shipping options style */
        .shipping-option-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 10px;
            cursor: pointer;
        }
        
        .shipping-option-row.active {
            border-color: #dc3545;
            background-color: rgba(220, 53, 69, 0.05);
        }
        
        .shipping-price {
            font-weight: bold;
            color: #333;
        }
        
        /* Order summary style */
        .order-summary-box {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .order-summary-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #dee2e6;
        }
        
        .order-summary-total {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            font-size: 1.4rem;
            font-weight: bold;
            color: #333;
        }
        
        /* Payment info box */
        .payment-info-box {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin: 15px 0;
            border: 1px solid #dee2e6;
        }
        
        .payment-method {
            font-weight: bold;
            color: #666;
            margin-bottom: 10px;
        }
        
        .cash-on-delivery {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
            color: #555;
        }
        
        /* Final submit button */
        .submit-order-btn {
            background: #8B0000;
            color: white;
            border: none;
            padding: 18px;
            font-size: 1.3rem;
            font-weight: bold;
            border-radius: 10px;
            width: 100%;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .submit-order-btn:hover {
            background: #A52A2A;
            transform: translateY(-3px);
        }
    </style>
</head>
<body>
    ${content}
    
    <div class="whatsapp-float">
        <a href="https://wa.me/8801330513726" target="_blank" style="color: white;">
            <i class="fab fa-whatsapp"></i>
        </a>
    </div>

    <div id="liveNotification" class="live-order-notification d-none">
        <button type="button" class="btn-close float-end" onclick="hideNotification()"></button>
        <h6><i class="fas fa-bell text-success"></i> নতুন অর্ডার!</h6>
        <p id="notificationText" class="mb-1 fw-bold"></p>
        <small class="text-muted"><i class="fas fa-clock"></i> এক্ষুনি</small>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let notificationCount = 0;
        
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
        
        setInterval(() => {
            const names = ['রহিম', 'করিম', 'সাদিয়া', 'নাসরিন', 'জাহিদ', 'ফারহানা'];
            const name = names[Math.floor(Math.random() * names.length)];
            const cities = ['ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা'];
            const city = cities[Math.floor(Math.random() * cities.length)];
            
            showNotification(name, 'হেয়ার ট্রিমার', city);
        }, 15000);
        
        function updateOrderCount() {
            const count = Math.floor(Math.random() * 50) + 100;
            document.getElementById('orderCount').textContent = count;
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            updateOrderCount();
            setInterval(updateOrderCount, 60000);
            
            if (typeof fbPixelEvents !== 'undefined') {
                fbPixelEvents.trackViewContent();
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
        const shippingInsideDhaka = 60;
        const shippingOutsideDhaka = 100;
        const defaultQuantity = 1;
        const defaultTotal = product.offer_price + shippingInsideDhaka;
        
        let content = `
            <!-- Navigation -->
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

            <!-- Main Product Container -->
            <div class="container-fluid py-4">
                <div class="product-container">
                    <div class="row g-0">
                        <!-- Left Column: Product Images -->
                        <div class="col-lg-6">
                            <div class="product-image-section">
                                <div class="w-100">
                                    <div id="productCarousel" class="carousel slide product-slider" data-bs-ride="carousel">
                                        <div class="carousel-indicators">
                                            ${images.map((_, i) => `
                                                <button type="button" data-bs-target="#productCarousel" data-bs-slide-to="${i}" class="${i === 0 ? 'active' : ''}"></button>
                                            `).join('')}
                                        </div>
                                        <div class="carousel-inner">
                                            ${images.map((img, i) => `
                                                <div class="carousel-item ${i === 0 ? 'active' : ''}">
                                                    <img src="${img}" class="d-block w-100 product-image" alt="Hair Removal Trimmer Image ${i + 1}">
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
                                    
                                    <div class="countdown-timer mt-4">
                                        <i class="fas fa-clock me-2"></i>স্পেশাল অফার শেষ হতে:
                                        <div class="timer-digits mt-2" id="countdown">23:59:59</div>
                                    </div>
                                    
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
                        
                        <!-- Right Column: Product Info & Checkout -->
                        <div class="col-lg-6">
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
                                
                                <!-- Checkout Form as per image design -->
                                <div class="checkout-container">
                                    <button class="btn btn-warning w-100 py-3 mb-4" style="font-size: 1.4rem; font-weight: bold; border-radius: 10px;">
                                        <i class="fas fa-shopping-cart me-2"></i> এখনই অর্ডার করুন
                                    </button>
                                    
                                    <div class="form-card">
                                        <div class="info-header-box">
                                            <div class="info-header-text">আপনার তথ্য দিয়ে পণ্য অর্ডার করুন</div>
                                            <div class="arrow-box"><i class="fas fa-arrow-down"></i></div>
                                        </div>
                                        
                                        <div class="billing-title">Billing & Shipping</div>
                                        
                                        <form action="/order" method="POST" id="orderForm" onsubmit="trackCheckout()">
                                            <input type="hidden" name="product_name" value="${product.name}">
                                            <input type="hidden" name="product_price" value="${product.offer_price}">
                                            <input type="hidden" name="quantity" id="quantityInput" value="1">
                                            
                                            <div class="mb-4">
                                                <label class="form-label-market">আপনার নাম <span class="required-star">*</span></label>
                                                <input type="text" name="customer_name" class="form-control-market" placeholder="Raihan" required>
                                            </div>
                                            
                                            <div class="mb-4">
                                                <label class="form-label-market">আপনার ঠিকানা <span class="required-star">*</span></label>
                                                <textarea name="address" class="form-control-market" rows="3" placeholder="Bangladesh dhaka lalbagh" required></textarea>
                                            </div>
                                            
                                            <div class="mb-4">
                                                <label class="form-label-market">মোবাইল নম্বর <span class="required-star">*</span></label>
                                                <input type="tel" name="phone" class="form-control-market" placeholder="+8801330513726" required>
                                            </div>
                                            
                                            <div class="mb-4">
                                                <label class="form-label-market">Shipping</label>
                                                <div class="shipping-option-row active" onclick="selectShipping('outside_dhaka')">
                                                    <div>
                                                        <input type="radio" name="shipping_area" value="outside_dhaka" checked style="margin-right: 10px;">
                                                        <span>ঢাকার বাইরে:</span>
                                                    </div>
                                                    <span class="shipping-price">৳ ${shippingOutsideDhaka}</span>
                                                </div>
                                                <div class="shipping-option-row" onclick="selectShipping('inside_dhaka')">
                                                    <div>
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
                                                        <img src="${images[0]}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
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
                                            
                                            <div class="payment-info-box">
                                                <div class="payment-method">Cash on delivery</div>
                                                <div class="cash-on-delivery">
                                                    পণ্য হাতে পেয়ে, দেখে টাকা দিবেন।
                                                </div>
                                            </div>
                                            
                                            <button type="submit" class="submit-order-btn" id="finalOrderButton" onclick="trackLead()">
                                                অর্ডার কনফার্ম করছি <span id="finalPriceDisplay">${formatPrice(product.offer_price + shippingOutsideDhaka)}</span>
                                            </button>
                                        </form>
                                    </div>
                                    
                                    <button class="btn btn-success w-100 py-3 mt-4" style="border-radius: 10px; font-size: 1.2rem;" onclick="window.open('https://wa.me/8801330513726', '_blank')">
                                        <i class="fab fa-whatsapp me-2"></i> WhatsApp এ যোগাযোগ..
                                    </button>
                                    
                                    <!-- Customer Testimonials -->
                                    <div class="mt-5">
                                        <h5 class="section-title">গ্রাহকদের মন্তব্য</h5>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="testimonial-card">
                                                    <div class="testimonial-text">
                                                        "খুবই ভালো পণ্য। ২ দিনের মধ্যে পেয়ে গেছি। কোয়ালিটি একদম ভালো।"
                                                    </div>
                                                    <div class="customer-name">- রহিম আহমেদ</div>
                                                    <div class="customer-city">ঢাকা</div>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="testimonial-card">
                                                    <div class="testimonial-text">
                                                        "ব্যাটারি ব্যাকআপ অনেক ভালো। সত্যিই ওয়াটারপ্রুফ। ভেজা অবস্থায়ও ব্যবহার করেছি।"
                                                    </div>
                                                    <div class="customer-name">- সাদিয়া আক্তার</div>
                                                    <div class="customer-city">চট্টগ্রাম</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mt-4 text-center">
                                        <p class="text-muted">
                                            <i class="fas fa-phone me-1"></i>সাহায্য চাইলে কল করুন: <strong>+৮৮০ ১৩৩০-৫১৩৭২৬</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Hidden Live Order Stats -->
            <div class="text-center mt-3 mb-5">
                <p class="text-muted">
                    <i class="fas fa-shopping-cart text-success me-2"></i>
                    <span id="orderCount">150</span> জন আজকে অর্ডার করেছেন
                </p>
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
                    document.getElementById('orderQuantity').textContent = quantity;
                    
                    calculateTotal();
                    
                    // Track Add to Cart event
                    if (typeof fbPixelEvents !== 'undefined') {
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
                
                // Scroll to form when clicking top order button
                document.querySelector('.btn-warning').addEventListener('click', function() {
                    document.querySelector('.form-card').scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                });
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
                    <nav class="navbar navbar-market">
                        <div class="container">
                            <div class="d-flex justify-content-between align-items-center w-100">
                                <div class="nav-brand">
                                    <i class="fas fa-store me-2"></i>Dhaka Market
                                </div>
                                <div>
                                    <a href="/" class="btn btn-outline-light btn-sm">
                                        <i class="fas fa-home me-2"></i>Home
                                    </a>
                                </div>
                            </div>
                        </div>
                    </nav>

                    <div class="container mt-5">
                        <div class="row justify-content-center">
                            <div class="col-md-8">
                                <div class="card border-0 shadow-lg" style="border-radius: 20px; overflow: hidden;">
                                    <div class="card-body text-center p-5" style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
                                        <div class="mb-4">
                                            <div class="position-relative d-inline-block">
                                                <i class="fas fa-check-circle text-success fa-6x"></i>
                                                <div class="position-absolute top-0 start-100 translate-middle">
                                                    <span class="badge bg-warning text-dark px-3 py-2" style="font-size: 1rem;">ORDER #DM${orderId}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <h1 class="card-title mb-4" style="color: #2c3e50; font-weight: 800;">অর্ডার কনফার্ম!</h1>
                                        <p class="card-text mb-4 fs-5">ধন্যবাদ <span class="fw-bold text-warning">${customer_name}</span> সাহেব/ম্যাডাম, আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।</p>
                                        
                                        <div class="card mb-4" style="border-radius: 15px; border: none;">
                                            <div class="card-body">
                                                <h5 class="mb-3" style="color: #667eea;"><i class="fas fa-receipt me-2"></i>অর্ডার ডিটেইলস</h5>
                                                <div class="row">
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1"><strong>অর্ডার নং:</strong></p>
                                                        <h5 class="text-info">#DM${orderId}</h5>
                                                    </div>
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1"><strong>পণ্য:</strong></p>
                                                        <h6 class="text-dark">${product_name}</h6>
                                                    </div>
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1"><strong>পরিমাণ:</strong></p>
                                                        <h6 class="text-dark">${quantity} টি</h6>
                                                    </div>
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1"><strong>ডেলিভারি:</strong></p>
                                                        <h6 class="text-dark">${shipping_area === 'inside_dhaka' ? 'ঢাকার মধ্যে' : 'ঢাকার বাইরে'}</h6>
                                                    </div>
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1"><strong>মোট মূল্য:</strong></p>
                                                        <h3 class="text-success">${formatPrice(total)}</h3>
                                                    </div>
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1"><strong>স্ট্যাটাস:</strong></p>
                                                        <span class="badge bg-warning text-dark px-3 py-2">প্রক্রিয়াধীন</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="alert alert-info mb-4" style="border-radius: 15px; border: none; background: rgba(102, 126, 234, 0.1);">
                                            <div class="d-flex">
                                                <i class="fas fa-info-circle fa-2x me-3 text-info"></i>
                                                <div class="text-start">
                                                    <h6 class="mb-2"><i class="fas fa-clock me-1"></i>পরবর্তী ধাপ</h6>
                                                    <p class="mb-0">আমাদের প্রতিনিধি ৩০ মিনিটের মধ্যে আপনার সাথে যোগাযোগ করবে। ফোনটি কাছেই রাখবেন।</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <a href="/" class="btn btn-primary btn-lg w-100 py-3" style="border-radius: 12px;">
                                                    <i class="fas fa-shopping-bag me-2"></i>আরও শপিং করুন
                                                </a>
                                            </div>
                                            <div class="col-md-6">
                                                <a href="https://wa.me/8801330513726?text=Hello%20I%20have%20ordered%20${encodeURIComponent(product_name)}%20Order%20ID:%20DM${orderId}" 
                                                   target="_blank" class="btn btn-success btn-lg w-100 py-3" style="border-radius: 12px;">
                                                    <i class="fab fa-whatsapp me-2"></i>WhatsApp এ কনফার্ম করুন
                                                </a>
                                            </div>
                                        </div>
                                        
                                        <div class="mt-4">
                                            <p class="text-dark">
                                                <i class="fas fa-headset me-1"></i>সাহায্য চাইলে কল করুন: <strong>+৮৮০ ১৩৩০-৫১৩৭২৬</strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        if (typeof fbPixelEvents !== 'undefined') {
                            fbPixelEvents.trackPurchase('DM${orderId}', ${total});
                        }
                    </script>`;
                
                res.send(generateHTML('Order Confirmed', content));
            }
        }
    );
});

// Admin routes with CSV export and bulk actions
app.get('/admin-login', (req, res) => {
    let content = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-4">
                    <div class="card shadow-lg border-0" style="border-radius: 20px;">
                        <div class="card-body p-5">
                            <div class="text-center mb-4">
                                <i class="fas fa-user-shield fa-3x" style="color: #667eea;"></i>
                                <h3 class="mt-3 fw-bold">Admin Login</h3>
                            </div>
                            <form action="/admin-login" method="POST">
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Username</label>
                                    <input type="text" name="username" class="form-control" style="padding: 12px; border-radius: 10px;" required>
                                </div>
                                <div class="mb-4">
                                    <label class="form-label fw-bold">Password</label>
                                    <input type="password" name="password" class="form-control" style="padding: 12px; border-radius: 10px;" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100 py-3 fw-bold" style="border-radius: 12px;">
                                    <i class="fas fa-sign-in-alt me-2"></i>Login
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
            res.redirect('/admin/dashboard');
        } else {
            res.send('<script>alert("Invalid credentials"); window.location="/admin-login";</script>');
        }
    });
});

// Admin dashboard with CSV export and bulk actions
app.get('/admin/dashboard', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        let content = `
            <nav class="navbar navbar-market">
                <div class="container">
                    <div class="d-flex justify-content-between align-items-center w-100">
                        <div class="nav-brand">
                            <i class="fas fa-chart-line me-2"></i>Admin Dashboard
                        </div>
                        <div>
                            <a href="/" class="btn btn-outline-light btn-sm me-2">
                                <i class="fas fa-store me-2"></i>Store
                            </a>
                        </div>
                    </div>
                </div>
            </nav>

            <div class="container mt-4">
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card text-white bg-primary mb-3" style="border-radius: 15px;">
                            <div class="card-body">
                                <h5 class="card-title">Total Orders</h5>
                                <h2 class="card-text">${orders.length}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-white bg-success mb-3" style="border-radius: 15px;">
                            <div class="card-body">
                                <h5 class="card-title">Total Revenue</h5>
                                <h2 class="card-text">${formatPrice(orders.reduce((sum, order) => sum + order.total, 0))}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-white bg-warning mb-3" style="border-radius: 15px;">
                            <div class="card-body">
                                <h5 class="card-title">Pending Orders</h5>
                                <h2 class="card-text">${orders.filter(o => o.status === 'pending').length}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-white bg-info mb-3" style="border-radius: 15px;">
                            <div class="card-body">
                                <h5 class="card-title">Today's Orders</h5>
                                <h2 class="card-text">${orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card mb-4" style="border-radius: 15px;">
                    <div class="card-header bg-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">All Orders</h5>
                        <div>
                            <button class="btn btn-success btn-sm me-2" onclick="exportCSV()">
                                <i class="fas fa-file-export me-1"></i>Export CSV
                            </button>
                            <div class="btn-group">
                                <button type="button" class="btn btn-secondary btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                                    <i class="fas fa-cog me-1"></i>Bulk Actions
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="bulkAction('processing')">Mark as Processing</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="bulkAction('shipped')">Mark as Shipped</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="bulkAction('completed')">Mark as Completed</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="bulkAction('delete')">Delete Selected</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover" id="ordersTable">
                                <thead>
                                    <tr>
                                        <th style="width: 50px;">
                                            <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                                        </th>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Phone</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>`;
        
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleString('en-BD');
            const statusColors = {
                'pending': 'warning',
                'processing': 'info',
                'shipped': 'primary',
                'completed': 'success'
            };
            
            content += `
                <tr>
                    <td>
                        <input type="checkbox" class="order-checkbox" value="${order.id}">
                    </td>
                    <td>#DM${order.id}</td>
                    <td>${order.customer_name}</td>
                    <td>${order.phone}</td>
                    <td>${formatPrice(order.total)}</td>
                    <td>
                        <span class="badge bg-${statusColors[order.status] || 'secondary'}">${order.status}</span>
                    </td>
                    <td>${date}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <select class="form-select form-select-sm" style="width: 150px;" onchange="updateStatus(${order.id}, this.value)">
                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                            <button class="btn btn-outline-danger btn-sm ms-2" onclick="deleteOrder(${order.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
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
                function toggleSelectAll() {
                    const selectAll = document.getElementById('selectAll');
                    const checkboxes = document.querySelectorAll('.order-checkbox');
                    
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = selectAll.checked;
                    });
                }
                
                function getSelectedOrders() {
                    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
                    const selectedIds = [];
                    
                    checkboxes.forEach(checkbox => {
                        selectedIds.push(checkbox.value);
                    });
                    
                    return selectedIds;
                }
                
                function bulkAction(action) {
                    const selectedIds = getSelectedOrders();
                    
                    if (selectedIds.length === 0) {
                        alert('Please select at least one order');
                        return;
                    }
                    
                    if (action === 'delete') {
                        if (!confirm('Are you sure you want to delete selected orders?')) {
                            return;
                        }
                    }
                    
                    fetch('/admin/bulk-action', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ action: action, orderIds: selectedIds })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('Action completed successfully');
                            location.reload();
                        } else {
                            alert('Error performing action');
                        }
                    });
                }
                
                function exportCSV() {
                    fetch('/admin/export-csv')
                    .then(response => response.text())
                    .then(csvContent => {
                        // Create a blob and download link
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        
                        a.href = url;
                        a.download = 'orders_' + new Date().toISOString().split('T')[0] + '.csv';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    });
                }
                
                function updateStatus(orderId, status) {
                    fetch('/admin/update-status', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({orderId, status})
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Update the badge color immediately
                            const row = event.target.closest('tr');
                            const statusBadge = row.querySelector('.badge');
                            const statusColors = {
                                'pending': 'warning',
                                'processing': 'info',
                                'shipped': 'primary',
                                'completed': 'success'
                            };
                            
                            statusBadge.className = 'badge bg-' + statusColors[status];
                            statusBadge.textContent = status;
                        }
                    });
                }
                
                function deleteOrder(orderId) {
                    if (confirm('Are you sure you want to delete this order?')) {
                        fetch('/admin/delete-order', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({orderId})
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
                }
            </script>`;
        
        res.send(generateHTML('Admin Dashboard', content));
    });
});

app.post('/admin/update-status', (req, res) => {
    const { orderId, status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
    res.json({ success: true });
});

app.post('/admin/delete-order', (req, res) => {
    const { orderId } = req.body;
    db.run("DELETE FROM orders WHERE id = ?", [orderId]);
    res.json({ success: true });
});

app.post('/admin/bulk-action', (req, res) => {
    const { action, orderIds } = req.body;
    
    if (action === 'delete') {
        const placeholders = orderIds.map(() => '?').join(',');
        db.run(`DELETE FROM orders WHERE id IN (${placeholders})`, orderIds);
    } else {
        const placeholders = orderIds.map(() => '?').join(',');
        db.run(`UPDATE orders SET status = ? WHERE id IN (${placeholders})`, [action, ...orderIds]);
    }
    
    res.json({ success: true });
});

app.get('/admin/export-csv', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        let csvContent = "Order ID,Customer Name,Phone,Address,Shipping Area,Quantity,Total,Status,Created At\\n";
        
        orders.forEach(order => {
            const row = [
                `DM${order.id}`,
                `"${order.customer_name.replace(/"/g, '""')}"`,
                `"${order.phone}"`,
                `"${order.address.replace(/"/g, '""')}"`,
                order.shipping_area,
                order.quantity,
                order.total,
                order.status,
                order.created_at
            ];
            csvContent += row.join(',') + '\\n';
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=orders_export.csv');
        res.send(csvContent);
    });
});

app.listen(PORT, () => {
    console.log(\`
    ┌─────────────────────────────────────────────────────────┐
    │       Dhaka Market - E-commerce System                 │
    │       Server: http://localhost:\${PORT}                     │
    │       Admin: http://localhost:\${PORT}/admin-login          │
    │                                                         │
    │       Features:                                         │
    │       • Bengali Website                                │
    │       • Long Scrolling Design                          │
    │       • Checkout Form                                  │
    │       • Meta Pixel Integration                         │
    │       • Admin Dashboard with CSV Export               │
    │       • Bulk Actions                                   │
    │       • Real-time Notifications                        │
    │       • WhatsApp Integration                           │
    └─────────────────────────────────────────────────────────┘
    \`);
});
