package dto

import "ismelen/inkomi/internal/domain/convert"

type TransactionStatusResponse struct {
	Id        string                                    `json:"id"`
	Status    convert.TransactionStatus                 `json:"status"`
	Total     int32                                     `json:"total"`
	Completed int32                                     `json:"completed"`
	Items     []TransactionStatusResponseItem           `json:"items"`
	Results   []TransactionStatusResultFileResponseItem `json:"results"`
}

type TransactionStatusResponseItem struct {
	Id       string                        `json:"id"`
	Filename string                        `json:"filename"`
	Status   convert.TransactionFileStatus `json:"status"`
	ResultId string                        `json:"resultId"`
}

type TransactionStatusResultFileResponseItem struct {
	Filename string `json:"filename"`
	Id       string `json:"id"`
}
