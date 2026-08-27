package dto

import (
	"fmt"
	"ismelen/inkomi/internal/domain/convert"
)

type TransactionStartRequest struct {
	Author      string `json:"author,omitempty"`
	Title       string `json:"title,omitempty"`
	Profile     string `json:"profile"`
	Merge       bool   `json:"merge"`
	Cloud       bool   `json:"cloud"`
	CloudToken  string `json:"cloud_token,omitempty"`
	CloudFolder string `json:"cloud_folder,omitempty"`
	NotifyToken string `json:"notify_token,omitempty"`
	Cant        int32  `json:"cant"`
	Type        string `json:"type"`
	Size        int32  `json:"size"`
}

func (t TransactionStartRequest) ToTransactionConfig() (*convert.TransactionConfig, error) {
	profile, err := convert.NewProfile(t.Profile)
	if err != nil {
		return nil, err
	}

	switch t.Type {
	case "md5", "epub", "cbz":
		return &convert.TransactionConfig{
			Author:      t.Author,
			Title:       t.Title,
			Merge:       t.Merge,
			Cloud:       t.Cloud,
			CloudToken:  t.CloudToken,
			CloudFolder: t.CloudFolder,
			NotifyToken: t.NotifyToken,
			Profile:     profile,
			Cant:        t.Cant,
			Type:        t.Type,
			Size:        t.Size,
		}, nil
	default:
		return nil, fmt.Errorf("type not supported")
	}

}
