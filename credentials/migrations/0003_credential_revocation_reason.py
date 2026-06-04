from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('credentials', '0002_credential_last_renewed_at_credential_renewal_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='credential',
            name='revocation_reason',
            field=models.CharField(
                blank=True,
                help_text='Reason provided when the credential was revoked',
                max_length=500,
                null=True,
            ),
        ),
    ]
