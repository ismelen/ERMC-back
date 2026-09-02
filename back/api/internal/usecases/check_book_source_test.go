package usecases

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"ismelen/inkomi/internal/testutil"
)

func newCheckUC(srv *httptest.Server, hasMirror bool, refreshResult bool) (*CheckBooksSourceUC, *testutil.BooksProviderMock) {
	url := ""
	if srv != nil {
		url = srv.URL
	}
	src := testutil.NewBooksSourceMock(url)
	prov := &testutil.BooksProviderMock{
		Source:        src,
		HasMirror:     hasMirror,
		RefreshResult: refreshResult,
	}
	return NewCheckBooksSourceUC(prov), prov
}

func TestCheckBooksSourceUC_MirrorAlive(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	uc, prov := newCheckUC(srv, true, false)

	ok, err := uc.Execute(context.Background())
	require.NoError(t, err)
	assert.True(t, ok)
	assert.False(t, prov.RefreshCalled)
}

func TestCheckBooksSourceUC_MirrorDead_RefreshCalled(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	uc, prov := newCheckUC(srv, true, false)

	_, err := uc.Execute(context.Background())
	require.NoError(t, err)
	assert.True(t, prov.RefreshCalled)
}

func TestCheckBooksSourceUC_MirrorDead_CooldownActive(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	uc, prov := newCheckUC(srv, true, false)

	uc.mu.Lock()
	uc.lastCheck = time.Now()
	uc.mu.Unlock()

	ok, err := uc.Execute(context.Background())
	require.NoError(t, err)
	assert.False(t, ok)
	assert.False(t, prov.RefreshCalled)
}

func TestCheckBooksSourceUC_NoMirror_RefreshSucceeds(t *testing.T) {
	t.Parallel()
	uc, prov := newCheckUC(nil, false, true)

	ok, err := uc.Execute(context.Background())
	require.NoError(t, err)
	assert.True(t, ok)
	assert.True(t, prov.RefreshCalled)
}

func TestCheckBooksSourceUC_NoMirror_RefreshFails(t *testing.T) {
	t.Parallel()
	uc, prov := newCheckUC(nil, false, false)

	ok, err := uc.Execute(context.Background())
	require.NoError(t, err)
	assert.False(t, ok)
	assert.True(t, prov.RefreshCalled)
}
