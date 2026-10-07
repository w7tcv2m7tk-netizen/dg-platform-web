import Foundation
import Security

// Build once to a stable executable path so macOS can retain its normal Keychain ACL.
// No credential arguments, environment values, diagnostics, or files.
func finish(_ status: OSStatus) -> Never { exit(status == errSecSuccess ? 0 : 1) }
var keychain: SecKeychain?
guard SecKeychainCopyDefault(&keychain) == errSecSuccess, let keychain else { exit(1) }
var status: SecKeychainStatus = 0
guard SecKeychainGetStatus(keychain, &status) == errSecSuccess,
      status & UInt32(kSecUnlockStateStatus) != 0 else { exit(1) }
if CommandLine.arguments == [CommandLine.arguments[0], "--check"] { exit(0) }
guard CommandLine.arguments.count == 2 else { exit(1) }
let account = CommandLine.arguments[1]
guard account.range(of: "^[A-Za-z0-9_-]{1,120}$", options: .regularExpression) != nil else { exit(1) }
var data = FileHandle.standardInput.readData(ofLength: 128)
guard FileHandle.standardInput.readData(ofLength: 1).isEmpty,
      let secret = String(data: data, encoding: .utf8),
      secret.range(of: "^dgw_[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil else { exit(1) }
defer { data.resetBytes(in: 0..<data.count) }
let service = "com.digitalgate.ai-worker"
var item: SecKeychainItem?
// Null password output pointers: locating an existing item does not retrieve its value.
let found = SecKeychainFindGenericPassword(keychain, UInt32(service.utf8.count), service,
    UInt32(account.utf8.count), account, nil, nil, &item)
let result: OSStatus = data.withUnsafeBytes { bytes in
    if found == errSecSuccess, let item {
        // Change only the password data; retain the existing ACL.
        return SecKeychainItemModifyAttributesAndData(item, nil, UInt32(data.count), bytes.baseAddress)
    }
    guard found == errSecItemNotFound else { return found }
    // Default access control. No allow-all access and no ACL modifications.
    return SecKeychainAddGenericPassword(keychain, UInt32(service.utf8.count), service,
        UInt32(account.utf8.count), account, UInt32(data.count), bytes.baseAddress!, nil)
}
finish(result)
