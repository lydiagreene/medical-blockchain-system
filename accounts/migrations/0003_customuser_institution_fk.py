from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_audit_log'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='institution',
            field=models.ForeignKey(
                blank=True,
                help_text='Registered institution this user belongs to',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='members',
                to='accounts.institution',
            ),
        ),
    ]
