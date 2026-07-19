package dto

import "ismelen/inkomi/internal/domain/convert"

type TransactionStatusResponse struct {
	Id        string                          `json:"id"`
	Status    convert.TransactionStatus       `json:"status"`
	Total     int32                           `json:"total"`
	Completed int32                           `json:"completed"`
	Items     []TransactionStatusResponseItem `json:"items"`
}

type TransactionStatusResponseItem struct {
	Filename string                        `json:"filename"`
	Status   convert.TransactionFileStatus `json:"status"`
}
