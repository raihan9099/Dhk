const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

const config = {
  "site": {
    "title": "Dhaka Market",
    "logo": "<i class='fas fa-store me-2'></i>Dhaka Market",
    "admin_logo": "<i class='fas fa-chart-line me-2'></i>Admin Dashboard",
    "phone": "+৮৮০ ১৩৩০-৫১৩৭২৬",
    "whatsapp": "8801330513726",
    "currency": "BDT",
    "currency_symbol": "৳"
  },
  
  "facebook": {
    "pixel_id": "YOUR_PIXEL_ID_HERE",
    "test_event_code": "YOUR_TEST_EVENT_CODE",
    "content_name": "Hair Removal Trimmer",
    "content_category": "Electronics",
    "content_type": "product",
    "track_page_view": true,
    "track_view_content": true,
    "track_add_to_cart": true,
    "track_initiate_checkout": true,
    "track_purchase": true,
    "track_lead": true
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
      "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1591378603223-e15b45a81640?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1596703923338-48f1c07e4f2e?w=600&h=600&fit=crop&auto=format",
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
  
  "description": "Hair Removal Trimmer - আপনার ব্যক্তিগত গরমিং পার্টনার।<br><br>এই ট্রিমারটি ব্যবহার করে আপনি খুব সহজে, ব্যথাহীনভাবে ও নিরাপদে অবাঞ্ছিত লোম কাটতে পারবেন। এটি প্রতিদিনের ব্যবহারে সময় বাঁচায় এবং আপনার ত্বককে সুরক্ষিত রাখে।<br><br><strong>বিশেষ সুযোগ:</strong><br>রেগুলার মূল্য ১৫০০ টাকা<br>অফার মূল্য মাত্র ৯৯৯ টাকা<br><br><strong>আমরা দিচ্ছি ১০০% অরিজিনাল পণ্য</strong> - তাই নিশ্চিন্তে অর্ডার করতে পারেন<br><strong>ডেলিভারির সময় পণ্য চেক করে নিতে পারবেন</strong><br><strong>পুরুষ ও মহিলা - উভয়ের জন্য উপযুক্ত</strong><br><strong>বাংলাদেশের সব অঞ্চলে ক্যাশ অন ডেলিভারি</strong><br><br><strong>বিশেষ সুবিধা:</strong><br>✓ ৭ দিনের রিটার্ন পলিসি<br>✓ ১ বছর ওয়ারেন্টি<br>✓ ২৪/৭ কাস্টমার সাপোর্ট<br>✓ ২৪-৪৮ ঘন্টার মধ্যে ডেলিভারি",
  
  "reviews": [
    {
      "name": "আহমেদ রহমান",
      "profilePic": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      "date": "২ দিন আগে",
      "rating": "★★★★★",
      "text": "অসাধারণ পণ্য! ২ দিনের মধ্যে পেয়ে গেছি। কোয়ালিটি একদম ফার্স্ট ক্লাস। ব্যাটারি ব্যাকআপ অনেক ভালো।"
    },
    {
      "name": "ফারহানা আক্তার",
      "profilePic": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      "date": "১ সপ্তাহ আগে",
      "rating": "★★★★★",
      "text": "খুবই ভালো লেগেছে এই ট্রিমারটা। হালকা ও বহনযোগ্য, ভ্রমণের জন্য পারফেক্ট। আমার চেহারার লোম খুব সাবলীলভাবে কাটতে পারছি।"
    }
  ],
  
  "admin": {
    "username": "admin",
    "password": "admin123"
  },
  
  "server": {
    "port": 3000,
    "order_prefix": "DM"
  }
};

const PORT = config.server.port || 3000;
const db = new sqlite3.Database(':memory:');

// Database setup
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
    
    // Insert sample data
    const sampleOrders = [
        ['রহিম', '01712345678', 'মোহাম্মদপুর, ঢাকা', 'inside_dhaka', 1, config.product.offer_price + config.product.shipping.inside_dhaka, 'completed'],
        ['করিম', '01876543210', 'মিরপুর, ঢাকা', 'inside_dhaka', 2, (config.product.offer_price * 2) + config.product.shipping.inside_dhaka, 'processing']
    ];
    
    const productStmt = db.prepare("INSERT INTO products (name, price, offer_price, images, description, features) VALUES (?, ?, ?, ?, ?, ?)");
    productStmt.run(
        config.product.name,
        config.product.regular_price,
        config.product.offer_price,
        JSON.stringify(config.product.images),
        config.description,
        JSON.stringify(config.product.features)
    );
    productStmt.finalize();
    
    const orderStmt = db.prepare("INSERT INTO orders (customer_name, phone, address, shipping_area, quantity, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
    sampleOrders.forEach(order => orderStmt.run(order));
    orderStmt.finalize();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helper function
function formatPrice(price) {
    return config.site.currency_symbol + price.toLocaleString('en-IN');
}

// HTML Generator with improved design
function generateHTML(title, content) {
    const pixelCode = config.facebook.pixel_id !== "YOUR_PIXEL_ID_HERE" ? `
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    ${config.facebook.track_page_view ? `fbq('init', '${config.facebook.pixel_id}');` : ''}
    ${config.facebook.track_page_view ? `fbq('set', 'test_event_code', '${config.facebook.test_event_code}');` : ''}
    ${config.facebook.track_page_view ? `fbq('track', 'PageView');` : ''}
    </script>
    
    <script>
    window.fbPixelEvents = {
        ${config.facebook.track_view_content ? `trackViewContent: function() {
            fbq('track', 'ViewContent', {
                content_name: '${config.facebook.content_name}',
                content_category: '${config.facebook.content_category}',
                content_type: '${config.facebook.content_type}',
                value: ${config.product.offer_price},
                currency: '${config.site.currency}'
            });
        },` : ''}
        
        ${config.facebook.track_add_to_cart ? `trackAddToCart: function() {
            fbq('track', 'AddToCart', {
                content_name: '${config.facebook.content_name}',
                content_category: '${config.facebook.content_category}',
                content_type: '${config.facebook.content_type}',
                value: ${config.product.offer_price},
                currency: '${config.site.currency}'
            });
        },` : ''}
        
        ${config.facebook.track_initiate_checkout ? `trackInitiateCheckout: function() {
            fbq('track', 'InitiateCheckout', {
                content_name: '${config.facebook.content_name}',
                content_category: '${config.facebook.content_category}',
                num_items: 1,
                value: ${config.product.offer_price + config.product.shipping.outside_dhaka},
                currency: '${config.site.currency}'
            });
        },` : ''}
        
        ${config.facebook.track_purchase ? `trackPurchase: function(orderId, value) {
            fbq('track', 'Purchase', {
                content_name: '${config.facebook.content_name}',
                content_category: '${config.facebook.content_category}',
                value: value,
                currency: '${config.site.currency}',
                order_id: orderId
            });
        },` : ''}
        
        ${config.facebook.track_lead ? `trackLead: function() {
            fbq('track', 'Lead', {
                content_name: '${config.facebook.content_name}',
                content_category: '${config.facebook.content_category}'
            });
        }` : ''}
    };
    </script>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${config.site.title}</title>
    
    ${pixelCode}
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Kalpurush&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #2c3e50;
            --secondary-color: #4ca1af;
            --accent-color: #e74c3c;
            --success-color: #27ae60;
            --warning-color: #f39c12;
            --light-bg: #f8f9fa;
            --dark-text: #2c3e50;
            --shadow: 0 10px 30px rgba(0,0,0,0.1);
            --radius: 15px;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            color: var(--dark-text);
            line-height: 1.6;
            font-size: 16px;
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        /* Enhanced Desktop Mode - Larger Text & Spacing */
        @media (min-width: 992px) {
            body {
                font-size: 18px;
            }
            
            .container-lg {
                max-width: 1400px;
                padding: 0 40px;
            }
            
            .product-title {
                font-size: 3.2rem !important;
                line-height: 1.3;
            }
            
            .current-price {
                font-size: 4.5rem !important;
            }
            
            .description-box, .feature-item, .review-text {
                font-size: 1.3rem !important;
                line-height: 1.8;
            }
            
            .form-control-market {
                font-size: 1.3rem !important;
                padding: 18px 25px !important;
            }
            
            .form-label-market {
                font-size: 1.4rem !important;
                margin-bottom: 12px !important;
            }
            
            .checkout-title {
                font-size: 2.5rem !important;
            }
            
            .submit-order-btn {
                font-size: 1.6rem !important;
                padding: 22px !important;
            }
        }
        
        .navbar-market {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            box-shadow: var(--shadow);
            padding: 15px 0;
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        
        .nav-brand {
            font-size: 2rem;
            font-weight: 800;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .product-container {
            background: white;
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            overflow: hidden;
            margin: 40px auto;
            transition: transform 0.3s ease;
        }
        
        .product-container:hover {
            transform: translateY(-5px);
        }
        
        .product-image-section {
            background: var(--light-bg);
            padding: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 650px;
        }
        
        .product-image {
            width: 100%;
            max-height: 550px;
            object-fit: contain;
            border-radius: var(--radius);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
            transition: transform 0.3s ease;
        }
        
        .product-image:hover {
            transform: scale(1.02);
        }
        
        .product-info-section {
            padding: 40px;
            background: white;
        }
        
        .product-title {
            font-size: 2.8rem;
            font-weight: 900;
            margin-bottom: 25px;
            color: var(--primary-color);
            line-height: 1.2;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .price-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: var(--radius);
            margin: 30px 0;
            box-shadow: 0 15px 35px rgba(102, 126, 234, 0.25);
            position: relative;
            overflow: hidden;
        }
        
        .price-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg, #ff6b6b, #4ecdc4);
        }
        
        .old-price {
            font-size: 2.2rem;
            text-decoration: line-through;
            color: rgba(255,255,255,0.85);
            font-weight: 500;
        }
        
        .current-price {
            font-size: 4rem;
            font-weight: 900;
            color: white;
            line-height: 1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .discount-badge {
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
            color: white;
            padding: 12px 30px;
            border-radius: 50px;
            font-weight: 800;
            font-size: 1.5rem;
            display: inline-block;
            margin-top: 20px;
            box-shadow: 0 5px 15px rgba(255,107,107,0.3);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .features-list {
            background: var(--light-bg);
            border-radius: var(--radius);
            padding: 30px;
            margin: 30px 0;
            border: 2px solid #e9ecef;
        }
        
        .feature-item {
            padding: 15px 20px;
            margin: 10px 0;
            background: white;
            border-radius: 10px;
            border-left: 5px solid var(--accent-color);
            display: flex;
            align-items: center;
            font-size: 1.2rem;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .feature-item:hover {
            transform: translateX(10px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .feature-icon {
            color: var(--accent-color);
            margin-right: 15px;
            font-size: 1.3rem;
            min-width: 25px;
        }
        
        .description-box {
            background: linear-gradient(135deg, #f0f4ff 0%, #f8f9ff 100%);
            border-radius: var(--radius);
            padding: 30px;
            margin: 30px 0;
            max-height: 500px;
            overflow-y: auto;
            line-height: 1.8;
            font-size: 1.2rem;
            border: 2px dashed #c3cfe2;
        }
        
        .description-box::-webkit-scrollbar {
            width: 10px;
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
            top: 100px;
            background: white;
            border-radius: var(--radius);
            box-shadow: 0 20px 50px rgba(0,0,0,0.15);
            padding: 40px;
            margin-top: 40px;
            border: 2px solid #e9ecef;
        }
        
        .checkout-title {
            font-size: 2.2rem;
            font-weight: 900;
            margin-bottom: 30px;
            color: var(--primary-color);
            text-align: center;
            position: relative;
            padding-bottom: 15px;
        }
        
        .checkout-title::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 4px;
            background: linear-gradient(90deg, var(--accent-color), var(--warning-color));
            border-radius: 2px;
        }
        
        .form-label-market {
            font-weight: 700;
            color: var(--dark-text);
            margin-bottom: 10px;
            display: block;
            font-size: 1.3rem;
        }
        
        .form-control-market {
            border: 2px solid #dee2e6;
            border-radius: 12px;
            padding: 16px 20px;
            font-size: 1.2rem;
            transition: all 0.3s ease;
            background: var(--light-bg);
            width: 100%;
        }
        
        .form-control-market:focus {
            border-color: var(--accent-color);
            box-shadow: 0 0 0 4px rgba(231, 76, 60, 0.2);
            background: white;
            outline: none;
        }
        
        .shipping-option-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px 20px;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            margin-bottom: 12px;
            cursor: pointer;
            font-size: 1.2rem;
            transition: all 0.3s ease;
        }
        
        .shipping-option-row:hover {
            border-color: var(--accent-color);
            background-color: rgba(231, 76, 60, 0.05);
        }
        
        .shipping-option-row.active {
            border-color: var(--accent-color);
            background-color: rgba(231, 76, 60, 0.1);
            box-shadow: 0 5px 15px rgba(231, 76, 60, 0.1);
        }
        
        .order-summary-box {
            background: var(--light-bg);
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border: 2px solid #e9ecef;
        }
        
        .order-summary-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 2px dashed #dee2e6;
            font-size: 1.2rem;
            align-items: center;
        }
        
        .order-summary-total {
            display: flex;
            justify-content: space-between;
            padding: 20px 0;
            font-size: 1.8rem;
            font-weight: 900;
            color: var(--dark-text);
            border-top: 3px solid var(--accent-color);
            margin-top: 10px;
        }
        
        .submit-order-btn {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            border: none;
            padding: 20px;
            font-size: 1.5rem;
            font-weight: 800;
            border-radius: 12px;
            width: 100%;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            overflow: hidden;
        }
        
        .submit-order-btn:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(231, 76, 60, 0.4);
        }
        
        .submit-order-btn::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: 0.5s;
        }
        
        .submit-order-btn:hover::after {
            left: 100%;
        }
        
        .whatsapp-float {
            position: fixed;
            bottom: 40px;
            right: 40px;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            color: white;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(37, 211, 102, 0.4);
            animation: float 3s ease-in-out infinite;
            transition: all 0.3s ease;
        }
        
        .whatsapp-float:hover {
            transform: scale(1.1);
            box-shadow: 0 15px 40px rgba(37, 211, 102, 0.6);
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        .countdown-timer {
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
            color: white;
            padding: 25px;
            border-radius: var(--radius);
            text-align: center;
            margin: 25px 0;
            font-weight: 700;
            font-size: 1.4rem;
            box-shadow: 0 10px 25px rgba(255,107,107,0.3);
        }
        
        .timer-digits {
            font-size: 3rem;
            font-weight: 900;
            letter-spacing: 3px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            font-family: monospace;
        }
        
        .quantity-selector {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 25px;
            background: var(--light-bg);
            padding: 20px;
            border-radius: 15px;
            margin: 25px 0;
            border: 2px solid #dee2e6;
        }
        
        .quantity-btn {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent-color), #ff8e53);
            color: white;
            border: none;
            font-size: 1.8rem;
            font-weight: 900;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
        }
        
        .quantity-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 8px 20px rgba(231, 76, 60, 0.4);
        }
        
        .quantity-display {
            font-size: 2.5rem;
            font-weight: 900;
            min-width: 80px;
            text-align: center;
            color: var(--dark-text);
        }
        
        .trust-badges {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .trust-badge {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08);
            display: flex;
            align-items: center;
            gap: 15px;
            font-weight: 700;
            color: var(--dark-text);
            font-size: 1.1rem;
            border-top: 4px solid var(--success-color);
            transition: transform 0.3s ease;
        }
        
        .trust-badge:hover {
            transform: translateY(-5px);
        }
        
        .review-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin: 15px 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            border-left: 5px solid var(--success-color);
            transition: transform 0.3s ease;
        }
        
        .review-card:hover {
            transform: translateY(-5px);
        }
        
        .review-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .review-profile-pic {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
            margin-right: 15px;
            border: 3px solid var(--success-color);
        }
        
        .review-name {
            font-weight: 800;
            color: var(--dark-text);
            font-size: 1.3rem;
        }
        
        .review-date {
            color: #666;
            font-size: 0.9rem;
        }
        
        .review-text {
            color: #444;
            line-height: 1.7;
            font-size: 1.1rem;
        }
        
        .review-rating {
            color: #FFD700;
            font-size: 1.2rem;
            margin: 10px 0;
        }
        
        /* Mobile Optimizations */
        @media (max-width: 768px) {
            .product-container {
                margin: 10px;
                border-radius: 10px;
            }
            
            .product-image-section, .product-info-section {
                padding: 20px;
            }
            
            .product-title {
                font-size: 2rem;
            }
            
            .current-price {
                font-size: 2.5rem;
            }
            
            .checkout-container {
                position: static;
                margin-top: 20px;
                padding: 20px;
            }
            
            .whatsapp-float {
                width: 60px;
                height: 60px;
                font-size: 30px;
                bottom: 20px;
                right: 20px;
            }
            
            .timer-digits {
                font-size: 2rem;
            }
        }
        
        /* Enhanced Form Elements */
        .required-star {
            color: #e74c3c;
            font-size: 1.5em;
            vertical-align: middle;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        .form-group label {
            display: flex;
            align-items: center;
            gap: 5px;
            margin-bottom: 8px;
        }
        
        .highlight-box {
            background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
            border-radius: var(--radius);
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            font-weight: 700;
            font-size: 1.3rem;
            border: 2px solid #fdcb6e;
        }
        
        .payment-method-card {
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            color: white;
            padding: 20px;
            border-radius: var(--radius);
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 10px 25px rgba(116, 185, 255, 0.3);
        }
        
        .payment-method-card i {
            font-size: 3rem;
            margin-bottom: 15px;
        }
        
        .payment-method-card h5 {
            font-weight: 800;
            margin: 10px 0;
        }
        
        .guarantee-badge {
            display: inline-block;
            background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            color: white;
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: 700;
            margin: 5px;
            font-size: 0.9rem;
        }
        
        .section-divider {
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2, #ff6b6b);
            border: none;
            margin: 40px 0;
            border-radius: 2px;
        }
        
        .floating-notification {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: white;
            border-left: 5px solid #00b894;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            z-index: 1000;
            max-width: 350px;
            animation: slideInLeft 0.5s ease;
            display: none;
        }
        
        @keyframes slideInLeft {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .order-counter {
            background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
            color: white;
            padding: 10px 25px;
            border-radius: 50px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 15px rgba(108, 92, 231, 0.3);
        }
        
        .order-counter i {
            animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .image-gallery {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        
        .gallery-image {
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 10px;
            cursor: pointer;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .gallery-image:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        
        .modal-image {
            max-width: 100%;
            max-height: 80vh;
            border-radius: 10px;
        }
        
        .info-tip {
            position: relative;
            display: inline-block;
            cursor: help;
        }
        
        .info-tip:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: var(--dark-text);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 0.9rem;
            white-space: nowrap;
            z-index: 1000;
            margin-bottom: 10px;
        }
        
        .info-tip:hover::before {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: var(--dark-text);
            margin-bottom: -2px;
        }
    </style>
</head>
<body>
    ${content}
    
    <a href="https://wa.me/${config.site.whatsapp}" target="_blank" class="whatsapp-float">
        <i class="fab fa-whatsapp"></i>
    </a>

    <div id="floatingNotification" class="floating-notification">
        <div class="d-flex align-items-center">
            <i class="fas fa-bell text-success fa-2x me-3"></i>
            <div>
                <h6 class="mb-1 fw-bold" id="notificationTitle">নতুন অর্ডার!</h6>
                <p class="mb-0 small" id="notificationText"></p>
            </div>
            <button class="btn-close ms-3" onclick="hideNotification()"></button>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Global variables
        let quantity = 1;
        let shippingInside = ${config.product.shipping.inside_dhaka};
        let shippingOutside = ${config.product.shipping.outside_dhaka};
        let selectedShipping = 'outside_dhaka';
        let productPrice = ${config.product.offer_price};
        
        // Format price function
        function formatPrice(price) {
            return '${config.site.currency_symbol}' + price.toLocaleString('en-IN');
        }
        
        // Quantity management
        function updateQuantity(change) {
            quantity += change;
            if (quantity < 1) quantity = 1;
            if (quantity > 10) quantity = 10;
            
            document.getElementById('quantityDisplay').textContent = quantity;
            document.getElementById('quantityInput').value = quantity;
            document.getElementById('orderQuantity').textContent = quantity;
            
            calculateTotal();
            
            // Track add to cart event
            if (typeof fbPixelEvents !== 'undefined') {
                ${config.facebook.track_add_to_cart ? 'fbPixelEvents.trackAddToCart();' : ''}
            }
        }
        
        // Shipping selection
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
        
        // Calculate total price
        function calculateTotal() {
            const shippingCost = selectedShipping === 'inside_dhaka' ? shippingInside : shippingOutside;
            const subtotal = productPrice * quantity;
            const total = subtotal + shippingCost;
            
            // Update all price displays
            const priceElements = [
                {id: 'productSubtotal', value: subtotal},
                {id: 'subtotalDisplay', value: subtotal},
                {id: 'shippingDisplay', value: shippingCost},
                {id: 'finalTotalDisplay', value: total},
                {id: 'finalPriceDisplay', value: total}
            ];
            
            priceElements.forEach(element => {
                const el = document.getElementById(element.id);
                if (el) {
                    el.textContent = formatPrice(element.value);
                }
            });
        }
        
        // Track checkout for Facebook Pixel
        function trackCheckout() {
            if (typeof fbPixelEvents !== 'undefined') {
                ${config.facebook.track_initiate_checkout ? 'fbPixelEvents.trackInitiateCheckout();' : ''}
            }
        }
        
        // Track lead for Facebook Pixel
        function trackLead() {
            if (typeof fbPixelEvents !== 'undefined') {
                ${config.facebook.track_lead ? 'fbPixelEvents.trackLead();' : ''}
            }
        }
        
        // Countdown timer
        function startCountdown() {
            const countdownElement = document.getElementById('countdown');
            if (!countdownElement) return;
            
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
        }
        
        // Show notification
        function showNotification(name, product, area) {
            const notification = document.getElementById('floatingNotification');
            const title = document.getElementById('notificationTitle');
            const text = document.getElementById('notificationText');
            
            const areas = {
                'inside_dhaka': 'ঢাকার মধ্যে',
                'outside_dhaka': 'ঢাকার বাইরে'
            };
            
            title.textContent = 'নতুন অর্ডার!';
            text.textContent = name + ' ' + product + ' অর্ডার করেছেন (' + (areas[area] || area) + ')';
            
            notification.style.display = 'block';
            
            setTimeout(hideNotification, 5000);
        }
        
        // Hide notification
        function hideNotification() {
            document.getElementById('floatingNotification').style.display = 'none';
        }
        
        // Simulate live orders
        function simulateLiveOrders() {
            const names = ['রহিম', 'করিম', 'সাদিয়া', 'নাসরিন', 'জাহিদ', 'ফারহানা', 'আহমেদ', 'মারিয়া'];
            const areas = ['inside_dhaka', 'outside_dhaka'];
            
            const randomName = names[Math.floor(Math.random() * names.length)];
            const randomArea = areas[Math.floor(Math.random() * areas.length)];
            
            showNotification(randomName, '${config.product.name}', randomArea);
            
            // Update order counter
            const orderCountElement = document.getElementById('orderCount');
            if (orderCountElement) {
                const currentCount = parseInt(orderCountElement.textContent) || 150;
                orderCountElement.textContent = currentCount + 1;
            }
        }
        
        // Image gallery modal
        function openImageModal(src) {
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'imageModal';
            modal.innerHTML = \`
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${config.product.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img src="\${src}" class="modal-image" alt="${config.product.name}">
                        </div>
                    </div>
                </div>
            \`;
            
            document.body.appendChild(modal);
            
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            
            modal.addEventListener('hidden.bs.modal', function() {
                modal.remove();
            });
        }
        
        // Initialize everything when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize countdown
            startCountdown();
            
            // Initialize Facebook Pixel tracking
            if (typeof fbPixelEvents !== 'undefined') {
                ${config.facebook.track_view_content ? 'fbPixelEvents.trackViewContent();' : ''}
            }
            
            // Scroll to order form when clicking order button
            document.querySelector('.btn-warning')?.addEventListener('click', function() {
                const formCard = document.querySelector('.form-card');
                if (formCard) {
                    formCard.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Add highlight effect
                    formCard.style.animation = 'none';
                    setTimeout(() => {
                        formCard.style.animation = 'pulse 1s';
                    }, 10);
                }
            });
            
            // Initialize image gallery click events
            document.querySelectorAll('.gallery-image').forEach(img => {
                img.addEventListener('click', function() {
                    openImageModal(this.src);
                });
            });
            
            // Simulate live orders every 15-25 seconds
            setInterval(simulateLiveOrders, Math.random() * 10000 + 15000);
            
            // Initialize order counter
            const orderCountElement = document.getElementById('orderCount');
            if (orderCountElement) {
                setInterval(() => {
                    const currentCount = parseInt(orderCountElement.textContent) || 150;
                    orderCountElement.textContent = currentCount + Math.floor(Math.random() * 3);
                }, 30000);
            }
            
            // Form validation enhancement
            const orderForm = document.getElementById('orderForm');
            if (orderForm) {
                orderForm.addEventListener('submit', function(e) {
                    const phoneInput = this.querySelector('input[name="phone"]');
                    if (phoneInput && phoneInput.value) {
                        // Basic phone number validation
                        const phoneRegex = /^[0-9\+\s\-\(\)]{11,15}$/;
                        if (!phoneRegex.test(phoneInput.value.replace(/\s/g, ''))) {
                            e.preventDefault();
                            alert('দয়া করে একটি সঠিক মোবাইল নম্বর দিন');
                            phoneInput.focus();
                            phoneInput.style.borderColor = '#e74c3c';
                        }
                    }
                });
            }
        });
        
        // Auto-scroll image gallery
        let currentImageIndex = 0;
        const images = ${JSON.stringify(config.product.images)};
        
        function autoScrollImages() {
            const galleryImages = document.querySelectorAll('.gallery-image');
            if (galleryImages.length > 0) {
                currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
                galleryImages[currentImageIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
        
        // Start auto-scroll if gallery exists
        if (images.length > 0) {
            setInterval(autoScrollImages, 3000);
        }
    </script>
</body>
</html>`;
}

// Routes
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
            <nav class="navbar navbar-market">
                <div class="container-lg">
                    <div class="d-flex justify-content-between align-items-center w-100">
                        <div class="nav-brand">
                            ${config.site.logo}
                            <span class="badge bg-warning ms-3" style="font-size: 0.8rem;">Official Store</span>
                        </div>
                        <div>
                            <span class="order-counter me-3">
                                <i class="fas fa-shopping-cart"></i>
                                <span id="orderCount">158</span> অর্ডার আজ
                            </span>
                            <a href="/admin-login" class="btn btn-outline-light btn-lg">
                                <i class="fas fa-user-shield me-2"></i>Admin
                            </a>
                        </div>
                    </div>
                </div>
            </nav>

            <div class="container-lg py-4">
                <div class="product-container">
                    <div class="row g-0">
                        <!-- Left Column - Product Images -->
                        <div class="col-lg-6">
                            <div class="product-image-section">
                                <div class="w-100">
                                    <!-- Main Product Image -->
                                    <div class="mb-4">
                                        <img src="${images[0]}" class="product-image" id="mainProductImage" alt="${config.product.name}">
                                    </div>
                                    
                                    <!-- Image Gallery -->
                                    <div class="image-gallery">
                                        ${images.slice(0, 6).map((img, i) => `
                                            <img src="${img}" class="gallery-image" alt="${config.product.name} ${i+1}" onclick="openImageModal('${img}')">
                                        `).join('')}
                                    </div>
                                    
                                    <!-- Trust Badges -->
                                    <div class="trust-badges mt-4">
                                        <div class="trust-badge">
                                            <i class="fas fa-shipping-fast fa-2x text-success"></i>
                                            <div>
                                                <strong>ক্যাশ অন ডেলিভারি</strong><br>
                                                <small>হাতে পণ্য, তারপর টাকা</small>
                                            </div>
                                        </div>
                                        <div class="trust-badge">
                                            <i class="fas fa-shield-alt fa-2x text-warning"></i>
                                            <div>
                                                <strong>১ বছর ওয়ারেন্টি</strong><br>
                                                <small>নিশ্চিন্তে ব্যবহার করুন</small>
                                            </div>
                                        </div>
                                        <div class="trust-badge">
                                            <i class="fas fa-headset fa-2x text-info"></i>
                                            <div>
                                                <strong>২৪/৭ সাপোর্ট</strong><br>
                                                <small>সবসময় আপনার পাশে</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Right Column - Product Info -->
                        <div class="col-lg-6">
                            <div class="product-info-section">
                                <h1 class="product-title">${product.name}</h1>
                                
                                <!-- Price Section -->
                                <div class="price-container">
                                    <span class="old-price">সাধারণ মূল্য: ${formatPrice(product.price)}</span>
                                    <span class="current-price">বিশেষ মূল্য: ${formatPrice(product.offer_price)}</span>
                                    <div class="discount-badge">
                                        <i class="fas fa-tag me-2"></i>${discount}% সেভ করুন
                                    </div>
                                    <div class="mt-3 text-white">
                                        <i class="fas fa-info-circle me-2"></i>
                                        সীমিত সময় অফার - স্টক শেষ হওয়ার আগেই অর্ডার করুন
                                    </div>
                                </div>
                                
                                <!-- Countdown Timer -->
                                <div class="countdown-timer">
                                    <i class="fas fa-clock me-2"></i>এই অফার শেষ হতে বাকি:
                                    <div class="timer-digits mt-2" id="countdown">23:59:59</div>
                                    <small class="d-block mt-2">অর্ডার করলে ২৪-৪৮ ঘন্টার মধ্যে ডেলিভারি</small>
                                </div>
                                
                                <!-- Quantity Selector -->
                                <div class="quantity-selector">
                                    <button class="quantity-btn" onclick="updateQuantity(-1)">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <span class="quantity-display" id="quantityDisplay">1</span>
                                    <button class="quantity-btn" onclick="updateQuantity(1)">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                    <span class="ms-3" style="font-weight: 700; font-size: 1.2rem;">
                                        টি পণ্য অর্ডার করছেন
                                    </span>
                                </div>
                                
                                <!-- Quick Order Button -->
                                <button class="btn btn-warning w-100 py-3 mb-4" style="font-size: 1.5rem; font-weight: 900; border-radius: 12px;">
                                    <i class="fas fa-bolt me-2"></i> দ্রুত অর্ডার করতে ক্লিক করুন
                                </button>
                                
                                <!-- Features List -->
                                <div class="features-list">
                                    <h5 class="section-title mb-4">
                                        <i class="fas fa-star text-warning me-2"></i>
                                        পণ্যের বিশেষ সুবিধাসমূহ
                                    </h5>
                                    ${features.map(feature => `
                                        <div class="feature-item">
                                            <i class="fas fa-check-circle feature-icon"></i>
                                            <span>${feature}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                
                                <!-- Product Description -->
                                <div class="description-box">
                                    <h5 class="fw-bold mb-3">পণ্য সম্পর্কে বিস্তারিত:</h5>
                                    ${product.description}
                                    <div class="mt-4">
                                        <span class="guarantee-badge">১০০% অরিজিনাল</span>
                                        <span class="guarantee-badge">৭ দিন রিটার্ন</span>
                                        <span class="guarantee-badge">পুরোপুরি সেফ</span>
                                        <span class="guarantee-badge">ব্যথাহীন</span>
                                    </div>
                                </div>
                                
                                <!-- Customer Reviews -->
                                <div class="mt-5">
                                    <h5 class="section-title mb-4">
                                        <i class="fas fa-comments text-primary me-2"></i>
                                        গ্রাহকদের মন্তব্য
                                    </h5>
                                    ${config.reviews.map(review => `
                                        <div class="review-card">
                                            <div class="review-header">
                                                <img src="${review.profilePic}" class="review-profile-pic" alt="${review.name}">
                                                <div>
                                                    <div class="review-name">${review.name}</div>
                                                    <div class="review-date">
                                                        <i class="far fa-clock me-1"></i>${review.date}
                                                    </div>
                                                    <div class="review-rating">${review.rating}</div>
                                                </div>
                                            </div>
                                            <div class="review-text">${review.text}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Order Form Section -->
                <div class="row mt-4">
                    <div class="col-lg-8 mx-auto">
                        <div class="checkout-container">
                            <h2 class="checkout-title">
                                <i class="fas fa-shopping-cart me-3"></i>
                                পণ্য অর্ডার করুন
                            </h2>
                            
                            <div class="highlight-box">
                                <i class="fas fa-exclamation-circle me-2"></i>
                                মাত্র ২ মিনিট সময় দিন এবং পণ্যটি আপনার দোরগোড়ায় পেয়ে যান
                            </div>
                            
                            <div class="form-card">
                                <div class="payment-method-card">
                                    <i class="fas fa-money-bill-wave"></i>
                                    <h5>ক্যাশ অন ডেলিভারি</h5>
                                    <p class="mb-0">পণ্য হাতে পেয়ে, দেখে শুনে তারপর টাকা দিবেন</p>
                                </div>
                                
                                <form action="/order" method="POST" id="orderForm" onsubmit="trackCheckout()">
                                    <input type="hidden" name="product_name" value="${product.name}">
                                    <input type="hidden" name="product_price" value="${product.offer_price}">
                                    <input type="hidden" name="quantity" id="quantityInput" value="1">
                                    
                                    <!-- Customer Information -->
                                    <div class="form-group">
                                        <label class="form-label-market">
                                            <i class="fas fa-user me-2"></i>
                                            আপনার সম্পূর্ণ নাম <span class="required-star">*</span>
                                        </label>
                                        <input type="text" name="customer_name" class="form-control-market" 
                                               placeholder="যেমন: আব্দুর রহিম" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label-market">
                                            <i class="fas fa-phone me-2"></i>
                                            মোবাইল নম্বর <span class="required-star">*</span>
                                            <span class="info-tip" data-tooltip="আমাদের প্রতিনিধি এই নম্বরে কল করবে">
                                                <i class="fas fa-question-circle text-primary"></i>
                                            </span>
                                        </label>
                                        <input type="tel" name="phone" class="form-control-market" 
                                               placeholder="যেমন: 01712345678" 
                                               pattern="[0-9]{11}" 
                                               title="11 ডিজিটের মোবাইল নম্বর দিন" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label-market">
                                            <i class="fas fa-map-marker-alt me-2"></i>
                                            সম্পূর্ণ ঠিকানা <span class="required-star">*</span>
                                        </label>
                                        <textarea name="address" class="form-control-market" rows="4" 
                                                  placeholder="বাড়ি নং, রাস্তা, থানা, জেলা, বিভাগ (বিস্তারিত লিখুন)" required></textarea>
                                    </div>
                                    
                                    <!-- Shipping Options -->
                                    <div class="form-group">
                                        <label class="form-label-market">
                                            <i class="fas fa-truck me-2"></i>
                                            ডেলিভারি লোকেশন
                                        </label>
                                        <div class="shipping-option-row active" onclick="selectShipping('outside_dhaka')">
                                            <div>
                                                <input type="radio" name="shipping_area" value="outside_dhaka" checked style="margin-right: 12px;">
                                                <span>ঢাকার বাইরে সমগ্র বাংলাদেশ</span>
                                            </div>
                                            <div>
                                                <span class="shipping-price">${formatPrice(shippingOutsideDhaka)}</span>
                                                <small class="text-muted d-block">২-৪ দিনের মধ্যে ডেলিভারি</small>
                                            </div>
                                        </div>
                                        <div class="shipping-option-row" onclick="selectShipping('inside_dhaka')">
                                            <div>
                                                <input type="radio" name="shipping_area" value="inside_dhaka" style="margin-right: 12px;">
                                                <span>ঢাকা সিটির মধ্যে</span>
                                            </div>
                                            <div>
                                                <span class="shipping-price">${formatPrice(shippingInsideDhaka)}</span>
                                                <small class="text-muted d-block">১-২ দিনের মধ্যে ডেলিভারি</small>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Order Summary -->
                                    <div class="order-summary-box">
                                        <h5 class="fw-bold mb-3">
                                            <i class="fas fa-receipt me-2"></i>
                                            অর্ডার সুমারি
                                        </h5>
                                        <div class="order-summary-item">
                                            <div class="d-flex align-items-center">
                                                <img src="${images[0]}" style="width: 70px; height: 70px; border-radius: 10px; object-fit: cover; margin-right: 15px;">
                                                <div>
                                                    <div class="fw-bold">${product.name}</div>
                                                    <div class="text-muted">পরিমাণ: <span id="orderQuantity">1</span> টি</div>
                                                </div>
                                            </div>
                                            <div class="fw-bold" id="productSubtotal">${formatPrice(product.offer_price)}</div>
                                        </div>
                                        <div class="order-summary-item">
                                            <span>পণ্যের মূল্য:</span>
                                            <span id="subtotalDisplay">${formatPrice(product.offer_price)}</span>
                                        </div>
                                        <div class="order-summary-item">
                                            <span>ডেলিভারি চার্জ:</span>
                                            <span id="shippingDisplay">${formatPrice(shippingOutsideDhaka)}</span>
                                        </div>
                                        <div class="order-summary-total">
                                            <span>সর্বমোট মূল্য:</span>
                                            <span id="finalTotalDisplay">${formatPrice(product.offer_price + shippingOutsideDhaka)}</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Final Order Button -->
                                    <button type="submit" class="submit-order-btn" onclick="trackLead()">
                                        <i class="fas fa-lock me-2"></i>
                                        নিরাপদে অর্ডার কনফার্ম করুন
                                        <div class="small mt-1">মোট: <span id="finalPriceDisplay">${formatPrice(product.offer_price + shippingOutsideDhaka)}</span></div>
                                    </button>
                                    
                                    <div class="text-center mt-3">
                                        <small class="text-muted">
                                            <i class="fas fa-lock me-1"></i>
                                            আপনার তথ্য নিরাপদে সংরক্ষিত হবে
                                        </small>
                                    </div>
                                </form>
                                
                                <!-- WhatsApp Button -->
                                <button class="btn btn-success w-100 py-3 mt-4" style="border-radius: 12px; font-size: 1.3rem;" 
                                        onclick="window.open('https://wa.me/${config.site.whatsapp}', '_blank')">
                                    <i class="fab fa-whatsapp me-2"></i> WhatsApp এ সরাসরি অর্ডার করুন
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Contact Info -->
                <div class="text-center mt-4 mb-5">
                    <div class="card border-0 shadow-sm" style="border-radius: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <div class="card-body py-3">
                            <h5 class="mb-2">
                                <i class="fas fa-headset me-2"></i>
                                ২৪/৭ হেল্পলাইন
                            </h5>
                            <p class="mb-0 fs-4 fw-bold">
                                <i class="fas fa-phone-volume me-2"></i>
                                ${config.site.phone}
                            </p>
                            <small>সকাল ৯টা থেকে রাত ১১টা পর্যন্ত খোলা</small>
                        </div>
                    </div>
                </div>
            </div>`;
        
        res.send(generateHTML(product.name, content));
    });
});

// Order submission route
app.post('/order', (req, res) => {
    const { customer_name, phone, address, shipping_area, quantity, product_name, product_price } = req.body;
    
    const shippingCost = shipping_area === 'inside_dhaka' ? config.product.shipping.inside_dhaka : config.product.shipping.outside_dhaka;
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
                                    ${config.site.logo}
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
                                                    <span class="badge bg-warning text-dark px-3 py-2" style="font-size: 1rem;">ORDER #${config.server.order_prefix}${orderId}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <h1 class="card-title mb-4" style="color: #2c3e50; font-weight: 800; font-size: 2.5rem;">অর্ডার কনফার্ম!</h1>
                                        <p class="card-text mb-4 fs-5" style="font-size: 1.3rem;">ধন্যবাদ <span class="fw-bold text-warning">${customer_name}</span> সাহেব/ম্যাডাম, আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।</p>
                                        
                                        <div class="card mb-4" style="border-radius: 15px; border: none;">
                                            <div class="card-body">
                                                <h5 class="mb-3" style="color: #667eea; font-size: 1.5rem;"><i class="fas fa-receipt me-2"></i>অর্ডার ডিটেইলস</h5>
                                                <div class="row">
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1" style="font-size: 1.1rem;"><strong>অর্ডার নং:</strong></p>
                                                        <h5 class="text-info" style="font-size: 1.4rem;">#${config.server.order_prefix}${orderId}</h5>
                                                    </div>
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1" style="font-size: 1.1rem;"><strong>পণ্য:</strong></p>
                                                        <h6 class="text-dark" style="font-size: 1.2rem;">${product_name}</h6>
                                                    </div>
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1" style="font-size: 1.1rem;"><strong>পরিমাণ:</strong></p>
                                                        <h6 class="text-dark" style="font-size: 1.2rem;">${quantity} টি</h6>
                                                    </div>
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1" style="font-size: 1.1rem;"><strong>ডেলিভারি:</strong></p>
                                                        <h6 class="text-dark" style="font-size: 1.2rem;">${shipping_area === 'inside_dhaka' ? 'ঢাকার মধ্যে' : 'ঢাকার বাইরে'}</h6>
                                                    </div>
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1" style="font-size: 1.1rem;"><strong>মোট মূল্য:</strong></p>
                                                        <h3 class="text-success" style="font-size: 2rem;">${formatPrice(total)}</h3>
                                                    </div>
                                                    <div class="col-md-6 text-start mb-3">
                                                        <p class="mb-1" style="font-size: 1.1rem;"><strong>স্ট্যাটাস:</strong></p>
                                                        <span class="badge bg-warning text-dark px-3 py-2" style="font-size: 1rem;">প্রক্রিয়াধীন</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="alert alert-info mb-4" style="border-radius: 15px; border: none; background: rgba(102, 126, 234, 0.1);">
                                            <div class="d-flex">
                                                <i class="fas fa-info-circle fa-2x me-3 text-info"></i>
                                                <div class="text-start">
                                                    <h6 class="mb-2" style="font-size: 1.2rem;"><i class="fas fa-clock me-1"></i>পরবর্তী ধাপ</h6>
                                                    <p class="mb-0" style="font-size: 1rem;">আমাদের প্রতিনিধি ৩০ মিনিটের মধ্যে আপনার সাথে যোগাযোগ করবে। ফোনটি কাছেই রাখবেন।</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <a href="/" class="btn btn-primary btn-lg w-100 py-3" style="border-radius: 12px; font-size: 1.2rem;">
                                                    <i class="fas fa-shopping-bag me-2"></i>আরও শপিং করুন
                                                </a>
                                            </div>
                                            <div class="col-md-6">
                                                <a href="https://wa.me/${config.site.whatsapp}?text=Hello%20I%20have%20ordered%20${encodeURIComponent(product_name)}%20Order%20ID:%20${config.server.order_prefix}${orderId}" 
                                                   target="_blank" class="btn btn-success btn-lg w-100 py-3" style="border-radius: 12px; font-size: 1.2rem;">
                                                    <i class="fab fa-whatsapp me-2"></i>WhatsApp এ কনফার্ম করুন
                                                </a>
                                            </div>
                                        </div>
                                        
                                        <div class="mt-4">
                                            <p class="text-dark" style="font-size: 1.1rem;">
                                                <i class="fas fa-headset me-1"></i>সাহায্য চাইলে কল করুন: <strong>${config.site.phone}</strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        if (typeof fbPixelEvents !== 'undefined') {
                            ${config.facebook.track_purchase ? `fbPixelEvents.trackPurchase('${config.server.order_prefix}${orderId}', ${total});` : ''}
                        }
                    </script>`;
                
                res.send(generateHTML('Order Confirmed', content));
            }
        }
    );
});

// Admin routes (keeping same as before)
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

app.get('/admin/dashboard', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        let content = `
            <nav class="navbar navbar-market">
                <div class="container">
                    <div class="d-flex justify-content-between align-items-center w-100">
                        <div class="nav-brand">
                            ${config.site.admin_logo}
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
                    <td>#${config.server.order_prefix}${order.id}</td>
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
                            <button class="btn btn-danger btn-sm" onclick="deleteOrder(${order.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        });
        
        content += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                function toggleSelectAll() {
                    const checkboxes = document.querySelectorAll('.order-checkbox');
                    const selectAll = document.getElementById('selectAll');
                    checkboxes.forEach(cb => cb.checked = selectAll.checked);
                }
                
                function updateStatus(orderId, status) {
                    fetch('/admin/update-status', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ orderId, status })
                    }).then(response => {
                        location.reload();
                    });
                }
                
                function deleteOrder(orderId) {
                    if (confirm('Are you sure you want to delete this order?')) {
                        fetch('/admin/delete-order', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ orderId })
                        }).then(response => {
                            location.reload();
                        });
                    }
                }
                
                function bulkAction(action) {
                    const selectedIds = [];
                    document.querySelectorAll('.order-checkbox:checked').forEach(cb => {
                        selectedIds.push(cb.value);
                    });
                    
                    if (selectedIds.length === 0) {
                        alert('Please select at least one order');
                        return;
                    }
                    
                    if (action === 'delete') {
                        if (!confirm('Are you sure you want to delete selected orders?')) return;
                    }
                    
                    fetch('/admin/bulk-action', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ action, orderIds: selectedIds })
                    }).then(response => {
                        location.reload();
                    });
                }
                
                function exportCSV() {
                    const table = document.getElementById('ordersTable');
                    let csv = [];
                    const rows = table.querySelectorAll('tr');
                    
                    for (let i = 0; i < rows.length; i++) {
                        const row = [], cols = rows[i].querySelectorAll('td, th');
                        
                        for (let j = 0; j < cols.length; j++) {
                            row.push(cols[j].innerText.replace(/,/g, ''));
                        }
                        
                        csv.push(row.join(","));
                    }
                    
                    const csvFile = new Blob([csv.join("\\n")], { type: "text/csv" });
                    const downloadLink = document.createElement("a");
                    downloadLink.download = "orders.csv";
                    downloadLink.href = window.URL.createObjectURL(csvFile);
                    downloadLink.style.display = "none";
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                }
            </script>`;
        
        res.send(generateHTML('Admin Dashboard', content));
    });
});

app.post('/admin/update-status', express.json(), (req, res) => {
    const { orderId, status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId], (err) => {
        res.json({ success: !err });
    });
});

app.post('/admin/delete-order', express.json(), (req, res) => {
    const { orderId } = req.body;
    db.run("DELETE FROM orders WHERE id = ?", [orderId], (err) => {
        res.json({ success: !err });
    });
});

app.post('/admin/bulk-action', express.json(), (req, res) => {
    const { action, orderIds } = req.body;
    
    if (action === 'delete') {
        const placeholders = orderIds.map(() => '?').join(',');
        db.run(`DELETE FROM orders WHERE id IN (${placeholders})`, orderIds, (err) => {
            res.json({ success: !err });
        });
    } else {
        const placeholders = orderIds.map(() => '?').join(',');
        db.run(`UPDATE orders SET status = ? WHERE id IN (${placeholders})`, [action, ...orderIds], (err) => {
            res.json({ success: !err });
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`📱 Mobile-friendly desktop mode enabled`);
    console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin-login`);
    console.log(`👤 Admin credentials: admin / admin123`);
});
