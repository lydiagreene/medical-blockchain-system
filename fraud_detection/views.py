"""
fraud_detection/views.py
Admin-only fraud detection analytics dashboard.
"""

import json
import logging
from datetime import timedelta

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.db.models import Count, Avg
from django.db.models.functions import TruncDate

logger = logging.getLogger(__name__)


def _flags_by_day(days=30):
    """Returns (labels, data) for suspicious flags per day over last N days."""
    from credentials.models import VerificationLog
    start = timezone.now().date() - timedelta(days=days - 1)
    rows = (
        VerificationLog.objects
        .filter(flagged_as_suspicious=True, timestamp__date__gte=start)
        .annotate(day=TruncDate('timestamp'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )
    counts = {r['day']: r['count'] for r in rows}
    labels, data = [], []
    for i in range(days):
        d = start + timedelta(days=i)
        labels.append(d.strftime('%d %b'))
        data.append(counts.get(d, 0))
    return labels, data


@login_required
def fraud_dashboard_view(request):
    if not (request.user.is_superuser or request.user.role == 'ADMIN'):
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    from credentials.models import VerificationLog

    today = timezone.now().date()
    suspicious = VerificationLog.objects.filter(flagged_as_suspicious=True)

    total_flags   = suspicious.count()
    today_flags   = suspicious.filter(timestamp__date=today).count()
    high_risk     = suspicious.filter(fraud_score__gte=0.7).count()
    avg_score_val = (
        VerificationLog.objects
        .filter(fraud_score__isnull=False)
        .aggregate(avg=Avg('fraud_score'))['avg'] or 0.0
    )

    recent = (
        suspicious
        .select_related('verified_by', 'credential')
        .order_by('-timestamp')[:50]
    )

    top_flagged = (
        suspicious
        .values('queried_credential_id')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    # Hour-of-day distribution of suspicious attempts
    hour_counts = [0] * 24
    for log in suspicious.values('timestamp'):
        hour_counts[log['timestamp'].hour] += 1

    flags_labels, flags_data = _flags_by_day(30)

    context = {
        'total_flags':  total_flags,
        'today_flags':  today_flags,
        'high_risk':    high_risk,
        'avg_score':    round(avg_score_val * 100, 1),
        'recent':       recent,
        'top_flagged':  top_flagged,
        'flags_labels': json.dumps(flags_labels),
        'flags_data':   json.dumps(flags_data),
        'hour_labels':  json.dumps([f'{h:02d}:00' for h in range(24)]),
        'hour_data':    json.dumps(hour_counts),
    }
    return render(request, 'admin/fraud_dashboard.html', context)
