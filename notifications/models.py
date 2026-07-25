from django.db import models
from django.db import models
from django.contrib.auth import get_user_model

# Create your models here.
User = get_user_model()


class Notification(models.Model):
    class Type(models.TextChoices):
        COMMENT_APPROVED = "CA", "کامنت تأیید شد"
        COMMENT_REJECTED = "CR", "کامنت رد شد"
        PROJECT_DOWNLOADED = "PD", "پروژه دانلود شد"

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=2, choices=Type.choices)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient.username} - {self.get_type_display()}"
