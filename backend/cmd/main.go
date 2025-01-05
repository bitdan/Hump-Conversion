package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/bitdan/Hump-Conversion/backend/game"
	"github.com/bitdan/Hump-Conversion/backend/handlers"
	"github.com/bitdan/Hump-Conversion/backend/internal/config"
	"github.com/bitdan/Hump-Conversion/backend/internal/redis"
	"github.com/bitdan/Hump-Conversion/backend/middleware"
	"github.com/bitdan/Hump-Conversion/backend/models"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 打印Redis配置信息
	log.Printf("Redis configuration - Addr: %s, DB: %d", cfg.Redis.Addr, cfg.Redis.DB)

	// 初始化Redis
	if err := redis.Init(cfg.Redis.Addr, cfg.Redis.Password, cfg.Redis.DB); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	// 连接数据库
	dsn := cfg.GetDSN()
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// 自动迁移数据库表
	if err := db.AutoMigrate(&models.User{}, &models.GameRecord{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// 初始化handlers
	h := handlers.NewHandler(db)

	// 创建游戏中心
	gameHub := game.NewHub()
	go gameHub.Run()

	// 创建 Gin 路由
	r := gin.Default()

	// CORS 中间件
	r.Use(middleware.CORS())

	// API 路由
	api := r.Group("/api")
	{
		// 认证相关
		auth := api.Group("/auth")
		{
			auth.POST("/register", h.Register)
			auth.POST("/login", h.Login)
			auth.POST("/logout", middleware.Auth(), h.Logout)
		}

		// 需要认证的路由
		protected := api.Group("/")
		protected.Use(middleware.Auth())
		{
			protected.GET("/profile", h.GetProfile)
			protected.GET("/game-records", h.GetGameRecords)
			protected.POST("/games/match/:gameType", h.MatchGame)
			protected.GET("/games/status/:gameId", h.GetGameStatus)
			protected.PUT("/games/status/:gameId", h.UpdateGameStatus)
			protected.GET("/user/info", h.GetUserInfo)
		}
	}

	// WebSocket 路由
	r.GET("/ws/:gameType", middleware.Auth(), game.HandleWebSocket(gameHub))

	// 启动服务器
	log.Printf("Server starting on %s\n", cfg.Server.Address)
	if err := r.Run(cfg.Server.Address); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
