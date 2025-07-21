package storage

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"time"
)

type LocalStore struct{ root string }

func NewLocalStore(root string) *LocalStore { return &LocalStore{root: root} }

func (l *LocalStore) Put(_ context.Context, key string, r io.Reader, _ int64, _ string) error {
	full := filepath.Join(l.root, key)
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	f, err := os.Create(full)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, r)
	return err
}

func (l *LocalStore) Link(_ context.Context, key string, _ time.Duration) (string, error) {
	// Served by Gin static handler: router.Static("/static", "./uploads")
	return "/static/" + key, nil
}

func (l *LocalStore) Root() string {
	return l.root
}