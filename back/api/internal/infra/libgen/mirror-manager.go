package libgen

import (
	"ismelen/inkomi/internal/domain/book"
	"sync/atomic"
)

type MirrorManager struct {
	mirror     atomic.Value
	discoverer book.BookSourceDiscoverer
}

func NewMirrorManager(discoverer book.BookSourceDiscoverer) *MirrorManager {
	mm := &MirrorManager{
		discoverer: discoverer,
	}

	mm.discoverer.SetOnUpdate(func(bs book.BooksSource) {
		mm.mirror.Store(bs)
	})

	return mm
}

func (m *MirrorManager) GetMirror() (book.BooksSource, bool) {
	value := m.mirror.Load()
	if value == nil {
		return nil, false
	}

	mirror, ok := value.(book.BooksSource)
	return mirror, ok
}

func (m *MirrorManager) Refresh() bool {
	source := m.discoverer.UpdateSource()
	if source != nil {
		m.mirror.Store(source)
		return true
	}

	return false
}
