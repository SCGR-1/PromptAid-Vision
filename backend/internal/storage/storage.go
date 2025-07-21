package storage

import (
	"context"
	"time"
	"io"
)

// ObjectStore is a minimal interface for saving and later linking to blobs.
type ObjectStore interface {
	// Put permanently stores the object under key.
	Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error

	// Link returns a URL valid for roughly ttl (ignored by LocalStore).
	Link(ctx context.Context, key string, ttl time.Duration) (string, error)
}
