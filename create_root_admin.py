#!/usr/bin/env python3
"""
Root Admin User Creation Script for Tower Flow
Creates a root admin user with ID 0 and full system access.
"""

import sys
import getpass
import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime

def get_db_connection():
    """Get database connection using environment variables"""
    try:
        DATABASE_URL = os.getenv('DATABASE_URL')
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable not found")
        
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def validate_email(email: str) -> bool:
    """Basic email validation"""
    return '@' in email and '.' in email.split('@')[1]

def check_existing_root_user(conn):
    """Check if root user (ID 0) already exists"""
    with conn.cursor() as cursor:
        cursor.execute("SELECT id, email FROM users WHERE id = %s", ('0',))
        result = cursor.fetchone()
        return result

def create_root_user(email: str, password: str):
    """Create root admin user with ID 0"""
    conn = get_db_connection()
    
    try:
        # Check if root user already exists
        existing_user = check_existing_root_user(conn)
        if existing_user:
            print(f"❌ Root user already exists with email: {existing_user['email']}")
            response = input("Do you want to update the existing root user? (y/N): ").lower().strip()
            if response != 'y':
                print("Operation cancelled.")
                return False
        
        # Hash the password
        hashed_password = hash_password(password)
        current_time = datetime.utcnow()
        
        # Insert or update root user
        with conn.cursor() as cursor:
            if existing_user:
                # Update existing root user
                cursor.execute("""
                    UPDATE users 
                    SET email = %s, password = %s, "updatedAt" = %s
                    WHERE id = %s
                """, (email, hashed_password, current_time, '0'))
                print("✅ Root admin user updated successfully!")
            else:
                # Create new root user
                cursor.execute("""
                    INSERT INTO users (id, username, password, name, email, role, "firstName", "lastName", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    '0',                    # id
                    'root',                 # username
                    hashed_password,        # password (hashed)
                    'Root Administrator',   # name
                    email,                  # email
                    'admin',               # role
                    'Root',                # firstName
                    'Administrator',       # lastName
                    current_time,          # createdAt
                    current_time           # updatedAt
                ))
                print("✅ Root admin user created successfully!")
        
        conn.commit()
        
        # Display user information
        print(f"""
🔐 Root Admin User Details:
   ID: 0
   Username: root
   Name: Root Administrator
   Email: {email}
   Role: admin
   Created/Updated: {current_time.strftime('%Y-%m-%d %H:%M:%S')} UTC
        """)
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating root user: {e}")
        return False
    finally:
        conn.close()

def main():
    """Main script execution"""
    print("=" * 60)
    print("🏗️  Tower Flow - Root Admin User Creation Script")
    print("=" * 60)
    print()
    
    # Get email
    while True:
        email = input("Enter root admin email: ").strip()
        if not email:
            print("❌ Email cannot be empty. Please try again.")
            continue
        
        if not validate_email(email):
            print("❌ Invalid email format. Please enter a valid email address.")
            continue
        
        break
    
    # Get password
    while True:
        password = getpass.getpass("Enter root admin password: ")
        if not password:
            print("❌ Password cannot be empty. Please try again.")
            continue
        
        if len(password) < 8:
            print("❌ Password must be at least 8 characters long. Please try again.")
            continue
        
        confirm_password = getpass.getpass("Confirm password: ")
        if password != confirm_password:
            print("❌ Passwords do not match. Please try again.")
            continue
        
        break
    
    print()
    print("Creating root admin user...")
    
    # Create the user
    success = create_root_user(email, password)
    
    if success:
        print()
        print("🎉 Root admin user setup completed!")
        print("You can now log in to Tower Flow with these credentials.")
        print("The root user (ID: 0) has full system access and permissions.")
    else:
        print()
        print("❌ Failed to create root admin user. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)