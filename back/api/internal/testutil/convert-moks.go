package testutil

import (
	"fmt"
	"ismelen/inkomi/internal/domain/convert"
	"sync"
)

// PushNotifierMock is a test double for convert.PushNotifier.
type PushNotifierMock struct {
	mu       sync.Mutex
	messages []convert.PushMessage
}

func (s *PushNotifierMock) Init() error { return nil }

func (s *PushNotifierMock) Send(token string, msg convert.PushMessage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.messages = append(s.messages, msg)
	return nil
}

func (s *PushNotifierMock) Messages() []convert.PushMessage {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]convert.PushMessage, len(s.messages))
	copy(out, s.messages)
	return out
}

// CloudStorageMock is a test double for convert.CloudStorage.
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
