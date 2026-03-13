import SwiftUI

struct AuthView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @State private var username = ""
    @State private var password = ""
    @State private var isRegister = false

    var body: some View {
        VStack(spacing: 12) {
            Text("Messenger iOS").font(.largeTitle).bold()

            Picker("Mode", selection: $isRegister) {
                Text("Login").tag(false)
                Text("Register").tag(true)
            }
            .pickerStyle(.segmented)

            TextField("Username", text: $username)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
                .textFieldStyle(.roundedBorder)
            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)

            Button(isRegister ? "Create account" : "Login") {
                Task {
                    if isRegister {
                        await authVM.register(username: username, password: password)
                    } else {
                        await authVM.login(username: username, password: password)
                    }
                }
            }
            .buttonStyle(.borderedProminent)

            if let error = authVM.errorText {
                Text(error).foregroundStyle(.red).font(.footnote)
            }
        }
        .padding()
    }
}
