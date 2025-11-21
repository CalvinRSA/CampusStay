# app/core/email_utils.py
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)
FROM_NAME = os.getenv("FROM_NAME", "CampusStay TUT")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://campusstay-1.onrender.com")


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None):
    """Send email via Gmail SMTP"""
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("❌ No Gmail credentials configured - email skipped")
        print("   Set SMTP_USERNAME and SMTP_PASSWORD in .env")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg['To'] = to_email
        
        # Attach both plain text and HTML versions
        if text_body:
            part1 = MIMEText(text_body, 'plain')
            msg.attach(part1)
        
        part2 = MIMEText(html_body, 'html')
        msg.attach(part2)
        
        # Connect to Gmail SMTP server
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()  # Secure the connection
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        print(f"✅ Email sent via Gmail to {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        print("❌ Gmail authentication failed. Check your credentials.")
        print("   Make sure you're using an App Password, not your regular Gmail password.")
        return False
    except Exception as e:
        print(f"❌ Email send failed: {e}")
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
    
    return send_email(student_email, subject, html_body, text_body)


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
            .alert {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .button {{ display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            .checklist {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }}
            .checklist-item {{ padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
            .checklist-item:last-child {{ border-bottom: none; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏠 Application Received!</h1>
            </div>
            <div class="content">
                <p>Dear <strong>{student_name}</strong>,</p>
                
                <p>Thank you for applying through CampusStay! Your application has been successfully submitted and is now under review.</p>
                
                <div class="property-card">
                    <h3 style="margin-top: 0; color: #ea580c;">Property Details</h3>
                    <p><strong>Property:</strong> {property_title}</p>
                    <p><strong>Location:</strong> {property_address}</p>
                    <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">⏳ PENDING REVIEW</span></p>
                </div>
                
                <div class="alert">
                    <p style="margin: 0;"><strong>⚠️ Action Required:</strong> Please upload your supporting documents to speed up your application process!</p>
                </div>
                
                <div class="checklist">
                    <h3 style="margin-top: 0; color: #1f2937;">Required Documents</h3>
                    <div class="checklist-item">
                        <strong>✓ Proof of Registration</strong> (Current academic year)
                    </div>
                    <div class="checklist-item">
                        <strong>✓ ID Copy</strong> (South African ID or Passport)
                    </div>
                    <div class="checklist-item">
                        <strong>✓ Funding Status</strong> (Confirm if NSFAS/bursary approved)
                    </div>
                </div>
                
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/student-dashboard" class="button">Upload Documents Now</a>
                </p>
                
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;"><strong>What happens next?</strong></p>
                <ol style="color: #6b7280; font-size: 14px;">
                    <li>Our team will review your application</li>
                    <li>You'll receive an email notification once it's processed</li>
                    <li>If approved, you'll get further instructions for securing your accommodation</li>
                </ol>
                
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
    Application Received - {property_title}
    
    Dear {student_name},
    
    Your application for {property_title} at {property_address} has been successfully submitted!
    
    Status: PENDING REVIEW
    
    Please upload your documents at: {FRONTEND_URL}/student-dashboard
    
    CampusStay - Tshwane University of Technology
    """
    
    return send_email(student_email, subject, html_body, text_body)


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
            .property-card {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981; }}
            .success-badge {{ background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0; }}
            .next-steps {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #10b981; }}
            .step {{ padding: 15px; margin: 10px 0; background: #f0fdf4; border-radius: 6px; }}
            .button {{ display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Congratulations!</h1>
                <h2 style="margin-top: 10px; font-weight: normal;">Your Application Has Been Approved</h2>
            </div>
            <div class="content">
                <p>Dear <strong>{student_name}</strong>,</p>
                
                <p>We are pleased to inform you that your accommodation application has been <strong>APPROVED</strong>!</p>
                
                <div class="property-card">
                    <h3 style="margin-top: 0; color: #10b981;">Your Accommodation</h3>
                    <p><strong>Property:</strong> {property_title}</p>
                    <p><strong>Location:</strong> {property_address}</p>
                    <div class="success-badge">✓ APPROVED</div>
                </div>
                
                <div class="next-steps">
                    <h3 style="margin-top: 0; color: #065f46;">📋 Next Steps</h3>
                    
                    <div class="step">
                        <strong>1. Check Your Dashboard</strong>
                        <p style="margin: 5px 0 0 0; color: #6b7280;">Log in to view your approval details and any additional instructions.</p>
                    </div>
                    
                    <div class="step">
                        <strong>2. Contact Property Management</strong>
                        <p style="margin: 5px 0 0 0; color: #6b7280;">Reach out to finalize move-in dates and payment arrangements.</p>
                    </div>
                    
                    <div class="step">
                        <strong>3. Prepare Required Documents</strong>
                        <p style="margin: 5px 0 0 0; color: #6b7280;">Have your ID and proof of registration ready for move-in.</p>
                    </div>
                </div>
                
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/student-dashboard" class="button">View My Dashboard</a>
                </p>
                
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                    <strong>Important:</strong> Please respond promptly to any follow-up communications to secure your accommodation.
                </p>
                
                <p>Welcome to your new home! We wish you all the best in your academic journey.</p>
                
                <div class="footer">
                    <p><strong>CampusStay - Tshwane University of Technology</strong></p>
                    <p>This is an automated email. Please do not reply directly to this message.</p>
                    <p>If you have questions, please contact our support team.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    🎉 APPLICATION APPROVED - {property_title}
    
    Dear {student_name},
    
    Congratulations! Your accommodation application has been APPROVED!
    
    Property: {property_title}
    Location: {property_address}
    Status: APPROVED
    
    Next Steps:
    1. Check your dashboard at {FRONTEND_URL}/student-dashboard
    2. Contact property management to finalize move-in
    3. Prepare your documents for check-in
    
    Welcome to your new home!
    
    CampusStay - Tshwane University of Technology
    """
    
    return send_email(student_email, subject, html_body, text_body)


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
            .property-card {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #6b7280; }}
            .info-box {{ background: #e0e7ff; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0; border-radius: 4px; }}
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
                
                <p>Thank you for your interest in securing accommodation through CampusStay.</p>
                
                <p>After careful review, we regret to inform you that your application for the following property could not be approved at this time:</p>
                
                <div class="property-card">
                    <h3 style="margin-top: 0; color: #6b7280;">Property Details</h3>
                    <p><strong>Property:</strong> {property_title}</p>
                    <p><strong>Location:</strong> {property_address}</p>
                    <p><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">Not Approved</span></p>
                </div>
                
                <div class="info-box">
                    <p style="margin: 0;"><strong>💡 Don't Give Up!</strong></p>
                    <p style="margin: 10px 0 0 0;">There are still other great accommodation options available. We encourage you to:</p>
                    <ul style="margin: 10px 0 0 0;">
                        <li>Browse other available properties on our platform</li>
                        <li>Submit new applications for properties that match your needs</li>
                        <li>Ensure all your documents are up to date</li>
                    </ul>
                </div>
                
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/properties" class="button">Browse Available Properties</a>
                </p>
                
                <p style="margin-top: 30px;">Reasons applications may not be approved include:</p>
                <ul style="color: #6b7280; font-size: 14px;">
                    <li>Property reached full capacity</li>
                    <li>Incomplete or missing documentation</li>
                    <li>Application submitted after deadline</li>
                    <li>Eligibility requirements not met</li>
                </ul>
                
                <p>If you have questions about this decision or need assistance finding alternative accommodation, please don't hesitate to contact our support team.</p>
                
                <div class="footer">
                    <p><strong>CampusStay - Tshwane University of Technology</strong></p>
                    <p>This is an automated email. Please do not reply directly to this message.</p>
                    <p>For support, please contact our team through the website.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Application Status Update - {property_title}
    
    Dear {student_name},
    
    After review, your application for {property_title} at {property_address} could not be approved at this time.
    
    Status: Not Approved
    
    We encourage you to:
    - Browse other available properties
    - Submit new applications
    - Ensure your documents are complete
    
    View available properties: {FRONTEND_URL}/properties
    
    CampusStay - Tshwane University of Technology
    """
    
    return send_email(student_email, subject, html_body, text_body)


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
                
                <p>We noticed you haven't uploaded your supporting documents yet for your application to <strong>{property_title}</strong>.</p>
                
                <p>Uploading your documents will significantly speed up the review process!</p>
                
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/student-dashboard" class="button">Upload Now</a>
                </p>
                
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">CampusStay Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(student_email, subject, html_body)