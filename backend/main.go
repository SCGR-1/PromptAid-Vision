package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"

	"github.com/SCGR-1/promptaid-backend/internal/storage"
    "github.com/SCGR-1/promptaid-backend/handlers"
)

type Config struct {
    S3Bucket  string
    UploadDir string
}

func loadConfig() Config {
    return Config{
        S3Bucket:  os.Getenv("S3_BUCKET"),
        UploadDir: os.Getenv("UPLOAD_DIR"),
    }
}


func main() {
	
    cfg := loadConfig()

    // ---- 1. connect DB  ----
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil { log.Fatal(err) }

	// ---- 2. choose storage driver ----
	var store storage.ObjectStore
	switch os.Getenv("STORAGE_DRIVER") {
	case "s3":
		store, err = storage.NewS3Store(
			os.Getenv("S3_ENDPOINT"),
			os.Getenv("S3_KEY"),
			os.Getenv("S3_SECRET"),
			os.Getenv("S3_BUCKET"),
			os.Getenv("S3_SSL") == "true",
		)
		if err != nil { log.Fatal(err) }
	default: // local
		uploadDir := os.Getenv("UPLOAD_DIR")
		if uploadDir == "" { uploadDir = "./uploads" }
		store = storage.NewLocalStore(uploadDir)
	}

    uploadDeps := handlers.UploadDeps{
        DB:       db,
        Storage:  store,
        Bucket:   cfg.S3Bucket,
        RegionOK: make(map[string]bool),
    }

	// ---- 3. build server ----
	r := gin.Default()

	if l, ok := store.(*storage.LocalStore); ok {
		r.Static("/static", l.Root()) // add Root() getter or hardcode "./uploads"
	}

    r.POST("/maps", uploadDeps.UploadMap)

	log.Fatal(r.Run(":8080"))
}
