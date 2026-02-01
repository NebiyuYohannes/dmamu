from django.db import transaction
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings as django_settings
from djoser.serializers import UserCreatePasswordRetypeSerializer as BaseUserCreatePasswordRetypeSerializer,ActivationSerializer as BaseActivationSerializer
from rest_framework import serializers
from core.models import Company
from django.utils import timezone
from rest_framework import status
from .utils import create_otp_for_user, send_otp_to_phone, normalize_phone,send_activation_email
from .models import User, PhoneNumber,OTPCode
from .validators import validate_unique_email, validate_unique_username

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['name']

class PhoneNumberSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhoneNumber
        fields = ['number']

    def validate_number(self, value):
        if not value:
            return value
        return normalize_phone(value)


class CreatePasswordRetypeSerializer(BaseUserCreatePasswordRetypeSerializer):
    email = serializers.EmailField(validators=[validate_unique_email])
    username = serializers.CharField(validators=[validate_unique_username])
    phone = PhoneNumberSerializer(write_only=True, required=False)
    company = CompanySerializer()
    class Meta:
        model = User
        fields = ['id','email','first_name','last_name','username','password','phone','company']

    def validate(self, attrs):
        self.company_data = attrs.pop('company', None)
        self.phone_data = attrs.pop('phone', None)
        return super().validate(attrs)


    def create(self, validated_data):
        company_data = self.company_data
        phone = self.phone_data
        with transaction.atomic():
            validated_data['verification_method'] = User.VERIFICATION_PHONE if phone else User.VERIFICATION_EMAIL
            validated_data['is_active'] = False

            user = super().create(validated_data)
            if phone['number']:
                PhoneNumber.objects.create(user=user, number=phone['number'])
                try:
                    otp, _ = create_otp_for_user(user, OTPCode.TYPE_SMS)
                    send_otp_to_phone(phone=phone['number'], otp_code=otp)  # Or send_otp_async.delay(profile.id, otp) if Celery
                except ValueError as e:
                    # logger.error(f"OTP send failed during signup for {user.email}: {str(e)}")
                    raise serializers.ValidationError("Failed to send OTP.")
            else:
                try:
                    send_activation_email(user, request=self.context.get("request"))
                except Exception as e:
                    # logger.error(f"Email send failed during signup for {user.email}: {str(e)}")
                    raise serializers.ValidationError("Failed to send activation email.")
            if company_data['name']:
                company = Company.objects.create(
                    name=company_data['name'],
                    owner=user
                )
                user.company=company
                user.save(update_fields=['company'])
        return user
    

class OTPVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6, required=True, trim_whitespace=True)

    def validate(self, attrs):
        code = attrs["code"]
        if len(code) != 6:
            raise serializers.ValidationError("OTP must be 6 digits")
        try:
            otp = OTPCode.objects.filter(
                code=code,
                used=False,
                expires_at__gt=timezone.now()
            ).latest("created_at")
        except OTPCode.DoesNotExist:
            raise serializers.ValidationError("No valid OTP found. It may have expired or been used.")

        if otp.is_locked:
            otp.mark_used()
            raise serializers.ValidationError("Too many failed attempts. OTP invalidated.")

        if not otp.verify(code):
            if otp.is_locked:
                otp.mark_used()
                raise serializers.ValidationError("Too many failed attempts. OTP invalidated.")
            raise serializers.ValidationError("Incorrect OTP code.")

        attrs["otp"] = otp
        attrs["user"] = otp.user
        return attrs

    def verify(self, validated_data):
        otp = validated_data["otp"]
        user = validated_data["user"]
        user.is_active = True
        user.is_phone_verified = True
        user.save()
        otp.mark_used()
        return {"message": "OTP verified successfully"}


class ResendActivationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        if not User.objects.filter(email=value, is_active=False).exists():
            raise serializers.ValidationError("User not found or already active")
        return value

class SendOTPSerializer(serializers.Serializer):
    phone = PhoneNumberSerializer()
    email = serializers.EmailField()
    pass