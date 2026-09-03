package libgen

import (
	"context"
	"fmt"
	"ismelen/inkomi/internal/domain/book"
	"log"
	"net/http"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

type SourceDiscoverer struct {
	singleUpdater singleflight.Group
	lastCheckMu   sync.RWMutex
	lastCheck     time.Time
	onUpdate      func(book.BooksSource)
}

func NewSourceDiscoverer() *SourceDiscoverer {
	return &SourceDiscoverer{}
}

func (s *SourceDiscoverer) Start(ctx context.Context, interval time.Duration) {
	go func() {
		if source := s.UpdateSource(); source != nil {
			s.onUpdate(source)
		}

		ticker := time.NewTicker(interval)
		for {
			select {
			case <-ticker.C:
				if source := s.UpdateSource(); source != nil {
					s.onUpdate(source)
				}
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()
}

func (s *SourceDiscoverer) SetOnUpdate(onUpdate func(book.BooksSource)) {
	s.onUpdate = onUpdate
}

func (s *SourceDiscoverer) UpdateSource() book.BooksSource {
	mirror, err, _ := s.singleUpdater.Do("refresh", func() (any, error) {
		mirrors := getMirrors()

		fastest, ok := s.getFastestMirror(mirrors)

		s.lastCheckMu.Lock()
		s.lastCheck = time.Now()
		s.lastCheckMu.Unlock()

		if !ok {
			return nil, fmt.Errorf("Couldn't update mirror")
		}

		log.Printf("New mirror: %s", fastest.GetURL())
		return fastest, nil
	})

	if err != nil {
		log.Print(err.Error())
		return nil
	}

	return mirror.(book.BooksSource)
}

func (s *SourceDiscoverer) getFastestMirror(mirrors []book.BooksSource) (book.BooksSource, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()

	winner := make(chan book.BooksSource, 1)
	var once sync.Once

	client := &http.Client{
		Timeout: 12 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	for _, m := range mirrors {
		go func(m book.BooksSource) {
			req, err := http.NewRequestWithContext(ctx, "GET", m.GetURL()+"/", nil)
			if err != nil {
				return
			}

			req.Header.Set("User-Agent", "Mozilla/5.0")
			resp, err := client.Do(req)
			if err != nil {
				return
			}
			resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return
			}

			once.Do(func() { winner <- m })
		}(m)
	}

	select {
	case m := <-winner:
		return m, true
	case <-ctx.Done():
		return nil, false
	}
}
