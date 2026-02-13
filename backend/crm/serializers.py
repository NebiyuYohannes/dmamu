from rest_framework import serializers
from .models import Customer,Interaction

class CustomerSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField() 
    balance = serializers.SerializerMethodField()         

    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'address', 'products_count', 'balance', 'notes']

    def get_products_count(self, obj):
        return 0  

    def get_balance(self, obj):
        return 0.00
    

    
class InteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interaction
        fields = '__all__'
        read_only_fields = ['customer', 'created_by', 'date']