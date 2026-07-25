from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import Notification


@shared_task
def send_comment_notification(recipient_id, comment_id, status):
    from django.contrib.auth import get_user_model
    from projects.models import Comment

    User = get_user_model()
    try:
        recipient = User.objects.get(id=recipient_id)
        comment = Comment.objects.get(id=comment_id)

        if status == "AP":
            msg = f"کامنت شما روی پروژه «{comment.project.title}» تأیید شد."
            notif_type = Notification.Type.COMMENT_APPROVED
        else:
            msg = f"کامنت شما روی پروژه «{comment.project.title}» رد شد."
            notif_type = Notification.Type.COMMENT_REJECTED

        # ذخیره در دیتابیس
        Notification.objects.create(
            recipient=recipient,
            type=notif_type,
            message=msg,
        )

        # ارسال ایمیل
        if recipient.email:
            send_mail(
                subject="SkillSphere — " + msg,
                message=msg,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                fail_silently=True,
            )
    except Exception:
        pass


@shared_task
def send_download_notification(project_id, downloader_id):
    from django.contrib.auth import get_user_model
    from projects.models import Project

    User = get_user_model()
    try:
        project = Project.objects.get(id=project_id)
        downloader = User.objects.get(id=downloader_id)

        if project.author == downloader:
            return  # خود صاحب پروژه دانلود کرده

        msg = f"کاربر «{downloader.username}» پروژه «{project.title}» شما را دانلود کرد."

        Notification.objects.create(
            recipient=project.author,
            type=Notification.Type.PROJECT_DOWNLOADED,
            message=msg,
        )

        if project.author.email:
            send_mail(
                subject="SkillSphere — " + msg,
                message=msg,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[project.author.email],
                fail_silently=True,
            )
    except Exception:
        pass
