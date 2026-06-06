from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class QuoteStatus(StrEnum):
    ACTIVE = "ACTIVE"
    USED = "USED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class TradeStatus(StrEnum):
    CREATED = "CREATED"
    QUOTE_LOCKED = "QUOTE_LOCKED"
    PENDING_RISK_CHECK = "PENDING_RISK_CHECK"
    CONFIRMED = "CONFIRMED"
    SETTLEMENT_PENDING = "SETTLEMENT_PENDING"
    SETTLED = "SETTLED"
    FAILED = "FAILED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class Currency(BaseModel):
    currency_code: str
    currency_name: str
    symbol: str
    is_active: bool = True


class FxRate(BaseModel):
    pair: str
    base_currency: str
    quote_currency: str
    mid_rate: Decimal
    bid_rate: Decimal
    ask_rate: Decimal
    spread: Decimal
    source: str = "demo-rate-engine"
    timestamp: datetime


class CreateQuoteRequest(BaseModel):
    from_currency: str = Field(min_length=3, max_length=3)
    to_currency: str = Field(min_length=3, max_length=3)
    amount: Decimal = Field(gt=0)


class Quote(BaseModel):
    id: UUID
    quote_id: str
    user_id: UUID
    from_currency: str
    to_currency: str
    amount: Decimal
    rate: Decimal
    target_amount: Decimal
    status: QuoteStatus
    expires_at: datetime
    created_at: datetime


class CreateTradeRequest(BaseModel):
    quote_id: str


class Trade(BaseModel):
    id: UUID
    trade_id: str
    quote_id: UUID
    user_id: UUID
    pair: str
    from_currency: str
    to_currency: str
    amount: Decimal
    target_amount: Decimal
    locked_rate: Decimal
    status: TradeStatus
    risk_score: int
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    settled_at: Optional[datetime] = None


class TradeStatusLog(BaseModel):
    trade_id: UUID
    old_status: Optional[TradeStatus]
    new_status: TradeStatus
    reason: str
    created_at: datetime


class Notification(BaseModel):
    user_id: UUID
    trade_id: Optional[UUID] = None
    message: str
    channel: str = "websocket"
    is_read: bool = False
    created_at: datetime
