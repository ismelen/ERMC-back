package convert

import (
	"encoding/json"
	"fmt"
)

type TransactionState int32

const (
	TransactionWaiting TransactionState = iota
	TransactionProcessing
	TransactionMerging
	TransactionEnqueued
	// Do not touch below
	TransactionCanceled
	TransactionDone
	TransactionError
)

func (s TransactionState) IsValid() bool {
	return s <= TransactionError
}

func (state TransactionState) String() string {
	switch state {
	case TransactionWaiting:
		return "waiting"
	case TransactionProcessing:
		return "processing"
	case TransactionDone:
		return "done"
	case TransactionCanceled:
		return "canceled"
	case TransactionError:
		return "error"
	case TransactionMerging:
		return "merging"
	case TransactionEnqueued:
		return "enqueued"
	default:
		return "unknown"
	}
}

func (s TransactionState) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.String())
}

func (state *TransactionState) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}
	switch str {
	case "waiting":
		*state = TransactionWaiting
	case "processing":
		*state = TransactionProcessing
	case "done":
		*state = TransactionDone
	case "canceled":
		*state = TransactionCanceled
	case "error":
		*state = TransactionError
	case "merging":
		*state = TransactionMerging
	case "enqueued":
		*state = TransactionEnqueued
	default:
		return fmt.Errorf("estado desconocido: %q", str)
	}
	return nil
}
