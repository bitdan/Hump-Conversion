package game

import (
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"net/http"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许所有来源
	},
}

func HandleWebSocket(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		userID := c.GetUint("userID")
		roomID := c.Query("room")
		gameType := c.Param("gameType")

		client := &Client{
			hub:      hub,
			conn:     conn,
			send:     make(chan []byte, 256),
			roomID:   roomID,
			userID:   userID,
			gameType: gameType,
		}

		client.hub.register <- client

		go client.writePump()
		go client.readPump()
	}
} 