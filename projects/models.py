from django.db import models
from django.conf import settings
from django.utils.text import slugify
import uuid


class PublicManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(
            visibility=self.model.Visibility.PUBLIC
        )


class Project(models.Model):
    class Visibility(models.TextChoices):
        PRIVATE = 'PR', 'Private'
        PUBLIC = 'PB', 'Public'

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='projects'
    )
    title = models.CharField(max_length=250)

    # اگر API با id کار می‌کند، این معمولاً بهتر از unique_for_date است:
    slug = models.SlugField(max_length=250, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)

        super().save(*args, **kwargs)

    visibility = models.CharField(
        max_length=2,
        choices=Visibility.choices,
        default=Visibility.PRIVATE,
    )

    description = models.TextField()
    file = models.FileField(upload_to='projects/files/%Y/%m/%d/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = models.Manager()
    public = PublicManager()

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['-created_at'])]

    def __str__(self):
        return self.title


class Comment(models.Model):

    class Status(models.TextChoices):
        PENDING = "PD", "در انتظار بررسی"
        APPROVED = "AP", "تأیید شده"
        REJECTED = "RJ", "رد شده"

    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        related_name="comments",
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_comments",
    )

    body = models.TextField()

    status = models.CharField(
        max_length=2,
        choices=Status.choices,
        default=Status.PENDING,
    )

    active = models.BooleanField(default=True)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created"]
        indexes = [
            models.Index(fields=["created"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Comment by {self.author} on {self.project}"
