from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel, Field

T = TypeVar("T")

class PageParams(BaseModel):
    page: int = Field(1, ge=1, description="Page number starting at 1")
    page_size: int = Field(25, ge=1, le=500, description="Items per page (max 500)")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool

def create_paginated_response(
    items: List[T],
    total: int,
    page: int,
    page_size: int
) -> PaginatedResponse[T]:
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )
