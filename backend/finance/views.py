from django.db.models import Sum,Q
from rest_framework import viewsets,generics, status
from datetime import datetime,timedelta
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from dateutil.relativedelta import relativedelta
from crm.permissions import HasActiveSubscription
from .models import Account, Transaction
from .serializers import AccountSerializer, TransactionSerializer, ExpenseSerializer
from django.utils.timezone import now

class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    filter_backends = [OrderingFilter, SearchFilter]
    http_method_names = ["get","post","path","put","options","head"]
    search_fields = ['name']
    ordering_fields = ['name', 'balance']

    def get_queryset(self):
        if self.request.user.role == 'super_admin':
            return Account.objects.all()
        return Account.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    filter_backends = [OrderingFilter, SearchFilter]
    search_fields = ['description', 'reference']
    ordering_fields = ['date', 'amount']

    def get_queryset(self):
        if self.request.user.role == 'super_admin':
            return Transaction.objects.all()
        return Transaction.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


@api_view(['GET'])
@permission_classes([HasActiveSubscription, IsAuthenticated])
def finance_stats(request):
    if request.user.role != 'super_admin':
        company = request.user.company
        company_filter = Q(company=company)
    else:
        company_filter = Q()

    if request.user.role != 'super_admin':
        accounts = Account.objects.filter(company=company)
    else:
        accounts = Account.objects.all()

    search = request.query_params.get('search', '').strip()
    if search:
        accounts = accounts.filter(
            Q(name__icontains=search) |
            Q(full_name__icontains=search)
        )

    today = datetime.today().date()
    current_month_start = today.replace(day=1)
    current_month_end = (current_month_start + relativedelta(months=1)) - timedelta(days=1)
    last_month_start = current_month_start - relativedelta(months=1)
    last_month_end = current_month_start - timedelta(days=1)

    # type='expense'
    total_expenses_current = Transaction.objects.filter(
        company_filter,
        type='expense',
        date__date__range=[current_month_start, current_month_end]
    ).aggregate(Sum('amount'))['amount__sum'] or 0

    total_expenses_last = Transaction.objects.filter(
        company_filter,
        type='expense',
        date__date__range=[last_month_start, last_month_end]
    ).aggregate(Sum('amount'))['amount__sum'] or 0

    expenses_change = (
        ((total_expenses_current - total_expenses_last) / total_expenses_last * 100)
        if total_expenses_last else 0
    )

    cash_on_hand = accounts.filter(
        account_type='cash'
    ).aggregate(Sum('balance'))['balance__sum'] or 0

    banks = accounts.filter(account_type='bank')
    banks_formatted = [
        {
            "name": bank.name,
            "full_name": bank.full_name,
            "account_number": bank.account_number,
            "balance": bank.balance,
            "label": "Available Balance"
        }
        for bank in banks
    ]

    return Response({
        "total_expenses": {
            "amount": total_expenses_current,
            "change_vs_last_month": f"+{expenses_change:.1f}%" if expenses_change >= 0 else f"{expenses_change:.1f}%",
            "label": "Operating Costs"
        },
        "cash_on_hand": {
            "amount": cash_on_hand,
            "label": "Physical Currency"
        },
        "banks": banks_formatted
    })


@api_view(['GET'])
@permission_classes([HasActiveSubscription, IsAuthenticated])
def cash_management(request):
    if request.user.role != 'super_admin':
        transactions = Transaction.objects.filter(company=request.user.company)
    else:
        transactions = Transaction.objects.all()

    search = request.query_params.get('search')
    if search:
        transactions = transactions.filter(description__icontains=search)

    trans_type = request.query_params.get('type')
    if trans_type and trans_type != 'all':
        transactions = transactions.filter(type=trans_type)

    # Net Worth = sum of all account balances
    net_worth = Account.objects.filter(
        company=request.user.company
    ).aggregate(Sum('balance'))['balance__sum'] or 0

    today = datetime.today()
    current_month_start = today.replace(day=1)
    current_month_end = current_month_start + relativedelta(months=1, days=-1)

    # Profit inflows = revenue + refund_in
    total_inflows = transactions.filter(
        type__in=['revenue', 'refund_in'],
        date__range=[current_month_start, current_month_end]
    ).aggregate(Sum('amount'))['amount__sum'] or 0

    # Profit outflows = cogs + expense + refund_out
    total_outflows = transactions.filter(
        type__in=['cogs', 'expense', 'refund_out'],
        date__range=[current_month_start, current_month_end]
    ).aggregate(Sum('amount'))['amount__sum'] or 0

    #Profit = revenue - costs
    total_profit = total_inflows - total_outflows

    history = transactions.order_by('-date')
    history_list = [
        {
            "id": t.id,
            "description": t.description,
            "date": t.date.strftime("%b %d, %Y • %I:%M %p"),
            "amount": t.amount,
            "type": t.type,
            "balance": t.balance_at_time
        }
        for t in history
    ]

    return Response({
        # "net_worth": net_worth,
        "current_balance": net_worth,
        "total_profit": total_profit,
        "total_inflows": total_inflows,
        "total_outflows": total_outflows,
        "transaction_history": history_list
    })


class ExpenseCreateView(generics.CreateAPIView):
    serializer_class = ExpenseSerializer

    def perform_create(self, serializer):
        serializer.save()
        return Response({
            "message": "Expense added successfully",
            "new_balance": serializer.instance.account.balance
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_type_dropdown(request):
    types = [
        {"value": value, "label": label}
        for value, label in Transaction.TYPE_CHOICES
    ]
    return Response(types)