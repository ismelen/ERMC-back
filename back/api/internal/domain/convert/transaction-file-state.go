package convert

import (
	"encoding/json"
	"fmt"
)

type TransactionFileStatus int32

const (
	TransactionFilePending TransactionFileStatus = iota
	TransactionFileProcessing
	TransactionFileDone
	TransactionFileError
)

func (state TransactionFileStatus) String() string {
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

func (s TransactionFileStatus) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.String())
}

func (state *TransactionFileStatus) UnmarshalJSON(data []byte) error {
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
