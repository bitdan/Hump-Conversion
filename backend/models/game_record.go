package models

import (
	"gorm.io/gorm"
)

type GameRecord struct {
	gorm.Model
	GameType    string `gorm:"not null"` // gomoku, go, chess
	Player1ID   uint   `gorm:"not null"`
	Player2ID   uint   `gorm:"not null"`
	Winner      uint   // 获胜者ID
	Moves       string `gorm:"type:text"` // 存储游戏移动记录
	Status      string `gorm:"not null"`  // ongoing, finished
} 