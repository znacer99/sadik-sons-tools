import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var serverProcess: Process?

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        let app = NSApplication.shared
        app.setActivationPolicy(.regular)

        // Ensure backend server is running
        startServerIfNeeded()

        let rect = NSRect(x: 0, y: 0, width: 1320, height: 860)
        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Sadik Sons Tools"
        window.center()

        let config = WKWebViewConfiguration()
        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        window.contentView!.addSubview(webView)

        // Give server 500ms to be ready if just started
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            if let url = URL(string: "http://localhost:3000") {
                self.webView.load(URLRequest(url: url))
            }
        }

        window.makeKeyAndOrderFront(nil)
        app.activate(ignoringOtherApps: true)
    }

    func startServerIfNeeded() {
        let portCheck = Process()
        portCheck.executableURL = URL(fileURLWithPath: "/usr/bin/lsof")
        portCheck.arguments = ["-i", ":3000"]
        let pipe = Pipe()
        portCheck.standardOutput = pipe
        try? portCheck.run()
        portCheck.waitUntilExit()

        if portCheck.terminationStatus != 0 {
            // Port 3000 is not running, start server.cjs
            let nodePath = "/usr/local/bin/node"
            let serverScript = "/Users/apple/Documents/antigravity/silly-tesla/sadik-sons-tools/server.cjs"
            
            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: FileManager.default.fileExists(atPath: nodePath) ? nodePath : "/usr/bin/node")
            proc.arguments = [serverScript]
            proc.currentDirectoryURL = URL(fileURLWithPath: "/Users/apple/Documents/antigravity/silly-tesla/sadik-sons-tools")
            try? proc.run()
            self.serverProcess = proc
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

let delegate = AppDelegate()
let app = NSApplication.shared
app.delegate = delegate
app.run()
