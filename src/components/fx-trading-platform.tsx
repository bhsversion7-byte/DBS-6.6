"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Database,
  FileClock,
  Gauge,
  KeyRound,
  Landmark,
  Layers3,
  LockKeyhole,
  RadioTower,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type QuoteStatus = "NONE" | "ACTIVE" | "USED" | "EXPIRED";

type TradeStatus =
  | "CREATED"
  | "QUOTE_LOCKED"
  | "PENDING_RISK_CHECK"
  | "CONFIRMED"
  | "SETTLEMENT_PENDING"
  | "SETTLED";

interface Quote {
  id: string;
  pair: string;
  sellCurrency: string;
  buyCurrency: string;
  amount: number;
  bid: number;
  ask: number;
  lockedRate: number;
  targetAmount: number;
  expiresAt: number;
  status: QuoteStatus;
}

interface Trade {
  id: string;
  pair: string;
  amount: number;
  targetAmount: number;
  lockedRate: number;
  status: TradeStatus;
  riskScore: number;
  createdAt: string;
  settlementAt: string;
}

interface AuditLog {
  at: string;
  from: string;
  to: TradeStatus | QuoteStatus;
  reason: string;
}

const supportedCurrencies = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "Pound Sterling", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
];

const baseRates: Record<string, number> = {
  "USD/EUR": 0.9234,
  "EUR/USD": 1.0829,
  "GBP/USD": 1.2708,
  "USD/JPY": 156.42,
  "USD/CNY": 7.2428,
  "USD/HKD": 7.8121,
  "AUD/USD": 0.6638,
  "USD/CHF": 0.8964,
};

const initialTrades: Trade[] = [
  {
    id: "TRD-20260606-1842",
    pair: "USD/EUR",
    amount: 250000,
    targetAmount: 230862.5,
    lockedRate: 0.92345,
    status: "SETTLED",
    riskScore: 18,
    createdAt: "2026-06-06 09:15:04",
    settlementAt: "2026-06-06 09:16:36",
  },
  {
    id: "TRD-20260606-1837",
    pair: "USD/CNY",
    amount: 80000,
    targetAmount: 579424,
    lockedRate: 7.2428,
    status: "CONFIRMED",
    riskScore: 26,
    createdAt: "2026-06-06 09:03:41",
    settlementAt: "Pending",
  },
  {
    id: "TRD-20260606-1829",
    pair: "GBP/USD",
    amount: 12000,
    targetAmount: 15249.6,
    lockedRate: 1.2708,
    status: "SETTLED",
    riskScore: 12,
    createdAt: "2026-06-06 08:51:18",
    settlementAt: "2026-06-06 08:52:59",
  },
];

const statusSequence: TradeStatus[] = [
  "CREATED",
  "QUOTE_LOCKED",
  "PENDING_RISK_CHECK",
  "CONFIRMED",
  "SETTLEMENT_PENDING",
  "SETTLED",
];

const statusCopy: Record<TradeStatus, string> = {
  CREATED: "Trade created",
  QUOTE_LOCKED: "Quote locked",
  PENDING_RISK_CHECK: "Risk check",
  CONFIRMED: "Confirmed",
  SETTLEMENT_PENDING: "Settlement",
  SETTLED: "Settled",
};

const navigationItems: Array<readonly [LucideIcon, string, string]> = [
  [Activity, "Dashboard", "Live market and controls"],
  [Search, "Quote Search", "Bid ask lookup"],
  [Send, "Trade Execution", "Quote to settlement"],
  [FileClock, "Trade Records", "History and audit"],
  [ShieldCheck, "Risk Center", "Limits and screening"],
  [KeyRound, "User Center", "KYC and API keys"],
];

const metricItems: Array<readonly [string, string, string, LucideIcon]> = [
  ["Live FX TPS", "1,000", "+18 percent capacity headroom", RadioTower],
  ["Concurrent Users", "100K", "Horizontally scalable target", Gauge],
  ["Quote Hit Ratio", "71.4%", "Executable quote conversion", LockKeyhole],
  ["Audit Events", "8,914", "Immutable status transitions", Database],
];

const riskItems: Array<readonly [string, string, string, LucideIcon]> = [
  ["KYC Status", "Verified", "text-emerald-200", ShieldCheck],
  ["Single Trade Limit", "500,000 USD", "text-[#F8E08E]", WalletCards],
  ["Daily Utilization", "41%", "text-white", Gauge],
  ["AML / Sanctions", "Passed", "text-emerald-200", CheckCircle2],
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRate(value: number) {
  return value.toFixed(value > 10 ? 4 : 5);
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function randomId(prefix: string) {
  return `${prefix}-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function FXTradingPlatform() {
  const [sellCurrency, setSellCurrency] = useState("USD");
  const [buyCurrency, setBuyCurrency] = useState("EUR");
  const [amount, setAmount] = useState("10000");
  const [rateTick, setRateTick] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [ttlRemaining, setTtlRemaining] = useState(0);
  const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      at: "09:15:04",
      from: "CREATED",
      to: "QUOTE_LOCKED",
      reason: "Quote TTL accepted, quote_id=QTE-20260606-7712",
    },
    {
      at: "09:15:16",
      from: "PENDING_RISK_CHECK",
      to: "CONFIRMED",
      reason: "Risk score 18, AML and sanctions checks passed",
    },
    {
      at: "09:16:36",
      from: "SETTLEMENT_PENDING",
      to: "SETTLED",
      reason: "Ledger settlement completed and customer notified",
    },
  ]);
  const [notifications, setNotifications] = useState([
    "TRADE_SETTLED: TRD-20260606-1842 completed with audit log",
    "FX_RATE_UPDATE: USD/EUR bid ask refreshed from demo provider",
    "RISK_ALERT: Daily utilization at 41 percent of approved limit",
  ]);

  const pair = `${sellCurrency}/${buyCurrency}`;
  const inversePair = `${buyCurrency}/${sellCurrency}`;
  const baseRate = baseRates[pair] ?? 1 / (baseRates[inversePair] ?? 1);
  const liveRate = baseRate + Math.sin(rateTick / 3) * baseRate * 0.0015;
  const bid = liveRate * 0.9998;
  const ask = liveRate * 1.0002;
  const numericAmount = Number(amount) || 0;

  const marketRows = useMemo(
    () =>
      Object.entries(baseRates).map(([marketPair, rate], index) => {
        const drift = Math.sin((rateTick + index) / 4) * 0.0025;
        const next = rate * (1 + drift);
        return {
          pair: marketPair,
          bid: next * 0.9998,
          ask: next * 1.0002,
          spread: Math.abs(next * 0.0004),
          move: drift * 100,
        };
      }),
    [rateTick],
  );

  const chartData = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => {
        const wave = Math.sin((rateTick + index) / 4) * baseRate * 0.0018;
        const micro = Math.cos((rateTick + index) / 2.5) * baseRate * 0.0005;
        return {
          time: `${index + 1}`,
          bid: Number((baseRate + wave + micro).toFixed(5)),
          ask: Number((baseRate + wave + micro + baseRate * 0.0004).toFixed(5)),
        };
      }),
    [baseRate, rateTick],
  );

  const exposureData = [
    { name: "USD", value: 56, color: "#D32F2F" },
    { name: "EUR", value: 24, color: "#D4AF37" },
    { name: "CNY", value: 13, color: "#2DD4BF" },
    { name: "GBP", value: 7, color: "#60A5FA" },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setRateTick((value) => value + 1), 1400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!quote || quote.status !== "ACTIVE") return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((quote.expiresAt - Date.now()) / 1000));
      setTtlRemaining(remaining);

      if (remaining === 0) {
        setQuote((current) =>
          current && current.status === "ACTIVE"
            ? { ...current, status: "EXPIRED" }
            : current,
        );
        setAuditLogs((logs) => [
          {
            at: nowTime(),
            from: "ACTIVE",
            to: "EXPIRED",
            reason: "Quote TTL reached zero; trade submission is blocked",
          },
          ...logs,
        ]);
        setNotifications((items) => [
          `QUOTE_EXPIRED: ${quote.id} is no longer executable`,
          ...items,
        ]);
        toast.error("Quote expired. Request a fresh quote before trading.");
      }
    }, 300);

    return () => window.clearInterval(timer);
  }, [quote]);

  function createQuote() {
    if (sellCurrency === buyCurrency || numericAmount <= 0) {
      toast.error("Choose two currencies and enter a positive amount.");
      return;
    }

    const nextQuote: Quote = {
      id: randomId("QTE"),
      pair,
      sellCurrency,
      buyCurrency,
      amount: numericAmount,
      bid,
      ask,
      lockedRate: bid,
      targetAmount: numericAmount * bid,
      expiresAt: Date.now() + 30000,
      status: "ACTIVE",
    };

    setQuote(nextQuote);
    setTtlRemaining(30);
    setCurrentTrade(null);
    setAuditLogs((logs) => [
      {
        at: nowTime(),
        from: "NONE",
        to: "ACTIVE",
        reason: `Quote generated from live bid rate ${formatRate(bid)} with 30s TTL`,
      },
      ...logs,
    ]);
    setNotifications((items) => [
      `QUOTE_CREATED: ${nextQuote.id} locks ${nextQuote.pair} for 30 seconds`,
      ...items,
    ]);
    toast.success("Executable quote locked for 30 seconds.");
  }

  function submitTrade() {
    if (!quote || quote.status !== "ACTIVE" || ttlRemaining <= 0) {
      toast.error("No active quote. Request a new quote before submitting.");
      return;
    }

    const trade: Trade = {
      id: randomId("TRD"),
      pair: quote.pair,
      amount: quote.amount,
      targetAmount: quote.targetAmount,
      lockedRate: quote.lockedRate,
      status: "CREATED",
      riskScore: Math.min(88, Math.round(10 + quote.amount / 2500)),
      createdAt: new Date().toLocaleString("en-US", { hour12: false }),
      settlementAt: "Pending",
    };

    setQuote({ ...quote, status: "USED" });
    setCurrentTrade(trade);
    setTrades((rows) => [trade, ...rows]);
    setAuditLogs((logs) => [
      {
        at: nowTime(),
        from: "ACTIVE",
        to: "USED",
        reason: `Idempotency-Key accepted; quote ${quote.id} attached to ${trade.id}`,
      },
      ...logs,
    ]);
    setNotifications((items) => [`TRADE_CREATED: ${trade.id} accepted by API gateway`, ...items]);
    toast.success("Trade submitted. State machine is running.");

    // The demo advances through the same transition contract the backend enforces.
    const transitionPlan: Array<[TradeStatus, string, number]> = [
      ["QUOTE_LOCKED", "Quote ownership verified and rate locked", 800],
      ["PENDING_RISK_CHECK", "Risk engine evaluating limit, AML, sanctions, velocity", 1700],
      ["CONFIRMED", "Risk score passed policy threshold", 2900],
      ["SETTLEMENT_PENDING", "Settlement instruction sent to ledger adapter", 4200],
      ["SETTLED", "Settlement completed and notification emitted", 5600],
    ];

    transitionPlan.forEach(([nextStatus, reason, delay]) => {
      window.setTimeout(() => advanceTrade(trade.id, nextStatus, reason), delay);
    });
  }

  function advanceTrade(tradeId: string, nextStatus: TradeStatus, reason: string) {
    setCurrentTrade((trade) => {
      if (!trade || trade.id !== tradeId) return trade;
      const updated = {
        ...trade,
        status: nextStatus,
        settlementAt:
          nextStatus === "SETTLED"
            ? new Date().toLocaleString("en-US", { hour12: false })
            : trade.settlementAt,
      };
      return updated;
    });

    setTrades((rows) =>
      rows.map((trade) =>
        trade.id === tradeId
          ? {
              ...trade,
              status: nextStatus,
              settlementAt:
                nextStatus === "SETTLED"
                  ? new Date().toLocaleString("en-US", { hour12: false })
                  : trade.settlementAt,
            }
          : trade,
      ),
    );

    const previousIndex = Math.max(0, statusSequence.indexOf(nextStatus) - 1);
    const previousStatus = statusSequence[previousIndex];

    setAuditLogs((logs) => [
      { at: nowTime(), from: previousStatus, to: nextStatus, reason },
      ...logs,
    ]);
    setNotifications((items) => [`TRADE_${nextStatus}: ${tradeId} - ${reason}`, ...items]);
  }

  const activeStatusIndex = currentTrade
    ? statusSequence.indexOf(currentTrade.status)
    : quote?.status === "ACTIVE"
      ? 1
      : -1;

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[264px_1fr]">
        <aside className="border-b border-white/10 bg-[#111820] xl:border-b-0 xl:border-r">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
            <div className="flex size-10 items-center justify-center rounded-md bg-[#D32F2F]">
              <Landmark className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">FX Treasury</p>
              <p className="text-xs text-[#9CA3AF]">Bank-grade MVP Demo</p>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-2 p-4 text-xs xl:grid-cols-1">
            {navigationItems.map(([Icon, label, caption]) => (
              <button
                key={String(label)}
                className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-3 text-left text-white/90 transition hover:border-[#D4AF37]/50 hover:bg-white/[0.06]"
              >
                <Icon className="size-4 text-[#D4AF37]" />
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="block text-[11px] text-[#9CA3AF]">{caption}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-white/10 bg-[#111820]/90 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-[#D32F2F]/40 bg-[#D32F2F]/15 text-[#FCA5A5]">
                    Institutional FX Trading
                  </Badge>
                  <Badge className="border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#F8E08E]">
                    Quote TTL 30s
                  </Badge>
                  <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                    WebSocket simulated
                  </Badge>
                </div>
                <h1 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
                  Bank-Grade Foreign Exchange Trading Platform
                </h1>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <Search className="size-4 text-[#9CA3AF]" />
                <span className="truncate text-xs text-[#9CA3AF]">
                  Search trade ID, currency pair, customer account, or risk alert
                </span>
              </div>
            </div>
          </header>

          <div className="grid gap-4 p-4 md:p-6">
            <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
              {metricItems.map(([label, value, caption, Icon]) => (
                <div
                  key={String(label)}
                  className="rounded-md border border-white/10 bg-[#111820] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#9CA3AF]">{label}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                    </div>
                    <Icon className="size-5 text-[#D4AF37]" />
                  </div>
                  <p className="mt-3 text-xs text-[#9CA3AF]">{caption}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-4 2xl:grid-cols-[1.05fr_1.25fr_0.8fr]">
              <div className="rounded-md border border-white/10 bg-[#111820] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Trade Execution</h2>
                    <p className="text-xs text-[#9CA3AF]">
                      Demo scenario: sell USD, buy EUR, lock quote, submit trade.
                    </p>
                  </div>
                  <Button
                    onClick={createQuote}
                    className="bg-[#D32F2F] text-white hover:bg-[#B71C1C]"
                  >
                    <RefreshCcw className="size-4" />
                    Get Quote
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-2 text-xs text-[#9CA3AF]">
                    Sell
                    <select
                      value={sellCurrency}
                      onChange={(event) => setSellCurrency(event.target.value)}
                      className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
                    >
                      {supportedCurrencies.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs text-[#9CA3AF]">
                    Buy
                    <select
                      value={buyCurrency}
                      onChange={(event) => setBuyCurrency(event.target.value)}
                      className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
                    >
                      {supportedCurrencies.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs text-[#9CA3AF]">
                    Amount
                    <Input
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="h-10 border-white/10 bg-black/30 text-white"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 rounded-md border border-[#D4AF37]/25 bg-[#D4AF37]/5 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-[#9CA3AF]">Currency Pair</p>
                    <p className="mt-1 font-mono text-lg text-[#F8E08E]">{pair}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF]">Live Bid / Ask</p>
                    <p className="mt-1 font-mono text-lg">
                      {formatRate(bid)} / {formatRate(ask)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF]">Spread</p>
                    <p className="mt-1 font-mono text-lg text-emerald-200">
                      {formatRate(ask - bid)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs text-[#9CA3AF]">Executable Quote</p>
                      <p className="mt-1 font-mono text-xl text-white">
                        {quote
                          ? `${quote.id} | ${formatRate(quote.lockedRate)}`
                          : "No active quote"}
                      </p>
                    </div>
                    <div className="min-w-40">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-[#9CA3AF]">TTL</span>
                        <span
                          className={cn(
                            "font-mono",
                            ttlRemaining <= 8 ? "text-[#FCA5A5]" : "text-[#F8E08E]",
                          )}
                        >
                          {quote?.status === "ACTIVE" ? `${ttlRemaining}s` : quote?.status ?? "NONE"}
                        </span>
                      </div>
                      <Progress value={(ttlRemaining / 30) * 100} className="h-2" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-[#9CA3AF]">Sell Amount</p>
                      <p className="font-mono text-lg">
                        {formatMoney(quote?.amount ?? numericAmount)} {sellCurrency}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9CA3AF]">Target Amount</p>
                      <p className="font-mono text-lg text-emerald-200">
                        {formatMoney(quote?.targetAmount ?? numericAmount * bid)} {buyCurrency}
                      </p>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={submitTrade}
                        disabled={!quote || quote.status !== "ACTIVE" || ttlRemaining <= 0}
                        className="w-full bg-[#D4AF37] text-black hover:bg-[#F8E08E]"
                      >
                        <Send className="size-4" />
                        Submit Trade
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-[#111820] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Market Overview</h2>
                    <p className="text-xs text-[#9CA3AF]">Tier 1 pairs refresh every 5 seconds.</p>
                  </div>
                  <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                    Live
                  </Badge>
                </div>

                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D32F2F" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#D32F2F" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#243140" strokeDasharray="3 3" />
                      <XAxis dataKey="time" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                      <YAxis
                        domain={["dataMin", "dataMax"]}
                        tick={{ fill: "#9CA3AF", fontSize: 11 }}
                        width={54}
                      />
                      <ChartTooltip
                        contentStyle={{
                          background: "#111820",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "#fff",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="bid"
                        stroke="#D32F2F"
                        fill="url(#bidGradient)"
                        strokeWidth={2}
                      />
                      <Line type="monotone" dataKey="ask" stroke="#D4AF37" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 overflow-hidden rounded-md border border-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-[#9CA3AF]">Pair</TableHead>
                        <TableHead className="text-right text-[#9CA3AF]">Bid</TableHead>
                        <TableHead className="text-right text-[#9CA3AF]">Ask</TableHead>
                        <TableHead className="text-right text-[#9CA3AF]">Move</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marketRows.slice(0, 5).map((row) => (
                        <TableRow key={row.pair} className="border-white/10">
                          <TableCell className="font-mono text-white">{row.pair}</TableCell>
                          <TableCell className="text-right font-mono">{formatRate(row.bid)}</TableCell>
                          <TableCell className="text-right font-mono">{formatRate(row.ask)}</TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-mono",
                              row.move >= 0 ? "text-emerald-200" : "text-[#FCA5A5]",
                            )}
                          >
                            {row.move >= 0 ? "+" : ""}
                            {row.move.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-[#111820] p-4">
                <h2 className="text-base font-semibold">Risk and Customer</h2>
                <p className="text-xs text-[#9CA3AF]">KYC, limits, and screening are visible to operators.</p>

                <div className="mt-4 grid gap-3">
                  {riskItems.map(([label, value, color, Icon]) => (
                    <div
                      key={String(label)}
                      className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="size-4 text-[#D4AF37]" />
                        <span className="text-xs text-[#9CA3AF]">{label}</span>
                      </div>
                      <span className={cn("text-sm font-medium", String(color))}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={exposureData}>
                      <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                      <YAxis hide />
                      <ChartTooltip
                        contentStyle={{
                          background: "#111820",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {exposureData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-md border border-[#D32F2F]/30 bg-[#D32F2F]/10 p-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-4 text-[#FCA5A5]" />
                    <p className="text-xs text-[#FCA5A5]">
                      Demo policy rejects expired quotes and duplicate submissions through
                      Idempotency-Key.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 2xl:grid-cols-[1.3fr_1fr]">
              <div className="rounded-md border border-white/10 bg-[#111820] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Trade Lifecycle</h2>
                    <p className="text-xs text-[#9CA3AF]">
                      Invalid transitions are blocked by the backend state machine.
                    </p>
                  </div>
                  <Badge className="border-white/15 bg-white/5 text-white">
                    {currentTrade?.status ?? "Ready"}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-6">
                  {statusSequence.map((status, index) => {
                    const isDone = index <= activeStatusIndex;
                    const isActive = index === activeStatusIndex;
                    return (
                      <div
                        key={status}
                        className={cn(
                          "min-h-28 rounded-md border p-3",
                          isActive
                            ? "border-[#D4AF37] bg-[#D4AF37]/10"
                            : isDone
                              ? "border-emerald-400/30 bg-emerald-400/10"
                              : "border-white/10 bg-black/20",
                        )}
                      >
                        <div
                          className={cn(
                            "mb-3 flex size-8 items-center justify-center rounded-full",
                            isDone ? "bg-emerald-400/20 text-emerald-100" : "bg-white/5 text-[#9CA3AF]",
                          )}
                        >
                          {isDone ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}
                        </div>
                        <p className="text-sm font-medium">{statusCopy[status]}</p>
                        <p className="mt-1 break-words font-mono text-[11px] text-[#9CA3AF]">{status}</p>
                      </div>
                    );
                  })}
                </div>

                <Tabs defaultValue="records" className="mt-5">
                  <TabsList className="border border-white/10 bg-black/20">
                    <TabsTrigger value="records">Trade Records</TabsTrigger>
                    <TabsTrigger value="audit">Audit Log</TabsTrigger>
                    <TabsTrigger value="architecture">Architecture</TabsTrigger>
                  </TabsList>
                  <TabsContent value="records" className="mt-4">
                    <div className="overflow-hidden rounded-md border border-white/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-[#9CA3AF]">Trade ID</TableHead>
                            <TableHead className="text-[#9CA3AF]">Pair</TableHead>
                            <TableHead className="text-right text-[#9CA3AF]">Amount</TableHead>
                            <TableHead className="text-right text-[#9CA3AF]">Rate</TableHead>
                            <TableHead className="text-[#9CA3AF]">Status</TableHead>
                            <TableHead className="text-[#9CA3AF]">Settlement</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trades.map((trade) => (
                            <TableRow key={trade.id} className="border-white/10">
                              <TableCell className="font-mono text-xs">{trade.id}</TableCell>
                              <TableCell className="font-mono">{trade.pair}</TableCell>
                              <TableCell className="text-right font-mono">
                                {formatMoney(trade.amount)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatRate(trade.lockedRate)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={cn(
                                    "border-white/10 bg-white/5",
                                    trade.status === "SETTLED"
                                      ? "text-emerald-200"
                                      : "text-[#F8E08E]",
                                  )}
                                >
                                  {trade.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-[#9CA3AF]">
                                {trade.settlementAt}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  <TabsContent value="audit" className="mt-4">
                    <div className="grid gap-2">
                      {auditLogs.slice(0, 7).map((log, index) => (
                        <div
                          key={`${log.at}-${index}`}
                          className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 md:grid-cols-[86px_220px_1fr]"
                        >
                          <span className="font-mono text-xs text-[#9CA3AF]">{log.at}</span>
                          <span className="font-mono text-xs text-[#F8E08E]">
                            {log.from}
                            {" -> "}
                            {log.to}
                          </span>
                          <span className="text-xs text-white/85">{log.reason}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="architecture" className="mt-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      {[
                        ["Frontend", "Next.js, TypeScript, Tailwind, shadcn/ui, charts"],
                        ["API Gateway", "JWT, idempotency, validation, Swagger contract"],
                        ["Domain Services", "FX, Quote, Trade, Risk, Notification services"],
                        ["Data Layer", "PostgreSQL for source of truth, Redis for TTL and events"],
                      ].map(([title, body]) => (
                        <div key={title} className="rounded-md border border-white/10 bg-black/20 p-3">
                          <Layers3 className="mb-3 size-4 text-[#D4AF37]" />
                          <p className="text-sm font-medium">{title}</p>
                          <p className="mt-2 text-xs text-[#9CA3AF]">{body}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="rounded-md border border-white/10 bg-[#111820] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Notification Center</h2>
                    <p className="text-xs text-[#9CA3AF]">
                      Event bus to WebSocket to customer UI.
                    </p>
                  </div>
                  <Bell className="size-5 text-[#D4AF37]" />
                </div>

                <div className="grid max-h-[520px] gap-2 overflow-auto pr-1">
                  {notifications.slice(0, 12).map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-md border border-white/10 bg-black/20 p-3"
                    >
                      <p className="break-words font-mono text-xs text-white/90">{item}</p>
                      <p className="mt-2 text-[11px] text-[#9CA3AF]">
                        WebSocket channel: /ws/fx-rates and trade-events
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
