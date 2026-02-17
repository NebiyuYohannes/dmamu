from rest_framework import serializers
from .models import Item, Category, StockMovement

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

class ItemListSerializer(serializers.ModelSerializer):
    worth = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = ['id', 'name', 'warehouse_address', 'current_stock', 'unit_price', 'worth']
        read_only_fields = ['worth']

    def get_worth(self, obj):
        return obj.current_stock * obj.unit_price 

class ItemDetailSerializer(serializers.ModelSerializer): 
    category_name = serializers.CharField(source='category.name', read_only=True)
    worth = serializers.SerializerMethodField()
    related_items = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = ['id', 'name', 'code', 'description', 'category', 'category_name', 'warehouse_address', 'current_stock', 'unit_price', 'worth', 'related_items']
        read_only_fields = ['worth', 'related_items']

    def get_worth(self, obj):
        return obj.current_stock * obj.unit_price

    def get_related_items(self, obj):
        if not obj.category:
            return []
        # Query same category, exclude self, sort by name
        related = Item.objects.filter(category=obj.category).exclude(id=obj.id).order_by('name')[:10]  # Top 10
        return [{
            'id': r.id,
            'product': r.name, 
            'category': r.category.name,  
            'stock': r.current_stock,
            'worth': r.current_stock * r.unit_price
        } for r in related]

class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = '__all__'
        read_only_fields = ['date']