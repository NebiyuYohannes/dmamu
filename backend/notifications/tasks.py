from celery import shared_task
from inventory.models import Inventory  
from subscriptions.models import Subscription
from django.db import models
from .models import Notification
from datetime import date, timedelta
from sales_purchases.models import Sale, Purchase

@shared_task
def generate_daily_notifications():
    # Low Stock: Check per warehouse stock in Inventory model
    low_stocks = Inventory.objects.filter(current_stock__lt=models.F('low_stock_threshold'))
    for inv in low_stocks:
        Notification.objects.create(
            company=inv.company,
            user=inv.company.owner, 
            type='low_stock',
            message=f"{inv.item.name} stock low in {inv.warehouse.name}: {inv.current_stock} left (threshold {inv.low_stock_threshold})"
        )

    # Sub Expiry (warn 7 days before) — no change, fits model
    expiring_subs = Subscription.objects.filter(end_date__lte=date.today() + timedelta(days=7), active=True)
    for sub in expiring_subs:
        Notification.objects.create(
            company=sub.company,
            user=sub.company.owner,
            type='sub_expiry',
            message=f"Subscription expires in { (sub.end_date - date.today()).days } days. Renew soon!"
        )

    # Payment Due (overdue sales/purchases with partial status and past date)
    overdue_sales = Sale.objects.filter(status='partial', date__lt=date.today())
    for sale in overdue_sales:
        Notification.objects.create(
            company=sale.company,
            user=sale.company.owner,
            type='payment_due',
            message=f"Payment due for Sale #{sale.id} to {sale.customer.name}: Remain {sale.get_balance()}"
        )

    overdue_purchases = Purchase.objects.filter(status='partial', date__lt=date.today())
    for purchase in overdue_purchases:
        Notification.objects.create(
            company=purchase.company,
            user=purchase.company.owner,
            type='payment_due',
            message=f"Payment due for Purchase #{purchase.id} to {purchase.supplier.name}: Remain {purchase.get_balance()}"
        )