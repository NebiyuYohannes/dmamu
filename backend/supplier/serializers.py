from rest_framework import serializers
from .models import Supplier

class SupplierSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField() 
    balance = serializers.SerializerMethodField()   
    transaction_history = serializers.SerializerMethodField()      

    class Meta:
        model = Supplier
        fields = ['id', 'name', 'phone', 'address', 'products_count', 'balance', 'notes', 'transaction_history']

    def get_products_count(self, obj):
        return 0  

    def get_balance(self, obj):
        return 0.00
    
    def get_transaction_history(self, obj):
        return [
            {
                "date": "2025-10-20",
                "product_code": "IND-2024-8472",
                "units": 25,
                "product_price": 338.00,
                "payable": 8450.00,
                "payment_received": 8450.00,
                "bank": "Chase Bank",
                "remain": 0.00
            },
            {
                "date": "2025-10-15",
                "product_code": "OFF-2024-5231",
                "units": 15,
                "product_price": 82.00,
                "payable": 1230.00,
                "payment_received": 800.00,
                "bank": "Wells Fargo",
                "remain": 430.00
            },
        ]