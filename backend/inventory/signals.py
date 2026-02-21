import logging
from django.db.models.signals import post_save
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from inventory.models import StockMovement, Inventory
from django.db import transaction
from sales_purchases.models import Purchase,Sale

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Sale, dispatch_uid="create_stock_movement_for_sale")
def create_stock_movement_for_sale(sender, instance, created, **kwargs):
    if not created:
        return

    if not instance.item or not instance.warehouse:
        return  # Cannot process sale without item & warehouse

    # Get the inventory for this item+warehouse
    try:
        inventory = Inventory.objects.get(item=instance.item, warehouse=instance.warehouse)
    except Inventory.DoesNotExist:
        raise ValueError(f"No inventory found for {instance.item} in {instance.warehouse}")
    
    if inventory.current_stock < instance.quantity:
        raise ValidationError(f"Not enough stock in {inventory.warehouse.name}")

    # Prevent duplicate movement
    if StockMovement.objects.filter(sale=instance, inventory=inventory).exists():
        return

    with transaction.atomic():
        StockMovement.objects.create(
            inventory=inventory,
            movement_type="sale",
            quantity=-instance.quantity,
            sale=instance,
            notes=instance.notes or "Auto-generated from sale"
        )


@receiver(post_save, sender=Purchase, dispatch_uid="create_stock_movement_for_purchase")
def create_stock_movement_for_purchase(sender, instance, created, **kwargs):
    if not created:
        return

    if not instance.item or not instance.warehouse:
        return  # Cannot create movement without item & warehouse

    inventory, _ = Inventory.objects.get_or_create(
        company=instance.company,
        item=instance.item,
        warehouse=instance.warehouse,
        defaults={"current_stock": 0, "low_stock_threshold": 5}
    )

    # Prevent duplicate movement
    if StockMovement.objects.filter(purchase=instance, inventory=inventory).exists():
        return

    with transaction.atomic():
        StockMovement.objects.create(
            inventory=inventory,
            movement_type="purchase",
            quantity=instance.quantity,
            purchase=instance,
            notes=instance.notes or "Auto-generated from purchase"
        )
