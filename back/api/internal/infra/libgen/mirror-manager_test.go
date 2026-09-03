package libgen

import (
	"ismelen/inkomi/internal/test/mocks"
	"testing"
)

func TestMirrorManager_GetMirror_InitiallyEmpty_ShouldReturnFalse(t *testing.T) {
	disc := &mocks.BookSourceDiscovererMock{}
	mm := NewMirrorManager(disc)

	_, ok := mm.GetMirror()
	if ok {
		t.Error("Expected false when no mirror is set")
	}
}

func TestMirrorManager_GetMirror_SetOnUpdate_StoresMirror(t *testing.T) {
	disc := &mocks.BookSourceDiscovererMock{}
	mm := NewMirrorManager(disc)

	expectedURL := "http://test.com"
	if disc.OnUpdate != nil {
		disc.OnUpdate(&mocks.BooksSourceMock{URL: expectedURL})
	} else {
		t.Fatal("OnUpdate callback was not set by NewMirrorManager")
	}

	mirror, ok := mm.GetMirror()
	if !ok || mirror.GetURL() != expectedURL {
		t.Errorf("Expected mirror with url %s, got %v (ok: %v)", expectedURL, mirror, ok)
	}
}

func TestMirrorManager_Refresh_Success_ShouldReturnTrue(t *testing.T) {
	disc := &mocks.BookSourceDiscovererMock{}
	mm := NewMirrorManager(disc)

	expectedURL := "http://test2.com"
	disc.Source = &mocks.BooksSourceMock{URL: expectedURL}

	refreshed := mm.Refresh()
	if !refreshed {
		t.Error("Expected Refresh to return true")
	}

	mirror, ok := mm.GetMirror()
	if !ok || mirror.GetURL() != expectedURL {
		t.Errorf("Expected mirror with url %s, got %v (ok: %v)", expectedURL, mirror, ok)
	}
}

func TestMirrorManager_Refresh_NilSource_ShouldReturnFalse(t *testing.T) {
	disc := &mocks.BookSourceDiscovererMock{}
	mm := NewMirrorManager(disc)

	// Set an initial mirror
	expectedURL := "http://initial.com"
	if disc.OnUpdate != nil {
		disc.OnUpdate(&mocks.BooksSourceMock{URL: expectedURL})
	}

	// Try to refresh with a nil source
	disc.Source = nil
	refreshed := mm.Refresh()
	if refreshed {
		t.Error("Expected Refresh to return false when source is nil")
	}

	// The old mirror should still be present
	mirror, ok := mm.GetMirror()
	if !ok || mirror.GetURL() != expectedURL {
		t.Errorf("Expected mirror with url %s, got %v (ok: %v)", expectedURL, mirror, ok)
	}
}
