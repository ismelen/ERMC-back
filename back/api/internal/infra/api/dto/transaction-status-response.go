package dto

import (
	"ismelen/inkomi/internal/domain/convert"
)

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
	Title    string                        `json:"title"`
	Status   convert.TransactionFileStatus `json:"status"`
	ResultId string                        `json:"resultId"`
	Error    string                        `json:"error,omitempty"`
}

type TransactionStatusResultFileResponseItem struct {
	Title    string `json:"title"`
	Filename string `json:"filename"`
	Id       string `json:"id"`
}

func NewTransactionStatusResponse(tran *convert.Transaction) *TransactionStatusResponse {
	t := &TransactionStatusResponse{}

	t.Id = tran.Id
	t.Status = tran.Status()
	t.Total = tran.Config.Cant
	t.Completed = tran.CompletedFiles()

	t.Items = []TransactionStatusResponseItem{}
	for i := range tran.AttachedItems() {
		file := tran.Items[i]

		resultId := ""
		if file.Result != nil {
			resultId = file.Result.Id
		}

		responseItem := TransactionStatusResponseItem{
			Title:    file.Name,
			Status:   file.Status(),
			Id:       file.Id,
			ResultId: resultId,
		}

		if file.Error != nil {
			responseItem.Error = file.Error.Error()
		}

		t.Items = append(t.Items, responseItem)
	}

	t.Results = []TransactionStatusResultFileResponseItem{}
	for i := range tran.CompletedFiles() {
		result := tran.ResultFiles[i]

		t.Results = append(t.Results, TransactionStatusResultFileResponseItem{
			Id:       result.Id,
			Title:    result.Name,
			Filename: result.Filename,
		})
	}

	return t
}
