package listutil

import "sync"

type AtomicList[T any] struct {
	mu    sync.RWMutex
	items []T
}

func NewAtomicList[T any]() *AtomicList[T] {
	return &AtomicList[T]{
		items: []T{},
	}
}

func (a *AtomicList[T]) Len() int32 {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return int32(len(a.items))
}

func (a *AtomicList[T]) Append(value T) int32 {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.items = append(a.items, value)
	return int32(len(a.items))
}

func (a *AtomicList[T]) GetAll() []T {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return a.items
}

func (a *AtomicList[T]) Set(values []T) {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.items = values
}
