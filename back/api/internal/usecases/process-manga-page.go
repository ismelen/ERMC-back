package usecases

import (
	"fmt"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/domain/manga"
	"ismelen/inkomi/internal/infra/image"
	"path/filepath"
)

func (p *MangaTransactionUC) ProcessPage(path string, idx int, profile *convert.EReaderProfile, settings *manga.ImageSettings) (*manga.Page, error) {
	page := manga.NewPage(path)
	editor, err := image.NewEditor(
		path,
		profile.Width,
		profile.Height,
		settings.ForceColor,
	)
	if err != nil {
		return nil, err
	}

	// page.HasWhiteBg = editor.HasWhiteBg()

	isColor := settings.ForceColor && editor.IsColored()
	if !isColor {
		editor.Grayscale()
	}

	if settings.RemoveRainbowEffect && isColor {
		editor.RemoveRainbowEffect()
	}

	if settings.SetExtremBlackPoint && !isColor {
		editor.SetExtremeBlackPoint()
	}

	editor.CropMargins()
	page.Bg = editor.GetBg()

	partEditors := editor.TrySplit(settings.SpreadSplitter == 2)
	if settings.SpreadSplitter != 1 && len(partEditors) > 2 {
		partEditors = partEditors[:2]
	}

	if settings.RightToLeft && len(partEditors) >= 2 && partEditors[0].SplitOperation == manga.SplitToLeft {
		partEditors[0], partEditors[1] = partEditors[1], partEditors[0]
	}

	for _, partEditor := range partEditors {
		partEditor.Resize()
		part := manga.NewPagePart(
			partEditor.Img,
			partEditor.SplitOperation,
		)

		partPath := filepath.Join(
			filepath.Dir(path),
			fmt.Sprintf("inkomi-%d%c", idx, part.PathOrder),
		)
		partPath, err = partEditor.SaveToDir(partPath)
		if err != nil {
			return nil, err
		}

		part.SetPath(partPath)
		part.Clean()
		page.Parts = append(page.Parts, part)
	}

	return page, nil
}
