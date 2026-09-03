package store_test

import (
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/infra/allocator"
	"ismelen/inkomi/internal/infra/store"
	"testing"

	"github.com/stretchr/testify/assert"
)

func minimalConfig(t *testing.T, size int32) *convert.TransactionConfig {
	t.Helper()

	return &convert.TransactionConfig{
		Cant: 1,
		Size: size,
		Type: "cbz",
	}
}

func TestTransactionStore_OnStart_WithEmptyQueueShouldAllocImmediately(t *testing.T) {
	t.Parallel()

	// Arrange
	s := store.NewTransactionStore(
		allocator.NewQueue[convert.Transaction](
			allocator.NewAllocator(10),
			2,
		),
	)
	finallyAllocated := 0

	// Act
	tran := s.StartTransaction(minimalConfig(t, 5), t.TempDir(), func(id string) {
		finallyAllocated++
	})

	// Assert
	assert.Equal(t, tran.Status.Get(), convert.TransactionWaiting)
	assert.Equal(t, finallyAllocated, 0)
}

func TestTransactionStore_OnStart_WithFullQueueShouldCancelTransaction(t *testing.T) {
	t.Parallel()

	// Arrange
	s := store.NewTransactionStore(
		allocator.NewQueue[convert.Transaction](
			allocator.NewAllocator(10),
			1,
		),
	)
	finallyAllocated := 0
	s.StartTransaction(minimalConfig(t, 5), t.TempDir(), func(id string) {
		finallyAllocated++
	})

	// Act
	tran := s.StartTransaction(minimalConfig(t, 5), t.TempDir(), func(id string) {
		finallyAllocated++
	})

	// Assert
	assert.Equal(t, tran.Status.Get(), convert.TransactionCanceled)
	assert.Equal(t, finallyAllocated, 0)
}

func TestTransactionStore_OnStart_WithAlmostFullQueueShouldBeEnqueued(t *testing.T) {
	t.Parallel()

	// Arrange
	s := store.NewTransactionStore(
		allocator.NewQueue[convert.Transaction](
			allocator.NewAllocator(2),
			2,
		),
	)
	finallyAllocated := 0
	s.StartTransaction(minimalConfig(t, 1), t.TempDir(), func(id string) {
		finallyAllocated++
	})

	// Act
	tran := s.StartTransaction(minimalConfig(t, 2), t.TempDir(), func(id string) {
		finallyAllocated++
	})

	// Assert
	assert.Equal(t, convert.TransactionEnqueued, tran.Status.Get())
	assert.Equal(t, 0, finallyAllocated)
}

func TestTransactionStore_OnStart_WithAlmostFullQueueShouldRunOnAllocateAfterFree(t *testing.T) {
	t.Parallel()

	// Arrange
	s := store.NewTransactionStore(
		allocator.NewQueue[convert.Transaction](
			allocator.NewAllocator(2),
			2,
		),
	)
	finallyAllocated := 0
	fstTran := s.StartTransaction(minimalConfig(t, 1), t.TempDir(), func(id string) {
		finallyAllocated++
	})

	// Act
	sndTran := s.StartTransaction(minimalConfig(t, 2), t.TempDir(), func(id string) {
		finallyAllocated++
	})
	assert.Equal(t, convert.TransactionEnqueued, sndTran.Status.Get())
	assert.Equal(t, 0, finallyAllocated)

	fstTran.OnFreeSpace(fstTran.Config.Size)

	// Assert
	assert.Equal(t, finallyAllocated, 1)
}

func TestTransactionStore_OnGetTransactionWithId_ShouldReturnExpected(t *testing.T) {
	t.Parallel()
	// Arrange
	s := store.NewTransactionStore(
		allocator.NewQueue[convert.Transaction](
			allocator.NewAllocator(2),
			2,
		),
	)
	expectedTran := s.StartTransaction(minimalConfig(t, 1), t.TempDir(), func(id string) {})

	cases := []struct {
		name             string
		id               string
		expected         *convert.Transaction
		shouldThrowError bool
	}{
		{"not-stored", "not-stored", nil, true},
		{"stored", expectedTran.Id, expectedTran, false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()

			// Act
			tran, err := s.GetTransaction(c.id)

			// Assert
			assert.Equal(t, c.expected, tran)

			if c.shouldThrowError {
				assert.Error(t, err)
			}
		})
	}
}
