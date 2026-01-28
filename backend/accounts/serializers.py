from djoser.serializers import UserCreatePasswordRetypeSerializer
from rest_framework import serializers
from django.db import transaction
from core.models import User, Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['name']


class UserCreateSerializer(UserCreatePasswordRetypeSerializer):
    company = CompanySerializer(required=True)
    re_password = serializers.CharField(read_only=True)

    class Meta:
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
        company_data = attrs.pop('company', None)
        attrs = super().validate(attrs)

        if company_data is not None:
            attrs['company'] = company_data

        return attrs

    def validate_password(self, value):
        if len(value) <= 6:
            raise serializers.ValidationError("Password must be longer than 6 characters.")
        return value

    def create(self, validated_data):
        company_data = validated_data.pop('company')

        with transaction.atomic():
            user = super().create(validated_data)

            company = Company.objects.create(
                name=company_data['name'],
                owner=user
            )

            user.company = company
            user.save(update_fields=['company'])

        return user