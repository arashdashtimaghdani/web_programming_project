import uuid

from django.db import models
from django.contrib.auth.models import User


# Create your models here.
def user_profile_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f'profiles/{filename}'


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True)
    profile_image = models.ImageField(upload_to=user_profile_path, blank=True)
    university = models.CharField(max_length=200, blank=True)