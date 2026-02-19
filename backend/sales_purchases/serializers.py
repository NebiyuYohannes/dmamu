from rest_framework import serializers
from .models import Sale, Purchase,Customer
from inventory.models import Item

class SaleSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Sale
        fields = ['id', 'customer', 'customer_name', 'item', 'quantity', 'unit_price',
                  'total', 'date', 'notes', 'status', 'payment_method', 'account']
        read_only_fields = ['total', 'date']

    def validate(self, data):
        data['total'] = data['quantity'] * data['unit_price']

        payment_method = data.get('payment_method')
        account = data.get('account')

        if not account:
            raise serializers.ValidationError("Account ID is required for both cash and bank_transfer.")

        if payment_method == 'bank_transfer':
            if account.account_type != 'bank':
                raise serializers.ValidationError("Bank Transfer requires a Bank account.")

        elif payment_method == 'cash':
            if account.account_type != 'cash':
                raise serializers.ValidationError("Cash payment requires a Cash account.")

        else:
            raise serializers.ValidationError("Payment method must be 'cash' or 'bank_transfer'.")

        item = data.get('item')
        requested_qty = data.get('quantity')

        if item and requested_qty is not None:
            if item.current_stock < requested_qty:
                raise serializers.ValidationError(
                    f"You don't have enough {item.name} items. "
                    f"Available: {item.current_stock}, Requested: {requested_qty}"
                )

        return data

class PurchaseSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = Purchase
        fields = ['id', 'supplier', 'supplier_name', 'item', 'item_name', 'quantity',
                  'unit_price', 'total', 'date', 'notes', 'status', 'payment_method', 'account']
        read_only_fields = ['total', 'date']

    def validate(self, data):
        data['total'] = data['quantity'] * data['unit_price']

        payment_method = data.get('payment_method')
        account = data.get('account')

        if not account:
            raise serializers.ValidationError("Account ID is required for both cash and bank_transfer.")

        if payment_method == 'bank_transfer':
            if account.account_type != 'bank':
                raise serializers.ValidationError("Bank Transfer requires a Bank account.")
            if account.account_number in ['', None]:
                raise serializers.ValidationError("Choose proper .")
            if account.balance < data['total']:
                raise serializers.ValidationError("Insufficient balance in selected account.")

        elif payment_method == 'cash':
            if account.account_type != 'cash':
                raise serializers.ValidationError("Cash payment requires a Cash account.")
            if account.balance < data['total']:
                raise serializers.ValidationError("Insufficient balance in selected account.")

        else:
            raise serializers.ValidationError("Payment method must be 'cash' or 'bank_transfer'.")

        return data

    def create(self, validated_data):
            return super().create(validated_data)