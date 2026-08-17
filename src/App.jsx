import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Falha ao registrar o Service Worker:', error);
    });
  });
}

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home,
  History,
  BarChart3,
  Activity,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Inbox,
  Check,
  Search,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react";

/* ---------------------------------------------------------
   TOKENS — paleta e escala tipográfica do Controle Financeiro
--------------------------------------------------------- */
const C = {
  canvas: "#EAEAE6",       // fundo do "desktop"
  bg: "#F7F6F3",           // fundo geral do app
  card: "#FFFFFF",
  ink: "#15171B",          // texto principal
  inkSoft: "#8B8E96",      // texto secundário
  inkFaint: "#B8BAC0",     // texto terciário / inativo
  line: "#EDECE8",
  lineStrong: "#E3E2DD",
  green: "#1E9E5A",
  greenSoft: "rgba(30,158,90,0.10)",
  red: "#E14B4B",
  redSoft: "rgba(225,75,75,0.10)",
  amber: "#B5730E",
  amberBg: "#FBF3E7",
  amberLine: "#F0DFC2",
};

// Escala de espaçamento — evita valores arbitrários espalhados pelos componentes.
const SPACE = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 };

// Raios padronizados por categoria de elemento.
const RADIUS = { input: 13, button: 15, card: 18, sheet: 24, pill: 999 };

// Sombras discretas — usadas com moderação, priorizando hierarquia e espaçamento.
const SHADOW = {
  card: "0 12px 26px -16px rgba(20,20,24,0.28)",
  fab: "0 8px 18px -6px rgba(21,23,27,0.32)",
  sheet: "0 -8px 30px -12px rgba(20,20,24,0.18)",
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, 'Helvetica Neue', Arial, sans-serif";

function formatBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDatePt(d) {
  const s = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  return s;
}

/* ---------------------------------------------------------
   DATA — utilidades com fuso America/Sao_Paulo
--------------------------------------------------------- */
const TIME_ZONE = "America/Sao_Paulo";

// Retorna 'YYYY-MM-DD' referente a agora, no fuso de São Paulo.
function todayISOInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = {};
  parts.forEach((p) => (map[p.type] = p.value));
  return `${map.year}-${map.month}-${map.day}`;
}

// 'YYYY-MM-DD' -> 'DD/MM/AAAA'
function isoToDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// 'YYYY-MM-DD' -> 'YYYY-MM'
function isoToMonthKey(iso) {
  return iso ? iso.slice(0, 7) : "";
}

function addDaysISO(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Rótulo relativo compacto para itens da lista: Hoje / Ontem / DD/MM
function relativeDateLabel(iso, todayIso) {
  if (iso === todayIso) return "Hoje";
  if (iso === addDaysISO(todayIso, -1)) return "Ontem";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// Cabeçalho de grupo no Histórico: Hoje / Ontem / "DD de mês"
function groupDateLabel(iso, todayIso) {
  if (iso === todayIso) return "Hoje";
  if (iso === addDaysISO(todayIso, -1)) return "Ontem";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });
}

// Horário (HH:mm) de um timestamp ISO, no fuso de São Paulo.
function formatTimeSP(isoTimestamp) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoTimestamp));
  } catch (e) {
    return "";
  }
}

// 'YYYY-MM-DD' -> "17 de agosto de 2026"
function formatFullDatePt(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

// 'YYYY-MM' -> "Agosto de 2026"
function formatMonthPt(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, 1));
  const s = dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Filtra movimentações cuja data (YYYY-MM-DD) esteja dentro do intervalo [start, end], inclusive.
// Reaproveitado pelo relatório personalizado — comparação lexicográfica de strings ISO é segura
// e evita os problemas de timezone de `new Date("YYYY-MM-DD")`.
function filterTransactionsByPeriod(transactions, startIso, endIso) {
  return transactions.filter((t) => t.date >= startIso && t.date <= endIso);
}

/* ---------------------------------------------------------
   ARMAZENAMENTO — camada única de acesso a dados
   Chave: controle_financeiro_transactions
--------------------------------------------------------- */
const STORAGE_KEY = "controle_financeiro_transactions";

// Fallback em memória: garante que o app funcione mesmo em ambientes
// (como este preview) que bloqueiam localStorage. Em uma implantação
// real (hospedagem própria, PWA instalado), o localStorage é usado
// normalmente e os dados persistem entre recarregamentos.
let memoryFallback = [];

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return memoryFallback;
  }
}

function writeStorage(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    memoryFallback = list;
  }
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `tx_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const transactionRepository = {
  getAll() {
    const list = readStorage();
    return Array.isArray(list) ? list : [];
  },
  create(data) {
    const now = new Date().toISOString();
    const transaction = {
      id: generateId(),
      amount: data.amount,
      description: data.description,
      type: data.type,
      date: data.date,
      createdAt: now,
      updatedAt: now,
    };
    const list = transactionRepository.getAll();
    list.push(transaction);
    writeStorage(list);
    return transaction;
  },
  update(id, data) {
    const list = transactionRepository.getAll();
    const index = list.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const updated = {
      ...list[index],
      amount: data.amount,
      description: data.description,
      type: data.type,
      date: data.date,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    writeStorage(list);
    return updated;
  },
  delete(id) {
    const list = transactionRepository.getAll();
    const filtered = list.filter((t) => t.id !== id);
    writeStorage(filtered);
    return filtered;
  },
};

/* ---------------------------------------------------------
   CÁLCULOS — sempre derivados das movimentações, nunca salvos prontos
--------------------------------------------------------- */
function computeTotals(transactions) {
  let income = 0,
    expense = 0,
    gamblingOut = 0,
    gamblingIn = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
    else if (t.type === "gambling_out") gamblingOut += t.amount;
    else if (t.type === "gambling_in") gamblingIn += t.amount;
  }
  const entradas = income + gamblingIn;
  const saidas = expense + gamblingOut;
  const saldo = entradas - saidas;
  const resultadoApostas = gamblingIn - gamblingOut;
  return { income, expense, gamblingOut, gamblingIn, entradas, saidas, saldo, resultadoApostas };
}

/* ---------------------------------------------------------
   TIPOS DE MOVIMENTAÇÃO — metadados visuais compartilhados
--------------------------------------------------------- */
const TYPE_META = {
  income: { label: "Receita", short: "Receita", sign: "+", color: "#1E9E5A", Icon: ArrowUp, iconBg: "rgba(30,158,90,0.12)" },
  expense: { label: "Despesa", short: "Despesa", sign: "-", color: "#E14B4B", Icon: ArrowDown, iconBg: "rgba(225,75,75,0.12)" },
  gambling_out: {
    label: "Enviei para aposta",
    short: "Enviado para aposta",
    sign: "-",
    color: "#B5730E",
    Icon: ArrowUpRight,
    iconBg: "rgba(181,115,14,0.12)",
  },
  gambling_in: {
    label: "Recebi de aposta",
    short: "Recebido de aposta",
    sign: "+",
    color: "#1E9E5A",
    Icon: ArrowDownLeft,
    iconBg: "rgba(30,158,90,0.12)",
  },
};

/* ---------------------------------------------------------
   ÍCONE DE MOVIMENTAÇÃO — badge circular reutilizado nas listas
--------------------------------------------------------- */
function TransactionIconBadge({ type, size = 34 }) {
  const meta = TYPE_META[type];
  const Icon = meta.Icon;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: meta.iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={Math.round(size * 0.46)} color={meta.color} strokeWidth={2.3} />
    </span>
  );
}

/* ---------------------------------------------------------
   HEADER
--------------------------------------------------------- */
function Header() {
  const today = formatDatePt(new Date());
  return (
    <header
      style={{
        paddingTop: "calc(18px + env(safe-area-inset-top))",
        paddingLeft: SPACE.lg,
        paddingRight: SPACE.lg,
        paddingBottom: SPACE.md,
      }}
    >
      <h1 style={{ fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: -0.3, margin: 0 }}>
        Controle Financeiro
      </h1>
      <p style={{ fontSize: 13, color: C.inkSoft, margin: "3px 0 0", textTransform: "capitalize" }}>
        {today}
      </p>
    </header>
  );
}

/* ---------------------------------------------------------
   BALANCE CARD — elemento de maior destaque da Home
--------------------------------------------------------- */
function BalanceCard({ entradas, saidas }) {
  const saldo = entradas - saidas;
  return (
    <section
      style={{
        background: "linear-gradient(160deg, #202329 0%, #0C0D0F 100%)",
        borderRadius: 22,
        padding: `${SPACE.xl}px ${SPACE.lg}px`,
        color: "#fff",
        boxShadow: `${SHADOW.card}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, fontWeight: 500 }}>
        Saldo do mês
      </p>
      <p
        style={{
          fontSize: 38,
          fontWeight: 700,
          margin: "6px 0 20px",
          letterSpacing: -0.6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatBRL(saldo)}
      </p>

      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: SPACE.lg }} />

      <div style={{ display: "flex", gap: SPACE.md }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: SPACE.sm + 2 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(30,158,90,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArrowUp size={14} color="#4ADE80" strokeWidth={2.4} />
          </span>
          <div>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: 0 }}>Entradas</p>
            <p style={{ fontSize: 15, fontWeight: 600, margin: "2px 0 0", fontVariantNumeric: "tabular-nums" }}>
              {formatBRL(entradas)}
            </p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: SPACE.sm + 2 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(225,75,75,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArrowDown size={14} color="#F87171" strokeWidth={2.4} />
          </span>
          <div>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: 0 }}>Saídas</p>
            <p style={{ fontSize: 15, fontWeight: 600, margin: "2px 0 0", fontVariantNumeric: "tabular-nums" }}>
              {formatBRL(saidas)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------
   SEÇÃO "HOJE"
--------------------------------------------------------- */
function TodaySummary({ entradas, saidas }) {
  const saldo = entradas - saidas;
  const item = (label, value, color) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <p style={{ fontSize: 11.5, color: C.inkSoft, margin: 0 }}>{label}</p>
      <p
        style={{
          fontSize: 16,
          fontWeight: 700,
          margin: "4px 0 0",
          color: color || C.ink,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatBRL(value)}
      </p>
    </div>
  );

  return (
    <section
      style={{
        background: C.card,
        borderRadius: RADIUS.card,
        padding: `${SPACE.base}px ${SPACE.md}px`,
        border: `1px solid ${C.line}`,
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: `0 0 ${SPACE.md}px`, paddingLeft: SPACE.sm }}>
        Hoje
      </p>
      <div style={{ display: "flex", alignItems: "center" }}>
        {item("Entradas", entradas, C.green)}
        <div style={{ width: 1, height: 28, background: C.line }} />
        {item("Saídas", saidas, C.red)}
        <div style={{ width: 1, height: 28, background: C.line }} />
        {item("Saldo", saldo)}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------
   TELA "APOSTAS" — visível apenas na aba dedicada
--------------------------------------------------------- */
/* ---------------------------------------------------------
   PAGE HEADER — cabeçalho compartilhado das abas secundárias
   (garante safe-area-inset-top consistente em todas as telas)
--------------------------------------------------------- */
function PageHeader({ title, subtitle }) {
  return (
    <div
      style={{
        paddingTop: "calc(18px + env(safe-area-inset-top))",
        paddingLeft: SPACE.lg,
        paddingRight: SPACE.lg,
        paddingBottom: SPACE.md,
      }}
    >
      <h1 style={{ fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: -0.3, margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 13, color: C.inkSoft, margin: "3px 0 0" }}>{subtitle}</p>
    </div>
  );
}

function BettingHeader() {
  return <PageHeader title="Apostas" subtitle="Acompanhamento financeiro" />;
}

function BettingResultCard({ enviado, recebido }) {
  const resultado = recebido - enviado;
  return (
    <section
      style={{
        background: "linear-gradient(160deg, #262019 0%, #100D08 100%)",
        borderRadius: 22,
        padding: `${SPACE.xl}px ${SPACE.lg}px`,
        color: "#fff",
        boxShadow: `${SHADOW.card}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, fontWeight: 500 }}>
        Resultado do mês
      </p>
      <p
        style={{
          fontSize: 38,
          fontWeight: 700,
          margin: "6px 0 20px",
          letterSpacing: -0.6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatBRL(resultado)}
      </p>

      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: SPACE.lg }} />

      <div style={{ display: "flex", gap: SPACE.md }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: 0 }}>Enviado</p>
          <p style={{ fontSize: 15, fontWeight: 600, margin: "4px 0 0", fontVariantNumeric: "tabular-nums" }}>
            {formatBRL(enviado)}
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: 0 }}>Recebido</p>
          <p style={{ fontSize: 15, fontWeight: 600, margin: "4px 0 0", fontVariantNumeric: "tabular-nums" }}>
            {formatBRL(recebido)}
          </p>
        </div>
      </div>
    </section>
  );
}

function BettingTransactions({ transactions, todayIso }) {
  return (
    <section
      style={{
        background: C.card,
        borderRadius: RADIUS.card,
        padding: "16px 16px",
        border: `1px solid ${C.line}`,
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>Movimentações</p>

      {transactions.length === 0 ? (
        <EmptyState title="Nenhuma movimentação registrada" />
      ) : (
        <div>
          {transactions.map((t, i) => (
            <div key={t.id} style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
              <TransactionListItem transaction={t} todayIso={todayIso} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BettingScreen({ enviado, recebido, transactions, todayIso }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <BettingResultCard enviado={enviado} recebido={recebido} />
      <BettingTransactions transactions={transactions} todayIso={todayIso} />
    </div>
  );
}

/* ---------------------------------------------------------
   MOVIMENTAÇÕES RECENTES
--------------------------------------------------------- */
function TransactionListItem({ transaction, todayIso }) {
  const meta = TYPE_META[transaction.type];
  const valueColor = meta.sign === "+" ? C.green : C.red;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: SPACE.md,
        padding: `${SPACE.md}px 0`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.md, minWidth: 0 }}>
        <TransactionIconBadge type={transaction.type} />
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              color: C.ink,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {transaction.description}
          </p>
          <p style={{ fontSize: 12, color: C.inkSoft, margin: "3px 0 0" }}>
            {meta.short} • {relativeDateLabel(transaction.date, todayIso)}
          </p>
        </div>
      </div>
      <p
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: valueColor,
          margin: 0,
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {meta.sign} {formatBRL(transaction.amount)}
      </p>
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: `${SPACE.xl}px ${SPACE.md}px ${SPACE.md}px` }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: SPACE.md,
        }}
      >
        <Inbox size={18} color={C.inkFaint} strokeWidth={1.8} />
      </div>
      <p style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, margin: 0, textAlign: "center" }}>{title}</p>
      {subtitle && (
        <p style={{ fontSize: 13, color: C.inkSoft, margin: "6px 0 0", textAlign: "center", lineHeight: 1.4 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function RecentTransactions({ transactions, todayIso }) {
  return (
    <section
      style={{
        background: C.card,
        borderRadius: RADIUS.card,
        padding: "16px 16px",
        border: `1px solid ${C.line}`,
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>
        Movimentações recentes
      </p>

      {transactions.length === 0 ? (
        <EmptyState
          title="Nenhuma movimentação ainda"
          subtitle={
            <>
              Quando você registrar uma movimentação,
              <br />
              ela aparecerá aqui.
            </>
          }
        />
      ) : (
        <div>
          {transactions.map((t, i) => (
            <div key={t.id} style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
              <TransactionListItem transaction={t} todayIso={todayIso} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------
   HISTÓRICO — busca, filtros, agrupamento por data e ações
--------------------------------------------------------- */
function HistoryHeader() {
  return <PageHeader title="Histórico" subtitle="Todas as suas movimentações" />;
}

function SearchInput({ value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: SPACE.sm,
        background: C.bg,
        border: `1px solid ${C.line}`,
        borderRadius: RADIUS.input,
        padding: "12px 14px",
      }}
    >
      <Search size={16} color={C.inkSoft} strokeWidth={2} style={{ flexShrink: 0 }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar pela descrição..."
        aria-label="Buscar movimentação"
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 14,
          color: C.ink,
          width: "100%",
          fontFamily: "inherit",
          minWidth: 0,
        }}
      />
    </div>
  );
}

const FILTER_OPTIONS = [
  { key: "all", label: "Todas" },
  { key: "income", label: "Receitas" },
  { key: "expense", label: "Despesas" },
  { key: "betting", label: "Apostas" },
];

function FilterChips({ active, onChange }) {
  return (
    <div style={{ display: "flex", gap: SPACE.sm, flexWrap: "wrap" }}>
      {FILTER_OPTIONS.map(({ key, label }) => {
        const selected = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-pressed={selected}
            className="cf-btn-press"
            style={{
              padding: "9px 14px",
              borderRadius: RADIUS.pill,
              border: selected ? `1.5px solid ${C.ink}` : `1px solid ${C.line}`,
              background: selected ? C.ink : C.card,
              color: selected ? "#fff" : C.inkSoft,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 160ms ease, border-color 160ms ease",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function HistoryListItem({ transaction, onSelect }) {
  const meta = TYPE_META[transaction.type];
  const valueColor = meta.sign === "+" ? C.green : C.red;
  return (
    <button
      onClick={() => onSelect(transaction)}
      className="cf-row-btn"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: SPACE.md,
        padding: `${SPACE.md}px 0`,
        width: "100%",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.md, minWidth: 0 }}>
        <TransactionIconBadge type={transaction.type} />
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              color: C.ink,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {transaction.description}
          </p>
          <p style={{ fontSize: 12, color: C.inkSoft, margin: "3px 0 0" }}>
            {meta.short} • {formatTimeSP(transaction.createdAt)}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, flexShrink: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: valueColor,
            margin: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {meta.sign} {formatBRL(transaction.amount)}
        </p>
        <ChevronRight size={15} color={C.inkFaint} strokeWidth={2.4} />
      </div>
    </button>
  );
}

/* ---------------------------------------------------------
   LISTA AGRUPADA POR DATA — reutilizada por Histórico e Relatórios
--------------------------------------------------------- */
function GroupedTransactionList({ transactions, todayIso, onSelectTransaction, emptyTitle, emptySubtitle }) {
  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) =>
        a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
      ),
    [transactions]
  );

  const groups = useMemo(() => {
    const map = new Map();
    for (const t of sorted) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      label: groupDateLabel(date, todayIso),
      items,
    }));
  }, [sorted, todayIso]);

  if (transactions.length === 0) {
    return (
      <section style={{ background: C.card, borderRadius: RADIUS.card, padding: "16px 16px", border: `1px solid ${C.line}` }}>
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      </section>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {groups.map((group) => (
        <div key={group.date}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.inkSoft,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              margin: "0 0 8px 4px",
            }}
          >
            {group.label}
          </p>
          <section
            style={{
              background: C.card,
              borderRadius: RADIUS.card,
              padding: "4px 16px",
              border: `1px solid ${C.line}`,
            }}
          >
            {group.items.map((t, i) => (
              <div key={t.id} style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
                <HistoryListItem transaction={t} onSelect={onSelectTransaction || (() => {})} />
              </div>
            ))}
          </section>
        </div>
      ))}
    </div>
  );
}

function HistoryScreen({ transactions, todayIso, onSelectTransaction }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "betting"
          ? t.type === "gambling_out" || t.type === "gambling_in"
          : t.type === filter;
      const matchesSearch = term ? t.description.toLowerCase().includes(term) : true;
      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SearchInput value={search} onChange={setSearch} />
      <FilterChips active={filter} onChange={setFilter} />

      {transactions.length === 0 ? (
        <section
          style={{ background: C.card, borderRadius: RADIUS.card, padding: "16px 16px", border: `1px solid ${C.line}` }}
        >
          <EmptyState
            title="Nenhuma movimentação ainda"
            subtitle="Suas receitas e despesas aparecerão aqui."
          />
        </section>
      ) : (
        <GroupedTransactionList
          transactions={filtered}
          todayIso={todayIso}
          onSelectTransaction={onSelectTransaction}
          emptyTitle="Nenhuma movimentação encontrada"
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   RELATÓRIOS — resumo por período (Hoje / Este mês / Personalizado)
--------------------------------------------------------- */
function ReportsHeader() {
  return <PageHeader title="Relatórios" subtitle="Acompanhe suas movimentações por período" />;
}

const PERIOD_OPTIONS = [
  { key: "today", label: "Hoje" },
  { key: "month", label: "Este mês" },
  { key: "custom", label: "Personalizado" },
];

function PeriodSelector({ active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: SPACE.xs,
        background: C.bg,
        border: `1px solid ${C.line}`,
        borderRadius: RADIUS.input,
        padding: SPACE.xs,
      }}
    >
      {PERIOD_OPTIONS.map(({ key, label }) => {
        const selected = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-pressed={selected}
            style={{
              flex: 1,
              padding: "10px 4px",
              borderRadius: RADIUS.input - 3,
              border: "none",
              background: selected ? C.card : "transparent",
              color: selected ? C.ink : C.inkSoft,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: selected ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "background 160ms ease, box-shadow 160ms ease, color 160ms ease",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ReportResultCard({ label, entradas, saidas }) {
  const resultado = entradas - saidas;
  const valueColor = resultado > 0 ? "#7EE2A8" : resultado < 0 ? "#FF9B9B" : "rgba(255,255,255,0.75)";
  return (
    <section
      style={{
        background: "linear-gradient(160deg, #202329 0%, #0C0D0F 100%)",
        borderRadius: 22,
        padding: `${SPACE.xl}px ${SPACE.lg}px`,
        color: "#fff",
        boxShadow: `${SHADOW.card}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, fontWeight: 500 }}>{label}</p>
      <p
        style={{
          fontSize: 38,
          fontWeight: 700,
          margin: "6px 0 20px",
          letterSpacing: -0.6,
          fontVariantNumeric: "tabular-nums",
          color: valueColor,
        }}
      >
        {formatBRL(resultado)}
      </p>

      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: SPACE.lg }} />

      <div style={{ display: "flex", gap: SPACE.md }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: SPACE.sm + 2 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(30,158,90,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArrowUp size={14} color="#4ADE80" strokeWidth={2.4} />
          </span>
          <div>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: 0 }}>Entradas</p>
            <p style={{ fontSize: 15, fontWeight: 600, margin: "2px 0 0", fontVariantNumeric: "tabular-nums" }}>
              {formatBRL(entradas)}
            </p>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: SPACE.sm + 2 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(225,75,75,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArrowDown size={14} color="#F87171" strokeWidth={2.4} />
          </span>
          <div>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: 0 }}>Saídas</p>
            <p style={{ fontSize: 15, fontWeight: 600, margin: "2px 0 0", fontVariantNumeric: "tabular-nums" }}>
              {formatBRL(saidas)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function pluralizeMovimentacoes(count) {
  return count === 1 ? "1 movimentação" : `${count} movimentações`;
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
      <span style={{ fontSize: 13.5, color: C.inkSoft }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

function ReportBreakdown({ totals }) {
  const rows = [
    { label: "Receitas", value: formatBRL(totals.income) },
    { label: "Despesas", value: formatBRL(totals.expense) },
    { label: "Total de entradas", value: formatBRL(totals.entradas) },
    { label: "Total de saídas", value: formatBRL(totals.saidas) },
    { label: "Movimentações", value: pluralizeMovimentacoes(totals.count) },
  ];
  return (
    <section style={{ background: C.card, borderRadius: RADIUS.card, padding: "6px 16px", border: `1px solid ${C.line}` }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: "12px 0 0" }}>Detalhamento</p>
      <div>
        {rows.map((row, i) => (
          <div key={row.label} style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
            <DetailRow label={row.label} value={row.value} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportBettingDetails({ totals }) {
  const [open, setOpen] = useState(false);
  return (
    <section style={{ background: C.card, borderRadius: RADIUS.card, border: `1px solid ${C.line}`, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="cf-row-btn"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          borderRadius: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Detalhes adicionais</span>
        <ChevronRight
          size={16}
          color={C.inkSoft}
          strokeWidth={2.2}
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 160ms ease" }}
        />
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft, margin: "0 0 6px" }}>
            Movimentações relacionadas a apostas
          </p>
          <div>
            <div style={{ borderTop: `1px solid ${C.line}` }}>
              <DetailRow label="Enviado" value={formatBRL(totals.gamblingOut)} />
            </div>
            <div style={{ borderTop: `1px solid ${C.line}` }}>
              <DetailRow label="Recebido" value={formatBRL(totals.gamblingIn)} />
            </div>
            <div style={{ borderTop: `1px solid ${C.line}` }}>
              <DetailRow label="Resultado" value={formatBRL(totals.resultadoApostas)} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ReportsScreen({ transactions, todayTransactions, monthTransactions, todayIso, monthLabel, onSelectTransaction }) {
  const [period, setPeriod] = useState("today");
  const [customStart, setCustomStart] = useState(todayIso);
  const [customEnd, setCustomEnd] = useState(todayIso);
  const [appliedRange, setAppliedRange] = useState(null);
  const [rangeError, setRangeError] = useState("");

  const todayLabel = useMemo(() => formatFullDatePt(todayIso), [todayIso]);

  function handleGenerate() {
    if (customEnd < customStart) {
      setRangeError("A data final não pode ser anterior à data inicial.");
      setAppliedRange(null);
      return;
    }
    setRangeError("");
    setAppliedRange({ start: customStart, end: customEnd });
  }

  function handlePeriodChange(key) {
    setPeriod(key);
    if (key !== "custom") {
      setRangeError("");
    }
  }

  const periodTransactions = useMemo(() => {
    if (period === "today") return todayTransactions;
    if (period === "month") return monthTransactions;
    if (period === "custom" && appliedRange) {
      return filterTransactionsByPeriod(transactions, appliedRange.start, appliedRange.end);
    }
    return [];
  }, [period, todayTransactions, monthTransactions, transactions, appliedRange]);

  const totals = useMemo(() => ({ ...computeTotals(periodTransactions), count: periodTransactions.length }), [
    periodTransactions,
  ]);

  const hasResults = period !== "custom" || !!appliedRange;

  const periodLabel =
    period === "today"
      ? todayLabel
      : period === "month"
      ? monthLabel
      : appliedRange
      ? `${isoToDisplay(appliedRange.start)} – ${isoToDisplay(appliedRange.end)}`
      : "";

  const dateFieldStyle = {
    width: "100%",
    background: C.bg,
    border: `1px solid ${C.line}`,
    borderRadius: RADIUS.input,
    padding: "12px 14px",
    fontSize: 14,
    color: C.ink,
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PeriodSelector active={period} onChange={handlePeriodChange} />

      {period === "custom" && (
        <section
          style={{ background: C.card, borderRadius: RADIUS.card, padding: "16px", border: `1px solid ${C.line}` }}
        >
          <div style={{ display: "flex", gap: 10, marginBottom: rangeError ? 10 : 14 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft, margin: "0 0 6px" }}>Data inicial</p>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={dateFieldStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft, margin: "0 0 6px" }}>Data final</p>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={dateFieldStyle}
              />
            </div>
          </div>

          {rangeError && (
            <p style={{ fontSize: 12.5, color: C.red, margin: "0 0 12px" }}>{rangeError}</p>
          )}

          <button
            onClick={handleGenerate}
            className="cf-btn-press"
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: RADIUS.button,
              border: "none",
              background: C.ink,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Gerar relatório
          </button>
        </section>
      )}

      {hasResults && (
        <>
          <p style={{ fontSize: 12.5, color: C.inkSoft, margin: "0 0 -4px 4px" }}>{periodLabel}</p>

          <ReportResultCard label="Resultado do período" entradas={totals.entradas} saidas={totals.saidas} />

          <ReportBreakdown totals={totals} />

          <ReportBettingDetails totals={totals} />

          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: "0 0 10px 4px" }}>
              Movimentações do período
            </p>
            <GroupedTransactionList
              transactions={periodTransactions}
              todayIso={todayIso}
              onSelectTransaction={onSelectTransaction}
              emptyTitle="Nenhuma movimentação neste período"
              emptySubtitle="Selecione outro período ou registre uma nova movimentação."
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   AÇÕES DA MOVIMENTAÇÃO — sheet com Editar / Excluir
--------------------------------------------------------- */
function TransactionActionsSheet({ transaction, onClose, onEdit, onDelete }) {
  const meta = TYPE_META[transaction.type];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "center" }}>
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(10,10,12,0.45)", animation: "cf-fade 180ms ease" }}
      />
      <div style={{ width: "100%", maxWidth: 460, position: "relative", alignSelf: "flex-end" }}>
        <div
          style={{
            background: C.card,
            borderRadius: "24px 24px 0 0",
            padding: "14px 22px calc(24px + env(safe-area-inset-bottom))",
            position: "relative",
            animation: "cf-slide-up 220ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.line, margin: "0 auto 18px" }} />
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              position: "absolute",
              top: 14,
              right: 18,
              background: C.bg,
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} color={C.inkSoft} />
          </button>

          <div style={{ marginBottom: 16 }}>
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.ink,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {transaction.description}
            </p>
            <p style={{ fontSize: 12.5, color: C.inkSoft, margin: "3px 0 0" }}>
              {meta.short} • {formatBRL(transaction.amount)}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
            <button
              onClick={() => onEdit(transaction)}
              className="cf-btn-press"
              style={{
                display: "flex",
                alignItems: "center",
                gap: SPACE.md,
                padding: "13px 14px",
                borderRadius: RADIUS.button - 1,
                border: `1px solid ${C.line}`,
                background: C.card,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: C.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Pencil size={15} color={C.ink} strokeWidth={2.1} />
              </span>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>Editar</span>
            </button>
            <button
              onClick={() => onDelete(transaction)}
              className="cf-btn-press"
              style={{
                display: "flex",
                alignItems: "center",
                gap: SPACE.md,
                padding: "13px 14px",
                borderRadius: RADIUS.button - 1,
                border: `1px solid ${C.redSoft}`,
                background: C.card,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: C.redSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={15} color={C.red} strokeWidth={2.1} />
              </span>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: C.red }}>Excluir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   CONFIRMAÇÃO DE EXCLUSÃO
--------------------------------------------------------- */
function DeleteConfirmDialog({ transaction, onCancel, onConfirm }) {
  const meta = TYPE_META[transaction.type];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={onCancel}
        style={{ position: "absolute", inset: 0, background: "rgba(10,10,12,0.5)", animation: "cf-fade 180ms ease" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 340,
          background: C.card,
          borderRadius: RADIUS.card,
          padding: SPACE.xl,
          animation: "cf-slide-up 200ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Excluir movimentação?</p>
        <p style={{ fontSize: 13.5, color: C.inkSoft, margin: "8px 0 14px", lineHeight: 1.5 }}>
          Essa ação não poderá ser desfeita.
        </p>

        <div
          style={{
            background: C.bg,
            borderRadius: RADIUS.input,
            padding: "10px 12px",
            marginBottom: SPACE.lg,
          }}
        >
          <p
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: C.ink,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {transaction.description}
          </p>
          <p style={{ fontSize: 12, color: C.inkSoft, margin: "2px 0 0" }}>
            {meta.short} • {formatBRL(transaction.amount)}
          </p>
        </div>

        <div style={{ display: "flex", gap: SPACE.sm + 2 }}>
          <button
            onClick={onCancel}
            className="cf-btn-press"
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: RADIUS.button - 1,
              border: `1px solid ${C.line}`,
              background: C.card,
              color: C.ink,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="cf-btn-press"
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: RADIUS.button - 1,
              border: "none",
              background: C.red,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   TELAS TEMPORÁRIAS — Relatórios
--------------------------------------------------------- */
/* ---------------------------------------------------------
   BOTTOM NAVIGATION
--------------------------------------------------------- */
function BottomNavigation({ active, onChange }) {
  const tabs = [
    { key: "home", label: "Início", Icon: Home },
    { key: "history", label: "Histórico", Icon: History },
    { key: "betting", label: "Apostas", Icon: Activity },
    { key: "reports", label: "Relatórios", Icon: BarChart3 },
  ];

  return (
    <nav
      style={{
        pointerEvents: "auto",
        background: "rgba(247,246,243,0.92)",
        backdropFilter: "blur(12px)",
        borderTop: `1px solid ${C.line}`,
        paddingTop: SPACE.sm,
        paddingBottom: `calc(${SPACE.sm}px + env(safe-area-inset-bottom))`,
        display: "flex",
      }}
    >
      {tabs.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className="cf-nav-btn"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "5px 0 4px",
            }}
          >
            <span
              style={{
                width: 40,
                height: 26,
                borderRadius: RADIUS.button - 3,
                background: isActive ? C.line : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 180ms ease",
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.3 : 1.9} color={isActive ? C.ink : C.inkFaint} />
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? C.ink : C.inkFaint,
                whiteSpace: "nowrap",
                transition: "color 180ms ease",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ---------------------------------------------------------
   FLOATING ACTION BUTTON
--------------------------------------------------------- */
function FloatingActionButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Nova movimentação"
      className="cf-fab"
      style={{
        pointerEvents: "auto",
        position: "absolute",
        right: SPACE.lg,
        bottom: `calc(76px + env(safe-area-inset-bottom))`,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: C.ink,
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: SHADOW.fab,
        cursor: "pointer",
      }}
    >
      <Plus size={25} color="#fff" strokeWidth={2.3} />
    </button>
  );
}

/* ---------------------------------------------------------
   SHEET — formulário de nova movimentação
--------------------------------------------------------- */
const TYPE_OPTIONS = [
  { key: "income", label: "Receita", Icon: ArrowUp, color: C.green, bg: C.greenSoft },
  { key: "expense", label: "Despesa", Icon: ArrowDown, color: C.red, bg: C.redSoft },
  { key: "gambling_out", label: "Enviei para aposta", Icon: ArrowUpRight, color: C.amber, bg: C.amberBg },
  { key: "gambling_in", label: "Recebi de aposta", Icon: ArrowDownLeft, color: C.green, bg: C.amberBg },
];

function sanitizeAmountInput(raw) {
  let v = raw.replace(/[^0-9,]/g, "");
  const firstComma = v.indexOf(",");
  if (firstComma !== -1) {
    v = v.slice(0, firstComma + 1) + v.slice(firstComma + 1).replace(/,/g, "");
  }
  const [intPart, decPart] = v.split(",");
  if (decPart !== undefined && decPart.length > 2) {
    v = `${intPart},${decPart.slice(0, 2)}`;
  }
  return v;
}

function amountToEditableText(amount) {
  return amount.toFixed(2).replace(".", ",");
}

function NewTransactionSheet({ onClose, onSave, defaultDate, transaction }) {
  const isEditing = !!transaction;
  const [amountText, setAmountText] = useState(isEditing ? amountToEditableText(transaction.amount) : "");
  const [description, setDescription] = useState(isEditing ? transaction.description : "");
  const [type, setType] = useState(isEditing ? transaction.type : null);
  const [dateStr, setDateStr] = useState(isEditing ? transaction.date : defaultDate);
  const amountInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => amountInputRef.current && amountInputRef.current.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  const numericAmount = amountText ? parseFloat(amountText.replace(",", ".")) : 0;
  const isValid = numericAmount > 0 && description.trim().length > 0 && !!type && !!dateStr;

  const inputStyle = {
    width: "100%",
    background: C.bg,
    border: `1px solid ${C.line}`,
    borderRadius: RADIUS.input,
    padding: "13px 14px",
    fontSize: 15,
    color: C.ink,
    outline: "none",
    fontFamily: "inherit",
  };

  function handleSubmit() {
    if (!isValid) return;
    onSave({
      id: isEditing ? transaction.id : undefined,
      amount: Math.round(numericAmount * 100) / 100,
      description: description.trim(),
      type,
      date: dateStr,
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10,10,12,0.45)",
          animation: "cf-fade 180ms ease",
        }}
      />
      <div style={{ width: "100%", maxWidth: 460, position: "relative", alignSelf: "flex-end" }}>
        <div
          style={{
            background: C.card,
            borderRadius: "24px 24px 0 0",
            padding: "14px 22px calc(24px + env(safe-area-inset-bottom))",
            position: "relative",
            animation: "cf-slide-up 220ms cubic-bezier(0.22,1,0.36,1)",
            maxHeight: "88vh",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.line, margin: "0 auto 16px" }} />
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              position: "absolute",
              top: 14,
              right: 18,
              background: C.bg,
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} color={C.inkSoft} />
          </button>

          <p style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: "0 0 18px" }}>
            {isEditing ? "Editar movimentação" : "Nova movimentação"}
          </p>

          {/* VALOR */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                borderBottom: `1.5px solid ${C.line}`,
                paddingBottom: 10,
              }}
            >
              <span style={{ fontSize: 24, fontWeight: 600, color: C.inkSoft }}>R$</span>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amountText}
                onChange={(e) => setAmountText(sanitizeAmountInput(e.target.value))}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 34,
                  fontWeight: 700,
                  color: C.ink,
                  width: "100%",
                  fontFamily: "inherit",
                  letterSpacing: -0.5,
                }}
              />
            </div>
          </div>

          {/* DESCRIÇÃO */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, margin: "0 0 8px" }}>Descrição</p>
            <input
              type="text"
              placeholder="Ex: Cachê casamento"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* TIPO */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, margin: "0 0 8px" }}>Tipo</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {TYPE_OPTIONS.map(({ key, label, Icon, color, bg }) => {
                const selected = type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    aria-pressed={selected}
                    className="cf-btn-press"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: SPACE.sm,
                      padding: "10px 10px",
                      borderRadius: RADIUS.button - 1,
                      border: selected ? `1.5px solid ${color}` : `1px solid ${C.line}`,
                      background: selected ? bg : C.card,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 160ms ease, background 160ms ease",
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: selected ? "rgba(255,255,255,0.55)" : C.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={14} color={color} strokeWidth={2.3} />
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: C.ink,
                        lineHeight: 1.2,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {label}
                    </span>
                    {selected && <Check size={14} color={color} strokeWidth={2.6} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DATA */}
          <div style={{ marginBottom: SPACE.xl }}>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, margin: "0 0 8px" }}>Data</p>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              style={inputStyle}
            />
            <p style={{ fontSize: 12, color: C.inkSoft, margin: "6px 0 0" }}>{isoToDisplay(dateStr)}</p>
          </div>

          {/* SALVAR */}
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={isValid ? "cf-btn-press" : ""}
            style={{
              width: "100%",
              padding: "15px 0",
              borderRadius: RADIUS.button,
              border: "none",
              background: isValid ? C.ink : C.line,
              color: isValid ? "#fff" : C.inkFaint,
              fontSize: 15,
              fontWeight: 700,
              cursor: isValid ? "pointer" : "not-allowed",
              transition: "background 160ms ease",
            }}
          >
            {isEditing ? "Salvar alterações" : "Salvar movimentação"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   TOAST — feedback discreto pós-salvamento
--------------------------------------------------------- */
function Toast({ message }) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(96px + env(safe-area-inset-bottom))",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 120,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: C.ink,
          color: "#fff",
          fontSize: 13.5,
          fontWeight: 600,
          padding: "11px 18px",
          borderRadius: 999,
          boxShadow: "0 10px 24px -8px rgba(0,0,0,0.4)",
          animation: "cf-fade 180ms ease",
        }}
      >
        <Check size={15} strokeWidth={2.6} />
        {message}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   APP SHELL
--------------------------------------------------------- */
export default function ControleFinanceiro() {
  const [tab, setTab] = useState("home");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [actionsForTransaction, setActionsForTransaction] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const toastTimerRef = useRef(null);

  // Carrega as movimentações salvas ao abrir o app.
  useEffect(() => {
    setTransactions(transactionRepository.getAll());
  }, []);

  const todayIso = useMemo(() => todayISOInSaoPaulo(), []);
  const currentMonthKey = useMemo(() => isoToMonthKey(todayIso), [todayIso]);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => isoToMonthKey(t.date) === currentMonthKey),
    [transactions, currentMonthKey]
  );
  const todayTransactions = useMemo(
    () => transactions.filter((t) => t.date === todayIso),
    [transactions, todayIso]
  );
  const bettingMonthTransactions = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === "gambling_out" || t.type === "gambling_in")
        .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date))),
    [monthTransactions]
  );
  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
        .slice(0, 5),
    [transactions]
  );

  const monthTotals = useMemo(() => computeTotals(monthTransactions), [monthTransactions]);
  const todayTotals = useMemo(() => computeTotals(todayTransactions), [todayTransactions]);

  function showToast(message) {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2200);
  }

  // Único handler de salvamento: cria uma movimentação nova ou atualiza uma existente.
  function handleSaveTransaction(data) {
    if (data.id) {
      transactionRepository.update(data.id, data);
      setTransactions(transactionRepository.getAll());
      setSheetOpen(false);
      setEditingTransaction(null);
      showToast("Movimentação atualizada");
    } else {
      transactionRepository.create(data);
      setTransactions(transactionRepository.getAll());
      setSheetOpen(false);
      showToast("Movimentação registrada");
    }
  }

  function handleOpenNewTransaction() {
    setEditingTransaction(null);
    setSheetOpen(true);
  }

  function handleCloseSheet() {
    setSheetOpen(false);
    setEditingTransaction(null);
  }

  function handleSelectTransaction(transaction) {
    setActionsForTransaction(transaction);
  }

  function handleRequestEdit(transaction) {
    setActionsForTransaction(null);
    setEditingTransaction(transaction);
    setSheetOpen(true);
  }

  function handleRequestDelete(transaction) {
    setActionsForTransaction(null);
    setPendingDelete(transaction);
  }

  function handleConfirmDelete() {
    transactionRepository.delete(pendingDelete.id);
    setTransactions(transactionRepository.getAll());
    setPendingDelete(null);
    showToast("Movimentação excluída");
  }

  useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, fontFamily: FONT }}>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button { font: inherit; }
        @keyframes cf-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cf-slide-up { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
        }
        @media (min-width: 641px) {
          .cf-frame { box-shadow: 0 30px 60px -30px rgba(0,0,0,0.25); border-radius: 32px; margin-top: 28px; margin-bottom: 28px; overflow: hidden; }
        }

        /* Foco visível para navegação por teclado no desktop */
        button:focus-visible, input:focus-visible, a:focus-visible {
          outline: 2px solid ${C.ink};
          outline-offset: 2px;
        }
        input:focus {
          border-color: ${C.inkFaint} !important;
        }

        /* FAB: escala sutil ao pressionar/hover, sem depender de vibração */
        .cf-fab { transition: transform 160ms ease, box-shadow 160ms ease; }
        .cf-fab:active { transform: scale(0.93); }
        @media (hover: hover) {
          .cf-fab:hover { transform: translateY(-1px); box-shadow: 0 12px 22px -6px rgba(21,23,27,0.38); }
        }

        /* Navegação inferior e linhas de lista: feedback de toque discreto */
        .cf-nav-btn { transition: opacity 160ms ease; }
        .cf-nav-btn:active { opacity: 0.6; }

        .cf-row-btn { border-radius: 10px; background: none; transition: background 140ms ease; }
        .cf-row-btn:active { background: rgba(21,23,27,0.035); }
        @media (hover: hover) {
          .cf-row-btn:hover { background: rgba(21,23,27,0.025); }
        }

        .cf-btn-press { transition: transform 140ms ease, opacity 140ms ease, background 160ms ease; }
        .cf-btn-press:active { transform: scale(0.98); opacity: 0.92; }
      `}</style>

      <div
        className="cf-frame"
        style={{
          maxWidth: 460,
          margin: "0 auto",
          background: C.bg,
          minHeight: "100vh",
          position: "relative",
        }}
      >
        {tab === "betting" ? (
          <BettingHeader />
        ) : tab === "history" ? (
          <HistoryHeader />
        ) : tab === "reports" ? (
          <ReportsHeader />
        ) : (
          <Header />
        )}

        <main style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: "calc(112px + env(safe-area-inset-bottom))" }}>
          {tab === "home" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <BalanceCard entradas={monthTotals.entradas} saidas={monthTotals.saidas} />
              <TodaySummary entradas={todayTotals.entradas} saidas={todayTotals.saidas} />
              <RecentTransactions transactions={recentTransactions} todayIso={todayIso} />
            </div>
          )}

          {tab === "history" && (
            <HistoryScreen
              transactions={transactions}
              todayIso={todayIso}
              onSelectTransaction={handleSelectTransaction}
            />
          )}

          {tab === "betting" && (
            <BettingScreen
              enviado={monthTotals.gamblingOut}
              recebido={monthTotals.gamblingIn}
              transactions={bettingMonthTransactions}
              todayIso={todayIso}
            />
          )}

          {tab === "reports" && (
            <ReportsScreen
              transactions={transactions}
              todayTransactions={todayTransactions}
              monthTransactions={monthTransactions}
              todayIso={todayIso}
              monthLabel={formatMonthPt(currentMonthKey)}
              onSelectTransaction={handleSelectTransaction}
            />
          )}
        </main>
      </div>

      {/* Camada fixa: navegação inferior + botão flutuante, alinhados à coluna central */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 40,
        }}
      >
        <div style={{ width: "100%", maxWidth: 460, position: "relative" }}>
          <FloatingActionButton onClick={handleOpenNewTransaction} />
          <BottomNavigation active={tab} onChange={setTab} />
        </div>
      </div>

      {sheetOpen && (
        <NewTransactionSheet
          onClose={handleCloseSheet}
          onSave={handleSaveTransaction}
          defaultDate={todayIso}
          transaction={editingTransaction}
        />
      )}

      {actionsForTransaction && (
        <TransactionActionsSheet
          transaction={actionsForTransaction}
          onClose={() => setActionsForTransaction(null)}
          onEdit={handleRequestEdit}
          onDelete={handleRequestDelete}
        />
      )}

      {pendingDelete && (
        <DeleteConfirmDialog
          transaction={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}

:root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, sans-serif;
  color: #15171B;
  background: #EAEAE6;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* { box-sizing: border-box; }
html, body, #root { margin: 0; min-width: 320px; min-height: 100%; }
body { min-height: 100vh; background: #EAEAE6; overscroll-behavior-y: none; }
button, input, select, textarea { font: inherit; }
button { -webkit-tap-highlight-color: transparent; }

@media (display-mode: standalone) {
  body { user-select: none; -webkit-user-select: none; }
  input, textarea { user-select: text; -webkit-user-select: text; }
}
