package convert

import (
	"fmt"
	"sync/atomic"
)

type AtomicTransactionState struct {
	value atomic.Int32
}

func NewAtomicTransactionState(initial TransactionState) (*AtomicTransactionState, error) {
	atomicState := &AtomicTransactionState{}
	if err := atomicState.Set(initial); err != nil {
		return nil, err
	}

	return atomicState, nil
}

func (a *AtomicTransactionState) Get() TransactionState {
	return TransactionState(a.value.Load())
}

func (a *AtomicTransactionState) Set(newState TransactionState) error {
	if !newState.IsValid() {
		return fmt.Errorf("not valid state")
	}

	a.value.Store(int32(newState))
	return nil
}
