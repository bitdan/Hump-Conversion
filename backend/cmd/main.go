package main

import (
	"fmt"
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
	log.Printf("Connecting to database with DSN: %s", dsn)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}
	log.Printf("Database connected successfully")

	// 自动迁移数据库表
	log.Printf("Running database migrations...")
	if err := db.AutoMigrate(&models.User{}, &models.GameRecord{}, &models.GameRoom{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	log.Printf("Database migrations completed")

	// 初始化handlers
	h := handlers.NewHandler(db)

	// 创建游戏中心
	gameHub := game.NewHub()
	go gameHub.Run()

	// 创建 Gin 路由
	r := gin.Default()

	// 添加路由日志
	r.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[GIN] %s | %s | %s | %d | %s\n",
			param.TimeStamp.Format("2006/01/02 - 15:04:05"),
			param.Method,
			param.Path,
			param.StatusCode,
			param.ClientIP,
		)
	}))

	// CORS 中间件
	r.Use(middleware.CORSMiddleware())

	// API 路由
	api := r.Group("/api")
	{
		// 打印路由注册
		log.Printf("Registering API routes...")

		// 认证相关
		auth := api.Group("/auth")
		{
			auth.POST("/register", h.Register)
			auth.POST("/login", h.Login)
			auth.POST("/logout", middleware.Auth(), h.Logout)
		}

		// 需要认证的路由
		games := api.Group("/games")
		games.Use(middleware.Auth())
		{
			// 五子棋相关路由
			gomoku := games.Group("/gomoku")
			{
				log.Printf("Registering gomoku routes...")
				gomoku.POST("/create-room", h.CreateGomokuRoom)
				gomoku.POST("/join-room", h.JoinGomokuRoom)
				gomoku.POST("/:roomId/end", h.EndGomokuGame)
				log.Printf("Gomoku routes registered")
			}

			games.POST("/match/:gameType", h.MatchGame)
			games.GET("/status/:gameId", h.GetGameStatus)
			games.PUT("/status/:gameId", h.UpdateGameStatus)
		}

		// 用户相关路由
		user := api.Group("/user")
		user.Use(middleware.Auth())
		{
			user.GET("/profile", h.GetProfile)
			user.GET("/records", h.GetGameRecords)
			user.GET("/info", h.GetUserInfo)
		}

		// 打印所有注册的路由
		routes := r.Routes()
		for _, route := range routes {
			log.Printf("Route: %s %s", route.Method, route.Path)
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
