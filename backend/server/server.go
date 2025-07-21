package server //

import (
    "database/sql"
    "github.com/SCGR-1/promptaid-backend/internal/storage"
)

type Server struct {
	db    *sql.DB
	store storage.ObjectStore
}

func NewServer(db *sql.DB, store storage.ObjectStore) *Server {
	return &Server{db: db, store: store}
}
