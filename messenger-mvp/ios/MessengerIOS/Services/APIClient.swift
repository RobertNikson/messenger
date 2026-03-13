import Foundation

final class APIClient {
    static let shared = APIClient()

    // Для реального iPhone используй IP твоего компа в локалке, например: http://192.168.1.10:8787
    var baseURL = URL(string: "http://127.0.0.1:8787")!

    private init() {}

    func post<T: Decodable, B: Encodable>(_ path: String, body: B, token: String? = nil) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.ensureOK(response: response, data: data)
        return try JSONDecoder().decode(T.self, from: data)
    }

    func get<T: Decodable>(_ path: String, token: String) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.ensureOK(response: response, data: data)
        return try JSONDecoder().decode(T.self, from: data)
    }

    private static func ensureOK(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let text = String(data: data, encoding: .utf8) ?? "unknown error"
            throw NSError(domain: "API", code: 1, userInfo: [NSLocalizedDescriptionKey: text])
        }
    }
}
