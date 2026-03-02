from rest_framework import serializers
from .models import Item, Category, StockMovement,Warehouse,Inventory


class CategorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    class Meta:
        model = Category
        fields = ['id', 'name', 'description','items'] 
        read_only_fields = ['company']

    def get_items(self, obj):
        return obj.item_count
        
    def validate(self, attrs):
        name = attrs.get('name', '').strip()
        request = self.context['request']
        company = self.instance.company if self.instance else request.user.company

        queryset = Category.objects.filter(
            name__iexact=name,
            company=company
        )

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError({
                'name': 'This category name is already taken.'
            })

        attrs['name'] = name.capitalize()
        return attrs


class WarehouseOverviewSerializer(serializers.ModelSerializer):
    total_stock = serializers.SerializerMethodField()
    total_worth = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'address', 'total_stock', 'total_worth']

    def get_total_stock(self, obj):
        return sum(item.current_stock for item in obj.inventories.all())

    def get_total_worth(self, obj):
        total = sum(item.current_stock * item.item.unit_price for item in obj.inventories.all())
        return f"${total:,.2f}"


class WarehouseInventorySerializer(serializers.ModelSerializer):
    product = serializers.CharField(source='item.name', read_only=True)
    category = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField(read_only=True)
    unit_price = serializers.DecimalField(
        source='item.unit_price', 
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    worth = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = ['id', 'product', 'category', 'stock', 'unit_price', 'worth']

    def get_stock(self, obj):
        return f"{obj.current_stock} {obj.item.unit_measure}"

    def get_category(self, obj):
        return obj.item.category.name if obj.item.category else "Uncategorized"

    def get_worth(self, obj):
        return f"${obj.current_stock * obj.item.unit_price:,.2f}"


class WarehouseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ['name', 'address']


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ['id', 'name', 'code', 'category', 'unit_price','unit_measure']
        read_only_fields = ['company'] 


class StockMovementCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "inventory",
            "movement_type",
            "quantity",
            "date",
            "notes",
            "purchase",
            "sale",
        ]

    def validate(self, data):
        movement_type = data.get("movement_type")
        purchase = data.get("purchase")
        sale = data.get("sale")
        inventory = data.get("inventory")
        quantity = data.get("quantity")

        # --- Movement rules ---
        if movement_type == "purchase" and not purchase:
            raise serializers.ValidationError(
                "Purchase movement requires a purchase reference."
            )

        if movement_type == "sale" and not sale:
            raise serializers.ValidationError(
                "Sale movement requires a sale reference."
            )

        if movement_type == "adjustment" and (purchase or sale):
            raise serializers.ValidationError(
                "Adjustment must not be linked to purchase or sale."
            )

        # --- Company validation ---
        user = self.context["request"].user
        if inventory and inventory.company != user.company:
            raise serializers.ValidationError(
                "Inventory does not belong to your company."
            )

        # --- Stock validation ---
        if inventory:
            new_stock = inventory.current_stock + quantity
            if new_stock < 0:
                raise serializers.ValidationError(
                    f"Not enough stock in {inventory.warehouse.name}. "
                    f"Current stock: {inventory.current_stock}, "
                    f"Requested change: {quantity}"
                )

        return data
    
class StockMovementListSerializer(serializers.ModelSerializer):

    item_name = serializers.CharField(
        source="inventory.item.name",
        read_only=True
    )

    warehouse_name = serializers.CharField(
        source="inventory.warehouse.name",
        read_only=True
    )

    reference = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "movement_type",
            "item_name",
            "warehouse_name",
            "reference",
            "quantity",
            "date",
        ]

    def get_reference(self, obj):
        if obj.purchase:
            return f"PUR-{obj.purchase.id}"
        if obj.sale:
            return f"SAL-{obj.sale.id}"
        return "-"
    
class StockMovementDetailSerializer(serializers.ModelSerializer):

    inventory = serializers.SerializerMethodField()
    purchase = serializers.SerializerMethodField()
    sale = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = "__all__"

    def get_inventory(self, obj):
        return {
            "item": obj.inventory.item.name,
            "warehouse": obj.inventory.warehouse.name,
            "current_stock": obj.inventory.current_stock,
        }

    def get_purchase(self, obj):
        if obj.purchase:
            return {
                "id": obj.purchase.id,
                "reference": f"PUR-{obj.purchase.id}",
            }
        return None

    def get_sale(self, obj):
        if obj.sale:
            return {
                "id": obj.sale.id,
                "reference": f"SAL-{obj.sale.id}",
            }
        return None
    
class InventoryDropdownSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    reference = serializers.SerializerMethodField()
    label = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = ["id", "label","item_name","warehouse_name","reference"]

    def get_label(self, obj):
        return (
            f"{obj.item.name} | "
            f"{obj.warehouse.name} | "
            f"Stock: {obj.current_stock}"
        )
    def get_reference(self, obj):
        movement = obj.movements.filter(
            purchase__isnull=False
        ).first()

        if movement and movement.purchase:
            return f"PUR-{movement.purchase.id}"

        movement = obj.movements.filter(
            sale__isnull=False
        ).first()

        if movement and movement.sale:
            return f"SAL-{movement.sale.id}"

        return "-"