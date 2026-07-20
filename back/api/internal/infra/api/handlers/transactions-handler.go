package handlers

import (
	"fmt"
	"io"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/infra/api/dto"
	"ismelen/inkomi/internal/infra/api/requtil"
	"ismelen/inkomi/internal/shared/strutil"
	"ismelen/inkomi/internal/shared/uid"
	"ismelen/inkomi/internal/usecases"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
)

type TransactionsV2Handler struct {
	tranStore convert.TransactionStoreI
	transPath string
	epubUC    usecases.TransactionUC
	cbzUC     usecases.TransactionUC
	md5UC     usecases.TransactionUC
}

func NewTransactionHandler(
	epubUC usecases.TransactionUC,
	cbzUC usecases.TransactionUC,
	md5UC usecases.TransactionUC,
	tranStore convert.TransactionStoreI,
) *TransactionsV2Handler {
	wd, err := os.Getwd()
	if err != nil {
		panic(err)
	}

	return &TransactionsV2Handler{
		transPath: filepath.Join(wd, "transactions"),
		epubUC:    epubUC,
		cbzUC:     cbzUC,
		md5UC:     md5UC,
		tranStore: tranStore,
	}
}

func (t *TransactionsV2Handler) HandleStartTransaction(r *http.Request) (*dto.TransactionStartResponse, error) {
	var input dto.TransactionStartRequest
	if err := render.DecodeJSON(r.Body, &input); err != nil {
		return nil, requtil.NewError(http.StatusBadRequest, err.Error())
	}

	config, err := input.ToTransactionConfig()
	if err != nil {
		return nil, err
	}

	tran := t.tranStore.StartTransaction(config)
	return &dto.TransactionStartResponse{
		Id:        tran.Id,
		Timestamp: tran.CreatedAt.Unix(),
	}, nil
}

func (t *TransactionsV2Handler) getTransaction(r *http.Request) (*convert.Transaction, error) {
	tranId := chi.URLParam(r, "tranId")
	if tranId == "" {
		return nil, requtil.NewError(http.StatusBadRequest, "no transaction id specified")
	}

	return t.tranStore.GetTransaction(tranId)
}

func (t *TransactionsV2Handler) HandleDownload(r *http.Request) (*requtil.FileResponse, error) {
	tran, err := t.getTransaction(r)
	if err != nil {
		return nil, err
	}

	fileId := chi.URLParam(r, "fileId")
	file, err := tran.GetResultFile(fileId)
	if err != nil {
		return nil, err
	}

	return &requtil.FileResponse{
		Path: file.Path,
		Name: file.Filename,
	}, nil
}

func (t *TransactionsV2Handler) HandleCancel(r *http.Request) (*any, error) {
	tran, err := t.getTransaction(r)
	if err != nil {
		return nil, err
	}

	tran.Cancel()
	return nil, nil
}

func (t *TransactionsV2Handler) HandleGetStatus(r *http.Request) (*dto.TransactionStatusResponse, error) {
	tran, err := t.getTransaction(r)
	if err != nil {
		return nil, err
	}

	resp := &dto.TransactionStatusResponse{
		Id:        tran.Id,
		Status:    tran.Status(),
		Total:     tran.Config.Cant,
		Completed: tran.CompletedFiles(),
	}
	for _, file := range tran.Items {
		resultId := ""
		if file.Result != nil {
			resultId = file.Result.Id
		}

		resp.Items = append(resp.Items, dto.TransactionStatusResponseItem{
			Filename: file.Filename,
			Status:   file.Status(),
			Id:       file.Id,
			ResultId: resultId,
		})
	}

	for _, result := range tran.ResultFiles {
		resp.Results = append(resp.Results, dto.TransactionStatusResultFileResponseItem{
			Id:       result.Id,
			Filename: result.Filename,
		})
	}

	return resp, nil
}

func (t *TransactionsV2Handler) HandleAttachFile(r *http.Request) (*string, error) {
	tran, err := t.getTransaction(r)
	if err != nil {
		return nil, err
	}

	if tran.Config.Type == "md5" {
		return t.handleAttachMd5(tran, r)
	}

	file, header, err := requtil.GetFormFile(r)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	if ext := filepath.Ext(header.Filename); ext != tran.Config.Type {
		return nil, requtil.NewError(
			http.StatusBadRequest,
			fmt.Sprintf("%s file type not suported, only %s", ext, tran.Config.Type),
		)
	}

	tranFileId := uid.GetRandomID(6)
	filename := strutil.NormalizeString(header.Filename)
	dstPath := filepath.Join(t.transPath, tran.Id, tranFileId, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return nil, err
	}

	tranFile := convert.NewTransactionFile(tranFileId, filename, dstPath, header.Size)
	fileId, err := tran.AttachFile(tranFile)

	go func() {
		switch tran.Config.Type {
		case "cbz":
			t.cbzUC.Execute(tranFile, tran, t.transPath)
		case "epub":
			t.epubUC.Execute(tranFile, tran, t.transPath)
		}
	}()

	return &fileId, err
}

func (t *TransactionsV2Handler) handleAttachMd5(tran *convert.Transaction, r *http.Request) (*string, error) {
	var input dto.Md5TransactionAttachRequest
	if err := render.DecodeJSON(r.Body, &input); err != nil {
		return nil, err
	}

	tranFile := convert.NewTransactionFile(uid.GetRandomID(6), input.Title, input.Md5, 0)
	fileId, err := tran.AttachFile(tranFile)

	go func() { t.md5UC.Execute(tranFile, tran, t.transPath) }()
	return &fileId, err
}
