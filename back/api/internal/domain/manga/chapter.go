package manga

import (
	"path/filepath"
	"sort"
)

type Chapter struct {
	Path      string
	Filename  string
	PagePaths []string
	ordered   bool
}

func NewChapter(filename, path string, pagePaths []string) *Chapter {
	return &Chapter{
		Path:      path,
		PagePaths: pagePaths,
		Filename:  filename,
		ordered:   false,
	}
}

func (c *Chapter) GetOrderedPagePaths(availableExts ...string) []string {
	if c.ordered {
		return c.PagePaths
	}

	var validPaths []string
pathsFor:
	for _, path := range c.PagePaths {
		ext := filepath.Ext(path)
		for _, avExt := range availableExts {
			if avExt == ext {
				validPaths = append(validPaths, path)
				continue pathsFor
			}
		}
	}

	sort.Slice(validPaths, func(i, j int) bool {
		return validPaths[i] < validPaths[j]
	})

	c.PagePaths = validPaths
	c.ordered = true
	return c.PagePaths
}
