import csv
from django.http import HttpResponse
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO

def export_customer_history(export_type, data, customer_id):

    if export_type == "csv":
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="customer_{customer_id}_history.csv"'

        writer = csv.writer(response)

        writer.writerow([
            'Date', 'Product Code', 'Units', 'Unit Price',
            'Payable', 'Payment Received', 'Bank', 'Remain'
        ])

        for row in data:
            writer.writerow([
                row.get('date'),
                row.get('product_code'),
                row.get('units'),
                row.get('product_price'),   
                row.get('payable'),
                row.get('payment_received'),
                row.get('bank'),
                row.get('remain'),
            ])

        return response

    elif export_type == "pdf":
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer)
        elements = []

        styles = getSampleStyleSheet()
        elements.append(Paragraph(
            f"Customer {customer_id} Purchase History",
            styles['Heading1']
        ))
        elements.append(Spacer(1, 12))

        table_data = [[
            'Date', 'Product', 'Units', 'Unit Price',
            'Payable', 'Paid', 'Bank', 'Remain'
        ]]

        for row in data:
            table_data.append([
                row.get('date'),
                row.get('product_code'),
                row.get('units'),
                str(row.get('product_price')),
                str(row.get('payable')),
                str(row.get('payment_received')),
                row.get('bank') or '',
                str(row.get('remain')),
            ])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))

        elements.append(table)
        doc.build(elements)

        buffer.seek(0)

        response = HttpResponse(
        buffer.getvalue(),
        content_type='application/pdf',
        status=200)
        response['Content-Disposition'] = f'attachment; filename="customer_{customer_id}_history.pdf"'

        return response

    return None

