package captioner

import "context"

// A pluggable captioner interface (so you can swap to GPT‑4o later).
type Captioner interface {
    Generate(ctx context.Context, objectKey string) (text, model string)
}

// Minimal stub: always returns the same caption.
type Stub struct{}

func (Stub) Generate(_ context.Context, _ string) (string, string) {
    return "🔧 Stub caption: replace me with GPT‑4o", "GPT‑4O"
}

