import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from whatsapp_api_client_python import API
import re

# Gmail SMTP configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_ADDRESS = "khayalhealth2@gmail.com"
EMAIL_PASSWORD = "wdde hxca nwah zzvy"    

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
    greenAPI = API.GreenAPI("7105212467", "f1898374b63f43038f3cdce8e43a9f54feb2122cf08b4c7e97")
    
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