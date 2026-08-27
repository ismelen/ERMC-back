package store

import (
	"fmt"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/infra/allocator"
	"ismelen/inkomi/internal/shared/uid"
	"sync"
	"time"
)

type TransactionStore struct {
	transactions sync.Map
	queue        *allocator.Queue[convert.Transaction]
}

func NewTransactionStore() *TransactionStore {
	return &TransactionStore{
		queue: allocator.NewQueue[convert.Transaction](
			&allocator.Allocator{},
			5<<20,
		),
	}
}

func (t *TransactionStore) StartTransaction(config *convert.TransactionConfig, transPath string) *convert.Transaction {
	id := uid.GetRandomID(8)
	tran := convert.NewTransaction(id, config, transPath)
	// allocated, error := t.queue.AllocOrPush(tran, config.Size, func() {
	// 	//TODO: On execute
	// 	tran.Status()
	// })
	// if err != nil {
	// 	tran.Cancel()
	// 	return tran
	// }

	//!TODO: tran.Status(allocated ? Enqueued : Waiting)

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
