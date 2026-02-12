from rest_framework import serializers
from .models import *



class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ['id', 'name', 'code', 'description']

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    features = FeatureSerializer(many=True, read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'name', 'price_monthly', 'user_limit', 'trial_days', 'features']

class SubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    days_remaining = serializers.ReadOnlyField()
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Subscription
        fields = ['uid', 'company_name', 'plan', 'start_date', 'end_date',
                  'active', 'days_remaining', 'status']
        read_only_fields = ['uid', 'company_name', 'active', 'start_date', 'end_date']

class FreeTrialSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()

    def validate(self, data):
        company = self.context['request'].user.company
        if company.has_used_trial:
            raise serializers.ValidationError(
                "This company has already used its free trial on a previous plan. "
                "Please subscribe to a paid plan or contact support."
            )
        return data

    def create(self, validated_data):
        plan = SubscriptionPlan.objects.get(id=validated_data['plan_id'])
        company = self.context['request'].user.company

        company.has_used_trial = True
        company.save()

        subscription, _ = Subscription.objects.update_or_create(
            company=company,
            defaults={
                'plan': plan,
                'start_date': timezone.now().date(),
                'end_date': timezone.now().date() + timedelta(days=plan.trial_days),
                'status': 'trialing',
                'active': True,
            }
        )
        return subscription

class PayNowSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    payment_method = serializers.PrimaryKeyRelatedField(queryset=PaymentMethod.objects.filter(is_active=True))
    transaction_id = serializers.CharField(required=False, allow_blank=True)
    proof = serializers.FileField(required=False)

    def validate(self, data):
        company = self.context['request'].user.company

        # Allow Pay Now even after trial (for upgrade/renew), but block if active
        existing_sub = getattr(company, 'subscription', None)
        if existing_sub and existing_sub.status in ['trialing', 'active']:
            raise serializers.ValidationError(
                "You already have an active or trialing subscription. "
                "Please cancel it first or contact support to change plans."
            )

        if data['payment_method'].code == 'BANK':
            if not data.get('transaction_id'):
                raise serializers.ValidationError({"transaction_id": "Required"})
            if not data.get('proof'):
                raise serializers.ValidationError({"proof": "Please upload proof"})

        return data

    def create(self, validated_data):
        plan = SubscriptionPlan.objects.get(id=validated_data['plan_id'])
        company = self.context['request'].user.company

        subscription, _ = Subscription.objects.update_or_create(
            company=company,
            defaults={
                'plan': plan,
                'start_date': timezone.now().date(),
                'end_date': timezone.now().date() + timedelta(days=30),
                'status': 'pending_payment',
                'active': False,
            }
        )

        Payment.objects.create(
            subscription=subscription,
            amount=plan.price_monthly,
            payment_method=validated_data['payment_method'],
            transaction_id=validated_data.get('transaction_id'),
            proof=validated_data.get('proof'),
            approved=False,
        )
        return subscription  

