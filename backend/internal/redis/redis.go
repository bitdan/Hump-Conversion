package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

var client *redis.Client

func Init(addr string, password string, db int) error {
	fmt.Printf("Connecting to Redis at %s with DB %d\n", addr, db)

	client = redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		DialTimeout:  10 * time.Second,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	})

	// 测试连接
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to ping Redis: %v", err)
	}

	fmt.Println("Successfully connected to Redis")
	return nil
}

// 存储token，设置过期时间
func SetToken(userId string, token string, expiration time.Duration) error {
	ctx := context.Background()
	return client.Set(ctx, "token:"+userId, token, expiration).Err()
}

// 获取token
func GetToken(userId string) (string, error) {
	ctx := context.Background()
	return client.Get(ctx, "token:"+userId).Result()
}

// 删除token
func DeleteToken(userId string) error {
	ctx := context.Background()
	return client.Del(ctx, "token:"+userId).Err()
}

// 检查token是否有效
func IsTokenValid(userId string, token string) bool {
	ctx := context.Background()
	storedToken, err := client.Get(ctx, "token:"+userId).Result()
	if err != nil {
		return false
	}
	return storedToken == token
}
