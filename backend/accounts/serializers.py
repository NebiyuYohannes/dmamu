from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from rest_framework import serializers
from django.db import transaction
from core.models import User, Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['name']


class UserCreateSerializer(BaseUserCreateSerializer):
    company = CompanySerializer(required=True)
    re_password = serializers.CharField(write_only=True, required=True)

    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = (
            'id',
            'email',
            'username',
            'password',
            're_password',
            'company',
        )

    def validate(self, attrs):
        if attrs['password'] != attrs['re_password']:
            raise serializers.ValidationError({
                "re_password": "Passwords do not match."
            })
        if len(attrs['password']) <= 6:
            raise serializers.ValidationError({
                "password": "Password must be longer than 6 characters."
            })
        return attrs

    def create(self, validated_data):
        company_data = validated_data.pop('company')
        validated_data.pop('re_password', None)

        with transaction.atomic():
            user = User.objects.create_user(**validated_data)

            company = Company.objects.create(
                **company_data,
                owner=user
            )

            user.company = company
            user.save(update_fields=['company'])

        return user
