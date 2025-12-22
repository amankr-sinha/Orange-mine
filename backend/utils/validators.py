from __future__ import annotations

from dataclasses import dataclass


ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


@dataclass(frozen=True)
class ValidationError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


def validate_file_extension(filename: str) -> None:
    lower = filename.lower()
    if not any(lower.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise ValidationError(
            "Invalid file type. Please upload a .csv, .xlsx, or .xls file."
        )
