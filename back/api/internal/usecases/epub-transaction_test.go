package usecases

import (
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/test/mocks"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEpubTransactionUC_Process_Normal_ShouldProcess(t *testing.T) {
	t.Parallel()
	// Arrange
	tempDir := t.TempDir()

	mockPush := &mocks.MockPushNotifier{}
	mockCloud := &mocks.MockCloudStorage{}

	uc := NewEpubTransactionUC(mockPush, mockCloud)

	file := &convert.TransactionFile{
		Id:      "file1",
		Name:    "test_epub",
		SrcPath: filepath.Join(tempDir, "test.epub"),
		Size:    1024,
	}
	tran := &convert.Transaction{
		Id: "tran1",
	}

	// Act
	result := uc.Process(file, tran, tempDir)

	// Assert
	assert.NotNil(t, result, "Expected result, got nil")
	assert.Equal(t, "test_epub", result.Name, "Expected result name test_epub")
	assert.Equal(t, int64(1024), result.Size, "Expected size 1024")
	assert.Len(t, result.Files, 1, "Expected 1 file in result.Files")
	assert.Equal(t, "file1", result.Files[0].Id, "Expected to contain the original file in result.Files")
}
