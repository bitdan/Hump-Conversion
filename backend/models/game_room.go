package models

import (
	"time"
)

type GameRoom struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	GameType  string     `json:"game_type"`
	RoomCode  string     `json:"room_code" gorm:"unique"`
	HostID    uint       `json:"host_id"`
	GuestID   *uint      `json:"guest_id"`
	Status    string     `json:"status"` // waiting, playing, finished
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at" gorm:"index"`
}
