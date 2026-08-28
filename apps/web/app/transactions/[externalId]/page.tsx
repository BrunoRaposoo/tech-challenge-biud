'use client';
import { useTransaction } from '../../../lib/api/transactions.js';
export default function Detail({ params }: { params: { externalId: string } }) {
  const { data, isLoading, isError } = useTransaction(params.externalId);
  if (isLoading) return <div role="status">Carregando...</div>;
  if (isError) return <div role="alert">Erro</div>;
  if (!data) return <div role="status">Nenhuma transação</div>;
  return (
    <div>
      {data.transactionExternalId} - {data.transactionStatus.name} - {data.value}
    </div>
  );
}
