package mocks

import (
	"fmt"
	"sync"
)

type CloudStorageMock struct {
	ShouldError   bool
	mu            sync.Mutex
	UploadedPaths []string
}

func (s *CloudStorageMock) Upload(path, token, folder string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.ShouldError {
		return fmt.Errorf("upload error")
	}
	s.UploadedPaths = append(s.UploadedPaths, path)
	return nil
}
