package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Server struct {
		Address string
	}
	Database struct {
		Host     string
		Port     string
		User     string
		Password string
		Name     string
	}
	Redis struct {
		Addr     string
		Password string
		DB       int
	}
	JWT struct {
		Secret string
	}
}

func Load() *Config {
	cfg := &Config{}

	// 加载服务器配置
	cfg.Server.Address = getEnv("SERVER_ADDRESS", ":8080")

	// 加载数据库配置
	cfg.Database.Host = getEnv("DB_HOST", "43.156.83.246")
	cfg.Database.Port = getEnv("DB_PORT", "3306")
	cfg.Database.User = getEnv("DB_USER", "root")
	cfg.Database.Password = getEnv("DB_PASSWORD", "dudu0.0@")
	cfg.Database.Name = getEnv("DB_NAME", "game_db")

	// 加载Redis配置
	cfg.Redis.Addr = getEnv("REDIS_ADDR", "43.156.83.246:6379")
	cfg.Redis.Password = getEnv("REDIS_PASSWORD", "dudu0.0@")
	cfg.Redis.DB, _ = strconv.Atoi(getEnv("REDIS_DB", "1"))

	// 加载JWT配置
	cfg.JWT.Secret = getEnv("JWT_SECRET", "your-secret-key")

	return cfg
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		c.Database.User,
		c.Database.Password,
		c.Database.Host,
		c.Database.Port,
		c.Database.Name,
	)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
