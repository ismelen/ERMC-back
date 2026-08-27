package convert

import (
	"path/filepath"
	"strings"
)

type TransactionFile struct {
	Id      string
	Name    string
	Size    int64
	status  TransactionFileState // Pending, Processing, Done, Error
	SrcPath string
	Error   error
	Result  *TransactionResultFile
}

func NewTransactionFile(id, filename, path string, size int64) *TransactionFile {
	ext := filepath.Ext(filename)
	t := &TransactionFile{
		Id:      id,
		Name:    strings.TrimSuffix(filename, ext),
		Size:    size,
		SrcPath: path,
	}

	t.status = TransactionFilePending
	return t
}

func (t *TransactionFile) Status() TransactionFileState {
	return t.status
}

func (t *TransactionFile) Processing() {
	t.status = TransactionFileProcessing
}

func (t *TransactionFile) Done() {
	t.status = TransactionFileDone
}

func (t *TransactionFile) SetError(err error) {
	t.status = TransactionFileError
	t.Error = err
}

func (t *TransactionFile) SetResult(result *TransactionResultFile) {
	t.Result = result
}
