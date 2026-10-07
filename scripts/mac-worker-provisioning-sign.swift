import Foundation
import Security
import Darwin

// Private key is created permanently and non-extractably in the default user Keychain.
// The separate helper has only create/public/sign and disposable-test removal modes.
func run() -> Int32 {
    let args = CommandLine.arguments
    guard args.count == 3, ["create", "public", "sign", "test-remove"].contains(args[1]),
          ["dg-mac-1", "dg-provisioning-integration-test"].contains(args[2]) else { return 1 }
    let disposable = args[2] == "dg-provisioning-integration-test"
    let tag = Data("com.digitalgate.ai-worker.provisioning.\(args[2])".utf8)
    let query: [String: Any] = [kSecClass as String: kSecClassKey,
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
        kSecAttrApplicationTag as String: tag]
    if args[1] == "test-remove" {
        guard disposable else { return 1 }
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound ? 0 : 1
    }
    var found: CFTypeRef?
    var lookup = query
    lookup[kSecReturnRef as String] = true
    lookup[kSecMatchLimit as String] = kSecMatchLimitAll
    let status = SecItemCopyMatching(lookup as CFDictionary, &found)
    var key: SecKey
    if args[1] == "create" {
        guard status == errSecItemNotFound else { return 1 } // Never replace an identity.
        let attrs: [String: Any] = [kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256, kSecAttrIsExtractable as String: false,
            kSecPrivateKeyAttrs as String: [kSecAttrIsPermanent as String: true,
                kSecAttrIsExtractable as String: false, kSecAttrApplicationTag as String: tag,
                kSecAttrLabel as String: "DigitalGate pinned worker provisioning \(args[2])"]]
        var error: Unmanaged<CFError>?
        guard let created = SecKeyCreateRandomKey(attrs as CFDictionary, &error) else { return 1 }
        key = created
    } else {
        guard status == errSecSuccess, let keys = found as? [SecKey], keys.count == 1 else { return 1 }
        key = keys[0]
    }
    guard let attrs = SecKeyCopyAttributes(key) as? [String: Any],
          (attrs[kSecAttrIsExtractable as String] as? Bool) != true else { return 1 }
    // File-based macOS Keychains omit the extractability attribute on lookup.
    // Creation fixes it to false; disposable tests independently require export denial.
    // Disposable test only: assert export API refuses; never render returned bytes.
    if disposable {
        var error: Unmanaged<CFError>?
        if SecKeyCopyExternalRepresentation(key, &error) != nil { return 1 }
    }
    if args[1] != "sign" {
        guard let pub = SecKeyCopyPublicKey(key), let raw = SecKeyCopyExternalRepresentation(pub, nil) else { return 1 }
        let data = raw as Data
        guard data.count == 65, data.first == 4 else { return 1 }
        print(data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: ""))
        return 0
    }
    // Signing input is non-secret, bounded and restricted to this one protocol/origin/path.
    var message = Data()
    while true {
        var byte: UInt8 = 0
        let received = read(STDIN_FILENO, &byte, 1)
        if received == 0 { break }
        if received < 0 { if errno == EINTR { continue }; return 1 }
        message.append(byte)
        if message.count > 512 { return 1 }
    }
    guard let fields = (try? JSONSerialization.jsonObject(with: message)) as? [String], fields.count == 8,
          fields[0] == "dg-worker-provisioning-v1", fields[1] == "https://app.digitalgate.com.au",
          fields[2] == "POST", fields[3] == "/api/internal/ai-worker/provisioning",
          ["provision", "recover"].contains(fields[4]),
          fields[5].range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
          fields[6].range(of: "^[0-9]{13}$", options: .regularExpression) != nil,
          fields[7].range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else { return 1 }
    var error: Unmanaged<CFError>?
    guard let signature = SecKeyCreateSignature(key, .ecdsaSignatureMessageX962SHA256, message as CFData, &error) else { return 1 }
    print((signature as Data).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: ""))
    return 0
}
exit(run())
