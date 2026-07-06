package usecases

import (
	"fmt"
	"ismelen/inkomi/internal/domain/convert"
)

type BaseTransaction struct {
	pushNotifier convert.PushNotifier
	cloud        convert.CloudStorage
}

func (b *BaseTransaction) SendAndNotify(config *convert.TransactionConfig, tran *convert.Transaction, src string) {
	if config.Cloud {
		b.pushNotifier.Send(
			config.NotifyToken,
			convert.NewSuccessMessage(config, fmt.Sprintf("Sending %s to cloud", config.Title)),
		)

		if err := b.cloud.Upload(src, config.CloudToken, config.CloudFolder); err != nil {
			b.pushNotifier.Send(
				config.NotifyToken,
				convert.NewErrorMessage(config, fmt.Errorf("Cannot send %s to cloud", config.Title)),
			)
			tran.SetError(err)
		}
		return
	}

	b.pushNotifier.Send(
		config.NotifyToken,
		convert.NewSuccessMessage(config, fmt.Sprintf("%s transaction ready", config.Title)),
	)
}

func (b *BaseTransaction) NotifyError(config *convert.TransactionConfig, err error) {
	b.pushNotifier.Send(
		config.NotifyToken,
		convert.PushMessage{
			Title:   "Error",
			Message: err.Error(),
			Id:      config.Id,
			Err:     err.Error(),
		},
	)
}
