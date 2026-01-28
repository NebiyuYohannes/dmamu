from django.db import models
from django.contrib.auth.models import AbstractUser
from phonenumber_field.modelfields import PhoneNumberField
from django.dispatch import receiver
from django.db.models.signals import post_save
from django.utils import timezone


class OTPCode(models.Model):
    TYPE_SMS = 'sms'
    TYPE_EMAIL = 'email'
    TYPE_CHOICES = [
        (TYPE_SMS, 'SMS'),
        (TYPE_EMAIL, 'Email'),
    ]

    user = models.ForeignKey("User", on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    type = models.CharField(max_length=5, choices=TYPE_CHOICES, default=TYPE_EMAIL)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True) 
    used = models.BooleanField(default=False, db_index=True)

    class Meta:
        unique_together = ('user', 'code')
        indexes = [
            models.Index(fields=['user', 'used', 'expires_at']),
        ]

    def __str__(self):
        identifier = self.user.profile.phone or self.user.email or self.user.username
        return f"OTP ({self.type}) for {identifier}"


class Profile(models.Model):
    user = models.OneToOneField("User", on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    phone = PhoneNumberField(unique=True, blank=True, null=True)  
    updated_at = models.DateTimeField(auto_now=True)
    is_verified = models.BooleanField(default=False)  

    def __str__(self):
        return f"Profile for {self.user.email}"

    class Meta:
        indexes = [
            models.Index(fields=['phone']),
        ]


# @receiver(post_save, sender="User")
# def create_profile(sender, instance, created, **kwargs):
#     if created:
#         Profile.objects.create(user=instance)


class User(AbstractUser):
    ROLE_BUSINESS_ADMIN = 'business_admin'
    ROLE_EMPLOYEE = 'employee'
    ROLE_SUPER_ADMIN = 'super_admin'

    ROLE_CHOICES = [
        (ROLE_BUSINESS_ADMIN, 'Business Admin'),
        (ROLE_EMPLOYEE, 'Employee'),
        (ROLE_SUPER_ADMIN, 'Super Admin'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_BUSINESS_ADMIN)
    email = models.EmailField(unique=True, db_index=True)
    company = models.ForeignKey(
        "core.Company",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users"
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'role']

    class Meta:
        indexes = [
            models.Index(fields=['email', 'role']),
        ]
