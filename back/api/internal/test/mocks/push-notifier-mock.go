package mocks

import (
	"ismelen/inkomi/internal/domain/convert"
	"sync"
)

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
