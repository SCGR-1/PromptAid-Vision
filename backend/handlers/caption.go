package handlers

import (
	"time"
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

// POST /api/maps/:id/caption
func (d *UploadDeps) CreateCaption(c *gin.Context) {
    ctx   := c.Request.Context()
    mapID := c.Param("id")

    // 1) look up the map’s file key
    var key string
    if err := d.DB.QueryRowContext(ctx,
        `SELECT file_key FROM maps WHERE map_id = $1`, mapID).Scan(&key); err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "map not found"})
        return
    }

    // 2) generate placeholder caption
    text, model := d.Cap.Generate(ctx, key)

    // 3) insert caption row
    capID := uuid.New()
    if _, err := d.DB.ExecContext(ctx, `
        INSERT INTO captions (cap_id, map_id, generated, model, raw_json, created_at)
        VALUES ($1,$2,$3,$4,$5,NOW())`,
        capID, mapID, text, model, []byte("{}")); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "db insert failed"})
        return
    }

    // 4) respond to the front‑end
    c.JSON(http.StatusOK, gin.H{
        "captionId": capID,
        "generated": text,
    })
}

func (d *UploadDeps) GetCaption(c *gin.Context) {
	ctx := c.Request.Context()
	capID := c.Param("id")

	var key, text string
	if err := d.DB.QueryRowContext(ctx, `
		SELECT m.file_key, c.generated
			FROM captions c
			JOIN maps m ON c.map_id = m.id
			WHERE c.id = $1`, capID).Scan(&key, &text); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "caption not found"})
		return
	}

	// turn object key into a 24‑hour presigned URL
	url, _ := d.Storage.Link(ctx, key, 24*time.Hour)

	c.JSON(http.StatusOK, gin.H{
		"imageUrl":  url,
		"generated": text,
	})
}
