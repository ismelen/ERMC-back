package convert

import "fmt"

type PushMessage struct {
	Title, Message, Id, Err, Type string
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

func (p *PushMessage) ToMap() map[string]string {
	return map[string]string{
		"title":   p.Title,
		"message": p.Message,
		"id":      p.Id,
		"error":   p.Err,
	}
}
