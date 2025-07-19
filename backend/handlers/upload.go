package handlers

import (
    "bytes"
    "crypto/sha256"
    "database/sql"
    "encoding/hex"
    "io"
    "mime/multipart"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/minio/minio-go/v7"
)

// wire this in main.go: r.POST("/maps", deps.UploadMap)
type UploadDeps struct {
    DB       *sql.DB
    Storage  *minio.Client
    Bucket   string
    RegionOK map[string]bool // in‑memory lookup, seeded at start
    // same for SourceOK, CategoryOK, CountryOK
}

func (d *UploadDeps) UploadMap(c *gin.Context) {
    // ---- 1. Parse multipart form ----------------------------------------
    file, fileHdr, err := c.Request.FormFile("file")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
        return
    }
    defer file.Close()

    params := struct {
        Source    string   `form:"source"    binding:"required"`
        Region    string   `form:"region"    binding:"required"`
        Category  string   `form:"category"  binding:"required"`
        Countries []string `form:"countries"` // optional multi‑select
    }{}
    if err := c.ShouldBind(&params); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // ---- 2. Validate lookup codes ---------------------------------------
    if !d.RegionOK[params.Region] {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid region"})
        return
    }
    // repeat for source / category / countries…

    // ---- 3. Read file + hash it ----------------------------------------
    buf, _ := io.ReadAll(file)
    sha := sha256.Sum256(buf)
    shaHex := hex.EncodeToString(sha[:])

    // choose a deterministic object key
    objKey := "maps/" + time.Now().Format("2006/01/02/") + shaHex + ".png"

    // ---- 4. Upload to object storage -----------------------------------
    _, err = d.Storage.PutObject(
        c, d.Bucket, objKey,
        bytes.NewReader(buf), int64(len(buf)),
        minio.PutObjectOptions{ContentType: fileHdr.Header.Get("Content-Type")},
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "storage failed"})
        return
    }

    // ---- 5. Insert into maps -------------------------------------------
    mapID := uuid.New()
    _, err = d.DB.Exec(`
        INSERT INTO maps
          (id, file_key, sha256, source, region, category, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        mapID, objKey, shaHex,
        params.Source, params.Region, params.Category,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "db insert failed"})
        return
    }

    // ---- 6. Insert any countries ---------------------------------------
    if len(params.Countries) > 0 {
        _, err = d.DB.Exec(`
            INSERT INTO map_countries (map_id, country_code)
            SELECT $1, UNNEST($2::char(2)[])
            ON CONFLICT DO NOTHING`,
            mapID, pq.Array(params.Countries),
        )
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "country insert failed"})
            return
        }
    }

    // ---- 7. Return success ---------------------------------------------
    c.JSON(http.StatusOK, gin.H{
        "mapId": mapID,
        // front‑end can show a presigned preview if you want
    })
}
