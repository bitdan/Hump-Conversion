package handlers

import (
	"log"
	"math/rand"

	"github.com/bitdan/Hump-Conversion/backend/models"
	"github.com/gin-gonic/gin"
)

// CreateGomokuRoom 创建五子棋房间
func (h *Handler) CreateGomokuRoom(c *gin.Context) {
	log.Printf("CreateGomokuRoom handler called")
	log.Printf("Request headers: %v", c.Request.Header)

	// 获取用户ID
	userID := c.GetUint("userID")
	log.Printf("User ID from context: %d", userID)

	if userID == 0 {
		log.Printf("Invalid user ID")
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// 生成房间码
	roomCode := generateRoomCode()
	log.Printf("Generated room code: %s", roomCode)

	// 创建房间记录
	room := models.GameRoom{
		GameType: "gomoku",
		RoomCode: roomCode,
		HostID:   userID,
		Status:   "waiting",
	}

	// 保存到数据库
	if err := h.db.Create(&room).Error; err != nil {
		log.Printf("Failed to create room: %v", err)
		c.JSON(500, gin.H{"error": "Failed to create room"})
		return
	}

	log.Printf("Room created successfully: ID=%d, Code=%s", room.ID, room.RoomCode)
	c.JSON(200, gin.H{
		"roomId":   room.ID,
		"roomCode": room.RoomCode,
	})
}

// 加入房间
func (h *Handler) JoinGomokuRoom(c *gin.Context) {
	userID := c.GetUint("userID")

	var req struct {
		RoomCode string `json:"roomCode"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	var room models.GameRoom
	if err := h.db.Where("room_code = ? AND status = ?", req.RoomCode, "waiting").First(&room).Error; err != nil {
		c.JSON(404, gin.H{"error": "Room not found"})
		return
	}

	room.GuestID = &userID
	room.Status = "playing"

	if err := h.db.Save(&room).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to join room"})
		return
	}

	// 创建游戏记录
	game := models.GameRecord{
		GameType:  "gomoku",
		Player1ID: room.HostID,
		Player2ID: userID,
		Status:    "ongoing",
	}

	if err := h.db.Create(&game).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to create game record"})
		return
	}

	c.JSON(200, gin.H{
		"roomId": room.ID,
		"gameId": game.ID,
	})
}

// 生成随机房间码
func generateRoomCode() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, 6)
	for i := range code {
		code[i] = charset[rand.Intn(len(charset))]
	}
	return string(code)
}

// EndGomokuGame 处理游戏结束
func (h *Handler) EndGomokuGame(c *gin.Context) {
	roomID := c.Param("roomId")

	var req struct {
		Winner string `json:"winner"`
		Moves  string `json:"moves"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	var room models.GameRoom
	if err := h.db.First(&room, roomID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Room not found"})
		return
	}

	room.Status = "finished"
	if err := h.db.Save(&room).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update room status"})
		return
	}

	// 更新游戏记录
	var game models.GameRecord
	if err := h.db.Where("player1_id = ? AND player2_id = ? AND status = ?",
		room.HostID, room.GuestID, "ongoing").First(&game).Error; err != nil {
		c.JSON(404, gin.H{"error": "Game record not found"})
		return
	}

	game.Status = "finished"
	game.Moves = req.Moves

	if req.Winner == "black" {
		game.Winner = room.HostID
	} else if req.Winner == "white" && room.GuestID != nil {
		game.Winner = *room.GuestID
	}

	if err := h.db.Save(&game).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update game record"})
		return
	}

	c.JSON(200, gin.H{"message": "Game ended successfully"})
}
