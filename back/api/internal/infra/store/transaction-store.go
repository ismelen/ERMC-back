package store

import (
	"fmt"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/shared/uid"
	"sync"
	"time"
)

type TransactionStore struct {
	transactions sync.Map
}

func NewTransactionStore() *TransactionStore {
	return &TransactionStore{}
}

func (t *TransactionStore) StartTransaction(config *convert.TransactionConfig, transPath string) *convert.Transaction {
	id := uid.GetRandomID(8)
	tran := convert.NewTransaction(id, config, transPath)
	t.transactions.Store(id, tran)

	time.AfterFunc(4*time.Hour, func() {
		tran.Delete()
		t.transactions.Delete(id)
	})

	return tran
}

func (t *TransactionStore) GetTransaction(id string) (*convert.Transaction, error) {
	v, ok := t.transactions.Load(id)
	if !ok {
		return nil, fmt.Errorf("transaction doesn't exists")
	}

	tran, ok := v.(*convert.Transaction)
	if !ok {
		return nil, fmt.Errorf("corrupted transaction data")
	}

	return tran, nil
}
