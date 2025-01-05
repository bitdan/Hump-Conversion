package game

type Room struct {
	id        string
	gameType  string
	clients   map[*Client]bool
	broadcast chan []byte
}

func newRoom(id string, gameType string) *Room {
	return &Room{
		id:        id,
		gameType:  gameType,
		clients:   make(map[*Client]bool),
		broadcast: make(chan []byte),
	}
}

func (r *Room) run() {
	for {
		select {
		case message := <-r.broadcast:
			for client := range r.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(r.clients, client)
				}
			}
		}
	}
}

func (r *Room) join(client *Client) {
	r.clients[client] = true
}

func (r *Room) leave(client *Client) {
	if _, ok := r.clients[client]; ok {
		delete(r.clients, client)
		close(client.send)
	}
} 