package convert

import (
	"fmt"
	"sync/atomic"
	"time"
)

type Transaction struct {
	Id             string
	status         atomic.Int32 // Waiting, Processing, Done, Canceled, Error
	Items          []*TransactionFile
	completedFiles atomic.Int32
	AttachedItems  atomic.Int32
	Config         *TransactionConfig
	CreatedAt      time.Time
	Error          error
	ResultFiles    []*TransactionResultFile
}

func NewTransaction(id string, config *TransactionConfig) *Transaction {
	t := &Transaction{
		Id:          id,
		CreatedAt:   time.Now(),
		Items:       make([]*TransactionFile, 0, config.Cant),
		ResultFiles: make([]*TransactionResultFile, 0, config.Cant),
	}

	t.status.Store(int32(TransactionWaiting))
	return t
}

func (t *Transaction) Status() TransactionStatus {
	return TransactionStatus(t.status.Load())
}

func (t *Transaction) GetResultFile(id string) (*TransactionResultFile, error) {
	for _, file := range t.Items {
		if file.Id == id {
			if file.Result == nil {
				return nil, fmt.Errorf("file not processed yet")
			}
			return file.Result, nil
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

func (t *Transaction) Processing() {
	t.status.Store(int32(TransactionProcessing))
}

func (t *Transaction) AttachFile(file *TransactionFile) (string, error) {
	if _, err := t.HasFinished(); err != nil {
		return "", err
	}

	attachedItems := t.AttachedItems.Load()
	if attachedItems+1 > t.Config.Cant {
		return "", fmt.Errorf("files limit exceded")
	}

	t.Items[attachedItems] = file
	t.AttachedItems.Add(1)

	if t.Status() == TransactionWaiting {
		t.status.Store(int32(TransactionProcessing))
	}

	return file.Id, nil
}

func (t *Transaction) Cancel() {
	t.status.Store(int32(TransactionCanceled))
}

func (t *Transaction) CompletedFiles() int32 {
	return int32(t.completedFiles.Load())
}

func (t *Transaction) AddResult(file *TransactionResultFile) (bool, error) {
	if _, err := t.HasFinished(); err != nil {
		return true, err
	}

	completedFiles := t.CompletedFiles()
	t.ResultFiles[completedFiles] = file
	t.completedFiles.Add(1)

	completed := completedFiles >= t.Config.Cant
	if completed {
		t.Done()
	}

	return completed, nil
}
