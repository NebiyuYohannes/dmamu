from rest_framework import serializers
from .models import Supplier
from crm.limits import check_plan_limit
from sales_purchases.models import Purchase
from django.db.models import Sum,Q
from decimal import Decimal

class SupplierListSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Supplier
        fields = (
            'id',
            'name',
            'phone',
            'address',
            'products',
            'balance',
        )
    def validate(self, attrs):
        if self.instance:  
            return attrs

        company = self.context["request"].user.company
        check_plan_limit(company)

        return attrs
    
    def get_products(self, obj):
        products = getattr(obj, 'products', 0)
        return f"{products} items"
    


class SupplierHistorySerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source='item.code', read_only=True)
    units = serializers.SerializerMethodField()
    payable = serializers.DecimalField(
        source='total', max_digits=12, decimal_places=2, read_only=True
    )
    payment_sent = serializers.SerializerMethodField()
    bank = serializers.SerializerMethodField()
    remain = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = (
            'date', 'product_code', 'units',
            'unit_price', 'payable', 'payment_sent',
            'bank', 'remain',
        )

    def get_units(self, obj):
        return f"{obj.quantity} {getattr(obj.item, 'unit_measure', '')}"

    def get_payment_sent(self, obj):
        agg = obj.transactions.aggregate(
            total_paid=Sum('amount', filter=Q(type='cogs')),
            total_refunded=Sum('amount', filter=Q(type='refund_in')),
        )
        total_paid = agg['total_paid'] or Decimal('0')
        total_refunded = agg['total_refunded'] or Decimal('0')
        return total_paid - total_refunded  

    def get_bank(self, obj):
        last_txn = obj.transactions.select_related('account').filter(
            type__in=['cogs', 'refund_in']
        ).last()
        return last_txn.account.full_name if last_txn and last_txn.account else None

    def get_remain(self, obj):
        net_paid = self.get_payment_sent(obj) 
        return float(obj.total - net_paid)    
        
