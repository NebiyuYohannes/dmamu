from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import StockMovement
from sales_purchases.models import Sale, Purchase

@receiver(post_save, sender=Sale)
def update_stock_on_sale(sender, instance, created, **kwargs):
    if created and instance.item:
        StockMovement.objects.create(
            item=instance.item,
            type='out',
            quantity=instance.quantity,
            reference=f"Sale #{instance.id}"
        )

@receiver(post_save, sender=Purchase)
def update_stock_on_purchase(sender, instance, created, **kwargs):
    if created and instance.item:
        StockMovement.objects.create(
            item=instance.item,
            type='in',
            quantity=instance.quantity,
            reference=f"Purchase #{instance.id}"
        )