import Foundation

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var selectedUser: User?
    @Published var messages: [Message] = []
    @Published var draft: String = ""
    @Published var errorText: String?

    private let ws = WebSocketService()

    func bootstrap(token: String) {
        ws.onMessage = { [weak self] incoming in
            guard let self else { return }
            if incoming.senderId == self.selectedUser?.id {
                self.messages.append(incoming)
            }
        }
        ws.connect(token: token, baseURL: APIClient.shared.baseURL)

        Task {
            await loadUsers(token: token)
        }
    }

    func teardown() {
        ws.disconnect()
    }

    func loadUsers(token: String) async {
        do {
            let response: UsersResponse = try await APIClient.shared.get("users", token: token)
            users = response.users
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }

    func loadMessages(token: String, peerId: Int) async {
        do {
            let response: MessagesResponse = try await APIClient.shared.get("messages/\(peerId)", token: token)
            messages = response.messages
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }

    func send(token: String) async {
        guard let peer = selectedUser, !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        do {
            struct Body: Encodable { let receiverId: Int; let body: String }
            let response: SendMessageResponse = try await APIClient.shared.post("messages", body: Body(receiverId: peer.id, body: draft), token: token)
            messages.append(response.message)
            draft = ""
        } catch {
            errorText = error.localizedDescription
        }
    }
}
