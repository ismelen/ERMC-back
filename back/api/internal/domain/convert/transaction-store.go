package convert

// TransactionStoreI is the port implemented by infra/store to manage in-memory transactions.
type TransactionStoreI interface {
	StartTransaction(config *TransactionConfig, transPath string, onFinallyAllocated func(id string)) *Transaction
	GetTransaction(id string) (*Transaction, error)
}
