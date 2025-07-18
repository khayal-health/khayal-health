import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from whatsapp_api_client_python import API
import re
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Gmail SMTP configuration from environment
SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = int(os.getenv('SMTP_PORT'))
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

# WhatsApp API configuration from environment
GREEN_API_INSTANCE_ID = os.getenv('GREEN_API_INSTANCE_ID')
GREEN_API_TOKEN = os.getenv('GREEN_API_TOKEN')

def send_notification(to_email, subject, body):
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add body to email
        msg.attach(MIMEText(body, 'plain'))
        
        # Create SMTP session
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()  # Enable security
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        
        # Send email
        text = msg.as_string()
        server.sendmail(EMAIL_ADDRESS, to_email, text)
        server.quit()
        
        print("Email sent successfully!")
        
    except Exception as e:
        print(f"Error: {e}")



def send_message(number, message):
    greenAPI = API.GreenAPI(GREEN_API_INSTANCE_ID, GREEN_API_TOKEN)
    
    # Format Pakistani phone number
    formatted_number = format_pakistani_number(number)
    
    response = greenAPI.sending.sendMessage(f"{formatted_number}@c.us", message)
    return response.data

def format_pakistani_number(number):
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', number)
    
    # Handle different Pakistani number formats
    if digits_only.startswith('92'):
        # Already has country code
        return digits_only
    elif digits_only.startswith('03'):
        # Local format (03xxxxxxxxx) - remove leading 0 and add 92
        return '92' + digits_only[1:]
    elif len(digits_only) == 10 and digits_only.startswith('3'):
        # Format without leading 0 (3xxxxxxxxx) - add 92
        return '92' + digits_only
    else:
        # If it doesn't match expected patterns, assume it needs 92 prefix
        return '92' + digits_only.lstrip('0')