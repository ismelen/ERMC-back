package allocator

import (
	"fmt"
	"sync"
)

type item[T any] struct {
	data      *T
	size      int32
	onExecute func()
}

type Queue[T any] struct {
	mu        sync.RWMutex
	allocator *Allocator
	queue     []*item[*T]
	capacity  int
	index     int
	cant      int
}

func NewQueue[T any](allocator *Allocator, capacity int) *Queue[T] {
	return &Queue[T]{
		allocator: allocator,
		queue:     make([]*item[*T], capacity),
		capacity:  capacity,
		index:     -1,
	}
}

func (a *Queue[T]) AllocOrPush(value *T, size int32, onExecute func()) (bool, error) {
	a.mu.Lock()

	if size > a.allocator.capacity {
		a.mu.Unlock()
		return false, fmt.Errorf("Transaction too big")
	}

	nextIdx, isEqual := a.getNextIdx()
	if isEqual || a.queue[nextIdx] != nil {
		a.mu.Unlock()
		return false, fmt.Errorf("The queue is full")
	}

	if a.cant > 0 {
		a.push(nextIdx, value, size, onExecute)
		a.mu.Unlock()
		return false, nil
	}

	if allocated := a.allocator.Alloc(size); allocated {
		a.index = nextIdx
		a.mu.Unlock()

		if onExecute != nil {
			onExecute()
		}
		return true, nil
	}

	a.push(nextIdx, value, size, onExecute)
	a.mu.Unlock()
	return false, nil
}

func (a *Queue[T]) push(idx int, value *T, size int32, onExecute func()) {
	a.queue[idx] = &item[*T]{&value, size, onExecute}
	a.cant++
	a.index++
}

func (a *Queue[T]) Free(size int32) {
	a.mu.Lock()
	a.allocator.Free(size)

	var toExecute []func()
	n := a.cant
	for i := 0; i < n; i++ {
		idx := (a.index - a.cant + 1) % a.capacity
		item := a.queue[idx]
		if allocated := a.allocator.Alloc(item.size); !allocated {
			break
		}

		if item.onExecute != nil {
			toExecute = append(toExecute, item.onExecute)
		}
		a.queue[idx] = nil
		a.cant--
	}
	a.mu.Unlock()

	for _, fn := range toExecute {
		fn()
	}
}

func (a *Queue[T]) getNextIdx() (newIndex int, isEqual bool) {
	newIndex = (a.index + 1) % a.capacity
	isEqual = newIndex == a.index

	return
}
