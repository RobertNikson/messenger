import SwiftUI

struct DialogView: View {
    let peer: User
    @EnvironmentObject private var chatVM: ChatViewModel
    @EnvironmentObject private var authVM: AuthViewModel

    var body: some View {
        VStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 8) {
                    ForEach(chatVM.messages) { message in
                        let isMine = message.senderId != peer.id
                        HStack {
                            if isMine { Spacer() }
                            Text(message.body)
                                .padding(10)
                                .background(isMine ? Color.blue.opacity(0.2) : Color.gray.opacity(0.2))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            if !isMine { Spacer() }
                        }
                    }
                }
                .padding()
            }

            HStack {
                TextField("Message", text: $chatVM.draft)
                    .textFieldStyle(.roundedBorder)
                Button("Send") {
                    Task {
                        if let token = authVM.token {
                            await chatVM.send(token: token)
                        }
                    }
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
        .navigationTitle(peer.username)
    }
}
