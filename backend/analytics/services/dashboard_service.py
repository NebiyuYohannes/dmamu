from decimal import Decimal
from datetime import timedelta

from django.db.models import Sum, F, Value, DecimalField,Count
from django.db.models.functions import Coalesce
from django.utils.timezone import now
from dateutil.relativedelta import relativedelta

from finance.models import Account, Transaction
from sales_purchases.models import Sale, Purchase
from inventory.models import Item, Inventory
from crm.models import Customer
from suppliers.models import Supplier


def _safe_sum(queryset, field_name):
    result = queryset.aggregate(
        total=Coalesce(Sum(field_name), Value(0), output_field=DecimalField())
    )["total"]
    return result or Decimal(0)


def _to_number(x):
    if x is None:
        return 0.0
    if isinstance(x, Decimal):
        return float(x)
    return float(x)


class DashboardService:
    @staticmethod
    def get_financial_stats(user):
        if getattr(user, "role", None) == "super_admin":
            accounts_qs = Account.objects.all()
            transactions_qs = Transaction.objects.all()
            sales_qs = Sale.objects.all()
            purchases_qs = Purchase.objects.all()
            items_qs = Item.objects.all()
            customers_qs = Customer.objects.all()
            inventories_qs = Inventory.objects.all()
        else:
            company = getattr(user, "company", None)
            accounts_qs = Account.objects.filter(company=company)
            transactions_qs = Transaction.objects.filter(company=company)
            sales_qs = Sale.objects.filter(company=company)
            purchases_qs = Purchase.objects.filter(company=company)
            items_qs = Item.objects.filter(company=company)
            customers_qs = Customer.objects.filter(company=company)
            inventories_qs = Inventory.objects.filter(company=company)

        today = now().date()
        current_month_start = today.replace(day=1)
        last_month_start = current_month_start - relativedelta(months=1)
        last_month_end = current_month_start - timedelta(days=1)
        current_month_end = (current_month_start + relativedelta(months=1)) - timedelta(days=1)

        bank_balance = _safe_sum(accounts_qs.filter(account_type="bank"), "balance")
        cash_balance = _safe_sum(accounts_qs.filter(account_type="cash"), "balance")
        total_funds = bank_balance + cash_balance

        total_products = items_qs.count()
        low_stock_items = inventories_qs.filter(current_stock__lte=F("low_stock_threshold")).count()


        total_customers = customers_qs.count()

        sales_with_paid = sales_qs.annotate(
            paid=Coalesce(Sum("transactions__amount"), Value(0), output_field=DecimalField())
        )

        receivables_total = sales_with_paid.filter(total__gt=F("paid")).aggregate(
            total=Coalesce(Sum(F("total") - F("paid")), Value(0), output_field=DecimalField())
        )["total"] or Decimal(0)

        overdue_receivables_count = sales_with_paid.filter(
            total__gt=F("paid"),
            date__lte=today - timedelta(days=30)
        ).count()

        # Payables (unpaid purchases) and due next 30 days
        purchases_with_paid = purchases_qs.annotate(
            paid=Coalesce(Sum("transactions__amount"), Value(0), output_field=DecimalField())
        )

        payables_total = purchases_with_paid.filter(total__gt=F("paid")).aggregate(
            total=Coalesce(Sum(F("total") - F("paid")), Value(0), output_field=DecimalField())
        )["total"] or Decimal(0)

        payables_due_30_count = purchases_with_paid.filter(
            total__gt=F("paid"),
            date__lte=today + timedelta(days=30)
        ).count()

        # Monthly totals (for profit/expenses/growth)
        sales_current = sales_qs.filter(date__range=[current_month_start, current_month_end]).aggregate(
            total=Coalesce(Sum("total"), Value(0), output_field=DecimalField())
        )["total"] or Decimal(0)

        purchases_current = purchases_qs.filter(date__range=[current_month_start, current_month_end]).aggregate(
            total=Coalesce(Sum("total"), Value(0), output_field=DecimalField())
        )["total"] or Decimal(0)

        expenses_current = transactions_qs.filter(
            type="outflow", date__range=[current_month_start, current_month_end]
        ).aggregate(
            total=Coalesce(Sum("amount"), Value(0), output_field=DecimalField())
        )["total"] or Decimal(0)

        # Last month aggregates
        sales_last = sales_qs.filter(date__range=[last_month_start, last_month_end]).aggregate(
            total=Coalesce(Sum("total"), Value(0), output_field=DecimalField())
        )["total"] or Decimal(0)

        purchases_last = purchases_qs.filter(date__range=[last_month_start, last_month_end]).aggregate(
            total=Coalesce(Sum("total"), Value(0), output_field=DecimalField())
        )["total"] or Decimal(0)

        expenses_last = transactions_qs.filter(
            type="outflow", date__range=[last_month_start, last_month_end]
        ).aggregate(
            total=Coalesce(Sum("amount"), Value(0), output_field=DecimalField())
        )["total"] or Decimal(0)

        # profit = sales - purchases - expenses
        profit_current = sales_current - purchases_current - expenses_current
        profit_last = sales_last - purchases_last - expenses_last

        def pct_change(current, previous):
            try:
                if previous == 0:
                    return "0.0%"
                change = (current - previous) / previous * 100
                sign = "+" if change >= 0 else ""
                return f"{sign}{change:.1f}%"
            except Exception:
                return "0.0%"

        # Net worth = total funds + receivables - payables
        net_worth = total_funds + receivables_total - payables_total

        # For a rough net worth growth, compute last month's funds + receivables_last - payables_last
        bank_last = _safe_sum(accounts_qs.filter(account_type="bank"), "balance")
        cash_last = _safe_sum(accounts_qs.filter(account_type="cash"), "balance")
        net_worth_last = (bank_last + cash_last) + (sales_last - purchases_last - expenses_last)

        net_worth_growth = pct_change(net_worth, net_worth_last)

        return {
            "net_worth": {
                "amount": _to_number(net_worth),
                "growth": net_worth_growth
            },
            "total_profit": {
                "amount": _to_number(profit_current),
                "growth": pct_change(profit_current, profit_last)
            },
            "total_expenses": {
                "amount": _to_number(expenses_current),
                "growth": pct_change(expenses_current, expenses_last)
            },
            "bank_balance": {
                "amount": _to_number(bank_balance),
                "label": "Available funds"
            },
            "total_products": {
                "amount": total_products,
                "low_stock_items": low_stock_items
            },
            "total_customers": {
                "amount": total_customers,
                "growth": "0.0%"  
            },
            "receivables": {
                "amount": _to_number(receivables_total),
                "overdue_count": overdue_receivables_count
            },
            "payables": {
                "amount": _to_number(payables_total),
                "due_30_days_count": payables_due_30_count
            },
            "cash_balance": {
                "amount": _to_number(cash_balance)
            },
            "total_funds": {
                "amount": _to_number(total_funds)
            }
        }
    
    @staticmethod
    def get_top_selling_products(user, limit=3):

        if user.role == "super_admin":
            sales = Sale.objects.all()
        else:
            sales = Sale.objects.filter(company=user.company)

        products = (
            sales.values("item__name")
            .annotate(
                total_units=Sum("quantity"),
                total_revenue=Sum("total"),
            )
            .order_by("-total_units")[:limit]
        )

        return [
            {
                "product": p["item__name"],
                "units_sold": p["total_units"] or 0,
                "revenue": float(p["total_revenue"] or 0),
            }
            for p in products
        ]
    @staticmethod
    def get_top_customers(user, limit=3):

        customers = Customer.objects.filter(company=user.company)

        data = (
            Sale.objects.filter(customer__in=customers)
            .values("customer__name")
            .annotate(
                orders=Count("id"),
                total_spent=Sum("total"),
            )
            .order_by("-total_spent")[:limit]
        )

        return [
            {
                "customer": d["customer__name"],
                "orders": d["orders"],
                "total_spent": float(d["total_spent"] or 0),
            }
            for d in data
        ]
    

    @staticmethod
    def get_top_suppliers(user, limit=3):

        suppliers = Supplier.objects.filter(company=user.company)

        data = (
            Purchase.objects.filter(supplier__in=suppliers)
            .values("supplier__name")
            .annotate(
                products_supplied=Sum("quantity"),
                total_value=Sum("total"),
            )
            .order_by("-total_value")[:limit]
        )

        return [
            {
                "supplier": d["supplier__name"],
                "products_supplied": d["products_supplied"] or 0,
                "total_value": float(d["total_value"] or 0),
            }
            for d in data
        ]