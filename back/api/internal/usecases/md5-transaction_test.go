package usecases

import (
	"bytes"
	"io"
	"ismelen/inkomi/internal/domain/book"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/test/mocks"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMD5UC_Process(t *testing.T) {
	t.Parallel()
	// Arrange
	tempDir := t.TempDir()

	mockSource := &mocks.BooksSourceMock{
		DownloadResult: &book.LibgenDownload{
			Stream:   io.NopCloser(bytes.NewBufferString("dummy book data")),
			Filename: "downloaded_book.epub",
		},
	}
	mockProvider := &mocks.BooksProviderMock{
		Source:    mockSource,
		HasMirror: true,
	}

	downloadUC := NewDownloadBookUC(mockProvider)
	mockPush := &mocks.MockPushNotifier{}
	mockCloud := &mocks.MockCloudStorage{}

	uc := NewMd5TransactionUC(mockPush, mockCloud, downloadUC)

	file := &convert.TransactionFile{
		Id:      "file1",
		Name:    "test_md5",
		SrcPath: "some-md5-hash",
		Size:    0,
	}
	tran := &convert.Transaction{
		Id: "tran1",
	}

	// Act
	result := uc.Process(file, tran, tempDir)

	// Assert
	assert.NotNil(t, result, "Expected result, got nil")
	if result != nil {
		assert.Equal(t, "downloaded_book", result.Name, "Expected result name downloaded_book")
		expectedPath := filepath.Join(tempDir, "tran1", "file1", "downloaded_book.epub")
		assert.Equal(t, expectedPath, result.Path, "Expected path to match")
	}
}
