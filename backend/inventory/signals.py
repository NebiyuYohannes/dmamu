import logging
from django.db.models.signals import post_save
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from inventory.models import StockMovement, Inventory
from django.db import transaction
from sales_purchases.models import Purchase,Sale
from notifications.models import Notification
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


@receiver(post_save, sender=StockMovement)
def trigger_low_stock_notification(sender, instance, created, **kwargs):
    if created:  # Only on new movements
        inventory = instance.inventory
        # Check if this movement reduces stock (out or negative adjustment)
        if instance.movement_type in ['sale', 'transfer_out'] or (instance.movement_type == 'adjustment' and instance.quantity < 0):
            # After update, check if now low
            if inventory.is_low_stock:
                Notification.objects.create(
                    company=inventory.company,
                    user=inventory.company.owner, 
                    type='low_stock',
                    message=f"{inventory.item.name} stock low in {inventory.warehouse.name}: {inventory.current_stock} left (threshold {inventory.low_stock_threshold})"
                )