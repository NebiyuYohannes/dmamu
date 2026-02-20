import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, dispatch_uid="create_stock_movement_for_sale")
def create_stock_movement_for_sale(sender, instance, created, **kwargs):
    from sales_purchases.models import Sale
    from inventory.models import StockMovement

    # Only act for Sale model
    if sender != Sale:
        return

    if not created or not instance.item:
        return

    # Prevent duplicate movement
    if StockMovement.objects.filter(sale=instance).exists():
        logger.warning(f"Stock movement already exists for Sale #{instance.id}")
        return

    StockMovement.objects.create(
        item=instance.item,
        movement_type="sale",
        quantity=-instance.quantity, 
        sale=instance,
        notes=instance.notes or "Auto-generated from sale"
    )


@receiver(post_save, dispatch_uid="create_stock_movement_for_purchase")
def create_stock_movement_for_purchase(sender, instance, created, **kwargs):
    from sales_purchases.models import Purchase
    from inventory.models import StockMovement

    # Only act for Purchase model
    if sender != Purchase:
        return

    if not created or not instance.item:
        return

    # Prevent duplicate movement
    if StockMovement.objects.filter(purchase=instance).exists():
        logger.warning(f"Stock movement already exists for Purchase #{instance.id}")
        return

    StockMovement.objects.create(
        item=instance.item,
        movement_type="purchase",
        quantity=instance.quantity,  
        purchase=instance,
        notes=instance.notes or "Auto-generated from purchase"
    )
