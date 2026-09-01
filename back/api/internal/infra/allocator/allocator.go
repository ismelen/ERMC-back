package allocator

import "sync/atomic"

type Allocator struct {
	capacity int32
	current  atomic.Int32
}

func NewAllocator(capacity int32) *Allocator {
	return &Allocator{
		capacity: capacity,
	}
}

func (a *Allocator) Alloc(size int32) bool {
	for {
		value := a.current.Load()
		if value+size > a.capacity {
			return false
		}
		if a.current.CompareAndSwap(value, value+size) {
			return true
		}
	}
}

func (a *Allocator) Free(size int32) {
	for {
		value := a.current.Load()
		newSize := value - size
		if newSize < 0 {
			newSize = 0
		}
		if a.current.CompareAndSwap(value, newSize) {
			return
		}
	}
}
