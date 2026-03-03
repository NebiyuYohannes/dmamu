from django.db import models, transaction
from django.db.models import Sum
from django.core.exceptions import ValidationError
from core.models import Company 

class Category(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['company', 'name']
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name

class Warehouse(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='warehouses')
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company', 'name')
        ordering = ['name']
        verbose_name_plural = 'warehouses'

    def __str__(self):
        return f"{self.name} ({self.address or 'No address'})"

class Item(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='items')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    unit_measure = models.CharField(max_length=20,default='piece')

    class Meta:
        verbose_name_plural = 'items'

    def __str__(self):
        return f"{self.name} (stock- {self.total_stock})"

    @property
    def total_stock(self):
        return self.inventories.aggregate(total=Sum('current_stock'))['total'] or 0

    @property
    def is_low_stock(self):
        return any(inv.current_stock <= inv.low_stock_threshold for inv in self.inventories.all())

class Inventory(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='inventories')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='inventories')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='inventories')
    current_stock = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)

    class Meta:
        unique_together = ('company', 'item', 'warehouse')
        verbose_name_plural = 'inventories'

    def __str__(self):
        return f"{self.item.name} - {self.warehouse.name} ({self.current_stock})"
    
    @property
    def is_low_stock(self):
        return self.current_stock <= self.low_stock_threshold

    def clean(self):
        if self.company_id is None:
            self.company = self.item.company
        if self.item.company != self.company or self.warehouse.company != self.company:
            raise ValidationError({"detail": "Item, Warehouse, and Inventory must belong to the same company."})
        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean() 
        super().save(*args, **kwargs)

class StockMovement(models.Model):
    MOVEMENT_TYPE_CHOICES = [
        ('purchase', 'Purchase'),
        ('sale', 'Sale'),
        ('adjustment', 'Adjustment'),
        ('transfer_in', 'Transfer In'),
        ('transfer_out', 'Transfer Out'),
    ]
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantity = models.IntegerField()
    date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    purchase = models.ForeignKey(
        'sales_purchases.Purchase',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='stock_movements'
    )

    sale = models.ForeignKey(
        'sales_purchases.Sale',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='stock_movements'
    )

    class Meta:
        ordering = ['-date']
        verbose_name_plural = 'stock movements'

    def __str__(self):
        return f"{self.movement_type} {self.quantity} - {self.inventory.item.name} ({self.inventory.warehouse.name})"

    def clean(self):
        if self.purchase and self.sale:
            raise ValidationError({"detail": "Movement cannot be linked to both purchase and sale."})
        if self.movement_type == "purchase" and not self.purchase:
            raise ValidationError({"detail": "Purchase movement must link to a Purchase record."})
        if self.movement_type == "sale" and not self.sale:
            raise ValidationError({"detail": "Sale movement must link to a Sale record."})

        if self.movement_type in ['purchase', 'transfer_in']:
            if self.quantity <= 0:
                raise ValidationError(f"Quantity must be positive for '{self.movement_type}' movements.")
        elif self.movement_type in ['sale', 'transfer_out']:
            if self.quantity >= 0:
                raise ValidationError(f"Quantity must be negative for '{self.movement_type}' movements.")
        elif self.movement_type == 'adjustment':
            if self.quantity == 0:
                raise ValidationError({"detail": "Adjustment quantity cannot be zero."})

        super().clean()

    def save(self, *args, **kwargs):
            self.full_clean() 
            if self.pk:
                raise ValidationError({"detail": "Editing stock movements is not allowed."})
            with transaction.atomic():
                self.inventory.current_stock += self.quantity
                self.inventory.save(update_fields=['current_stock'])
                super().save(*args, **kwargs)