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

func NewTransactionStore(queue *allocator.Queue[convert.Transaction]) *TransactionStore {
	return &TransactionStore{
		queue: queue,
	}
}

func (t *TransactionStore) StartTransaction(config *convert.TransactionConfig, transPath string, onAllocated func(id string)) *convert.Transaction {
	id := uid.GetRandomID(8)
	tran := convert.NewTransaction(id, config, transPath)

	allocated, err := t.queue.AllocOrPush(tran, config.Size, func() {
		if tran.Status.Get() != convert.TransactionEnqueued {
			return
		}

		tran.Status.Set(convert.TransactionWaiting)
		onAllocated(id)
	})
	if err != nil {
		tran.Status.Set(convert.TransactionCanceled)
		return tran
	}

	if !allocated {
		tran.Status.Set(convert.TransactionEnqueued)
	}

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
