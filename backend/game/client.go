package game

import (
    "encoding/json"
    "github.com/gorilla/websocket"
)

type Client struct {
    hub      *Hub
    conn     *websocket.Conn
    send     chan []byte
    roomID   string
    userID   uint
    gameType string
}

type Message struct {
    Type    string      `json:"type"`
    Content interface{} `json:"content"`
}

func (c *Client) readPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    for {
        _, message, err := c.conn.ReadMessage()
        if err != nil {
            break
        }

        var msg Message
        if err := json.Unmarshal(message, &msg); err != nil {
            continue
        }

        // 处理消息
        if room := c.hub.rooms[c.roomID]; room != nil {
            room.broadcast <- message
        }
    }
}

func (c *Client) writePump() {
    defer c.conn.Close()

    for {
        select {
        case message, ok := <-c.send:
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
                return
            }
        }
    }
} 