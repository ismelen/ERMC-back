package allocator

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var val int = 42

func onExecute(dst *bool) func() {
	return func() {
		*dst = true
	}
}

func TestQueue_WithNoItems_ShouldAllocDirectly(t *testing.T) {
	t.Parallel()

	// Arrange
	q := NewQueue[int](NewAllocator(10), 5)
	executed := false

	// Act
	ok, err := q.AllocOrPush(&val, 1, onExecute(&executed))

	// Assert
	require.NoError(t, err)
	assert.True(t, ok)
	assert.True(t, executed)
}

func TestQueue_WithAllocFull_ShouldEnqueue(t *testing.T) {
	t.Parallel()

	// Arrange
	a := NewAllocator(4)
	q := NewQueue[int](a, 5)
	executed := false
	require.True(t, a.Alloc(4), "arrange: could not fill allocator")

	// Act
	ok, err := q.AllocOrPush(&val, 1, onExecute(&executed))

	// Assert
	require.NoError(t, err)
	assert.False(t, ok)
	assert.False(t, executed)
}

func TestQueue_WithQueueFull_ShouldNotAllocNorEnqueueAndReturnError(t *testing.T) {
	t.Parallel()

	// Arrange
	q := NewQueue[int](NewAllocator(4), 1)
	executed := false

	ok, err := q.AllocOrPush(&val, 1, nil)
	require.True(t, ok, "arrange: could not fill allocator")
	require.NoError(t, err)

	// Act
	ok, err = q.AllocOrPush(&val, 1, onExecute(&executed))

	// Assert
	require.Error(t, err)
	assert.False(t, ok)
	assert.False(t, executed)
}

func TestQueue_WithBigSizeTry_ShouldReturnError(t *testing.T) {
	t.Parallel()

	// Arrange
	q := NewQueue[int](NewAllocator(1), 2)
	executed := false

	// Act
	ok, err := q.AllocOrPush(&val, 2, onExecute(&executed))

	// Assert
	require.Error(t, err)
	assert.False(t, ok)
	assert.False(t, executed)
}

func TestQueue_FreeWithItemsOnQueueThatFits_ShouldTryAllocQueueItems(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name                                     string
		fstCap, sndCap                           int32
		expectedFstExecuted, expectedSndExecuted bool
	}{
		{"2 enqueued items fits", 1, 1, true, true},
		{"1 enqueued item fits but the other not", 1, 2, true, false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			q := NewQueue[int](NewAllocator(2), 3)
			q.AllocOrPush(&val, 2, nil)
			fstExecuted, sndExecuted := false, false

			q.AllocOrPush(&val, c.fstCap, onExecute(&fstExecuted))
			require.False(t, fstExecuted)

			q.AllocOrPush(&val, c.sndCap, onExecute(&sndExecuted))
			require.False(t, sndExecuted)

			// Act
			q.Free(2)

			// Assert
			assert.Equal(t, fstExecuted, c.expectedFstExecuted)
			assert.Equal(t, sndExecuted, c.expectedSndExecuted)
		})
	}
}
