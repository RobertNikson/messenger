import SwiftUI

struct RootView: View {
    @EnvironmentObject private var authVM: AuthViewModel

    var body: some View {
        Group {
            if authVM.isAuthenticated {
                ChatListView()
            } else {
                AuthView()
            }
        }
    }
}
