from .utils import (
    create_otp_for_user,
    send_otp_to_phone,
    send_otp_email,
)
from .models import OTPCode, User


def send_user_verification(user, method, phone=None, request=None):
    """
    Send verification based on method.
    method: User.VERIFICATION_PHONE or User.VERIFICATION_EMAIL
    """
    if method == User.VERIFICATION_PHONE:
        if not phone:
            raise ValueError("Phone number required for phone verification.")

        otp, _ = create_otp_for_user(
            user,
            otp_type=OTPCode.TYPE_SMS,
            purpose=OTPCode.PURPOSE_SIGNUP
        )
        send_otp_to_phone(phone=phone, otp_code=otp)

    elif method == User.VERIFICATION_EMAIL:
        otp, _ = create_otp_for_user(
            user,
            otp_type=OTPCode.TYPE_EMAIL,
            purpose=OTPCode.PURPOSE_SIGNUP
        )
        send_otp_email(
            user=user,
            otp_code=otp,
            purpose=OTPCode.PURPOSE_SIGNUP,
            request=request
        )

    else:
        raise ValueError(f"Invalid verification method: {method}")