package middleware

import (
	"log"
	"strings"

	"github.com/bitdan/Hump-Conversion/backend/utils"
	"github.com/gin-gonic/gin"
)

func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("Auth middleware processing request: %s %s", c.Request.Method, c.Request.URL.Path)

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			log.Printf("No Authorization header found")
			c.JSON(401, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		log.Printf("Token received: %s", tokenString)

		userID, err := utils.ValidateToken(tokenString)
		if err != nil {
			log.Printf("Token validation failed: %v", err)
			if err.Error() == "token has expired" {
				c.JSON(401, gin.H{"error": "Token has expired"})
			} else {
				c.JSON(401, gin.H{"error": "Invalid token"})
			}
			c.Abort()
			return
		}

		log.Printf("Token validated successfully for user ID: %d", userID)
		c.Set("userID", userID)
		c.Next()
	}
}
