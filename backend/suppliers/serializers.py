from rest_framework import serializers
from .models import Supplier
from sales_purchases.models import Purchase

# Supplier overview
class SupplierListSerializer(serializers.ModelSerializer):
    products = serializers.IntegerField(read_only=True)
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Supplier
        fields = (
            'id',
            'name',
            'phone',
            'address',
            'contact_person',
            'products',
            'balance',
        )


class SupplierHistorySerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source='item.code', read_only=True)
    units = serializers.SerializerMethodField()
    payable = serializers.DecimalField(source='total', max_digits=12, decimal_places=2, read_only=True)
    payment_sent = serializers.SerializerMethodField()
    bank = serializers.SerializerMethodField()
    remain = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = (
            'date',
            'product_code',
            'units',
            'unit_price',
            'payable',
            'payment_sent',
            'bank',
            'remain',
        )

    def get_units(self, obj):
        return f"{obj.quantity} {getattr(obj.item, 'unit_measure', '')}" 

    def get_payment_sent(self, obj):
        return sum([t.amount for t in obj.transactions.all()])

    def get_bank(self, obj):
        last_txn = obj.transactions.last()
        return last_txn.account.full_name if last_txn and hasattr(last_txn, 'account') else None

    def get_remain(self, obj):
        return obj.total - self.get_payment_sent(obj)
    
