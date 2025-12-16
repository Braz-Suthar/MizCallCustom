const rooms = new Map();
/*
roomId -> {
  hostSocket,
  users: Map<userId, socket>
}
*/

export function createRoom(roomId, hostSocket) {
    rooms.set(roomId, {
        hostSocket,
        users: new Map()
    });
}

export function joinRoom(roomId, userId, socket) {
    const room = rooms.get(roomId);
    if (!room) return false;

    room.users.set(userId, socket);
    return true;
}

export function getRoom(roomId) {
    return rooms.get(roomId);
}

export function removeUser(roomId, userId) {
    const room = rooms.get(roomId);
    if (!room) return;
    room.users.delete(userId);
}

export function closeRoom(roomId) {
    rooms.delete(roomId);
}