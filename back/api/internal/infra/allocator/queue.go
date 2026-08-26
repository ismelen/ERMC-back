package allocator

import (
	"fmt"
	"sync/atomic"
)

type item[T any] struct {
	data      *T
	size      int32
	onExecute func()
}

type Queue[T any] struct {
	allocator *Allocator
	queue     []item[*T]
	capacity  int32
	index     atomic.Int32
	cant      atomic.Int32
}

func NewQueue[T any](allocator *Allocator, capacity int32) *Queue[T] {
	return &Queue[T]{
		allocator: allocator,
		queue:     make([]item[*T], 0, capacity),
		capacity:  capacity,
	}
}

func (a *Queue[T]) AllocOrPush(value *T, size int32, onExecute func()) (bool, error) {
	if size > a.allocator.max {
		return false, fmt.Errorf("Transaction too big")
	}

	idx := a.index.Load()
	if idx > 0 {
		a.push(idx, value, size, onExecute)
		return false, nil
	}

	if allocated := a.allocator.Alloc(size); allocated {
		onExecute()
		return true, nil
	}

	a.push(idx, value, size, onExecute)
	return false, nil
}

func (a *Queue[T]) push(idx int32, value *T, size int32, onExecute func()) {
	a.queue[idx] = item[*T]{&value, size, onExecute}
	a.index.Add(1)
	a.cant.Add(1)
}

func (a *Queue[T]) Free(size int32) {
	a.allocator.Free(size)

	cant := a.cant.Load()
	index := a.index.Load()
	for i := range index - cant {
		item := a.queue[index-cant+i]
		if allocated := a.allocator.Alloc(item.size); !allocated {
			break
		}
		item.onExecute()
		a.cant.Add(-1)
	}
}
