from rest_framework import serializers
from sales_purchases.models import Sale
from .models import Customer,Interaction
from django.db.models import Sum

class CustomerSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()  
    transaction_history = serializers.SerializerMethodField()  
        

    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'address', 'products_count', 'notes', 'transaction_history']

    def get_products_count(self, obj):
        return Sale.objects.filter(customer=obj).values('item').distinct().count()

    
    def get_transaction_history(self, obj):
        sales = Sale.objects.filter(customer=obj).order_by('-date')

        history = []
        for sale in sales:
            payments = sale.transactions.all().order_by('date')
            paid = payments.aggregate(Sum('amount'))['amount__sum'] or 0
            payment_received = ', '.join([f"{t.amount} via {t.account.name} on {t.date.strftime('%Y-%m-%d')}" for t in payments]) if payments else "0"
            bank = ', '.join(set([t.account.name for t in payments if t.account])) if payments else "N/A"
            history.append({
                "date": sale.date.strftime("%b %d, %Y"),
                "product_code": sale.item.code if sale.item else "N/A",
                "units": sale.quantity,
                "product_price": float(sale.unit_price),
                "payable": float(sale.total),
                "payment_received": payment_received,
                "bank": bank,
                "remain": sale.total - paid
            })
        return history
    

    
class InteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interaction
        fields = '__all__'
        read_only_fields = ['customer', 'created_by', 'date']