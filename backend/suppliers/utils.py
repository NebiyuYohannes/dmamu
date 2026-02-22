import csv
from django.http import HttpResponse
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO


def export_supplier_history(export_type, data, supplier_id):

    if export_type == "csv":
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="supplier_{supplier_id}_history.csv"'

        writer = csv.writer(response)

        writer.writerow([
            'Date', 'Product Code', 'Units', 'Unit Price',
            'Payable', 'Payment Sent', 'Bank', 'Remain'
        ])

        for row in data:
            writer.writerow([
                row['date'],
                row['product_code'],
                row['units'],
                row['unit_price'],
                row['payable'],
                row['payment_sent'],
                row['bank'],
                row['remain'],
            ])

        return response

    elif export_type == "pdf":
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer)
        elements = []

        styles = getSampleStyleSheet()
        elements.append(Paragraph(f"Supplier {supplier_id} Purchase History", styles['Heading1']))
        elements.append(Spacer(1, 12))

        table_data = [[
            'Date', 'Product', 'Units', 'Unit Price',
            'Payable', 'Paid', 'Bank', 'Remain'
        ]]

        for row in data:
            table_data.append([
                row['date'],
                row['product_code'],
                row['units'],
                str(row['unit_price']),
                str(row['payable']),
                str(row['payment_sent']),
                row['bank'] or '',
                str(row['remain']),
            ])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))

        elements.append(table)
        doc.build(elements)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="supplier_{supplier_id}_history.pdf"'

        buffer.close()
        return response

    else:
        return None