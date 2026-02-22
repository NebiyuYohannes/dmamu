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
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True)
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

    def update_status(self):
        paid = self.transactions.aggregate(total_paid=Sum('amount'))['total_paid'] or 0
        if paid >= self.total:
            self.status = PaymentStatus.PAID
        elif paid > 0:
            self.status = PaymentStatus.PARTIAL
        else:
            self.status = PaymentStatus.UNPAID
        self.save(update_fields=['status'])

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
    

    def update_status(self):
        agg = self.transactions.aggregate(
            total_out=Sum('amount', filter=Q(type='outflow')),
            total_in=Sum('amount', filter=Q(type='inflow'))
        )

        total_out = agg['total_out'] or 0
        total_in = agg['total_in'] or 0

        net_paid = total_out - total_in
        balance = self.total - net_paid

        if balance == 0:
            self.status = PaymentStatus.PAID
        elif balance > 0:
            self.status = PaymentStatus.PARTIAL
        elif balance < 0:
            self.status = PaymentStatus.OVERPAID
        else:
            self.status = PaymentStatus.UNPAID

        self.save(update_fields=['status'])