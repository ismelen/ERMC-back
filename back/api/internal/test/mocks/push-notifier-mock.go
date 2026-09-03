package mocks

import "ismelen/inkomi/internal/domain/convert"

type MockPushNotifier struct {
	SendCalled bool
	LastToken  string
	LastData   convert.PushMessage
}

func (m *MockPushNotifier) Init() error {
	return nil
}

func (m *MockPushNotifier) Send(token string, data convert.PushMessage) error {
	m.SendCalled = true
	m.LastToken = token
	m.LastData = data
	return nil
}
