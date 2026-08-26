package allocator

import "sync/atomic"

type Allocator struct {
	max     int32
	current atomic.Int32
}

func (a *Allocator) Alloc(size int32) bool {
	value := a.current.Load()
	if value+size > a.max {
		return false
	}

	a.current.Add(size)
	return true
}

func (a *Allocator) Free(size int32) {
	value := a.current.Load()
	newSize := value - size
	if newSize < 0 {
		newSize = 0
	}

	a.current.Store(newSize)
}
