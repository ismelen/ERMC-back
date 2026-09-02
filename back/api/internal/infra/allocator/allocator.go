package allocator

import (
	"sync"
)

type Allocator struct {
	capacity int32
	current  int32
	mu       sync.RWMutex
}

func NewAllocator(capacity int32) *Allocator {
	return &Allocator{
		capacity: capacity,
	}
}

func (a *Allocator) Alloc(size int32) bool {
	if size < 0 {
		return false
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	newSize := a.current + size
	if newSize > a.capacity {
		return false
	}

	a.current = newSize
	return true
}

func (a *Allocator) Free(size int32) {
	if size < 0 {
		return
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	newSize := a.current - size
	if newSize < 0 {
		newSize = 0
	}

	a.current = newSize
}
