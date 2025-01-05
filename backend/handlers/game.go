package handlers

import (
    "github.com/gin-gonic/gin"
    "github.com/bitdan/Hump-Conversion/backend/models"
)

// GetGameRecords 获取用户的游戏记录
func (h *Handler) GetGameRecords(c *gin.Context) {
    userID := c.GetUint("userID")
    
    var records []models.GameRecord
    result := h.db.Where("player1_id = ? OR player2_id = ?", userID, userID).
        Order("created_at DESC").
        Find(&records)

    if result.Error != nil {
        c.JSON(500, gin.H{"error": "Failed to fetch game records"})
        return
    }

    c.JSON(200, records)
}

// GetGameStatus 获取游戏状态
func (h *Handler) GetGameStatus(c *gin.Context) {
    gameID := c.Param("gameId")
    userID := c.GetUint("userID")

    var game models.GameRecord
    result := h.db.First(&game, gameID)
    if result.Error != nil {
        c.JSON(404, gin.H{"error": "Game not found"})
        return
    }

    // 检查用户是否是游戏参与者
    if game.Player1ID != userID && game.Player2ID != userID {
        c.JSON(403, gin.H{"error": "Not authorized to view this game"})
        return
    }

    // 返回游戏状态
    c.JSON(200, gin.H{
        "id":        game.ID,
        "gameType":  game.GameType,
        "player1ID": game.Player1ID,
        "player2ID": game.Player2ID,
        "status":    game.Status,
        "winner":    game.Winner,
        "moves":     game.Moves,
    })
}

// MatchGame 匹配游戏
func (h *Handler) MatchGame(c *gin.Context) {
    userID := c.GetUint("userID")
    gameType := c.Param("gameType")

    // 查找等待中的游戏
    var game models.GameRecord
    result := h.db.Where("game_type = ? AND status = ? AND player2_id = 0", 
        gameType, "waiting").First(&game)

    if result.Error != nil {
        // 创建新游戏
        game = models.GameRecord{
            GameType:  gameType,
            Player1ID: userID,
            Status:    "waiting",
        }
        h.db.Create(&game)
        c.JSON(200, gin.H{
            "gameId": game.ID, 
            "status": "waiting",
            "roomId": game.ID, // 用于WebSocket连接
        })
        return
    }

    // 加入现有游戏
    game.Player2ID = userID
    game.Status = "ongoing"
    h.db.Save(&game)

    c.JSON(200, gin.H{
        "gameId": game.ID, 
        "status": "matched",
        "roomId": game.ID,
    })
}

// UpdateGameStatus 更新游戏状态
func (h *Handler) UpdateGameStatus(c *gin.Context) {
    gameID := c.Param("gameId")
    userID := c.GetUint("userID")

    var req struct {
        Status string `json:"status"`
        Winner uint   `json:"winner,omitempty"`
        Moves  string `json:"moves,omitempty"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "Invalid request"})
        return
    }

    var game models.GameRecord
    if result := h.db.First(&game, gameID); result.Error != nil {
        c.JSON(404, gin.H{"error": "Game not found"})
        return
    }

    // 检查权限
    if game.Player1ID != userID && game.Player2ID != userID {
        c.JSON(403, gin.H{"error": "Not authorized to update this game"})
        return
    }

    // 更新游戏状态
    game.Status = req.Status
    if req.Winner != 0 {
        game.Winner = req.Winner
    }
    if req.Moves != "" {
        game.Moves = req.Moves
    }

    if result := h.db.Save(&game); result.Error != nil {
        c.JSON(500, gin.H{"error": "Failed to update game"})
        return
    }

    c.JSON(200, game)
} 