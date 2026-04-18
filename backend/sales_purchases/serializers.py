from rest_framework import serializers
from .models import Sale, Purchase,PaymentStatus
from inventory.models import Inventory,Item,Warehouse
from finance.models import Account
from suppliers.models import Supplier
from crm.models import Customer
from django.db.models import Sum,Q


class SaleSerializer(serializers.ModelSerializer):
    balance = serializers.SerializerMethodField()

    # === Explicit strict fields for required ForeignKeys ===
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        required=True,
        allow_null=False,
        error_messages={'required': 'Customer is required.'}
    )
    item = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        required=True,
        allow_null=False,
        error_messages={'required': 'Item / Product is required.'}
    )
    warehouse = serializers.PrimaryKeyRelatedField(
        queryset=Warehouse.objects.all(),
        required=True,
        allow_null=False,
        error_messages={'required': 'Warehouse is required.'}
    )
    account = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(),
        required=False,          # will be enforced in validate() depending on status
        allow_null=True
    )

    quantity = serializers.IntegerField(required=True, min_value=1)
    unit_price = serializers.DecimalField(required=True, max_digits=12, decimal_places=2, min_value=0)

    class Meta:
        model = Sale
        fields = [
            'id', 'customer', 'item', 'quantity', 'unit_price', 'total',
            'date', 'notes', 'warehouse', 'status', 'payment_method',
            'account', 'balance'
        ]
        read_only_fields = ['total', 'date', 'balance']

    def validate(self, data):
        # === 1. Reject empty/null required fields ===
        required_fields = ['customer', 'item', 'warehouse', 'quantity', 'unit_price', 'status']
        for field in required_fields:
            value = data.get(field)
            if value in [None, '', 0]:
                raise serializers.ValidationError({field: f"This field is required and cannot be empty."})

        # Calculate total
        data['total'] = data['quantity'] * data['unit_price']

        status = data.get('status')
        payment_method = data.get('payment_method')
        account = data.get('account')

        # === 2. Your original status logic (kept exactly as you wrote it) ===
        if status == PaymentStatus.UNPAID:
            if account or payment_method:
                raise serializers.ValidationError(
                    "For 'UNPAID' status, account and payment_method must be empty."
                )

        elif status == PaymentStatus.PAID:
            if not account or not payment_method:
                raise serializers.ValidationError({"detail": "For 'paid' status, account and payment_method are required."})
            
            if payment_method == 'bank_transfer':
                if account.account_type != 'bank':
                    raise serializers.ValidationError({"detail": "Bank Transfer requires a Bank account."})
                if account.account_number in ['', None]:
                    raise serializers.ValidationError({"detail": "Choose proper account with number."})
            elif payment_method == 'cash':
                if account.account_type != 'cash':
                    raise serializers.ValidationError({"detail": "Cash payment requires a Cash account."})
            else:
                raise serializers.ValidationError({"detail": "Payment method must be 'cash' or 'bank_transfer'."})

            # Inventory check (kept exactly as you had it)
            try:
                inventory = Inventory.objects.get(
                    item=data['item'],
                    warehouse=data['warehouse'],
                    company=self.context['request'].user.company
                )
                if inventory.current_stock < data['quantity']:
                    raise serializers.ValidationError({"detail": "Product does not have enough stock in the selected warehouse."})
            except Inventory.DoesNotExist:
                raise serializers.ValidationError({"detail": "Product does not exist in the selected warehouse."})

        elif status == PaymentStatus.PARTIAL:
            if not account or not payment_method:
                raise serializers.ValidationError(
                    {"detail": "For 'partial' status, account and payment_method are required, and you must add transactions separately."}
                )

        else:
            raise serializers.ValidationError({"status": "Invalid status value."})

        return data

    def get_balance(self, obj):
        paid = obj.transactions.aggregate(Sum('amount'))['amount__sum'] or 0
        return obj.total - paid


class PurchaseSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    balance = serializers.SerializerMethodField()
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    unit_measure = serializers.ReadOnlyField(source='item.unit_measure')

    # === Explicit strict fields for required ForeignKeys ===
    supplier = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(),
        required=True,
        allow_null=False,
        error_messages={'required': 'Supplier is required.'}
    )
    item = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        required=True,
        allow_null=False,
        error_messages={'required': 'Item / Product is required.'}
    )
    warehouse = serializers.PrimaryKeyRelatedField(
        queryset=Warehouse.objects.all(),
        required=True,
        allow_null=False,
        error_messages={'required': 'Warehouse is required.'}
    )
    account = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(),
        required=False,
        allow_null=True
    )

    quantity = serializers.IntegerField(required=True, min_value=1)
    unit_price = serializers.DecimalField(required=True, max_digits=12, decimal_places=2, min_value=0)

    class Meta:
        model = Purchase
        fields = [
            'id', 'supplier', 'supplier_name', 'item', 'unit_measure', 'item_name',
            'quantity', 'warehouse', 'warehouse_name', 'unit_price', 'total',
            'date', 'notes', 'status', 'payment_method', 'account', 'balance'
        ]
        read_only_fields = ['total', 'date', 'balance']

    def validate(self, data):
        # === 1. Reject empty/null required fields ===
        required_fields = ['supplier', 'item', 'warehouse', 'quantity', 'unit_price', 'status']
        for field in required_fields:
            value = data.get(field)
            if value in [None, '', 0]:
                raise serializers.ValidationError({field: f"This field is required and cannot be empty."})

        # Calculate total
        data['total'] = data['quantity'] * data['unit_price']

        status = data.get('status')
        payment_method = data.get('payment_method')
        account = data.get('account')

        # === 2. Your original status logic (kept exactly as you wrote it) ===
        if status == PaymentStatus.UNPAID:
            if account or payment_method:
                raise serializers.ValidationError(
                    "For 'UNPAID' status, account and payment_method must be empty."
                )

        elif status == PaymentStatus.PAID:
            if not account or not payment_method:
                raise serializers.ValidationError({"detail": "For 'paid' status, account and payment_method are required."})
            
            if payment_method == 'bank_transfer':
                if account.account_type != 'bank':
                    raise serializers.ValidationError({"detail": "Bank Transfer requires a Bank account."})
                if account.account_number in ['', None]:
                    raise serializers.ValidationError({"detail": "Choose proper account with number."})
                if account.balance < data['total']:
                    raise serializers.ValidationError({"detail": "Insufficient balance in selected account."})
            elif payment_method == 'cash':
                if account.account_type != 'cash':
                    raise serializers.ValidationError({"detail": "Cash payment requires a Cash account."})
                if account.balance < data['total']:
                    raise serializers.ValidationError({"detail": "Insufficient balance in selected account."})
            else:
                raise serializers.ValidationError({"detail": "Payment method must be 'cash' or 'bank_transfer'."})

        elif status == PaymentStatus.PARTIAL:
            if not account or not payment_method:
                raise serializers.ValidationError(
                    {"detail": "For 'partial' status, account and payment_method are required, and you must add transactions separately."}
                )

        else:
            raise serializers.ValidationError({"status": "Invalid status value."})

        return data

    def get_balance(self, obj):
        agg = obj.transactions.aggregate(
            total_out=Sum('amount', filter=Q(type='outflow')),
            total_in=Sum('amount', filter=Q(type='inflow'))
        )
        total_out = agg['total_out'] or 0
        total_in = agg['total_in'] or 0
        net_paid = total_out - total_in
        return obj.total - net_paid
    

class PurchaseDropdownSerializer(serializers.ModelSerializer):

    label = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = ["id", "label"]

    def get_label(self, obj):
        return (
            f"PUR-{obj.id} | "
            f"Supplier: {obj.supplier} | "
            f"Qty: {obj.quantity} | "
            f"Total: {obj.total}"
        )
    

class SaleDropdownSerializer(serializers.ModelSerializer):

    label = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = ["id", "label"]

    def get_label(self, obj):
        supplier = obj.customer.name if obj.customer else "No Customer"

        return (
            f"PUR-{obj.id} | "
            f"Supplier: {obj.customer} | "
            f"Qty: {obj.quantity} | "
            f"Total: {obj.total}"
        )
    

class SupplierDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier 
        fields = ['id', 'name']   


class ItemDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ['id', 'name']


class WarehouseDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ['id', 'name']