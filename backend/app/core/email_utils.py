# app/core/email_utils.py - FIXED VERSION
import os
import resend
import traceback
from urllib.parse import quote

# Resend Configuration
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "noreply@campusstay.co.za")
FROM_NAME = os.getenv("FROM_NAME", "CampusStay TUT")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://campusstay.co.za").rstrip('/')  # Remove trailing slash

# Set the API key globally (Resend SDK requires this)
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Debug config on import
print("\n" + "="*60)
print("📧 RESEND EMAIL CONFIGURATION CHECK")
print("="*60)
print(f"RESEND_API_KEY: {'✓ SET' if RESEND_API_KEY else '❌ NOT SET'}")
print(f"RESEND_FROM_EMAIL: {RESEND_FROM_EMAIL}")
print(f"FROM_NAME: {FROM_NAME}")
print(f"FRONTEND_URL: {FRONTEND_URL}")
print("="*60 + "\n")


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None):
    """Send email via Resend API with improved error handling"""
    
    # Check configuration
    if not RESEND_API_KEY:
        error_msg = "❌ RESEND_API_KEY not configured in environment"
        print(error_msg)
        print("   To fix this:")
        print("   1. Go to https://resend.com/api-keys")
        print("   2. Create an API key")
        print("   3. Add it to Render as RESEND_API_KEY")
        return False
    
    try:
        print(f"\n📨 Attempting to send email to {to_email}")
        print(f"   Subject: {subject}")
        print(f"   From: {FROM_NAME} <{RESEND_FROM_EMAIL}>")
        
        params = {
            "from": f"{FROM_NAME} <{RESEND_FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }
        
        if text_body:
            params["text"] = text_body
        
        response = resend.Emails.send(params)
        
        # Success: response is a dict with 'id'
        print(f"✅ Email successfully sent! Resend ID: {response.get('id')}\n")
        return True
        
    except Exception as e:
        print(f"\n❌ Failed to send email via Resend!")
        print(f"   Error: {str(e)}")
        print(f"   Type: {type(e).__name__}")
        traceback.print_exc()
        return False


def send_verification_email(student_email: str, student_name: str, verification_token: str):
    """Send email verification link to new student"""
    
    # FIXED: Properly encode the token to handle special characters
    encoded_token = quote(verification_token, safe='')
    verification_link = f"{FRONTEND_URL}/#/verify-email?token={encoded_token}"
    
    subject = "Verify Your CampusStay Account"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ea580c, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #ea580c; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }}
            .button:hover {{ background: #dc2626; }}
            .alert {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            .link-text {{ word-break: break-all; color: #6b7280; font-size: 14px; background: #f3f4f6; padding: 10px; border-radius: 4px; margin-top: 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">✉️ Welcome to CampusStay!</h1>
            </div>
            <div class="content">
                <p>Dear <strong>{student_name}</strong>,</p>
                
                <p>Thank you for registering with CampusStay at Tshwane University of Technology!</p>
                
                <p>To complete your registration and start applying for accommodation, please verify your email address by clicking the button below:</p>
                
                <p style="text-align: center;">
                    <a href="{verification_link}" class="button" style="color: white;">Verify My Email</a>
                </p>
                
                <div class="alert">
                    <p style="margin: 0;"><strong>⚠️ Important:</strong> This verification link will expire in 24 hours. You must verify your email before you can apply for accommodation.</p>
                </div>
                
                <p style="margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <div class="link-text">{verification_link}</div>
                
                <p style="margin-top: 30px;">Once verified, you'll be able to:</p>
                <ul>
                    <li>Browse available properties</li>
                    <li>Submit accommodation applications</li>
                    <li>Upload required documents</li>
                    <li>Track your application status</li>
                </ul>
                
                <div class="footer">
                    <p><strong>CampusStay - Tshwane University of Technology</strong></p>
                    <p>If you didn't create this account, please ignore this email.</p>
                    <p>This is an automated email. Please do not reply directly to this message.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Welcome to CampusStay!
    
    Dear {student_name},
    
    Thank you for registering with CampusStay at TUT!
    
    Please verify your email address by clicking this link:
    {verification_link}
    
    This link will expire in 24 hours.
    
    CampusStay - Tshwane University of Technology
    """
    
    print(f"\n🔗 Verification link generated:")
    print(f"   {verification_link[:100]}..." if len(verification_link) > 100 else f"   {verification_link}")
    
    result = send_email(student_email, subject, html_body, text_body)
          
    if not result:
        print(f"\n⚠️  VERIFICATION EMAIL FAILED TO SEND!")
        print(f"   Student can still verify manually using this link:")
        print(f"   {verification_link}\n")
    
    return result


def send_password_reset_email(student_email: str, student_name: str, reset_token: str):
    """Send password reset link to student"""
    
    # FIXED: Properly encode the token to handle special characters
    encoded_token = quote(reset_token, safe='')
    reset_link = f"{FRONTEND_URL}/#/reset-password?token={encoded_token}"
    
    subject = "Reset Your CampusStay Password"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ea580c, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #ea580c; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }}
            .button:hover {{ background: #dc2626; }}
            .alert {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .warning {{ background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            .link-text {{ word-break: break-all; color: #6b7280; font-size: 14px; background: #f3f4f6; padding: 10px; border-radius: 4px; margin-top: 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">🔐 Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Dear <strong>{student_name}</strong>,</p>
                
                <p>We received a request to reset your CampusStay password. Click the button below to create a new password:</p>
                
                <p style="text-align: center;">
                    <a href="{reset_link}" class="button" style="color: white;">Reset My Password</a>
                </p>
                
                <div class="alert">
                    <p style="margin: 0;"><strong>⚠️ Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
                </div>
                
                <p style="margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <div class="link-text">{reset_link}</div>
                
                <div class="warning">
                    <p style="margin: 0;"><strong>⚠️ Didn't request this?</strong></p>
                    <p style="margin: 5px 0 0 0;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                </div>
                
                <div class="footer">
                    <p><strong>CampusStay - Tshwane University of Technology</strong></p>
                    <p>This is an automated email. Please do not reply directly to this message.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Password Reset Request
    
    Dear {student_name},
    
    We received a request to reset your CampusStay password.
    
    Click this link to reset your password:
    {reset_link}
    
    This link will expire in 1 hour.
    
    If you didn't request this, please ignore this email.
    
    CampusStay - Tshwane University of Technology
    """
    
    print(f"\n🔗 Password reset link generated:")
    print(f"   {reset_link[:100]}..." if len(reset_link) > 100 else f"   {reset_link}")
    
    result = send_email(student_email, subject, html_body, text_body)
    
    if not result:
        print(f"\n⚠️  PASSWORD RESET EMAIL FAILED TO SEND!")
        print(f"   Student can still reset password manually using this link:")
        print(f"   {reset_link}\n")
    
    return result


def send_application_confirmation_email(
    student_email: str,
    student_name: str,
    property_title: str,
    property_address: str
):
    """Send email to student after submitting application"""
    subject = f"Application Submitted - {property_title}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ea580c, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .property-card {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ea580c; }}
            .button {{ display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏠 Application Received!</h1>
            </div>
            <div class="content">
                <p>Dear <strong>{student_name}</strong>,</p>
                
                <p>Your application for <strong>{property_title}</strong> has been received!</p>
                
                <div class="property-card">
                    <p><strong>Property:</strong> {property_title}</p>
                    <p><strong>Location:</strong> {property_address}</p>
                    <p><strong>Status:</strong> Pending Review</p>
                </div>
                
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/student/dashboard" class="button">View Application</a>
                </p>
                
                <div class="footer">
                    <p><strong>CampusStay - TUT</strong></p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(student_email, subject, html_body)


def send_application_approved_email(
    student_email: str,
    student_name: str,
    property_title: str,
    property_address: str
):
    """Send email when application is approved"""
    subject = f"🎉 Application Approved - {property_title}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Congratulations!</h1>
                <h2>Your Application Has Been Approved</h2>
            </div>
            <div class="content">
                <p>Dear <strong>{student_name}</strong>,</p>
                
                <p>Your application for <strong>{property_title}</strong> at <strong>{property_address}</strong> has been APPROVED!</p>
                
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/student/dashboard" class="button">View Details</a>
                </p>
                
                <div class="footer">
                    <p><strong>CampusStay - TUT</strong></p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(student_email, subject, html_body)


def send_application_rejected_email(
    student_email: str,
    student_name: str,
    property_title: str,
    property_address: str
):
    """Send email when application is rejected"""
    subject = f"Application Update - {property_title}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #6b7280, #4b5563); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #ea580c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Application Status Update</h1>
            </div>
            <div class="content">
                <p>Dear <strong>{student_name}</strong>,</p>
                
                <p>Unfortunately, your application for <strong>{property_title}</strong> could not be approved at this time.</p>
                
                <p>Please explore other available properties on our platform.</p>
                
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/student/dashboard" class="button">Browse Properties</a>
                </p>
                
                <div class="footer">
                    <p><strong>CampusStay - TUT</strong></p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(student_email, subject, html_body)


def send_document_reminder_email(
    student_email: str,
    student_name: str,
    property_title: str
):
    """Send reminder email to upload documents"""
    subject = f"⏰ Reminder: Upload Documents for {property_title}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f59e0b, #ea580c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⏰ Document Upload Reminder</h1>
            </div>
            <div class="content">
                <p>Hi <strong>{student_name}</strong>,</p>
                
                <p>Please upload your supporting documents for <strong>{property_title}</strong>.</p>
                
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/student/dashboard" class="button">Upload Now</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(student_email, subject, html_body)