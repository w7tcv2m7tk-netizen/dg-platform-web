import Foundation
import Security
import Darwin

// Build once at a stable path. Classic Keychain APIs intentionally preserve ACLs.
// All secret bytes live in one bounded allocation; no Swift String/Data copy.
func run() -> Int32 {
    var keychain: SecKeychain?
    guard SecKeychainCopyDefault(&keychain) == errSecSuccess, let keychain else { return 1 }
    var status: SecKeychainStatus = 0
    guard SecKeychainGetStatus(keychain, &status) == errSecSuccess,
          status & UInt32(kSecUnlockStateStatus) != 0 else { return 1 }
    if CommandLine.arguments == [CommandLine.arguments[0], "--check"] { return 0 }
    guard CommandLine.arguments.count == 2 else { return 1 }
    let account = CommandLine.arguments[1]
    guard account.range(of: "^[A-Za-z0-9_-]{1,120}$", options: .regularExpression) != nil else { return 1 }
    let capacity = 128
    let buffer = UnsafeMutableRawPointer.allocate(byteCount: capacity, alignment: 1)
    buffer.initializeMemory(as: UInt8.self, repeating: 0, count: capacity)
    defer {
        // memset_s cannot be optimised away; run returns before process exit.
        memset_s(buffer, capacity, 0, capacity)
        buffer.deallocate()
    }
    var count = 0
    while count < capacity {
        let received = read(STDIN_FILENO, buffer.advanced(by: count), capacity - count)
        if received == 0 { break }
        if received < 0 { if errno == EINTR { continue }; return 1 }
        count += received
    }
    guard count == 47 else { return 1 }
    let bytes = buffer.assumingMemoryBound(to: UInt8.self)
    guard bytes[0] == 100, bytes[1] == 103, bytes[2] == 119, bytes[3] == 95 else { return 1 }
    for index in 4..<count {
        let byte = bytes[index]
        guard (65...90).contains(byte) || (97...122).contains(byte) || (48...57).contains(byte) || byte == 45 || byte == 95 else { return 1 }
    }
    let service = "com.digitalgate.ai-worker"
    var item: SecKeychainItem?
    // Null password output pointers: metadata lookup never retrieves a password.
    let found = SecKeychainFindGenericPassword(keychain, UInt32(service.utf8.count), service,
        UInt32(account.utf8.count), account, nil, nil, &item)
    let result: OSStatus
    if found == errSecSuccess, let item {
        // Modify only data, preserving the existing ACL.
        result = SecKeychainItemModifyAttributesAndData(item, nil, UInt32(count), buffer)
    } else if found == errSecItemNotFound {
        // Default ACL on the current user's default Keychain. No allow-all access.
        result = SecKeychainAddGenericPassword(keychain, UInt32(service.utf8.count), service,
            UInt32(account.utf8.count), account, UInt32(count), buffer, nil)
    } else { return 1 }
    return result == errSecSuccess ? 0 : 1
}
exit(run())
