package dto

import "ismelen/inkomi/internal/domain/convert"

type TransactionStartResponse struct {
	Id        string                   `json:"id"`
	Timestamp int64                    `json:"timestamp"`
	Status    convert.TransactionState `json:"status"`
}
