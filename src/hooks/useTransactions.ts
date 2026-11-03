import { useGroupCollection } from "./useGroupCollection";
import type { Transaction } from "../types";

const byDateDesc = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date);

/** Group transactions, most recent first. */
export function useTransactions(groupId: string | null | undefined) {
  const { data, loading, error, retry } = useGroupCollection<Transaction>(
    "transactions",
    groupId,
    byDateDesc
  );
  return { transactions: data, loading, error, retry };
}

export default useTransactions;