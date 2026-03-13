import Foundation

final class WebSocketService: ObservableObject {
    private var task: URLSessionWebSocketTask?
    var onMessage: ((Message) -> Void)?

    func connect(token: String, baseURL: URL) {
        disconnect()
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        components.scheme = baseURL.scheme == "https" ? "wss" : "ws"
        components.path = "/ws"
        components.queryItems = [URLQueryItem(name: "token", value: token)]

        guard let url = components.url else { return }
        task = URLSession.shared.webSocketTask(with: url)
        task?.resume()
        listen()
    }

    func disconnect() {
        task?.cancel(with: .normalClosure, reason: nil)
        task = nil
    }

    private func listen() {
        task?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .failure:
                break
            case .success(let message):
                if case .string(let text) = message,
                   let data = text.data(using: .utf8),
                   let envelope = try? JSONDecoder().decode(SocketEnvelope.self, from: data),
                   envelope.type == "message" {
                    self.onMessage?(envelope.data)
                }
                self.listen()
            }
        }
    }
}
