from django.contrib import admin

from projects.models import Project, Comment, ProjectDownload


# Register your models here.
class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    inlines = [CommentInline]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['author', 'project', 'created', 'active']
    list_filter = ['active', 'created', 'updated']
    search_fields = ['author__username', 'body']
# projects/admin.py


@admin.register(ProjectDownload)
class ProjectDownloadAdmin(admin.ModelAdmin):
    list_display = ("project", "user", "downloaded_at")# projects/admin.py

