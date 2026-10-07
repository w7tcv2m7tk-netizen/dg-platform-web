// Disposable-account metadata/deletion tool only. Never requests kSecReturnData.
import Foundation
import Security
var keychain: SecKeychain?
guard SecKeychainCopyDefault(&keychain) == errSecSuccess, let keychain else { exit(1) }
let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: "com.digitalgate.ai-worker",
    kSecAttrAccount as String: "dg-keychain-integration-test",
    kSecMatchSearchList as String: [keychain]]
var request = query
request[kSecReturnAttributes as String] = true
request[kSecReturnRef as String] = true
request[kSecMatchLimit as String] = kSecMatchLimitAll
var result: CFTypeRef?
let status = SecItemCopyMatching(request as CFDictionary, &result)
if status == errSecItemNotFound { print("{\"count\":0}"); exit(0) }
guard status == errSecSuccess, let items = result as? [[String: Any]] else { print("{\"metadataStatus\":\(status)}"); exit(1) }
var summaries: [[String: Any]] = []
for item in items {
    var access: SecAccess?
    let reference = item[kSecValueRef as String] as! SecKeychainItem
    guard SecKeychainItemCopyAccess(reference, &access) == errSecSuccess, let access else { exit(1) }
    var aclList: CFArray?
    guard SecAccessCopyACLList(access, &aclList) == errSecSuccess, let acls = aclList as? [SecACL] else { exit(1) }
    var summariesACL: [[String: Any]] = []
    for acl in acls {
        var apps: CFArray?
        var description: CFString?
        var selector = SecKeychainPromptSelector()
        guard SecACLCopyContents(acl, &apps, &description, &selector) == errSecSuccess else { exit(1) }
        var paths: [String] = []
        if let apps = apps as? [SecTrustedApplication] {
            for app in apps {
                var data: CFData?
                guard SecTrustedApplicationCopyData(app, &data) == errSecSuccess, let data else { exit(1) }
                paths.append((String(data: data as Data, encoding: .utf8) ?? "nontext").trimmingCharacters(in: .controlCharacters))
            }
        }
        summariesACL.append(["apps": paths, "allowAnyApplication": apps == nil,
                             "description": description as String? ?? "", "prompt": selector.rawValue, "authorizations": SecACLCopyAuthorizations(acl) as? [String] ?? []])
    }
    summaries.append(["service": item[kSecAttrService as String] ?? "", "account": item[kSecAttrAccount as String] ?? "", "acl": summariesACL])
}
let output: [String: Any] = ["count": items.count, "items": summaries]
let encoded = try JSONSerialization.data(withJSONObject: output, options: [.sortedKeys])
print(String(data: encoded, encoding: .utf8)!)
