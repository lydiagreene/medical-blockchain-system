from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_customuser_totp'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='totp_backup_codes',
            field=models.TextField(
                blank=True, null=True,
                help_text='JSON array of hashed one-time backup codes',
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='failed_login_attempts',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='customuser',
            name='locked_until',
            field=models.DateTimeField(
                blank=True, null=True,
                help_text='Account locked until this datetime after repeated failures',
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='email_verified',
            field=models.BooleanField(
                default=False,
                help_text='Whether the user has verified their email address',
            ),
        ),
    ]
