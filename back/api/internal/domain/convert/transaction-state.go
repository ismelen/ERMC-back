package convert

import (
	"encoding/json"
	"fmt"
)

type TransactionStatus int32

const (
	TransactionWaiting TransactionStatus = iota
	TransactionProcessing
	TransactionDone
	TransactionCanceled
	TransactionError
)

func (state TransactionStatus) String() string {
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
	default:
		return "unknown"
	}
}

func (s TransactionStatus) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.String())
}

func (state *TransactionStatus) UnmarshalJSON(data []byte) error {
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
	default:
		return fmt.Errorf("estado desconocido: %q", str)
	}
	return nil
}
