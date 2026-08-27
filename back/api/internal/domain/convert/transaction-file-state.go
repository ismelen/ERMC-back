package convert

import (
	"encoding/json"
	"fmt"
)

type TransactionFileState int32

const (
	TransactionFilePending TransactionFileState = iota
	TransactionFileProcessing
	TransactionFileDone
	TransactionFileError
)

func (state TransactionFileState) String() string {
	switch state {
	case TransactionFilePending:
		return "pending"
	case TransactionFileProcessing:
		return "processing"
	case TransactionFileDone:
		return "done"
	case TransactionFileError:
		return "error"
	default:
		return "unknown"
	}
}

func (s TransactionFileState) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.String())
}

func (state *TransactionFileState) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}
	switch str {
	case "pending":
		*state = TransactionFilePending
	case "processing":
		*state = TransactionFileProcessing
	case "done":
		*state = TransactionFileDone
	case "error":
		*state = TransactionFileError
	default:
		return fmt.Errorf("estado desconocido: %q", str)
	}
	return nil
}
