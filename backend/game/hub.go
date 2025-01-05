package game

import (
    "sync"
)

type Hub struct {
    rooms      map[string]*Room
    register   chan *Client
    unregister chan *Client
    mutex      sync.RWMutex
}

func NewHub() *Hub {
    return &Hub{
        rooms:      make(map[string]*Room),
        register:   make(chan *Client),
        unregister: make(chan *Client),
    }
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.handleRegister(client)
        case client := <-h.unregister:
            h.handleUnregister(client)
        }
    }
}

func (h *Hub) handleRegister(client *Client) {
    h.mutex.Lock()
    defer h.mutex.Unlock()

    room := h.rooms[client.roomID]
    if room == nil {
        room = newRoom(client.roomID, client.gameType)
        h.rooms[client.roomID] = room
        go room.run()
    }
    room.join(client)
}

func (h *Hub) handleUnregister(client *Client) {
    h.mutex.Lock()
    defer h.mutex.Unlock()

    if room := h.rooms[client.roomID]; room != nil {
        room.leave(client)
        if len(room.clients) == 0 {
            delete(h.rooms, client.roomID)
        }
    }
} 