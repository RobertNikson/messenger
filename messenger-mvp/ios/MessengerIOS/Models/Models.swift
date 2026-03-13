import Foundation

struct AuthResponse: Codable {
    let token: String
    let user: User
}

struct User: Codable, Identifiable, Hashable {
    let id: Int
    let username: String
}

struct UsersResponse: Codable {
    let users: [User]
}

struct Message: Codable, Identifiable, Hashable {
    let id: Int
    let senderId: Int
    let receiverId: Int
    let body: String
    let createdAt: String
}

struct MessagesResponse: Codable {
    let messages: [Message]
}

struct SendMessageResponse: Codable {
    let message: Message
}

struct SocketEnvelope: Codable {
    let type: String
    let data: Message
}
