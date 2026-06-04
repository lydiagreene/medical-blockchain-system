"""
credentials/pdf_utils.py
Generates a verification certificate PDF for a credential.
"""

import io
import base64
import qrcode
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image as RLImage,
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF


# ── Brand colours ──
NAVY   = colors.HexColor('#0F172A')
BLUE   = colors.HexColor('#2563EB')
GREEN  = colors.HexColor('#059669')
AMBER  = colors.HexColor('#D97706')
RED    = colors.HexColor('#DC2626')
GREY   = colors.HexColor('#64748B')
LIGHT  = colors.HexColor('#F1F5F9')
BORDER = colors.HexColor('#E2E8F0')
WHITE  = colors.white


def _status_color(status):
    return {
        'ACTIVE':  GREEN,
        'REVOKED': RED,
        'EXPIRED': AMBER,
        'PENDING': GREY,
    }.get(status, GREY)


def _qr_image(url, size_mm=48):
    """Generate a QR code and return it as a ReportLab Image flowable.

    Uses ERROR_CORRECT_H (30% damage tolerance) — important for printed documents
    that may be folded, stamped, or partially obscured.
    """
    qr = qrcode.QRCode(
        version=None,
        box_size=8,
        border=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='#0F172A', back_color='white')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    size = size_mm * mm
    return RLImage(buf, width=size, height=size)


def generate_certificate_pdf(credential, generated_by_user=None,
                             site_url='http://127.0.0.1:8000',
                             frontend_url=None):
    """
    Build and return a PDF verification certificate as bytes.

    Args:
        credential: Credential model instance
        generated_by_user: CustomUser who requested the download (may be None)
        site_url: Legacy fallback base URL
        frontend_url: React SPA base URL — QR code links here (e.g. https://verifydoc.ug)

    Returns:
        bytes — the raw PDF content
    """
    # React public verify URL: /verify?q=<license_number>
    _base = (frontend_url or site_url).rstrip('/')
    public_url = f"{_base}/verify?q={credential.license_number}"
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )

    W = A4[0] - 36 * mm   # usable width
    styles = getSampleStyleSheet()
    story = []

    # ── Helper styles ──
    def _style(name, **kw):
        base = kw.pop('parent', 'Normal')
        s = ParagraphStyle(name, parent=styles[base], **kw)
        return s

    h_brand = _style('Brand', fontSize=18, textColor=WHITE, fontName='Helvetica-Bold',
                     alignment=TA_LEFT, leading=22)
    h_sub   = _style('BrandSub', fontSize=9, textColor=colors.HexColor('#94A3B8'),
                     fontName='Helvetica', alignment=TA_LEFT, leading=12)
    h_tag   = _style('Tag', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold',
                     alignment=TA_RIGHT, leading=10)

    label_s = _style('Label', fontSize=7.5, textColor=GREY, fontName='Helvetica-Bold',
                     spaceBefore=0, spaceAfter=1)
    value_s = _style('Value', fontSize=10, textColor=NAVY, fontName='Helvetica-Bold',
                     spaceBefore=0, spaceAfter=0)
    small_s = _style('Small', fontSize=8, textColor=GREY, fontName='Helvetica',
                     spaceBefore=0, spaceAfter=0)
    mono_s  = _style('Mono', fontSize=8, textColor=GREY, fontName='Courier',
                     spaceBefore=0, spaceAfter=0)
    center_s = _style('Center', fontSize=9, textColor=GREY, alignment=TA_CENTER)

    status_color = _status_color(credential.status)

    # ═══════════════════════════════════════════
    # HEADER — dark navy banner
    # ═══════════════════════════════════════════
    header_data = [[
        Paragraph('VerifyDoc Uganda', h_brand),
        Paragraph(
            f'MEDICAL CREDENTIAL<br/><font size="7">VERIFICATION CERTIFICATE</font>',
            h_tag
        ),
    ]]
    header_table = Table(header_data, colWidths=[W * 0.65, W * 0.35])
    header_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), NAVY),
        ('TOPPADDING',    (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING',   (0, 0), (0, 0),   14),
        ('RIGHTPADDING',  (-1, 0), (-1, 0), 14),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(header_table)

    # Status colour bar
    status_bar = Table([['']], colWidths=[W + 36 * mm])
    status_bar.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), status_color),
        ('TOPPADDING',    (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
    ]))

    # Extend bar to full page width by removing doc margins temporarily — use negative hpad
    bar_data = [['']]
    bar_tbl = Table(bar_data, colWidths=[W])
    bar_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (0, 0), status_color),
        ('TOPPADDING',    (0, 0), (0, 0), 2),
        ('BOTTOMPADDING', (0, 0), (0, 0), 2),
        ('LEFTPADDING',   (0, 0), (0, 0), 0),
        ('RIGHTPADDING',  (0, 0), (0, 0), 0),
    ]))
    story.append(bar_tbl)
    story.append(Spacer(1, 10 * mm))

    # ═══════════════════════════════════════════
    # STATUS BADGE ROW
    # ═══════════════════════════════════════════
    status_label = credential.status.capitalize()
    badge_style = ParagraphStyle(
        'Badge', fontSize=9, textColor=WHITE, fontName='Helvetica-Bold',
        alignment=TA_CENTER, leading=14,
        borderColor=status_color, borderWidth=1, borderRadius=4,
        backColor=status_color, borderPadding=(3, 8, 3, 8),
    )
    badge_p = Paragraph(f'● {status_label}', badge_style)
    badge_data = [
        [
            Paragraph('<b>CREDENTIAL STATUS</b>', _style('BL', fontSize=7, textColor=GREY,
                      fontName='Helvetica-Bold', alignment=TA_LEFT)),
            badge_p,
        ]
    ]
    badge_tbl = Table(badge_data, colWidths=[W * 0.6, W * 0.4])
    badge_tbl.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(badge_tbl)
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
    story.append(Spacer(1, 5 * mm))

    # ═══════════════════════════════════════════
    # MAIN CONTENT — details + QR side by side
    # ═══════════════════════════════════════════
    def _row(label, value, mono=False):
        vs = mono_s if mono else value_s
        return [
            Paragraph(label.upper(), label_s),
            Paragraph(str(value) if value else '—', vs),
        ]

    details_rows = [
        _row('Practitioner Name',    credential.practitioner_name),
        _row('National ID / Passport', credential.practitioner_id),
        _row('Date of Birth',        credential.date_of_birth or '—'),
        _row('Qualification',        credential.qualification),
        _row('Specialization',       credential.specialization or '—'),
        _row('Institution of Study', credential.institution_of_study),
        _row('Year of Graduation',   credential.year_of_graduation),
        _row('License Number',       credential.license_number, mono=True),
        _row('License Expiry Date',  credential.license_expiry_date),
        _row('Issuing Officer',      credential.issued_by.username if credential.issued_by else '—'),
        _row('Date Registered',      credential.created_at.strftime('%d %B %Y') if credential.created_at else '—'),
    ]

    details_tbl = Table(details_rows, colWidths=[45 * mm, W * 0.55 - 45 * mm])
    details_tbl.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
        ('LINEBELOW',     (0, 0), (-1, -2), 0.3, BORDER),
    ]))

    # QR code panel — framed verification box
    TEAL = colors.HexColor('#00D4A8')
    try:
        qr_img = _qr_image(public_url, size_mm=48)
        qr_heading = Paragraph(
            'SCAN TO VERIFY',
            _style('QRHEAD', fontSize=7, textColor=TEAL, fontName='Helvetica-Bold',
                   alignment=TA_CENTER, leading=10, spaceBefore=0, spaceAfter=0)
        )
        qr_lic = Paragraph(
            f'<font name="Courier" size="7">{credential.license_number}</font>',
            _style('QRLIC', fontSize=7, textColor=GREY, alignment=TA_CENTER, leading=10)
        )
        qr_url = Paragraph(
            f'<font size="6" color="#94A3B8">{_base}/verify</font>',
            _style('QRURL', fontSize=6, textColor=GREY, alignment=TA_CENTER, leading=8)
        )
        qr_cell = [
            [qr_heading],
            [Spacer(1, 1.5 * mm)],
            [qr_img],
            [Spacer(1, 1.5 * mm)],
            [qr_lic],
            [qr_url],
        ]
        qr_col_w = W * 0.4
        qr_tbl = Table(qr_cell, colWidths=[qr_col_w])
        qr_tbl.setStyle(TableStyle([
            ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING',    (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING',   (0, 0), (-1, -1), 6),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
            ('BOX',           (0, 0), (-1, -1), 0.8, TEAL),
            ('ROUNDEDCORNERS', [4]),
            ('BACKGROUND',    (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ]))
    except Exception:
        qr_tbl = Paragraph('QR code unavailable', small_s)

    body_data = [[details_tbl, qr_tbl]]
    body_tbl = Table(body_data, colWidths=[W * 0.6, W * 0.4])
    body_tbl.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(body_tbl)
    story.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════
    # BLOCKCHAIN SECTION
    # ═══════════════════════════════════════════
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
    story.append(Spacer(1, 4 * mm))

    bc_label = _style('BCLabel', fontSize=7, textColor=GREY, fontName='Helvetica-Bold',
                      spaceBefore=0, spaceAfter=2)
    bc_val   = _style('BCVal', fontSize=8, textColor=NAVY, fontName='Courier',
                      spaceBefore=0, spaceAfter=0, wordWrap='CJK')

    if credential.blockchain_tx_hash:
        bc_status = Paragraph('✓ Blockchain Verified', _style(
            'BC', fontSize=9, textColor=GREEN, fontName='Helvetica-Bold'))
        bc_rows = [
            [Paragraph('NETWORK', bc_label),
             Paragraph('Ethereum Sepolia Testnet', bc_val)],
            [Paragraph('TRANSACTION HASH', bc_label),
             Paragraph(credential.blockchain_tx_hash, bc_val)],
        ]
        if credential.blockchain_recorded_at:
            bc_rows.append([
                Paragraph('RECORDED AT', bc_label),
                Paragraph(credential.blockchain_recorded_at.strftime('%d %B %Y, %H:%M UTC'), bc_val),
            ])
    else:
        bc_status = Paragraph('⚠ Blockchain Recording Pending', _style(
            'BC', fontSize=9, textColor=AMBER, fontName='Helvetica-Bold'))
        bc_rows = [[Paragraph('STATUS', bc_label),
                    Paragraph('Credential exists in system database; blockchain recording pending.', bc_val)]]

    story.append(bc_status)
    story.append(Spacer(1, 3 * mm))
    bc_tbl = Table(bc_rows, colWidths=[38 * mm, W - 38 * mm])
    bc_tbl.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
        ('BACKGROUND',    (0, 0), (-1, -1), LIGHT),
        ('LINEBELOW',     (0, 0), (-1, -2), 0.3, BORDER),
    ]))
    story.append(bc_tbl)
    story.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════
    # FOOTER
    # ═══════════════════════════════════════════
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
    story.append(Spacer(1, 3 * mm))

    now = datetime.utcnow().strftime('%d %B %Y at %H:%M UTC')
    generated_by = generated_by_user.username if generated_by_user else 'Public Portal'
    footer_data = [[
        Paragraph(
            f'Generated on {now} by {generated_by}',
            _style('FL', fontSize=7.5, textColor=GREY, alignment=TA_LEFT)
        ),
        Paragraph(
            'VerifyDoc Uganda — Blockchain Medical Credential Verification',
            _style('FR', fontSize=7.5, textColor=GREY, alignment=TA_RIGHT)
        ),
    ]]
    footer_tbl = Table(footer_data, colWidths=[W * 0.6, W * 0.4])
    footer_tbl.setStyle(TableStyle([
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(footer_tbl)

    doc.build(story)
    return buf.getvalue()
