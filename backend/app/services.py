from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID, uuid4

from fastapi import HTTPException

from .schemas import (
    Currency,
    FxRate,
    Notification,
    Quote,
    QuoteStatus,
    Trade,
    TradeStatus,
    TradeStatusLog,
)


DEMO_USER_ID = UUID("11111111-1111-4111-8111-111111111111")
QUOTE_TTL_SECONDS = 30
SUPPORTED_CURRENCIES = [
    Currency(currency_code="USD", currency_name="US Dollar", symbol="$"),
    Currency(currency_code="EUR", currency_name="Euro", symbol="€"),
    Currency(currency_code="GBP", currency_name="Pound Sterling", symbol="£"),
    Currency(currency_code="JPY", currency_name="Japanese Yen", symbol="¥"),
    Currency(currency_code="AUD", currency_name="Australian Dollar", symbol="A$"),
    Currency(currency_code="CAD", currency_name="Canadian Dollar", symbol="C$"),
    Currency(currency_code="CHF", currency_name="Swiss Franc", symbol="CHF"),
    Currency(currency_code="HKD", currency_name="Hong Kong Dollar", symbol="HK$"),
    Currency(currency_code="SGD", currency_name="Singapore Dollar", symbol="S$"),
    Currency(currency_code="CNY", currency_name="Chinese Yuan", symbol="¥"),
]

BASE_RATES: dict[str, Decimal] = {
    "USD/EUR": Decimal("0.9234"),
    "EUR/USD": Decimal("1.0829"),
    "GBP/USD": Decimal("1.2708"),
    "USD/JPY": Decimal("156.4200"),
    "USD/CNY": Decimal("7.2428"),
    "USD/HKD": Decimal("7.8121"),
    "AUD/USD": Decimal("0.6638"),
    "USD/CHF": Decimal("0.8964"),
}

VALID_TRANSITIONS: dict[TradeStatus, set[TradeStatus]] = {
    TradeStatus.CREATED: {TradeStatus.QUOTE_LOCKED, TradeStatus.EXPIRED},
    TradeStatus.QUOTE_LOCKED: {TradeStatus.PENDING_RISK_CHECK, TradeStatus.EXPIRED},
    TradeStatus.PENDING_RISK_CHECK: {TradeStatus.CONFIRMED, TradeStatus.REJECTED, TradeStatus.FAILED},
    TradeStatus.CONFIRMED: {TradeStatus.SETTLEMENT_PENDING, TradeStatus.CANCELLED},
    TradeStatus.SETTLEMENT_PENDING: {TradeStatus.SETTLED, TradeStatus.FAILED},
    TradeStatus.SETTLED: set(),
    TradeStatus.FAILED: set(),
    TradeStatus.REJECTED: set(),
    TradeStatus.CANCELLED: set(),
    TradeStatus.EXPIRED: set(),
}


class InMemoryRepository:
    """Thread-local demo repository; swap this with SQLAlchemy repositories in production."""

    def __init__(self) -> None:
        self.quotes: dict[str, Quote] = {}
        self.trades: dict[str, Trade] = {}
        self.logs: list[TradeStatusLog] = []
        self.notifications: list[Notification] = []
        self.idempotency_keys: dict[str, str] = {}


repo = InMemoryRepository()


def utcnow() -> datetime:
    return datetime.now(UTC)


def money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.00000001"), rounding=ROUND_HALF_UP)


def validate_currency_pair(from_currency: str, to_currency: str) -> None:
    supported = {item.currency_code for item in SUPPORTED_CURRENCIES}
    if from_currency == to_currency:
        raise HTTPException(status_code=400, detail="from_currency and to_currency must differ")
    if from_currency not in supported or to_currency not in supported:
        raise HTTPException(status_code=400, detail="unsupported currency")


def resolve_rate(from_currency: str, to_currency: str) -> FxRate:
    pair = f"{from_currency}/{to_currency}"
    inverse_pair = f"{to_currency}/{from_currency}"
    if pair in BASE_RATES:
        mid = BASE_RATES[pair]
    elif inverse_pair in BASE_RATES:
        mid = Decimal("1") / BASE_RATES[inverse_pair]
    else:
        raise HTTPException(status_code=404, detail="currency pair is not available in demo provider")

    spread = money(mid * Decimal("0.0004"))
    return FxRate(
        pair=pair,
        base_currency=from_currency,
        quote_currency=to_currency,
        mid_rate=money(mid),
        bid_rate=money(mid - spread / 2),
        ask_rate=money(mid + spread / 2),
        spread=spread,
        timestamp=utcnow(),
    )


def expire_quote_if_needed(quote: Quote) -> Quote:
    if quote.status == QuoteStatus.ACTIVE and quote.expires_at <= utcnow():
        quote.status = QuoteStatus.EXPIRED
        repo.quotes[quote.quote_id] = quote
    return quote


def create_quote(from_currency: str, to_currency: str, amount: Decimal) -> Quote:
    validate_currency_pair(from_currency, to_currency)
    rate = resolve_rate(from_currency, to_currency)
    quote = Quote(
        id=uuid4(),
        quote_id=f"QTE-{utcnow().strftime('%Y%m%d')}-{str(uuid4())[:8].upper()}",
        user_id=DEMO_USER_ID,
        from_currency=from_currency,
        to_currency=to_currency,
        amount=money(amount),
        rate=rate.bid_rate,
        target_amount=money(amount * rate.bid_rate),
        status=QuoteStatus.ACTIVE,
        expires_at=utcnow() + timedelta(seconds=QUOTE_TTL_SECONDS),
        created_at=utcnow(),
    )
    repo.quotes[quote.quote_id] = quote
    emit_notification(f"QUOTE_CREATED: {quote.quote_id} locks {quote.from_currency}/{quote.to_currency}")
    return quote


def get_quote(quote_id: str) -> Quote:
    quote = repo.quotes.get(quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="quote not found")
    return expire_quote_if_needed(quote)


def compute_risk_score(quote: Quote) -> int:
    amount_component = min(60, int(quote.amount / Decimal("10000")))
    pair_component = 8 if quote.to_currency in {"CNY", "HKD"} else 4
    return min(99, 10 + amount_component + pair_component)


def run_risk_checks(quote: Quote) -> None:
    if quote.status != QuoteStatus.ACTIVE:
        raise HTTPException(status_code=409, detail=f"quote is {quote.status}")
    if quote.expires_at <= utcnow():
        quote.status = QuoteStatus.EXPIRED
        raise HTTPException(status_code=409, detail="quote expired")
    if quote.amount > Decimal("500000"):
        raise HTTPException(status_code=422, detail="single trade limit exceeded")


def create_trade(quote_id: str, idempotency_key: str | None) -> Trade:
    if idempotency_key and idempotency_key in repo.idempotency_keys:
        return repo.trades[repo.idempotency_keys[idempotency_key]]

    quote = get_quote(quote_id)
    run_risk_checks(quote)
    quote.status = QuoteStatus.USED

    trade = Trade(
        id=uuid4(),
        trade_id=f"TRD-{utcnow().strftime('%Y%m%d')}-{str(uuid4())[:8].upper()}",
        quote_id=quote.id,
        user_id=quote.user_id,
        pair=f"{quote.from_currency}/{quote.to_currency}",
        from_currency=quote.from_currency,
        to_currency=quote.to_currency,
        amount=quote.amount,
        target_amount=quote.target_amount,
        locked_rate=quote.rate,
        status=TradeStatus.CREATED,
        risk_score=compute_risk_score(quote),
        created_at=utcnow(),
    )
    repo.trades[trade.trade_id] = trade
    if idempotency_key:
        repo.idempotency_keys[idempotency_key] = trade.trade_id

    append_log(trade, None, TradeStatus.CREATED, "Trade request accepted by API Gateway")
    transition_trade(trade.trade_id, TradeStatus.QUOTE_LOCKED, "Quote attached and locked")
    transition_trade(trade.trade_id, TradeStatus.PENDING_RISK_CHECK, "Risk engine started")
    transition_trade(trade.trade_id, TradeStatus.CONFIRMED, "Risk score passed policy threshold")
    transition_trade(trade.trade_id, TradeStatus.SETTLEMENT_PENDING, "Settlement instruction created")
    transition_trade(trade.trade_id, TradeStatus.SETTLED, "Ledger settlement completed")
    return repo.trades[trade.trade_id]


def append_log(
    trade: Trade,
    old_status: TradeStatus | None,
    new_status: TradeStatus,
    reason: str,
) -> None:
    repo.logs.append(
        TradeStatusLog(
            trade_id=trade.id,
            old_status=old_status,
            new_status=new_status,
            reason=reason,
            created_at=utcnow(),
        )
    )
    emit_notification(f"TRADE_{new_status}: {trade.trade_id} - {reason}", trade.id)


def transition_trade(trade_id: str, next_status: TradeStatus, reason: str) -> Trade:
    trade = repo.trades.get(trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="trade not found")
    if next_status not in VALID_TRANSITIONS[trade.status]:
        raise HTTPException(
            status_code=409,
            detail=f"invalid transition {trade.status} -> {next_status}",
        )

    old_status = trade.status
    trade.status = next_status
    if next_status == TradeStatus.CONFIRMED:
        trade.confirmed_at = utcnow()
    if next_status == TradeStatus.SETTLED:
        trade.settled_at = utcnow()
    repo.trades[trade.trade_id] = trade
    append_log(trade, old_status, next_status, reason)
    return trade


def emit_notification(message: str, trade_id: UUID | None = None) -> None:
    repo.notifications.insert(
        0,
        Notification(
            user_id=DEMO_USER_ID,
            trade_id=trade_id,
            message=message,
            created_at=utcnow(),
        ),
    )
