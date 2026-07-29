from django.contrib.auth.models import User
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import Profile
from .utils import generate_image_token
from django.urls import reverse

# بعد
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        validators=[UniqueValidator(
            queryset=User.objects.all(),
            message="این نام کاربری قبلاً ثبت شده است."
        )]
    )
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["username", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"]
        )
        return user


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    profile_image_url = serializers.SerializerMethodField(read_only=True, required=False)
    profile_image = serializers.ImageField(write_only=True)

    # این فیلد اصلی برای آپلود فایل است (ورودی/خروجی)
    # با write_only=True می‌توانید کاری کنید که در خروجی JSON نیاید (چون url را دارید

    class Meta:
        model = Profile
        fields = [
            'id',
            'username',
            'email',
            'university',
            'bio',
            'profile_image_url',
            'profile_image'
        ]
        read_only_fields = ['id', 'email', 'username', 'created_at', 'updated_at']

    def get_profile_image_url(self, obj):
        token = generate_image_token(obj.id)

        request = self.context.get("request")

        url = reverse(
            "secure_profile_image",
            kwargs={"token": token}
        )

        return request.build_absolute_uri(url)
