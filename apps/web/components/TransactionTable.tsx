'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusBadge } from './StatusBadge';
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
      <div role="status" aria-live="polite">
        Carregando...
      </div>
    );
  if (isError)
    return (
      <div role="alert">
        Erro <button onClick={() => refetch?.()}>Tentar novamente</button>
      </div>
    );
  if (!data || data.length === 0)
    return (
      <div role="status" aria-label="Nenhuma transação encontrada">
        Nenhuma transação encontrada
      </div>
    );
  return (
    <table>
      <tbody>
        {data.map((t: any) => (
          <tr key={t.transactionExternalId}>
            <td>{t.transactionExternalId}</td>
            <td>{t.transactionType.name}</td>
            <td>{t.value}</td>
            <td role="cell">
              <StatusBadge status={t.transactionStatus.name} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
