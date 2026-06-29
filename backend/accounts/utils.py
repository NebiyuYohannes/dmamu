import jwt
import random
import logging
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.tokens import default_token_generator
from djoser.utils import encode_uid
from djoser.email import ActivationEmail
from rest_framework.exceptions import ValidationError
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from phonenumber_field.phonenumber import PhoneNumber
from .models import OTPCode

logger = logging.getLogger('account')

def generate_otp(length=6):
    """Generate a random numeric OTP of given length."""
    return ''.join(random.choices('0123456789', k=length))

def normalize_phone(phone_str):
    """Normalize and validate a phone number string."""
    if not phone_str.startswith("+"):
        raise ValidationError({"detail": "Invalid phone number format (e.g., use +251912345678)."})
    try:
        phone = PhoneNumber.from_string(phone_str)
    except Exception:
        raise ValidationError({"detail": "Invalid phone number format."})
    if not phone.is_valid():
        raise ValidationError({"detail": "Invalid phone number."})
    return phone.as_e164

def create_otp_for_user(user, otp_type=OTPCode.TYPE_EMAIL, seconds=None, purpose=OTPCode.PURPOSE_SIGNUP):
    """Create OTP with expiration and purpose."""
    otp = generate_otp()
    print(f"Generated OTP for {user.email}: {otp} =================================")  
    expiry_seconds = seconds or settings.OTP_EXPIRY_SECONDS  
    expires_at = timezone.now() + timedelta(seconds=expiry_seconds)
    otp_obj = OTPCode.objects.create(
        user=user,
        code=otp,
        type=otp_type,
        purpose=purpose,
        expires_at=expires_at
    )
    return otp, otp_obj

def send_otp_to_phone(phone, otp_code: str, otp_type=OTPCode.TYPE_SMS):
    """Send OTP via Twilio SMS (synchronous)."""
    if not phone:
        raise ValueError("No phone number provided.")
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    message_body = f"Your OTP code is {otp_code}. It expires in {settings.OTP_EXPIRY_SECONDS // 60} minutes."
    try:
        message = client.messages.create(
            body=message_body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=str(phone)
        )
        if message.status in ['failed', 'undelivered']:
            logger.error(f"SMS failed for {phone}: {message.error_message}")
            raise ValueError("SMS delivery failed.")
        logger.info(f"OTP sent to {phone}")
        return True
    except TwilioRestException as e:
        logger.error(f"Twilio error for {phone}: {e}")
        raise

def send_activation_email(user, request=None):
    """Send activation email with link (synchronous)."""
    uid = encode_uid(user.pk)
    token = default_token_generator.make_token(user)
    protocol = getattr(settings, "SITE_PROTOCOL", "http")
    domain = getattr(settings, "CLIENT_URL", "localhost:5173")
    activation_url = f"{protocol}://{domain}/{settings.DJOSER['ACTIVATION_URL'].format(uid=uid, token=token)}"

    context = {
        "user": user,
        "uid": uid,
        "token": token,
        "protocol": protocol,
        "domain": domain,
        "url": activation_url,
    }

    ActivationEmail(request=request, context=context).send([user.email])

def send_otp_email(user, otp_code, purpose, request=None):
    """
    Dispatch an async Celery task to send the OTP email.

    Sending email synchronously inside a Gunicorn worker causes WORKER TIMEOUT
    on Railway because the SMTP TCP handshake blocks the request thread.
    Offloading to a Celery task keeps the HTTP response fast.
    """
    if not user.email:
        logger.error("User has no email address")
        return False

    from accounts.tasks import send_otp_email_task  # avoid circular at module level

    send_otp_email_task.delay(
        user_id=user.pk,
        user_email=user.email,
        otp_code=otp_code,
        purpose=purpose,
    )
    logger.info(f"Queued OTP email task for {user.email} ({purpose})")
    return True


def generate_reset_token(user):
    payload = {
        "user_id": user.id,
        "type": "password_reset",
        "exp": timezone.now() + timedelta(minutes=10),
        "iat": timezone.now(),
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return token










