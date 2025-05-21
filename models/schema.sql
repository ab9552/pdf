-- Database schema for GOAT-PDF

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_status ENUM('free', 'basic', 'premium', 'enterprise') DEFAULT 'free',
    subscription_end_date TIMESTAMP,
    storage_used BIGINT DEFAULT 0,
    max_storage BIGINT DEFAULT 100000000, -- 100MB default
    api_key VARCHAR(64) UNIQUE,
    INDEX idx_email (email),
    INDEX idx_subscription (subscription_status)
);

-- Subscription Plans table
CREATE TABLE subscription_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle ENUM('monthly', 'yearly') NOT NULL,
    features JSON,
    max_file_size BIGINT NOT NULL, -- in bytes
    max_files_per_month INT NOT NULL,
    storage_limit BIGINT NOT NULL, -- in bytes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- User Subscriptions table
CREATE TABLE user_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status ENUM('active', 'cancelled', 'expired') DEFAULT 'active',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    INDEX idx_user_subscription (user_id, status)
);

-- Conversion History table
CREATE TABLE conversion_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    original_file_size BIGINT NOT NULL,
    converted_filename VARCHAR(255),
    converted_file_size BIGINT,
    conversion_type ENUM('merge', 'split', 'compress', 'to_word', 'to_image', 'watermark', 'rotate', 'delete_pages') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    processing_time INT, -- in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_conversions (user_id, created_at)
);

-- File Metadata table
CREATE TABLE file_metadata (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversion_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    page_count INT,
    dimensions VARCHAR(50), -- e.g., "210x297" for A4
    is_encrypted BOOLEAN DEFAULT FALSE,
    has_watermark BOOLEAN DEFAULT FALSE,
    ocr_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversion_id) REFERENCES conversion_history(id) ON DELETE CASCADE,
    INDEX idx_conversion_files (conversion_id)
);

-- User Activity Logs table
CREATE TABLE user_activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_type ENUM('login', 'logout', 'conversion', 'subscription_change', 'payment') NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_activity (user_id, created_at)
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, billing_cycle, features, max_file_size, max_files_per_month, storage_limit) VALUES
('Free', 'Basic PDF tools with limited features', 0.00, 'monthly', 
 '{"features": ["Basic PDF tools", "Limited file size", "Basic support"]}', 
 10485760, -- 10MB
 10,
 104857600), -- 100MB

('Basic', 'Enhanced PDF tools for individuals', 9.99, 'monthly',
 '{"features": ["All PDF tools", "Larger file size", "Priority support", "No ads"]}',
 52428800, -- 50MB
 100,
 1073741824), -- 1GB

('Premium', 'Professional PDF tools for power users', 19.99, 'monthly',
 '{"features": ["All PDF tools", "OCR support", "Digital signatures", "PDF/A conversion", "Priority support", "No ads", "API access"]}',
 104857600, -- 100MB
 1000,
 5368709120), -- 5GB

('Enterprise', 'Complete PDF solution for businesses', 49.99, 'monthly',
 '{"features": ["All Premium features", "Unlimited files", "Custom branding", "Dedicated support", "Team management", "Advanced API access"]}',
 524288000, -- 500MB
 999999,
 10737418240); -- 10GB 