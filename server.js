const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const http = require('http');

// Create HTTP server for WebSocket
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Create necessary directories if they don't exist
const directories = [
    'public',
    'public/css',
    'public/js',
    'public/images',
    'public/images/icons',
    'uploads',
    'uploads/profile',
    'uploads/posts'
];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Create default images if they don't exist
const defaultImages = {
    'facebook-logo.png': 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
    'default-avatar.png': 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
    'default-cover.jpg': 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=1600&h=400',
    'like.png': 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png',
    'comment.png': 'https://cdn-icons-png.flaticon.com/512/1380/1380338.png',
    'share.png': 'https://cdn-icons-png.flaticon.com/512/565/565574.png'
};

// Create default CSS files
const createDefaultCSS = () => {
    const facebookCSS = `
/* Facebook Exact CSS */
:root {
    --primary-color: #1877f2;
    --secondary-color: #42b72a;
    --background-color: #f0f2f5;
    --header-color: #ffffff;
    --text-primary: #050505;
    --text-secondary: #65676b;
    --border-color: #dadde1;
    --hover-color: #f2f2f2;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
}

body {
    background-color: var(--background-color);
    color: var(--text-primary);
}

/* Facebook Header */
.facebook-header {
    background-color: var(--header-color);
    height: 56px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, .1);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
}

.header-container {
    max-width: 1260px;
    margin: 0 auto;
    height: 100%;
    padding: 0 16px;
    display: flex;
    align-items: center;
}

.logo-section {
    display: flex;
    align-items: center;
}

.facebook-logo {
    height: 40px;
    cursor: pointer;
}

.search-bar {
    flex: 1;
    max-width: 680px;
    margin-left: 10px;
}

.search-box {
    background-color: #f0f2f5;
    border-radius: 50px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
}

.search-box i {
    color: var(--text-secondary);
    margin-right: 8px;
}

.search-box input {
    border: none;
    background: none;
    outline: none;
    width: 100%;
    font-size: 15px;
}

.main-nav {
    flex: 1;
    display: flex;
    justify-content: center;
}

.nav-item {
    height: 56px;
    flex: 1;
    max-width: 111.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
}

.nav-item.active {
    border-bottom-color: var(--primary-color);
}

.nav-item i {
    font-size: 24px;
    color: var(--text-secondary);
}

.nav-item.active i {
    color: var(--primary-color);
}

.nav-item:hover {
    background-color: var(--hover-color);
}

.user-menu {
    display: flex;
    align-items: center;
    gap: 10px;
}

.menu-icon {
    width: 40px;
    height: 40px;
    background-color: #e4e6eb;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.profile-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
}

.profile-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Main Layout */
.main-container {
    max-width: 1260px;
    margin: 70px auto 20px;
    display: grid;
    grid-template-columns: 360px 1fr 360px;
    gap: 16px;
    padding: 0 16px;
}

/* Left Sidebar */
.left-sidebar {
    position: sticky;
    top: 70px;
    height: calc(100vh - 90px);
    overflow-y: auto;
}

.sidebar-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-bottom: 2px;
}

.sidebar-item:hover {
    background-color: var(--hover-color);
}

.sidebar-item img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    margin-right: 12px;
}

.sidebar-item i {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: #e4e6eb;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    font-size: 20px;
}

/* Story Section */
.stories-container {
    background-color: var(--header-color);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    border: 1px solid var(--border-color);
}

.story-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.story-header h3 {
    font-size: 17px;
    font-weight: 600;
}

.story-header a {
    color: var(--primary-color);
    text-decoration: none;
    font-size: 15px;
}

.stories {
    display: flex;
    gap: 8px;
    overflow-x: auto;
}

.story {
    min-width: 120px;
    height: 200px;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
}

.story img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.story.create-story {
    background: linear-gradient(180deg, #f5f6f7 0%, #e4e6eb 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.create-story-icon {
    width: 40px;
    height: 40px;
    background-color: var(--primary-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
}

.create-story-icon i {
    color: white;
    font-size: 20px;
}

/* Create Post */
.create-post {
    background-color: var(--header-color);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    border: 1px solid var(--border-color);
}

.post-input-container {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.post-input-container img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
}

.post-input {
    flex: 1;
    background-color: #f0f2f5;
    border-radius: 20px;
    padding: 12px 16px;
    border: none;
    outline: none;
    font-size: 17px;
    cursor: pointer;
}

.post-options {
    display: flex;
    border-top: 1px solid var(--border-color);
    padding-top: 12px;
}

.post-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.post-option:hover {
    background-color: var(--hover-color);
}

.post-option i {
    font-size: 24px;
}

/* Posts Feed */
.post {
    background-color: var(--header-color);
    border-radius: 8px;
    margin-bottom: 16px;
    border: 1px solid var(--border-color);
}

.post-header {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.post-author {
    display: flex;
    align-items: center;
    gap: 12px;
}

.post-author img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
}

.author-info h4 {
    font-size: 15px;
    font-weight: 600;
}

.author-info span {
    font-size: 13px;
    color: var(--text-secondary);
}

.post-actions {
    display: flex;
    gap: 8px;
}

.post-action-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s;
}

.post-action-btn:hover {
    background-color: var(--hover-color);
}

.post-content {
    padding: 0 16px 12px;
}

.post-text {
    margin-bottom: 12px;
    line-height: 1.4;
}

.post-image {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 12px;
}

.post-image img {
    width: 100%;
    max-height: 500px;
    object-fit: cover;
}

.post-stats {
    padding: 10px 16px;
    border-top: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    font-size: 15px;
    color: var(--text-secondary);
}

.post-interactions {
    display: flex;
    padding: 4px 16px;
}

.interaction-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.interaction-btn:hover {
    background-color: var(--hover-color);
}

/* Right Sidebar */
.right-sidebar {
    position: sticky;
    top: 70px;
    height: calc(100vh - 90px);
    overflow-y: auto;
}

.contacts-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
}

.contact-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.contact-item:hover {
    background-color: var(--hover-color);
}

.contact-item img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    margin-right: 12px;
    position: relative;
}

.online-indicator {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    background-color: var(--secondary-color);
    border-radius: 50%;
    border: 2px solid var(--header-color);
}

/* Login Page */
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: var(--background-color);
    padding: 20px;
}

.login-box {
    display: flex;
    max-width: 980px;
    width: 100%;
    background-color: var(--header-color);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, .1), 0 8px 16px rgba(0, 0, 0, .1);
    overflow: hidden;
}

.login-left {
    flex: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.login-left h1 {
    color: var(--primary-color);
    font-size: 3.5rem;
    margin-bottom: 20px;
}

.login-left p {
    font-size: 24px;
    line-height: 1.4;
}

.login-right {
    flex: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.login-card {
    background-color: var(--header-color);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, .1), 0 8px 16px rgba(0, 0, 0, .1);
}

.login-card input {
    width: 100%;
    padding: 14px 16px;
    margin-bottom: 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 17px;
}

.login-card input:focus {
    border-color: var(--primary-color);
    outline: none;
}

.login-btn {
    width: 100%;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 14px 16px;
    font-size: 20px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 16px;
}

.login-btn:hover {
    background-color: #166fe5;
}

.forgot-password {
    text-align: center;
    margin-bottom: 20px;
}

.forgot-password a {
    color: var(--primary-color);
    text-decoration: none;
}

.create-account-btn {
    background-color: var(--secondary-color);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 14px 16px;
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 20px;
}

.create-account-btn:hover {
    background-color: #36a420;
}

/* Admin Panel */
.admin-panel {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.admin-header {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 20px;
    color: white;
}

.admin-sidebar {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    min-height: calc(100vh - 80px);
    padding: 20px;
}

.admin-content {
    background: white;
    min-height: calc(100vh - 80px);
    border-radius: 20px 0 0 0;
    padding: 30px;
}

.user-row {
    transition: all 0.3s;
}

.user-row:hover {
    transform: translateX(5px);
    background-color: #f8f9fa;
}

.secret-admin-btn {
    background: linear-gradient(45deg, #ff6b6b, #ee5a24);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.secret-admin-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 5px 15px rgba(238, 90, 36, 0.4);
}

.reset-password-form {
    background: white;
    padding: 25px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    border-top: 5px solid #1877f2;
}

/* Responsive Design */
@media (max-width: 1200px) {
    .main-container {
        grid-template-columns: 280px 1fr;
    }
    .right-sidebar {
        display: none;
    }
}

@media (max-width: 900px) {
    .main-container {
        grid-template-columns: 1fr;
    }
    .left-sidebar {
        display: none;
    }
    .main-nav {
        display: none;
    }
}

@media (max-width: 768px) {
    .login-box {
        flex-direction: column;
    }
    .login-left {
        text-align: center;
        padding: 20px;
    }
    .login-left h1 {
        font-size: 2.5rem;
    }
    .login-left p {
        font-size: 20px;
    }
}
    `;

    const adminCSS = `
/* Admin Secret Panel */
.admin-secret {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 99999;
}

.admin-secret-btn {
    background: linear-gradient(45deg, #ff6b6b, #ee5a24);
    color: white;
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    transition: all 0.3s;
}

.admin-secret-btn:hover {
    transform: scale(1.1) rotate(180deg);
    box-shadow: 0 6px 20px rgba(238, 90, 36, 0.4);
}

.admin-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 100000;
}

.admin-modal-content {
    background: white;
    width: 90%;
    max-width: 500px;
    border-radius: 20px;
    overflow: hidden;
    animation: modalSlide 0.3s ease-out;
}

@keyframes modalSlide {
    from {
        opacity: 0;
        transform: translateY(-50px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.admin-modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.admin-modal-body {
    padding: 30px;
}

.admin-input {
    width: 100%;
    padding: 12px 15px;
    margin-bottom: 15px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 16px;
    transition: all 0.3s;
}

.admin-input:focus {
    border-color: #667eea;
    outline: none;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.admin-submit {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: all 0.3s;
}

.admin-submit:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.danger-btn {
    background: linear-gradient(45deg, #ff6b6b, #ee5a24);
}

.success-btn {
    background: linear-gradient(45deg, #42b72a, #2e8b57);
}

/* Secret Access Animation */
.secret-access {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: black;
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 1000000;
}

.access-granted {
    text-align: center;
    color: white;
}

.access-granted h1 {
    font-size: 3rem;
    margin-bottom: 20px;
    background: linear-gradient(45deg, #667eea, #764ba2, #42b72a);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* Live Monitoring */
.monitoring-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-top: 30px;
}

.monitor-card {
    background: white;
    padding: 25px;
    border-radius: 15px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: all 0.3s;
}

.monitor-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.monitor-value {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 10px 0;
}

.real-time-chart {
    height: 200px;
    margin-top: 20px;
}

/* User List Table */
.user-table {
    width: 100%;
    background: white;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.user-table th {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px;
    text-align: left;
}

.user-table td {
    padding: 15px;
    border-bottom: 1px solid #f0f0f0;
}

.user-avatar-small {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
}
    `;

    // Create CSS files
    fs.writeFileSync('public/css/facebook.css', facebookCSS);
    fs.writeFileSync('public/css/admin.css', adminCSS);
    console.log('Created CSS files');
};

// Create default JS files
const createDefaultJS = () => {
    const facebookJS = `
// Facebook Clone JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Facebook functionality
    initFacebook();
    
    // Load user data
    loadUserData();
    
    // Load posts
    loadPosts();
    
    // Load stories
    loadStories();
    
    // Load contacts
    loadContacts();
});

function initFacebook() {
    // Navigation active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Create post modal
    const postInput = document.querySelector('.post-input');
    if (postInput) {
        postInput.addEventListener('click', function() {
            showCreatePostModal();
        });
    }
    
    // Like button functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.like-btn')) {
            const postId = e.target.closest('.post').dataset.id;
            likePost(postId);
        }
        
        if (e.target.closest('.comment-btn')) {
            const postId = e.target.closest('.post').dataset.id;
            showComments(postId);
        }
        
        if (e.target.closest('.share-btn')) {
            const postId = e.target.closest('.post').dataset.id;
            sharePost(postId);
        }
    });
    
    // Story creation
    const createStoryBtn = document.querySelector('.story.create-story');
    if (createStoryBtn) {
        createStoryBtn.addEventListener('click', function() {
            showCreateStoryModal();
        });
    }
    
    // Search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchUsers(e.target.value);
        });
    }
}

function loadUserData() {
    fetch('/api/user/data')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateUserUI(data.user);
            }
        });
}

function loadPosts() {
    fetch('/api/posts')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderPosts(data.posts);
            }
        });
}

function loadStories() {
    fetch('/api/stories')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderStories(data.stories);
            }
        });
}

function loadContacts() {
    fetch('/api/contacts')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderContacts(data.contacts);
            }
        });
}

function updateUserUI(user) {
    // Update profile pictures
    const profileImages = document.querySelectorAll('.profile-icon img');
    profileImages.forEach(img => {
        if (user.profile_picture) {
            img.src = user.profile_picture;
        }
    });
    
    // Update user name
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = user.first_name + ' ' + user.last_name;
    });
}

function renderPosts(posts) {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;
    
    feed.innerHTML = posts.map(post => \`
        <div class="post" data-id="\${post.id}">
            <div class="post-header">
                <div class="post-author">
                    <img src="\${post.author.profile_picture || '/images/default-avatar.png'}" alt="\${post.author.name}">
                    <div class="author-info">
                        <h4>\${post.author.name}</h4>
                        <span>\${formatTime(post.created_at)} • <i class="fas fa-globe-americas"></i></span>
                    </div>
                </div>
                <div class="post-actions">
                    <div class="post-action-btn">
                        <i class="fas fa-ellipsis-h"></i>
                    </div>
                </div>
            </div>
            <div class="post-content">
                <div class="post-text">\${post.content}</div>
                \${post.image ? \`
                <div class="post-image">
                    <img src="\${post.image}" alt="Post image">
                </div>
                \` : ''}
            </div>
            <div class="post-stats">
                <span>\${post.likes} likes</span>
                <span>\${post.comments} comments</span>
                <span>\${post.shares} shares</span>
            </div>
            <div class="post-interactions">
                <div class="interaction-btn like-btn">
                    <i class="fas fa-thumbs-up"></i>
                    <span>Like</span>
                </div>
                <div class="interaction-btn comment-btn">
                    <i class="fas fa-comment"></i>
                    <span>Comment</span>
                </div>
                <div class="interaction-btn share-btn">
                    <i class="fas fa-share"></i>
                    <span>Share</span>
                </div>
            </div>
        </div>
    \`).join('');
}

function renderStories(stories) {
    const container = document.querySelector('.stories');
    if (!container) return;
    
    container.innerHTML = stories.map(story => \`
        <div class="story">
            <img src="\${story.image}" alt="\${story.author.name}">
            <div style="position: absolute; bottom: 10px; left: 10px; color: white; font-weight: 600;">
                \${story.author.name}
            </div>
        </div>
    \`).join('');
    
    // Add create story button
    container.innerHTML += \`
        <div class="story create-story">
            <div class="create-story-icon">
                <i class="fas fa-plus"></i>
            </div>
            <div style="font-weight: 600; text-align: center;">Create Story</div>
        </div>
    \`;
}

function renderContacts(contacts) {
    const container = document.getElementById('contactsList');
    if (!container) return;
    
    container.innerHTML = contacts.map(contact => \`
        <div class="contact-item">
            <div style="position: relative;">
                <img src="\${contact.profile_picture || '/images/default-avatar.png'}" alt="\${contact.name}">
                \${contact.online ? '<div class="online-indicator"></div>' : ''}
            </div>
            <span>\${contact.name}</span>
        </div>
    \`).join('');
}

function formatTime(timestamp) {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diff = Math.floor((now - postDate) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return \`\${Math.floor(diff / 60)}m\`;
    if (diff < 86400) return \`\${Math.floor(diff / 3600)}h\`;
    if (diff < 604800) return \`\${Math.floor(diff / 86400)}d\`;
    return postDate.toLocaleDateString();
}

function likePost(postId) {
    fetch(\`/api/posts/\${postId}/like\`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update like count
            const likeCount = document.querySelector(\`.post[data-id="\${postId}"] .post-stats span:first-child\`);
            if (likeCount) {
                const current = parseInt(likeCount.textContent) || 0;
                likeCount.textContent = \`\${current + 1} likes\`;
            }
        }
    });
}

function showCreatePostModal() {
    // Implement create post modal
    alert('Create post functionality coming soon!');
}

function showCreateStoryModal() {
    // Implement create story modal
    alert('Create story functionality coming soon!');
}

function searchUsers(query) {
    if (query.length < 2) return;
    
    fetch(\`/api/search?q=\${encodeURIComponent(query)}\`)
        .then(response => response.json())
        .then(data => {
            // Show search results
            console.log('Search results:', data);
        });
}

// Real-time updates via WebSocket
let ws = null;
function connectWebSocket() {
    ws = new WebSocket('ws://' + window.location.host);
    
    ws.onopen = function() {
        console.log('Connected to Facebook WebSocket');
    };
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    ws.onclose = function() {
        console.log('Disconnected, reconnecting...');
        setTimeout(connectWebSocket, 3000);
    };
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'new_post':
            addNewPost(data.post);
            break;
        case 'new_story':
            addNewStory(data.story);
            break;
        case 'friend_online':
            updateFriendStatus(data.userId, true);
            break;
        case 'friend_offline':
            updateFriendStatus(data.userId, false);
            break;
        case 'notification':
            showNotification(data.message);
            break;
    }
}

function addNewPost(post) {
    const feed = document.getElementById('postsFeed');
    if (feed) {
        const postElement = createPostElement(post);
        feed.insertBefore(postElement, feed.firstChild);
    }
}

function addNewStory(story) {
    const stories = document.querySelector('.stories');
    if (stories) {
        const storyElement = createStoryElement(story);
        stories.insertBefore(storyElement, stories.children[1]); // After create story button
    }
}

function updateFriendStatus(userId, online) {
    const contact = document.querySelector(\`.contact-item[data-user-id="\${userId}"] .online-indicator\`);
    if (contact) {
        contact.style.display = online ? 'block' : 'none';
    }
}

function showNotification(message) {
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = \`
        <div style="position: fixed; top: 20px; right: 20px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 9999;">
            <i class="fas fa-bell" style="color: #1877f2; margin-right: 10px;"></i>
            \${message}
        </div>
    \`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Connect WebSocket when page loads
connectWebSocket();
    `;

    const adminJS = `
// Secret Admin Panel JavaScript
let adminAuthenticated = false;
let adminPanelVisible = false;

// Create secret admin button
function createSecretAdminButton() {
    // Check if user is admin
    fetch('/api/admin/check')
        .then(response => response.json())
        .then(data => {
            if (data.isAdmin) {
                const adminBtn = document.createElement('div');
                adminBtn.className = 'admin-secret';
                adminBtn.innerHTML = \`
                    <button class="admin-secret-btn" onclick="toggleAdminPanel()">
                        <i class="fas fa-user-secret"></i>
                    </button>
                \`;
                document.body.appendChild(adminBtn);
            }
        });
}

function toggleAdminPanel() {
    if (!adminPanelVisible) {
        showAdminLogin();
    } else {
        hideAdminPanel();
    }
}

function showAdminLogin() {
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.id = 'adminLoginModal';
    modal.innerHTML = \`
        <div class="admin-modal-content">
            <div class="admin-modal-header">
                <h3 style="margin: 0;">🔐 Secret Admin Access</h3>
                <button onclick="hideAdminPanel()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
            </div>
            <div class="admin-modal-body">
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-user-shield" style="font-size: 48px; color: #667eea;"></i>
                    <h3 style="margin-top: 10px;">Admin Authentication Required</h3>
                    <p style="color: #666;">Enter super admin credentials</p>
                </div>
                <input type="password" id="adminPassword" class="admin-input" placeholder="Super Admin Password" autocomplete="off">
                <div style="display: flex; gap: 10px;">
                    <button onclick="authenticateAdmin()" class="admin-submit">
                        <i class="fas fa-sign-in-alt"></i> Authenticate
                    </button>
                    <button onclick="hideAdminPanel()" class="admin-submit danger-btn">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
                <div id="adminError" style="color: #ff6b6b; margin-top: 10px; display: none;">
                    <i class="fas fa-exclamation-triangle"></i> Invalid credentials
                </div>
            </div>
        </div>
    \`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    adminPanelVisible = true;
    
    // Focus on password input
    setTimeout(() => {
        document.getElementById('adminPassword').focus();
    }, 100);
}

function authenticateAdmin() {
    const password = document.getElementById('adminPassword').value;
    
    fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            adminAuthenticated = true;
            showAdminDashboard();
        } else {
            showAdminError();
        }
    });
}

function showAdminError() {
    const errorDiv = document.getElementById('adminError');
    errorDiv.style.display = 'block';
    
    // Shake animation
    const passwordInput = document.getElementById('adminPassword');
    passwordInput.style.animation = 'shake 0.5s';
    setTimeout(() => {
        passwordInput.style.animation = '';
    }, 500);
}

function showAdminDashboard() {
    document.getElementById('adminLoginModal').remove();
    
    const dashboard = document.createElement('div');
    dashboard.className = 'admin-modal';
    dashboard.id = 'adminDashboard';
    dashboard.innerHTML = \`
        <div class="admin-modal-content" style="max-width: 900px; max-height: 80vh; overflow-y: auto;">
            <div class="admin-modal-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-shield"></i>
                    <h3 style="margin: 0;">🔓 ADMIN CONTROL PANEL</h3>
                </div>
                <button onclick="hideAdminPanel()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
            </div>
            <div class="admin-modal-body">
                <!-- Admin Navigation -->
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button onclick="showUserManagement()" class="admin-submit">
                        <i class="fas fa-users"></i> Users
                    </button>
                    <button onclick="showSystemMonitor()" class="admin-submit">
                        <i class="fas fa-chart-line"></i> Monitor
                    </button>
                    <button onclick="showPasswordReset()" class="admin-submit danger-btn">
                        <i class="fas fa-key"></i> Reset Password
                    </button>
                </div>
                
                <!-- Content Area -->
                <div id="adminContent">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-lock-open" style="font-size: 64px; color: #42b72a;"></i>
                        <h2 style="margin-top: 20px;">Access Granted</h2>
                        <p style="color: #666;">Welcome to the secret admin panel</p>
                    </div>
                </div>
            </div>
        </div>
    \`;
    document.body.appendChild(dashboard);
    dashboard.style.display = 'flex';
    
    // Show user management by default
    showUserManagement();
}

function showUserManagement() {
    fetch('/api/admin/users')
        .then(response => response.json())
        .then(data => {
            const content = document.getElementById('adminContent');
            content.innerHTML = \`
                <h3><i class="fas fa-users"></i> User Management</h3>
                <p style="color: #666; margin-bottom: 20px;">Total Users: \${data.totalUsers}</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h4><i class="fas fa-search"></i> Search User</h4>
                    <input type="text" id="searchUser" class="admin-input" placeholder="Search by username, email, or name..." 
                           oninput="searchUsers(this.value)">
                    <div id="searchResults" style="margin-top: 10px;"></div>
                </div>
                
                <div style="overflow-x: auto;">
                    <table class="user-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            \${data.users.map(user => \`
                                <tr class="user-row" data-user-id="\${user.id}">
                                    <td>\${user.id}</td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <img src="\${user.profile_picture || '/images/default-avatar.png'}" 
                                                 class="user-avatar-small">
                                            <div>
                                                <div style="font-weight: 600;">\${user.first_name} \${user.last_name}</div>
                                                <small style="color: #666;">@\${user.username}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>\${user.email}</td>
                                    <td>
                                        <span class="badge" style="background: \${user.active ? '#42b72a' : '#ff6b6b'}; color: white; padding: 5px 10px; border-radius: 20px;">
                                            \${user.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <button onclick="resetUserPassword(\${user.id})" class="secret-admin-btn">
                                            <i class="fas fa-key"></i> Reset Pass
                                        </button>
                                    </td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                </div>
            \`;
        });
}

function searchUsers(query) {
    if (!query.trim()) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    fetch(\`/api/admin/search?q=\${encodeURIComponent(query)}\`)
        .then(response => response.json())
        .then(data => {
            const resultsDiv = document.getElementById('searchResults');
            if (data.users.length === 0) {
                resultsDiv.innerHTML = '<p style="color: #666; padding: 10px;">No users found</p>';
                return;
            }
            
            resultsDiv.innerHTML = data.users.map(user => \`
                <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="\${user.profile_picture || '/images/default-avatar.png'}" 
                             class="user-avatar-small">
                        <div>
                            <div style="font-weight: 600;">\${user.first_name} \${user.last_name}</div>
                            <small style="color: #666;">\${user.email}</small>
                        </div>
                    </div>
                    <button onclick="resetUserPassword(\${user.id})" class="secret-admin-btn" style="padding: 5px 10px; font-size: 12px;">
                        <i class="fas fa-key"></i> Reset
                    </button>
                </div>
            \`).join('');
        });
}

function resetUserPassword(userId) {
    const newPassword = prompt('Enter new password for this user:');
    if (!newPassword) return;
    
    if (!confirm('Are you sure you want to reset this user\\'s password?')) return;
    
    fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            user_id: userId,
            new_password: newPassword 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('✅ Password reset successfully!');
            showUserManagement();
        } else {
            alert('❌ Failed to reset password: ' + data.message);
        }
    });
}

function showSystemMonitor() {
    const content = document.getElementById('adminContent');
    content.innerHTML = \`
        <h3><i class="fas fa-chart-line"></i> System Monitor</h3>
        
        <div class="monitoring-grid">
            <div class="monitor-card">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-users" style="color: #1877f2; font-size: 24px;"></i>
                    <h4 style="margin: 0;">Online Users</h4>
                </div>
                <div class="monitor-value" id="onlineUsers">0</div>
                <div style="color: #666;">Active in last 5 minutes</div>
            </div>
            
            <div class="monitor-card">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-newspaper" style="color: #42b72a; font-size: 24px;"></i>
                    <h4 style="margin: 0;">Total Posts</h4>
                </div>
                <div class="monitor-value" id="totalPosts">0</div>
                <div style="color: #666;">Posts created today</div>
            </div>
            
            <div class="monitor-card">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-comments" style="color: #ff6b6b; font-size: 24px;"></i>
                    <h4 style="margin: 0;">Messages</h4>
                </div>
                <div class="monitor-value" id="totalMessages">0</div>
                <div style="color: #666;">Messages sent today</div>
            </div>
            
            <div class="monitor-card">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-database" style="color: #764ba2; font-size: 24px;"></i>
                    <h4 style="margin: 0;">Database Size</h4>
                </div>
                <div class="monitor-value" id="dbSize">0 MB</div>
                <div style="color: #666;">Current database size</div>
            </div>
        </div>
        
        <div style="margin-top: 30px;">
            <h4><i class="fas fa-history"></i> Recent Activity</h4>
            <div id="recentActivity" style="margin-top: 10px;"></div>
        </div>
    \`;
    
    // Start monitoring updates
    updateSystemMonitor();
    setInterval(updateSystemMonitor, 5000);
}

function updateSystemMonitor() {
    fetch('/api/admin/stats')
        .then(response => response.json())
        .then(data => {
            document.getElementById('onlineUsers').textContent = data.onlineUsers;
            document.getElementById('totalPosts').textContent = data.totalPosts;
            document.getElementById('totalMessages').textContent = data.totalMessages;
            document.getElementById('dbSize').textContent = data.dbSize;
            
            const activityDiv = document.getElementById('recentActivity');
            if (activityDiv) {
                activityDiv.innerHTML = data.recentActivity.map(activity => \`
                    <div style="background: #f8f9fa; padding: 10px 15px; border-radius: 8px; margin-bottom: 5px; border-left: 4px solid #1877f2;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: 600;">\${activity.action}</span>
                            <small style="color: #666;">\${activity.time}</small>
                        </div>
                        <small style="color: #666;">IP: \${activity.ip}</small>
                    </div>
                \`).join('');
            }
        });
}

function showPasswordReset() {
    const content = document.getElementById('adminContent');
    content.innerHTML = \`
        <div class="reset-password-form">
            <h3><i class="fas fa-key"></i> Reset User Password</h3>
            <p style="color: #666; margin-bottom: 20px;">Reset password for any user (Super Admin Only)</p>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Select User</label>
                <select id="resetUserSelect" class="admin-input" onchange="showUserInfo(this.value)">
                    <option value="">Select a user...</option>
                </select>
            </div>
            
            <div id="userInfo" style="display: none; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div id="selectedUserInfo"></div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">New Password</label>
                <input type="password" id="newPassword" class="admin-input" placeholder="Enter new password">
                <input type="password" id="confirmPassword" class="admin-input" placeholder="Confirm new password" style="margin-top: 10px;">
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="performPasswordReset()" class="admin-submit danger-btn">
                    <i class="fas fa-key"></i> Reset Password
                </button>
                <button onclick="generatePassword()" class="admin-submit">
                    <i class="fas fa-random"></i> Generate Secure
                </button>
            </div>
            
            <div id="resetResult" style="margin-top: 20px;"></div>
        </div>
    \`;
    
    // Load users for dropdown
    loadUsersForReset();
}

function loadUsersForReset() {
    fetch('/api/admin/all-users')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('resetUserSelect');
            select.innerHTML = '<option value="">Select a user...</option>' +
                data.users.map(user => \`
                    <option value="\${user.id}">
                        \${user.first_name} \${user.last_name} (@\${user.username}) - \${user.email}
                    </option>
                \`).join('');
        });
}

function showUserInfo(userId) {
    if (!userId) {
        document.getElementById('userInfo').style.display = 'none';
        return;
    }
    
    fetch(\`/api/admin/user/\${userId}\`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('selectedUserInfo').innerHTML = \`
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="\${data.user.profile_picture || '/images/default-avatar.png'}" 
                         style="width: 60px; height: 60px; border-radius: 50%;">
                    <div>
                        <h4 style="margin: 0;">\${data.user.first_name} \${data.user.last_name}</h4>
                        <p style="margin: 5px 0; color: #666;">@\${data.user.username}</p>
                        <p style="margin: 0; color: #666;">\${data.user.email}</p>
                        <small style="color: \${data.user.active ? '#42b72a' : '#ff6b6b'}">
                            \${data.user.active ? 'Active Account' : 'Inactive Account'}
                        </small>
                    </div>
                </div>
            \`;
            document.getElementById('userInfo').style.display = 'block';
        });
}

function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    document.getElementById('newPassword').value = password;
    document.getElementById('confirmPassword').value = password;
}

function performPasswordReset() {
    const userId = document.getElementById('resetUserSelect').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!userId || !newPassword || !confirmPassword) {
        showResetResult('Please fill all fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showResetResult('Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showResetResult('Password must be at least 8 characters', 'error');
        return;
    }
    
    if (!confirm('⚠️ ARE YOU SURE? This will reset the user\\'s password immediately!')) {
        return;
    }
    
    fetch('/api/admin/reset-password-force', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id: userId,
            new_password: newPassword,
            confirm: true
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showResetResult(\`✅ Password reset successfully! New password: \${newPassword}\`, 'success');
            // Clear fields
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            document.getElementById('resetUserSelect').value = '';
            document.getElementById('userInfo').style.display = 'none';
        } else {
            showResetResult('❌ Failed: ' + data.message, 'error');
        }
    });
}

function showResetResult(message, type) {
    const resultDiv = document.getElementById('resetResult');
    resultDiv.innerHTML = \`
        <div style="background: \${type === 'success' ? '#d4edda' : '#f8d7da'}; 
                    color: \${type === 'success' ? '#155724' : '#721c24'}; 
                    padding: 15px; border-radius: 8px; border: 1px solid \${type === 'success' ? '#c3e6cb' : '#f5c6cb'}">
            <i class="fas \${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            \${message}
        </div>
    \`;
}

function hideAdminPanel() {
    const modals = document.querySelectorAll('.admin-modal');
    modals.forEach(modal => modal.remove());
    adminPanelVisible = false;
    adminAuthenticated = false;
}

// Add shake animation
const style = document.createElement('style');
style.textContent = \`
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}
\`;
document.head.appendChild(style);

// Initialize admin button
setTimeout(createSecretAdminButton, 3000);
    `;

    // Create JS files
    fs.writeFileSync('public/js/facebook.js', facebookJS);
    fs.writeFileSync('public/js/admin.js', adminJS);
    console.log('Created JavaScript files');
};

// Create default HTML files
const createDefaultHTML = () => {
    const indexHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facebook - Clone</title>
    <link rel="stylesheet" href="/css/facebook.css">
    <link rel="stylesheet" href="/css/admin.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="icon" href="/images/facebook-logo.png">
</head>
<body>
    <!-- Facebook Header -->
    <header class="facebook-header">
        <div class="header-container">
            <!-- Logo -->
            <div class="logo-section">
                <img src="/images/facebook-logo.png" alt="Facebook" class="facebook-logo" onclick="location.href='/'">
                <div class="search-bar">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Search Facebook">
                    </div>
                </div>
            </div>
            
            <!-- Main Navigation -->
            <nav class="main-nav">
                <div class="nav-item active">
                    <i class="fas fa-home"></i>
                </div>
                <div class="nav-item">
                    <i class="fas fa-user-friends"></i>
                </div>
                <div class="nav-item">
                    <i class="fas fa-play-circle"></i>
                </div>
                <div class="nav-item">
                    <i class="fas fa-store"></i>
                </div>
                <div class="nav-item">
                    <i class="fas fa-users"></i>
                </div>
                <div class="nav-item">
                    <i class="fas fa-bell"></i>
                    <span class="notification-badge">3</span>
                </div>
            </nav>
            
            <!-- User Menu -->
            <div class="user-menu">
                <div class="menu-icon">
                    <i class="fas fa-bars"></i>
                </div>
                <div class="menu-icon">
                    <i class="fas fa-comment-dots"></i>
                    <span class="notification-badge">5</span>
                </div>
                <div class="menu-icon">
                    <i class="fas fa-caret-down"></i>
                </div>
                <div class="profile-icon">
                    <img src="/images/default-avatar.png" alt="Profile" id="userAvatar">
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <div class="main-container">
        <!-- Left Sidebar -->
        <aside class="left-sidebar">
            <!-- User Profile -->
            <div class="sidebar-item">
                <img src="/images/default-avatar.png" alt="Profile" id="sidebarAvatar">
                <span class="user-name">Loading...</span>
            </div>
            
            <!-- Friends -->
            <div class="sidebar-item">
                <i class="fas fa-user-friends"></i>
                <span>Friends</span>
            </div>
            
            <!-- Groups -->
            <div class="sidebar-item">
                <i class="fas fa-users"></i>
                <span>Groups</span>
            </div>
            
            <!-- Marketplace -->
            <div class="sidebar-item">
                <i class="fas fa-store"></i>
                <span>Marketplace</span>
            </div>
            
            <!-- Watch -->
            <div class="sidebar-item">
                <i class="fas fa-play-circle"></i>
                <span>Watch</span>
            </div>
            
            <!-- Memories -->
            <div class="sidebar-item">
                <i class="fas fa-history"></i>
                <span>Memories</span>
            </div>
            
            <!-- Saved -->
            <div class="sidebar-item">
                <i class="fas fa-bookmark"></i>
                <span>Saved</span>
            </div>
            
            <!-- Pages -->
            <div class="sidebar-item">
                <i class="fas fa-flag"></i>
                <span>Pages</span>
            </div>
            
            <!-- Events -->
            <div class="sidebar-item">
                <i class="fas fa-calendar-alt"></i>
                <span>Events</span>
            </div>
            
            <!-- Most Recent -->
            <div class="sidebar-item">
                <i class="fas fa-chevron-down"></i>
                <span>See More</span>
            </div>
            
            <!-- Shortcuts -->
            <div style="padding: 16px 8px 8px;">
                <div style="color: var(--text-secondary); font-size: 17px; font-weight: 600; margin-bottom: 8px;">
                    Your Shortcuts
                </div>
                <div class="sidebar-item">
                    <i class="fas fa-code"></i>
                    <span>Developer Circle</span>
                </div>
                <div class="sidebar-item">
                    <i class="fas fa-gamepad"></i>
                    <span>Gaming Video</span>
                </div>
            </div>
        </aside>

        <!-- Main Feed -->
        <main>
            <!-- Stories -->
            <div class="stories-container">
                <div class="story-header">
                    <h3>Stories</h3>
                    <a href="#">See All</a>
                </div>
                <div class="stories" id="storiesContainer">
                    <!-- Stories will be loaded here -->
                </div>
            </div>

            <!-- Create Post -->
            <div class="create-post">
                <div class="post-input-container">
                    <img src="/images/default-avatar.png" alt="Profile" id="createPostAvatar">
                    <input type="text" class="post-input" placeholder="What's on your mind?">
                </div>
                <div class="post-options">
                    <div class="post-option">
                        <i class="fas fa-video" style="color: #f02849;"></i>
                        <span>Live video</span>
                    </div>
                    <div class="post-option">
                        <i class="fas fa-images" style="color: #45bd62;"></i>
                        <span>Photo/video</span>
                    </div>
                    <div class="post-option">
                        <i class="fas fa-smile" style="color: #f7b928;"></i>
                        <span>Feeling/activity</span>
                    </div>
                </div>
            </div>

            <!-- Posts Feed -->
            <div id="postsFeed">
                <!-- Posts will be loaded here -->
            </div>
        </main>

        <!-- Right Sidebar -->
        <aside class="right-sidebar">
            <!-- Contacts Header -->
            <div class="contacts-header">
                <h3 style="font-size: 17px; font-weight: 600;">Contacts</h3>
                <div style="display: flex; gap: 15px;">
                    <i class="fas fa-video" style="color: var(--text-secondary); cursor: pointer;"></i>
                    <i class="fas fa-search" style="color: var(--text-secondary); cursor: pointer;"></i>
                    <i class="fas fa-ellipsis-h" style="color: var(--text-secondary); cursor: pointer;"></i>
                </div>
            </div>

            <!-- Contacts List -->
            <div id="contactsList">
                <!-- Contacts will be loaded here -->
            </div>

            <!-- Sponsored -->
            <div style="padding: 16px 0;">
                <div style="color: var(--text-secondary); font-size: 15px; margin-bottom: 8px;">
                    Sponsored
                </div>
                <!-- Ad content would go here -->
            </div>

            <!-- Footer Links -->
            <div style="padding: 16px 0;">
                <div style="color: var(--text-secondary); font-size: 13px; line-height: 1.6;">
                    Privacy · Terms · Advertising · Ad Choices · Cookies · More · Meta © 2024
                </div>
            </div>
        </aside>
    </div>

    <!-- Scripts -->
    <script src="/js/facebook.js"></script>
    <script src="/js/admin.js"></script>
</body>
</html>
    `;

    const loginHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facebook - Log in or Sign up</title>
    <link rel="stylesheet" href="/css/facebook.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="icon" href="/images/facebook-logo.png">
</head>
<body>
    <div class="login-container">
        <div class="login-box">
            <!-- Left Side -->
            <div class="login-left">
                <img src="/images/facebook-logo.png" alt="Facebook" style="height: 106px; margin-bottom: 20px;">
                <h1 style="color: #1877f2; font-size: 28px; margin-bottom: 0;">Facebook Clone</h1>
                <p style="font-size: 24px; line-height: 1.4; margin-top: 10px;">
                    Connect with friends and the world<br>around you on Facebook Clone.
                </p>
            </div>

            <!-- Right Side -->
            <div class="login-right">
                <div class="login-card">
                    <form id="loginForm">
                        <input type="text" placeholder="Email address or phone number" id="email" required>
                        <input type="password" placeholder="Password" id="password" required>
                        
                        <button type="submit" class="login-btn">
                            Log In
                        </button>
                        
                        <div class="forgot-password">
                            <a href="#" onclick="forgotPassword()">Forgotten password?</a>
                        </div>
                        
                        <div style="border-top: 1px solid #dadde1; margin: 20px 0;"></div>
                        
                        <button type="button" class="create-account-btn" onclick="showSignup()">
                            Create New Account
                        </button>
                    </form>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="#" style="color: black; font-weight: 600; text-decoration: none;">
                            Create a Page
                        </a>
                        <span style="color: #666;"> for a celebrity, brand or business.</span>
                    </div>
                </div>
                
                <!-- Demo Credentials -->
                <div style="margin-top: 20px; padding: 15px; background: #f0f2f5; border-radius: 8px;">
                    <h4 style="margin-bottom: 10px; color: #1877f2;">Demo Accounts:</h4>
                    <div style="font-size: 14px; color: #666;">
                        <div><strong>Admin:</strong> admin@facebook.com / admin123</div>
                        <div><strong>User 1:</strong> john@facebook.com / password123</div>
                        <div><strong>User 2:</strong> jane@facebook.com / password123</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Signup Modal -->
    <div id="signupModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; z-index: 1000;">
        <div style="background: white; width: 90%; max-width: 500px; border-radius: 8px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #1877f2;">Sign Up</h2>
                <button onclick="hideSignup()" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
            </div>
            
            <form id="signupForm">
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="text" placeholder="First name" id="firstName" required style="flex: 1;">
                    <input type="text" placeholder="Last name" id="lastName" required style="flex: 1;">
                </div>
                
                <input type="email" placeholder="Email address" id="signupEmail" required style="width: 100%; margin-bottom: 10px;">
                <input type="password" placeholder="New password" id="signupPassword" required style="width: 100%; margin-bottom: 10px;">
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; color: #666;">Birthday</label>
                    <input type="date" id="birthday" required style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #666;">Gender</label>
                    <div style="display: flex; gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 5px;">
                            <input type="radio" name="gender" value="male"> Male
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px;">
                            <input type="radio" name="gender" value="female"> Female
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px;">
                            <input type="radio" name="gender" value="other"> Other
                        </label>
                    </div>
                </div>
                
                <button type="submit" class="login-btn" style="background: #42b72a;">
                    Sign Up
                </button>
            </form>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/';
                } else {
                    alert('Login failed: ' + data.message);
                }
            });
        });
        
        document.getElementById('signupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const user = {
                first_name: document.getElementById('firstName').value,
                last_name: document.getElementById('lastName').value,
                email: document.getElementById('signupEmail').value,
                password: document.getElementById('signupPassword').value,
                birthday: document.getElementById('birthday').value,
                gender: document.querySelector('input[name="gender"]:checked').value
            };
            
            fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Account created successfully!');
                    hideSignup();
                } else {
                    alert('Signup failed: ' + data.message);
                }
            });
        });
        
        function showSignup() {
            document.getElementById('signupModal').style.display = 'flex';
        }
        
        function hideSignup() {
            document.getElementById('signupModal').style.display = 'none';
        }
        
        function forgotPassword() {
            const email = prompt('Enter your email address:');
            if (email) {
                fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                });
            }
        }
    </script>
</body>
</html>
    `;

    // Create HTML files
    fs.writeFileSync('public/index.html', indexHTML);
    fs.writeFileSync('public/login.html', loginHTML);
    console.log('Created HTML files');
};

// Initialize database
const initDatabase = () => {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            profile_picture TEXT DEFAULT '/images/default-avatar.png',
            cover_photo TEXT,
            bio TEXT,
            birthday DATE,
            gender TEXT,
            location TEXT,
            website TEXT,
            work_place TEXT,
            education TEXT,
            relationship_status TEXT,
            verified INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            is_admin INTEGER DEFAULT 0,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Posts table
        db.run(`CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            privacy TEXT DEFAULT 'public',
            likes_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            shares_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // Friends table
        db.run(`CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, friend_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // Messages table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // Stories table
        db.run(`CREATE TABLE IF NOT EXISTS stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            image_url TEXT NOT NULL,
            expires_at TIMESTAMP DEFAULT (DATETIME('now', '+24 hours')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // Admin logs table
        db.run(`CREATE TABLE IF NOT EXISTS admin_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER,
            action TEXT NOT NULL,
            target_user_id INTEGER,
            details TEXT,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Sessions table for tracking online users
        db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_id TEXT UNIQUE NOT NULL,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // Insert default admin user
        db.get("SELECT COUNT(*) as count FROM users WHERE is_admin = 1", (err, row) => {
            if (row.count === 0) {
                const adminPassword = bcrypt.hashSync('admin123', 10);
                db.run(`INSERT INTO users (username, email, password, first_name, last_name, is_admin, verified) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    ['admin', 'admin@facebook.com', adminPassword, 'Super', 'Admin', 1, 1]);
                
                // Insert demo users
                const demoUsers = [
                    ['john_doe', 'john@facebook.com', bcrypt.hashSync('password123', 10), 'John', 'Doe'],
                    ['jane_smith', 'jane@facebook.com', bcrypt.hashSync('password123', 10), 'Jane', 'Smith'],
                    ['mike_wilson', 'mike@facebook.com', bcrypt.hashSync('password123', 10), 'Mike', 'Wilson']
                ];
                
                demoUsers.forEach(user => {
                    db.run(`INSERT INTO users (username, email, password, first_name, last_name) 
                            VALUES (?, ?, ?, ?, ?)`, user);
                });
                
                console.log('Created admin and demo users');
            }
        });

        // Insert sample posts
        db.get("SELECT COUNT(*) as count FROM posts", (err, row) => {
            if (row.count === 0) {
                const samplePosts = [
                    [1, 'Welcome to Facebook Clone! This is a demonstration post.', null],
                    [2, 'Hello everyone! Excited to be here on Facebook Clone!', null],
                    [3, 'Beautiful day today! Hope everyone is having a great time!', null],
                    [4, 'Just testing out the new Facebook Clone platform. Looks amazing!', null]
                ];
                
                samplePosts.forEach(post => {
                    db.run(`INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`, post);
                });
                
                console.log('Created sample posts');
            }
        });
    });
};

// Initialize session middleware
const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET || 'facebook_clone_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Auth middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login.html');
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    db.get("SELECT is_admin FROM users WHERE id = ?", [req.session.userId], (err, user) => {
        if (!user || !user.is_admin) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        next();
    });
};

// Routes
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

// API Routes
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.json({ success: false, message: 'Invalid email or password' });
        }
        
        if (!user.active) {
            return res.json({ success: false, message: 'Account is deactivated' });
        }
        
        // Update last login
        db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
        
        // Create session
        req.session.userId = user.id;
        
        // Track session
        db.run(`INSERT INTO user_sessions (user_id, session_id, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
            [user.id, req.sessionID, req.ip, req.get('user-agent')]);
        
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                profile_picture: user.profile_picture,
                is_admin: user.is_admin
            }
        });
    });
});

app.post('/api/auth/register', (req, res) => {
    const { first_name, last_name, email, password, birthday, gender } = req.body;
    
    // Validate email
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
        if (user) {
            return res.json({ success: false, message: 'Email already registered' });
        }
        
        // Generate username
        const username = first_name.toLowerCase() + last_name.toLowerCase() + Math.floor(Math.random() * 1000);
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        db.run(`INSERT INTO users (username, email, password, first_name, last_name, birthday, gender) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, first_name, last_name, birthday, gender],
            function(err) {
                if (err) {
                    return res.json({ success: false, message: 'Registration failed' });
                }
                
                const userId = this.lastID;
                req.session.userId = userId;
                
                res.json({ success: true, message: 'Account created successfully' });
            }
        );
    });
});

// User data API
app.get('/api/user/data', requireAuth, (req, res) => {
    db.get(`SELECT id, first_name, last_name, username, email, profile_picture, cover_photo, 
                   bio, location, work_place, education, is_admin
            FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    });
});

// Posts API
app.get('/api/posts', requireAuth, (req, res) => {
    db.all(`SELECT p.*, u.first_name, u.last_name, u.profile_picture, 
                   (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 20`, (err, posts) => {
        res.json({ success: true, posts });
    });
});

// Stories API
app.get('/api/stories', requireAuth, (req, res) => {
    db.all(`SELECT s.*, u.first_name, u.last_name, u.profile_picture
            FROM stories s
            JOIN users u ON s.user_id = u.id
            WHERE s.expires_at > CURRENT_TIMESTAMP
            ORDER BY s.created_at DESC
            LIMIT 10`, (err, stories) => {
        res.json({ success: true, stories: stories || [] });
    });
});

// Contacts API
app.get('/api/contacts', requireAuth, (req, res) => {
    db.all(`SELECT u.id, u.first_name, u.last_name, u.profile_picture,
                   (SELECT 1 FROM user_sessions WHERE user_id = u.id AND last_active > DATETIME('now', '-5 minutes') LIMIT 1) as online
            FROM users u
            WHERE u.id != ? AND u.active = 1
            ORDER BY online DESC, u.first_name
            LIMIT 10`, [req.session.userId], (err, contacts) => {
        res.json({ success: true, contacts });
    });
});

// --- SECRET ADMIN API ROUTES ---

// Check if user is admin
app.get('/api/admin/check', requireAuth, (req, res) => {
    db.get("SELECT is_admin FROM users WHERE id = ?", [req.session.userId], (err, user) => {
        res.json({ isAdmin: user && user.is_admin === 1 });
    });
});

// Admin authentication
app.post('/api/admin/auth', requireAuth, requireAdmin, (req, res) => {
    const { password } = req.body;
    
    // Super admin password check (hardcoded for security)
    const superAdminPassword = 'superadmin2024'; // Change this in production!
    
    if (password === superAdminPassword) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Get all users (admin only)
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
    db.all(`SELECT id, username, email, first_name, last_name, profile_picture, 
                   active, is_admin, created_at
            FROM users 
            ORDER BY created_at DESC
            LIMIT 50`, (err, users) => {
        db.get("SELECT COUNT(*) as total FROM users", (err, count) => {
            res.json({ 
                success: true, 
                users: users || [],
                totalUsers: count.total 
            });
        });
    });
});

// Search users
app.get('/api/admin/search', requireAuth, requireAdmin, (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.json({ success: true, users: [] });
    }
    
    const searchQuery = `%${query}%`;
    db.all(`SELECT id, username, email, first_name, last_name, profile_picture
            FROM users 
            WHERE username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?
            LIMIT 10`,
        [searchQuery, searchQuery, searchQuery, searchQuery],
        (err, users) => {
            res.json({ success: true, users: users || [] });
        }
    );
});

// Get single user
app.get('/api/admin/user/:id', requireAuth, requireAdmin, (req, res) => {
    const userId = req.params.id;
    
    db.get(`SELECT id, username, email, first_name, last_name, profile_picture, 
                   active, is_admin, created_at, last_login
            FROM users WHERE id = ?`, [userId], (err, user) => {
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    });
});

// Reset user password (SECRET FUNCTION)
app.post('/api/admin/reset-password', requireAuth, requireAdmin, (req, res) => {
    const { user_id, new_password } = req.body;
    
    if (!user_id || !new_password) {
        return res.json({ success: false, message: 'Missing parameters' });
    }
    
    const hashedPassword = bcrypt.hashSync(new_password, 10);
    
    db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user_id], function(err) {
        if (err) {
            return res.json({ success: false, message: 'Failed to reset password' });
        }
        
        // Log admin action
        db.run(`INSERT INTO admin_logs (admin_id, action, target_user_id, details, ip_address) 
                VALUES (?, ?, ?, ?, ?)`,
            [req.session.userId, 'PASSWORD_RESET', user_id, 
             `Password reset by admin ${req.session.userId}`, req.ip]);
        
        res.json({ success: true, message: 'Password reset successfully' });
    });
});

// Force reset password (super admin only)
app.post('/api/admin/reset-password-force', requireAuth, requireAdmin, (req, res) => {
    const { user_id, new_password, confirm } = req.body;
    
    if (!user_id || !new_password || !confirm) {
        return res.json({ success: false, message: 'Missing parameters' });
    }
    
    const hashedPassword = bcrypt.hashSync(new_password, 10);
    
    db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user_id], function(err) {
        if (err) {
            return res.json({ success: false, message: 'Failed to reset password' });
        }
        
        // Log admin action
        db.run(`INSERT INTO admin_logs (admin_id, action, target_user_id, details, ip_address) 
                VALUES (?, ?, ?, ?, ?)`,
            [req.session.userId, 'FORCE_PASSWORD_RESET', user_id, 
             `Force password reset. New password: ${new_password}`, req.ip]);
        
        res.json({ 
            success: true, 
            message: 'Password forcefully reset',
            new_password: new_password // Return for confirmation
        });
    });
});

// Get all users for reset dropdown
app.get('/api/admin/all-users', requireAuth, requireAdmin, (req, res) => {
    db.all(`SELECT id, username, email, first_name, last_name
            FROM users 
            ORDER BY first_name, last_name`, (err, users) => {
        res.json({ success: true, users: users || [] });
    });
});

// Get system stats
app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
    Promise.all([
        // Online users (last 5 minutes)
        new Promise((resolve) => {
            db.get(`SELECT COUNT(DISTINCT user_id) as count 
                    FROM user_sessions 
                    WHERE last_active > DATETIME('now', '-5 minutes')`, 
                (err, row) => resolve(row?.count || 0));
        }),
        // Total posts today
        new Promise((resolve) => {
            db.get(`SELECT COUNT(*) as count FROM posts 
                    WHERE DATE(created_at) = DATE('now')`, 
                (err, row) => resolve(row?.count || 0));
        }),
        // Total messages today
        new Promise((resolve) => {
            db.get(`SELECT COUNT(*) as count FROM messages 
                    WHERE DATE(created_at) = DATE('now')`, 
                (err, row) => resolve(row?.count || 0));
        }),
        // Database size
        new Promise((resolve) => {
            const size = (fs.statSync('./facebook.db').size / (1024 * 1024)).toFixed(2);
            resolve(size + ' MB');
        }),
        // Recent activity
        new Promise((resolve) => {
            db.all(`SELECT action, target_user_id, ip_address, 
                           strftime('%H:%M', created_at) as time
                    FROM admin_logs 
                    ORDER BY created_at DESC 
                    LIMIT 5`, (err, rows) => resolve(rows || []));
        })
    ]).then(([onlineUsers, totalPosts, totalMessages, dbSize, recentActivity]) => {
        res.json({
            success: true,
            onlineUsers,
            totalPosts,
            totalMessages,
            dbSize,
            recentActivity
        });
    });
});

// Logout
app.get('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// WebSocket for real-time updates
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'authenticate':
                    ws.userId = message.userId;
                    break;
                case 'typing':
                    // Broadcast typing status
                    break;
            }
        } catch (error) {
            console.error('WebSocket error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket disconnected');
    });
});

// Initialize everything
const initialize = async () => {
    console.log('Initializing Facebook Clone...');
    
    // Create default files
    createDefaultCSS();
    createDefaultJS();
    createDefaultHTML();
    
    // Initialize database
    initDatabase();
    
    console.log('Facebook Clone initialized successfully!');
};

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    🚀 Facebook Clone Server Started!
    🔗 Local: http://localhost:${PORT}
    🔗 Login: http://localhost:${PORT}/login
    
    📱 Features:
    ✅ Exact Facebook Interface
    ✅ Real Facebook Login Page
    ✅ Posts, Stories, Friends
    ✅ Real-time Updates
    ✅ Secret Admin Panel
    ✅ Password Reset Tool
    
    👑 Admin Access:
    URL: http://localhost:${PORT}
    Click the secret button (bottom-right corner)
    Super Admin Password: superadmin2024
    
    👤 Demo Accounts:
    Admin: admin@facebook.com / admin123
    User 1: john@facebook.com / password123
    User 2: jane@facebook.com / password123
    User 3: mike@facebook.com / password123
    
    🔒 Secret Admin Panel:
    - Reset any user's password
    - View all users
    - System monitoring
    - Activity logs
    
    ⚠️ IMPORTANT: Change superadmin2024 password in production!
    `);
    
    // Initialize after server starts
    setTimeout(initialize, 1000);
});

// Export for testing
module.exports = app;
