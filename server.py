"""FastAPI server for Know Your Walmart!

All players answer simultaneously. First correct = 10 pts,
second correct = 9 pts, etc. Real-time via WebSockets.
"""

import json
import os
import socket

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from game import GameRoom

app = FastAPI(title="Know Your Walmart!")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Active game rooms
rooms: dict[str, GameRoom] = {}
# Player WebSocket connections: room_code -> {player_key: ws}
connections: dict[str, dict[str, WebSocket]] = {}
# Host connections: room_code -> ws
host_connections: dict[str, WebSocket] = {}


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


@app.get("/")
async def home():
    return FileResponse("static/index.html")


@app.get("/host/{room_code}")
async def host_page(room_code: str):
    return FileResponse("static/host.html")


@app.get("/play/{room_code}")
async def player_page(room_code: str):
    return FileResponse("static/player.html")


@app.get("/api/ip")
async def get_ip():
    return {"ip": get_local_ip()}


async def broadcast_to_room(room_code: str, message: dict):
    """Send a message to all players + host in a room."""
    data = json.dumps(message)
    if room_code in host_connections:
        try:
            await host_connections[room_code].send_text(data)
        except Exception:
            pass
    if room_code in connections:
        for ws in list(connections[room_code].values()):
            try:
                await ws.send_text(data)
            except Exception:
                pass


async def send_to(ws: WebSocket, message: dict):
    await ws.send_text(json.dumps(message))


@app.websocket("/ws/host/{room_code}")
async def host_ws(websocket: WebSocket, room_code: str):
    await websocket.accept()
    room_code = room_code.upper()

    if room_code not in rooms:
        rooms[room_code] = GameRoom(room_code=room_code)
        connections[room_code] = {}

    host_connections[room_code] = websocket
    await send_to(websocket, {
        "type": "room_created",
        "roomCode": room_code,
        "players": rooms[room_code].get_player_names(),
    })

    try:
        while True:
            data = json.loads(await websocket.receive_text())
            room = rooms.get(room_code)
            if not room:
                break

            if data["type"] == "start_game":
                if room.start_game():
                    q = room.next_question()
                    q["totalPlayers"] = len(room.players)
                    await broadcast_to_room(room_code, {"type": "game_started"})
                    await broadcast_to_room(room_code, {"type": "question", **q})

            elif data["type"] == "next_question":
                q = room.next_question()
                if q:
                    q["totalPlayers"] = len(room.players)
                    await broadcast_to_room(room_code, {"type": "question", **q})
                else:
                    await broadcast_to_room(room_code, {
                        "type": "game_over",
                        "rankings": room.get_leaderboard(),
                    })

            elif data["type"] == "time_up":
                summary = room.force_time_up()
                await broadcast_to_room(room_code, {
                    "type": "question_reveal",
                    **summary,
                })
    except WebSocketDisconnect:
        pass
    finally:
        host_connections.pop(room_code, None)


@app.websocket("/ws/player/{room_code}")
async def player_ws(websocket: WebSocket, room_code: str):
    await websocket.accept()
    room_code = room_code.upper()
    player_key = None

    try:
        while True:
            data = json.loads(await websocket.receive_text())
            room = rooms.get(room_code)

            if not room:
                await send_to(websocket, {"type": "error", "message": "Room not found"})
                break

            if data["type"] == "join":
                name = data["name"].strip()
                player_key = name.lower()
                if room.add_player(name):
                    connections[room_code][player_key] = websocket
                    await send_to(websocket, {"type": "joined", "name": name})
                    await broadcast_to_room(room_code, {
                        "type": "player_joined",
                        "players": room.get_player_names(),
                    })
                else:
                    await send_to(websocket, {
                        "type": "error",
                        "message": "Name taken or game already started",
                    })

            elif data["type"] == "answer":
                if not player_key:
                    continue
                result = room.submit_answer(player_key, data["option"])
                if not result["valid"]:
                    continue

                player_name = room.players[player_key].name

                # Tell this player their individual result
                await send_to(websocket, {
                    "type": "your_result",
                    "correct": result["correct"],
                    "points": result["points"],
                    "rank": result["rank"],
                    "correctAnswer": result["correctAnswer"],
                    "correctText": result["correctText"],
                    "explanation": result["explanation"],
                })

                # Tell everyone about the answer progress
                await broadcast_to_room(room_code, {
                    "type": "player_answered",
                    "player": player_name,
                    "answeredCount": result["answeredCount"],
                    "totalPlayers": result["totalPlayers"],
                })

                # If all answered, broadcast full reveal
                if result["allAnswered"]:
                    summary = room.get_question_summary()
                    await broadcast_to_room(room_code, {
                        "type": "question_reveal",
                        **summary,
                    })
    except WebSocketDisconnect:
        pass
    finally:
        if player_key and room_code in connections:
            connections[room_code].pop(player_key, None)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8899))
    ip = get_local_ip()
    print(f"\n  Know Your Walmart!")
    print(f"  Share with your team: http://{ip}:{port}")
    print(f"  Local: http://localhost:{port}\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
