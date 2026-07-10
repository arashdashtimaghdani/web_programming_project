from django.core import signing


def generate_file_token(project_id):
    return signing.dumps({"project_id": project_id}, salt="project-file")


def verify_file_token(token, max_age=3600):
    return signing.loads(token, salt="project-file", max_age=max_age)
