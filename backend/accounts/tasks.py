import logging
from celery import shared_task
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger("account")


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_email_task(self, user_id, user_email, otp_code, purpose):
    """
    Async Celery task: send OTP email so the HTTP request is not blocked
    by SMTP connection latency / timeouts on Railway.
    """
    from accounts.models import User  # local import to avoid circular

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.error(f"send_otp_email_task: User {user_id} not found — skipping.")
        return

    context = {
        "user": user,
        "code": otp_code,
        "purpose": purpose,
        "minutes": settings.OTP_EXPIRY_SECONDS // 60,
    }

    subject = f"Your {purpose.capitalize()} Verification Code"
    text_body = (
        f"Your verification code is {otp_code}. "
        f"It expires in {context['minutes']} minutes."
    )

    try:
        html_body = render_to_string("emails/otp_email.html", context)
    except Exception as e:
        logger.error(f"Failed to render OTP email template: {e}")
        html_body = text_body

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user_email],
    )
    email.attach_alternative(html_body, "text/html")

    try:
        email.send(fail_silently=False)
        logger.info(f"OTP email sent to {user_email} for {purpose}")
    except Exception as exc:
        logger.error(
            f"Failed to send OTP email to {user_email}: {exc}", exc_info=True
        )
        raise self.retry(exc=exc)
