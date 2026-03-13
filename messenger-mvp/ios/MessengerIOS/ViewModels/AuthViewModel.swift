import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var token: String? = KeychainStore.loadToken()
    @Published var currentUser: User?
    @Published var errorText: String?

    var isAuthenticated: Bool { token != nil }

    func register(username: String, password: String) async {
        await auth(path: "auth/register", username: username, password: password)
    }

    func login(username: String, password: String) async {
        await auth(path: "auth/login", username: username, password: password)
    }

    func logout() {
        token = nil
        currentUser = nil
        KeychainStore.clearToken()
    }

    private func auth(path: String, username: String, password: String) async {
        do {
            struct Body: Encodable { let username: String; let password: String }
            let response: AuthResponse = try await APIClient.shared.post(path, body: Body(username: username, password: password))
            token = response.token
            currentUser = response.user
            KeychainStore.saveToken(response.token)
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }
}
