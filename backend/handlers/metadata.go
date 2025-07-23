package handlers

import "github.com/gin-gonic/gin"

// PUT /api/maps/:id/metadata
func (d *UploadDeps) UpdateMapMetadata(c *gin.Context) {
    mapID := c.Param("id")
    var req struct {
        Source   string `json:"source"`
        Region   string `json:"region"`
        Category string `json:"category"`
    }
    if err := c.BindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid json"})
        return
    }
    _, err := d.DB.Exec(`UPDATE maps
                            SET source=$1, region=$2, category=$3
                          WHERE id=$4`,
        req.Source, req.Region, req.Category, mapID)
    if err != nil {
        c.JSON(500, gin.H{"error": "db update failed"})
        return
    }
    c.Status(204)
}
