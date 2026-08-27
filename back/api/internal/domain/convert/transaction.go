package convert

import (
	"fmt"
	"ismelen/inkomi/internal/shared/listutil"
	"os"
	"path/filepath"
	"time"
)

type Transaction struct {
	Id          string
	Status      *AtomicTransactionState
	Items       *listutil.AtomicList[*TransactionFile]
	Results     *listutil.AtomicList[*TransactionResultFile]
	Config      *TransactionConfig
	CreatedAt   time.Time
	BasePath    string
	OnFreeSpace func(size int32)
}

func NewTransaction(id string, config *TransactionConfig, transPath string) *Transaction {
	t := &Transaction{
		Id:          id,
		CreatedAt:   time.Now(),
		Items:       listutil.NewAtomicList[*TransactionFile](),
		Results:     listutil.NewAtomicList[*TransactionResultFile](),
		Config:      config,
		BasePath:    filepath.Join(transPath, id),
		OnFreeSpace: func(size int32) {},
	}

	status, _ := NewAtomicTransactionState(TransactionWaiting)
	t.Status = status

	return t
}

func (t *Transaction) Cancel() {
	t.Status.Set(TransactionCanceled)
	t.Delete()
	t.OnFreeSpace(t.Config.Size)
}

func (t *Transaction) Delete() {
	os.RemoveAll(t.BasePath)
}

func (t *Transaction) DeleteItem(id string) bool {
	for i, item := range t.Items.GetAll() {
		if item.Id == id {
			t.Items.Delete(i)
			return true
		}
	}

	return false
}

func (t *Transaction) GetResultFile(id string) (*TransactionResultFile, error) {
	results := t.Results.GetAll()
	for _, result := range results {
		if result.Id == id {
			return result, nil
		}
	}

	return nil, fmt.Errorf("file doesn't exists")
}

func (t *Transaction) assertActive() error {
	if t.Status.Get() >= TransactionCanceled {
		return fmt.Errorf("transaction finished")
	}

	return nil
}

func (t *Transaction) AttachFile(file *TransactionFile) (string, error) {
	if err := t.assertActive(); err != nil {
		return "", err
	}

	if t.Items.Len() >= t.Config.Cant {
		return "", fmt.Errorf("files limit reached")
	}

	t.Items.Append(file)

	if t.Status.Get() == TransactionWaiting {
		t.Status.Set(TransactionProcessing)
	}

	return file.Id, nil
}

func (t *Transaction) AddResult(file *TransactionResultFile) (bool, error) {
	if err := t.assertActive(); err != nil {
		return true, err
	}

	newSize := t.Results.Append(file)
	completed := newSize >= t.Config.Cant

	if completed {
		if t.Config.Merge {
			t.Status.Set(TransactionMerging)
		} else {
			t.Status.Set(TransactionDone)
		}
	}

	return completed, nil
}
