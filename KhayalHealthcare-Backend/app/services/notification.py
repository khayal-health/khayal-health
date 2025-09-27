import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re
import os

# Optional WhatsApp client
try:
    from whatsapp_api_client_python import API
    WHATSAPP_AVAILABLE = True
except Exception:
    WHATSAPP_AVAILABLE = False

# Configuration via environment (no hardcoded secrets)
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

GREEN_API_INSTANCE_ID = os.getenv('GREEN_API_INSTANCE_ID')
GREEN_API_TOKEN = os.getenv('GREEN_API_TOKEN')

logger = logging.getLogger(__name__)

def send_notification(to_email: str, subject: str, body: str, timeout: float = 3.0):
    """Synchronous email send with short timeout and immediate failure on error."""
    try:
        _send_email_sync(to_email, subject, body, timeout)
        return True
    except Exception as e:
        logger.error(f"Email send failed to {to_email}: {e}")
        return False



def send_message(number: str, message: str, timeout: float = 3.0):
    """Synchronous WhatsApp send with short timeout and immediate failure on error."""
    try:
        return _send_whatsapp_sync(number, message, timeout)
    except Exception as e:
        logger.error(f"WhatsApp send failed to {number}: {e}")
        return None

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



# Internal sync sender with short timeout
def _send_email_sync(to_email: str, subject: str, body: str, timeout: float):
    if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
        raise RuntimeError("Email credentials not configured")
    msg = MIMEMultipart()
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=timeout) as server:
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.sendmail(EMAIL_ADDRESS, to_email, msg.as_string())

# Internal sync WhatsApp sender
def _send_whatsapp_sync(number: str, message: str, timeout: float):
    if not WHATSAPP_AVAILABLE or not GREEN_API_INSTANCE_ID or not GREEN_API_TOKEN:
        raise RuntimeError("WhatsApp API not configured")
    formatted_number = format_pakistani_number(number)
    greenAPI = API.GreenAPI(GREEN_API_INSTANCE_ID, GREEN_API_TOKEN)
    # The library call is blocking; we'll run it in thread when used asynchronously
    response = greenAPI.sending.sendMessage(f"{formatted_number}@c.us", message)
    return response.data

# Async wrappers with strict timeouts (non-blocking to callers)
async def send_email_async(to_email: str, subject: str, body: str, timeout: float = 3.0) -> bool:
    try:
        await asyncio.wait_for(
            asyncio.to_thread(_send_email_sync, to_email, subject, body, timeout),
            timeout=timeout + 0.2,
        )
        return True
    except Exception as e:
        logger.error(f"Email async send failed to {to_email}: {e}")
        return False

async def send_whatsapp_async(number: str, message: str, timeout: float = 3.0):
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_send_whatsapp_sync, number, message, timeout),
            timeout=timeout + 0.2,
        )
    except Exception as e:
        logger.error(f"WhatsApp async send failed to {number}: {e}")
        return None

