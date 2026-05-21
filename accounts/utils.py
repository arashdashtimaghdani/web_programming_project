from django.core.signing import TimestampSigner, BadSignature, SignatureExpired

signer = TimestampSigner()


def generate_image_token(profile_id):
    return signer.sign(profile_id)


def verify_image_token(token, max_age=3600):
    try:
        profile_id = signer.unsign(token, max_age=max_age)
        return profile_id
    except (BadSignature, SignatureExpired):
        return None
