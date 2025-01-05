package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username string `gorm:"unique;not null"`
	Password string `json:"-"` // 不在JSON中返回密码
	Email    string `gorm:"unique"`
}
