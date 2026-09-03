package mocks

type MockCloudStorage struct {
	UploadCalled bool
	UploadError  error
	LastPath     string
}

func (m *MockCloudStorage) Upload(path, token, folder string) error {
	m.UploadCalled = true
	m.LastPath = path
	return m.UploadError
}
