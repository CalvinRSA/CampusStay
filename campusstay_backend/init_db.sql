-- ========================================
-- CAMPUSSTAY DATABASE SCHEMA
-- Run this ONCE to create all tables
-- ========================================

-- Drop tables in correct order
DROP TABLE IF EXISTS property_images;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS admins;

-- ========================================
-- 1. Admins
-- ========================================
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL DEFAULT 'Admin User',
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,  -- Plain text for now
    campus_intake VARCHAR(50) NOT NULL DEFAULT 'Main Campus',
    is_active BOOLEAN DEFAULT TRUE
);

-- ========================================
-- 2. Students
-- ========================================
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    student_number VARCHAR(9) UNIQUE NOT NULL,
    campus VARCHAR(50) NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 3. Properties
-- ========================================
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    is_bachelor BOOLEAN DEFAULT FALSE,
    available_flats INTEGER NOT NULL,
    total_flats INTEGER NOT NULL,
    space_per_student NUMERIC(5,2) NOT NULL,
    campus_intake VARCHAR(50) NOT NULL,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);


-- ========================================
-- 4. Property Images (Multiple)
-- ========================================
CREATE TABLE property_images (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 5. Applications (UPDATED WITH NEW FIELDS)
-- ========================================
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    applied_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    proof_of_registration VARCHAR(255),
    id_copy VARCHAR(255),
    funding_approved BOOLEAN DEFAULT FALSE
);

-- ========================================
-- 6. Insert Default Admin
-- ========================================
INSERT INTO admins (full_name, email, password, is_active)
VALUES (
    'CampusStay Admin',
    'admin@tut.ac.za',
    'admin123',  -- Plain text
    TRUE
)
ON CONFLICT (email) DO UPDATE 
SET 
    full_name = EXCLUDED.full_name,
    password = EXCLUDED.password,
    is_active = EXCLUDED.is_active;

-- ========================================
-- 7. Indexes for Performance
-- ========================================
CREATE INDEX idx_properties_admin ON properties(admin_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_property ON applications(property_id);
CREATE INDEX idx_property_images_property ON property_images(property_id);

-- ========================================
-- DONE
-- ========================================
SELECT 'Database initialized successfully!' AS status;