"""统一错误定义"""
from dataclasses import dataclass


@dataclass
class AppError(Exception):
    """带错误码的业务异常"""
    code: str
    message: str

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


def format_error(code: str, message: str) -> dict:
    """标准化 HTTP detail"""
    return {"code": code, "message": message}

