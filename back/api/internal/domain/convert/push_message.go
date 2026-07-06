package convert

import "fmt"

type PushMessage struct {
	Title, Message, Id, Err, Type string
}

func NewCancelMessage(config *TransactionConfig) PushMessage {
	return PushMessage{
		Title:   "Canceled",
		Message: fmt.Sprintf("%s conversion canceled", config.Title),
		Id:      config.Id,
		Type:    "cancel",
	}
}

func NewErrorMessage(config *TransactionConfig, err error) PushMessage {
	return PushMessage{
		Title: "Error",
		Err:   err.Error(),
		Type:  "error",
		Id:    config.Id,
	}
}

func NewSuccessMessage(config *TransactionConfig, msg string) PushMessage {
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
