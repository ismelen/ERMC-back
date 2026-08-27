package dto

import (
	"ismelen/inkomi/internal/domain/convert"
)

type TransactionStatusResponse struct {
	Id        string                                    `json:"id"`
	Status    convert.TransactionState                  `json:"status"`
	Total     int32                                     `json:"total"`
	Completed int32                                     `json:"completed"`
	Items     []TransactionStatusResponseItem           `json:"items"`
	Results   []TransactionStatusResultFileResponseItem `json:"results"`
}

type TransactionStatusResponseItem struct {
	Id       string                       `json:"id"`
	Title    string                       `json:"title"`
	Status   convert.TransactionFileState `json:"status"`
	ResultId string                       `json:"resultId"`
	Error    string                       `json:"error,omitempty"`
}

type TransactionStatusResultFileResponseItem struct {
	Title    string `json:"title"`
	Filename string `json:"filename"`
	Id       string `json:"id"`
}

func NewTransactionStatusResponse(tran *convert.Transaction) *TransactionStatusResponse {
	t := &TransactionStatusResponse{}

	t.Id = tran.Id
	t.Status = tran.Status.Get()
	t.Total = tran.Config.Cant
	t.Completed = tran.Results.Len()

	t.Items = []TransactionStatusResponseItem{}
	for _, file := range tran.Items.GetAll() {
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

	for _, result := range tran.Results.GetAll() {
		t.Results = append(t.Results, TransactionStatusResultFileResponseItem{
			Id:       result.Id,
			Title:    result.Name,
			Filename: result.Filename,
		})
	}

	return t
}
