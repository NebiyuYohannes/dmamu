from rest_framework import serializers
from sales_purchases.models import Sale
from .models import Customer,Interaction

class CustomerSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField() 
    balance = serializers.SerializerMethodField()   
    transaction_history = serializers.SerializerMethodField()      

    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'address', 'products_count', 'balance', 'notes', 'transaction_history']

    def get_products_count(self, obj):
        return 0  

    def get_balance(self, obj):
        return 0.00
    
    def get_transaction_history(self, obj):
        sales = Sale.objects.filter(customer=obj).order_by('-date')

        history = []
        for sale in sales:
            history.append({
                "date": sale.date.strftime("%b %d, %Y"),
                "product_code": sale.item.code if sale.item else "N/A",  # Later from Inventory
                "units": sale.quantity,
                "product_price": float(sale.unit_price),
                "payable": float(sale.total),
                "payment_received": 0.00,  # Later from Finance
                "bank": "N/A",             # Later from Finance
                "remain": float(sale.total)  # For now, full amount unpaid
            })
        return history
    

    
class InteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interaction
        fields = '__all__'
        read_only_fields = ['customer', 'created_by', 'date']