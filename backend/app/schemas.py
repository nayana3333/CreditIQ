from datetime import datetime


def parse_iso_date(value: str):
    if not value:
        return None
    return datetime.fromisoformat(value).date()
