"""Report exporters for PDF, Excel, Word, and CSV output formats."""
import io
import csv
from datetime import datetime
from typing import Optional

from app.models.schemas.report import ReportResult, ExportFormat


class ReportExporter:
    """Factory for report export to various formats."""

    @staticmethod
    def export(result: ReportResult, fmt: ExportFormat) -> tuple[bytes, str, str]:
        """Export report to specified format. Returns (bytes, content_type, filename)."""
        safe_name = result.report_type.replace(" ", "_")
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        base_name = f"{safe_name}_{ts}"

        if fmt == ExportFormat.CSV:
            return CSVExporter.export(result, base_name)
        elif fmt == ExportFormat.XLSX:
            return ExcelExporter.export(result, base_name)
        elif fmt == ExportFormat.PDF:
            return PDFExporter.export(result, base_name)
        elif fmt == ExportFormat.DOCX:
            return WordExporter.export(result, base_name)
        else:
            raise ValueError(f"Unsupported format: {fmt}")


class CSVExporter:
    @staticmethod
    def export(result: ReportResult, base_name: str) -> tuple[bytes, str, str]:
        buf = io.StringIO()
        writer = csv.writer(buf)

        # Header row
        headers = [col["label"] for col in result.columns]
        writer.writerow(headers)

        # Data rows
        keys = [col["key"] for col in result.columns]
        for row in result.rows:
            writer.writerow([row.get(k, "") for k in keys])

        # Totals row
        if result.totals:
            writer.writerow([])
            writer.writerow(["TOTALS"] + [result.totals.get(k, "") for k in keys[1:]])

        content = buf.getvalue().encode("utf-8")
        return content, "text/csv", f"{base_name}.csv"


class ExcelExporter:
    @staticmethod
    def export(result: ReportResult, base_name: str) -> tuple[bytes, str, str]:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

        wb = Workbook()
        ws = wb.active
        ws.title = result.report_type[:31]  # Excel sheet name max 31 chars

        # Styles
        header_font = Font(bold=True, color="FFFFFF", size=11)
        header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
        title_font = Font(bold=True, size=14)
        subtitle_font = Font(italic=True, size=10, color="666666")
        total_font = Font(bold=True, size=11)
        total_fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
        thin_border = Border(
            bottom=Side(style="thin", color="D9D9D9"),
        )
        money_fmt = '#,##0.00'

        # Title block
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(result.columns))
        ws.cell(row=1, column=1, value=result.title).font = title_font
        ws.cell(row=2, column=1, value=f"Project: {result.project_name}").font = subtitle_font
        ws.cell(row=3, column=1, value=f"Generated: {result.generated_at.strftime('%Y-%m-%d %H:%M')}").font = subtitle_font
        ws.cell(row=4, column=1, value=f"Rows: {result.row_count}").font = subtitle_font

        # Headers (row 6)
        header_row = 6
        keys = [col["key"] for col in result.columns]
        for ci, col in enumerate(result.columns, 1):
            cell = ws.cell(row=header_row, column=ci, value=col["label"])
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        # Data rows
        money_keys = {"best_total", "likely_total", "worst_total", "pert_total",
                       "std_dev", "confidence_80_low", "confidence_80_high", "exposure",
                       "total_exposure", "total_likely", "total_pert", "combined_std_dev",
                       "best_estimate", "likely_estimate", "worst_estimate", "pert_estimate",
                       "risk_exposure"}
        for ri, row in enumerate(result.rows, header_row + 1):
            for ci, key in enumerate(keys, 1):
                val = row.get(key, "")
                cell = ws.cell(row=ri, column=ci, value=val)
                cell.border = thin_border
                if key in money_keys and isinstance(val, (int, float)):
                    cell.number_format = money_fmt

        # Totals row
        if result.totals:
            total_row = header_row + len(result.rows) + 2
            ws.cell(row=total_row, column=1, value="TOTALS").font = total_font
            for ci, key in enumerate(keys, 1):
                if key in result.totals:
                    cell = ws.cell(row=total_row, column=ci, value=result.totals[key])
                    cell.font = total_font
                    cell.fill = total_fill
                    if key in money_keys:
                        cell.number_format = money_fmt

        # Auto-width columns
        for ci in range(1, len(keys) + 1):
            ws.column_dimensions[ws.cell(row=header_row, column=ci).column_letter].width = 16

        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"{base_name}.xlsx"


class PDFExporter:
    @staticmethod
    def export(result: ReportResult, base_name: str) -> tuple[bytes, str, str]:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        buf = io.BytesIO()
        page_size = landscape(A4) if len(result.columns) > 6 else A4
        doc = SimpleDocTemplate(buf, pagesize=page_size, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        elements.append(Paragraph(result.title, styles["Title"]))
        elements.append(Paragraph(f"Project: {result.project_name}", styles["Normal"]))
        elements.append(Paragraph(f"Generated: {result.generated_at.strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
        elements.append(Paragraph(f"Rows: {result.row_count}", styles["Normal"]))
        elements.append(Spacer(1, 0.3 * inch))

        # Table
        keys = [col["key"] for col in result.columns]
        headers = [col["label"] for col in result.columns]
        table_data = [headers]

        for row in result.rows[:500]:  # Cap at 500 for PDF
            table_data.append([
                str(row.get(k, ""))[:40] for k in keys  # Truncate long values
            ])

        if result.totals:
            table_data.append(["TOTALS"] + [str(result.totals.get(k, "")) for k in keys[1:]])

        col_widths = [max(page_size[0] - 1.5*inch, 600) / len(keys)] * len(keys)

        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F4E79")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("FONTSIZE", (0, 1), (-1, -1), 7),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ALIGN", (0, 1), (0, -1), "LEFT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9D9D9")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F6FA")]),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))

        if result.totals:
            last = len(table_data) - 1
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, last), (-1, last), colors.HexColor("#E2EFDA")),
                ("FONTNAME", (0, last), (-1, last), "Helvetica-Bold"),
            ]))

        elements.append(t)
        doc.build(elements)
        return buf.getvalue(), "application/pdf", f"{base_name}.pdf"


class WordExporter:
    @staticmethod
    def export(result: ReportResult, base_name: str) -> tuple[bytes, str, str]:
        from docx import Document
        from docx.shared import Inches, Pt, RGBColor
        from docx.enum.table import WD_TABLE_ALIGNMENT

        doc = Document()

        # Title
        doc.add_heading(result.title, level=1)
        doc.add_paragraph(f"Project: {result.project_name}")
        doc.add_paragraph(f"Generated: {result.generated_at.strftime('%Y-%m-%d %H:%M')}")
        doc.add_paragraph(f"Total rows: {result.row_count}")
        doc.add_paragraph("")

        # Table
        keys = [col["key"] for col in result.columns]
        headers = [col["label"] for col in result.columns]
        num_cols = len(headers)

        table = doc.add_table(rows=1, cols=num_cols)
        table.style = "Light Grid Accent 1"
        table.alignment = WD_TABLE_ALIGNMENT.CENTER

        # Header row
        for ci, label in enumerate(headers):
            cell = table.rows[0].cells[ci]
            cell.text = label
            for p in cell.paragraphs:
                for run in p.runs:
                    run.font.bold = True
                    run.font.size = Pt(9)

        # Data rows (cap at 200 for Word)
        for row in result.rows[:200]:
            cells = table.add_row().cells
            for ci, key in enumerate(keys):
                val = row.get(key, "")
                cells[ci].text = str(val) if val is not None else ""
                for p in cells[ci].paragraphs:
                    for run in p.runs:
                        run.font.size = Pt(8)

        # Totals row
        if result.totals:
            cells = table.add_row().cells
            cells[0].text = "TOTALS"
            for p in cells[0].paragraphs:
                for run in p.runs:
                    run.font.bold = True
            for ci, key in enumerate(keys[1:], 1):
                if key in result.totals:
                    cells[ci].text = str(result.totals[key])
                    for p in cells[ci].paragraphs:
                        for run in p.runs:
                            run.font.bold = True

        buf = io.BytesIO()
        doc.save(buf)
        return buf.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", f"{base_name}.docx"
