package convert

import (
	"encoding/json"
	"fmt"
)

type PushMessage struct {
	Title, Message, Id, Err, Type string
	data                          map[string]string
}

func NewCancelMessage(tran *Transaction, file *TransactionResultFile) PushMessage {
	return PushMessage{
		Title:   "Canceled",
		Message: fmt.Sprintf("%s conversion canceled", file.Name),
		Id:      tran.Id,
		Type:    "cancel",
	}
}

func NewErrorMessage(tran *Transaction, err error) PushMessage {
	return PushMessage{
		Title: "Error",
		Err:   err.Error(),
		Type:  "error",
		Id:    tran.Id,
	}
}

func NewSuccessMessage(tran *Transaction, msg string) PushMessage {
	return PushMessage{
		Title:   "Success",
		Type:    "success",
		Message: msg,
	}
}

func (p *PushMessage) Data() map[string]string {
	raw, err := json.Marshal(p.data)
	if err != nil {
		return map[string]string{"error": err.Error()}
	}

	return map[string]string{"data": string(raw)}
}
