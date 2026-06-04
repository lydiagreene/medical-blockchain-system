from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_customuser_institution_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='totp_secret',
            field=models.CharField(
                blank=True, null=True, max_length=64,
                help_text='Base32 TOTP secret for authenticator apps',
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='totp_enabled',
            field=models.BooleanField(
                default=False,
                help_text='Whether the user has completed 2FA setup',
            ),
        ),
    ]
