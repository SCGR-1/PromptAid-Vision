package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"

	"github.com/SCGR-1/promptaid-backend/internal/storage"
    "github.com/SCGR-1/promptaid-backend/handlers"
    "github.com/SCGR-1/promptaid-backend/internal/captioner"
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

    // ---- 1. connect DB  ----
	dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        dsn = "postgres://promptaid:promptaid@localhost:5432/promptaid?sslmode=disable"
    }
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        log.Fatal(err)
    }


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
        Bucket:   os.Getenv("S3_BUCKET"),
        RegionOK: make(map[string]bool),
		Cap:      captioner.Stub{},
    }

	// ---- 3. build server ----
	r := gin.Default()

	if l, ok := store.(*storage.LocalStore); ok {
		r.Static("/static", l.Root()) // add Root() getter or hardcode "./uploads"
	}

	api := r.Group("/api")

	api.POST("/maps",              uploadDeps.UploadMap)
	api.POST("/maps/:id/caption",  uploadDeps.CreateCaption)
	api.PUT ("/maps/:id/metadata", uploadDeps.UpdateMapMetadata)
	api.GET ("/captions/:id",      uploadDeps.GetCaption)

	uploadDeps.RegionOK = map[string]bool{
		"_TBD_REGION": true,
		"AFR": true, "AMR": true, "APA": true, "EUR": true, "MENA": true,
	}

	log.Fatal(r.Run(":8080"))
}
