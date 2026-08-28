'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from '@tremor/react';
import { StatusPill } from './StatusPill';
export function TransactionTable({
  data,
  isLoading,
  isError,
  refetch,
}: {
  data?: any[];
  isLoading?: boolean;
  isError?: boolean;
  refetch?: () => void;
}) {
  if (isLoading)
    return (
      <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
        <div
          role="status"
          aria-live="polite"
          className="h-32 animate-pulse rounded-lg bg-slate-100"
        />
      </Card>
    );
  if (isError)
    return (
      <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
        <div role="alert" className="flex items-center justify-between text-danger">
          <span>Não foi possível carregar as transações.</span>
          <button
            onClick={() => refetch?.()}
            className="rounded-lg bg-grafite px-4 py-2 text-sm font-medium text-white hover:bg-grafite-800"
          >
            Tentar novamente
          </button>
        </div>
      </Card>
    );
  if (!data || data.length === 0)
    return (
      <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
        <div
          role="status"
          aria-label="Nenhuma transação encontrada"
          className="py-10 text-center text-ink-muted"
        >
          Nenhuma transação encontrada —{' '}
          <a href="/transactions/new" className="font-medium text-brand underline">
            Criar transação
          </a>
        </div>
      </Card>
    );
  return (
    <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
      <div className="mx-auto mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-ink">Transações recentes</h2>
        <span className="text-xs text-ink-faint">{data.length} exibidas</span>
      </div>
      <div className="hidden sm:block">
        <Table>
          <TableHead>
            <TableRow className="bg-slate-50">
              <TableHeaderCell className="text-xs uppercase tracking-wider text-ink-faint">
                ID
              </TableHeaderCell>
              <TableHeaderCell className="text-xs uppercase tracking-wider text-ink-faint">
                Tipo
              </TableHeaderCell>
              <TableHeaderCell className="text-xs uppercase tracking-wider text-ink-faint">
                Valor
              </TableHeaderCell>
              <TableHeaderCell className="text-xs uppercase tracking-wider text-ink-faint">
                Status
              </TableHeaderCell>
              <TableHeaderCell className="text-xs uppercase tracking-wider text-ink-faint">
                Criado
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((t: any) => (
              <TableRow key={t.transactionExternalId} className="hover:bg-slate-50">
                <TableCell className="font-mono text-brand">
                  {t.transactionExternalId.slice(0, 8)}…
                </TableCell>
                <TableCell>{t.transactionType.name}</TableCell>
                <TableCell className="font-medium">R$ {t.value}</TableCell>
                <TableCell>
                  <StatusPill status={t.transactionStatus.name} />
                </TableCell>
                <TableCell>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 sm:hidden">
        {data.map((t: any) => (
          <div key={t.transactionExternalId} className="rounded-lg border border-[#E2E8F0] p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-brand">
                {t.transactionExternalId.slice(0, 8)}…
              </span>
              <StatusPill status={t.transactionStatus.name} />
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-ink-muted">{t.transactionType.name}</span>
              <span className="font-medium">R$ {t.value}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
