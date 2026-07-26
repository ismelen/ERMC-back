package convert

import (
	"fmt"
	"os"
	"path/filepath"
	"sync/atomic"
	"time"
)

type Transaction struct {
	Id             string
	status         atomic.Int32 // Waiting, Processing, Done, Canceled, Error, Merging
	Items          []*TransactionFile
	completedFiles atomic.Int32
	attachedItems  atomic.Int32
	Config         *TransactionConfig
	CreatedAt      time.Time
	Error          error
	ResultFiles    []*TransactionResultFile
	BasePath       string
}

func NewTransaction(id string, config *TransactionConfig, transPath string) *Transaction {
	t := &Transaction{
		Id:          id,
		CreatedAt:   time.Now(),
		Items:       make([]*TransactionFile, config.Cant),
		ResultFiles: make([]*TransactionResultFile, config.Cant),
		Config:      config,
		BasePath:    filepath.Join(transPath, id),
	}

	t.status.Store(int32(TransactionWaiting))
	return t
}

func (t *Transaction) Delete() {
	os.RemoveAll(t.BasePath)
}

func (t *Transaction) AttachedItems() int32 {
	return t.attachedItems.Load()
}

func (t *Transaction) Status() TransactionStatus {
	return TransactionStatus(t.status.Load())
}

func (t *Transaction) GetResultFile(id string) (*TransactionResultFile, error) {
	for i := range t.CompletedFiles() {
		result := t.ResultFiles[i]
		if result.Id == id {
			return result, nil
		}
	}

	return nil, fmt.Errorf("file doesn't exists")
}

func (t *Transaction) HasFinished() (bool, error) {
	status := t.Status()

	if status == TransactionCanceled {
		return false, fmt.Errorf("transaction canceled")
	}

	if status == TransactionDone {
		return false, fmt.Errorf("transaction finished")
	}

	return true, nil
}

func (t *Transaction) Done() {
	t.status.Store(int32(TransactionDone))
}

func (t *Transaction) Merging() {
	t.status.Store(int32(TransactionMerging))
}

func (t *Transaction) Processing() {
	t.status.Store(int32(TransactionProcessing))
}

func (t *Transaction) AttachFile(file *TransactionFile) (string, error) {
	if _, err := t.HasFinished(); err != nil {
		return "", err
	}

	attachedItems := t.attachedItems.Load()
	if attachedItems+1 > t.Config.Cant {
		return "", fmt.Errorf("files limit exceded")
	}

	t.Items[attachedItems] = file
	t.attachedItems.Add(1)

	if t.Status() == TransactionWaiting {
		t.status.Store(int32(TransactionProcessing))
	}

	return file.Id, nil
}

func (t *Transaction) Cancel() {
	t.status.Store(int32(TransactionCanceled))
}

func (t *Transaction) CompletedFiles() int32 {
	if t.Status() == TransactionDone {
		return int32(len(t.ResultFiles))
	}

	return int32(t.completedFiles.Load())
}

func (t *Transaction) SetResults(files []*TransactionResultFile) {
	t.ResultFiles = files
}

func (t *Transaction) AddResult(file *TransactionResultFile) (bool, error) {
	if _, err := t.HasFinished(); err != nil {
		return true, err
	}

	completedFiles := t.CompletedFiles()
	t.ResultFiles[completedFiles] = file
	t.completedFiles.Add(1)

	completed := (completedFiles + 1) >= t.Config.Cant
	if completed {
		if t.Config.Merge {
			t.Merging()
		} else {
			t.Done()
		}
	}

	return completed, nil
}
