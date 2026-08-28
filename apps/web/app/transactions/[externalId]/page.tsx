'use client';
import { use } from 'react';
import { useTransaction } from '../../../lib/api/transactions';
export default function Detail({ params }: { params: Promise<{ externalId: string }> }) {
  const { externalId } = use(params);
  const { data, isLoading, isError } = useTransaction(externalId);
  if (isLoading) return <div role="status">Carregando...</div>;
  if (isError) return <div role="alert">Erro</div>;
  if (!data) return <div role="status">Nenhuma transação</div>;
  return (
    <div>
      {data.transactionExternalId} - {data.transactionStatus.name} - {data.value}
    </div>
  );
}
