package push

import (
	"context"
	"ismelen/inkomi/internal/domain/convert"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

type FirebasePushNotifier struct {
	client *messaging.Client
	ctx    *context.Context
}

func (f *FirebasePushNotifier) Init() error {
	ctx := context.Background()
	opt := option.WithAuthCredentialsFile(option.AuthorizedUser, "firebase.json")

	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return err
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return err
	}

	f.client = client
	f.ctx = &ctx

	return nil
}

func (f *FirebasePushNotifier) Send(token string, data convert.PushMessage) error {
	if token == "" {
		return nil
	}

	firebaseMessage := &messaging.Message{
		Token: token,
		Data:  data.ToMap(),
		Android: &messaging.AndroidConfig{
			Priority: "high",
		},
	}

	_, err := f.client.Send(*f.ctx, firebaseMessage)
	return err
}
