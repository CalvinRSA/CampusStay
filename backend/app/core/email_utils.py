# app/core/email_utils.py - FIXED VERSION
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import traceback

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)
FROM_NAME = os.getenv("FROM_NAME", "CampusStay TUT")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://campusstay-1.onrender.com")

# Debug email config on import
print("\n" + "="*60)
print("📧 EMAIL CONFIGURATION CHECK")
print("="*60)
print(f"SMTP_SERVER: {SMTP_SERVER}")
print(f"SMTP_PORT: {SMTP_PORT}")
print(f"SMTP_USERNAME: {SMTP_USERNAME if SMTP_USERNAME else '❌ NOT SET'}")
print(f"SMTP_PASSWORD: {'✓ SET' if SMTP_PASSWORD else '❌ NOT SET'}")
print(f"FROM_EMAIL: {FROM_EMAIL}")
print(f"FROM_NAME: {FROM_NAME}")
print(f"FRONTEND_URL: {FRONTEND_URL}")
print("="*60 + "\n")


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None):
    """Send email via Gmail SMTP with improved error handling"""
    
    # Check configuration
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        error_msg = "❌ SMTP_USERNAME or SMTP_PASSWORD not configured in environment"
        print(error_msg)
        print("   To fix this:")
        print("   1. Go to Google Account Settings → Security")
        print("   2. Enable 2-Step Verification")
        print("   3. Create an App Password (not your regular Gmail password)")
        print("   4. Set SMTP_USERNAME=your-email@gmail.com")
        print("   5. Set SMTP_PASSWORD=your-16-char-app-password")
        return False
    
    try:
        print(f"\n📨 Attempting to send email to {to_email}")
        print(f"   Subject: {subject}")
        print(f"   From: {FROM_NAME} <{FROM_EMAIL}>")
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg['To'] = to_email
        
        # Attach both plain text and HTML versions
        if text_body:
            part1 = MIMEText(text_body, 'plain', 'utf-8')
            msg.attach(part1)
        
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part2)
        
        # Connect to Gmail SMTP server
        print(f"   Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=30) as server:
            server.set_debuglevel(0)  # Set to 1 for verbose SMTP debugging
            
            print("   Starting TLS...")
            server.starttls()
            
            print(f"   Logging in as {SMTP_USERNAME}...")
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            
            print("   Sending message...")
            server.send_message(msg)
        
        print(f"✅ Email successfully sent to {to_email}\n")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"\n❌ Gmail authentication failed!")
        print(f"   Error: {str(e)}")
        print(f"   Username: {SMTP_USERNAME}")
        print(f"\n   SOLUTION:")
        print(f"   1. Make sure you're using an App Password, NOT your regular Gmail password")
        print(f"   2. Enable 2-Step Verification on your Google Account")
        print(f"   3. Generate App Password at: https://myaccount.google.com/apppasswords")
        print(f"   4. Use the 16-character App Password in SMTP_PASSWORD")
        print(f"   5. Make sure 'Less secure app access' is NOT needed with App Passwords\n")
        return False
        
    except smtplib.SMTPException as e:
        print(f"\n❌ SMTP error occurred!")
        print(f"   Error: {str(e)}")
        print(f"   Type: {type(e).__name__}")
        traceback.print_exc()
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error sending email!")
        print(f"   Error: {str(e)}")
        print(f"   Type: {type(e).__name__}")
        traceback.print_exc()
        return False


def send_verification_email(student_email: str, student_name: str, verification_token: str):
    """Send email verification link to new student"""
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    subject = "Verify Your CampusStay Account"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ea580c, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #ea580c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }}
            .alert {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✉️ Welcome to CampusStay!</h1>
            </div>
            <div class="content">
                <p>Dear <strong>{student_name}</strong>,</p>
                
                <p>Thank you for registering with CampusStay at Tshwane University of Technology!</p>
                
                <p>To complete your registration and start applying for accommodation, please verify your email address by clicking the button below:</p>
                
                <p style="text-align: center;">
                    <a href="{verification_link}" class="button">Verify My Email</a>
                </p>
                
                <div class="alert">
                    <p style="margin: 0;"><strong>⚠️ Important:</strong> This verification link will expire in 24 hours. You must verify your email before you can apply for accommodation.</p>
                </div>
                
                <p style="margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #6b7280; font-size: 14px;">{verification_link}</p>
                
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
    
    print(f"\n🔗 Verification link: {verification_link}")
    result = send_email(student_email, subject, html_body, text_body)
    
    if not result:
        print(f"\n⚠️  VERIFICATION EMAIL FAILED TO SEND!")
        print(f"   Student can still verify manually using this link:")
        print(f"   {verification_link}\n")
    
    return result


# Keep all other email functions the same...
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
                    <a href="{FRONTEND_URL}/student" class="button">View Application</a>
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
                    <a href="{FRONTEND_URL}/student" class="button">View Details</a>
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
                    <a href="{FRONTEND_URL}/student" class="button">Browse Properties</a>
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
                    <a href="{FRONTEND_URL}/student" class="button">Upload Now</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(student_email, subject, html_body)