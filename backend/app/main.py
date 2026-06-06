import asyncio
from decimal import Decimal

from fastapi import FastAPI, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .schemas import CreateQuoteRequest, CreateTradeRequest
from .services import (
    SUPPORTED_CURRENCIES,
    create_quote,
    create_trade,
    get_quote,
    repo,
    resolve_rate,
)

app = FastAPI(
    title="Bank-Grade FX Trading Platform API",
    version="1.0.0",
    description=(
        "MVP API for supported currencies, executable quotes, idempotent trade "
        "submission, status logs, notifications, and FX WebSocket updates."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/currencies")
def list_currencies():
    return SUPPORTED_CURRENCIES


@app.get("/fx-rates")
def list_fx_rates():
    pairs = ["USD/EUR", "EUR/USD", "GBP/USD", "USD/JPY", "USD/CNY", "USD/HKD"]
    return [resolve_rate(*pair.split("/")) for pair in pairs]


@app.get("/fx-rates/{from_currency}/{to_currency}")
def get_fx_rate(from_currency: str, to_currency: str):
    return resolve_rate(from_currency.upper(), to_currency.upper())


@app.post("/quotes")
def post_quote(payload: CreateQuoteRequest):
    return create_quote(
        payload.from_currency.upper(),
        payload.to_currency.upper(),
        Decimal(payload.amount),
    )


@app.get("/quotes/{quote_id}")
def fetch_quote(quote_id: str):
    return get_quote(quote_id)


@app.post("/trades")
def post_trade(
    payload: CreateTradeRequest,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    return create_trade(payload.quote_id, idempotency_key)


@app.get("/trades")
def list_trades():
    return list(repo.trades.values())


@app.get("/trades/{trade_id}")
def get_trade(trade_id: str):
    return repo.trades[trade_id]


@app.get("/trades/{trade_id}/logs")
def get_trade_logs(trade_id: str):
    trade = repo.trades[trade_id]
    return [item for item in repo.logs if item.trade_id == trade.id]


@app.get("/notifications")
def list_notifications():
    return repo.notifications


@app.websocket("/ws/fx-rates")
async def websocket_fx_rates(websocket: WebSocket):
    await websocket.accept()
    tick = Decimal("0")
    try:
        while True:
            rate = resolve_rate("USD", "EUR")
            # This is a deterministic pulse so demo screens show visible movement.
            pulse = Decimal("1") + (tick % Decimal("7")) * Decimal("0.0001")
            await websocket.send_json(
                {
                    "pair": "USD/EUR",
                    "bid": str(rate.bid_rate * pulse),
                    "ask": str(rate.ask_rate * pulse),
                    "timestamp": rate.timestamp.isoformat(),
                }
            )
            tick += Decimal("1")
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return
