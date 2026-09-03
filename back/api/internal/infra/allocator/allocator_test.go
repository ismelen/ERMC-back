package allocator

import (
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAllocator_ShouldAllocUpToCapacity(t *testing.T) {
	t.Parallel()

	// Arrange
	a := NewAllocator(5)

	// Act
	allocated := a.Alloc(5)

	// Assert
	assert.True(t, allocated, "expected Alloc(5) to return true on capacity 5")
}

func TestAllocator_ShouldNotAllocOverCapacity(t *testing.T) {
	t.Parallel()

	// Arrange
	a := NewAllocator(5)

	// Act
	a.Alloc(3)
	allocated := a.Alloc(3)

	// Assert
	assert.False(t, allocated, "expected Alloc(6) to return false on capacity 5")
}

func TestAllocator_WithMemoryAllocated_FreeShouldReduceUsage(t *testing.T) {
	t.Parallel()

	// Arrange
	a := NewAllocator(5)

	// Act
	allocatedFst := a.Alloc(5)
	a.Free(5)
	allocatedSnd := a.Alloc(5)

	// Assert
	assert.True(t, allocatedFst, "expected initial Alloc(5) to succeed")
	assert.True(t, allocatedSnd, "expected Alloc(5) to succeed after Free(5)")
}

func TestAllocator_FreeMoreThanCapacityShouldntGoNegative(t *testing.T) {
	t.Parallel()

	// Arrange
	a := NewAllocator(5)

	// Act
	a.Free(10)
	allocated := a.Alloc(5)

	// Assert
	assert.True(t, allocated, "expected Alloc(5) to succeed; Free should not go below 0")
}

func TestAllocator_ShouldNotAllocateNegativeSize(t *testing.T) {
	t.Parallel()

	// Arrange
	a := NewAllocator(5)

	// Act
	allocated := a.Alloc(-5)

	// Assert
	assert.False(t, allocated, "expected Alloc(-5) to fail")
}

func TestAllcoator_ShouldNotFreeNegativeSize(t *testing.T) {
	t.Parallel()

	// Arrange
	a := NewAllocator(5)

	// Act
	a.Alloc(5)
	a.Free(-5)
	allocated := a.Alloc(5)

	// Assert
	assert.False(t, allocated, "expected Alloc(5) to fail after Free(-5) with previous Alloc(5)")
}

func TestAllocator_ConcurrentAlloc(t *testing.T) {
	t.Parallel()

	// Arrange
	const (
		capacity   = 50
		goroutines = 100
	)
	a := NewAllocator(capacity)

	var (
		wg        sync.WaitGroup
		mu        sync.Mutex
		trueCount int
	)

	// Act
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()
			got := a.Alloc(1)
			mu.Lock()
			if got {
				trueCount++
			}
			mu.Unlock()
		}()
	}
	wg.Wait()

	// Assert
	assert.Equal(t, capacity, trueCount, "expected exactly %d successful allocs", capacity)
}
