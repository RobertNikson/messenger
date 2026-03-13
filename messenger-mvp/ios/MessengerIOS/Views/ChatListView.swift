import SwiftUI

struct ChatListView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @StateObject private var chatVM = ChatViewModel()

    var body: some View {
        NavigationStack {
            List(chatVM.users) { user in
                NavigationLink(user.username) {
                    DialogView(peer: user)
                        .environmentObject(chatVM)
                        .environmentObject(authVM)
                        .task {
                            chatVM.selectedUser = user
                            if let token = authVM.token {
                                await chatVM.loadMessages(token: token, peerId: user.id)
                            }
                        }
                }
            }
            .navigationTitle("Chats")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Logout") {
                        chatVM.teardown()
                        authVM.logout()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Reload") {
                        Task {
                            if let token = authVM.token {
                                await chatVM.loadUsers(token: token)
                            }
                        }
                    }
                }
            }
            .onAppear {
                if let token = authVM.token {
                    chatVM.bootstrap(token: token)
                }
            }
            .onDisappear {
                chatVM.teardown()
            }
        }
    }
}
