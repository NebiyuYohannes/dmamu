from django.db import models
from django.db.models import Sum, Q
from rest_framework.serializers import ValidationError
from core.models import Company
from crm.models import Customer
from suppliers.models import Supplier
from inventory.models import Item,Warehouse
from finance.models import Account, Transaction

class PaymentStatus(models.TextChoices):
    PAID = 'paid', 'Paid'
    PARTIAL = 'partial', 'Partial'
    UNPAID = 'unpaid', 'Unpaid' 
    OVERPAID = 'overpaid', 'Overpaid'

class PaymentMethod(models.TextChoices):
    CASH = 'cash', 'Cash'
    BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'


class Sale(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True,related_name="sales")
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True)
    quantity = models.PositiveIntegerField()
    warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)  # quantity * unit_price
    date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, null=True, blank=True)
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True) 

    def __str__(self):
        return f"Sale to {self.customer or 'Cash'} - {self.id}"
    
    @property
    def balance(self):
        """
        How much customer still owes.
        revenue    = customer paid you        (reduces balance)
        refund_out = you refunded customer    (increases balance)
        """
        agg = self.transactions.aggregate(
            total_received=Sum('amount', filter=Q(type='revenue')),
            total_refunded=Sum('amount', filter=Q(type='refund_out')),
        )
        total_received = agg['total_received'] or 0
        total_refunded = agg['total_refunded'] or 0
        net_received = total_received - total_refunded
        return self.total - net_received

    def update_status(self):
        balance = self.balance

        if balance < 0:
            new_status = PaymentStatus.OVERPAID
        elif balance == 0:
            new_status = PaymentStatus.PAID
        elif balance == self.total:
            new_status = PaymentStatus.UNPAID
        else:
            new_status = PaymentStatus.PARTIAL

        Sale.objects.filter(pk=self.pk).update(status=new_status)


class Purchase(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, null=True, blank=True)
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True) 

    def __str__(self):
        return f"Purchase from {self.supplier or 'Cash'} - {self.id}"
    

    @property
    def balance(self):
        """
        How much you still owe supplier.
        cogs      = you paid supplier         (reduces balance)
        refund_in = supplier refunded you     (increases balance)
        """
        agg = self.transactions.aggregate(
            total_paid=Sum('amount', filter=Q(type='cogs')),
            total_refunded=Sum('amount', filter=Q(type='refund_in')),
        )
        total_paid = agg['total_paid'] or 0
        total_refunded = agg['total_refunded'] or 0
        net_paid = total_paid - total_refunded
        return self.total - net_paid

    def update_status(self):
        balance = self.balance

        if balance < 0:
            new_status = PaymentStatus.OVERPAID
        elif balance == 0:
            new_status = PaymentStatus.PAID
        elif balance == self.total:
            new_status = PaymentStatus.UNPAID
        else:
            new_status = PaymentStatus.PARTIAL

        Purchase.objects.filter(pk=self.pk).update(status=new_status)