from rest_framework import serializers
from .models import Sale, Purchase
from crm.models import Customer 
from suppliers.models import Supplier

class SaleSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all()) 
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    item = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = Sale
        fields = ['id', 'customer', 'customer_name', 'item', 'quantity', 'unit_price', 'total', 'date', 'notes']
        read_only_fields = ['total', 'date']

    def validate(self, data):
        if 'quantity' in data and 'unit_price' in data:
            data['total'] = data['quantity'] * data['unit_price']
        return data

class PurchaseSerializer(serializers.ModelSerializer):
    supplier = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all())   
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    item = serializers.CharField(source='item.name', read_only=True)  

    class Meta:
        model = Purchase
        fields = ['id', 'supplier', 'supplier_name', 'item', 'quantity', 'unit_price', 'total', 'date', 'notes']
        read_only_fields = ['total', 'date']

    def validate(self, data):
        if 'quantity' in data and 'unit_price' in data:
            data['total'] = data['quantity'] * data['unit_price']
        return data
    
