-- ========================================
-- CAMPUSSTAY DATABASE SCHEMA - FIXED
-- ========================================

DROP TABLE IF EXISTS property_images;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS admins;

-- 1. Admins
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL DEFAULT 'Admin User',
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    hashed_password TEXT,  -- For future secure login
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Students - NOW WITH DOCUMENT URLS
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    student_number VARCHAR(9) UNIQUE NOT NULL,
    campus VARCHAR(50) NOT NULL,
    hashed_password TEXT NOT NULL,
    
    -- THESE ARE THE MISSING COLUMNS!
    id_document_url TEXT,
    proof_of_registration_url TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Properties
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    is_bachelor BOOLEAN DEFAULT FALSE,
    available_flats INTEGER NOT NULL,
    total_flats INTEGER NOT NULL,
    space_per_student NUMERIC(5,2) NOT NULL,
    campus_intake VARCHAR(255) NOT NULL,  -- Allow multiple: "Pretoria, Soshanguve"
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Property Images
CREATE TABLE property_images (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Applications - SIMPLIFIED (documents now on student)
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    applied_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    funding_approved BOOLEAN DEFAULT FALSE
);

-- Default Admin
INSERT INTO admins (full_name, email, password, hashed_password, is_active)
VALUES ('CampusStay Admin', 'admin@tut.ac.za', 'admin123', NULL, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Indexes
CREATE INDEX idx_properties_admin ON properties(admin_id);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_property ON applications(property_id);
CREATE INDEX idx_applications_status ON applications(status);

SELECT 'Database fixed - documents now save to S3 and admin can view them!' AS status;