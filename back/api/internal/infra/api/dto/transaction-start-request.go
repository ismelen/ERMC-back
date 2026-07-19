package dto

import (
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
	Cant        int    `json:"cant"`
	Type        string `json:"type"`
}

func (t TransactionStartRequest) ToTransactionConfig() (*convert.TransactionConfig, error) {
	profile, err := convert.NewProfile(t.Profile)
	if err != nil {
		return nil, err
	}

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
	}, nil
}
