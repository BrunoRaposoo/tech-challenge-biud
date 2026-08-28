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
  Badge,
} from '@tremor/react';
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
      <Card>
        <div role="status" aria-live="polite" className="animate-pulse h-32 bg-slate-100 rounded" />
      </Card>
    );
  if (isError)
    return (
      <Card>
        <div role="alert" className="text-red-600">
          Erro{' '}
          <button
            onClick={() => refetch?.()}
            className="ml-2 px-3 py-1 bg-slate-900 text-white rounded"
          >
            Tentar novamente
          </button>
        </div>
      </Card>
    );
  if (!data || data.length === 0)
    return (
      <Card>
        <div
          role="status"
          aria-label="Nenhuma transação encontrada"
          className="py-8 text-center text-slate-500"
        >
          Nenhuma transação encontrada —{' '}
          <a href="/transactions/new" className="text-blue-600 underline">
            Criar
          </a>
        </div>
      </Card>
    );
  return (
    <Card>
      <div className="hidden sm:block">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell>Valor</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Criado</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((t: any) => (
              <TableRow key={t.transactionExternalId} className="hover:bg-slate-50">
                <TableCell>{t.transactionExternalId.slice(0, 8)}...</TableCell>
                <TableCell>{t.transactionType.name}</TableCell>
                <TableCell>R$ {t.value}</TableCell>
                <TableCell>
                  <Badge
                    color={
                      t.transactionStatus.name === 'PENDING'
                        ? 'amber'
                        : t.transactionStatus.name === 'APPROVED'
                          ? 'emerald'
                          : 'red'
                    }
                  >
                    {t.transactionStatus.name}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="sm:hidden space-y-3">
        {data.map((t: any) => (
          <Card key={t.transactionExternalId} className="p-3">
            <div className="flex justify-between">
              <span className="font-mono text-xs">{t.transactionExternalId.slice(0, 8)}</span>
              <Badge
                color={
                  t.transactionStatus.name === 'PENDING'
                    ? 'amber'
                    : t.transactionStatus.name === 'APPROVED'
                      ? 'emerald'
                      : 'red'
                }
              >
                {t.transactionStatus.name}
              </Badge>
            </div>
            <div className="text-sm">
              {t.transactionType.name} • R$ {t.value}
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}
