from rest_framework import serializers
from .models import Account, Transaction
from sales_purchases.models import Sale, Purchase

class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(read_only=True, max_digits=15, decimal_places=2, default=0.00) 

    class Meta:
        model = Account
        fields = ['id', 'name', 'full_name', 'account_type', 'account_number', 'balance']

class TransactionSerializer(serializers.ModelSerializer):
    bank_account = serializers.CharField(source='account.full_name', read_only=True)
    linked_sale = serializers.PrimaryKeyRelatedField(queryset=Sale.objects.all(), required=False, allow_null=True)
    linked_purchase = serializers.PrimaryKeyRelatedField(queryset=Purchase.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Transaction
        fields = ['id', 'account', 'type', 'amount', 'description', 'date', 'notes', 'balance_at_time', 'bank_account', 'linked_sale', 'linked_purchase']
        read_only_fields = ['date', 'balance_at_time']

    def validate(self, data):
        if data.get('linked_sale') and data.get('linked_purchase'):
            raise serializers.ValidationError({"detail": "A transaction cannot be linked to both a sale and a purchase."})
        # if data['type'] == 'inflow' and data.get('linked_purchase'):
        #     raise serializers.ValidationError({"detail": "Inflow transactions cannot be linked to purchases."})
        # if data['type'] == 'outflow' and data.get('linked_sale'):
        #     raise serializers.ValidationError({"detail": "Outflow transactions cannot be linked to sales."})

        account = data.get('account')
        if account and data['type'] == 'outflow' and account.balance < data['amount']:
            raise serializers.ValidationError({"detail": "Insufficient balance in selected account."})

        # Auto-set type based on linked (for refunds too)
        # if data.get('linked_sale'):
        #     data['type'] = 'inflow'  # Sale payment = inflow
        # if data.get('linked_purchase'):
        #     data['type'] = 'outflow'  # Purchase payment = outflow

        return data


class ExpenseSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())

    class Meta:
        model = Transaction
        fields = ['account', 'amount', 'category', 'notes', 'payment_method']

    def validate(self, data):
        account = data.get('account')
        amount = data.get('amount')

        if account and amount:
            if amount <= 0:
                raise serializers.ValidationError({"detail": "Amount must be greater than zero."})

            if amount > account.balance:
                raise serializers.ValidationError({
                    "detail": f"Insufficient funds in {account.name}! "
                              f"Current balance: {account.balance}. "
                              f"You tried to spend: {amount}"
                })

        return data

    def create(self, validated_data):
        validated_data['type'] = 'outflow'                   
        validated_data['description'] = f"Expense: {validated_data.get('category', 'Other')}"
        validated_data['company'] = self.context['request'].user.company
        return super().create(validated_data)