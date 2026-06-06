# Bank-Grade FX Trading Platform Pitch Speaker Notes

## Overall Timing

- Total target: 8-10 minutes.
- Speaker 1: product problem and demo setup, 2 minutes.
- Speaker 2: live frontend demo, 3 minutes.
- Speaker 3: backend, data, and correctness, 2 minutes.
- Speaker 4: DevOps, scalability, and close, 2 minutes.

## Speaker 1 - Product Story

Opening:

"我们做的不是一个汇率查询器，而是一个银行级外汇交易执行平台。客户需要在市场价格不断变化时获得一个可执行报价，并且必须在有限时间内完成下单。银行侧则要保证报价不过期、交易不重复、风控可解释、状态可追踪、审计可回放。"

Key points:

- Demo scenario is 10,000 USD to EUR.
- The core business object is the executable quote, not only the rate.
- Quote TTL protects the bank from stale price execution.
- The platform must show trust: every state transition has an audit record.

Hand off:

"下面我们直接进入 demo，按客户真实交易路径走一遍。"

## Speaker 2 - Frontend Demo

Demo path:

1. Open `http://localhost:3000`.
2. Show dashboard metrics and live market movement.
3. In Trade Execution, keep `Sell USD`, `Buy EUR`, `Amount 10000`.
4. Click `Get Quote`.
5. Point out quote id, locked bid rate, target EUR amount, and 30-second countdown.
6. Click `Submit Trade`.
7. Watch lifecycle cards move through quote locked, risk check, confirmed, settlement, settled.
8. Open `Audit Log` and `Trade Records`.
9. Point to Notification Center.

Talk track:

"这个页面把交易员和客户最关心的内容放在一个工作台里：左侧是银行系统导航，中间是执行报价，右侧是风控状态，下方是生命周期、审计和记录。点击 Get Quote 后，系统锁定一个可执行价格，倒计时结束后无法交易。提交后，状态机自动前进，通知中心和审计日志同步更新。"

Quality callouts:

- Institutional dark dashboard, red primary accent, gold execution highlight.
- Controls are dense and operational, not marketing-style.
- Timeline makes backend state machine visible.

Hand off:

"前端看到的是一个顺滑流程，背后真正保证正确性的是 API 合约、状态机和数据模型。"

## Speaker 3 - Backend And Data

Swagger path:

1. Open `http://localhost:8000/docs`.
2. Show `GET /currencies`.
3. Show `GET /fx-rates`.
4. Show `POST /quotes`.
5. Show `POST /trades` with `Idempotency-Key`.
6. Show `GET /trades/{trade_id}/logs`.

Talk track:

"后端用 FastAPI 实现了清晰的领域边界：FX Service 负责汇率，Quote Service 负责可执行报价和 TTL，Trade Service 负责状态机，Risk Service 负责过期、币种、单笔限额和幂等检查，Notification Service 负责事件推送。"

Technical details:

- All money and rates use `Decimal`.
- Database uses `NUMERIC(20,8)`.
- Invalid state transitions are rejected.
- Duplicate trade submissions use `Idempotency-Key` to return the existing trade.
- `trade_status_logs` records old status, new status, reason, and timestamp.

Data model:

- `currencies`: active currency universe.
- `fx_rates`: bid/ask source snapshots.
- `quotes`: locked rate, amount, target amount, status, expiry.
- `trades`: locked trade record and lifecycle status.
- `trade_status_logs`: auditability.
- `notifications`: customer and operator event feed.

Hand off:

"这些服务现在可以本地用 Docker 跑起来，也可以平滑演进到生产部署。"

## Speaker 4 - DevOps And Roadmap

Talk track:

"交付上，我们提供了 Next.js 前端、FastAPI 后端、PostgreSQL schema、Redis 接入位、WebSocket endpoint 和 Docker Compose。MVP 用内存仓储方便 demo，但 schema 和服务边界已经按生产形态设计。"

Run commands:

```bash
pnpm dev
cd backend && uvicorn app.main:app --reload
docker compose up --build
```

Production roadmap:

- Replace demo rate engine with Bloomberg FXGO, Refinitiv, LSEG, JPM Markets, or Citi Velocity.
- Persist quotes and trades through SQLAlchemy repositories.
- Use Redis for quote TTL and rate cache.
- Use Kafka for trade events.
- Add JWT, account balance, AML, sanctions, and ledger adapters.
- Add CQRS read models for high-volume trade history.
- Add multi-region deployment and SLO-driven observability.

Close:

"这个 demo 的价值在于它不是只把页面画出来，而是把银行外汇交易最关键的正确性机制做出来：报价锁定、TTL、风控、幂等、状态机、审计和通知。"
