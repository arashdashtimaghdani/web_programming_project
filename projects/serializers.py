from rest_framework import serializers
from .models import Comment, Project


class CommentProjectOwnerSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source="author.username")
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "project",
            "body",
            "author",
            "author_username",
            "status",
            "status_display",
            "created",
        ]
        read_only_fields = ["id", "body", "author", "author_username", "created"]

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


class ProjectSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    file = serializers.FileField()
    file_url = serializers.SerializerMethodField(read_only=True)

    def validate_file(self, value):
        max_size = 10 * 1024 * 1024  # 10 MB
        if value and value.size > max_size:
            raise serializers.ValidationError("حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.")
        return value

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    class Meta:
        model = Project
        fields = ['id', 'title', 'file','file_url', 'slug', 'description', 'author', 'author_username', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author','file_url', 'created_at', 'updated_at']
